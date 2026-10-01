import { Router, Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import { authenticateSession } from '../middleware/auth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { UserRole, VetVerificationStatus, ModelStatus } from '@vetvision/shared-types';
import { createModelVersionSchema, updateVetVerificationSchema } from '@vetvision/validation';

export const adminRouter = Router();

adminRouter.use(authenticateSession, requireRole(UserRole.ADMIN));

// GET /api/v1/admin/users
adminRouter.get('/users', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 20;
    const result = await adminService.listUsers(page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/veterinarians
adminRouter.get('/veterinarians', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as VetVerificationStatus | undefined;
    const veterinarians = await adminService.listVeterinarians(status);
    res.status(200).json({ success: true, data: { veterinarians } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/admin/veterinarians/:userId/verification
adminRouter.patch('/veterinarians/:userId/verification', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.userId as string;
    const validated = updateVetVerificationSchema.parse(req.body);
    const updated = await adminService.updateVetVerification(userId, validated.status);
    res.status(200).json({ success: true, data: { veterinarianProfile: updated } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/models
adminRouter.get('/models', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const models = await adminService.listModelVersions();
    res.status(200).json({ success: true, data: { models } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/admin/models
adminRouter.post('/models', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createModelVersionSchema.parse(req.body);
    const model = await adminService.createModelVersion(validated);
    res.status(201).json({ success: true, data: { model } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/admin/models/:id/status
adminRouter.patch('/models/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const status = req.body.status as ModelStatus;
    const model = await adminService.setModelStatus(id, status);
    res.status(200).json({ success: true, data: { model } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/admin/audit-logs
adminRouter.get('/audit-logs', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const result = await adminService.listAuditLogs(page, limit);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});
