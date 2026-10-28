import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { configureHelmet, configureCors, generalRateLimiter } from './config/security.js';
import { configureSession } from './config/session.js';
import { csrfProtection } from './middleware/csrf.middleware.js';
import { errorHandler } from './middleware/error.middleware.js';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import datasetRoutes from './routes/dataset.routes.js';
import analysisRoutes from './routes/analysis.routes.js';
import userRoutes from './routes/user.routes.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDir = path.resolve(__dirname, '../../client');

const app = express();

// Trust proxy for rate limiting behind reverse proxies (Nginx, Render, etc.)
app.set('trust proxy', 1);

// Security & CORS
app.use(configureHelmet());
app.use(configureCors());

// Body Parsers
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

// Session Management
app.use(configureSession());

// CSRF Protection
app.use(csrfProtection);

// Static Client Files with clean extension resolution
app.use(express.static(clientDir, { extensions: ['html'] }));

// API Rate Limiting
app.use('/api/', generalRateLimiter);

// Health Check
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'DataLens Studio API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// Mount API v1 Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/datasets', datasetRoutes);
app.use('/api/v1/analyses', analysisRoutes);
app.use('/api/v1/user', userRoutes);

// 404 Handler for undefined API routes
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
