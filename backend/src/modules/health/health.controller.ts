import { Request, Response } from 'express';
import { testConnection } from '../../db/index.js';
import { getPhnomPenhDateTime, TIMEZONE } from '../../lib/timezone.js';

export class HealthController {
  async check(req: Request, res: Response) {
    const dbOk = await testConnection();
    res.json({
      status: 'ok',
      database: dbOk ? 'connected' : 'disconnected',
      timezone: TIMEZONE,
      local_time: getPhnomPenhDateTime(),
      timestamp: new Date().toISOString(),
    });
  }
}

export const healthController = new HealthController();
