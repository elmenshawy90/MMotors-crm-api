import winston from 'winston';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import config from '../config/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lambda (/var/task) is read-only — only /tmp is writable.
// LOG_DIR env overrides; default to /tmp/logs on Lambda, ./logs elsewhere.
const logDir =
  process.env.LOG_DIR ||
  (process.env.AWS_LAMBDA_FUNCTION_NAME
    ? '/tmp/logs'
    : path.join(__dirname, '../../logs'));

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
  })
);

const transports = [];

// File transports only if the log dir is actually writable.
// On read-only filesystems (Lambda /var/task) this throws at
// transport construction time and crashes boot — so probe first.
let fileLoggingEnabled = false;
try {
  fs.mkdirSync(logDir, { recursive: true });
  fs.accessSync(logDir, fs.constants.W_OK);
  fileLoggingEnabled = true;
} catch {
  fileLoggingEnabled = false;
}

if (fileLoggingEnabled) {
  transports.push(
    // Write all logs to combined.log
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Write error logs to error.log
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  );
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'car-branch-manager' },
  transports
});

// Console transport: colorized in development, JSON in production
// (CloudWatch / log aggregators capture stdout).
logger.add(
  new winston.transports.Console({
    format: config.env === 'development' ? consoleFormat : logFormat
  })
);

if (!fileLoggingEnabled) {
  // eslint-disable-next-line no-console
  console.warn(`[logger] Log directory not writable (${logDir}), using console-only logging.`);
}

export default logger;
