import { db } from '../config/firebase';
import { PaymentLink, Transaction } from '../types';
import { createError } from '../middleware/errorHandler';
import { PaymentService } from './paymentService';
import crypto from 'crypto';

export class PaymentLinkService {
  private static readonly BASE_URL = process.env.APP_BASE_URL || 'https://pulsepay.app';

  static async createPaymentLink(data: {
    amount: number;
    currency: string;
    description: string;
    customerEmail?: string;
    customerName?: string;
    expiresInHours?: number;
    maxUses?: number;
    createdBy: string;
  }): Promise<PaymentLink> {
    try {
      const linkId = this.generateLinkId();
      const url = `${this.BASE_URL}/pay/${linkId}`;
      const now = new Date();
      const expiresAt = data.expiresInHours 
        ? new Date(now.getTime() + data.expiresInHours * 60 * 60 * 1000)
        : undefined;

      const paymentLink: Partial<PaymentLink> = {
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        customerEmail: data.customerEmail,
        customerName: data.customerName,
        url,
        status: 'active',
        expiresAt,
        maxUses: data.maxUses,
        usedCount: 0,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now
      };

      // Use the generated linkId as the document ID for easy retrieval
      await db.collection('payment_links').doc(linkId).set(paymentLink);

      return {
        id: linkId,
        ...paymentLink
      } as PaymentLink;
    } catch (error: any) {
      console.error('Error creating payment link:', error);
      throw createError(error.message || 'Failed to create payment link', 400);
    }
  }

  static async getPaymentLinks(userId: string): Promise<PaymentLink[]> {
    try {
      const snapshot = await db
        .collection('payment_links')
        .where('createdBy', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate()
      })) as PaymentLink[];
    } catch (error: any) {
      console.error('Error fetching payment links:', error);
      throw createError('Failed to fetch payment links', 500);
    }
  }

  static async getPaymentLink(linkId: string): Promise<PaymentLink> {
    try {
      const doc = await db.collection('payment_links').doc(linkId).get();

      if (!doc.exists) {
        throw createError('Payment link not found', 404);
      }

      const paymentLink = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
        expiresAt: doc.data()?.expiresAt?.toDate()
      } as PaymentLink;

      // Check if link is expired
      if (paymentLink.expiresAt && new Date() > paymentLink.expiresAt) {
        await this.deactivatePaymentLink(linkId, 'expired');
        throw createError('Payment link has expired', 410);
      }

      // Check if link has reached max uses
      if (paymentLink.maxUses && paymentLink.usedCount >= paymentLink.maxUses) {
        await this.deactivatePaymentLink(linkId, 'used');
        throw createError('Payment link has reached maximum uses', 410);
      }

      if (paymentLink.status !== 'active') {
        throw createError('Payment link is not active', 410);
      }

      return paymentLink;
    } catch (error: any) {
      console.error('Error fetching payment link:', error);
      throw createError(error.message || 'Failed to fetch payment link', 500);
    }
  }

  static async processPaymentFromLink(
    linkId: string,
    paymentData: {
      customerEmail?: string;
      customerName?: string;
      paymentMethodId: string;
    }
  ): Promise<Transaction> {
    try {
      const paymentLink = await this.getPaymentLink(linkId);

      // Use customer info from link if not provided
      const customerEmail = paymentData.customerEmail || paymentLink.customerEmail || '';
      const customerName = paymentData.customerName || paymentLink.customerName || '';

      if (!customerEmail || !customerName) {
        throw createError('Customer email and name are required', 400);
      }

      // Create payment intent
      const paymentResult = await PaymentService.createPaymentIntent(
        {
          amount: paymentLink.amount,
          currency: paymentLink.currency,
          customerEmail,
          customerName,
          description: paymentLink.description,
          type: 'link'
        },
        paymentLink.createdBy
      );

      // Create transaction record
      const transaction: Partial<Transaction> = {
        amount: paymentLink.amount,
        currency: paymentLink.currency,
        status: 'pending',
        type: 'link',
        description: paymentLink.description,
        customerEmail,
        customerName,
        stripePaymentIntentId: paymentResult.paymentIntentId,
        paymentLinkId: linkId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('transactions').add(transaction);

      // Increment usage count
      await this.incrementLinkUsage(linkId);

      return {
        id: docRef.id,
        ...transaction
      } as Transaction;
    } catch (error: any) {
      console.error('Error processing payment from link:', error);
      throw createError(error.message || 'Failed to process payment', 400);
    }
  }

  static async updatePaymentLink(
    linkId: string,
    updates: Partial<Pick<PaymentLink, 'description' | 'expiresAt' | 'maxUses' | 'status'>>,
    userId: string
  ): Promise<PaymentLink> {
    try {
      const paymentLinkRef = db.collection('payment_links').doc(linkId);
      const doc = await paymentLinkRef.get();

      if (!doc.exists) {
        throw createError('Payment link not found', 404);
      }

      const paymentLink = doc.data() as PaymentLink;

      if (paymentLink.createdBy !== userId) {
        throw createError('You can only update your own payment links', 403);
      }

      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await paymentLinkRef.update(updateData);

      const updatedDoc = await paymentLinkRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
        createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
        expiresAt: updatedDoc.data()?.expiresAt?.toDate()
      } as PaymentLink;
    } catch (error: any) {
      console.error('Error updating payment link:', error);
      throw createError(error.message || 'Failed to update payment link', 400);
    }
  }

  static async deactivatePaymentLink(linkId: string, reason: 'expired' | 'used' | 'manual'): Promise<void> {
    try {
      await db.collection('payment_links').doc(linkId).update({
        status: reason === 'manual' ? 'expired' : reason,
        updatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Error deactivating payment link:', error);
      throw createError('Failed to deactivate payment link', 500);
    }
  }

  static async deletePaymentLink(linkId: string, userId: string): Promise<void> {
    try {
      const paymentLinkRef = db.collection('payment_links').doc(linkId);
      const doc = await paymentLinkRef.get();

      if (!doc.exists) {
        throw createError('Payment link not found', 404);
      }

      const paymentLink = doc.data() as PaymentLink;

      if (paymentLink.createdBy !== userId) {
        throw createError('You can only delete your own payment links', 403);
      }

      await paymentLinkRef.delete();
    } catch (error: any) {
      console.error('Error deleting payment link:', error);
      throw createError(error.message || 'Failed to delete payment link', 400);
    }
  }

  // Cleanup expired payment links
  static async cleanupExpiredPaymentLinks(): Promise<void> {
    try {
      const now = new Date();
      
      const snapshot = await db
        .collection('payment_links')
        .where('expiresAt', '<', now)
        .where('status', '==', 'active')
        .get();

      for (const doc of snapshot.docs) {
        await doc.ref.update({
          status: 'expired',
          updatedAt: new Date()
        });
      }

      console.log(`Cleaned up ${snapshot.docs.length} expired payment links`);
    } catch (error: any) {
      console.error('Error cleaning up expired payment links:', error);
    }
  }

  // Get payment link analytics
  static async getPaymentLinkAnalytics(userId: string): Promise<{
    totalLinks: number;
    activeLinks: number;
    totalViews: number;
    totalPayments: number;
    totalRevenue: number;
    conversionRate: number;
  }> {
    try {
      const [linksSnapshot, transactionsSnapshot] = await Promise.all([
        db.collection('payment_links')
          .where('createdBy', '==', userId)
          .get(),
        db.collection('transactions')
          .where('type', '==', 'link')
          .get()
      ]);

      const links = linksSnapshot.docs.map(doc => doc.data()) as PaymentLink[];
      const linkTransactions = transactionsSnapshot.docs.map(doc => doc.data()) as Transaction[];

      const totalLinks = links.length;
      const activeLinks = links.filter(link => link.status === 'active').length;
      const totalViews = links.reduce((sum, link) => sum + (link.usedCount || 0), 0);
      
      const successfulPayments = linkTransactions.filter(tx => tx.status === 'succeeded');
      const totalPayments = successfulPayments.length;
      const totalRevenue = successfulPayments.reduce((sum, tx) => sum + tx.amount, 0);
      
      const conversionRate = totalViews > 0 ? (totalPayments / totalViews) * 100 : 0;

      return {
        totalLinks,
        activeLinks,
        totalViews,
        totalPayments,
        totalRevenue,
        conversionRate
      };
    } catch (error: any) {
      console.error('Error fetching payment link analytics:', error);
      throw createError('Failed to fetch payment link analytics', 500);
    }
  }

  private static generateLinkId(): string {
    // Generate a URL-safe random string
    return crypto.randomBytes(16).toString('hex');
  }

  private static async incrementLinkUsage(linkId: string): Promise<void> {
    try {
      const paymentLinkRef = db.collection('payment_links').doc(linkId);
      
      // Use Firebase transaction to ensure atomic increment
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(paymentLinkRef);
        
        if (!doc.exists) {
          throw new Error('Payment link not found');
        }

        const currentCount = doc.data()?.usedCount || 0;
        transaction.update(paymentLinkRef, {
          usedCount: currentCount + 1,
          updatedAt: new Date()
        });
      });
    } catch (error: any) {
      console.error('Error incrementing link usage:', error);
    }
  }

  // Generate shareable link preview data
  static async getLinkPreview(linkId: string): Promise<{
    title: string;
    description: string;
    amount: string;
    currency: string;
    isValid: boolean;
  }> {
    try {
      const paymentLink = await this.getPaymentLink(linkId);
      
      return {
        title: `Payment Request - ${paymentLink.description}`,
        description: paymentLink.description,
        amount: (paymentLink.amount / 100).toFixed(2),
        currency: paymentLink.currency.toUpperCase(),
        isValid: true
      };
    } catch (error) {
      return {
        title: 'Payment Request',
        description: 'This payment link is no longer valid',
        amount: '0.00',
        currency: 'USD',
        isValid: false
      };
    }
  }
}