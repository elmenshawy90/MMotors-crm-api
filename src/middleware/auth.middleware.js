import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import config from '../config/index.js';
import { isBlacklisted } from './tokenBlacklist.js';

export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    const token = authHeader.substring(7);

    if (isBlacklisted(token)) {
      return res.status(401).json({
        success: false,
        message: 'Token has been revoked'
      });
    }
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      const user = await User.findOne({
        where: { id: decoded.id },
        attributes: { exclude: ['password'] }
      });
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      if (user.status !== 'active') {
        return res.status(403).json({
          success: false,
          message: 'User account is not active'
        });
      }

      req.token = token;
      req.tokenDecoded = decoded;
      req.user = user;
      next();
    } catch (jwtError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Authentication error'
    });
  }
};

export const authorize = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    if (roles.length === 0) {
      return next();
    }
    
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }
    
    next();
  };
};

export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      const user = await User.findOne({
        where: { id: decoded.id },
        attributes: { exclude: ['password'] }
      });
      
      if (user && user.status === 'active') {
        req.user = user;
      }
    } catch (jwtError) {
      // Ignore token errors for optional auth
    }
    
    next();
  } catch (error) {
    next();
  }
};
