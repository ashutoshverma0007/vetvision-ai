import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../prisma.js';
import { UnauthorizedError } from '../errors.js';
import { UserRole } from '@vetvision/shared-types';

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  sessionId: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      sessionId?: string;
    }
  }
}

export async function authenticateSession(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.vetvision_session;
    if (!rawToken || typeof rawToken !== 'string') {
      throw new UnauthorizedError('No active session found');
    }

    const sessionTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const session = await prisma.session.findUnique({
      where: { sessionTokenHash },
      include: {
        user: true
      }
    });

    if (!session) {
      throw new UnauthorizedError('Session has expired or is invalid');
    }

    if (session.revokedAt) {
      throw new UnauthorizedError('Session has been revoked');
    }

    if (new Date() > session.expiresAt) {
      throw new UnauthorizedError('Session has expired');
    }

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role as UserRole,
      firstName: session.user.firstName,
      lastName: session.user.lastName,
      sessionId: session.id
    };
    req.sessionId = session.id;

    next();
  } catch (error) {
    next(error);
  }
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const rawToken = req.cookies?.vetvision_session;
    if (!rawToken || typeof rawToken !== 'string') {
      return next();
    }

    const sessionTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const session = await prisma.session.findUnique({
      where: { sessionTokenHash },
      include: { user: true }
    });

    if (session && !session.revokedAt && new Date() <= session.expiresAt) {
      req.user = {
        id: session.user.id,
        email: session.user.email,
        role: session.user.role as UserRole,
        firstName: session.user.firstName,
        lastName: session.user.lastName,
        sessionId: session.id
      };
      req.sessionId = session.id;
    }
    next();
  } catch {
    next();
  }
}
