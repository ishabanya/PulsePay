import { Router } from 'express';
import { SecurityController } from '../controllers/securityController';
import { authenticateUser } from '../middleware/auth';
import { setSecurityHeaders, encryptInTransit } from '../middleware/encryptionMiddleware';

const router = Router();

// Apply security middleware to all routes
router.use(setSecurityHeaders);
router.use(encryptInTransit);
router.use(authenticateUser);

// PCI DSS Compliance Routes
router.post('/pci/assessments', SecurityController.createPCIAssessment);
router.get('/pci/assessments', SecurityController.getPCIAssessments);
router.put('/pci/assessments/:assessmentId/requirements', SecurityController.updatePCIRequirement);
router.post('/pci/incidents', SecurityController.reportSecurityIncident);
router.get('/pci/incidents', SecurityController.getSecurityIncidents);
router.get('/pci/reports', SecurityController.generatePCIReport);

// GDPR Compliance Routes
router.post('/gdpr/consent', SecurityController.recordConsent);
router.post('/gdpr/consent/withdraw', SecurityController.withdrawConsent);
router.get('/gdpr/consent', SecurityController.getUserConsents);
router.post('/gdpr/requests', SecurityController.submitDataSubjectRequest);
router.get('/gdpr/requests', SecurityController.getDataSubjectRequests);
router.get('/gdpr/export', SecurityController.exportUserData);
router.get('/gdpr/reports', SecurityController.generateGDPRReport);

// MFA Management Routes
router.post('/mfa/setup', SecurityController.setupMFA);
router.post('/mfa/enable', SecurityController.enableMFA);
router.post('/mfa/verify', SecurityController.verifyMFA);
router.get('/mfa/status', SecurityController.getMFAStatus);
router.post('/mfa/backup-codes', SecurityController.regenerateBackupCodes);

// RBAC Management Routes
router.post('/rbac/roles/assign', SecurityController.assignRole);
router.post('/rbac/roles/remove', SecurityController.removeRole);
router.get('/rbac/users/:userId/roles', SecurityController.getUserRoles);
router.get('/rbac/roles/definitions', SecurityController.getRoleDefinitions);
router.get('/rbac/users', SecurityController.listAllUsers);

// Audit and Compliance Routes
router.get('/audit/logs', SecurityController.getAuditLogs);
router.post('/audit/reports', SecurityController.generateComplianceReport);

export default router;