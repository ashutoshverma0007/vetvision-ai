import { Router, Request, Response, NextFunction } from 'express';
import { consultationService } from '../services/consultation.service.js';
import { authenticateSession } from '../middleware/auth.middleware.js';
import {
  createConsultationSchema,
  updateConsultationStatusSchema,
  createConsultationMessageSchema,
  createClinicalNoteSchema
} from '@vetvision/validation';

export const consultationRouter = Router();

consultationRouter.use(authenticateSession);

// GET /api/v1/consultations
consultationRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const consultations = await consultationService.listConsultations(req.user!);
    res.status(200).json({ success: true, data: { consultations } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/consultations
consultationRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createConsultationSchema.parse(req.body);
    const consultation = await consultationService.requestConsultation(validated, req.user!);
    res.status(201).json({ success: true, data: { consultation } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/consultations/:id
consultationRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const consultation = await consultationService.getConsultationById(id, req.user!);
    res.status(200).json({ success: true, data: { consultation } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/consultations/:id/status
consultationRouter.patch('/:id/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const validated = updateConsultationStatusSchema.parse(req.body);
    const consultation = await consultationService.updateStatus(
      id,
      validated.status,
      req.user!,
      req.body.scheduledAt ? new Date(req.body.scheduledAt) : undefined
    );
    res.status(200).json({ success: true, data: { consultation } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/consultations/:id/messages
consultationRouter.post('/:id/messages', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const validated = createConsultationMessageSchema.parse(req.body);
    const message = await consultationService.sendMessage(id, validated, req.user!);
    res.status(201).json({ success: true, data: { message } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/consultations/:id/clinical-notes
consultationRouter.post('/:id/clinical-notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const validated = createClinicalNoteSchema.parse(req.body);
    const clinicalNote = await consultationService.createClinicalNote(id, validated, req.user!);
    res.status(201).json({ success: true, data: { clinicalNote } });
  } catch (error) {
    next(error);
  }
});
