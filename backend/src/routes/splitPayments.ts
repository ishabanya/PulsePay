import { Router } from 'express';
import { SplitPaymentController } from '../controllers/splitPaymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All split payment routes require authentication
router.use(authenticateToken);

// Split payment management
router.post('/', SplitPaymentController.createSplitPayment);
router.get('/', SplitPaymentController.getSplitPayments);
router.get('/stats', SplitPaymentController.getSplitPaymentStats);
router.get('/:id', SplitPaymentController.getSplitPayment);
router.post('/:id/pay', SplitPaymentController.payParticipantShare);
router.post('/:id/cancel', SplitPaymentController.cancelSplitPayment);
router.post('/:id/remind', SplitPaymentController.remindParticipants);

export default router;