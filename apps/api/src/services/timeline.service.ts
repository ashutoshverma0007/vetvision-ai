import { prisma } from '../prisma.js';
import { AuthenticatedUser } from '../middleware/auth.middleware.js';
import { UserRole, TimelineEvent, PredictedClass } from '@vetvision/shared-types';
import { ForbiddenError, NotFoundError } from '../errors.js';

export class TimelineService {
  public async getAnimalTimeline(animalId: string, user: AuthenticatedUser) {
    const animal = await prisma.animal.findUnique({
      where: { id: animalId },
      include: {
        scans: {
          include: { fileAsset: true, prediction: { include: { modelVersion: true } } },
          orderBy: { captureTimestamp: 'desc' }
        },
        healthRecords: {
          include: { author: { select: { firstName: true, lastName: true, role: true } } },
          orderBy: { recordedAt: 'desc' }
        },
        vaccinations: {
          include: { veterinarian: { select: { firstName: true, lastName: true } } },
          orderBy: { administeredDate: 'desc' }
        },
        medications: {
          include: { prescriber: { select: { firstName: true, lastName: true } } },
          orderBy: { startDate: 'desc' }
        },
        consultations: {
          include: { veterinarian: { select: { firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!animal) {
      throw new NotFoundError('Animal not found');
    }

    if (user.role === UserRole.OWNER && animal.ownerId !== user.id) {
      throw new ForbiddenError('Not authorized to view timeline for this animal');
    }

    if (user.role === UserRole.VETERINARIAN && animal.ownerId !== user.id) {
      const activeConsultation = await prisma.consultation.findFirst({
        where: { animalId, veterinarianId: user.id }
      });
      if (!activeConsultation) {
        throw new ForbiddenError('Not authorized to view clinical timeline outside an assigned consultation');
      }
    }

    const events: TimelineEvent[] = [];

    // 1. Scans
    for (const scan of animal.scans) {
      let severity: 'NORMAL' | 'MILD' | 'SEVERE' | 'INFO' = 'INFO';
      if (scan.prediction?.predictedClass === PredictedClass.NORMAL) severity = 'NORMAL';
      if (scan.prediction?.predictedClass === PredictedClass.MILD) severity = 'MILD';
      if (scan.prediction?.predictedClass === PredictedClass.SEVERE) severity = 'SEVERE';

      events.push({
        id: `scan-${scan.id}`,
        type: 'SCAN',
        date: scan.captureTimestamp,
        title: `Imaging Scan: ${scan.bodyPart || 'Cutaneous capture'}`,
        description: scan.prediction
          ? `Screening result: ${scan.prediction.predictedClass || scan.prediction.status} (Confidence: ${
              scan.prediction.confidence ? (scan.prediction.confidence * 100).toFixed(1) + '%' : 'N/A'
            })`
          : `Status: ${scan.status}`,
        badge: scan.prediction?.predictedClass || scan.status,
        severity,
        data: scan as any
      });
    }

    // 2. Health Records
    for (const hr of animal.healthRecords) {
      events.push({
        id: `hr-${hr.id}`,
        type: 'HEALTH_RECORD',
        date: hr.recordedAt,
        title: hr.title,
        description: hr.description,
        badge: hr.recordType,
        severity: 'INFO',
        data: hr as any
      });
    }

    // 3. Vaccinations
    for (const vac of animal.vaccinations) {
      events.push({
        id: `vac-${vac.id}`,
        type: 'VACCINATION',
        date: vac.administeredDate,
        title: `Vaccine: ${vac.vaccineName}`,
        description: vac.notes || (vac.nextDueDate ? `Next due: ${new Date(vac.nextDueDate).toLocaleDateString()}` : null),
        badge: vac.dose || 'Administered',
        severity: 'NORMAL',
        data: vac as any
      });
    }

    // 4. Medications
    for (const med of animal.medications) {
      events.push({
        id: `med-${med.id}`,
        type: 'MEDICATION',
        date: med.startDate,
        title: `Rx: ${med.name} (${med.dosage})`,
        description: `${med.frequency}. ${med.instructions || ''}`,
        badge: med.status,
        severity: 'INFO',
        data: med as any
      });
    }

    // 5. Consultations
    for (const con of animal.consultations) {
      events.push({
        id: `con-${con.id}`,
        type: 'CONSULTATION',
        date: con.createdAt,
        title: `Consultation: ${con.subject}`,
        description: con.description,
        badge: con.status,
        severity: 'INFO',
        data: con as any
      });
    }

    // Sort descending chronologically
    events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Summary statistics
    const stats = {
      totalScans: animal.scans.length,
      normalScans: animal.scans.filter((s) => s.prediction?.predictedClass === PredictedClass.NORMAL).length,
      mildScans: animal.scans.filter((s) => s.prediction?.predictedClass === PredictedClass.MILD).length,
      severeScans: animal.scans.filter((s) => s.prediction?.predictedClass === PredictedClass.SEVERE).length,
      activeMedications: animal.medications.filter((m) => m.status === 'ACTIVE').length,
      lastScreeningDate: animal.scans[0]?.captureTimestamp || null
    };

    return {
      animal: {
        id: animal.id,
        name: animal.name,
        species: animal.species,
        breed: animal.breed,
        dateOfBirth: animal.dateOfBirth,
        weight: animal.weight,
        identificationNumber: animal.identificationNumber
      },
      stats,
      events
    };
  }
}

export const timelineService = new TimelineService();
