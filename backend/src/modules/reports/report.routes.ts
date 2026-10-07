import { Router } from 'express';
import { reportController } from './report.controller.js';

const router = Router();

router.get('/summary', (req, res) => reportController.getSummary(req, res));
router.get('/items', (req, res) => reportController.getPurchasedItems(req, res));
router.get('/daily-cashflow', (req, res) => reportController.getDailyCashflow(req, res));
router.get('/export-card', (req, res) => reportController.getExportCard(req, res));

export default router;
