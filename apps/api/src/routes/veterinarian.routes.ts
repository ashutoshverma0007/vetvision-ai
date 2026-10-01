import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { VetVerificationStatus } from '@vetvision/shared-types';
import { NotFoundError } from '../errors.js';

export const veterinarianRouter = Router();

// GET /api/v1/veterinarians (Public list of verified veterinarians)
veterinarianRouter.get('/', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const veterinarians = await prisma.veterinarianProfile.findMany({
      where: { verificationStatus: VetVerificationStatus.VERIFIED },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: { experienceYears: 'desc' }
    });

    res.status(200).json({ success: true, data: { veterinarians } });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/veterinarians/:id
veterinarianRouter.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const vetId = req.params.id as string;
    const vet = await prisma.veterinarianProfile.findUnique({
      where: { id: vetId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!vet) {
      throw new NotFoundError('Veterinarian profile not found');
    }

    res.status(200).json({ success: true, data: { veterinarian: vet } });
  } catch (error) {
    next(error);
  }
});
