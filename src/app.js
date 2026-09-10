import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

import config from './config/index.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { rateLimiter, apiRateLimiter, validateRequest, sanitizeInput } from './middleware/security.middleware.js';
import { requireApiKey } from './middleware/apiKey.middleware.js';
import { requestInspector } from './middleware/requestInspector.middleware.js';
import { staticAuthGuard } from './middleware/staticAuth.middleware.js';

// Import routes
import initializeDatabase from './database/index.js';
import authRoutes from './routes/auth.routes.js';
import settingRoutes from './routes/setting.routes.js';
import branchRoutes from './routes/branch.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';
import appointmentRoutes from './routes/appointment.routes.js';
import contactRoutes from './routes/contact.routes.js';
import phoneCallRoutes from './routes/phoneCall.routes.js';
import helpdeskRoutes from './routes/helpdesk.routes.js';
import companyRoutes from './routes/company.routes.js';
import stationRoutes from './routes/station.routes.js';
import employeeRoutes from './routes/employee.routes.js';
import warrantyPackageRoutes from './routes/warrantyPackage.routes.js';
import mailGroupRoutes from './routes/mailGroup.routes.js';
import definitionRoutes from './routes/definition.routes.js';
import roleRoutes from './routes/role.routes.js';
import permissionRoutes from './routes/permission.routes.js';
import pageAccessRoutes from './routes/pageAccess.routes.js';
import knowledgeRoutes from './routes/knowledge.routes.js';
import leadRoutes from './routes/lead.routes.js';
import systemRoutes from './routes/system.routes.js';
import uploadRoutes from './routes/upload.routes.js';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();


//  1 — HTTP Security Headers (Helmet)

app.use(helmet({
  // Content Security Policy 
  contentSecurityPolicy: {
    directives: {
      defaultSrc:     ["'none'"],
      scriptSrc:      ["'none'"],
      styleSrc:       ["'none'"],
      imgSrc:         ["'none'"],
      connectSrc:     ["'none'"],
      fontSrc:        ["'none'"],
      objectSrc:      ["'none'"],
      mediaSrc:       ["'none'"],
      frameSrc:       ["'none'"],
    }
  },
  // HTTP Strict Transport Security —  HTTPS  
  hsts: {
    maxAge: 31536000,        
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  // iframe (clickjacking)
  frameguard: { action: 'deny' },
  // X-Powered-By
  hidePoweredBy: true,
  // cache 
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false  
}));


//  2 — CORS 

app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
}));


//  3 — API Key 
//    /api/* X-API-Key 

app.use('/api/', requireApiKey);


//  4 — Rate Limiting (   brute-force , scraping)

app.use('/api/', rateLimiter);


// Body parsing + Compression

app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));


// طبقة 5 — Input Validation & Sanitization

app.use(validateRequest);
app.use(sanitizeInput);


// طبقة 6 — Request Inspector (كشف SQL injection, XSS, path traversal)

app.use('/api/', requestInspector);


// Logging

if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) }
  }));
}


// Health check 
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});


// API Routes

app.use('/api/auth',              authRoutes);
app.use('/api/settings',          settingRoutes);
app.use('/api/branches',          branchRoutes);
app.use('/api/vehicles',          vehicleRoutes);
app.use('/api/appointments',      appointmentRoutes);
app.use('/api/contacts',          contactRoutes);
app.use('/api/phone-calls',       phoneCallRoutes);
app.use('/api/helpdesk',          helpdeskRoutes);
app.use('/api/companies',         companyRoutes);
app.use('/api/stations',          stationRoutes);
app.use('/api/employees',         employeeRoutes);
app.use('/api/warranty-packages', warrantyPackageRoutes);
app.use('/api/mail-groups',       mailGroupRoutes);
app.use('/api/definitions',       definitionRoutes);
app.use('/api/roles',             roleRoutes);
app.use('/api/permissions',       permissionRoutes);
app.use('/api/page-access',       pageAccessRoutes);
app.use('/api/knowledge',         knowledgeRoutes);
app.use('/api/leads',             leadRoutes);
app.use('/api/system',            systemRoutes);
app.use('/api/upload',            apiRateLimiter, uploadRoutes);


//  7 — Static Files , Authentication Guard
//   WT 

app.use('/uploads', staticAuthGuard, express.static(path.resolve(__dirname, '../uploads')));


// Error Handlers

app.use(notFoundHandler);
app.use(errorHandler);


// Server Startup

const PORT = config.port;
const HOST = config.host;

const startServer = async () => {
  try {
    await initializeDatabase();
    app.listen(PORT, HOST, () => {
      logger.info(`Server is running on http://${HOST}:${PORT}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API Health Check: http://${HOST}:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
export { startServer };

startServer();
