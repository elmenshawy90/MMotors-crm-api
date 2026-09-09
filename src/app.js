import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import config from './config/index.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';
import { rateLimiter, validateRequest, sanitizeInput } from './middleware/security.middleware.js';

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
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

dotenv.config();

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: config.cors.origin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Compression
app.use(compression());

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request validation and sanitization
app.use(validateRequest);
app.use(sanitizeInput);

// Rate limiting
app.use('/api/', rateLimiter);

// Logging
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.env
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/phone-calls', phoneCallRoutes);
app.use('/api/helpdesk', helpdeskRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/stations', stationRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/warranty-packages', warrantyPackageRoutes);
app.use('/api/mail-groups', mailGroupRoutes);
app.use('/api/definitions', definitionRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/page-access', pageAccessRoutes);
app.use('/api/knowledge', knowledgeRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/upload', uploadRoutes);

// Serve uploaded files as static
app.use('/uploads', express.static(path.resolve(__dirname, '../../uploads')));

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

const PORT = config.port;
const HOST = config.host;

const startServer = async () => {
  try {
    // Initialize database and define all model associations before handling requests
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

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

export default app;
export { startServer };

// Start server if this file is run directly
startServer();
