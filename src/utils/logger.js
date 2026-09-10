import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import config from '../config/index.js';


// Paths


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Environment


const isProduction = config.env === 'production';
const isDevelopment = config.env === 'development';
const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);

const serviceName =
  process.env.SERVICE_NAME || 'car-branch-manager';

const serviceVersion =
  process.env.npm_package_version || '1.0.0';


// Log Directory

//
// Priority:
// 1. LOG_DIR
// 2. /tmp/logs on AWS Lambda
// 3. ./logs on normal servers
//


const logDir = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : isLambda
    ? '/tmp/logs'
    : path.join(__dirname, '../../logs');


// Security: Sensitive Fields


const SENSITIVE_KEYS = new Set([
  'password',
  'passwd',
  'pwd',

  'token',
  'access_token',
  'refresh_token',
  'id_token',

  'authorization',
  'cookie',
  'set-cookie',

  'api_key',
  'apikey',
  'secret',
  'client_secret',

  'private_key',

  'credit_card',
  'card_number',
  'cvv',
  'cvc',

  'otp',
  'verification_code'
]);

function sanitizeMetadata(value, seen = new WeakSet()) {

  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === 'string') {
    return value;
  }

  if (
    typeof value !== 'object'
  ) {
    return value;
  }

  // Prevent circular references
  if (seen.has(value)) {
    return '[Circular]';
  }

  seen.add(value);

  if (Array.isArray(value)) {
    return value.map(item =>
      sanitizeMetadata(item, seen)
    );
  }

  const sanitized = {};

  for (const [key, val] of Object.entries(value)) {

    const normalizedKey = key
      .toLowerCase()
      .replace(/[-\s]/g, '_');

    if (SENSITIVE_KEYS.has(normalizedKey)) {
      sanitized[key] = '[REDACTED]';
      continue;
    }

    sanitized[key] = sanitizeMetadata(val, seen);
  }

  return sanitized;
}


// Winston Format


const baseFormat = winston.format.combine(

  winston.format.timestamp({
    format: 'YYYY-MM-DDTHH:mm:ss.SSSZ'
  }),

  winston.format.errors({
    stack: true
  }),

  winston.format.splat(),

  winston.format((info) => {

    /*
     * Sanitize every metadata field before it reaches
     * console or file transports.
     */

    for (const key of Object.keys(info)) {

      if (
        key !== 'level' &&
        key !== 'message' &&
        key !== 'timestamp' &&
        key !== 'stack'
      ) {
        info[key] = sanitizeMetadata(info[key]);
      }
    }

    return info;
  })(),

  winston.format.json()
);


// Development Console Format


const developmentConsoleFormat = winston.format.combine(

  winston.format.colorize(),

  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),

  winston.format.errors({
    stack: true
  }),

  winston.format.printf(({
    timestamp,
    level,
    message,
    stack,
    ...metadata
  }) => {

    let output =
      `${timestamp} [${level}]: ${message}`;

    if (Object.keys(metadata).length > 0) {
      output += ` ${JSON.stringify(metadata)}`;
    }

    if (stack) {
      output += `\n${stack}`;
    }

    return output;
  })
);


// Production Console Format

//
// JSON is intentionally used in production because:
//


const productionConsoleFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({
    stack: true
  }),
  winston.format.json()
);


// Transport List


const transports = [];


// Console Transport

//
// Console logging is ALWAYS enabled.
//


transports.push(
  new winston.transports.Console({
    format: isDevelopment
      ? developmentConsoleFormat
      : productionConsoleFormat
  })
);


// File Logging

//
// File logging is optional.
//
// In serverless environments, stdout/stderr should normally be preferred.
// Therefore, file logging can be disabled using:
//
// LOG_TO_FILE=false
//

const fileLoggingRequested =
  process.env.LOG_TO_FILE !== 'false';

let fileLoggingEnabled = false;

if (
  fileLoggingRequested &&
  !isLambda
) {

  try {

    fs.mkdirSync(logDir, {
      recursive: true,
      mode: 0o750
    });

    fs.accessSync(
      logDir,
      fs.constants.W_OK
    );

    fileLoggingEnabled = true;

  } catch (error) {

    fileLoggingEnabled = false;

    // eslint-disable-next-line no-console
    console.warn(
      `[logger] File logging disabled: ${error.message}`
    );
  }
}


// File Transports


if (fileLoggingEnabled) {

 
  // Combined Logs
 

  transports.push(
    new winston.transports.File({
      filename: path.join(
        logDir,
        'combined.log'
      ),

      maxsize: 10 * 1024 * 1024, // 10 MB

      maxFiles: 10,

      tailable: true,

      handleExceptions: false,

      handleRejections: false
    })
  );

 
  // Error Logs
 

  transports.push(
    new winston.transports.File({
      filename: path.join(
        logDir,
        'error.log'
      ),

      level: 'error',

      maxsize: 10 * 1024 * 1024, // 10 MB

      maxFiles: 10,

      tailable: true,

      handleExceptions: false,

      handleRejections: false
    })
  );
}


// Logger


const logger = winston.createLogger({

  level:
    config.logging?.level ||
    (isProduction ? 'info' : 'debug'),

  format: baseFormat,

  defaultMeta: {
    service: serviceName,
    version: serviceVersion,
    environment: config.env,
    ...(isLambda && {
      runtime: 'aws-lambda'
    })
  },

  transports,


  exitOnError: false
});


// Winston Internal Error Handling


logger.on('error', (error) => {

  // eslint-disable-next-line no-console
  console.error(
    '[logger] Winston internal error:',
    error.message
  );
});


// Uncaught Exception


process.on(
  'uncaughtException',
  (error) => {

    logger.error(
      'Uncaught exception',
      {
        error: error.message,
        stack: error.stack
      }
    );

    
  }
);


// Unhandled Promise Rejection


process.on(
  'unhandledRejection',
  (reason) => {

    if (reason instanceof Error) {

      logger.error(
        'Unhandled promise rejection',
        {
          error: reason.message,
          stack: reason.stack
        }
      );

    } else {

      logger.error(
        'Unhandled promise rejection',
        {
          reason
        }
      );
    }
  }
);


// Startup Information


logger.info('Logger initialized', {
  service: serviceName,
  version: serviceVersion,
  environment: config.env,
  fileLogging: fileLoggingEnabled,
  lambda: isLambda
});


// Export


export default logger;

