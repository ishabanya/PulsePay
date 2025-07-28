import { Response, NextFunction } from 'express';
import { SubscriptionService } from '../services/subscriptionService';
import { AuthenticatedRequest } from '../types';

export class SubscriptionController {
  static async createSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const subscription = await SubscriptionService.createSubscription({
        ...req.body,
        userId
      });
      
      res.status(201).json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubscriptions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const subscriptions = await SubscriptionService.getSubscriptions(userId);
      
      res.json({
        success: true,
        data: {
          subscriptions,
          count: subscriptions.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      // This would need to be implemented in the service to check ownership
      const subscription = await SubscriptionService.getSubscriptions(userId);
      const foundSubscription = subscription.find(s => s.id === id);
      
      if (!foundSubscription) {
        res.status(404).json({
          success: false,
          error: 'Subscription not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: foundSubscription,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      const subscription = await SubscriptionService.updateSubscription(
        id,
        req.body,
        userId
      );
      
      res.json({
        success: true,
        data: subscription,
      });
    } catch (error) {
      next(error);
    }
  }

  static async cancelSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await SubscriptionService.cancelSubscription(id, userId);
      
      res.json({
        success: true,
        message: 'Subscription canceled successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async pauseSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await SubscriptionService.pauseSubscription(id, userId);
      
      res.json({
        success: true,
        message: 'Subscription paused successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async resumeSubscription(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await SubscriptionService.resumeSubscription(id, userId);
      
      res.json({
        success: true,
        message: 'Subscription resumed successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSubscriptionStats(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const stats = await SubscriptionService.getSubscriptionStats(userId);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }
}