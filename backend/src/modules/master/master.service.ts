import { masterRepository } from './master.repository.js';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export class MasterService {
  /**
   * Without page/limit: the full list as a plain array (what the market-trip screen expects).
   * With page and/or limit: `{ total, page, limit, totalPages, products }`, like GET /invoices.
   */
  async getProducts(query: {
    supplierId?: string | number;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    const search = query.search?.trim() || undefined;
    if (query.page === undefined && query.limit === undefined) {
      const { rows } = await masterRepository.getProducts({ supplierId: query.supplierId, search });
      return rows;
    }

    const limit = Math.min(MAX_PAGE_SIZE, Math.max(1, query.limit ?? DEFAULT_PAGE_SIZE));
    const page = Math.max(1, query.page ?? 1);
    const { total, rows } = await masterRepository.getProducts({ supplierId: query.supplierId, search, page, limit });
    return {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      products: rows,
    };
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
