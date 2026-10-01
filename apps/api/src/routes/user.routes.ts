import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../prisma.js';
import { authenticateSession } from '../middleware/auth.middleware.js';
import { updateUserProfileSchema } from '@vetvision/validation';
import { ForbiddenError, NotFoundError } from '../errors.js';
import { UserRole } from '@vetvision/shared-types';

export const userRouter = Router();

// GET /api/v1/users/me
userRouter.get('/me', authenticateSession, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
        veterinarianProfile: {
          select: {
            id: true,
            licenseNumber: true,
            specialization: true,
            experienceYears: true,
            clinicName: true,
            bio: true,
            verificationStatus: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/v1/users/me
userRouter.patch('/me', authenticateSession, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = updateUserProfileSchema.parse(req.body);

    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        ...(validated.firstName ? { firstName: validated.firstName } : {}),
        ...(validated.lastName ? { lastName: validated.lastName } : {}),
        ...(validated.phone !== undefined ? { phone: validated.phone } : {})
      },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(200).json({
      success: true,
      data: { user: updated }
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/v1/users/:id
userRouter.get('/:id', authenticateSession, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    // Authorization: User can view self, Admin can view anyone
    if (req.user!.id !== id && req.user!.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Not authorized to view this user profile');
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        veterinarianProfile: {
          select: {
            id: true,
            licenseNumber: true,
            specialization: true,
            experienceYears: true,
            clinicName: true,
            verificationStatus: true
          }
        }
      }
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
});
