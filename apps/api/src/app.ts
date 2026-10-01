import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { config } from '@vetvision/config';
import { prisma } from './prisma.js';
import { aiClient } from './services/ai-client.service.js';
import { errorHandler } from './middleware/error.middleware.js';
import { NotFoundError } from './errors.js';

// Route imports
import { authRouter } from './routes/auth.routes.js';
import { animalRouter } from './routes/animal.routes.js';
import { healthRouter } from './routes/health.routes.js';
import { scanRouter } from './routes/scan.routes.js';
import { consultationRouter } from './routes/consultation.routes.js';
import { veterinarianRouter } from './routes/veterinarian.routes.js';
import { fileRouter } from './routes/file.routes.js';
import { adminRouter } from './routes/admin.routes.js';
import { userRouter } from './routes/user.routes.js';

export function createApp() {
  const app = express();

  // 1. Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: config.isProduction ? undefined : false,
      crossOriginResourcePolicy: { policy: 'cross-origin' }
    })
  );

  // 2. Strict CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (config.corsOrigins.includes(origin) || !config.isProduction) {
          return callback(null, true);
        }
        callback(new Error('Blocked by CORS policy'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-Id']
    })
  );

  // 3. Request ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-Id', requestId);
    next();
  });

  // 4. Rate Limiting
  const limiter = rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW_MS,
    max: config.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: true,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this client. Please slow down and try again later.'
      }
    }
  });
  app.use('/api/', limiter);

  // 5. Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // 6. System Health Check Endpoint
  app.get('/api/v1/health', async (_req: Request, res: Response) => {
    let dbStatus = 'HEALTHY';
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      dbStatus = 'DISCONNECTED';
    }

    const aiHealth = await aiClient.checkHealth();

    res.status(200).json({
      success: true,
      data: {
        status: dbStatus === 'HEALTHY' ? 'OPERATIONAL' : 'DEGRADED',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        aiService: aiHealth.status,
        environment: config.NODE_ENV
      }
    });
  });

  // 7. Mount Versioned REST Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', userRouter);
  app.use('/api/v1/animals', animalRouter);
  app.use('/api/v1', healthRouter);
  app.use('/api/v1', scanRouter);
  app.use('/api/v1/consultations', consultationRouter);
  app.use('/api/v1/veterinarians', veterinarianRouter);
  app.use('/api/v1/files', fileRouter);
  app.use('/api/v1/admin', adminRouter);

  // 8. 404 Handler
  app.use((req: Request, _res: Response, next: NextFunction) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
  });

  // 9. Centralized Error Handler
  app.use(errorHandler);

  return app;
}
