import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { storage } from '../storage/index.js';
import { authenticateSession } from '../middleware/auth.middleware.js';
import { NotFoundError, ForbiddenError } from '../errors.js';
import { UserRole } from '@vetvision/shared-types';

export const fileRouter = Router();

// GET /api/v1/files/:id
fileRouter.get('/:id', authenticateSession, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fileId = req.params.id as string;
    const fileAsset = await prisma.fileAsset.findUnique({
      where: { id: fileId }
    });

    if (!fileAsset) {
      throw new NotFoundError('File asset not found');
    }

    // Access control:
    // 1. Owner can access their own uploaded assets
    // 2. Admin can access all assets
    // 3. Veterinarian can access if assigned to a consultation with the animal
    const user = req.user!;
    let isAuthorized = user.role === UserRole.ADMIN || fileAsset.ownerId === user.id;

    if (!isAuthorized && user.role === UserRole.VETERINARIAN) {
      const scanWithAsset = await prisma.scan.findFirst({
        where: {
          fileAssetId: fileAsset.id,
          animal: {
            consultations: {
              some: { veterinarianId: user.id }
            }
          }
        }
      });
      if (scanWithAsset) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      throw new ForbiddenError('Not authorized to access this file asset');
    }

    res.setHeader('Content-Type', fileAsset.mimeType);
    res.setHeader('Content-Length', fileAsset.sizeBytes);
    res.setHeader('Cache-Control', 'private, max-age=86400');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileAsset.originalFilename)}"`);

    const stream = await storage.getFileStream(fileAsset.storageKey);
    stream.pipe(res);
  } catch (error) {
    next(error);
  }
});
