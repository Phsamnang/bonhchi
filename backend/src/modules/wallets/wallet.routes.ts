import { Router } from 'express';
import { walletController } from './wallet.controller.js';
import { requireRole } from '../../middleware/requireRole.js';

const router = Router();

router.get('/', (req, res) => walletController.getAll(req, res));
router.get('/transfers', (req, res) => walletController.getTransfers(req, res));
router.post('/transfers', (req, res) => walletController.createTransfer(req, res));
router.post('/transfer', (req, res) => walletController.createTransfer(req, res));
router.get('/:code', (req, res) => walletController.getByCode(req, res));
router.post('/', requireRole(['owner', 'manager']), (req, res) => walletController.create(req, res));

export default router;
