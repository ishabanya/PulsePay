import { db } from '../config/firebase';
import { QRCode, Transaction } from '../types';
import { createError } from '../middleware/errorHandler';
import { PaymentService } from './paymentService';
import crypto from 'crypto';

// QR Code data structure for payments
interface QRPaymentData {
  type: 'payment';
  merchantId: string;
  amount?: number;
  currency: string;
  description: string;
  qrId: string;
  timestamp: string;
}

export class QRCodeService {
  static async createQRCode(data: {
    amount?: number;
    currency: string;
    description: string;
    merchantName: string;
    expiresInHours?: number;
    maxUses?: number;
    createdBy: string;
  }): Promise<QRCode> {
    try {
      const qrId = this.generateQRId();
      const now = new Date();
      const expiresAt = data.expiresInHours 
        ? new Date(now.getTime() + data.expiresInHours * 60 * 60 * 1000)
        : undefined;

      // Create QR payment data
      const qrPaymentData: QRPaymentData = {
        type: 'payment',
        merchantId: data.createdBy,
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        qrId,
        timestamp: now.toISOString()
      };

      const qrDataString = JSON.stringify(qrPaymentData);

      const qrCode: Partial<QRCode> = {
        amount: data.amount,
        currency: data.currency,
        description: data.description,
        merchantName: data.merchantName,
        qrData: qrDataString,
        status: 'active',
        usageCount: 0,
        maxUses: data.maxUses,
        expiresAt,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now
      };

      await db.collection('qr_codes').doc(qrId).set(qrCode);

      return {
        id: qrId,
        ...qrCode
      } as QRCode;
    } catch (error: any) {
      console.error('Error creating QR code:', error);
      throw createError(error.message || 'Failed to create QR code', 400);
    }
  }

  static async getQRCodes(userId: string): Promise<QRCode[]> {
    try {
      const snapshot = await db
        .collection('qr_codes')
        .where('createdBy', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date(),
        expiresAt: doc.data().expiresAt?.toDate()
      })) as QRCode[];
    } catch (error: any) {
      console.error('Error fetching QR codes:', error);
      throw createError('Failed to fetch QR codes', 500);
    }
  }

  static async getQRCode(qrId: string): Promise<QRCode> {
    try {
      const doc = await db.collection('qr_codes').doc(qrId).get();

      if (!doc.exists) {
        throw createError('QR code not found', 404);
      }

      const qrCode = {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date(),
        expiresAt: doc.data()?.expiresAt?.toDate()
      } as QRCode;

      // Check if QR code is expired
      if (qrCode.expiresAt && new Date() > qrCode.expiresAt) {
        await this.deactivateQRCode(qrId, 'expired');
        throw createError('QR code has expired', 410);
      }

      // Check if QR code has reached max uses
      if (qrCode.maxUses && qrCode.usageCount >= qrCode.maxUses) {
        await this.deactivateQRCode(qrId, 'disabled');
        throw createError('QR code has reached maximum uses', 410);
      }

      if (qrCode.status !== 'active') {
        throw createError('QR code is not active', 410);
      }

      return qrCode;
    } catch (error: any) {
      console.error('Error fetching QR code:', error);
      throw createError(error.message || 'Failed to fetch QR code', 500);
    }
  }

  static async processQRPayment(
    qrId: string,
    paymentData: {
      amount?: number; // For variable amount QR codes
      customerEmail: string;
      customerName: string;
      paymentMethodId: string;
    }
  ): Promise<Transaction> {
    try {
      const qrCode = await this.getQRCode(qrId);

      // Parse QR data to verify integrity
      let qrPaymentData: QRPaymentData;
      try {
        qrPaymentData = JSON.parse(qrCode.qrData);
      } catch (error) {
        throw createError('Invalid QR code data', 400);
      }

      // Verify QR data integrity
      if (qrPaymentData.qrId !== qrId) {
        throw createError('QR code data mismatch', 400);
      }

      // Determine payment amount
      let paymentAmount: number;
      if (qrCode.amount) {
        // Fixed amount QR code
        paymentAmount = qrCode.amount;
      } else if (paymentData.amount) {
        // Variable amount QR code
        paymentAmount = Math.round(paymentData.amount * 100); // Convert to cents
        if (paymentAmount < 50) { // Minimum 50 cents
          throw createError('Minimum amount is $0.50', 400);
        }
      } else {
        throw createError('Payment amount is required for this QR code', 400);
      }

      // Create payment intent
      const paymentResult = await PaymentService.createPaymentIntent(
        {
          amount: paymentAmount,
          currency: qrCode.currency,
          customerEmail: paymentData.customerEmail,
          customerName: paymentData.customerName,
          description: `${qrCode.description} - ${qrCode.merchantName}`,
          type: 'qr'
        },
        qrCode.createdBy
      );

      // Create transaction record
      const transaction: Partial<Transaction> = {
        amount: paymentAmount,
        currency: qrCode.currency,
        status: 'pending',
        type: 'qr',
        description: `${qrCode.description} - ${qrCode.merchantName}`,
        customerEmail: paymentData.customerEmail,
        customerName: paymentData.customerName,
        stripePaymentIntentId: paymentResult.paymentIntentId,
        qrCodeId: qrId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('transactions').add(transaction);

      // Increment usage count
      await this.incrementQRUsage(qrId);

      return {
        id: docRef.id,
        ...transaction
      } as Transaction;
    } catch (error: any) {
      console.error('Error processing QR payment:', error);
      throw createError(error.message || 'Failed to process payment', 400);
    }
  }

  static async updateQRCode(
    qrId: string,
    updates: Partial<Pick<QRCode, 'description' | 'expiresAt' | 'maxUses' | 'status' | 'merchantName'>>,
    userId: string
  ): Promise<QRCode> {
    try {
      const qrCodeRef = db.collection('qr_codes').doc(qrId);
      const doc = await qrCodeRef.get();

      if (!doc.exists) {
        throw createError('QR code not found', 404);
      }

      const qrCode = doc.data() as QRCode;

      if (qrCode.createdBy !== userId) {
        throw createError('You can only update your own QR codes', 403);
      }

      const updateData = {
        ...updates,
        updatedAt: new Date()
      };

      await qrCodeRef.update(updateData);

      const updatedDoc = await qrCodeRef.get();
      return {
        id: updatedDoc.id,
        ...updatedDoc.data(),
        createdAt: updatedDoc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: updatedDoc.data()?.updatedAt?.toDate() || new Date(),
        expiresAt: updatedDoc.data()?.expiresAt?.toDate()
      } as QRCode;
    } catch (error: any) {
      console.error('Error updating QR code:', error);
      throw createError(error.message || 'Failed to update QR code', 400);
    }
  }

  static async deactivateQRCode(qrId: string, reason: 'expired' | 'disabled' | 'manual'): Promise<void> {
    try {
      await db.collection('qr_codes').doc(qrId).update({
        status: reason === 'manual' ? 'disabled' : reason,
        updatedAt: new Date()
      });
    } catch (error: any) {
      console.error('Error deactivating QR code:', error);
      throw createError('Failed to deactivate QR code', 500);
    }
  }

  static async deleteQRCode(qrId: string, userId: string): Promise<void> {
    try {
      const qrCodeRef = db.collection('qr_codes').doc(qrId);
      const doc = await qrCodeRef.get();

      if (!doc.exists) {
        throw createError('QR code not found', 404);
      }

      const qrCode = doc.data() as QRCode;

      if (qrCode.createdBy !== userId) {
        throw createError('You can only delete your own QR codes', 403);
      }

      await qrCodeRef.delete();
    } catch (error: any) {
      console.error('Error deleting QR code:', error);
      throw createError(error.message || 'Failed to delete QR code', 400);
    }
  }

  // Cleanup expired QR codes
  static async cleanupExpiredQRCodes(): Promise<void> {
    try {
      const now = new Date();
      
      const snapshot = await db
        .collection('qr_codes')
        .where('expiresAt', '<', now)
        .where('status', '==', 'active')
        .get();

      for (const doc of snapshot.docs) {
        await doc.ref.update({
          status: 'expired',
          updatedAt: new Date()
        });
      }

      console.log(`Cleaned up ${snapshot.docs.length} expired QR codes`);
    } catch (error: any) {
      console.error('Error cleaning up expired QR codes:', error);
    }
  }

  // Get QR code analytics
  static async getQRCodeAnalytics(userId: string): Promise<{
    totalQRCodes: number;
    activeQRCodes: number;
    totalScans: number;
    totalPayments: number;
    totalRevenue: number;
    conversionRate: number;
  }> {
    try {
      const [qrSnapshot, transactionsSnapshot] = await Promise.all([
        db.collection('qr_codes')
          .where('createdBy', '==', userId)
          .get(),
        db.collection('transactions')
          .where('type', '==', 'qr')
          .get()
      ]);

      const qrCodes = qrSnapshot.docs.map(doc => doc.data()) as QRCode[];
      const qrTransactions = transactionsSnapshot.docs.map(doc => doc.data()) as Transaction[];

      const totalQRCodes = qrCodes.length;
      const activeQRCodes = qrCodes.filter(qr => qr.status === 'active').length;
      const totalScans = qrCodes.reduce((sum, qr) => sum + (qr.usageCount || 0), 0);
      
      const successfulPayments = qrTransactions.filter(tx => tx.status === 'succeeded');
      const totalPayments = successfulPayments.length;
      const totalRevenue = successfulPayments.reduce((sum, tx) => sum + tx.amount, 0);
      
      const conversionRate = totalScans > 0 ? (totalPayments / totalScans) * 100 : 0;

      return {
        totalQRCodes,
        activeQRCodes,
        totalScans,
        totalPayments,
        totalRevenue,
        conversionRate
      };
    } catch (error: any) {
      console.error('Error fetching QR code analytics:', error);
      throw createError('Failed to fetch QR code analytics', 500);
    }
  }

  // Generate QR code image data (base64)
  static async generateQRCodeImage(qrId: string): Promise<string> {
    try {
      const qrCode = await this.getQRCode(qrId);
      
      // In a real implementation, you would use a QR code generation library
      // For now, return a placeholder or the QR data itself
      const qrUrl = `${process.env.APP_BASE_URL || 'https://pulsepay.app'}/qr/${qrId}`;
      
      // This would typically use a library like 'qrcode' to generate the actual image
      // For now, return the URL that would be encoded in the QR code
      return Buffer.from(qrUrl).toString('base64');
    } catch (error: any) {
      console.error('Error generating QR code image:', error);
      throw createError('Failed to generate QR code image', 500);
    }
  }

  // Validate QR code scan
  static async validateQRScan(qrId: string): Promise<{
    isValid: boolean;
    qrCode?: QRCode;
    error?: string;
  }> {
    try {
      const qrCode = await this.getQRCode(qrId);
      return {
        isValid: true,
        qrCode
      };
    } catch (error: any) {
      return {
        isValid: false,
        error: error.message
      };
    }
  }

  private static generateQRId(): string {
    // Generate a URL-safe random string
    return crypto.randomBytes(12).toString('hex');
  }

  private static async incrementQRUsage(qrId: string): Promise<void> {
    try {
      const qrCodeRef = db.collection('qr_codes').doc(qrId);
      
      // Use Firebase transaction to ensure atomic increment
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(qrCodeRef);
        
        if (!doc.exists) {
          throw new Error('QR code not found');
        }

        const currentCount = doc.data()?.usageCount || 0;
        transaction.update(qrCodeRef, {
          usageCount: currentCount + 1,
          updatedAt: new Date()
        });
      });
    } catch (error: any) {
      console.error('Error incrementing QR usage:', error);
    }
  }

  // Generate different types of QR codes
  static async createFixedAmountQR(data: {
    amount: number;
    currency: string;
    description: string;
    merchantName: string;
    createdBy: string;
  }): Promise<QRCode> {
    return this.createQRCode({
      ...data,
      expiresInHours: undefined, // Never expires
      maxUses: undefined // Unlimited uses
    });
  }

  static async createVariableAmountQR(data: {
    currency: string;
    description: string;
    merchantName: string;
    createdBy: string;
  }): Promise<QRCode> {
    return this.createQRCode({
      ...data,
      amount: undefined, // Variable amount
      expiresInHours: undefined,
      maxUses: undefined
    });
  }

  static async createSingleUseQR(data: {
    amount: number;
    currency: string;
    description: string;
    merchantName: string;
    createdBy: string;
  }): Promise<QRCode> {
    return this.createQRCode({
      ...data,
      maxUses: 1,
      expiresInHours: 24 // Expires in 24 hours
    });
  }
}