import { db } from '../config/firebase';
import { SplitPayment, SplitParticipant, Transaction } from '../types';
import { createError } from '../middleware/errorHandler';
import { PaymentService } from './paymentService';
import crypto from 'crypto';

export class SplitPaymentService {
  static async createSplitPayment(data: {
    totalAmount: number;
    currency: string;
    description: string;
    participants: Omit<SplitParticipant, 'status'>[];
    createdBy: string;
    expiresInHours?: number;
  }): Promise<SplitPayment> {
    try {
      // Validate that participant amounts add up to total
      const participantTotal = data.participants.reduce((sum, p) => sum + p.amount, 0);
      if (Math.abs(participantTotal - data.totalAmount) > 1) { // Allow 1 cent difference for rounding
        throw createError('Participant amounts must equal total amount', 400);
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + (data.expiresInHours || 168) * 60 * 60 * 1000); // Default 7 days

      const splitPayment: Partial<SplitPayment> = {
        totalAmount: data.totalAmount,
        currency: data.currency,
        description: data.description,
        createdBy: data.createdBy,
        participants: data.participants.map(p => ({
          ...p,
          status: 'pending' as const
        })),
        status: 'pending',
        expiresAt,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await db.collection('split_payments').add(splitPayment);

      // Send notifications to participants (would integrate with email service)
      await this.sendSplitPaymentNotifications(docRef.id, splitPayment as SplitPayment);

      return {
        id: docRef.id,
        ...splitPayment
      } as SplitPayment;
    } catch (error: any) {
      console.error('Error creating split payment:', error);
      throw createError(error.message || 'Failed to create split payment', 400);
    }
  }

  static async getSplitPayments(userId: string): Promise<SplitPayment[]> {
    try {
      console.log('Fetching split payments for user:', userId);
      
      // Get split payments created by user (simplified query to avoid index requirement)
      const createdByUser = await db.collection('split_payments')
        .where('createdBy', '==', userId)
        .limit(100)
        .get();

      // For now, skip the participant query to avoid complex array-contains-any query
      // This can be enhanced later with proper indexing
      console.log(`Found ${createdByUser.docs.length} split payments created by user`);
      
      const [participantIn] = await Promise.all([
        Promise.resolve({ docs: [] }) // Skip participant query for now
      ]);

      const splitPayments = new Map();

      // Add created by user
      createdByUser.docs.forEach(doc => {
        splitPayments.set(doc.id, {
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          updatedAt: doc.data().updatedAt?.toDate() || new Date(),
          expiresAt: doc.data().expiresAt?.toDate() || new Date()
        });
      });

      // Add participant in (avoid duplicates)
      participantIn.docs.forEach(doc => {
        if (!splitPayments.has(doc.id)) {
          splitPayments.set(doc.id, {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date(),
            updatedAt: doc.data().updatedAt?.toDate() || new Date(),
            expiresAt: doc.data().expiresAt?.toDate() || new Date()
          });
        }
      });

      const result = Array.from(splitPayments.values()) as SplitPayment[];
      
      // Sort by createdAt descending (client-side to avoid Firestore index requirement)
      result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      
      console.log(`Returning ${result.length} split payments for user ${userId}`);
      return result;
    } catch (error: any) {
      console.error('Error fetching split payments:', error);
      throw createError('Failed to fetch split payments', 500);
    }
  }

  static async getSplitPayment(splitPaymentId: string): Promise<SplitPayment> {
    try {
      const doc = await db.collection('split_payments').doc(splitPaymentId).get();

      if (!doc.exists) {
        throw createError('Split payment not found', 404);
      }

      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
        expiresAt: doc.data()?.expiresAt?.toDate() || new Date()
      } as SplitPayment;
    } catch (error: any) {
      console.error('Error fetching split payment:', error);
      throw createError(error.message || 'Failed to fetch split payment', 500);
    }
  }

  static async payParticipantShare(
    splitPaymentId: string,
    participantEmail: string,
    paymentMethodId: string
  ): Promise<Transaction> {
    try {
      const splitPayment = await this.getSplitPayment(splitPaymentId);

      // Check if split payment is still valid
      if (splitPayment.status !== 'pending' && splitPayment.status !== 'partial') {
        throw createError('Split payment is no longer accepting payments', 400);
      }

      if (new Date() > splitPayment.expiresAt) {
        throw createError('Split payment has expired', 400);
      }

      // Find participant
      const participant = splitPayment.participants.find(p => p.email === participantEmail);
      if (!participant) {
        throw createError('Participant not found in split payment', 404);
      }

      if (participant.status !== 'pending') {
        throw createError('Participant has already paid or payment failed', 400);
      }

      // Create payment intent for participant's share
      const paymentResult = await PaymentService.createPaymentIntent(
        {
          amount: participant.amount,
          currency: splitPayment.currency,
          customerEmail: participant.email,
          customerName: participant.name,
          description: `Split payment share - ${splitPayment.description}`,
          type: 'split'
        },
        participantEmail // Using email as userId for this case
      );

      // Create transaction record
      const transaction: Partial<Transaction> = {
        amount: participant.amount,
        currency: splitPayment.currency,
        status: 'pending',
        type: 'split',
        description: `Split payment share - ${splitPayment.description}`,
        customerEmail: participant.email,
        customerName: participant.name,
        stripePaymentIntentId: paymentResult.paymentIntentId,
        splitPaymentId: splitPaymentId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('transactions').add(transaction);

      return {
        id: docRef.id,
        ...transaction
      } as Transaction;
    } catch (error: any) {
      console.error('Error processing participant payment:', error);
      throw createError(error.message || 'Failed to process payment', 400);
    }
  }

  static async updateParticipantStatus(
    splitPaymentId: string,
    participantEmail: string,
    status: 'paid' | 'failed'
  ): Promise<void> {
    try {
      const splitPaymentRef = db.collection('split_payments').doc(splitPaymentId);
      const doc = await splitPaymentRef.get();

      if (!doc.exists) {
        throw createError('Split payment not found', 404);
      }

      const splitPayment = doc.data() as SplitPayment;
      
      // Update participant status
      const updatedParticipants = splitPayment.participants.map(p => 
        p.email === participantEmail ? { ...p, status } : p
      );

      // Determine overall status
      const paidCount = updatedParticipants.filter(p => p.status === 'paid').length;
      const totalCount = updatedParticipants.length;
      
      let overallStatus: SplitPayment['status'];
      if (paidCount === 0) {
        overallStatus = 'pending';
      } else if (paidCount === totalCount) {
        overallStatus = 'completed';
      } else {
        overallStatus = 'partial';
      }

      await splitPaymentRef.update({
        participants: updatedParticipants,
        status: overallStatus,
        updatedAt: new Date()
      });

      // Send completion notification if all paid
      if (overallStatus === 'completed') {
        await this.sendCompletionNotification(splitPaymentId, splitPayment);
      }
    } catch (error: any) {
      console.error('Error updating participant status:', error);
      throw createError(error.message || 'Failed to update participant status', 500);
    }
  }

  static async cancelSplitPayment(splitPaymentId: string, userId: string): Promise<void> {
    try {
      const splitPaymentRef = db.collection('split_payments').doc(splitPaymentId);
      const doc = await splitPaymentRef.get();

      if (!doc.exists) {
        throw createError('Split payment not found', 404);
      }

      const splitPayment = doc.data() as SplitPayment;

      // Only creator can cancel
      if (splitPayment.createdBy !== userId) {
        throw createError('Only the creator can cancel a split payment', 403);
      }

      await splitPaymentRef.update({
        status: 'failed',
        updatedAt: new Date()
      });

      // Send cancellation notifications
      await this.sendCancellationNotifications(splitPaymentId, splitPayment);
    } catch (error: any) {
      console.error('Error canceling split payment:', error);
      throw createError(error.message || 'Failed to cancel split payment', 400);
    }
  }

  static async remindParticipants(splitPaymentId: string, userId: string): Promise<void> {
    try {
      const splitPayment = await this.getSplitPayment(splitPaymentId);

      if (splitPayment.createdBy !== userId) {
        throw createError('Only the creator can send reminders', 403);
      }

      const pendingParticipants = splitPayment.participants.filter(p => p.status === 'pending');
      
      if (pendingParticipants.length === 0) {
        throw createError('No pending participants to remind', 400);
      }

      // Send reminder notifications
      await this.sendReminderNotifications(splitPaymentId, splitPayment, pendingParticipants);
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      throw createError(error.message || 'Failed to send reminders', 400);
    }
  }

  // Cleanup expired split payments
  static async cleanupExpiredSplitPayments(): Promise<void> {
    try {
      const now = new Date();
      
      const snapshot = await db
        .collection('split_payments')
        .where('expiresAt', '<', now)
        .where('status', 'in', ['pending', 'partial'])
        .get();

      for (const doc of snapshot.docs) {
        await doc.ref.update({
          status: 'failed',
          updatedAt: new Date()
        });
      }

      console.log(`Cleaned up ${snapshot.docs.length} expired split payments`);
    } catch (error: any) {
      console.error('Error cleaning up expired split payments:', error);
    }
  }

  // Calculate split payment statistics
  static async getSplitPaymentStats(userId: string): Promise<{
    totalSplitPayments: number;
    completedSplitPayments: number;
    totalAmountSplit: number;
    averageSplitAmount: number;
  }> {
    try {
      const snapshot = await db
        .collection('split_payments')
        .where('createdBy', '==', userId)
        .get();

      const splitPayments = snapshot.docs.map(doc => doc.data()) as SplitPayment[];

      const totalSplitPayments = splitPayments.length;
      const completedSplitPayments = splitPayments.filter(sp => sp.status === 'completed').length;
      const totalAmountSplit = splitPayments.reduce((sum, sp) => sum + sp.totalAmount, 0);
      const averageSplitAmount = totalSplitPayments > 0 ? totalAmountSplit / totalSplitPayments : 0;

      return {
        totalSplitPayments,
        completedSplitPayments,
        totalAmountSplit,
        averageSplitAmount
      };
    } catch (error: any) {
      console.error('Error fetching split payment stats:', error);
      throw createError('Failed to fetch split payment stats', 500);
    }
  }

  // Private helper methods for notifications (would integrate with email service)
  private static async sendSplitPaymentNotifications(
    splitPaymentId: string,
    splitPayment: SplitPayment
  ): Promise<void> {
    // In a real implementation, this would send emails to participants
    console.log(`Sending split payment notifications for ${splitPaymentId}`);
    console.log(`Notifying ${splitPayment.participants.length} participants`);
  }

  private static async sendCompletionNotification(
    splitPaymentId: string,
    splitPayment: SplitPayment
  ): Promise<void> {
    console.log(`Sending completion notification for split payment ${splitPaymentId}`);
  }

  private static async sendCancellationNotifications(
    splitPaymentId: string,
    splitPayment: SplitPayment
  ): Promise<void> {
    console.log(`Sending cancellation notifications for split payment ${splitPaymentId}`);
  }

  private static async sendReminderNotifications(
    splitPaymentId: string,
    splitPayment: SplitPayment,
    participants: SplitParticipant[]
  ): Promise<void> {
    console.log(`Sending reminder notifications to ${participants.length} participants`);
  }
}