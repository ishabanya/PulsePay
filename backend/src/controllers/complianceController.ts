import { Response, NextFunction, Request } from 'express';
import { ComplianceService } from '../services/complianceService';

export class ComplianceController {
  static async getRegionConfig(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { countryCode } = req.params;
      const regionConfig = ComplianceService.getRegionConfig(countryCode);
      
      res.json({
        success: true,
        data: regionConfig,
      });
    } catch (error) {
      next(error);
    }
  }

  static async calculateTax(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { amount, countryCode, productType, customerType } = req.body;
      const taxCalculation = ComplianceService.calculateTax(
        amount,
        countryCode,
        productType,
        customerType
      );
      
      res.json({
        success: true,
        data: taxCalculation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAvailablePaymentMethods(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { countryCode } = req.params;
      const paymentMethods = ComplianceService.getAvailablePaymentMethods(countryCode);
      
      res.json({
        success: true,
        data: {
          countryCode,
          paymentMethods,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async validateTransactionAmount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { amount, countryCode } = req.body;
      const validation = ComplianceService.validateTransactionAmount(amount, countryCode);
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getComplianceRequirements(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { countryCode } = req.params;
      const requirements = ComplianceService.getComplianceRequirements(countryCode);
      
      res.json({
        success: true,
        data: {
          countryCode,
          requirements,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async validateBusinessInfo(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const businessInfo = req.body;
      const validation = ComplianceService.validateBusinessInfo(businessInfo);
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getTimezone(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { countryCode } = req.params;
      const timezone = ComplianceService.getTimezone(countryCode);
      
      res.json({
        success: true,
        data: {
          countryCode,
          timezone,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getRequiredConsents(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { countryCode } = req.params;
      const consents = ComplianceService.getRequiredConsents(countryCode);
      
      res.json({
        success: true,
        data: {
          countryCode,
          requiredConsents: consents,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async generateComplianceReport(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const transaction = req.body;
      const report = ComplianceService.generateComplianceReport(transaction);
      
      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      next(error);
    }
  }
}