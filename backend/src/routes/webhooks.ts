import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';

const router = Router();

router.post('/stripe', WebhookController.handleStripeWebhook);

export default router;