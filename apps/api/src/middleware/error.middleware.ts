import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors.js';
import { logger } from '../logger.js';
import { config } from '@vetvision/config';
import { Prisma } from '@prisma/client';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req.headers['x-request-id'] as string) || undefined;

  // 1. Zod Validation Error
  if (err instanceof ZodError) {
    const formattedIssues = err.issues.map((i) => ({
      path: i.path.join('.'),
      message: i.message
    }));

    logger.warn('Validation error occurred', {
      url: req.originalUrl,
      method: req.method,
      issues: formattedIssues
    });

    return res.status(422).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request payload',
        details: formattedIssues
      },
      meta: { requestId }
    });
  }

  // 2. Custom AppError
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error(`Server error: ${err.message}`, {
        url: req.originalUrl,
        code: err.code,
        stack: err.stack
      });
    } else {
      logger.warn(`Client error: ${err.message}`, {
        url: req.originalUrl,
        code: err.code,
        details: err.details
      });
    }

    return res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details
      },
      meta: { requestId }
    });
  }

  // 3. Prisma Unique Constraint
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta.target.join(', ') : 'field';
      return res.status(409).json({
        success: false,
        error: {
          code: 'CONFLICT',
          message: `A record with this ${target} already exists.`
        },
        meta: { requestId }
      });
    }
  }

  // 4. Multer File Upload Errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'UPLOAD_ERROR',
        message: err.message
      },
      meta: { requestId }
    });
  }

  // 5. JSON Parsing Syntax Errors
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Malformed JSON payload'
      },
      meta: { requestId }
    });
  }

  // 5. Unhandled Server Error
  logger.error('Unhandled internal server error', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
  });

  return res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: config.isProduction ? 'An unexpected server error occurred.' : err.message
    },
    meta: { requestId }
  });
}
