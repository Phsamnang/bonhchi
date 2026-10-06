import { Request, Response } from 'express';
import { countService } from './count.service.js';

export class CountController {
  async getExpected(req: Request, res: Response) {
    try {
      const result = await countService.getExpected();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching expected amounts', message: err.message });
    }
  }

  async record(req: Request, res: Response) {
    try {
      const userId = req.user ? Number(req.user.sub) : undefined;
      const result = await countService.recordCount({ ...req.body, userId });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({
        error: err.message || 'Failed to record cash count',
        difference: err.difference,
        tolerance: err.tolerance,
      });
    }
  }

  async getHistory(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 30;
      const history = await countService.getHistory(limit);
      res.json(history);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching count history', message: err.message });
    }
  }
}

export const countController = new CountController();
