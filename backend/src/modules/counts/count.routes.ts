import { Router } from 'express';
import { countController } from './count.controller.js';

const router = Router();

router.get('/expected', (req, res) => countController.getExpected(req, res));
router.post('/', (req, res) => countController.record(req, res));
router.get('/history', (req, res) => countController.getHistory(req, res));

export default router;
