import { stripe } from '../config/stripe';
import { db } from '../config/firebase';
import { Subscription, Transaction } from '../types';
import { createError } from '../middleware/errorHandler';
import { CurrencyService } from './currencyService';

export class SubscriptionService {
  static async createSubscription(data: {
    customerId: string;
    amount: number;
    currency: string;
    interval: 'day' | 'week' | 'month' | 'year';
    intervalCount: number;
    description?: string;
    userId: string;
  }): Promise<Subscription> {
    try {
      // Create Stripe product
      const product = await stripe.products.create({
        name: data.description || 'Subscription',
        type: 'service'
      });

      // Create Stripe price
      const price = await stripe.prices.create({
        unit_amount: data.amount,
        currency: data.currency,
        recurring: {
          interval: data.interval,
          interval_count: data.intervalCount
        },
        product: product.id
      });

      // Create Stripe subscription
      const stripeSubscription = await stripe.subscriptions.create({
        customer: data.customerId,
        items: [{ price: price.id }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent']
      });

      const now = new Date();
      const nextPaymentDate = new Date(stripeSubscription.current_period_end * 1000);

      const subscription: Partial<Subscription> = {
        customerId: data.customerId,
        amount: data.amount,
        currency: data.currency,
        interval: data.interval,
        intervalCount: data.intervalCount,
        status: 'active',
        currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        nextPaymentDate,
        stripeSubscriptionId: stripeSubscription.id,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await db.collection('subscriptions').add(subscription);

      return {
        id: docRef.id,
        ...subscription
      } as Subscription;
    } catch (error: any) {
      console.error('Error creating subscription:', error);
      throw createError(error.message || 'Failed to create subscription', 400);
    }
  }

  static async getSubscriptions(userId: string): Promise<Subscription[]> {
    try {
      const snapshot = await db
        .collection('subscriptions')
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        currentPeriodStart: doc.data().currentPeriodStart?.toDate() || new Date(),
        currentPeriodEnd: doc.data().currentPeriodEnd?.toDate() || new Date(),
        nextPaymentDate: doc.data().nextPaymentDate?.toDate() || new Date()
      })) as Subscription[];
    } catch (error: any) {
      console.error('Error fetching subscriptions:', error);
      throw createError('Failed to fetch subscriptions', 500);
    }
  }

  static async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>,
    userId: string
  ): Promise<Subscription> {
    try {
      const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
      const subscriptionDoc = await subscriptionRef.get();

      if (!subscriptionDoc.exists) {
        throw createError('Subscription not found', 404);
      }

      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await subscriptionRef.update(updateData);

      const updatedDoc = await subscriptionRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
        createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
        currentPeriodStart: updatedDoc.data()?.currentPeriodStart?.toDate() || new Date(),
        currentPeriodEnd: updatedDoc.data()?.currentPeriodEnd?.toDate() || new Date(),
        nextPaymentDate: updatedDoc.data()?.nextPaymentDate?.toDate() || new Date()
      } as Subscription;
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      throw createError(error.message || 'Failed to update subscription', 400);
    }
  }

  static async cancelSubscription(subscriptionId: string, userId: string): Promise<void> {
    try {
      const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
      const subscriptionDoc = await subscriptionRef.get();

      if (!subscriptionDoc.exists) {
        throw createError('Subscription not found', 404);
      }

      const subscriptionData = subscriptionDoc.data() as Subscription;

      // Cancel in Stripe if it has a Stripe subscription ID
      if (subscriptionData.stripeSubscriptionId) {
        await stripe.subscriptions.cancel(subscriptionData.stripeSubscriptionId);
      }

      // Update local record
      await subscriptionRef.update({
        status: 'canceled',
        updatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Error canceling subscription:', error);
      throw createError(error.message || 'Failed to cancel subscription', 400);
    }
  }

  static async pauseSubscription(subscriptionId: string, userId: string): Promise<void> {
    try {
      const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
      const subscriptionDoc = await subscriptionRef.get();

      if (!subscriptionDoc.exists) {
        throw createError('Subscription not found', 404);
      }

      const subscriptionData = subscriptionDoc.data() as Subscription;

      // Pause in Stripe if it has a Stripe subscription ID
      if (subscriptionData.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscriptionData.stripeSubscriptionId, {
          pause_collection: {
            behavior: 'void'
          }
        });
      }

      // Update local record
      await subscriptionRef.update({
        status: 'paused',
        updatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Error pausing subscription:', error);
      throw createError(error.message || 'Failed to pause subscription', 400);
    }
  }

  static async resumeSubscription(subscriptionId: string, userId: string): Promise<void> {
    try {
      const subscriptionRef = db.collection('subscriptions').doc(subscriptionId);
      const subscriptionDoc = await subscriptionRef.get();

      if (!subscriptionDoc.exists) {
        throw createError('Subscription not found', 404);
      }

      const subscriptionData = subscriptionDoc.data() as Subscription;

      // Resume in Stripe if it has a Stripe subscription ID
      if (subscriptionData.stripeSubscriptionId) {
        await stripe.subscriptions.update(subscriptionData.stripeSubscriptionId, {
          pause_collection: null
        });
      }

      // Update local record
      await subscriptionRef.update({
        status: 'active',
        updatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Error resuming subscription:', error);
      throw createError(error.message || 'Failed to resume subscription', 400);
    }
  }

  // Process recurring payments (for scheduler)
  static async processRecurringPayments(): Promise<void> {
    try {
      const now = new Date();
      
      // Find subscriptions due for payment
      const snapshot = await db
        .collection('subscriptions')
        .where('status', '==', 'active')
        .where('nextPaymentDate', '<=', now)
        .get();

      for (const doc of snapshot.docs) {
        const subscription = { id: doc.id, ...doc.data() } as Subscription;
        
        try {
          await this.processSubscriptionPayment(subscription);
        } catch (error) {
          console.error(`Failed to process payment for subscription ${subscription.id}:`, error);
        }
      }
    } catch (error: any) {
      console.error('Error processing recurring payments:', error);
    }
  }

  private static async processSubscriptionPayment(subscription: Subscription): Promise<void> {
    try {
      // Create a transaction record for the recurring payment
      const transaction: Partial<Transaction> = {
        amount: subscription.amount,
        currency: subscription.currency,
        status: 'processing',
        type: 'subscription',
        description: `Subscription payment - ${subscription.id}`,
        customerEmail: '', // Would need to get from customer record
        customerName: '', // Would need to get from customer record
        subscriptionId: subscription.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Add transaction to database
      await db.collection('transactions').add(transaction);

      // Calculate next payment date
      const nextPaymentDate = this.calculateNextPaymentDate(
        subscription.nextPaymentDate,
        subscription.interval,
        subscription.intervalCount
      );

      // Update subscription
      await db.collection('subscriptions').doc(subscription.id).update({
        currentPeriodStart: subscription.nextPaymentDate,
        currentPeriodEnd: nextPaymentDate,
        nextPaymentDate,
        updatedAt: new Date()
      });

    } catch (error: any) {
      console.error('Error processing subscription payment:', error);
      throw error;
    }
  }

  private static calculateNextPaymentDate(
    currentDate: Date,
    interval: 'day' | 'week' | 'month' | 'year',
    intervalCount: number
  ): Date {
    const nextDate = new Date(currentDate);

    switch (interval) {
      case 'day':
        nextDate.setDate(nextDate.getDate() + intervalCount);
        break;
      case 'week':
        nextDate.setDate(nextDate.getDate() + (intervalCount * 7));
        break;
      case 'month':
        nextDate.setMonth(nextDate.getMonth() + intervalCount);
        break;
      case 'year':
        nextDate.setFullYear(nextDate.getFullYear() + intervalCount);
        break;
    }

    return nextDate;
  }

  static async getSubscriptionStats(userId: string): Promise<{
    activeSubscriptions: number;
    monthlyRecurringRevenue: number;
    churnRate: number;
    averageSubscriptionValue: number;
  }> {
    try {
      const snapshot = await db.collection('subscriptions').get();
      const subscriptions = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Subscription[];

      const activeSubscriptions = subscriptions.filter(s => s.status === 'active').length;
      
      // Calculate MRR (Monthly Recurring Revenue)
      const monthlyRecurringRevenue = subscriptions
        .filter(s => s.status === 'active')
        .reduce((total, s) => {
          let monthlyAmount = s.amount;
          
          // Convert to monthly amount based on interval
          switch (s.interval) {
            case 'day':
              monthlyAmount = s.amount * 30 / s.intervalCount;
              break;
            case 'week':
              monthlyAmount = s.amount * 4.33 / s.intervalCount; // Average weeks per month
              break;
            case 'month':
              monthlyAmount = s.amount / s.intervalCount;
              break;
            case 'year':
              monthlyAmount = s.amount / (s.intervalCount * 12);
              break;
          }
          
          return total + monthlyAmount;
        }, 0);

      const totalSubscriptions = subscriptions.length;
      const canceledSubscriptions = subscriptions.filter(s => s.status === 'canceled').length;
      const churnRate = totalSubscriptions > 0 ? (canceledSubscriptions / totalSubscriptions) * 100 : 0;

      const averageSubscriptionValue = activeSubscriptions > 0 
        ? monthlyRecurringRevenue / activeSubscriptions 
        : 0;

      return {
        activeSubscriptions,
        monthlyRecurringRevenue,
        churnRate,
        averageSubscriptionValue
      };
    } catch (error: any) {
      console.error('Error fetching subscription stats:', error);
      throw createError('Failed to fetch subscription stats', 500);
    }
  }
}