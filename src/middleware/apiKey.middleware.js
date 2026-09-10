import config from '../config/index.js';
import logger from '../utils/logger.js';


export const requireApiKey = (req, res, next) => {
  if (req.path === '/health') return next();

  const providedKey = req.headers['x-api-key'];

  if (!providedKey) {
    logger.warn('API Key missing', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    return res.status(401).json({
      success: false,
      message: 'API key required'
    });
  }

  // timing attacks
  if (!timingSafeEqual(providedKey, config.security.apiKey)) {
    logger.warn('Invalid API Key attempt', {
      ip: req.ip,
      path: req.path,
      userAgent: req.headers['user-agent']
    });
    return res.status(403).json({
      success: false,
      message: 'Invalid API key'
    });
  }

  next();
};

/**
 * timing side-channel attacks
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) {
    let diff = 0;
    const dummy = b || 'x';
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ dummy.charCodeAt(i % dummy.length);
    }
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
