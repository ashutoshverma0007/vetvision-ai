import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../../apps/api/src/app.js';
import { prisma } from '../../apps/api/src/prisma.js';
import {
  UserRole,
  AnimalSpecies,
  AnimalSex,
  ScanStatus,
  PredictionStatus,
  PredictedClass,
  RecordType,
  MedicationStatus
} from '@vetvision/shared-types';

describe('Integration: Longitudinal Health Tracking & Multi-Role Timeline Flow', () => {
  const app = createApp();

  let ownerUser: any;
  let otherOwnerUser: any;
  let vetUser: any;
  let unassignedVetUser: any;

  let ownerCookie: string;
  let otherOwnerCookie: string;
  let vetCookie: string;
  let unassignedVetCookie: string;

  let testAnimal: any;

  async function createSessionCookie(user: any): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString('hex');
    const sessionTokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.session.create({
      data: {
        userId: user.id,
        sessionTokenHash,
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000)
      }
    });

    return `vetvision_session=${rawToken}`;
  }

  beforeAll(async () => {
    const uniqueSuffix = Date.now().toString();

    // 1. Create Test Users
    ownerUser = await prisma.user.create({
      data: {
        email: `timeline_owner_${uniqueSuffix}@vetvision.ai`,
        passwordHash: 'test_hash',
        firstName: 'Robert',
        lastName: 'Herdsman',
        role: UserRole.OWNER
      }
    });
    ownerCookie = await createSessionCookie(ownerUser);

    otherOwnerUser = await prisma.user.create({
      data: {
        email: `timeline_other_${uniqueSuffix}@vetvision.ai`,
        passwordHash: 'test_hash',
        firstName: 'Other',
        lastName: 'Owner',
        role: UserRole.OWNER
      }
    });
    otherOwnerCookie = await createSessionCookie(otherOwnerUser);

    vetUser = await prisma.user.create({
      data: {
        email: `timeline_vet_${uniqueSuffix}@vetvision.ai`,
        passwordHash: 'test_hash',
        firstName: 'Dr. Emily',
        lastName: 'Stone',
        role: UserRole.VETERINARIAN
      }
    });
    vetCookie = await createSessionCookie(vetUser);

    unassignedVetUser = await prisma.user.create({
      data: {
        email: `timeline_unassigned_${uniqueSuffix}@vetvision.ai`,
        passwordHash: 'test_hash',
        firstName: 'Dr. James',
        lastName: 'Unassigned',
        role: UserRole.VETERINARIAN
      }
    });
    unassignedVetCookie = await createSessionCookie(unassignedVetUser);

    // 2. Create Animal under Owner
    testAnimal = await prisma.animal.create({
      data: {
        ownerId: ownerUser.id,
        name: 'Thunder',
        species: AnimalSpecies.CATTLE,
        breed: 'Holstein-Friesian',
        sex: AnimalSex.MALE,
        dateOfBirth: new Date('2023-04-10'),
        weight: 620.5,
        identificationNumber: `EAR-${uniqueSuffix.slice(-6)}`
      }
    });

    // 3. Populate Complete Longitudinal History
    // A) Health Record
    await prisma.healthRecord.create({
      data: {
        animalId: testAnimal.id,
        recordedBy: ownerUser.id,
        recordType: RecordType.GENERAL_CHECKUP,
        title: 'Routine Spring Herd Assessment',
        description: 'Bovine in prime condition, normal grazing appetite, clear muzzle.',
        recordedAt: new Date('2026-05-15T09:00:00Z')
      }
    });

    // B) Vaccination
    await prisma.vaccination.create({
      data: {
        animalId: testAnimal.id,
        veterinarianId: vetUser.id,
        vaccineName: 'Bovilis LSD Neo',
        dose: '2.0 mL subcutaneous',
        administeredDate: new Date('2026-06-01T11:00:00Z'),
        nextDueDate: new Date('2027-06-01T11:00:00Z'),
        notes: 'Annual homologous live attenuated vaccine booster.'
      }
    });

    // C) Active Medication
    await prisma.medication.create({
      data: {
        animalId: testAnimal.id,
        prescribedBy: vetUser.id,
        name: 'Oxytetracycline 200mg/mL',
        dosage: '10mg/kg',
        frequency: 'Single IM injection',
        status: MedicationStatus.ACTIVE,
        startDate: new Date('2026-07-10T08:00:00Z'),
        instructions: 'Meat withdrawal period: 28 days.'
      }
    });

    // D) Storage File Asset and Scan with AI Prediction
    const testFileAsset = await prisma.fileAsset.create({
      data: {
        ownerId: ownerUser.id,
        originalFilename: 'flank_lesion.jpg',
        storageKey: `scans/test_${uniqueSuffix}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 154200,
        checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
      }
    });

    const scan = await prisma.scan.create({
      data: {
        animalId: testAnimal.id,
        uploadedBy: ownerUser.id,
        fileAssetId: testFileAsset.id,
        bodyPart: 'Left Flank / Torso',
        status: ScanStatus.COMPLETED,
        captureTimestamp: new Date('2026-07-20T14:30:00Z')
      }
    });

    await prisma.prediction.create({
      data: {
        scanId: scan.id,
        status: PredictionStatus.AVAILABLE,
        predictedClass: PredictedClass.MILD,
        confidence: 0.842,
        normalProbability: 0.081,
        mildProbability: 0.842,
        severeProbability: 0.077,
        inferenceTimeMs: 12.4,
        deviceType: 'cpu'
      }
    });

    // E) Consultation linked to this animal and assigned to vetUser
    await prisma.consultation.create({
      data: {
        animalId: testAnimal.id,
        ownerId: ownerUser.id,
        veterinarianId: vetUser.id,
        subject: 'Cutaneous Nodule Clinical Evaluation',
        description: 'Review of left flank scan and preventative protocol recommendation.',
        status: 'IN_PROGRESS'
      }
    });
  });

  describe('Longitudinal Timeline Retrieval & Data Integrity', () => {
    it('retrieves comprehensive chronological timeline for animal owner with all 5 entity types', async () => {
      const res = await request(app)
        .get(`/api/v1/animals/${testAnimal.id}/timeline`)
        .set('Cookie', ownerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const { animal, stats, events } = res.body.data;

      // Check animal basic profile
      expect(animal.name).toBe('Thunder');
      expect(animal.species).toBe(AnimalSpecies.CATTLE);
      expect(animal.weight).toBe(620.5);

      // Check statistics aggregation
      expect(stats.totalScans).toBe(1);
      expect(stats.mildScans).toBe(1);
      expect(stats.normalScans).toBe(0);
      expect(stats.severeScans).toBe(0);
      expect(stats.activeMedications).toBe(1);
      expect(stats.lastScreeningDate).toBeDefined();

      // Check chronological events count
      expect(events.length).toBe(5);

      // Verify each expected entity type exists in timeline
      const eventTypes = events.map((e: any) => e.type);
      expect(eventTypes).toContain('SCAN');
      expect(eventTypes).toContain('HEALTH_RECORD');
      expect(eventTypes).toContain('VACCINATION');
      expect(eventTypes).toContain('MEDICATION');
      expect(eventTypes).toContain('CONSULTATION');

      // Verify descending chronological order
      for (let i = 0; i < events.length - 1; i++) {
        const currentDate = new Date(events[i].date).getTime();
        const nextDate = new Date(events[i + 1].date).getTime();
        expect(currentDate).toBeGreaterThanOrEqual(nextDate);
      }
    });

    it('assigned veterinarian in active consultation can access animal clinical timeline', async () => {
      const res = await request(app)
        .get(`/api/v1/animals/${testAnimal.id}/timeline`)
        .set('Cookie', vetCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.events.length).toBe(5);
    });
  });

  describe('Authorization & Multi-Tenant Privacy Isolation', () => {
    it('rejects timeline access when requested by an unrelated owner (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get(`/api/v1/animals/${testAnimal.id}/timeline`)
        .set('Cookie', otherOwnerCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects timeline access for unassigned veterinarian without consultation relation (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .get(`/api/v1/animals/${testAnimal.id}/timeline`)
        .set('Cookie', unassignedVetCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects timeline access when unauthenticated (401 UNAUTHORIZED)', async () => {
      const res = await request(app).get(`/api/v1/animals/${testAnimal.id}/timeline`);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });
});
