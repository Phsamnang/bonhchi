import { Request, Response, NextFunction } from 'express';
import { verifyToken, PostgrestJwtClaims } from '../services/jwt.service.js';
import { UserRole } from '../types/index.js';

// Extend Express Request interface with authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: PostgrestJwtClaims;
    }
  }
}

/**
 * Middleware: Verifies PostgREST-compatible JWT Token
 */
export function authenticateJwt(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing or malformed Authorization header. Expected Bearer <token>.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const claims = verifyToken(token);
    req.user = claims;
    next();
  } catch (err: any) {
    return res.status(401).json({
      error: 'Invalid or Expired Token',
      message: err.message
    });
  }
}

/**
 * Middleware: Enforces Role-Based Access Control (RBAC)
 */
export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.app_role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${req.user.app_role}' does not have sufficient permissions to access this resource. Allowed roles: ${allowedRoles.join(', ')}.`
      });
    }

    next();
  };
}
