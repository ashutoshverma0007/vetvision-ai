import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@vetvision/shared-types';
import { ForbiddenError, UnauthorizedError } from '../errors.js';

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied. Role '${req.user.role}' is not authorized for this resource. Required: ${allowedRoles.join(', ')}`
        )
      );
    }

    next();
  };
}
