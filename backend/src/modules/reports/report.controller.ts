import { Request, Response } from 'express';
import { reportService } from './report.service.js';

export class ReportController {
  async getSummary(req: Request, res: Response) {
    try {
      const period = (req.query.period as string) || 'today';
      const result = await reportService.getSummary(period);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching report summary', message: err.message });
    }
  }

  async getPurchasedItems(req: Request, res: Response) {
    try {
      const period = (req.query.period as string) || 'today';
      const result = await reportService.getPurchasedItems(period);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching purchased items', message: err.message });
    }
  }

  async getExportCard(req: Request, res: Response) {
    try {
      const result = await reportService.getExportCard();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error exporting report card', message: err.message });
    }
  }
}

export const reportController = new ReportController();
