import { Router } from 'express';
import { QRCodeController } from '../controllers/qrCodeController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// QR code creation and management (requires authentication)
router.post('/', authenticateToken, QRCodeController.createQRCode);
router.get('/', authenticateToken, QRCodeController.getQRCodes);
router.get('/analytics', authenticateToken, QRCodeController.getQRCodeAnalytics);
router.put('/:id', authenticateToken, QRCodeController.updateQRCode);
router.delete('/:id', authenticateToken, QRCodeController.deleteQRCode);

// QR code types
router.post('/fixed-amount', authenticateToken, QRCodeController.createFixedAmountQR);
router.post('/variable-amount', authenticateToken, QRCodeController.createVariableAmountQR);
router.post('/single-use', authenticateToken, QRCodeController.createSingleUseQR);

// Public routes for QR code scanning and payment
router.get('/:id', QRCodeController.getQRCode);
router.get('/:id/validate', QRCodeController.validateQRScan);
router.get('/:id/image', QRCodeController.generateQRCodeImage);
router.post('/:id/pay', QRCodeController.processQRPayment);

export default router;