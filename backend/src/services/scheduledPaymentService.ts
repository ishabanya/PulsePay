import { db } from '../config/firebase';
import { Transaction, PaymentIntentRequest } from '../types';
import { createError } from '../middleware/errorHandler';
import { PaymentService } from './paymentService';

interface ScheduledPayment {
  id: string;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  description: string;
  scheduledDate: Date;
  status: 'scheduled' | 'processing' | 'completed' | 'failed' | 'canceled';
  paymentIntentData: PaymentIntentRequest;
  transactionId?: string;
  errorMessage?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ScheduledPaymentService {
  static async createScheduledPayment(data: {
    amount: number;
    currency: string;
    customerEmail: string;
    customerName: string;
    description: string;
    scheduledDate: Date;
    createdBy: string;
  }): Promise<ScheduledPayment> {
    try {
      const now = new Date();
      
      // Validate scheduled date
      if (data.scheduledDate <= now) {
        throw createError('Scheduled date must be in the future', 400);
      }

      // Don't allow scheduling more than 1 year in advance
      const oneYearFromNow = new Date();
      oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
      
      if (data.scheduledDate > oneYearFromNow) {
        throw createError('Cannot schedule payments more than 1 year in advance', 400);
      }

      const scheduledPayment: Partial<ScheduledPayment> = {
        amount: data.amount,
        currency: data.currency,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        description: data.description,
        scheduledDate: data.scheduledDate,
        status: 'scheduled',
        paymentIntentData: {
          amount: data.amount,
          currency: data.currency,
          customerEmail: data.customerEmail,
          customerName: data.customerName,
          description: data.description
        },
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await db.collection('scheduled_payments').add(scheduledPayment);

      return {
        id: docRef.id,
        ...scheduledPayment
      } as ScheduledPayment;
    } catch (error: any) {
      console.error('Error creating scheduled payment:', error);
      throw createError(error.message || 'Failed to create scheduled payment', 400);
    }
  }

  static async getScheduledPayments(userId: string): Promise<ScheduledPayment[]> {
    try {
      const snapshot = await db
        .collection('scheduled_payments')
        .where('createdBy', '==', userId)
        .orderBy('scheduledDate', 'asc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledDate: doc.data().scheduledDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as ScheduledPayment[];
    } catch (error: any) {
      console.error('Error fetching scheduled payments:', error);
      throw createError('Failed to fetch scheduled payments', 500);
    }
  }

  static async getScheduledPayment(scheduledPaymentId: string): Promise<ScheduledPayment> {
    try {
      const doc = await db.collection('scheduled_payments').doc(scheduledPaymentId).get();

      if (!doc.exists) {
        throw createError('Scheduled payment not found', 404);
      }

      return {
        id: doc.id,
        ...doc.data(),
        scheduledDate: doc.data()?.scheduledDate?.toDate() || new Date(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date()
      } as ScheduledPayment;
    } catch (error: any) {
      console.error('Error fetching scheduled payment:', error);
      throw createError(error.message || 'Failed to fetch scheduled payment', 500);
    }
  }

  static async updateScheduledPayment(
    scheduledPaymentId: string,
    updates: Partial<Pick<ScheduledPayment, 'scheduledDate' | 'amount' | 'description'>>,
    userId: string
  ): Promise<ScheduledPayment> {
    try {
      const scheduledPaymentRef = db.collection('scheduled_payments').doc(scheduledPaymentId);
      const doc = await scheduledPaymentRef.get();

      if (!doc.exists) {
        throw createError('Scheduled payment not found', 404);
      }

      const scheduledPayment = doc.data() as ScheduledPayment;

      if (scheduledPayment.createdBy !== userId) {
        throw createError('You can only update your own scheduled payments', 403);
      }

      if (scheduledPayment.status !== 'scheduled') {
        throw createError('Can only update scheduled payments that are still pending', 400);
      }

      // Validate new scheduled date if provided
      if (updates.scheduledDate) {
        const now = new Date();
        if (updates.scheduledDate <= now) {
          throw createError('Scheduled date must be in the future', 400);
        }

        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
        
        if (updates.scheduledDate > oneYearFromNow) {
          throw createError('Cannot schedule payments more than 1 year in advance', 400);
        }
      }

      const updateData: any = {
        ...updates,
        updatedAt: new Date()
      };

      // If amount or other payment details changed, update paymentIntentData too
      if (updates.amount || updates.description) {
        updateData.paymentIntentData = {
          ...scheduledPayment.paymentIntentData,
          amount: updates.amount || scheduledPayment.amount,
          description: updates.description || scheduledPayment.description
        };
      }

      await scheduledPaymentRef.update(updateData);

      const updatedDoc = await scheduledPaymentRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
        scheduledDate: updatedDoc.data()?.scheduledDate?.toDate() || new Date(),
        createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date()
      } as ScheduledPayment;
    } catch (error: any) {
      console.error('Error updating scheduled payment:', error);
      throw createError(error.message || 'Failed to update scheduled payment', 400);
    }
  }

  static async cancelScheduledPayment(scheduledPaymentId: string, userId: string): Promise<void> {
    try {
      const scheduledPaymentRef = db.collection('scheduled_payments').doc(scheduledPaymentId);
      const doc = await scheduledPaymentRef.get();

      if (!doc.exists) {
        throw createError('Scheduled payment not found', 404);
      }

      const scheduledPayment = doc.data() as ScheduledPayment;

      if (scheduledPayment.createdBy !== userId) {
        throw createError('You can only cancel your own scheduled payments', 403);
      }

      if (scheduledPayment.status !== 'scheduled') {
        throw createError('Can only cancel scheduled payments that are still pending', 400);
      }

      await scheduledPaymentRef.update({
        status: 'canceled',
        updatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Error canceling scheduled payment:', error);
      throw createError(error.message || 'Failed to cancel scheduled payment', 400);
    }
  }

  static async executeScheduledPayment(scheduledPaymentId: string): Promise<void> {
    try {
      const scheduledPaymentRef = db.collection('scheduled_payments').doc(scheduledPaymentId);
      const doc = await scheduledPaymentRef.get();

      if (!doc.exists) {
        console.error(`Scheduled payment ${scheduledPaymentId} not found`);
        return;
      }

      const scheduledPayment = { id: doc.id, ...doc.data() } as ScheduledPayment;

      if (scheduledPayment.status !== 'scheduled') {
        console.log(`Scheduled payment ${scheduledPaymentId} is not in scheduled status: ${scheduledPayment.status}`);
        return;
      }

      // Update status to processing
      await scheduledPaymentRef.update({
        status: 'processing',
        updatedAt: new Date()
      });

      try {
        // Create the payment intent
        const paymentResult = await PaymentService.createPaymentIntent(
          {
            ...scheduledPayment.paymentIntentData,
            type: 'payment'
          },
          scheduledPayment.createdBy
        );

        // Create transaction record
        const transaction: Partial<Transaction> = {
          amount: scheduledPayment.amount,
          currency: scheduledPayment.currency,
          status: 'scheduled',
          type: 'payment',
          description: scheduledPayment.description,
          customerEmail: scheduledPayment.customerEmail,
          customerName: scheduledPayment.customerName,
          stripePaymentIntentId: paymentResult.paymentIntentId,
          scheduledDate: scheduledPayment.scheduledDate,
          createdAt: new Date(),
          updatedAt: new Date()
        };

        const transactionDoc = await db.collection('transactions').add(transaction);

        // Update scheduled payment status to completed
        await scheduledPaymentRef.update({
          status: 'completed',
          transactionId: transactionDoc.id,
          updatedAt: new Date()
        });

        console.log(`Successfully executed scheduled payment ${scheduledPaymentId}`);

      } catch (error: any) {
        console.error(`Error executing scheduled payment ${scheduledPaymentId}:`, error);
        
        // Update status to failed
        await scheduledPaymentRef.update({
          status: 'failed',
          errorMessage: error.message,
          updatedAt: new Date()
        });
      }
    } catch (error: any) {
      console.error(`Error in executeScheduledPayment for ${scheduledPaymentId}:`, error);
    }
  }

  // Process all due scheduled payments (for scheduler)
  static async processDueScheduledPayments(): Promise<void> {
    try {
      const now = new Date();
      
      // Find scheduled payments that are due
      const snapshot = await db
        .collection('scheduled_payments')
        .where('status', '==', 'scheduled')
        .where('scheduledDate', '<=', now)
        .get();

      console.log(`Found ${snapshot.docs.length} scheduled payments due for execution`);

      for (const doc of snapshot.docs) {
        await this.executeScheduledPayment(doc.id);
        
        // Add small delay between executions
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error('Error processing due scheduled payments:', error);
    }
  }

  // Get upcoming payments (next 7 days)
  static async getUpcomingPayments(userId: string): Promise<ScheduledPayment[]> {
    try {
      const now = new Date();
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

      const snapshot = await db
        .collection('scheduled_payments')
        .where('createdBy', '==', userId)
        .where('status', '==', 'scheduled')
        .where('scheduledDate', '>=', now)
        .where('scheduledDate', '<=', oneWeekFromNow)
        .orderBy('scheduledDate', 'asc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        scheduledDate: doc.data().scheduledDate?.toDate() || new Date(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as ScheduledPayment[];
    } catch (error: any) {
      console.error('Error fetching upcoming payments:', error);
      throw createError('Failed to fetch upcoming payments', 500);
    }
  }

  // Get scheduled payment statistics
  static async getScheduledPaymentStats(userId: string): Promise<{
    totalScheduled: number;
    upcomingThisWeek: number;
    completedThisMonth: number;
    totalValueScheduled: number;
  }> {
    try {
      const now = new Date();
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
      
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const [allScheduled, upcomingWeek, completedMonth] = await Promise.all([
        db.collection('scheduled_payments')
          .where('createdBy', '==', userId)
          .where('status', '==', 'scheduled')
          .get(),
        db.collection('scheduled_payments')
          .where('createdBy', '==', userId)
          .where('status', '==', 'scheduled')
          .where('scheduledDate', '>=', now)
          .where('scheduledDate', '<=', oneWeekFromNow)
          .get(),
        db.collection('scheduled_payments')
          .where('createdBy', '==', userId)
          .where('status', '==', 'completed')
          .where('updatedAt', '>=', monthStart)
          .where('updatedAt', '<=', monthEnd)
          .get()
      ]);

      const scheduledPayments = allScheduled.docs.map(doc => doc.data()) as ScheduledPayment[];
      const totalValueScheduled = scheduledPayments.reduce((sum, sp) => sum + sp.amount, 0);

      return {
        totalScheduled: allScheduled.docs.length,
        upcomingThisWeek: upcomingWeek.docs.length,
        completedThisMonth: completedMonth.docs.length,
        totalValueScheduled
      };
    } catch (error: any) {
      console.error('Error fetching scheduled payment stats:', error);
      throw createError('Failed to fetch scheduled payment stats', 500);
    }
  }

  // Retry failed scheduled payment
  static async retryScheduledPayment(scheduledPaymentId: string, userId: string): Promise<void> {
    try {
      const scheduledPaymentRef = db.collection('scheduled_payments').doc(scheduledPaymentId);
      const doc = await scheduledPaymentRef.get();

      if (!doc.exists) {
        throw createError('Scheduled payment not found', 404);
      }

      const scheduledPayment = doc.data() as ScheduledPayment;

      if (scheduledPayment.createdBy !== userId) {
        throw createError('You can only retry your own scheduled payments', 403);
      }

      if (scheduledPayment.status !== 'failed') {
        throw createError('Can only retry failed scheduled payments', 400);
      }

      // Reset to scheduled status and update scheduled date to now
      await scheduledPaymentRef.update({
        status: 'scheduled',
        scheduledDate: new Date(),
        errorMessage: null,
        updatedAt: new Date()
      });

      // Execute immediately
      await this.executeScheduledPayment(scheduledPaymentId);

    } catch (error: any) {
      console.error('Error retrying scheduled payment:', error);
      throw createError(error.message || 'Failed to retry scheduled payment', 400);
    }
  }

  // Cleanup old completed/failed scheduled payments
  static async cleanupOldScheduledPayments(): Promise<void> {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const snapshot = await db
        .collection('scheduled_payments')
        .where('status', 'in', ['completed', 'failed', 'canceled'])
        .where('updatedAt', '<', sixMonthsAgo)
        .get();

      const batch = db.batch();
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`Cleaned up ${snapshot.docs.length} old scheduled payments`);
    } catch (error: any) {
      console.error('Error cleaning up old scheduled payments:', error);
    }
  }

  // Bulk create scheduled payments
  static async createBulkScheduledPayments(data: {
    payments: Array<{
      amount: number;
      customerEmail: string;
      customerName: string;
      description: string;
      scheduledDate: Date;
    }>;
    currency: string;
    createdBy: string;
  }): Promise<ScheduledPayment[]> {
    try {
      if (!data.payments || data.payments.length === 0) {
        throw createError('At least one payment is required', 400);
      }

      if (data.payments.length > 100) {
        throw createError('Maximum 100 scheduled payments allowed per batch', 400);
      }

      const batch = db.batch();
      const scheduledPayments: ScheduledPayment[] = [];
      const now = new Date();

      for (const payment of data.payments) {
        // Validate scheduled date
        if (payment.scheduledDate <= now) {
          throw createError(`Scheduled date must be in the future for ${payment.customerEmail}`, 400);
        }

        const docRef = db.collection('scheduled_payments').doc();
        const scheduledPayment: Partial<ScheduledPayment> = {
          amount: payment.amount,
          currency: data.currency,
          customerEmail: payment.customerEmail,
          customerName: payment.customerName,
          description: payment.description,
          scheduledDate: payment.scheduledDate,
          status: 'scheduled',
          paymentIntentData: {
            amount: payment.amount,
            currency: data.currency,
            customerEmail: payment.customerEmail,
            customerName: payment.customerName,
            description: payment.description
          },
          createdBy: data.createdBy,
          createdAt: now,
          updatedAt: now
        };

        batch.set(docRef, scheduledPayment);
        scheduledPayments.push({
          id: docRef.id,
          ...scheduledPayment
        } as ScheduledPayment);
      }

      await batch.commit();

      return scheduledPayments;
    } catch (error: any) {
      console.error('Error creating bulk scheduled payments:', error);
      throw createError(error.message || 'Failed to create bulk scheduled payments', 400);
    }
  }
}