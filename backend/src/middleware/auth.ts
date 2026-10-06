import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../lib/config.js';

export interface UserTokenPayload {
  sub: string;
  role: string;
  app_role: 'owner' | 'manager' | 'staff';
  username?: string;
  name: string;
  phone?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserTokenPayload;
    }
  }
}

export function auth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected Bearer <token>.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwtSecret) as UserTokenPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'Invalid or Expired Token',
      message: err.message,
    });
  }
}
