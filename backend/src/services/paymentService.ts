import { stripe } from '../config/stripe';
import { db } from '../config/firebase';
import { Transaction, PaymentIntentRequest, DashboardStats } from '../types';
import { createError } from '../middleware/errorHandler';
import { CurrencyService } from './currencyService';
import { ComplianceService } from './complianceService';

export class PaymentService {
  static async createPaymentIntent(data: PaymentIntentRequest, userId: string) {
    try {
      // Validate currency support
      if (!CurrencyService.isCurrencySupported(data.currency)) {
        throw createError(`Currency ${data.currency} is not supported`, 400);
      }

      // Handle currency conversion if needed
      let finalAmount = data.amount;
      let exchangeRate: number | undefined;
      let originalAmount: number | undefined;
      let originalCurrency: string | undefined;

      // If user has a preferred currency different from payment currency, convert
      // This would typically come from user settings
      const userPreferredCurrency = 'USD'; // Would fetch from user settings
      
      if (data.currency !== userPreferredCurrency && data.type !== 'split' && data.type !== 'bulk') {
        try {
          const conversion = await CurrencyService.convertAmount(
            data.amount, 
            data.currency, 
            userPreferredCurrency
          );
          originalAmount = data.amount;
          originalCurrency = data.currency;
          finalAmount = conversion.convertedAmount;
          exchangeRate = conversion.exchangeRate;
        } catch (error) {
          console.log('Currency conversion failed, using original currency');
        }
      }

      // Calculate tax if applicable
      let taxAmount: number | undefined;
      let taxRate: number | undefined;
      
      if (data.taxRate) {
        taxRate = data.taxRate;
        taxAmount = Math.round((finalAmount * taxRate) / 100);
        finalAmount += taxAmount;
      }

      // Create Stripe payment intent with enhanced metadata
      const paymentIntentData: any = {
        amount: finalAmount,
        currency: data.currency,
        automatic_payment_methods: {
          enabled: true,
        },
        metadata: {
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          description: data.description,
          userId: userId,
          type: data.type || 'payment',
          ...(originalAmount && { originalAmount: originalAmount.toString() }),
          ...(originalCurrency && { originalCurrency }),
          ...(exchangeRate && { exchangeRate: exchangeRate.toString() }),
          ...(taxAmount && { taxAmount: taxAmount.toString() }),
          ...(taxRate && { taxRate: taxRate.toString() })
        }
      };

      // Add payment method configuration based on type
      if (data.paymentMethod) {
        switch (data.paymentMethod) {
          case 'apple_pay':
            paymentIntentData.payment_method_types = ['card'];
            paymentIntentData.payment_method_options = {
              card: { request_three_d_secure: 'automatic' }
            };
            break;
          case 'google_pay':
            paymentIntentData.payment_method_types = ['card'];
            break;
          case 'sepa':
            paymentIntentData.payment_method_types = ['sepa_debit'];
            break;
          case 'ach':
            paymentIntentData.payment_method_types = ['us_bank_account'];
            break;
        }
      }

      const paymentIntent = await stripe.paymentIntents.create(paymentIntentData);

      const transaction: Partial<Transaction> = {
        userId: userId, // Add userId to the transaction
        amount: finalAmount,
        currency: data.currency,
        originalAmount,
        originalCurrency,
        exchangeRate,
        status: data.scheduledDate ? 'scheduled' : 'pending',
        type: data.type || 'payment',
        description: data.description,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        stripePaymentIntentId: paymentIntent.id,
        scheduledDate: data.scheduledDate,
        taxAmount,
        taxRate,
        paymentMethod: data.paymentMethod,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const docRef = await db.collection('transactions').add(transaction);
      
      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        transactionId: docRef.id,
      };
    } catch (error: any) {
      console.error('Error creating payment intent:', error);
      console.error('Error details:', error.type, error.code, error.message);
      throw createError(error.message || 'Failed to create payment intent', 400);
    }
  }

  static async confirmPayment(paymentIntentId: string, userId: string) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      
      if (!paymentIntent) {
        throw createError('Payment intent not found', 404);
      }

      const transactionsRef = db.collection('transactions');
      const snapshot = await transactionsRef
        .where('stripePaymentIntentId', '==', paymentIntentId)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw createError('Transaction not found', 404);
      }

      const transactionDoc = snapshot.docs[0];
      const updateData: Partial<Transaction> = {
        status: paymentIntent.status as Transaction['status'],
        updatedAt: new Date(),
      };

      await transactionDoc.ref.update(updateData);

      return {
        success: true,
        status: paymentIntent.status,
        transactionId: transactionDoc.id,
      };
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      throw createError(error.message || 'Failed to confirm payment', 400);
    }
  }

  static async getTransactions(userId: string): Promise<Transaction[]> {
    try {
      console.log('Fetching transactions for user:', userId, '(yadaginishabanya@gmail.com)');
      
      // Try to find transactions by userId first (simplified query to avoid index requirement)
      let snapshot = await db.collection('transactions')
        .where('userId', '==', userId)
        .limit(100)
        .get();

      // If no transactions found by userId, try by email for backward compatibility
      if (snapshot.empty) {
        console.log('No transactions found by userId, trying by email: yadaginishabanya@gmail.com');
        snapshot = await db.collection('transactions')
          .where('customerEmail', '==', 'yadaginishabanya@gmail.com')
          .limit(100)
          .get();
      }

      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Transaction[];

      // Sort by createdAt descending (client-side to avoid Firestore index requirement)
      transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      console.log(`Found ${transactions.length} transactions for user ${userId}`);
      return transactions;
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      throw createError('Failed to fetch transactions', 500);
    }
  }

  static async getDashboardStats(userId: string): Promise<DashboardStats> {
    try {
      const snapshot = await db.collection('transactions').get();
      const transactions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
      })) as Transaction[];

      const totalRevenue = transactions
        .filter(t => t.status === 'succeeded')
        .reduce((sum, t) => sum + t.amount, 0);

      const totalTransactions = transactions.length;
      const successfulTransactions = transactions.filter(t => t.status === 'succeeded').length;
      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentRevenue = transactions
        .filter(t => t.status === 'succeeded' && t.createdAt >= thirtyDaysAgo)
        .reduce((sum, t) => sum + t.amount, 0);

      const previousRevenue = transactions
        .filter(t => {
          const sixtyDaysAgo = new Date();
          sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
          return t.status === 'succeeded' && t.createdAt < thirtyDaysAgo && t.createdAt >= sixtyDaysAgo;
        })
        .reduce((sum, t) => sum + t.amount, 0);

      const revenueGrowth = previousRevenue > 0 
        ? ((recentRevenue - previousRevenue) / previousRevenue) * 100 
        : 0;

      const recentTransactions = transactions
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .slice(0, 5);

      return {
        totalRevenue,
        totalTransactions,
        successRate,
        revenueGrowth,
        recentTransactions,
      };
    } catch (error: any) {
      console.error('Error fetching dashboard stats:', error);
      throw createError('Failed to fetch dashboard stats', 500);
    }
  }

  static async handleWebhook(event: any) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.updateTransactionStatus(event.data.object.id, 'succeeded');
          break;
        case 'payment_intent.payment_failed':
          await this.updateTransactionStatus(event.data.object.id, 'failed');
          break;
        case 'payment_intent.canceled':
          await this.updateTransactionStatus(event.data.object.id, 'canceled');
          break;
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (error: any) {
      console.error('Error handling webhook:', error);
      throw createError('Failed to handle webhook', 500);
    }
  }

  static async completePayment(transactionId: string, paymentIntentId: string, userId: string) {
    try {
      // Update the transaction status to succeeded
      const transactionRef = db.collection('transactions').doc(transactionId);
      const transactionDoc = await transactionRef.get();
      
      if (!transactionDoc.exists) {
        throw createError('Transaction not found', 404);
      }
      
      await transactionRef.update({
        status: 'succeeded',
        updatedAt: new Date(),
      });
      
      return {
        success: true,
        transactionId,
        status: 'succeeded',
      };
    } catch (error: any) {
      console.error('Error completing payment:', error);
      throw createError(error.message || 'Failed to complete payment', 400);
    }
  }

  private static async updateTransactionStatus(paymentIntentId: string, status: Transaction['status']) {
    const transactionsRef = db.collection('transactions');
    const snapshot = await transactionsRef
      .where('stripePaymentIntentId', '==', paymentIntentId)
      .limit(1)
      .get();

    if (!snapshot.empty) {
      const transactionDoc = snapshot.docs[0];
      await transactionDoc.ref.update({
        status,
        updatedAt: new Date(),
      });
    }
  }
}