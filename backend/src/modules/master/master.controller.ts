import { Request, Response } from 'express';
import { masterService } from './master.service.js';

export class MasterController {
  async getProducts(req: Request, res: Response) {
    try {
      const { supplier_id } = req.query;
      const products = await masterService.getProducts(supplier_id as string);
      res.json(products);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching products', message: err.message });
    }
  }

  async createProduct(req: Request, res: Response) {
    try {
      const product = await masterService.createProduct(req.body);
      res.status(201).json(product);
    } catch (err: any) {
      res.status(400).json({ error: 'Database error creating product', message: err.message });
    }
  }

  async updateProduct(req: Request, res: Response) {
    try {
      const product = await masterService.updateProduct(req.params.id, req.body);
      res.json(product);
    } catch (err: any) {
      res.status(400).json({ error: 'Database error updating product', message: err.message });
    }
  }

  async deleteProduct(req: Request, res: Response) {
    try {
      await masterService.deleteProduct(req.params.id);
      res.json({ success: true, message: 'Product deleted' });
    } catch (err: any) {
      res.status(400).json({ error: 'Database error deleting product', message: err.message });
    }
  }

  async getShops(req: Request, res: Response) {
    try {
      const shops = await masterService.getShops();
      res.json(shops);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching shops', message: err.message });
    }
  }

  async getShopById(req: Request, res: Response) {
    try {
      const shop = await masterService.getShopById(req.params.id);
      res.json(shop);
    } catch (err: any) {
      res.status(404).json({ error: 'Supplier not found', message: err.message });
    }
  }

  async createShop(req: Request, res: Response) {
    try {
      const shop = await masterService.createShop(req.body);
      res.status(201).json(shop);
    } catch (err: any) {
      res.status(400).json({ error: 'Database error creating supplier', message: err.message });
    }
  }

  async updateShop(req: Request, res: Response) {
    try {
      const shop = await masterService.updateShop(req.params.id, req.body);
      res.json(shop);
    } catch (err: any) {
      res.status(400).json({ error: 'Database error updating supplier', message: err.message });
    }
  }

  async getCategories(req: Request, res: Response) {
    try {
      const { type } = req.query;
      const categories = await masterService.getCategories(type as string);
      res.json(categories);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching categories', message: err.message });
    }
  }
}

export const masterController = new MasterController();
