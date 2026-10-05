import { Router } from 'express';
import healthRoutes from './health.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import invoicesRoutes from './invoices.routes.js';
import walletsRoutes from './wallets.routes.js';
import transfersRoutes from './transfers.routes.js';
import countsRoutes from './counts.routes.js';
import reportsRoutes from './reports.routes.js';
import masterRoutes from './master.routes.js';
import requestsRoutes from './requests.routes.js';
import adminRoutes from './admin.routes.js';
import authRoutes from './auth.routes.js';
import { authenticateJwt } from '../middleware/auth.middleware.js';

const apiRouter = Router();

// Public
apiRouter.use('/', healthRoutes);
apiRouter.use('/auth', authRoutes);

// Everything below requires a valid Bearer token (from /auth/login)
apiRouter.use('/dashboard', authenticateJwt, dashboardRoutes);
apiRouter.use('/invoices', authenticateJwt, invoicesRoutes);
apiRouter.use('/wallets', authenticateJwt, walletsRoutes);
apiRouter.use('/transfers', authenticateJwt, transfersRoutes);
apiRouter.use('/wallet-counts', authenticateJwt, countsRoutes);
apiRouter.use('/reports', authenticateJwt, reportsRoutes);
apiRouter.use('/master', authenticateJwt, masterRoutes);
apiRouter.use('/money-requests', authenticateJwt, requestsRoutes);
apiRouter.use('/admin', authenticateJwt, adminRoutes);

export default apiRouter;
