import { Request, Response, NextFunction } from 'express';
import { stripe } from '../config/stripe';
import { PaymentService } from '../services/paymentService';

export class WebhookController {
  static async handleStripeWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const sig = req.headers['stripe-signature'] as string;
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
      
      if (!webhookSecret) {
        console.error('Stripe webhook secret is not configured');
        res.status(400).json({ error: 'Webhook secret not configured' });
        return;
      }

      let event;
      
      try {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } catch (error: any) {
        console.error('Webhook signature verification failed:', error.message);
        res.status(400).json({ error: `Webhook signature verification failed: ${error.message}` });
        return;
      }

      console.log(`Received webhook event: ${event.type}`);
      
      await PaymentService.handleWebhook(event);
      
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook handling error:', error);
      next(error);
    }
  }
}