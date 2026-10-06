import { Request, Response, NextFunction } from 'express';

export type UserRole = 'owner' | 'manager' | 'staff';

export function requireRole(allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
    }

    if (!allowedRoles.includes(req.user.app_role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${req.user.app_role}' does not have sufficient permissions to access this resource. Allowed roles: ${allowedRoles.join(', ')}.`,
      });
    }

    next();
  };
}
