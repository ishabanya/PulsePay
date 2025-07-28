import { Router } from 'express';
import { CurrencyController } from '../controllers/currencyController';

const router = Router();

// Public currency routes (no authentication required)
router.get('/supported', CurrencyController.getSupportedCurrencies);
router.get('/rates/:from/:to', CurrencyController.getExchangeRate);
router.post('/convert', CurrencyController.convertAmount);
router.get('/rates/:base', CurrencyController.getMultipleRates);

export default router;