import { Router, Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service.js';
import { authenticateSession } from '../middleware/auth.middleware.js';
import {
  createHealthRecordSchema,
  createVaccinationSchema,
  createMedicationSchema
} from '@vetvision/validation';
import { MedicationStatus } from '@vetvision/shared-types';

export const healthRouter = Router();

healthRouter.use(['/animals', '/medications'], authenticateSession);

// GET /api/v1/animals/:id/health
healthRouter.get('/animals/:id/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = req.params.id as string;
    const records = await healthService.listHealthRecords(animalId, req.user!);
    res.status(200).json({ success: true, data: { records } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/animals/:id/health
healthRouter.post('/animals/:id/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = req.params.id as string;
    const validated = createHealthRecordSchema.parse(req.body);
    const record = await healthService.createHealthRecord(animalId, validated, req.user!);
    res.status(201).json({ success: true, data: { record } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/animals/:id/vaccinations
healthRouter.get('/animals/:id/vaccinations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = req.params.id as string;
    const vaccinations = await healthService.listVaccinations(animalId, req.user!);
    res.status(200).json({ success: true, data: { vaccinations } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/animals/:id/vaccinations
healthRouter.post('/animals/:id/vaccinations', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = req.params.id as string;
    const validated = createVaccinationSchema.parse(req.body);
    const vaccination = await healthService.createVaccination(animalId, validated, req.user!);
    res.status(201).json({ success: true, data: { vaccination } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/animals/:id/medications
healthRouter.get('/animals/:id/medications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = req.params.id as string;
    const medications = await healthService.listMedications(animalId, req.user!);
    res.status(200).json({ success: true, data: { medications } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/animals/:id/medications
healthRouter.post('/animals/:id/medications', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animalId = req.params.id as string;
    const validated = createMedicationSchema.parse(req.body);
    const medication = await healthService.createMedication(animalId, validated, req.user!);
    res.status(201).json({ success: true, data: { medication } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/medications/:id/status
healthRouter.patch('/medications/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const medicationId = req.params.id as string;
    const status = req.body.status as MedicationStatus;
    const medication = await healthService.updateMedicationStatus(medicationId, status, req.user!);
    res.status(200).json({ success: true, data: { medication } });
  } catch (error) {
    next(error);
  }
});
