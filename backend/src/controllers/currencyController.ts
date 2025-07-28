import { Response, NextFunction, Request } from 'express';
import { CurrencyService } from '../services/currencyService';

export class CurrencyController {
  static async getSupportedCurrencies(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const currencies = await CurrencyService.getSupportedCurrencies();
      
      res.json({
        success: true,
        data: currencies,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getExchangeRate(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { from, to } = req.params;
      const rate = await CurrencyService.getExchangeRate(from, to);
      
      res.json({
        success: true,
        data: {
          from,
          to,
          rate,
          timestamp: new Date()
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async convertAmount(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { amount, from, to } = req.body;
      const conversion = await CurrencyService.convertAmount(amount, from, to);
      
      res.json({
        success: true,
        data: conversion,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getMultipleRates(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const { base } = req.params;
      const { targets } = req.query;
      
      if (!targets || typeof targets !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Targets parameter is required and must be a comma-separated string'
        });
        return;
      }

      const targetCurrencies = targets.split(',').map(t => t.trim());
      const rates = await CurrencyService.getMultipleRates(base, targetCurrencies);
      
      res.json({
        success: true,
        data: {
          base,
          rates,
          timestamp: new Date()
        },
      });
    } catch (error) {
      next(error);
    }
  }
}