import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { logger } from './lib/logger.js';
import { auth } from './middleware/auth.js';
import { errorHandler } from './middleware/errorHandler.js';

// Module routers
import authRoutes from './modules/auth/auth.routes.js';
import invoiceRoutes from './modules/invoices/invoice.routes.js';
import walletRoutes from './modules/wallets/wallet.routes.js';
import countRoutes from './modules/counts/count.routes.js';
import requestRoutes from './modules/requests/request.routes.js';
import reportRoutes from './modules/reports/report.routes.js';
import masterRoutes from './modules/master/master.routes.js';
import dashboardRoutes from './modules/dashboard/dashboard.routes.js';
import healthRoutes from './modules/health/health.routes.js';
import adminRoutes from './modules/admin/admin.routes.js';
import { walletController } from './modules/wallets/wallet.controller.js';

export function createApp() {
  const app = express();

  // Basic Middleware
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request Logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    logger.info(`${req.method} ${req.url}`);
    next();
  });

  // API v1 Router
  const apiRouter = express.Router();

  // Public Routes
  apiRouter.use('/health', healthRoutes);
  apiRouter.use('/auth', authRoutes);

  // Protected Routes (requires JWT)
  apiRouter.use('/invoices', auth, invoiceRoutes);
  apiRouter.use('/wallets', auth, walletRoutes);
  // Direct /transfers endpoint compatibility
  apiRouter.get('/transfers', auth, (req, res) => walletController.getTransfers(req, res));
  apiRouter.post('/transfers', auth, (req, res) => walletController.createTransfer(req, res));
  apiRouter.use('/wallet-counts', auth, countRoutes);
  apiRouter.use('/money-requests', auth, requestRoutes);
  apiRouter.use('/reports', auth, reportRoutes);
  apiRouter.use('/master', auth, masterRoutes);
  apiRouter.use('/dashboard', auth, dashboardRoutes);
  apiRouter.use('/admin', auth, adminRoutes);

  // Mount API v1
  app.use('/api/v1', apiRouter);

  // Health check also at root
  app.use('/health', healthRoutes);

  // Root Welcome Page
  app.get('/', (req: Request, res: Response) => {
    res.json({
      message: 'Welcome to Bonchi Restaurant Income & Expense Management System API',
      architecture: 'apps/api modular (Drizzle ORM & Express)',
      version: '1.0.0',
      endpoints: {
        health: '/api/v1/health',
        dashboard: '/api/v1/dashboard/summary',
        invoices: '/api/v1/invoices',
        wallets: '/api/v1/wallets',
        wallet_counts: '/api/v1/wallet-counts',
        reports: '/api/v1/reports/summary',
        master: '/api/v1/master/products',
      },
    });
  });

  // Global Error Handler
  app.use(errorHandler);

  return app;
}
