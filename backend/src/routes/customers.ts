import { Router } from 'express';
import { CustomerController } from '../controllers/customerController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Re-enable authentication
router.use(authenticateToken);

router.get('/', CustomerController.getCustomers);

router.get('/:customerId', CustomerController.getCustomerById);

router.get('/:customerId/transactions', CustomerController.getCustomerTransactions);

export default router;