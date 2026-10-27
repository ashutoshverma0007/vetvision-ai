import { Router, Request, Response, NextFunction } from 'express';
import { consultationService } from '../services/consultation.service.js';
import { authenticateSession } from '../middleware/auth.middleware.js';
import {
  createConsultationSchema,
  updateConsultationStatusSchema,
  scheduleConsultationSchema,
  createConsultationMessageSchema,
  createClinicalNoteSchema,
  updateClinicalNoteSchema
} from '@vetvision/validation';
import { ConsultationStatus } from '@vetvision/shared-types';

export const consultationRouter = Router();

consultationRouter.use(authenticateSession);

// GET /api/v1/consultations
consultationRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const status = req.query.status as ConsultationStatus | undefined;
    const consultations = await consultationService.listConsultations(req.user!, status);
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
    const consultation = await consultationService.updateStatus(id, validated, req.user!);
    res.status(200).json({ success: true, data: { consultation } });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/consultations/:id/schedule (convenience endpoint)
consultationRouter.patch('/:id/schedule', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const validated = scheduleConsultationSchema.parse(req.body);
    const consultation = await consultationService.updateStatus(
      id,
      {
        status: ConsultationStatus.SCHEDULED,
        scheduledAt: validated.scheduledAt
      },
      req.user!
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

// GET /api/v1/consultations/:id/clinical-notes
consultationRouter.get('/:id/clinical-notes', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const clinicalNotes = await consultationService.getClinicalNotes(id, req.user!);
    res.status(200).json({ success: true, data: { clinicalNotes } });
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

// PATCH /api/v1/consultations/:id/clinical-notes/:noteId
consultationRouter.patch('/:id/clinical-notes/:noteId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const noteId = req.params.noteId as string;
    const validated = updateClinicalNoteSchema.parse(req.body);
    const clinicalNote = await consultationService.updateClinicalNote(id, noteId, validated, req.user!);
    res.status(200).json({ success: true, data: { clinicalNote } });
  } catch (error) {
    next(error);
  }
});
