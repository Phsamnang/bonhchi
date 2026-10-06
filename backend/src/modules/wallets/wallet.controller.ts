import { Request, Response } from 'express';
import { walletService } from './wallet.service.js';

export class WalletController {
  async getAll(req: Request, res: Response) {
    try {
      const userRole = req.user?.app_role;
      const wallets = await walletService.getWallets(userRole);
      res.json(wallets);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching wallets', message: err.message });
    }
  }

  async getByCode(req: Request, res: Response) {
    try {
      const wallet = await walletService.getWallet(req.params.code);
      res.json(wallet);
    } catch (err: any) {
      res.status(404).json({ error: 'Wallet not found', message: err.message });
    }
  }

  async create(req: Request, res: Response) {
    try {
      const wallet = await walletService.createWallet(req.body);
      res.status(201).json(wallet);
    } catch (err: any) {
      res.status(400).json({ error: 'Failed to create wallet', message: err.message });
    }
  }

  async getTransfers(req: Request, res: Response) {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
      const transfers = await walletService.getTransfers(limit);
      res.json(transfers);
    } catch (err: any) {
      res.status(500).json({ error: 'Database error fetching transfers', message: err.message });
    }
  }

  async createTransfer(req: Request, res: Response) {
    try {
      const userId = req.user ? Number(req.user.sub) : undefined;
      const result = await walletService.transfer({ ...req.body, userId });
      res.status(201).json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Transfer failed', message: err.message });
    }
  }
}

export const walletController = new WalletController();
