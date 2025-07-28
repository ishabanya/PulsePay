import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

import paymentRoutes from './routes/payments';
import customerRoutes from './routes/customers';
import webhookRoutes from './routes/webhooks';
import subscriptionRoutes from './routes/subscriptions';
import splitPaymentRoutes from './routes/splitPayments';
import paymentLinkRoutes from './routes/paymentLinks';
import qrCodeRoutes from './routes/qrCodes';
import bulkPaymentRoutes from './routes/bulkPayments';
import scheduledPaymentRoutes from './routes/scheduledPayments';
import currencyRoutes from './routes/currency';
import complianceRoutes from './routes/compliance';
import authRoutes from './routes/auth';
import { errorHandler } from './middleware/errorHandler';
import { authenticateToken } from './middleware/auth';
import { PaymentController } from './controllers/paymentController';

const app = express();
const PORT = parseInt(process.env.PORT || '5000', 10);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
});

app.use(helmet());
app.use(compression());
app.use(limiter);

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));

app.use(morgan('combined'));

app.use('/api/webhooks', express.raw({ type: 'application/json' }), webhookRoutes);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// Add temporary test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'API is working!',
    cors: 'CORS is configured correctly',
    timestamp: new Date().toISOString()
  });
});

// Auth routes
app.use('/api/auth', authRoutes);

// Core payment routes
app.use('/api/payments', paymentRoutes);
app.use('/api/customers', customerRoutes);

// Direct access routes for frontend compatibility (disable caching)
app.get('/api/transactions', authenticateToken, (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}, PaymentController.getTransactions);

app.get('/api/dashboard/stats', authenticateToken, (req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
}, PaymentController.getDashboardStats);

// Advanced payment features
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/split-payments', splitPaymentRoutes);
app.use('/api/payment-links', paymentLinkRoutes);
app.use('/api/qr-codes', qrCodeRoutes);
app.use('/api/bulk-payments', bulkPaymentRoutes);
app.use('/api/scheduled-payments', scheduledPaymentRoutes);

// Utility routes
app.use('/api/currency', currencyRoutes);
app.use('/api/compliance', complianceRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  console.log('About to start server...');
  const server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
  });

  server.on('error', (error) => {
    console.error('Server error:', error);
  });
}

export default app;