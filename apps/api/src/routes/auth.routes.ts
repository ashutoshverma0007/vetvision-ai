import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';
import { authenticateSession } from '../middleware/auth.middleware.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  sendOtpSchema,
  verifyOtpSchema,
  resendOtpSchema
} from '@vetvision/validation';
import { config } from '@vetvision/config';
import { emailOtpService } from '../services/email-otp.service.js';

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

// POST /api/v1/auth/register (Initiates pending registration and sends Email OTP)
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = registerSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await emailOtpService.initiateSignup(validated, ip, userAgent);

    res.status(202).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/otp/send
authRouter.post('/otp/send', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = sendOtpSchema.parse(req.body);
    const result = await emailOtpService.resendOtp(email);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/otp/verify (Verifies Email OTP, creates permanent User, creates Session)
authRouter.post('/otp/verify', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = verifyOtpSchema.parse(req.body);
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await emailOtpService.verifyAndCreateUser(email, otp, ip, userAgent);
    setSessionCookie(res, result.sessionToken, result.expiresAt);

    res.status(201).json({
      success: true,
      data: { user: result.user }
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/auth/otp/resend (Resends Email OTP with cooldown enforcement)
authRouter.post('/otp/resend', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = resendOtpSchema.parse(req.body);
    const result = await emailOtpService.resendOtp(email);

    res.status(200).json({
      success: true,
      data: result
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
