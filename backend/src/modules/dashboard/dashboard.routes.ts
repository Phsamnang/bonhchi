import { Router } from 'express';
import { dashboardController } from './dashboard.controller.js';

const router = Router();

router.get('/summary', (req, res) => dashboardController.getSummary(req, res));

export default router;
