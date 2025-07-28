import { Response, NextFunction } from 'express';
import { BulkPaymentService } from '../services/bulkPaymentService';
import { AuthenticatedRequest } from '../types';

export class BulkPaymentController {
  static async createBulkPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const bulkPayment = await BulkPaymentService.createBulkPayment({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json({
        success: true,
        data: bulkPayment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBulkPayments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const bulkPayments = await BulkPaymentService.getBulkPayments(userId);
      
      res.json({
        success: true,
        data: {
          bulkPayments,
          count: bulkPayments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBulkPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ success: false, error: 'ID is required' });
        return;
      }
      const bulkPayment = await BulkPaymentService.getBulkPayment(id);
      
      res.json({
        success: true,
        data: bulkPayment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async processBulkPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await BulkPaymentService.processBulkPayment(id, userId);
      
      res.json({
        success: true,
        message: 'Bulk payment processing started',
      });
    } catch (error) {
      next(error);
    }
  }

  static async retryFailedPayments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await BulkPaymentService.retryFailedPayments(id, userId);
      
      res.json({
        success: true,
        message: 'Failed payments retry started',
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelBulkPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await BulkPaymentService.cancelBulkPayment(id, userId);
      
      res.json({
        success: true,
        message: 'Bulk payment canceled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async exportBulkPaymentResults(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      const exportData = await BulkPaymentService.exportBulkPaymentResults(id, userId);
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${exportData.filename}"`);
      res.send(exportData.data);
    } catch (error) {
      next(error);
    }
  }

  static async getBulkPaymentStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const stats = await BulkPaymentService.getBulkPaymentStats(userId);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async importPaymentsFromCSV(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const { csvData, ...bulkPaymentData } = req.body;
      
      const bulkPayment = await BulkPaymentService.importPaymentsFromCSV(
        csvData,
        {
          ...bulkPaymentData,
          createdBy: userId
        }
      );
      
      res.status(201).json({
        success: true,
        data: bulkPayment,
      });
    } catch (error) {
      next(error);
    }
  }
}