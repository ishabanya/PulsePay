import { Response, NextFunction } from 'express';
import { CustomerService } from '../services/customerService';
import { AuthenticatedRequest } from '../types';

export class CustomerController {
  static async getCustomers(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const customers = await CustomerService.getCustomers(userId);
      
      res.json({
        success: true,
        data: {
          customers,
          count: customers.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerById(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const { customerId } = req.params;
      
      const customer = await CustomerService.getCustomerById(customerId, userId);
      
      if (!customer) {
        res.status(404).json({
          success: false,
          error: 'Customer not found',
        });
        return;
      }
      
      res.json({
        success: true,
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCustomerTransactions(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const userId = req.user!.uid;
      const { customerId } = req.params;
      
      const transactions = await CustomerService.getCustomerTransactions(customerId, userId);
      
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
}