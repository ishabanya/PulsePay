import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { authenticateToken } from '../middleware/auth';
import { validate, paymentIntentSchema, confirmPaymentSchema } from '../middleware/validation';

const router = Router();

// Apply authentication to payment creation/confirmation endpoints
router.post(
  '/create-payment-intent',
  authenticateToken,
  validate(paymentIntentSchema),
  PaymentController.createPaymentIntent
);

router.post(
  '/confirm',
  authenticateToken,
  validate(confirmPaymentSchema),
  PaymentController.confirmPayment
);

// Re-enable authentication for all endpoints
router.get('/transactions', authenticateToken, PaymentController.getTransactions);
router.get('/stats', authenticateToken, PaymentController.getDashboardStats);

// Add endpoint to manually complete payments
router.post('/complete-payment', authenticateToken, PaymentController.completePayment);

export default router;