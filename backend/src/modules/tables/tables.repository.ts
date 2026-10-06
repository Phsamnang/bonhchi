import { pool } from '../../db/index.js';

export interface TableRecord {
  id: number;
  name: string;
  code: string | null;
  capacity: number | null;
  status: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export class TablesRepository {
  async getTables(): Promise<TableRecord[]> {
    const res = await pool.query(`
      SELECT 
        id, 
        name, 
        code, 
        capacity, 
        status, 
        sort_order, 
        is_active, 
        created_at, 
        updated_at
      FROM restaurant_tables
      WHERE is_active = true
      ORDER BY sort_order ASC, id ASC
    `);
    return res.rows;
  }

  async getTableById(id: string | number): Promise<TableRecord | null> {
    const res = await pool.query(
      `SELECT id, name, code, capacity, status, sort_order, is_active, created_at, updated_at
       FROM restaurant_tables
       WHERE id = $1 AND is_active = true`,
      [id]
    );
    return res.rows[0] || null;
  }

  async getTableByName(name: string): Promise<TableRecord | null> {
    const res = await pool.query(
      `SELECT id, name, code, capacity, status, sort_order, is_active, created_at, updated_at
       FROM restaurant_tables
       WHERE LOWER(name) = LOWER($1) AND is_active = true`,
      [name]
    );
    return res.rows[0] || null;
  }

  async createTable(data: {
    name: string;
    code?: string | null;
    capacity?: number | null;
    status?: string;
    sort_order?: number;
  }): Promise<TableRecord> {
    const res = await pool.query(
      `INSERT INTO restaurant_tables (name, code, capacity, status, sort_order, is_active, updated_at)
       VALUES ($1, $2, $3, COALESCE($4, 'available'), COALESCE($5, 0), true, NOW())
       ON CONFLICT (name) DO UPDATE
       SET is_active = true,
           code = COALESCE(EXCLUDED.code, restaurant_tables.code),
           capacity = COALESCE(EXCLUDED.capacity, restaurant_tables.capacity),
           status = COALESCE(EXCLUDED.status, restaurant_tables.status),
           updated_at = NOW()
       RETURNING id, name, code, capacity, status, sort_order, is_active, created_at, updated_at`,
      [data.name, data.code || null, data.capacity || null, data.status || 'available', data.sort_order ?? 0]
    );
    return res.rows[0];
  }

  async updateTable(id: string | number, data: {
    name?: string;
    code?: string;
    capacity?: number;
    status?: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<TableRecord | null> {
    const res = await pool.query(
      `UPDATE restaurant_tables
       SET name = COALESCE($1, name),
           code = COALESCE($2, code),
           capacity = COALESCE($3, capacity),
           status = COALESCE($4, status),
           sort_order = COALESCE($5, sort_order),
           is_active = COALESCE($6, is_active),
           updated_at = NOW()
       WHERE id = $7
       RETURNING id, name, code, capacity, status, sort_order, is_active, created_at, updated_at`,
      [
        data.name ?? null,
        data.code ?? null,
        data.capacity ?? null,
        data.status ?? null,
        data.sort_order ?? null,
        data.is_active ?? null,
        id,
      ]
    );
    return res.rows[0] || null;
  }

  async deleteTable(id: string | number): Promise<boolean> {
    const res = await pool.query(
      `UPDATE restaurant_tables
       SET is_active = false, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );
    return (res.rowCount ?? 0) > 0;
  }
}

export const tablesRepository = new TablesRepository();
