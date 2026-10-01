import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { authenticateSession } from '../middleware/auth.middleware.js';
import { registerSchema, loginSchema, changePasswordSchema } from '@vetvision/validation';
import { config } from '@vetvision/config';

export const authRouter = Router();

const COOKIE_NAME = 'vetvision_session';

function setSessionCookie(res: Response, token: string, expiresAt: Date) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: config.COOKIE_SECURE,
    sameSite: config.isProduction ? 'strict' : 'lax',
    expires: expiresAt,
    path: '/'
  });
}

// POST /api/v1/auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = registerSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.register(validated, ip, userAgent);
    setSessionCookie(res, result.sessionToken, result.expiresAt);

    res.status(201).json({
      success: true,
      data: { user: result.user }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = loginSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await authService.login(validated, ip, userAgent);
    setSessionCookie(res, result.sessionToken, result.expiresAt);

    res.status(200).json({
      success: true,
      data: { user: result.user }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/logout
authRouter.post('/logout', authenticateSession, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.sessionId) {
      await authService.logout(req.sessionId, req.user?.id);
    }
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.status(200).json({
      success: true,
      data: { message: 'Logged out successfully' }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/auth/me
authRouter.get('/me', authenticateSession, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user!.id);
    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/change-password
authRouter.post('/change-password', authenticateSession, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = changePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.id, validated);
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.status(200).json({
      success: true,
      data: { message: 'Password updated successfully. Please log in with your new password.' }
    });
  } catch (error) {
    next(error);
  }
});
