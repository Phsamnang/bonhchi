import { Router } from 'express';
import { requestController } from './request.controller.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

router.get('/', (req, res) => requestController.getAll(req, res));
router.post('/', (req, res) => requestController.create(req, res));
router.post('/:id/approve', requireRole(['owner']), (req, res) => requestController.approve(req, res));
router.post('/:id/reject', requireRole(['owner']), (req, res) => requestController.reject(req, res));
router.post('/:id/distribute', (req, res) => requestController.distribute(req, res));

export default router;
