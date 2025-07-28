import { Response, NextFunction } from 'express';
import { SplitPaymentService } from '../services/splitPaymentService';
import { AuthenticatedRequest } from '../types';

export class SplitPaymentController {
  static async createSplitPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const splitPayment = await SplitPaymentService.createSplitPayment({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json({
        success: true,
        data: splitPayment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSplitPayments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const splitPayments = await SplitPaymentService.getSplitPayments(userId);
      
      res.json({
        success: true,
        data: {
          splitPayments,
          count: splitPayments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSplitPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const splitPayment = await SplitPaymentService.getSplitPayment(id);
      
      res.json({
        success: true,
        data: splitPayment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async payParticipantShare(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const { participantEmail, paymentMethodId } = req.body;
      
      const transaction = await SplitPaymentService.payParticipantShare(
        id,
        participantEmail,
        paymentMethodId
      );
      
      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelSplitPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await SplitPaymentService.cancelSplitPayment(id, userId);
      
      res.json({
        success: true,
        message: 'Split payment canceled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async remindParticipants(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await SplitPaymentService.remindParticipants(id, userId);
      
      res.json({
        success: true,
        message: 'Reminders sent successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSplitPaymentStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const stats = await SplitPaymentService.getSplitPaymentStats(userId);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}