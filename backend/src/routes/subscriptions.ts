import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// All subscription routes require authentication
router.use(authenticateToken);

// Subscription management
router.post('/', SubscriptionController.createSubscription);
router.get('/', SubscriptionController.getSubscriptions);
router.get('/stats', SubscriptionController.getSubscriptionStats);
router.get('/:id', SubscriptionController.getSubscription);
router.put('/:id', SubscriptionController.updateSubscription);
router.delete('/:id', SubscriptionController.cancelSubscription);
router.post('/:id/pause', SubscriptionController.pauseSubscription);
router.post('/:id/resume', SubscriptionController.resumeSubscription);

export default router;