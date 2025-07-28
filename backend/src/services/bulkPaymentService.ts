import { db } from '../config/firebase';
import { BulkPayment, BulkPaymentItem, Transaction } from '../types';
import { createError } from '../middleware/errorHandler';
import { PaymentService } from './paymentService';
import { CurrencyService } from './currencyService';

export class BulkPaymentService {
  static async createBulkPayment(data: {
    currency: string;
    description: string;
    payments: Omit<BulkPaymentItem, 'status'>[];
    createdBy: string;
  }): Promise<BulkPayment> {
    try {
      // Validate payments array
      if (!data.payments || data.payments.length === 0) {
        throw createError('At least one payment is required', 400);
      }

      if (data.payments.length > 1000) {
        throw createError('Maximum 1000 payments allowed per bulk payment', 400);
      }

      // Validate email addresses
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      for (const payment of data.payments) {
        if (!emailRegex.test(payment.customerEmail)) {
          throw createError(`Invalid email address: ${payment.customerEmail}`, 400);
        }
        if (payment.amount < 50) { // Minimum 50 cents
          throw createError(`Minimum amount is $0.50 for ${payment.customerEmail}`, 400);
        }
      }

      const totalAmount = data.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const now = new Date();

      const bulkPayment: Partial<BulkPayment> = {
        totalAmount,
        currency: data.currency,
        description: data.description,
        payments: data.payments.map(payment => ({
          ...payment,
          status: 'pending' as const
        })),
        status: 'pending',
        successCount: 0,
        failureCount: 0,
        createdBy: data.createdBy,
        createdAt: now,
        updatedAt: now
      };

      const docRef = await db.collection('bulk_payments').add(bulkPayment);

      return {
        id: docRef.id,
        ...bulkPayment
      } as BulkPayment;
    } catch (error: any) {
      console.error('Error creating bulk payment:', error);
      throw createError(error.message || 'Failed to create bulk payment', 400);
    }
  }

  static async getBulkPayments(userId: string): Promise<BulkPayment[]> {
    try {
      const snapshot = await db
        .collection('bulk_payments')
        .where('createdBy', '==', userId)
        .orderBy('createdAt', 'desc')
        .get();

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date(),
        updatedAt: doc.data().updatedAt?.toDate() || new Date()
      })) as BulkPayment[];
    } catch (error: any) {
      console.error('Error fetching bulk payments:', error);
      throw createError('Failed to fetch bulk payments', 500);
    }
  }

  static async getBulkPayment(bulkPaymentId: string): Promise<BulkPayment> {
    try {
      const doc = await db.collection('bulk_payments').doc(bulkPaymentId).get();

      if (!doc.exists) {
        throw createError('Bulk payment not found', 404);
      }

      return {
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data()?.createdAt?.toDate() || new Date(),
        updatedAt: doc.data()?.updatedAt?.toDate() || new Date()
      } as BulkPayment;
    } catch (error: any) {
      console.error('Error fetching bulk payment:', error);
      throw createError(error.message || 'Failed to fetch bulk payment', 500);
    }
  }

  static async processBulkPayment(bulkPaymentId: string, userId: string): Promise<void> {
    try {
      const bulkPaymentRef = db.collection('bulk_payments').doc(bulkPaymentId);
      const doc = await bulkPaymentRef.get();

      if (!doc.exists) {
        throw createError('Bulk payment not found', 404);
      }

      const bulkPayment = doc.data() as BulkPayment;

      if (bulkPayment.createdBy !== userId) {
        throw createError('You can only process your own bulk payments', 403);
      }

      if (bulkPayment.status !== 'pending') {
        throw createError('Bulk payment is not in pending status', 400);
      }

      // Update status to processing
      await bulkPaymentRef.update({
        status: 'processing',
        updatedAt: new Date()
      });

      // Process payments in batches to avoid overwhelming the system
      const batchSize = 50;
      const payments = bulkPayment.payments;
      
      for (let i = 0; i < payments.length; i += batchSize) {
        const batch = payments.slice(i, i + batchSize);
        await this.processBatch(bulkPaymentId, batch, bulkPayment);
        
        // Add small delay between batches
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Update final status
      const updatedBulkPayment = await this.getBulkPayment(bulkPaymentId);
      const finalStatus = this.determineFinalStatus(updatedBulkPayment);
      
      await bulkPaymentRef.update({
        status: finalStatus,
        updatedAt: new Date()
      });

    } catch (error: any) {
      console.error('Error processing bulk payment:', error);
      
      // Update status to failed if there was an error
      try {
        await db.collection('bulk_payments').doc(bulkPaymentId).update({
          status: 'failed',
          updatedAt: new Date()
        });
      } catch (updateError) {
        console.error('Error updating bulk payment status to failed:', updateError);
      }
      
      throw createError(error.message || 'Failed to process bulk payment', 500);
    }
  }

  private static async processBatch(
    bulkPaymentId: string,
    batch: BulkPaymentItem[],
    bulkPayment: BulkPayment
  ): Promise<void> {
    const promises = batch.map(payment => 
      this.processIndividualPayment(bulkPaymentId, payment, bulkPayment)
    );

    await Promise.allSettled(promises);
  }

  private static async processIndividualPayment(
    bulkPaymentId: string,
    payment: BulkPaymentItem,
    bulkPayment: BulkPayment
  ): Promise<void> {
    try {
      // Create payment intent for individual payment
      const paymentResult = await PaymentService.createPaymentIntent(
        {
          amount: payment.amount,
          currency: bulkPayment.currency,
          customerEmail: payment.customerEmail,
          customerName: payment.customerName,
          description: payment.description || bulkPayment.description,
          type: 'bulk'
        },
        bulkPayment.createdBy
      );

      // Create transaction record
      const transaction: Partial<Transaction> = {
        amount: payment.amount,
        currency: bulkPayment.currency,
        status: 'pending',
        type: 'bulk',
        description: payment.description || bulkPayment.description,
        customerEmail: payment.customerEmail,
        customerName: payment.customerName,
        stripePaymentIntentId: paymentResult.paymentIntentId,
        bulkPaymentId: bulkPaymentId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const docRef = await db.collection('transactions').add(transaction);

      // Update payment status
      await this.updatePaymentStatus(
        bulkPaymentId,
        payment.customerEmail,
        'succeeded',
        docRef.id
      );

    } catch (error: any) {
      console.error(`Error processing payment for ${payment.customerEmail}:`, error);
      
      // Update payment status to failed
      await this.updatePaymentStatus(
        bulkPaymentId,
        payment.customerEmail,
        'failed',
        undefined,
        error.message
      );
    }
  }

  private static async updatePaymentStatus(
    bulkPaymentId: string,
    customerEmail: string,
    status: 'succeeded' | 'failed',
    transactionId?: string,
    errorMessage?: string
  ): Promise<void> {
    try {
      const bulkPaymentRef = db.collection('bulk_payments').doc(bulkPaymentId);
      
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(bulkPaymentRef);
        
        if (!doc.exists) {
          throw new Error('Bulk payment not found');
        }

        const bulkPayment = doc.data() as BulkPayment;
        
        // Update specific payment status
        const updatedPayments = bulkPayment.payments.map(payment => {
          if (payment.customerEmail === customerEmail) {
            return {
              ...payment,
              status,
              transactionId,
              errorMessage
            };
          }
          return payment;
        });

        // Update counters
        const successCount = updatedPayments.filter(p => p.status === 'succeeded').length;
        const failureCount = updatedPayments.filter(p => p.status === 'failed').length;

        transaction.update(bulkPaymentRef, {
          payments: updatedPayments,
          successCount,
          failureCount,
          updatedAt: new Date()
        });
      });
    } catch (error: any) {
      console.error('Error updating payment status:', error);
    }
  }

  private static determineFinalStatus(bulkPayment: BulkPayment): BulkPayment['status'] {
    const totalPayments = bulkPayment.payments.length;
    const { successCount, failureCount } = bulkPayment;

    if (successCount === totalPayments) {
      return 'completed';
    } else if (failureCount === totalPayments) {
      return 'failed';
    } else if (successCount > 0) {
      return 'partial';
    } else {
      return 'failed';
    }
  }

  static async retryFailedPayments(bulkPaymentId: string, userId: string): Promise<void> {
    try {
      const bulkPayment = await this.getBulkPayment(bulkPaymentId);

      if (bulkPayment.createdBy !== userId) {
        throw createError('You can only retry your own bulk payments', 403);
      }

      const failedPayments = bulkPayment.payments.filter(p => p.status === 'failed');
      
      if (failedPayments.length === 0) {
        throw createError('No failed payments to retry', 400);
      }

      // Reset failed payments to pending
      const bulkPaymentRef = db.collection('bulk_payments').doc(bulkPaymentId);
      const updatedPayments = bulkPayment.payments.map(payment => 
        payment.status === 'failed' 
          ? { ...payment, status: 'pending' as const, errorMessage: undefined }
          : payment
      );

      await bulkPaymentRef.update({
        payments: updatedPayments,
        status: 'pending',
        failureCount: 0,
        updatedAt: new Date()
      });

      // Process the bulk payment again
      await this.processBulkPayment(bulkPaymentId, userId);

    } catch (error: any) {
      console.error('Error retrying failed payments:', error);
      throw createError(error.message || 'Failed to retry failed payments', 500);
    }
  }

  static async cancelBulkPayment(bulkPaymentId: string, userId: string): Promise<void> {
    try {
      const bulkPaymentRef = db.collection('bulk_payments').doc(bulkPaymentId);
      const doc = await bulkPaymentRef.get();

      if (!doc.exists) {
        throw createError('Bulk payment not found', 404);
      }

      const bulkPayment = doc.data() as BulkPayment;

      if (bulkPayment.createdBy !== userId) {
        throw createError('You can only cancel your own bulk payments', 403);
      }

      if (bulkPayment.status === 'completed') {
        throw createError('Cannot cancel completed bulk payment', 400);
      }

      await bulkPaymentRef.update({
        status: 'failed',
        updatedAt: new Date()
      });

    } catch (error: any) {
      console.error('Error canceling bulk payment:', error);
      throw createError(error.message || 'Failed to cancel bulk payment', 400);
    }
  }

  // Export bulk payment results
  static async exportBulkPaymentResults(bulkPaymentId: string, userId: string): Promise<{
    filename: string;
    data: string;
  }> {
    try {
      const bulkPayment = await this.getBulkPayment(bulkPaymentId);

      if (bulkPayment.createdBy !== userId) {
        throw createError('You can only export your own bulk payments', 403);
      }

      // Create CSV data
      const headers = ['Email', 'Name', 'Amount', 'Status', 'Transaction ID', 'Error Message'];
      const rows = bulkPayment.payments.map(payment => [
        payment.customerEmail,
        payment.customerName,
        CurrencyService.formatCurrency(payment.amount, bulkPayment.currency),
        payment.status,
        payment.transactionId || '',
        payment.errorMessage || ''
      ]);

      const csvContent = [headers, ...rows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');

      const filename = `bulk-payment-${bulkPaymentId}-${new Date().toISOString().split('T')[0]}.csv`;

      return {
        filename,
        data: csvContent
      };

    } catch (error: any) {
      console.error('Error exporting bulk payment results:', error);
      throw createError(error.message || 'Failed to export bulk payment results', 500);
    }
  }

  // Get bulk payment statistics
  static async getBulkPaymentStats(userId: string): Promise<{
    totalBulkPayments: number;
    totalPaymentsProcessed: number;
    averageSuccessRate: number;
    totalVolumeProcessed: number;
  }> {
    try {
      const snapshot = await db
        .collection('bulk_payments')
        .where('createdBy', '==', userId)
        .get();

      const bulkPayments = snapshot.docs.map(doc => doc.data()) as BulkPayment[];

      const totalBulkPayments = bulkPayments.length;
      const totalPaymentsProcessed = bulkPayments.reduce(
        (sum, bp) => sum + bp.payments.length, 0
      );
      
      const totalSuccessful = bulkPayments.reduce(
        (sum, bp) => sum + bp.successCount, 0
      );
      
      const averageSuccessRate = totalPaymentsProcessed > 0 
        ? (totalSuccessful / totalPaymentsProcessed) * 100 
        : 0;

      const totalVolumeProcessed = bulkPayments.reduce(
        (sum, bp) => sum + bp.totalAmount, 0
      );

      return {
        totalBulkPayments,
        totalPaymentsProcessed,
        averageSuccessRate,
        totalVolumeProcessed
      };

    } catch (error: any) {
      console.error('Error fetching bulk payment stats:', error);
      throw createError('Failed to fetch bulk payment stats', 500);
    }
  }

  // Import payments from CSV
  static async importPaymentsFromCSV(
    csvData: string,
    bulkPaymentData: {
      currency: string;
      description: string;
      createdBy: string;
    }
  ): Promise<BulkPayment> {
    try {
      const lines = csvData.trim().split('\n');
      
      if (lines.length < 2) {
        throw createError('CSV must contain at least a header row and one data row', 400);
      }

      // Skip header row
      const dataLines = lines.slice(1);
      
      const payments: Omit<BulkPaymentItem, 'status'>[] = [];

      for (let i = 0; i < dataLines.length; i++) {
        const line = dataLines[i];
        const fields = this.parseCSVLine(line);
        
        if (fields.length < 3) {
          throw createError(`Invalid CSV format at line ${i + 2}`, 400);
        }

        const [email, name, amountStr, description] = fields;
        const amount = Math.round(parseFloat(amountStr) * 100); // Convert to cents

        if (isNaN(amount) || amount < 50) {
          throw createError(`Invalid amount at line ${i + 2}: ${amountStr}`, 400);
        }

        payments.push({
          customerEmail: email.trim(),
          customerName: name.trim(),
          amount,
          description: description?.trim() || undefined
        });
      }

      return await this.createBulkPayment({
        ...bulkPaymentData,
        payments
      });

    } catch (error: any) {
      console.error('Error importing payments from CSV:', error);
      throw createError(error.message || 'Failed to import payments from CSV', 400);
    }
  }

  private static parseCSVLine(line: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    
    fields.push(current);
    return fields;
  }
}