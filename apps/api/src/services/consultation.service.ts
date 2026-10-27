import { prisma } from '../prisma.js';
import { AuthenticatedUser } from '../middleware/auth.middleware.js';
import {
  CreateConsultationInput,
  UpdateConsultationStatusInput,
  CreateConsultationMessageInput,
  CreateClinicalNoteInput,
  UpdateClinicalNoteInput
} from '@vetvision/validation';
import { ConsultationStatus, UserRole, RecordType } from '@vetvision/shared-types';
import { ForbiddenError, NotFoundError, BadRequestError } from '../errors.js';
import { logger } from '../logger.js';

const ALLOWED_TRANSITIONS: Record<ConsultationStatus, ConsultationStatus[]> = {
  [ConsultationStatus.REQUESTED]: [
    ConsultationStatus.ACCEPTED,
    ConsultationStatus.CANCELLED
  ],
  [ConsultationStatus.ACCEPTED]: [
    ConsultationStatus.SCHEDULED,
    ConsultationStatus.IN_PROGRESS,
    ConsultationStatus.CANCELLED
  ],
  [ConsultationStatus.SCHEDULED]: [
    ConsultationStatus.SCHEDULED, // Allowed for rescheduling with new date
    ConsultationStatus.IN_PROGRESS,
    ConsultationStatus.CANCELLED
  ],
  [ConsultationStatus.IN_PROGRESS]: [
    ConsultationStatus.COMPLETED,
    ConsultationStatus.CANCELLED
  ],
  [ConsultationStatus.COMPLETED]: [], // Terminal state
  [ConsultationStatus.CANCELLED]: []  // Terminal state
};

export class ConsultationService {
  /**
   * List consultations visible to the current authenticated user.
   */
  public async listConsultations(user: AuthenticatedUser, status?: ConsultationStatus) {
    if (user.role === UserRole.OWNER) {
      return prisma.consultation.findMany({
        where: {
          ownerId: user.id,
          ...(status ? { status } : {})
        },
        include: {
          animal: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              profileImage: true
            }
          },
          veterinarian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              veterinarianProfile: true
            }
          },
          scan: {
            include: {
              fileAsset: true,
              prediction: true
            }
          },
          _count: {
            select: {
              messages: true,
              clinicalNotes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    if (user.role === UserRole.VETERINARIAN) {
      // Veterinarians see assigned consultations OR unassigned pending intake requests
      return prisma.consultation.findMany({
        where: {
          ...(status
            ? { status }
            : {
                OR: [
                  { veterinarianId: user.id },
                  { status: ConsultationStatus.REQUESTED, veterinarianId: null }
                ]
              })
        },
        include: {
          animal: {
            select: {
              id: true,
              name: true,
              species: true,
              breed: true,
              identificationNumber: true,
              profileImage: true
            }
          },
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true
            }
          },
          veterinarian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phone: true,
              email: true,
              veterinarianProfile: true
            }
          },
          scan: {
            include: {
              fileAsset: true,
              prediction: true
            }
          },
          _count: {
            select: {
              messages: true,
              clinicalNotes: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    // ADMIN
    return prisma.consultation.findMany({
      where: status ? { status } : undefined,
      include: {
        animal: {
          select: {
            id: true,
            name: true,
            species: true,
            breed: true
          }
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        veterinarian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        scan: {
          include: {
            fileAsset: true,
            prediction: true
          }
        },
        _count: {
          select: {
            messages: true,
            clinicalNotes: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Retrieve a single consultation with all linked details, enforcing owner/vet privacy.
   */
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
        scan: {
          include: {
            fileAsset: true,
            prediction: {
              include: {
                modelVersion: true
              }
            }
          }
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        veterinarian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            veterinarianProfile: true
          }
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                role: true
              }
            },
            attachment: true
          },
          orderBy: { createdAt: 'asc' }
        },
        clinicalNotes: {
          where:
            user.role === UserRole.OWNER
              ? { isOwnerVisible: true }
              : undefined,
          include: {
            veterinarian: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!consultation) {
      throw new NotFoundError('Consultation not found');
    }

    // Role-based access control
    if (user.role === UserRole.OWNER && consultation.ownerId !== user.id) {
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

  /**
   * Request a new consultation. Validates animal ownership and scan linkage.
   */
  public async requestConsultation(input: CreateConsultationInput, user: AuthenticatedUser) {
    const animal = await prisma.animal.findUnique({ where: { id: input.animalId } });
    if (!animal) {
      throw new NotFoundError('Animal not found');
    }

    if (user.role === UserRole.OWNER && animal.ownerId !== user.id) {
      throw new ForbiddenError('You can only request consultations for your own animals');
    }

    // If scanId is provided, verify it belongs to this animal
    if (input.scanId) {
      const scan = await prisma.scan.findUnique({ where: { id: input.scanId } });
      if (!scan) {
        throw new NotFoundError('Referenced scan not found');
      }
      if (scan.animalId !== input.animalId) {
        throw new BadRequestError('Referenced scan does not belong to the selected animal');
      }
    }

    // If veterinarianId is specified, verify veterinarian exists
    if (input.veterinarianId) {
      const vet = await prisma.user.findUnique({ where: { id: input.veterinarianId } });
      if (!vet || vet.role !== UserRole.VETERINARIAN) {
        throw new BadRequestError('Specified veterinarian does not exist or is not a veterinarian');
      }
    }

    const consultation = await prisma.$transaction(async (tx) => {
      const created = await tx.consultation.create({
        data: {
          animalId: input.animalId,
          scanId: input.scanId || null,
          ownerId: user.id,
          veterinarianId: input.veterinarianId || null,
          subject: input.subject,
          description: input.description,
          status: ConsultationStatus.REQUESTED,
          scheduledAt: input.scheduledAt || null
        },
        include: {
          animal: true,
          scan: {
            include: { fileAsset: true, prediction: true }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'CONSULTATION_REQUESTED',
          resourceType: 'Consultation',
          resourceId: created.id,
          metadata: {
            animalId: input.animalId,
            scanId: input.scanId || null,
            veterinarianId: input.veterinarianId || null,
            subject: input.subject
          }
        }
      });

      return created;
    });

    logger.event('CONSULTATION_REQUESTED', {
      consultationId: consultation.id,
      animalId: input.animalId,
      scanId: input.scanId || null,
      ownerId: user.id
    });

    return consultation;
  }

  /**
   * Validate and transition consultation status.
   */
  public async updateStatus(
    consultationId: string,
    input: UpdateConsultationStatusInput,
    user: AuthenticatedUser
  ) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId }
    });

    if (!consultation) {
      throw new NotFoundError('Consultation not found');
    }

    const currentStatus = consultation.status;
    const targetStatus = input.status;

    // Terminal state protection: cannot transition out of COMPLETED or CANCELLED
    if (
      currentStatus === ConsultationStatus.COMPLETED ||
      currentStatus === ConsultationStatus.CANCELLED
    ) {
      throw new BadRequestError(
        `Cannot modify status of a ${currentStatus.toLowerCase()} consultation. Consultation is finalized.`
      );
    }

    // Idempotent handling for same status
    if (currentStatus === targetStatus) {
      if (targetStatus === ConsultationStatus.SCHEDULED && input.scheduledAt) {
        // Rescheduling in SCHEDULED state
        const updated = await prisma.$transaction(async (tx) => {
          const res = await tx.consultation.update({
            where: { id: consultationId },
            data: { scheduledAt: new Date(input.scheduledAt!) }
          });
          await tx.auditLog.create({
            data: {
              actorId: user.id,
              action: 'CONSULTATION_RESCHEDULED',
              resourceType: 'Consultation',
              resourceId: consultationId,
              metadata: { newScheduledAt: input.scheduledAt }
            }
          });
          return res;
        });
        return updated;
      }
      return consultation;
    }

    // State machine check
    const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(targetStatus)) {
      throw new BadRequestError(
        `Invalid lifecycle transition from ${currentStatus} to ${targetStatus}. Allowed transitions: ${allowedTargets.join(', ') || 'None'}`
      );
    }

    // Role and permission validations per target state
    if (targetStatus === ConsultationStatus.ACCEPTED) {
      if (user.role !== UserRole.VETERINARIAN && user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only a veterinarian or admin can accept a consultation request');
      }

      return prisma.$transaction(async (tx) => {
        const updated = await tx.consultation.update({
          where: { id: consultationId },
          data: {
            status: ConsultationStatus.ACCEPTED,
            veterinarianId: consultation.veterinarianId || user.id
          }
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'CONSULTATION_ACCEPTED',
            resourceType: 'Consultation',
            resourceId: consultationId,
            metadata: {
              assignedVeterinarianId: updated.veterinarianId
            }
          }
        });

        await tx.consultationMessage.create({
          data: {
            consultationId,
            senderId: user.id,
            message: `Consultation request has been accepted by ${user.firstName} ${user.lastName}.`
          }
        });

        return updated;
      });
    }

    if (targetStatus === ConsultationStatus.SCHEDULED) {
      if (user.role !== UserRole.VETERINARIAN && user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only a veterinarian or admin can schedule a consultation');
      }
      if (user.role === UserRole.VETERINARIAN && consultation.veterinarianId !== user.id) {
        throw new ForbiddenError('You can only schedule consultations assigned to you');
      }
      if (!input.scheduledAt) {
        throw new BadRequestError('scheduledAt timestamp is required when scheduling a consultation');
      }

      const scheduledDate = new Date(input.scheduledAt);

      return prisma.$transaction(async (tx) => {
        const updated = await tx.consultation.update({
          where: { id: consultationId },
          data: {
            status: ConsultationStatus.SCHEDULED,
            scheduledAt: scheduledDate
          }
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'CONSULTATION_SCHEDULED',
            resourceType: 'Consultation',
            resourceId: consultationId,
            metadata: { scheduledAt: scheduledDate.toISOString() }
          }
        });

        await tx.consultationMessage.create({
          data: {
            consultationId,
            senderId: user.id,
            message: `Consultation scheduled for ${scheduledDate.toLocaleString()}.`
          }
        });

        return updated;
      });
    }

    if (targetStatus === ConsultationStatus.IN_PROGRESS) {
      if (user.role !== UserRole.VETERINARIAN && user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only a veterinarian or admin can start a consultation');
      }
      if (user.role === UserRole.VETERINARIAN && consultation.veterinarianId !== user.id) {
        throw new ForbiddenError('You can only start consultations assigned to you');
      }

      return prisma.$transaction(async (tx) => {
        const updated = await tx.consultation.update({
          where: { id: consultationId },
          data: {
            status: ConsultationStatus.IN_PROGRESS,
            startedAt: consultation.startedAt || new Date()
          }
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'CONSULTATION_STARTED',
            resourceType: 'Consultation',
            resourceId: consultationId,
            metadata: { startedAt: updated.startedAt }
          }
        });

        await tx.consultationMessage.create({
          data: {
            consultationId,
            senderId: user.id,
            message: 'Consultation is now IN_PROGRESS. Clinical evaluation active.'
          }
        });

        return updated;
      });
    }

    if (targetStatus === ConsultationStatus.COMPLETED) {
      if (user.role !== UserRole.VETERINARIAN && user.role !== UserRole.ADMIN) {
        throw new ForbiddenError('Only the attending veterinarian or admin can complete a consultation');
      }
      if (user.role === UserRole.VETERINARIAN && consultation.veterinarianId !== user.id) {
        throw new ForbiddenError('You can only complete consultations assigned to you');
      }

      // Mandatory Guard: Cannot complete consultation without clinical documentation
      const noteCount = await prisma.clinicalNote.count({
        where: { consultationId }
      });

      if (noteCount === 0) {
        throw new BadRequestError(
          'Consultation cannot be marked COMPLETED without required clinical documentation (at least one clinical note authored by veterinarian)'
        );
      }

      return prisma.$transaction(async (tx) => {
        const updated = await tx.consultation.update({
          where: { id: consultationId },
          data: {
            status: ConsultationStatus.COMPLETED,
            completedAt: new Date()
          }
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'CONSULTATION_COMPLETED',
            resourceType: 'Consultation',
            resourceId: consultationId,
            metadata: {
              completedAt: updated.completedAt,
              clinicalNotesCount: noteCount
            }
          }
        });

        await tx.consultationMessage.create({
          data: {
            consultationId,
            senderId: user.id,
            message: 'Consultation has been completed and clinical documentation is finalized.'
          }
        });

        return updated;
      });
    }

    if (targetStatus === ConsultationStatus.CANCELLED) {
      // Owner can cancel if status is REQUESTED, ACCEPTED, or SCHEDULED (cannot cancel IN_PROGRESS)
      if (user.role === UserRole.OWNER) {
        if (consultation.ownerId !== user.id) {
          throw new ForbiddenError('You can only cancel your own consultations');
        }
        if (currentStatus === ConsultationStatus.IN_PROGRESS) {
          throw new BadRequestError(
            'Cannot cancel an in-progress consultation; please consult directly with your attending veterinarian.'
          );
        }
      } else if (user.role === UserRole.VETERINARIAN) {
        // Vet can decline pending REQUESTED consultation or cancel assigned consultation
        if (
          consultation.status !== ConsultationStatus.REQUESTED &&
          consultation.veterinarianId !== user.id
        ) {
          throw new ForbiddenError('Not authorized to cancel this consultation');
        }
      }

      const declineReason = input.declineReason || null;

      return prisma.$transaction(async (tx) => {
        const updated = await tx.consultation.update({
          where: { id: consultationId },
          data: {
            status: ConsultationStatus.CANCELLED,
            declineReason
          }
        });

        await tx.auditLog.create({
          data: {
            actorId: user.id,
            action: 'CONSULTATION_CANCELLED',
            resourceType: 'Consultation',
            resourceId: consultationId,
            metadata: {
              cancelledByRole: user.role,
              declineReason
            }
          }
        });

        await tx.consultationMessage.create({
          data: {
            consultationId,
            senderId: user.id,
            message: `Consultation cancelled.${declineReason ? ` Reason: ${declineReason}` : ''}`
          }
        });

        return updated;
      });
    }

    throw new BadRequestError(`Unhandled status transition: ${targetStatus}`);
  }

  /**
   * Send a persistent consultation message.
   */
  public async sendMessage(
    consultationId: string,
    input: CreateConsultationMessageInput,
    user: AuthenticatedUser
  ) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId }
    });

    if (!consultation) {
      throw new NotFoundError('Consultation not found');
    }

    // Access check
    if (
      consultation.ownerId !== user.id &&
      consultation.veterinarianId !== user.id &&
      user.role !== UserRole.ADMIN
    ) {
      if (user.role === UserRole.VETERINARIAN && consultation.status === ConsultationStatus.REQUESTED) {
        // Allowed for intake questions
      } else {
        throw new ForbiddenError('Not authorized to send messages in this consultation');
      }
    }

    if (consultation.status === ConsultationStatus.CANCELLED) {
      throw new BadRequestError('Cannot send messages in a cancelled consultation');
    }

    const message = await prisma.consultationMessage.create({
      data: {
        consultationId,
        senderId: user.id,
        message: input.message,
        attachmentId: input.attachmentId || null
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
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

  /**
   * Retrieve clinical notes for a consultation, enforcing owner visibility isolation.
   */
  public async getClinicalNotes(consultationId: string, user: AuthenticatedUser) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId }
    });

    if (!consultation) {
      throw new NotFoundError('Consultation not found');
    }

    if (user.role === UserRole.OWNER && consultation.ownerId !== user.id) {
      throw new ForbiddenError('Not authorized to view clinical notes for this consultation');
    }

    if (
      user.role === UserRole.VETERINARIAN &&
      consultation.veterinarianId !== user.id &&
      consultation.status !== ConsultationStatus.REQUESTED
    ) {
      throw new ForbiddenError('Not authorized to view clinical notes for this consultation');
    }

    return prisma.clinicalNote.findMany({
      where: {
        consultationId,
        ...(user.role === UserRole.OWNER ? { isOwnerVisible: true } : {})
      },
      include: {
        veterinarian: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            veterinarianProfile: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  /**
   * Create a structured clinical note authored by an authorized veterinarian.
   */
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
      throw new ForbiddenError('Only a licensed veterinarian or admin can author clinical notes');
    }

    if (
      user.role === UserRole.VETERINARIAN &&
      consultation.veterinarianId !== user.id
    ) {
      throw new ForbiddenError('You are not assigned as the veterinarian for this consultation');
    }

    if (consultation.status === ConsultationStatus.CANCELLED) {
      throw new BadRequestError('Cannot author clinical notes for a cancelled consultation');
    }

    if (consultation.status === ConsultationStatus.COMPLETED) {
      throw new BadRequestError(
        'Cannot author new clinical notes after consultation is completed. Medical record is finalized.'
      );
    }

    return prisma.$transaction(async (tx) => {
      // 1. Create the persistent structured clinical note
      const clinicalNote = await tx.clinicalNote.create({
        data: {
          consultationId,
          veterinarianId: user.id,
          presentingConcern: input.presentingConcern,
          historyObservations: input.historyObservations || null,
          examinationFindings: input.examinationFindings,
          assessment: input.assessment,
          recommendations: input.recommendations,
          followUpDate: input.followUpDate ? new Date(input.followUpDate) : null,
          followUpInstructions: input.followUpInstructions || null,
          isOwnerVisible: input.isOwnerVisible ?? true
        },
        include: {
          veterinarian: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          }
        }
      });

      // 2. Automatically link a health record on animal profile
      await tx.healthRecord.create({
        data: {
          animalId: consultation.animalId,
          recordedBy: user.id,
          recordType: RecordType.FOLLOW_UP,
          title: `Clinical Note: ${consultation.subject}`,
          description: input.assessment,
          diagnosis: input.assessment,
          treatment: input.recommendations,
          recordedAt: new Date()
        }
      });

      // 3. Notify consultation thread if note is visible to owner
      if (clinicalNote.isOwnerVisible) {
        await tx.consultationMessage.create({
          data: {
            consultationId,
            senderId: user.id,
            message: `[Clinical Note Recorded by Dr. ${user.lastName}]:\n\n` +
              `Assessment: ${input.assessment}\n` +
              `Recommendations: ${input.recommendations}` +
              (input.followUpInstructions ? `\nFollow-Up: ${input.followUpInstructions}` : '')
          }
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'CLINICAL_NOTE_CREATED',
          resourceType: 'ClinicalNote',
          resourceId: clinicalNote.id,
          metadata: {
            consultationId,
            isOwnerVisible: clinicalNote.isOwnerVisible
          }
        }
      });

      return clinicalNote;
    });
  }

  /**
   * Update an existing clinical note before consultation completion.
   */
  public async updateClinicalNote(
    consultationId: string,
    noteId: string,
    input: UpdateClinicalNoteInput,
    user: AuthenticatedUser
  ) {
    const consultation = await prisma.consultation.findUnique({
      where: { id: consultationId }
    });

    if (!consultation) {
      throw new NotFoundError('Consultation not found');
    }

    if (consultation.status === ConsultationStatus.COMPLETED) {
      throw new BadRequestError(
        'Cannot modify clinical records of a completed consultation. Medical record audit integrity is protected.'
      );
    }

    const note = await prisma.clinicalNote.findUnique({
      where: { id: noteId }
    });

    if (!note || note.consultationId !== consultationId) {
      throw new NotFoundError('Clinical note not found');
    }

    if (user.role === UserRole.VETERINARIAN && note.veterinarianId !== user.id) {
      throw new ForbiddenError('You can only edit clinical notes authored by yourself');
    }

    return prisma.$transaction(async (tx) => {
      const updated = await tx.clinicalNote.update({
        where: { id: noteId },
        data: {
          ...(input.presentingConcern !== undefined ? { presentingConcern: input.presentingConcern } : {}),
          ...(input.historyObservations !== undefined ? { historyObservations: input.historyObservations } : {}),
          ...(input.examinationFindings !== undefined ? { examinationFindings: input.examinationFindings } : {}),
          ...(input.assessment !== undefined ? { assessment: input.assessment } : {}),
          ...(input.recommendations !== undefined ? { recommendations: input.recommendations } : {}),
          ...(input.followUpDate !== undefined
            ? { followUpDate: input.followUpDate ? new Date(input.followUpDate) : null }
            : {}),
          ...(input.followUpInstructions !== undefined ? { followUpInstructions: input.followUpInstructions } : {}),
          ...(input.isOwnerVisible !== undefined ? { isOwnerVisible: input.isOwnerVisible } : {})
        },
        include: {
          veterinarian: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: 'CLINICAL_NOTE_UPDATED',
          resourceType: 'ClinicalNote',
          resourceId: noteId,
          metadata: {
            consultationId,
            modifiedFields: Object.keys(input)
          }
        }
      });

      return updated;
    });
  }
}

export const consultationService = new ConsultationService();
