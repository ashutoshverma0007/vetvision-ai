import { Router, Request, Response, NextFunction } from 'express';
import { animalService } from '../services/animal.service.js';
import { timelineService } from '../services/timeline.service.js';
import { authenticateSession } from '../middleware/auth.middleware.js';
import { createAnimalSchema, updateAnimalSchema } from '@vetvision/validation';

export const animalRouter = Router();

animalRouter.use(authenticateSession);

// GET /api/v1/animals
animalRouter.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const animals = await animalService.listAnimals(req.user!);
    res.status(200).json({ success: true, data: { animals } });
  } catch (error) {
    next(error);
  }
});

// POST /api/v1/animals
animalRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = createAnimalSchema.parse(req.body);
    const animal = await animalService.createAnimal(validated, req.user!);
    res.status(201).json({ success: true, data: { animal } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/animals/:id
animalRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const animal = await animalService.getAnimalById(id, req.user!);
    res.status(200).json({ success: true, data: { animal } });
  } catch (error) {
    next(error);
  }
});

// PUT /api/v1/animals/:id
animalRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const validated = updateAnimalSchema.parse(req.body);
    const animal = await animalService.updateAnimal(id, validated, req.user!);
    res.status(200).json({ success: true, data: { animal } });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/v1/animals/:id
animalRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    await animalService.deleteAnimal(id, req.user!);
    res.status(200).json({ success: true, data: { message: 'Animal profile deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/animals/:id/timeline
animalRouter.get('/:id/timeline', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;
    const timeline = await timelineService.getAnimalTimeline(id, req.user!);
    res.status(200).json({ success: true, data: timeline });
  } catch (error) {
    next(error);
  }
});
