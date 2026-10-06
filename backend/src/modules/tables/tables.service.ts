import { tablesRepository, TableRecord } from './tables.repository.js';

export class TablesService {
  async getTables(): Promise<TableRecord[]> {
    return tablesRepository.getTables();
  }

  async getTableById(id: string | number): Promise<TableRecord> {
    const table = await tablesRepository.getTableById(id);
    if (!table) throw new Error('Table not found');
    return table;
  }

  async createTable(body: {
    name?: string;
    code?: string;
    capacity?: number;
    status?: string;
    sort_order?: number;
  }): Promise<TableRecord> {
    const trimmedName = body.name ? body.name.toString().trim() : '';
    if (!trimmedName) {
      throw new Error('Table name is required');
    }

    return tablesRepository.createTable({
      name: trimmedName,
      code: body.code ? body.code.toString().trim() : null,
      capacity: body.capacity ? Number(body.capacity) : null,
      status: body.status ? body.status.toString().trim() : 'available',
      sort_order: body.sort_order !== undefined ? Number(body.sort_order) : 0,
    });
  }

  async updateTable(id: string | number, body: {
    name?: string;
    code?: string;
    capacity?: number;
    status?: string;
    sort_order?: number;
    is_active?: boolean;
  }): Promise<TableRecord> {
    const payload: any = {};
    if (body.name !== undefined) payload.name = body.name.toString().trim();
    if (body.code !== undefined) payload.code = body.code ? body.code.toString().trim() : null;
    if (body.capacity !== undefined) payload.capacity = body.capacity ? Number(body.capacity) : null;
    if (body.status !== undefined) payload.status = body.status.toString().trim();
    if (body.sort_order !== undefined) payload.sort_order = Number(body.sort_order);
    if (body.is_active !== undefined) payload.is_active = Boolean(body.is_active);

    const updated = await tablesRepository.updateTable(id, payload);
    if (!updated) throw new Error('Table not found');
    return updated;
  }

  async deleteTable(id: string | number): Promise<void> {
    const success = await tablesRepository.deleteTable(id);
    if (!success) throw new Error('Table not found or already deleted');
  }
}

export const tablesService = new TablesService();
