import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);
    
    if (error) {
      res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => detail.message),
      });
      return;
    }
    
    next();
  };
};

export const paymentIntentSchema = Joi.object({
  amount: Joi.number().min(50).required().messages({
    'number.min': 'Minimum amount is $0.50 (50 cents)',
    'any.required': 'Amount is required',
  }),
  currency: Joi.string().valid('usd', 'eur', 'gbp').default('usd'),
  customerEmail: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Customer email is required',
  }),
  customerName: Joi.string().min(1).required().messages({
    'string.min': 'Customer name cannot be empty',
    'any.required': 'Customer name is required',
  }),
  description: Joi.string().allow('').default(''),
});

export const confirmPaymentSchema = Joi.object({
  paymentIntentId: Joi.string().required().messages({
    'any.required': 'Payment intent ID is required',
  }),
});