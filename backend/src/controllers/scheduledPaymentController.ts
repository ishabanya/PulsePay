import { Response, NextFunction } from 'express';
import { ScheduledPaymentService } from '../services/scheduledPaymentService';
import { AuthenticatedRequest } from '../types';

export class ScheduledPaymentController {
  static async createScheduledPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const scheduledPayment = await ScheduledPaymentService.createScheduledPayment({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json({
        success: true,
        data: scheduledPayment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getScheduledPayments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const scheduledPayments = await ScheduledPaymentService.getScheduledPayments(userId);
      
      res.json({
        success: true,
        data: {
          scheduledPayments,
          count: scheduledPayments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getScheduledPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const scheduledPayment = await ScheduledPaymentService.getScheduledPayment(id);
      
      res.json({
        success: true,
        data: scheduledPayment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateScheduledPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      const scheduledPayment = await ScheduledPaymentService.updateScheduledPayment(
        id,
        req.body,
        userId
      );
      
      res.json({
        success: true,
        data: scheduledPayment,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelScheduledPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await ScheduledPaymentService.cancelScheduledPayment(id, userId);
      
      res.json({
        success: true,
        message: 'Scheduled payment canceled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getUpcomingPayments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const upcomingPayments = await ScheduledPaymentService.getUpcomingPayments(userId);
      
      res.json({
        success: true,
        data: {
          upcomingPayments,
          count: upcomingPayments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getScheduledPaymentStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const stats = await ScheduledPaymentService.getScheduledPaymentStats(userId);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  static async retryScheduledPayment(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await ScheduledPaymentService.retryScheduledPayment(id, userId);
      
      res.json({
        success: true,
        message: 'Scheduled payment retry initiated',
      });
    } catch (error) {
      next(error);
    }
  }

  static async createBulkScheduledPayments(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const scheduledPayments = await ScheduledPaymentService.createBulkScheduledPayments({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json({
        success: true,
        data: {
          scheduledPayments,
          count: scheduledPayments.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}