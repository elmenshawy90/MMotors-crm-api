

import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import { isBlacklisted } from './tokenBlacklist.js';

export const staticAuthGuard = (req, res, next) => {
  let token = null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.query.token) {
    token = req.query.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required to access this file' });
  }

  if (isBlacklisted(token)) {
    return res.status(401).json({ success: false, message: 'Token has been revoked' });
  }

  try {
    jwt.verify(token, config.jwt.secret);
    next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
};
