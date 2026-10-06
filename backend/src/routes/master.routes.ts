import { Router, Request, Response } from 'express';
import { pool } from '../config/db.js';

const router = Router();

// ─── Products ──────────────────────────────────────────

// GET /products (optional query: ?supplier_id=...)
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { supplier_id } = req.query;
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
      WHERE p.is_active = true
    `;
    const params: any[] = [];

    if (supplier_id) {
      params.push(supplier_id);
      query += ` AND p.supplier_id = $${params.length}`;
    }

    query += ' ORDER BY p.name ASC';

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching products', message: err.message });
  }
});

// POST /products (Create product under a supplier)
router.post('/products', async (req: Request, res: Response) => {
  try {
    const { name, unit, price, cur = 'USD', supplier_id, category_id } = req.body;
    if (!name || !unit) {
      return res.status(400).json({ error: 'Product name and unit are required' });
    }

    let catId: number | null = category_id ? Number(category_id) : null;
    if (catId) {
      const checkCat = await pool.query('SELECT id FROM categories WHERE id = $1', [catId]);
      if (checkCat.rows.length === 0) {
        catId = null;
      }
    }
    if (!catId) {
      const defaultCat = await pool.query("SELECT id FROM categories WHERE type = 'expense' ORDER BY id ASC LIMIT 1");
      catId = defaultCat.rows[0]?.id ? Number(defaultCat.rows[0].id) : null;
    }

    const { rows } = await pool.query(
      `INSERT INTO products (name, default_unit, default_currency, default_unit_price, supplier_id, category_id, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, true)
       RETURNING id, name, default_unit as unit, CAST(default_unit_price AS FLOAT) as price, default_currency as cur, supplier_id`,
      [name.toString().trim(), unit.toString().trim(), cur === 'KHR' ? 'KHR' : 'USD', Number(price) || 0, supplier_id || null, catId]
    );

    res.status(201).json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error creating product', message: err.message });
  }
});

// PUT /products/:id (Update product)
router.put('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, unit, price, cur, supplier_id } = req.body;

    const { rows } = await pool.query(
      `UPDATE products 
       SET name = COALESCE($1, name),
           default_unit = COALESCE($2, default_unit),
           default_unit_price = COALESCE($3, default_unit_price),
           default_currency = COALESCE($4, default_currency),
           supplier_id = COALESCE($5, supplier_id)
       WHERE id = $6
       RETURNING id, name, default_unit as unit, CAST(default_unit_price AS FLOAT) as price, default_currency as cur, supplier_id`,
      [name, unit, price, cur, supplier_id, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error updating product', message: err.message });
  }
});

// DELETE /products/:id (Soft-delete product)
router.delete('/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await pool.query('UPDATE products SET is_active = false WHERE id = $1', [id]);
    res.json({ success: true, message: 'Product deleted' });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error deleting product', message: err.message });
  }
});

// ─── Suppliers / Shops ──────────────────────────────────

// GET /shops (With count of products)
router.get('/shops', async (req: Request, res: Response) => {
  try {
    const { rows } = await pool.query(`
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
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching shops', message: err.message });
  }
});

// GET /shops/:id (Get single supplier with all its products)
router.get('/shops/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rows: shopRows } = await pool.query(
      'SELECT id, name, market_location, contact_phone, note, is_active FROM suppliers WHERE id = $1 AND is_active = true',
      [id]
    );

    if (shopRows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    const { rows: productRows } = await pool.query(
      'SELECT id, name, default_unit as unit, CAST(default_unit_price AS FLOAT) as price, default_currency as cur FROM products WHERE supplier_id = $1 AND is_active = true ORDER BY name ASC',
      [id]
    );

    res.json({
      ...shopRows[0],
      products: productRows,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error fetching supplier details', message: err.message });
  }
});

// POST /shops (Create supplier)
router.post('/shops', async (req: Request, res: Response) => {
  try {
    const { name, market_location, contact_phone, note } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Supplier name is required' });
    }

    const { rows } = await pool.query(
      `INSERT INTO suppliers (name, market_location, contact_phone, note, is_active)
       VALUES ($1, $2, $3, $4, true)
       RETURNING id, name, market_location, contact_phone, note, is_active`,
      [name, market_location || null, contact_phone || null, note || null]
    );

    res.status(201).json({ ...rows[0], product_count: 0 });
  } catch (err: any) {
    res.status(500).json({ error: 'Database error creating supplier', message: err.message });
  }
});

// PUT /shops/:id (Update supplier)
router.put('/shops/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, market_location, contact_phone, note } = req.body;

    const { rows } = await pool.query(
      `UPDATE suppliers
       SET name = COALESCE($1, name),
           market_location = COALESCE($2, market_location),
           contact_phone = COALESCE($3, contact_phone),
           note = COALESCE($4, note)
       WHERE id = $5
       RETURNING id, name, market_location, contact_phone, note, is_active`,
      [name, market_location, contact_phone, note, id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Supplier not found' });
    }

    res.json(rows[0]);
  } catch (err: any) {
    res.status(500).json({ error: 'Database error updating supplier', message: err.message });
  }
});

export default router;
