import { Router } from 'express';
import { ComplianceController } from '../controllers/complianceController';

const router = Router();

// Public compliance routes (no authentication required)
router.get('/region/:countryCode', ComplianceController.getRegionConfig);
router.post('/tax/calculate', ComplianceController.calculateTax);
router.get('/payment-methods/:countryCode', ComplianceController.getAvailablePaymentMethods);
router.post('/validate/amount', ComplianceController.validateTransactionAmount);
router.get('/requirements/:countryCode', ComplianceController.getComplianceRequirements);
router.post('/validate/business', ComplianceController.validateBusinessInfo);
router.get('/timezone/:countryCode', ComplianceController.getTimezone);
router.get('/consents/:countryCode', ComplianceController.getRequiredConsents);
router.post('/report', ComplianceController.generateComplianceReport);

export default router;