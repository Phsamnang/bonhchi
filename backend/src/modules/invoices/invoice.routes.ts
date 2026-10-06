import { Router } from 'express';
import { invoiceController } from './invoice.controller.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

router.get('/', (req, res) => invoiceController.getAll(req, res));
router.get('/:id', (req, res) => invoiceController.getById(req, res));
router.post('/market-trip', (req, res) => invoiceController.createMarketTrip(req, res));
router.post('/small-expense', (req, res) => invoiceController.createSmallExpense(req, res));
router.post('/:id/void', requireRole(['owner', 'manager']), (req, res) => invoiceController.voidInvoice(req, res));
router.post('/:id/pay', (req, res) => invoiceController.payInvoice(req, res));
router.post('/:id/items/:itemId/toggle-paid', (req, res) => invoiceController.togglePaid(req, res));

export default router;
