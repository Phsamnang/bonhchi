import { pool } from '../../db/index.js';

export class MasterRepository {
  /**
   * Active products, optionally for one supplier and/or matching a name search.
   * With `limit`, returns one page (`offset` = (page - 1) * limit) plus the total match count.
   */
  async getProducts(filter: {
    supplierId?: string | number;
    search?: string;
    page?: number;
    limit?: number;
  } = {}): Promise<{ total: number; rows: any[] }> {
    const where = ['p.is_active = true'];
    const params: any[] = [];
    if (filter.supplierId) {
      params.push(filter.supplierId);
      where.push(`p.supplier_id = $${params.length}`);
    }
    if (filter.search) {
      // Escape LIKE wildcards so "50%" or "a_b" match literally
      params.push(`%${filter.search.replace(/[\\%_]/g, '\\$&')}%`);
      where.push(`p.name ILIKE $${params.length}`);
    }
    const whereSql = where.join(' AND ');

    let query = `
      SELECT
        p.id,
        p.name,
        p.default_unit as unit,
        CAST(p.default_unit_price AS FLOAT) as price,
        p.default_currency as cur,
        p.supplier_id,
        s.name as supplier_name,
        p.is_active
      FROM products p
      LEFT JOIN suppliers s ON s.id = p.supplier_id
      WHERE ${whereSql}
      ORDER BY p.name ASC, p.id ASC
    `;

    if (!filter.limit) {
      const res = await pool.query(query, params);
      return { total: res.rows.length, rows: res.rows };
    }

    const countRes = await pool.query(`SELECT COUNT(*)::int AS total FROM products p WHERE ${whereSql}`, params);
    const page = filter.page && filter.page > 1 ? filter.page : 1;
    query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    const res = await pool.query(query, [...params, filter.limit, (page - 1) * filter.limit]);
    return { total: countRes.rows[0].total, rows: res.rows };
  }

  async createProduct(data: {
    name: string;
    unit: string;
    price: number;
    cur: string;
    supplier_id?: number | null;
    category_id?: number | null;
  }) {
    const res = await pool.query(
      `INSERT INTO products (name, default_unit, default_currency, default_unit_price, supplier_id, category_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, name, default_unit as unit, CAST(default_unit_price AS FLOAT) as price, default_currency as cur, supplier_id`,
      [data.name, data.unit, data.cur, data.price, data.supplier_id || null, data.category_id || null]
    );
    return res.rows[0];
  }

  async updateProduct(id: string | number, data: any) {
    const res = await pool.query(
      `UPDATE products 
       SET name = COALESCE($1, name),
           default_unit = COALESCE($2, default_unit),
           default_unit_price = COALESCE($3, default_unit_price),
           default_currency = COALESCE($4, default_currency),
           supplier_id = COALESCE($5, supplier_id)
       WHERE id = $6
       RETURNING id, name, default_unit as unit, CAST(default_unit_price AS FLOAT) as price, default_currency as cur, supplier_id`,
      [data.name, data.unit, data.price, data.cur, data.supplier_id, id]
    );
    return res.rows[0];
  }

  async deleteProduct(id: string | number) {
    await pool.query('UPDATE products SET is_active = false WHERE id = $1', [id]);
  }

  async getShops() {
    const res = await pool.query(`
      SELECT 
        s.id, 
        s.name, 
        s.market_location, 
        s.contact_phone, 
        s.note, 
        s.is_active,
        CAST(COUNT(p.id) AS INTEGER) as product_count
      FROM suppliers s
      LEFT JOIN products p ON p.supplier_id = s.id AND p.is_active = true
      WHERE s.is_active = true
      GROUP BY s.id, s.name, s.market_location, s.contact_phone, s.note, s.is_active
      ORDER BY s.name ASC
    `);
    return res.rows;
  }

  async getShopById(id: string | number) {
    const shopRes = await pool.query(
      'SELECT id, name, market_location, contact_phone, note, is_active FROM suppliers WHERE id = $1 AND is_active = true',
      [id]
    );
    if (!shopRes.rows.length) return null;

    const prodRes = await pool.query(
      'SELECT id, name, default_unit as unit, CAST(default_unit_price AS FLOAT) as price, default_currency as cur FROM products WHERE supplier_id = $1 AND is_active = true ORDER BY name ASC',
      [id]
    );
    return { ...shopRes.rows[0], products: prodRes.rows };
  }

  async createShop(data: { name: string; market_location?: string; contact_phone?: string; note?: string }) {
    const res = await pool.query(
      `INSERT INTO suppliers (name, market_location, contact_phone, note, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, market_location, contact_phone, note, is_active`,
      [data.name, data.market_location || null, data.contact_phone || null, data.note || null]
    );
    return { ...res.rows[0], product_count: 0 };
  }

  async updateShop(id: string | number, data: any) {
    const res = await pool.query(
      `UPDATE suppliers
       SET name = COALESCE($1, name),
           market_location = COALESCE($2, market_location),
           contact_phone = COALESCE($3, contact_phone),
           note = COALESCE($4, note)
       WHERE id = $5
       RETURNING id, name, market_location, contact_phone, note, is_active`,
      [data.name, data.market_location, data.contact_phone, data.note, id]
    );
    return res.rows[0];
  }

  async getCategories(type?: string) {
    let sql = 'SELECT id, name_km, name_en, type, icon FROM categories WHERE is_active = true';
    const params: any[] = [];
    if (type) {
      params.push(type);
      sql += ' AND type = $1';
    }
    sql += ' ORDER BY id ASC';
    const res = await pool.query(sql, params);
    return res.rows;
  }
}

export const masterRepository = new MasterRepository();
