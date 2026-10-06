import { Request, Response } from 'express';
import { authService } from './auth.service.js';

export class AuthController {
  async login(req: Request, res: Response) {
    try {
      const { username, password } = req.body;
      if (!username) {
        return res.status(400).json({ error: 'Username is required' });
      }

      const result = await authService.login(username, password);
      res.json(result);
    } catch (err: any) {
      res.status(401).json({ error: 'Authentication failed', message: err.message });
    }
  }

  async quickSwitch(req: Request, res: Response) {
    try {
      const { role } = req.body;
      const targetUsername = role || 'owner';
      const result = await authService.login(targetUsername);
      res.json(result);
    } catch (err: any) {
      res.status(400).json({ error: 'Switch role failed', message: err.message });
    }
  }

  async me(req: Request, res: Response) {
    try {
      const userId = Number(req.user?.sub);
      const user = await authService.getCurrentUser(userId);
      res.json({ user });
    } catch (err: any) {
      res.status(404).json({ error: 'User not found', message: err.message });
    }
  }
}

export const authController = new AuthController();
