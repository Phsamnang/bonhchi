import { Request, Response } from 'express';
import { requestService } from './request.service.js';

export class RequestController {
  async getAll(req: Request, res: Response) {
    try {
      const { status } = req.query;
      const requests = await requestService.getAll(status as string);
      res.json(requests);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching money requests', message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const requestedBy = req.user ? Number(req.user.sub) : undefined;
      const result = await requestService.create({ ...req.body, requested_by: requestedBy });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to create money request', message: err.message });
    }
  }

  async approve(req: Request, res: Response) {
    try {
      const approverId = req.user ? Number(req.user.sub) : undefined;
      const result = await requestService.approve(req.params.id, req.body.disburse_from_wallet_id, approverId);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to approve money request', message: err.message });
    }
  }

  async reject(req: Request, res: Response) {
    try {
      const result = await requestService.reject(req.params.id, req.body.reason);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to reject money request', message: err.message });
    }
  }

  async distribute(req: Request, res: Response) {
    try {
      const result = await requestService.distribute(req.params.id, req.body);
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to record distribution', message: err.message });
    }
  }
}

export const requestController = new RequestController();
