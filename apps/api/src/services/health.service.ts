import { prisma } from '../prisma.js';
import {
  CreateHealthRecordInput,
  CreateVaccinationInput,
  CreateMedicationInput
} from '@vetvision/validation';
import { AuthenticatedUser } from '../middleware/auth.middleware.js';
import { UserRole, RecordType, MedicationStatus } from '@vetvision/shared-types';
import { ForbiddenError, NotFoundError } from '../errors.js';
import { logger } from '../logger.js';

export class HealthService {
  private async checkAnimalAccess(animalId: string, user: AuthenticatedUser) {
    const animal = await prisma.animal.findUnique({ where: { id: animalId } });
    if (!animal) {
      throw new NotFoundError('Animal not found');
    }

    if (user.role === UserRole.OWNER && animal.ownerId !== user.id) {
      throw new ForbiddenError('Not authorized to access records for this animal');
    }

    if (user.role === UserRole.VETERINARIAN && animal.ownerId !== user.id) {
      const activeConsultation = await prisma.consultation.findFirst({
        where: { animalId, veterinarianId: user.id }
      });
      if (!activeConsultation) {
        throw new ForbiddenError('Not authorized to access clinical records outside an assigned consultation');
      }
    }

    return animal;
  }

  // --- Health Records ---
  public async listHealthRecords(animalId: string, user: AuthenticatedUser) {
    await this.checkAnimalAccess(animalId, user);
    return prisma.healthRecord.findMany({
      where: { animalId },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: { recordedAt: 'desc' }
    });
  }

  public async createHealthRecord(animalId: string, input: CreateHealthRecordInput, user: AuthenticatedUser) {
    await this.checkAnimalAccess(animalId, user);

    const record = await prisma.healthRecord.create({
      data: {
        animalId,
        recordedBy: user.id,
        recordType: input.recordType as RecordType,
        title: input.title,
        description: input.description,
        diagnosis: input.diagnosis || null,
        treatment: input.treatment || null,
        recordedAt: input.recordedAt || new Date()
      },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } }
    });

    logger.event('HEALTH_RECORD_CREATED', { animalId, recordId: record.id, recordedBy: user.id });
    return record;
  }

  // --- Vaccinations ---
  public async listVaccinations(animalId: string, user: AuthenticatedUser) {
    await this.checkAnimalAccess(animalId, user);
    return prisma.vaccination.findMany({
      where: { animalId },
      include: { veterinarian: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { administeredDate: 'desc' }
    });
  }

  public async createVaccination(animalId: string, input: CreateVaccinationInput, user: AuthenticatedUser) {
    await this.checkAnimalAccess(animalId, user);

    const vaccination = await prisma.vaccination.create({
      data: {
        animalId,
        vaccineName: input.vaccineName,
        administeredDate: input.administeredDate,
        nextDueDate: input.nextDueDate || null,
        dose: input.dose || null,
        veterinarianId: user.role === UserRole.VETERINARIAN ? user.id : input.veterinarianId || null,
        notes: input.notes || null
      },
      include: { veterinarian: { select: { id: true, firstName: true, lastName: true } } }
    });

    logger.event('VACCINATION_RECORDED', { animalId, vaccinationId: vaccination.id });
    return vaccination;
  }

  // --- Medications ---
  public async listMedications(animalId: string, user: AuthenticatedUser) {
    await this.checkAnimalAccess(animalId, user);
    return prisma.medication.findMany({
      where: { animalId },
      include: { prescriber: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { startDate: 'desc' }
    });
  }

  public async createMedication(animalId: string, input: CreateMedicationInput, user: AuthenticatedUser) {
    await this.checkAnimalAccess(animalId, user);

    const medication = await prisma.medication.create({
      data: {
        animalId,
        prescribedBy: user.role === UserRole.VETERINARIAN ? user.id : null,
        name: input.name,
        dosage: input.dosage,
        frequency: input.frequency,
        startDate: input.startDate,
        endDate: input.endDate || null,
        instructions: input.instructions || null,
        status: input.status as MedicationStatus
      },
      include: { prescriber: { select: { id: true, firstName: true, lastName: true } } }
    });

    logger.event('MEDICATION_PRESCRIBED', { animalId, medicationId: medication.id });
    return medication;
  }

  public async updateMedicationStatus(medicationId: string, status: MedicationStatus, user: AuthenticatedUser) {
    const medication = await prisma.medication.findUnique({
      where: { id: medicationId },
      include: { animal: true }
    });

    if (!medication) {
      throw new NotFoundError('Medication not found');
    }

    if (user.role === UserRole.OWNER && medication.animal.ownerId !== user.id) {
      throw new ForbiddenError('Not authorized');
    }

    return prisma.medication.update({
      where: { id: medicationId },
      data: { status }
    });
  }
}

export const healthService = new HealthService();
