import { Router } from 'express';
import { tablesController } from './tables.controller.js';

const router = Router();

router.get('/', (req, res) => tablesController.getTables(req, res));
router.get('/:id', (req, res) => tablesController.getTableById(req, res));
router.post('/', (req, res) => tablesController.createTable(req, res));
router.put('/:id', (req, res) => tablesController.updateTable(req, res));
router.delete('/:id', (req, res) => tablesController.deleteTable(req, res));

export default router;
