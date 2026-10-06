import { Request, Response } from 'express';
import { invoiceService } from './invoice.service.js';

export class InvoiceController {
  async getAll(req: Request, res: Response) {
    try {
      const { status, type, supplier } = req.query;
      const result = await invoiceService.getInvoices({
        status: status as string,
        type: type as string,
        supplier: supplier as string,
      });
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching invoices', message: err.message });
    }
  }

  async getById(req: Request, res: Response) {
    try {
      const invoice = await invoiceService.getInvoiceById(req.params.id);
      res.json(invoice);
    } catch (err: any) {
      res.status(404).json({ error: 'Invoice not found', message: err.message });
    }
  }

  async createMarketTrip(req: Request, res: Response) {
    try {
      const userId = req.user ? Number(req.user.sub) : undefined;
      const result = await invoiceService.recordMarketTrip(req.body, userId);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Market trip recording failed', message: err.message });
    }
  }

  async createSmallExpense(req: Request, res: Response) {
    try {
      const userId = req.user ? Number(req.user.sub) : undefined;
      const result = await invoiceService.recordSmallExpense(req.body, userId);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Small expense recording failed', message: err.message });
    }
  }

  async voidInvoice(req: Request, res: Response) {
    try {
      const { reason } = req.body;
      const userId = req.user ? Number(req.user.sub) : undefined;
      const result = await invoiceService.voidInvoice(req.params.id, reason, userId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Invoice voiding failed', message: err.message });
    }
  }

  async togglePaid(req: Request, res: Response) {
    try {
      const { id, itemId } = req.params;
      const result = await invoiceService.toggleItemPaid(id, itemId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Toggle paid status failed', message: err.message });
    }
  }

  async payInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { wallet_id } = req.body;
      const userId = req.user ? Number(req.user.sub) : undefined;
      const result = await invoiceService.payInvoice(id, wallet_id, userId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Payment failed', message: err.message });
    }
  }
}

export const invoiceController = new InvoiceController();
