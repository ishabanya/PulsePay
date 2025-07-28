import { Router } from 'express';
import { PaymentLinkController } from '../controllers/paymentLinkController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Payment link creation and management (requires authentication)
router.post('/', authenticateToken, PaymentLinkController.createPaymentLink);
router.get('/', authenticateToken, PaymentLinkController.getPaymentLinks);
router.get('/analytics', authenticateToken, PaymentLinkController.getPaymentLinkAnalytics);
router.put('/:id', authenticateToken, PaymentLinkController.updatePaymentLink);
router.delete('/:id', authenticateToken, PaymentLinkController.deletePaymentLink);

// Public routes for payment processing
router.get('/:id', PaymentLinkController.getPaymentLink);
router.get('/:id/preview', PaymentLinkController.getLinkPreview);
router.post('/:id/pay', PaymentLinkController.processPaymentFromLink);

export default router;