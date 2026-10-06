import { Request, Response } from 'express';
import { tablesService } from './tables.service.js';

export class TablesController {
  async getTables(req: Request, res: Response) {
    try {
      const tables = await tablesService.getTables();
      res.json(tables);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching tables', message: err.message });
    }
  }

  async getTableById(req: Request, res: Response) {
    try {
      const table = await tablesService.getTableById(req.params.id);
      res.json(table);
    } catch (err: any) {
      res.status(404).json({ error: 'Table not found', message: err.message });
    }
  }

  async createTable(req: Request, res: Response) {
    try {
      const table = await tablesService.createTable(req.body);
      res.status(201).json(table);
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to create table', message: err.message });
    }
  }

  async updateTable(req: Request, res: Response) {
    try {
      const table = await tablesService.updateTable(req.params.id, req.body);
      res.json(table);
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to update table', message: err.message });
    }
  }

  async deleteTable(req: Request, res: Response) {
    try {
      await tablesService.deleteTable(req.params.id);
      res.json({ success: true, message: 'Table deleted successfully' });
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to delete table', message: err.message });
    }
  }
}

export const tablesController = new TablesController();
