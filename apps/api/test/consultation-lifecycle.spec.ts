import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { createApp } from '../src/app.js';
import { prisma } from '../src/prisma.js';
import {
  UserRole,
  ConsultationStatus,
  AnimalSpecies,
  AnimalSex,
  RecordType
} from '@vetvision/shared-types';

describe('Phase 8: Veterinary Consultation Lifecycle, Clinical Notes & Messaging', () => {
  const app = createApp();

  // Test Entities
  let ownerUser: any;
  let otherOwnerUser: any;
  let vetUser: any;
  let otherVetUser: any;
  let adminUser: any;

  let ownerCookie: string;
  let otherOwnerCookie: string;
  let vetCookie: string;
  let otherVetCookie: string;
  let adminCookie: string;

  let ownerAnimal: any;
  let otherAnimal: any;
  let testScan: any;
  let otherAnimalScan: any;

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
    // 1. Create unique test users
    const uniqueSuffix = Date.now().toString();

    ownerUser = await prisma.user.create({
      data: {
        email: `owner_${uniqueSuffix}@vetvision.ai`,
        passwordHash: 'argon2_mock_hash',
        firstName: 'Jane',
        lastName: 'Owner',
        role: UserRole.OWNER
      }
    });

    otherOwnerUser = await prisma.user.create({
      data: {
        email: `other_owner_${uniqueSuffix}@vetvision.ai`,
        passwordHash: 'argon2_mock_hash',
        firstName: 'Bob',
        lastName: 'OtherOwner',
        role: UserRole.OWNER
      }
    });

    vetUser = await prisma.user.create({
      data: {
        email: `vet_${uniqueSuffix}@vetvision.ai`,
        passwordHash: 'argon2_mock_hash',
        firstName: 'Marcus',
        lastName: 'Welby',
        role: UserRole.VETERINARIAN
      }
    });

    await prisma.veterinarianProfile.create({
      data: {
        userId: vetUser.id,
        licenseNumber: `VET-${uniqueSuffix}`,
        specialization: 'Dermatology & Oncology',
        experienceYears: 10
      }
    });

    otherVetUser = await prisma.user.create({
      data: {
        email: `othervet_${uniqueSuffix}@vetvision.ai`,
        passwordHash: 'argon2_mock_hash',
        firstName: 'Sarah',
        lastName: 'Connor',
        role: UserRole.VETERINARIAN
      }
    });

    await prisma.veterinarianProfile.create({
      data: {
        userId: otherVetUser.id,
        licenseNumber: `VET2-${uniqueSuffix}`,
        specialization: 'General Surgery',
        experienceYears: 6
      }
    });

    adminUser = await prisma.user.create({
      data: {
        email: `admin_${uniqueSuffix}@vetvision.ai`,
        passwordHash: 'argon2_mock_hash',
        firstName: 'System',
        lastName: 'Admin',
        role: UserRole.ADMIN
      }
    });

    // 2. Mint sessions
    ownerCookie = await createSessionCookie(ownerUser);
    otherOwnerCookie = await createSessionCookie(otherOwnerUser);
    vetCookie = await createSessionCookie(vetUser);
    otherVetCookie = await createSessionCookie(otherVetUser);
    adminCookie = await createSessionCookie(adminUser);

    // 3. Create test animals
    ownerAnimal = await prisma.animal.create({
      data: {
        ownerId: ownerUser.id,
        name: 'Daisy',
        species: AnimalSpecies.BOVINE,
        breed: 'Holstein Friesian',
        sex: AnimalSex.FEMALE
      }
    });

    otherAnimal = await prisma.animal.create({
      data: {
        ownerId: otherOwnerUser.id,
        name: 'Barnaby',
        species: AnimalSpecies.BOVINE,
        breed: 'Jersey',
        sex: AnimalSex.MALE
      }
    });

    // 4. Create FileAsset and Scans for linkage verification
    const fileAsset = await prisma.fileAsset.create({
      data: {
        ownerId: ownerUser.id,
        storageKey: `scans/test_${uniqueSuffix}.jpg`,
        originalFilename: 'skin_lesion.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        checksum: 'sha256_mock_checksum'
      }
    });

    testScan = await prisma.scan.create({
      data: {
        animalId: ownerAnimal.id,
        uploadedBy: ownerUser.id,
        fileAssetId: fileAsset.id,
        bodyPart: 'Lateral Torso',
        status: 'COMPLETED'
      }
    });

    const otherFileAsset = await prisma.fileAsset.create({
      data: {
        ownerId: otherOwnerUser.id,
        storageKey: `scans/other_${uniqueSuffix}.jpg`,
        originalFilename: 'other.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 1024,
        checksum: 'sha256_other_mock'
      }
    });

    otherAnimalScan = await prisma.scan.create({
      data: {
        animalId: otherAnimal.id,
        uploadedBy: otherOwnerUser.id,
        fileAssetId: otherFileAsset.id,
        bodyPart: 'Shoulder',
        status: 'COMPLETED'
      }
    });
  });

  afterAll(async () => {
    // Cleanup created data
    if (ownerAnimal) {
      await prisma.consultation.deleteMany({ where: { animalId: ownerAnimal.id } });
      await prisma.scan.deleteMany({ where: { animalId: ownerAnimal.id } });
      await prisma.healthRecord.deleteMany({ where: { animalId: ownerAnimal.id } });
      await prisma.animal.delete({ where: { id: ownerAnimal.id } });
    }
    if (otherAnimal) {
      await prisma.consultation.deleteMany({ where: { animalId: otherAnimal.id } });
      await prisma.scan.deleteMany({ where: { animalId: otherAnimal.id } });
      await prisma.animal.delete({ where: { id: otherAnimal.id } });
    }
    if (ownerUser) await prisma.user.delete({ where: { id: ownerUser.id } });
    if (otherOwnerUser) await prisma.user.delete({ where: { id: otherOwnerUser.id } });
    if (vetUser) await prisma.user.delete({ where: { id: vetUser.id } });
    if (otherVetUser) await prisma.user.delete({ where: { id: otherVetUser.id } });
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } });
  });

  describe('1. Consultation Request & Scan Linkage', () => {
    it('allows authenticated owner to request consultation linked to animal and scan', async () => {
      const res = await request(app)
        .post('/api/v1/consultations')
        .set('Cookie', ownerCookie)
        .send({
          animalId: ownerAnimal.id,
          scanId: testScan.id,
          subject: 'Cutaneous Nodule Evaluation',
          description: 'Nodule observed on lateral flank with mild swelling over 48 hours.'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.consultation.status).toBe(ConsultationStatus.REQUESTED);
      expect(res.body.data.consultation.animalId).toBe(ownerAnimal.id);
      expect(res.body.data.consultation.scanId).toBe(testScan.id);
      expect(res.body.data.consultation.ownerId).toBe(ownerUser.id);
    });

    it('rejects consultation request with scan that belongs to a different animal (400)', async () => {
      const res = await request(app)
        .post('/api/v1/consultations')
        .set('Cookie', ownerCookie)
        .send({
          animalId: ownerAnimal.id,
          scanId: otherAnimalScan.id, // Mismatched scan
          subject: 'Invalid Scan Link',
          description: 'Should fail validation due to scan mismatch.'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects consultation request for an animal the user does not own (403)', async () => {
      const res = await request(app)
        .post('/api/v1/consultations')
        .set('Cookie', ownerCookie)
        .send({
          animalId: otherAnimal.id, // Owned by otherOwnerUser
          subject: 'Unauthorized Request',
          description: 'Should be forbidden.'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('2. Complete Lifecycle State Machine Validations', () => {
    let consultationId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/consultations')
        .set('Cookie', ownerCookie)
        .send({
          animalId: ownerAnimal.id,
          scanId: testScan.id,
          subject: 'Lifecycle Verification Case',
          description: 'Testing strict state machine transitions.'
        });
      consultationId = res.body.data.consultation.id;
    });

    it('rejects invalid jump: REQUESTED -> COMPLETED (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.COMPLETED });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('Invalid lifecycle transition');
    });

    it('rejects invalid jump: REQUESTED -> IN_PROGRESS (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.IN_PROGRESS });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
    });

    it('rejects unauthorized actor: Owner attempting to ACCEPT consultation (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', ownerCookie)
        .send({ status: ConsultationStatus.ACCEPTED });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('valid transition: Veterinarian ACCEPTs consultation -> sets status ACCEPTED and assigns vet', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.ACCEPTED });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.consultation.status).toBe(ConsultationStatus.ACCEPTED);
      expect(res.body.data.consultation.veterinarianId).toBe(vetUser.id);
    });

    it('rejects scheduling without scheduledAt timestamp (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.SCHEDULED });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('scheduledAt timestamp is required');
    });

    it('valid transition: Veterinarian schedules consultation -> status SCHEDULED', async () => {
      const appointmentDate = new Date(Date.now() + 86400000).toISOString();
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({
          status: ConsultationStatus.SCHEDULED,
          scheduledAt: appointmentDate
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.consultation.status).toBe(ConsultationStatus.SCHEDULED);
      expect(res.body.data.consultation.scheduledAt).toBeDefined();
    });

    it('valid rescheduling: stays SCHEDULED with updated timestamp', async () => {
      const newDate = new Date(Date.now() + 172800000).toISOString();
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/schedule`)
        .set('Cookie', vetCookie)
        .send({ scheduledAt: newDate });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.consultation.status).toBe(ConsultationStatus.SCHEDULED);
    });

    it('rejects unauthorized vet: Other vet cannot transition or start case (403)', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', otherVetCookie)
        .send({ status: ConsultationStatus.IN_PROGRESS });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('valid transition: Attending veterinarian starts consultation -> status IN_PROGRESS', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.IN_PROGRESS });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.consultation.status).toBe(ConsultationStatus.IN_PROGRESS);
      expect(res.body.data.consultation.startedAt).toBeDefined();
    });

    it('guardrail: Rejects COMPLETED status if ZERO clinical notes authored (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.COMPLETED });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('required clinical documentation');
    });

    it('owner cannot cancel an in-progress consultation (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', ownerCookie)
        .send({ status: ConsultationStatus.CANCELLED });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cannot cancel an in-progress consultation');
    });
  });

  describe('3. Clinical Notes & Owner Visibility Privacy Controls', () => {
    let consultationId: string;
    let publicNoteId: string;
    let privateNoteId: string;

    beforeAll(async () => {
      // Create and transition consultation to IN_PROGRESS
      const createRes = await request(app)
        .post('/api/v1/consultations')
        .set('Cookie', ownerCookie)
        .send({
          animalId: ownerAnimal.id,
          scanId: testScan.id,
          subject: 'Clinical Notes Privacy Test',
          description: 'Testing notes visibility and audit integrity.'
        });
      consultationId = createRes.body.data.consultation.id;

      await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.ACCEPTED });

      await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.IN_PROGRESS });
    });

    it('rejects clinical note authoring by owner (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/clinical-notes`)
        .set('Cookie', ownerCookie)
        .send({
          presentingConcern: 'Owner attempting to prescribe',
          examinationFindings: 'Exam',
          assessment: 'Fake Diagnosis',
          recommendations: 'Treatment'
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('attending veterinarian authors owner-visible clinical note', async () => {
      const res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/clinical-notes`)
        .set('Cookie', vetCookie)
        .send({
          presentingConcern: 'Cutaneous lesion on flank',
          historyObservations: 'Appeared 3 days ago; patient is alert and feeding normally.',
          examinationFindings: 'Firm 1.5 cm circumscribed nodule with mild hyperkeratosis.',
          assessment: 'Suspected localized nodular dermatitis',
          recommendations: 'Apply topical antiseptic twice daily. Isolate from herd for 5 days.',
          followUpDate: new Date(Date.now() + 7 * 86400000).toISOString(),
          followUpInstructions: 'Recheck lesion diameter in 7 days.',
          isOwnerVisible: true
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.clinicalNote.isOwnerVisible).toBe(true);
      expect(res.body.data.clinicalNote.assessment).toBe('Suspected localized nodular dermatitis');
      publicNoteId = res.body.data.clinicalNote.id;

      // Verify mirrored HealthRecord was created for longitudinal tracking
      const healthRecords = await prisma.healthRecord.findMany({
        where: { animalId: ownerAnimal.id }
      });
      expect(healthRecords.length).toBeGreaterThan(0);
      const createdRecord = healthRecords.find((r) => r.diagnosis === 'Suspected localized nodular dermatitis');
      expect(createdRecord).toBeDefined();
      expect(createdRecord?.recordType).toBe(RecordType.FOLLOW_UP);
    });

    it('attending veterinarian authors private internal note (isOwnerVisible: false)', async () => {
      const res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/clinical-notes`)
        .set('Cookie', vetCookie)
        .send({
          presentingConcern: 'Internal vet differential notes',
          examinationFindings: 'Differential includes subclinical bovine papillomatosis.',
          assessment: 'Differential diagnostic review note for internal clinic records.',
          recommendations: 'Monitor for satellite lesions.',
          isOwnerVisible: false
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.clinicalNote.isOwnerVisible).toBe(false);
      privateNoteId = res.body.data.clinicalNote.id;
    });

    it('privacy control: Owner reading clinical notes ONLY receives owner-visible notes', async () => {
      const res = await request(app)
        .get(`/api/v1/consultations/${consultationId}/clinical-notes`)
        .set('Cookie', ownerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const notes = res.body.data.clinicalNotes;

      // Must include the public note, must NOT include the private note
      expect(notes.some((n: any) => n.id === publicNoteId)).toBe(true);
      expect(notes.some((n: any) => n.id === privateNoteId)).toBe(false);
      expect(notes.every((n: any) => n.isOwnerVisible === true)).toBe(true);
    });

    it('veterinarian reading clinical notes receives ALL notes including private internal notes', async () => {
      const res = await request(app)
        .get(`/api/v1/consultations/${consultationId}/clinical-notes`)
        .set('Cookie', vetCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const notes = res.body.data.clinicalNotes;

      expect(notes.some((n: any) => n.id === publicNoteId)).toBe(true);
      expect(notes.some((n: any) => n.id === privateNoteId)).toBe(true);
    });

    it('attending veterinarian completes consultation now that clinical documentation exists', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.COMPLETED });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.consultation.status).toBe(ConsultationStatus.COMPLETED);
      expect(res.body.data.consultation.completedAt).toBeDefined();
    });

    it('rejects transition from terminal state COMPLETED (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.IN_PROGRESS });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toContain('Cannot modify status of a completed consultation');
    });

    it('integrity: Rejects editing clinical notes after consultation is COMPLETED (400)', async () => {
      const res = await request(app)
        .patch(`/api/v1/consultations/${consultationId}/clinical-notes/${publicNoteId}`)
        .set('Cookie', vetCookie)
        .send({
          assessment: 'Altered diagnosis attempt after completion'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cannot modify clinical records of a completed consultation');
    });

    it('integrity: Rejects adding new clinical notes after consultation is COMPLETED (400)', async () => {
      const res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/clinical-notes`)
        .set('Cookie', vetCookie)
        .send({
          presentingConcern: 'Post-completion note attempt',
          examinationFindings: 'Exam',
          assessment: 'Diagnosis',
          recommendations: 'Treatment'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toContain('Cannot author new clinical notes after consultation is completed');
    });
  });

  describe('4. Persistent Messaging & Access Isolation', () => {
    let consultationId: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/v1/consultations')
        .set('Cookie', ownerCookie)
        .send({
          animalId: ownerAnimal.id,
          subject: 'Messaging & Isolation Test',
          description: 'Testing message persistence between participants.'
        });
      consultationId = res.body.data.consultation.id;

      await request(app)
        .patch(`/api/v1/consultations/${consultationId}/status`)
        .set('Cookie', vetCookie)
        .send({ status: ConsultationStatus.ACCEPTED });
    });

    it('owner sends a message in consultation thread', async () => {
      const res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/messages`)
        .set('Cookie', ownerCookie)
        .send({ message: 'Hello doctor, Daisy is resting in the stall.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.message).toBe('Hello doctor, Daisy is resting in the stall.');
      expect(res.body.data.message.senderId).toBe(ownerUser.id);
    });

    it('veterinarian replies to the message', async () => {
      const res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/messages`)
        .set('Cookie', vetCookie)
        .send({ message: 'Thank you for the update. Keep her hydrated.' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.message.senderId).toBe(vetUser.id);
    });

    it('unrelated owner cannot send message in this consultation (403)', async () => {
      const res = await request(app)
        .post(`/api/v1/consultations/${consultationId}/messages`)
        .set('Cookie', otherOwnerCookie)
        .send({ message: 'Sneaking into another consultation thread' });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('unrelated veterinarian cannot view this active assigned consultation (403)', async () => {
      const res = await request(app)
        .get(`/api/v1/consultations/${consultationId}`)
        .set('Cookie', otherVetCookie);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('participant retrieves chronological message dialogue in consultation details', async () => {
      const res = await request(app)
        .get(`/api/v1/consultations/${consultationId}`)
        .set('Cookie', ownerCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const messages = res.body.data.consultation.messages;
      expect(messages.length).toBeGreaterThanOrEqual(2);
      expect(messages.some((m: any) => m.message.includes('Daisy is resting'))).toBe(true);
      expect(messages.some((m: any) => m.message.includes('Keep her hydrated'))).toBe(true);
    });
  });

  describe('5. Decline and Cancellation Workflow', () => {
    it('veterinarian can decline pending REQUESTED consultation with declineReason', async () => {
      const createRes = await request(app)
        .post('/api/v1/consultations')
        .set('Cookie', ownerCookie)
        .send({
          animalId: ownerAnimal.id,
          subject: 'Case to be Declined',
          description: 'Request that vet will decline.'
        });
      const conId = createRes.body.data.consultation.id;

      const declineRes = await request(app)
        .patch(`/api/v1/consultations/${conId}/status`)
        .set('Cookie', vetCookie)
        .send({
          status: ConsultationStatus.CANCELLED,
          declineReason: 'Outside clinical specialization; recommend avian specialist.'
        });

      expect(declineRes.status).toBe(200);
      expect(declineRes.body.success).toBe(true);
      expect(declineRes.body.data.consultation.status).toBe(ConsultationStatus.CANCELLED);
      expect(declineRes.body.data.consultation.declineReason).toBe(
        'Outside clinical specialization; recommend avian specialist.'
      );
    });

    it('owner can safely cancel their own REQUESTED consultation', async () => {
      const createRes = await request(app)
        .post('/api/v1/consultations')
        .set('Cookie', ownerCookie)
        .send({
          animalId: ownerAnimal.id,
          subject: 'Owner Cancel Case',
          description: 'Accidental request.'
        });
      const conId = createRes.body.data.consultation.id;

      const cancelRes = await request(app)
        .patch(`/api/v1/consultations/${conId}/status`)
        .set('Cookie', ownerCookie)
        .send({
          status: ConsultationStatus.CANCELLED,
          declineReason: 'Symptoms resolved spontaneously.'
        });

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.success).toBe(true);
      expect(cancelRes.body.data.consultation.status).toBe(ConsultationStatus.CANCELLED);
    });

    it('rejects sending messages in a cancelled consultation (400)', async () => {
      const createRes = await request(app)
        .post('/api/v1/consultations')
        .set('Cookie', ownerCookie)
        .send({
          animalId: ownerAnimal.id,
          subject: 'Cancelled message test',
          description: 'Valid cancellation message test description.'
        });
      const conId = createRes.body.data.consultation.id;

      await request(app)
        .patch(`/api/v1/consultations/${conId}/status`)
        .set('Cookie', ownerCookie)
        .send({ status: ConsultationStatus.CANCELLED });

      const msgRes = await request(app)
        .post(`/api/v1/consultations/${conId}/messages`)
        .set('Cookie', ownerCookie)
        .send({ message: 'Should be rejected' });

      expect(msgRes.status).toBe(400);
      expect(msgRes.body.success).toBe(false);
      expect(msgRes.body.error.message).toContain('Cannot send messages in a cancelled consultation');
    });
  });
});
