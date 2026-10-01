import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  createAnimalSchema,
  createScanSchema,
  createConsultationSchema,
  createModelVersionSchema
} from '@vetvision/validation';
import { UserRole, AnimalSpecies, AnimalSex, ModelFramework } from '@vetvision/shared-types';

describe('Validation Schemas & Input Constraints', () => {
  describe('Registration & Auth Validation', () => {
    it('accepts valid owner registration payload', () => {
      const payload = {
        email: 'farmer.bob@example.com',
        password: 'SecurePassword123',
        firstName: 'Bob',
        lastName: 'Smith',
        role: UserRole.OWNER
      };
      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects registration with weak password (missing digit/caps)', () => {
      const payload = {
        email: 'user@example.com',
        password: 'weakpassword',
        firstName: 'Bob',
        lastName: 'Smith'
      };
      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects registration with invalid email', () => {
      const payload = {
        email: 'invalid-email-string',
        password: 'ValidPassword123',
        firstName: 'Bob',
        lastName: 'Smith'
      };
      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });

    it('rejects registration directly attempting ADMIN role', () => {
      const payload = {
        email: 'hacker@example.com',
        password: 'ValidPassword123',
        firstName: 'Evil',
        lastName: 'Admin',
        role: 'ADMIN' // Direct admin registration should fail
      };
      const result = registerSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Animal Data Validation', () => {
    it('accepts valid bovine animal creation', () => {
      const payload = {
        name: 'Daisy',
        species: AnimalSpecies.CATTLE,
        breed: 'Holstein Friesian',
        sex: AnimalSex.FEMALE,
        weight: 650.5,
        identificationNumber: 'TAG-US-9821'
      };
      const result = createAnimalSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects animal with negative or absurd weight', () => {
      const payload = {
        name: 'Invalid Animal',
        species: AnimalSpecies.CATTLE,
        sex: AnimalSex.FEMALE,
        weight: -10
      };
      const result = createAnimalSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('Scan & Consultation Validation', () => {
    it('accepts valid scan request with UUID asset id', () => {
      const payload = {
        animalId: '11111111-1111-1111-1111-111111111111',
        fileAssetId: '22222222-2222-2222-2222-222222222222',
        bodyPart: 'Flank'
      };
      const result = createScanSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it('rejects consultation request missing subject or description', () => {
      const payload = {
        animalId: '11111111-1111-1111-1111-111111111111',
        subject: '',
        description: ''
      };
      const result = createConsultationSchema.safeParse(payload);
      expect(result.success).toBe(false);
    });
  });

  describe('AI Model Version Validation', () => {
    it('accepts valid model version registration', () => {
      const payload = {
        name: 'vetvision-lsd-resnet50',
        version: '1.2.0',
        framework: ModelFramework.PYTORCH,
        artifactUri: 'models/lsd_resnet50_v1.2.pt',
        modelSizeBytes: 98000000,
        inputWidth: 224,
        inputHeight: 224,
        accuracy: 0.945,
        f1Score: 0.938
      };
      const result = createModelVersionSchema.safeParse(payload);
      expect(result.success).toBe(true);
    });
  });
});
