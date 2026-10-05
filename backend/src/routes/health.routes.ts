import { Router, Request, Response } from 'express';

const router = Router();

router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    system: 'Bonchi RMS Backend API',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

export default router;
