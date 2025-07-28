import { Router } from 'express';
import { BulkPaymentController } from '../controllers/bulkPaymentController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All bulk payment routes require authentication
router.use(authenticateToken);

// Bulk payment management
router.post('/', BulkPaymentController.createBulkPayment);
router.post('/import-csv', BulkPaymentController.importPaymentsFromCSV);
router.get('/', BulkPaymentController.getBulkPayments);
router.get('/stats', BulkPaymentController.getBulkPaymentStats);
router.get('/:id', BulkPaymentController.getBulkPayment);
router.post('/:id/process', BulkPaymentController.processBulkPayment);
router.post('/:id/retry', BulkPaymentController.retryFailedPayments);
router.post('/:id/cancel', BulkPaymentController.cancelBulkPayment);
router.get('/:id/export', BulkPaymentController.exportBulkPaymentResults);

export default router;