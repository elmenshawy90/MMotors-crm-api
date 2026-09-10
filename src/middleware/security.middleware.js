import rateLimit from 'express-rate-limit';
import config from '../config/index.js';

// ─── Rate Limiters ───────────────────────────────────────────────────────────


export const rateLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,       
  max: config.security.rateLimitMaxRequests,          
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});


export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many authentication attempts, please try again later' },
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

/**
 * API limiter upload
 */
export const apiRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { success: false, message: 'API rate limit exceeded' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

// ─── Request Validation ───────────────────────────────────────────────────────

export const validateRequest = (req, res, next) => {
  const contentType = req.headers['content-type'];

  if (req.method !== 'GET' && req.method !== 'DELETE') {
    const isMultipart = contentType && contentType.includes('multipart/form-data');
    if (!isMultipart && (!contentType || !contentType.includes('application/json'))) {
      return res.status(415).json({
        success: false,
        message: 'Content-Type must be application/json'
      });
    }
  }

  next();
};

// ─── Input Sanitization ───────────────────────────────────────────────────────

const MAX_STRING_LENGTH = 10000;

const sanitizeValue = (value, depth = 0) => {
  if (depth > 10) return value;

  if (typeof value === 'string') {
    let v = value.length > MAX_STRING_LENGTH ? value.slice(0, MAX_STRING_LENGTH) : value;
    v = v.replace(/\0/g, '');
    return v;
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, depth + 1));
  }

  if (typeof value === 'object' && value !== null) {
    const sanitized = {};
    for (const key of Object.keys(value)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      sanitized[key] = sanitizeValue(value[key], depth + 1);
    }
    return sanitized;
  }

  return value;
};

export const sanitizeInput = (req, res, next) => {
  if (req.body)   req.body   = sanitizeValue(req.body);
  if (req.query)  req.query  = sanitizeValue(req.query);
  if (req.params) req.params = sanitizeValue(req.params);
  next();
};
