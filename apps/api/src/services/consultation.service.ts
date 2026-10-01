import { prisma } from '../prisma.js';
import { AuthenticatedUser } from '../middleware/auth.middleware.js';
import {
  CreateConsultationInput,
  CreateConsultationMessageInput,
  CreateClinicalNoteInput
} from '@vetvision/validation';
import { ConsultationStatus, UserRole, RecordType } from '@vetvision/shared-types';
import { ForbiddenError, NotFoundError, BadRequestError } from '../errors.js';
import { logger } from '../logger.js';

export class ConsultationService {
  public async listConsultations(user: AuthenticatedUser) {
    if (user.role === UserRole.OWNER) {
      return prisma.consultation.findMany({
        where: { ownerId: user.id },
        include: {
          animal: { select: { id: true, name: true, species: true, breed: true } },
          veterinarian: { select: { id: true, firstName: true, lastName: true, phone: true } },
          _count: { select: { messages: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (user.role === UserRole.VETERINARIAN) {
      // Vets see consultations assigned to them OR unassigned requests waiting for acceptance
      return prisma.consultation.findMany({
        where: {
          OR: [
            { veterinarianId: user.id },
            { status: ConsultationStatus.REQUESTED, veterinarianId: null }
          ]
        },
        include: {
          animal: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              identificationNumber: true
            }
          },
          owner: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
          _count: { select: { messages: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // ADMIN
    return prisma.consultation.findMany({
      include: {
        animal: { select: { id: true, name: true, species: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
        veterinarian: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { messages: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  public async getConsultationById(id: string, user: AuthenticatedUser) {
    const consultation = await prisma.consultation.findUnique({
      where: { id },
      include: {
        animal: {
          include: {
            profileImage: true,
            scans: {
              include: { fileAsset: true, prediction: true },
              orderBy: { captureTimestamp: 'desc' },
              take: 5
            }
          }
        },
        owner: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        veterinarian: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        messages: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, role: true } },
            attachment: true
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!consultation) {
      throw new NotFoundError('Consultation not found');
    }

    // Access check
    if (
      user.role === UserRole.OWNER &&
      consultation.ownerId !== user.id
    ) {
      throw new ForbiddenError('Not authorized to access this consultation');
    }

    if (
      user.role === UserRole.VETERINARIAN &&
      consultation.veterinarianId !== user.id &&
      consultation.status !== ConsultationStatus.REQUESTED
    ) {
      throw new ForbiddenError('Not authorized to access this consultation');
    }

    return consultation;
  }

  public async requestConsultation(input: CreateConsultationInput, user: AuthenticatedUser) {
    // Verify animal ownership
    const animal = await prisma.animal.findUnique({ where: { id: input.animalId } });
    if (!animal) {
      throw new NotFoundError('Animal not found');
    }

    if (user.role === UserRole.OWNER && animal.ownerId !== user.id) {
      throw new ForbiddenError('You can only request consultations for your own animals');
    }

    const consultation = await prisma.consultation.create({
      data: {
        animalId: input.animalId,
        ownerId: user.id,
        veterinarianId: input.veterinarianId || null,
        subject: input.subject,
        description: input.description,
        status: ConsultationStatus.REQUESTED,
        scheduledAt: input.scheduledAt || null
      },
      include: {
        animal: true
      }
    });

    logger.event('CONSULTATION_REQUESTED', {
      consultationId: consultation.id,
      animalId: input.animalId,
      ownerId: user.id
    });

    return consultation;
  }

  public async updateStatus(
    consultationId: string,
    status: ConsultationStatus,
    user: AuthenticatedUser,
    scheduledAt?: Date
  ) {
    const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });
    if (!consultation) {
      throw new NotFoundError('Consultation not found');
    }

    // Veterinarian acceptance logic
    if (status === ConsultationStatus.ACCEPTED) {
      if (user.role !== UserRole.VETERINARIAN && user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only a veterinarian can accept a consultation request');
      }

      return prisma.consultation.update({
        where: { id: consultationId },
        data: {
          status: ConsultationStatus.ACCEPTED,
          veterinarianId: user.id,
          startedAt: consultation.startedAt || new Date()
        }
      });
    }

    // Complete consultation
    if (status === ConsultationStatus.COMPLETED) {
      if (user.role !== UserRole.VETERINARIAN && user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only the attending veterinarian can complete a consultation');
      }

      const updated = await prisma.consultation.update({
        where: { id: consultationId },
        data: {
          status: ConsultationStatus.COMPLETED,
          completedAt: new Date()
        }
      });

      logger.event('CONSULTATION_COMPLETED', { consultationId, vetId: user.id });
      return updated;
    }

    // Cancel consultation
    if (status === ConsultationStatus.CANCELLED) {
      if (consultation.ownerId !== user.id && consultation.veterinarianId !== user.id && user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Not authorized to cancel this consultation');
      }

      return prisma.consultation.update({
        where: { id: consultationId },
        data: { status: ConsultationStatus.CANCELLED }
      });
    }

    // Schedule consultation
    return prisma.consultation.update({
      where: { id: consultationId },
      data: {
        status,
        scheduledAt: scheduledAt || consultation.scheduledAt
      }
    });
  }

  public async sendMessage(
    consultationId: string,
    input: CreateConsultationMessageInput,
    user: AuthenticatedUser
  ) {
    const consultation = await prisma.consultation.findUnique({ where: { id: consultationId } });
    if (!consultation) {
      throw new NotFoundError('Consultation not found');
    }

    if (consultation.ownerId !== user.id && consultation.veterinarianId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Not authorized to send messages in this consultation');
    }

    const message = await prisma.consultationMessage.create({
      data: {
        consultationId,
        senderId: user.id,
        message: input.message,
        attachmentId: input.attachmentId || null
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, role: true } },
        attachment: true
      }
    });

    logger.event('CONSULTATION_MESSAGE', {
      consultationId,
      senderId: user.id,
      messageId: message.id
    });

    return message;
  }

  public async createClinicalNote(
    consultationId: string,
    input: CreateClinicalNoteInput,
    user: AuthenticatedUser
  ) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { animal: true }
    });

    if (!consultation) {
      throw new NotFoundError('Consultation not found');
    }

    if (user.role !== UserRole.VETERINARIAN && user.role !== UserRole.ADMIN) {
      throw new ForbiddenError('Only a licensed veterinarian can author clinical notes');
    }

    if (consultation.veterinarianId !== user.id && user.role !== UserRole.ADMIN) {
      throw new ForbiddenError('You are not assigned as the veterinarian for this consultation');
    }

    // Automatically create a linked HealthRecord on the animal
    const healthRecord = await prisma.healthRecord.create({
      data: {
        animalId: consultation.animalId,
        recordedBy: user.id,
        recordType: RecordType.FOLLOW_UP,
        title: `Clinical Consultation Note: ${consultation.subject}`,
        description: input.notes || 'Veterinary clinical evaluation performed via consultation review.',
        diagnosis: input.diagnosis,
        treatment: input.treatment,
        recordedAt: new Date()
      },
      include: {
        author: { select: { firstName: true, lastName: true, role: true } }
      }
    });

    // Send a message notifying owner of clinical findings
    await prisma.consultationMessage.create({
      data: {
        consultationId,
        senderId: user.id,
        message: `📋 Clinical Note Recorded:\n\nDiagnosis: ${input.diagnosis}\nTreatment Plan: ${input.treatment}${
          input.notes ? `\nAdditional Notes: ${input.notes}` : ''
        }`
      }
    });

    return healthRecord;
  }
}

export const consultationService = new ConsultationService();
