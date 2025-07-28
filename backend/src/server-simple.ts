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
// import securityRoutes from './routes/security';
import { errorHandler } from './middleware/errorHandler';
import { setSecurityHeaders, enforceHTTPS } from './middleware/encryptionMiddleware';

const app = express();
const PORT = process.env.PORT || 5003;

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for development
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => process.env.NODE_ENV === 'development', // Skip rate limiting in development
});

app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(enforceHTTPS);
app.use(setSecurityHeaders);

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3002'];
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

app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'PulsePay API is working!',
    cors: 'CORS is configured correctly',
    timestamp: new Date().toISOString()
  });
});


// Import authentication middleware and services
import { authenticateToken } from './middleware/auth';
import { db } from './config/firebase';
import { UserService } from './services/userService';

// Production endpoints with authentication
app.get('/api/transactions', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const userEmail = req.user.email;
    console.log(`Fetching transactions for user: ${userId} (${userEmail})`);
    
    // Get user's transactions from Firestore - try by userId first, then by email
    const transactionsRef = db.collection('transactions');
    let snapshot = await transactionsRef.where('userId', '==', userId).limit(50).get();
    
    // If no transactions found by userId, try by customerEmail (for older transactions)
    if (snapshot.docs.length === 0 && userEmail) {
      console.log(`No transactions found by userId, trying by email: ${userEmail}`);
      snapshot = await transactionsRef.where('customerEmail', '==', userEmail).limit(50).get();
    }
    
    console.log(`Found ${snapshot.docs.length} transactions for user ${userId}`);
    
    const transactions = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })).sort((a: any, b: any) => {
      const dateA = new Date(a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt);
      const dateB = new Date(b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt);
      return dateB.getTime() - dateA.getTime(); // Newest first
    });
    
    // Disable caching for transaction data
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

app.get('/api/dashboard/stats', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const userEmail = req.user.email;
    
    // Get user's transactions for stats calculation - try by userId first, then by email
    const transactionsRef = db.collection('transactions');
    let snapshot = await transactionsRef.where('userId', '==', userId).get();
    
    // If no transactions found by userId, try by customerEmail (for older transactions)
    if (snapshot.docs.length === 0 && userEmail) {
      snapshot = await transactionsRef.where('customerEmail', '==', userEmail).get();
    }
    
    const transactions = snapshot.docs.map(doc => doc.data());
    
    // Calculate stats
    const totalRevenue = transactions
      .filter(t => t.status === 'succeeded')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalTransactions = transactions.length;
    const successCount = transactions.filter(t => t.status === 'succeeded').length;
    const pendingCount = transactions.filter(t => t.status === 'pending').length;
    const failedCount = transactions.filter(t => t.status === 'failed').length;
    const successRate = totalTransactions > 0 ? (successCount / totalTransactions) * 100 : 0;
    
    // Calculate last month for growth comparison
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    
    const currentMonthTransactions = transactions.filter((t: any) => {
      const txDate = new Date(t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt);
      return txDate >= currentMonth;
    });
    
    const lastMonthTransactions = transactions.filter((t: any) => {
      const txDate = new Date(t.createdAt?.toDate ? t.createdAt.toDate() : t.createdAt);
      return txDate >= lastMonth && txDate < currentMonth;
    });
    
    const monthlyRevenue = currentMonthTransactions
      .filter(t => t.status === 'succeeded')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
      
    const lastMonthRevenue = lastMonthTransactions
      .filter(t => t.status === 'succeeded')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    // Calculate revenue growth
    let revenueGrowth = 0;
    if (lastMonthRevenue > 0) {
      revenueGrowth = ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100;
    } else if (monthlyRevenue > 0) {
      revenueGrowth = 100; // 100% growth if we had no revenue last month but have some this month
    }
    
    const avgTransactionValue = successCount > 0 ? totalRevenue / successCount : 0;
    
    // Disable caching for dashboard stats
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    res.json({
      totalRevenue,
      totalTransactions,
      successRate: parseFloat(successRate.toFixed(1)),
      revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
      pendingTransactions: pendingCount,
      failedTransactions: failedCount,
      avgTransactionValue: parseFloat(avgTransactionValue.toFixed(2)),
      monthlyRevenue
    });
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
    res.status(500).json({ error: 'Failed to calculate stats' });
  }
});

// User initialization endpoint
app.post('/api/auth/init-user', authenticateToken, async (req: any, res) => {
  try {
    const firebaseUser = {
      uid: req.user.uid,
      email: req.user.email,
      displayName: req.user.name,
      emailVerified: true
    };
    
    const user = await UserService.createOrUpdateUser(firebaseUser);
    res.json({ user, message: 'User initialized successfully' });
  } catch (error) {
    console.error('Error initializing user:', error);
    res.status(500).json({ error: 'Failed to initialize user' });
  }
});

// Real Stripe payment endpoint
app.post('/api/payments/create-payment-intent', authenticateToken, async (req: any, res) => {
  try {
    const { amount, currency = 'usd', description, customerEmail } = req.body;
    const userId = req.user.uid;

    if (!amount || amount < 50) {
      return res.status(400).json({ error: 'Amount must be at least $0.50' });
    }

    // Import stripe here to avoid import issues
    const { stripe } = require('./config/stripe');

    // Create payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount), // Amount in cents
      currency: currency.toLowerCase(),
      description: description || 'Payment',
      metadata: {
        userId,
        customerEmail: customerEmail || req.user.email
      }
    });

    // Save transaction to Firestore
    const transactionData = {
      userId,
      amount: amount,
      currency: currency.toUpperCase(),
      status: 'pending',
      type: 'payment',
      description: description || 'Payment',
      customerEmail: customerEmail || req.user.email,
      customerName: req.user.name,
      stripePaymentIntentId: paymentIntent.id,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('transactions').add(transactionData);

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      transactionId: docRef.id
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Simple payment test endpoint (without requiring card details)
app.post('/api/payments/create-test-payment', authenticateToken, async (req: any, res) => {
  try {
    const { amount = 1000, description = 'Test payment' } = req.body;
    const userId = req.user.uid;

    // Create a test transaction in Firestore (simulating successful payment)
    const transactionData = {
      userId,
      amount: amount,
      currency: 'USD',
      status: 'succeeded',
      type: 'payment',
      description: description,
      customerEmail: req.user.email,
      customerName: req.user.name,
      stripePaymentIntentId: `pi_test_${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const docRef = await db.collection('transactions').add(transactionData);

    res.json({
      success: true,
      transactionId: docRef.id,
      message: 'Test payment created successfully'
    });
  } catch (error) {
    console.error('Error creating test payment:', error);
    res.status(500).json({ error: 'Failed to create test payment' });
  }
});

// Development endpoint to check all data in database
app.get('/api/admin/check-database', async (req: any, res) => {
  try {
    // Check all collections and their contents
    const result = {
      users: [],
      transactions: [],
      collections: []
    };

    // Get all users
    const usersSnapshot = await db.collection('users').get();
    result.users = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get all transactions
    const transactionsSnapshot = await db.collection('transactions').get();
    result.transactions = transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // List all collections
    const collections = await db.listCollections();
    result.collections = collections.map(col => col.id);

    console.log('Database check results:');
    console.log(`- Users: ${result.users.length}`);
    console.log(`- Transactions: ${result.transactions.length}`);
    console.log(`- Collections: ${result.collections.join(', ')}`);

    res.json({
      success: true,
      summary: {
        usersCount: result.users.length,
        transactionsCount: result.transactions.length,
        collectionsCount: result.collections.length
      },
      data: result
    });
  } catch (error) {
    console.error('Error checking database:', error);
    res.status(500).json({ error: 'Failed to check database' });
  }
});

// Development endpoint to create test transactions
app.post('/api/admin/create-test-data', async (req: any, res) => {
  try {
    const userId = 'zRC67lm6KOOjEeW0IHGPVVM0eVt2'; // Your user ID from logs
    const userEmail = 'test@example.com';
    const userName = 'Test User';

    const testTransactions = [
      {
        userId,
        amount: 2500,
        currency: 'USD',
        status: 'succeeded',
        type: 'payment',
        description: 'Coffee subscription',
        customerEmail: userEmail,
        customerName: userName,
        stripePaymentIntentId: `pi_test_${Date.now()}_1`,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        userId,
        amount: 5000,
        currency: 'USD',
        status: 'succeeded',
        type: 'payment',
        description: 'Monthly software subscription',
        customerEmail: userEmail,
        customerName: userName,
        stripePaymentIntentId: `pi_test_${Date.now()}_2`,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        updatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        userId,
        amount: 1200,
        currency: 'USD',
        status: 'pending',
        type: 'payment',
        description: 'Pending purchase',
        customerEmail: userEmail,
        customerName: userName,
        stripePaymentIntentId: `pi_test_${Date.now()}_3`,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        updatedAt: new Date(Date.now() - 2 * 60 * 60 * 1000)
      },
      {
        userId,
        amount: 7500,
        currency: 'USD',
        status: 'succeeded',
        type: 'payment',
        description: 'E-commerce purchase',
        customerEmail: userEmail,
        customerName: userName,
        stripePaymentIntentId: `pi_test_${Date.now()}_4`,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
      }
    ];

    console.log(`Creating ${testTransactions.length} test transactions for user: ${userId}`);
    const createdTransactions = [];
    
    for (const transaction of testTransactions) {
      const docRef = await db.collection('transactions').add(transaction);
      createdTransactions.push({ id: docRef.id, ...transaction });
      console.log(`✅ Created transaction: ${docRef.id} - $${transaction.amount/100} (${transaction.status})`);
    }
    
    res.json({
      success: true,
      message: `Created ${testTransactions.length} test transactions`,
      transactions: createdTransactions
    });
  } catch (error) {
    console.error('Error creating test data:', error);
    res.status(500).json({ error: 'Failed to create test data' });
  }
});

// Admin endpoint to clean up ALL test/fake data
app.delete('/api/admin/cleanup-all-test-data', async (req: any, res) => {
  try {
    const userId = 'zRC67lm6KOOjEeW0IHGPVVM0eVt2'; // Your user ID
    
    // Find and delete ALL transactions for this user (since we only created test data)
    const snapshot = await db.collection('transactions')
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    let deletedCount = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Delete all test transactions (those with pi_test_ prefix and common test descriptions)
      if (
        data.stripePaymentIntentId?.startsWith('pi_test_') ||
        data.description?.includes('Coffee subscription') ||
        data.description?.includes('Monthly software subscription') ||
        data.description?.includes('E-commerce purchase') ||
        data.description?.includes('Pending purchase') ||
        data.description?.includes('Test payment') ||
        data.description?.includes('Premium subscription') ||
        data.description?.includes('Product purchase') ||
        data.description?.includes('Service payment') ||
        data.description?.includes('Enterprise plan') ||
        data.description?.includes('Pending payment') ||
        data.customerEmail === 'test@example.com'
      ) {
        batch.delete(doc.ref);
        deletedCount++;
        console.log(`🗑️ Deleting test transaction: ${doc.id} - ${data.description}`);
      }
    });
    
    if (deletedCount > 0) {
      await batch.commit();
    }
    
    console.log(`✅ Cleaned up ${deletedCount} test transactions`);
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} test transactions`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up test data:', error);
    res.status(500).json({ error: 'Failed to cleanup test data' });
  }
});

// Admin endpoint to clean up sample data (legacy)
app.delete('/api/admin/cleanup-sample-data', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    
    // Find and delete all transactions with sample IDs for this user
    const snapshot = await db.collection('transactions')
      .where('userId', '==', userId)
      .get();
    
    const batch = db.batch();
    let deletedCount = 0;
    
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      // Delete transactions that look like sample data
      if (
        doc.id.startsWith('sample_') || 
        data.stripePaymentIntentId?.startsWith('pi_sample_') ||
        data.description?.includes('Test payment') ||
        data.description?.includes('Premium subscription') ||
        data.description?.includes('Product purchase') ||
        data.description?.includes('Service payment') ||
        data.description?.includes('Enterprise plan') ||
        data.description?.includes('Pending payment')
      ) {
        batch.delete(doc.ref);
        deletedCount++;
      }
    });
    
    if (deletedCount > 0) {
      await batch.commit();
    }
    
    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} sample transactions`,
      deletedCount
    });
  } catch (error) {
    console.error('Error cleaning up sample data:', error);
    res.status(500).json({ error: 'Failed to cleanup sample data' });
  }
});

// Subscriptions CRUD endpoints
app.get('/api/subscriptions', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('subscriptions').where('userId', '==', userId).get();
    const subscriptions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

app.post('/api/subscriptions', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const subscriptionData = {
      ...req.body,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await db.collection('subscriptions').add(subscriptionData);
    res.json({ id: docRef.id, ...subscriptionData });
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

app.put('/api/subscriptions/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    
    // Verify ownership
    const doc = await db.collection('subscriptions').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    await db.collection('subscriptions').doc(id).update(updateData);
    res.json({ id, ...updateData });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

app.delete('/api/subscriptions/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    // Verify ownership
    const doc = await db.collection('subscriptions').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Subscription not found' });
    }
    
    await db.collection('subscriptions').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

// Split Payments CRUD endpoints
app.get('/api/split-payments', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('splitPayments').where('userId', '==', userId).get();
    const splitPayments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(splitPayments);
  } catch (error) {
    console.error('Error fetching split payments:', error);
    res.status(500).json({ error: 'Failed to fetch split payments' });
  }
});

app.post('/api/split-payments', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const splitPaymentData = {
      ...req.body,
      userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await db.collection('splitPayments').add(splitPaymentData);
    res.json({ id: docRef.id, ...splitPaymentData });
  } catch (error) {
    console.error('Error creating split payment:', error);
    res.status(500).json({ error: 'Failed to create split payment' });
  }
});

app.put('/api/split-payments/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    
    const doc = await db.collection('splitPayments').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Split payment not found' });
    }
    
    await db.collection('splitPayments').doc(id).update(updateData);
    res.json({ id, ...updateData });
  } catch (error) {
    console.error('Error updating split payment:', error);
    res.status(500).json({ error: 'Failed to update split payment' });
  }
});

app.delete('/api/split-payments/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const doc = await db.collection('splitPayments').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Split payment not found' });
    }
    
    await db.collection('splitPayments').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting split payment:', error);
    res.status(500).json({ error: 'Failed to delete split payment' });
  }
});

// Payment Links CRUD endpoints
app.get('/api/payment-links', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('paymentLinks').where('userId', '==', userId).get();
    const paymentLinks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(paymentLinks);
  } catch (error) {
    console.error('Error fetching payment links:', error);
    res.status(500).json({ error: 'Failed to fetch payment links' });
  }
});

app.post('/api/payment-links', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const paymentLinkData = {
      ...req.body,
      userId,
      url: `https://pay.pulsepay.com/link/${Math.random().toString(36).substr(2, 9)}`,
      clicks: 0,
      conversions: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await db.collection('paymentLinks').add(paymentLinkData);
    res.json({ id: docRef.id, ...paymentLinkData });
  } catch (error) {
    console.error('Error creating payment link:', error);
    res.status(500).json({ error: 'Failed to create payment link' });
  }
});

app.put('/api/payment-links/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    
    const doc = await db.collection('paymentLinks').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Payment link not found' });
    }
    
    await db.collection('paymentLinks').doc(id).update(updateData);
    res.json({ id, ...updateData });
  } catch (error) {
    console.error('Error updating payment link:', error);
    res.status(500).json({ error: 'Failed to update payment link' });
  }
});

app.delete('/api/payment-links/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const doc = await db.collection('paymentLinks').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Payment link not found' });
    }
    
    await db.collection('paymentLinks').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting payment link:', error);
    res.status(500).json({ error: 'Failed to delete payment link' });
  }
});

// QR Codes CRUD endpoints
app.get('/api/qr-codes', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('qrCodes').where('userId', '==', userId).get();
    const qrCodes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(qrCodes);
  } catch (error) {
    console.error('Error fetching QR codes:', error);
    res.status(500).json({ error: 'Failed to fetch QR codes' });
  }
});

app.post('/api/qr-codes', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const qrCodeData = {
      ...req.body,
      userId,
      qrCodeUrl: `/api/qr/${Math.random().toString(36).substr(2, 9)}`,
      scans: 0,
      payments: 0,
      createdAt: new Date(),
      lastUsed: new Date(),
      updatedAt: new Date()
    };
    const docRef = await db.collection('qrCodes').add(qrCodeData);
    res.json({ id: docRef.id, ...qrCodeData });
  } catch (error) {
    console.error('Error creating QR code:', error);
    res.status(500).json({ error: 'Failed to create QR code' });
  }
});

app.put('/api/qr-codes/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    
    const doc = await db.collection('qrCodes').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'QR code not found' });
    }
    
    await db.collection('qrCodes').doc(id).update(updateData);
    res.json({ id, ...updateData });
  } catch (error) {
    console.error('Error updating QR code:', error);
    res.status(500).json({ error: 'Failed to update QR code' });
  }
});

app.delete('/api/qr-codes/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const doc = await db.collection('qrCodes').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'QR code not found' });
    }
    
    await db.collection('qrCodes').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting QR code:', error);
    res.status(500).json({ error: 'Failed to delete QR code' });
  }
});

// Bulk Payments CRUD endpoints
app.get('/api/bulk-payments', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('bulkPayments').where('userId', '==', userId).get();
    const bulkPayments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(bulkPayments);
  } catch (error) {
    console.error('Error fetching bulk payments:', error);
    res.status(500).json({ error: 'Failed to fetch bulk payments' });
  }
});

app.post('/api/bulk-payments', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const bulkPaymentData = {
      ...req.body,
      userId,
      createdBy: req.user.name || req.user.email,
      successfulPayments: 0,
      failedPayments: 0,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await db.collection('bulkPayments').add(bulkPaymentData);
    res.json({ id: docRef.id, ...bulkPaymentData });
  } catch (error) {
    console.error('Error creating bulk payment:', error);
    res.status(500).json({ error: 'Failed to create bulk payment' });
  }
});

app.put('/api/bulk-payments/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    
    const doc = await db.collection('bulkPayments').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Bulk payment not found' });
    }
    
    await db.collection('bulkPayments').doc(id).update(updateData);
    res.json({ id, ...updateData });
  } catch (error) {
    console.error('Error updating bulk payment:', error);
    res.status(500).json({ error: 'Failed to update bulk payment' });
  }
});

app.delete('/api/bulk-payments/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const doc = await db.collection('bulkPayments').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Bulk payment not found' });
    }
    
    await db.collection('bulkPayments').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting bulk payment:', error);
    res.status(500).json({ error: 'Failed to delete bulk payment' });
  }
});

// Scheduled Payments CRUD endpoints
app.get('/api/scheduled-payments', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const snapshot = await db.collection('scheduledPayments').where('userId', '==', userId).get();
    const scheduledPayments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(scheduledPayments);
  } catch (error) {
    console.error('Error fetching scheduled payments:', error);
    res.status(500).json({ error: 'Failed to fetch scheduled payments' });
  }
});

app.post('/api/scheduled-payments', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const scheduledPaymentData = {
      ...req.body,
      userId,
      totalPaid: 0,
      paymentsCount: 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    const docRef = await db.collection('scheduledPayments').add(scheduledPaymentData);
    res.json({ id: docRef.id, ...scheduledPaymentData });
  } catch (error) {
    console.error('Error creating scheduled payment:', error);
    res.status(500).json({ error: 'Failed to create scheduled payment' });
  }
});

app.put('/api/scheduled-payments/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    const updateData = { ...req.body, updatedAt: new Date() };
    
    const doc = await db.collection('scheduledPayments').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Scheduled payment not found' });
    }
    
    await db.collection('scheduledPayments').doc(id).update(updateData);
    res.json({ id, ...updateData });
  } catch (error) {
    console.error('Error updating scheduled payment:', error);
    res.status(500).json({ error: 'Failed to update scheduled payment' });
  }
});

app.delete('/api/scheduled-payments/:id', authenticateToken, async (req: any, res) => {
  try {
    const userId = req.user.uid;
    const { id } = req.params;
    
    const doc = await db.collection('scheduledPayments').doc(id).get();
    if (!doc.exists || doc.data()?.userId !== userId) {
      return res.status(404).json({ error: 'Scheduled payment not found' });
    }
    
    await db.collection('scheduledPayments').doc(id).delete();
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting scheduled payment:', error);
    res.status(500).json({ error: 'Failed to delete scheduled payment' });
  }
});

// Core routes
app.use('/api/payments', paymentRoutes);
app.use('/api/customers', customerRoutes);
// app.use('/api/security', securityRoutes);

app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 PulsePay Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 Frontend: http://localhost:3002`);
  });
}

export default app;