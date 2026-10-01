import { prisma } from '../prisma.js';
import { CreateAnimalInput, UpdateAnimalInput } from '@vetvision/validation';
import { AuthenticatedUser } from '../middleware/auth.middleware.js';
import { UserRole, AnimalSpecies, AnimalSex } from '@vetvision/shared-types';
import { ForbiddenError, NotFoundError } from '../errors.js';
import { logger } from '../logger.js';

export class AnimalService {
  public async listAnimals(user: AuthenticatedUser) {
    if (user.role === UserRole.OWNER) {
      return prisma.animal.findMany({
        where: { ownerId: user.id },
        include: {
          profileImage: true,
          _count: {
            select: {
              scans: true,
              healthRecords: true,
              vaccinations: true,
              consultations: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (user.role === UserRole.VETERINARIAN) {
      // Return animals the vet owns PLUS animals involved in their active or past consultations
      return prisma.animal.findMany({
        where: {
          OR: [
            { ownerId: user.id },
            {
              consultations: {
                some: {
                  veterinarianId: user.id
                }
              }
            }
          ]
        },
        include: {
          profileImage: true,
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          _count: {
            select: {
              scans: true,
              healthRecords: true,
              vaccinations: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' }
      });
    }

    // ADMIN sees all animals
    return prisma.animal.findMany({
      include: {
        profileImage: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            scans: true,
            healthRecords: true,
            vaccinations: true,
            consultations: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async getAnimalById(animalId: string, user: AuthenticatedUser) {
    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      include: {
        profileImage: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        healthRecords: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
          include: { author: { select: { firstName: true, lastName: true, role: true } } }
        },
        vaccinations: {
          orderBy: { administeredDate: 'desc' },
          include: { veterinarian: { select: { firstName: true, lastName: true } } }
        },
        medications: {
          orderBy: { startDate: 'desc' },
          include: { prescriber: { select: { firstName: true, lastName: true } } }
        },
        scans: {
          orderBy: { captureTimestamp: 'desc' },
          include: {
            fileAsset: true,
            prediction: true
          }
        },
        consultations: {
          orderBy: { createdAt: 'desc' },
          include: { veterinarian: { select: { firstName: true, lastName: true } } }
        }
      }
    });

    if (!animal) {
      throw new NotFoundError('Animal not found');
    }

    // Authorization check
    if (user.role === UserRole.OWNER && animal.ownerId !== user.id) {
      throw new ForbiddenError('You are not authorized to view this animal profile');
    }

    if (user.role === UserRole.VETERINARIAN && animal.ownerId !== user.id) {
      // Check if vet is assigned to a consultation for this animal
      const hasConsultation = await prisma.consultation.findFirst({
        where: {
          animalId,
          veterinarianId: user.id
        }
      });
      if (!hasConsultation) {
        throw new ForbiddenError('You are not authorized to view animal records outside an assigned consultation');
      }
    }

    return animal;
  }

  public async createAnimal(input: CreateAnimalInput, user: AuthenticatedUser) {
    const animal = await prisma.animal.create({
      data: {
        ownerId: user.id,
        name: input.name,
        species: input.species as AnimalSpecies,
        breed: input.breed || null,
        sex: input.sex as AnimalSex,
        dateOfBirth: input.dateOfBirth || null,
        weight: input.weight || null,
        color: input.color || null,
        identificationNumber: input.identificationNumber || null,
        profileImageId: input.profileImageId || null,
        notes: input.notes || null
      },
      include: { profileImage: true }
    });

    logger.event('ANIMAL_CREATED', { animalId: animal.id, ownerId: user.id, species: animal.species });
    return animal;
  }

  public async updateAnimal(animalId: string, input: UpdateAnimalInput, user: AuthenticatedUser) {
    const existing = await prisma.animal.findUnique({ where: { id: animalId } });
    if (!existing) {
      throw new NotFoundError('Animal not found');
    }

    if (user.role !== UserRole.ADMIN && existing.ownerId !== user.id) {
      throw new ForbiddenError('You are not authorized to edit this animal profile');
    }

    const updated = await prisma.animal.update({
      where: { id: animalId },
      data: {
        name: input.name,
        species: input.species ? (input.species as AnimalSpecies) : undefined,
        breed: input.breed,
        sex: input.sex ? (input.sex as AnimalSex) : undefined,
        dateOfBirth: input.dateOfBirth,
        weight: input.weight,
        color: input.color,
        identificationNumber: input.identificationNumber,
        profileImageId: input.profileImageId,
        notes: input.notes
      },
      include: { profileImage: true }
    });

    logger.event('ANIMAL_UPDATED', { animalId: updated.id, ownerId: existing.ownerId });
    return updated;
  }

  public async deleteAnimal(animalId: string, user: AuthenticatedUser) {
    const existing = await prisma.animal.findUnique({ where: { id: animalId } });
    if (!existing) {
      throw new NotFoundError('Animal not found');
    }

    if (user.role !== UserRole.ADMIN && existing.ownerId !== user.id) {
      throw new ForbiddenError('You are not authorized to delete this animal');
    }

    await prisma.animal.delete({ where: { id: animalId } });
    logger.event('ANIMAL_DELETED', { animalId, deletedBy: user.id });
  }
}

export const animalService = new AnimalService();
