import { masterRepository } from './master.repository.js';

export class MasterService {
  async getProducts(supplierId?: string | number) {
    return masterRepository.getProducts(supplierId);
  }

  async createProduct(body: any) {
    if (!body.name || !body.unit) {
      throw new Error('Product name and unit are required');
    }
    return masterRepository.createProduct({
      name: body.name.toString().trim(),
      unit: body.unit.toString().trim(),
      price: Number(body.price) || 0,
      cur: body.cur === 'KHR' ? 'KHR' : 'USD',
      supplier_id: body.supplier_id ? Number(body.supplier_id) : null,
      category_id: body.category_id ? Number(body.category_id) : null,
    });
  }

  async updateProduct(id: string | number, body: any) {
    const updated = await masterRepository.updateProduct(id, body);
    if (!updated) throw new Error('Product not found');
    return updated;
  }

  async deleteProduct(id: string | number) {
    await masterRepository.deleteProduct(id);
  }

  async getShops() {
    return masterRepository.getShops();
  }

  async getShopById(id: string | number) {
    const shop = await masterRepository.getShopById(id);
    if (!shop) throw new Error('Supplier not found');
    return shop;
  }

  async createShop(body: any) {
    if (!body.name) throw new Error('Supplier name is required');
    return masterRepository.createShop(body);
  }

  async updateShop(id: string | number, body: any) {
    const updated = await masterRepository.updateShop(id, body);
    if (!updated) throw new Error('Supplier not found');
    return updated;
  }

  async getCategories(type?: string) {
    return masterRepository.getCategories(type);
  }
}

export const masterService = new MasterService();
