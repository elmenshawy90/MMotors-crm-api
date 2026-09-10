

import logger from '../utils/logger.js';

// ─── Patterns ────────────────────────────────────────────────────────────────

const PATH_TRAVERSAL   = /(\.\.[/\\]){2,}/;
const SQL_INJECTION    = /(\b(union|select|insert|update|delete|drop|alter|exec|execute|xp_|sp_)\b.*\b(from|table|where|into)\b)|('.*--)|(-{2,})/i;
const XSS_PROBE        = /<\s*script|javascript\s*:|on\w+\s*=|<\s*iframe|<\s*img[^>]+onerror/i;
const CRLF_INJECTION   = /\r|\n/;
const SCANNER_AGENTS   = /sqlmap|nikto|nmap|masscan|zgrab|dirbuster|gobuster|hydra|burpsuite|nuclei|acunetix|nessus|openvas/i;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function flattenObject(obj, depth = 0) {
  if (depth > 5 || !obj) return [];
  const values = [];
  for (const val of Object.values(obj)) {
    if (typeof val === 'string') values.push(val);
    else if (typeof val === 'object') values.push(...flattenObject(val, depth + 1));
  }
  return values;
}

function checkPayload(values, pattern) {
  return values.some(v => pattern.test(v));
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export const requestInspector = (req, res, next) => {
  const ip        = req.ip;
  const path      = req.originalUrl;
  const userAgent = req.headers['user-agent'] || '';
  const method    = req.method;

  const findings = [];

  // 1. Path traversal في الـ URL
  if (PATH_TRAVERSAL.test(path)) {
    findings.push('path_traversal');
  }

  // 2. Scanner / known attack tool user-agent
  if (!userAgent || SCANNER_AGENTS.test(userAgent)) {
    findings.push(userAgent ? 'scanner_user_agent' : 'empty_user_agent');
  }

  // 3. CRLF injection  in  headers 
  const checkHeaders = ['x-forwarded-for', 'referer', 'origin', 'host'];
  for (const h of checkHeaders) {
    const val = req.headers[h];
    if (val && CRLF_INJECTION.test(val)) {
      findings.push(`crlf_in_${h}`);
      break;
    }
  }

  // 4.   body + query + params  SQL/XSS
  if (method !== 'GET') {
    const bodyValues = flattenObject(req.body);
    if (checkPayload(bodyValues, SQL_INJECTION)) findings.push('sql_injection_body');
    if (checkPayload(bodyValues, XSS_PROBE))    findings.push('xss_probe_body');
  }

  const queryValues = flattenObject(req.query);
  if (checkPayload(queryValues, SQL_INJECTION)) findings.push('sql_injection_query');
  if (checkPayload(queryValues, XSS_PROBE))     findings.push('xss_probe_query');
  if (checkPayload([path], SQL_INJECTION))       findings.push('sql_injection_url');
  if (checkPayload([path], XSS_PROBE))           findings.push('xss_probe_url');

  if (findings.length > 0) {
    logger.warn('Suspicious request detected', {
      ip,
      method,
      path,
      userAgent,
      findings,
      userId: req.user?.id ?? null
    });

    //   (traversal + injection)  
    const critical = ['path_traversal', 'sql_injection_body', 'sql_injection_url', 'crlf_in_x-forwarded-for'];
    if (findings.some(f => critical.includes(f))) {
      return res.status(400).json({
        success: false,
        message: 'Request blocked'
      });
    }
  }

  next();
};
