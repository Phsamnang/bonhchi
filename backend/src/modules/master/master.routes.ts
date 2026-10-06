import { Router } from 'express';
import { masterController } from './master.controller.js';

const router = Router();

router.get('/products', (req, res) => masterController.getProducts(req, res));
router.post('/products', (req, res) => masterController.createProduct(req, res));
router.put('/products/:id', (req, res) => masterController.updateProduct(req, res));
router.delete('/products/:id', (req, res) => masterController.deleteProduct(req, res));

router.get('/shops', (req, res) => masterController.getShops(req, res));
router.get('/shops/:id', (req, res) => masterController.getShopById(req, res));
router.post('/shops', (req, res) => masterController.createShop(req, res));
router.put('/shops/:id', (req, res) => masterController.updateShop(req, res));

router.get('/categories', (req, res) => masterController.getCategories(req, res));

export default router;
