import { Response, NextFunction } from 'express';
import { PaymentService } from '../services/paymentService';
import { AuthenticatedRequest } from '../types';

export class PaymentController {
  static async createPaymentIntent(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const result = await PaymentService.createPaymentIntent(req.body, userId);
      
      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async confirmPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const { paymentIntentId } = req.body;
      
      const result = await PaymentService.confirmPayment(paymentIntentId, userId);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTransactions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const transactions = await PaymentService.getTransactions(userId);
      
      res.json({
        success: true,
        data: {
          transactions,
          count: transactions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getDashboardStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const stats = await PaymentService.getDashboardStats(userId);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async completePayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const { transactionId, paymentIntentId } = req.body;
      
      const result = await PaymentService.completePayment(transactionId, paymentIntentId, userId);
      
      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}