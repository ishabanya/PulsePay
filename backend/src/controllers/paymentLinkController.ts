import { Response, NextFunction, Request } from 'express';
import { PaymentLinkService } from '../services/paymentLinkService';
import { AuthenticatedRequest } from '../types';

export class PaymentLinkController {
  static async createPaymentLink(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const paymentLink = await PaymentLinkService.createPaymentLink({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json({
        success: true,
        data: paymentLink,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentLinks(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const paymentLinks = await PaymentLinkService.getPaymentLinks(userId);
      
      res.json({
        success: true,
        data: {
          paymentLinks,
          count: paymentLinks.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentLink(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const paymentLink = await PaymentLinkService.getPaymentLink(id);
      
      res.json({
        success: true,
        data: paymentLink,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePaymentLink(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      const paymentLink = await PaymentLinkService.updatePaymentLink(
        id,
        req.body,
        userId
      );
      
      res.json({
        success: true,
        data: paymentLink,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deletePaymentLink(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await PaymentLinkService.deletePaymentLink(id, userId);
      
      res.json({
        success: true,
        message: 'Payment link deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async processPaymentFromLink(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const transaction = await PaymentLinkService.processPaymentFromLink(
        id,
        req.body
      );
      
      res.json({
        success: true,
        data: transaction,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLinkPreview(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const preview = await PaymentLinkService.getLinkPreview(id);
      
      res.json({
        success: true,
        data: preview,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPaymentLinkAnalytics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const analytics = await PaymentLinkService.getPaymentLinkAnalytics(userId);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }
}