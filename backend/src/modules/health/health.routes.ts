import { Router } from 'express';
import { healthController } from './health.controller.js';

const router = Router();

router.get('/', (req, res) => healthController.check(req, res));
router.get('/health', (req, res) => healthController.check(req, res));

export default router;
