import { Router, Request, Response, NextFunction } from 'express';
import { scanService } from '../services/scan.service.js';
import { authenticateSession } from '../middleware/auth.middleware.js';
import { uploadSingleImage } from '../middleware/upload.middleware.js';
import { createScanSchema } from '@vetvision/validation';
import { BadRequestError } from '../errors.js';

export const scanRouter = Router();

scanRouter.use(['/animals', '/scans'], authenticateSession);

// POST /api/v1/animals/:id/scans
scanRouter.post('/animals/:id/scans', uploadSingleImage, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = req.params.id as string;
    if (!req.file) {
      throw new BadRequestError('Image file is required for scan submission');
    }

    const metadata = req.body ? createScanSchema.parse(req.body) : { bodyPart: 'Lateral Body', captureTimestamp: new Date() };

    const scan = await scanService.uploadAndAnalyzeScan(
      animalId,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype,
      metadata,
      req.user!
    );

    res.status(201).json({ success: true, data: { scan } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/animals/:id/scans
scanRouter.get('/animals/:id/scans', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = req.params.id as string;
    const scans = await scanService.listScansForAnimal(animalId, req.user!);
    res.status(200).json({ success: true, data: { scans } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/scans/recent
scanRouter.get('/scans/recent', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scans = await scanService.listRecentScans(req.user!);
    res.status(200).json({ success: true, data: { scans } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/scans/:id
scanRouter.get('/scans/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const scanId = req.params.id as string;
    const scan = await scanService.getScanById(scanId, req.user!);
    res.status(200).json({ success: true, data: { scan } });
  } catch (error) {
    next(error);
  }
});
