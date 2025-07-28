import { Router } from 'express';
import { ScheduledPaymentController } from '../controllers/scheduledPaymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All scheduled payment routes require authentication
router.use(authenticateToken);

// Scheduled payment management
router.post('/', ScheduledPaymentController.createScheduledPayment);
router.post('/bulk', ScheduledPaymentController.createBulkScheduledPayments);
router.get('/', ScheduledPaymentController.getScheduledPayments);
router.get('/upcoming', ScheduledPaymentController.getUpcomingPayments);
router.get('/stats', ScheduledPaymentController.getScheduledPaymentStats);
router.get('/:id', ScheduledPaymentController.getScheduledPayment);
router.put('/:id', ScheduledPaymentController.updateScheduledPayment);
router.post('/:id/cancel', ScheduledPaymentController.cancelScheduledPayment);
router.post('/:id/retry', ScheduledPaymentController.retryScheduledPayment);

export default router;