import { Response, NextFunction, Request } from 'express';
import { QRCodeService } from '../services/qrCodeService';
import { AuthenticatedRequest } from '../types';

export class QRCodeController {
  static async createQRCode(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const qrCode = await QRCodeService.createQRCode({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json({
        success: true,
        data: qrCode,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQRCodes(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const qrCodes = await QRCodeService.getQRCodes(userId);
      
      res.json({
        success: true,
        data: {
          qrCodes,
          count: qrCodes.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQRCode(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const qrCode = await QRCodeService.getQRCode(id);
      
      res.json({
        success: true,
        data: qrCode,
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateQRCode(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      const qrCode = await QRCodeService.updateQRCode(
        id,
        req.body,
        userId
      );
      
      res.json({
        success: true,
        data: qrCode,
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteQRCode(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.uid;
      
      await QRCodeService.deleteQRCode(id, userId);
      
      res.json({
        success: true,
        message: 'QR code deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }

  static async processQRPayment(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const transaction = await QRCodeService.processQRPayment(
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

  static async validateQRScan(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const validation = await QRCodeService.validateQRScan(id);
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async generateQRCodeImage(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { id } = req.params;
      const imageData = await QRCodeService.generateQRCodeImage(id);
      
      res.json({
        success: true,
        data: { imageData },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getQRCodeAnalytics(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const analytics = await QRCodeService.getQRCodeAnalytics(userId);
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createFixedAmountQR(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const qrCode = await QRCodeService.createFixedAmountQR({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json({
        success: true,
        data: qrCode,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createVariableAmountQR(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const qrCode = await QRCodeService.createVariableAmountQR({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json({
        success: true,
        data: qrCode,
      });
    } catch (error) {
      next(error);
    }
  }

  static async createSingleUseQR(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const qrCode = await QRCodeService.createSingleUseQR({
        ...req.body,
        createdBy: userId
      });
      
      res.status(201).json({
        success: true,
        data: qrCode,
      });
    } catch (error) {
      next(error);
    }
  }
}