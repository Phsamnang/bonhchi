import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRouter from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request Logger
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// API Root
app.use('/api/v1', apiRouter);

// Root greeting
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Bonchi Restaurant Income & Expense Management System API',
    version: '1.0.0',
    documentation: '/api/v1/health',
    endpoints: {
      health: '/api/v1/health',
      dashboard: '/api/v1/dashboard/summary',
      invoices: '/api/v1/invoices',
      wallets: '/api/v1/wallets',
      wallet_counts: '/api/v1/wallet-counts',
      reports: '/api/v1/reports/summary',
      export_card: '/api/v1/reports/export-card',
      master: '/api/v1/master/products'
    }
  });
});

// Global Error Handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`🚀 Bonchi Backend Server running at http://localhost:${PORT}`);
  console.log(`📡 API endpoints mounted at http://localhost:${PORT}/api/v1`);
});
