import { z } from 'zod';
import {
  UserRole,
  AnimalSpecies,
  AnimalSex,
  RecordType,
  MedicationStatus,
  ScanStatus,
  ConsultationStatus,
  VetVerificationStatus,
  ModelFramework,
  ModelStatus
} from '@vetvision/shared-types';

// ==============================================================================
// Authentication & User Schemas
// ==============================================================================

export const registerSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password cannot exceed 128 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  phone: z.string().trim().max(30).optional().nullable(),
  role: z.enum([UserRole.OWNER, UserRole.VETERINARIAN]).default(UserRole.OWNER),
  // For Veterinarian registration:
  licenseNumber: z.string().trim().max(100).optional(),
  specialization: z.string().trim().max(100).optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
  clinicName: z.string().trim().max(200).optional(),
  bio: z.string().trim().max(2000).optional()
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
});

export type LoginInput = z.infer<typeof loginSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128)
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Must contain at least one digit')
});

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const updateUserProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(30).optional().nullable()
});

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

// ==============================================================================
// Animal Schemas
// ==============================================================================

export const createAnimalSchema = z.object({
  name: z.string().trim().min(1, 'Animal name is required').max(100),
  species: z.nativeEnum(AnimalSpecies).or(z.string().min(1).max(50)),
  breed: z.string().trim().max(100).optional().nullable(),
  sex: z.nativeEnum(AnimalSex).or(z.string().min(1).max(30)),
  dateOfBirth: z.coerce.date().optional().nullable(),
  weight: z.number().positive('Weight must be positive').max(20000).optional().nullable(),
  color: z.string().trim().max(100).optional().nullable(),
  identificationNumber: z.string().trim().max(100).optional().nullable(),
  profileImageId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable()
});

export type CreateAnimalInput = z.infer<typeof createAnimalSchema>;

export const updateAnimalSchema = createAnimalSchema.partial();

export type UpdateAnimalInput = z.infer<typeof updateAnimalSchema>;

// ==============================================================================
// Health Records Schemas
// ==============================================================================

export const createHealthRecordSchema = z.object({
  recordType: z.nativeEnum(RecordType).or(z.string().min(1).max(50)),
  title: z.string().trim().min(1, 'Title is required').max(200),
  description: z.string().trim().min(1, 'Description is required').max(10000),
  diagnosis: z.string().trim().max(5000).optional().nullable(),
  treatment: z.string().trim().max(5000).optional().nullable(),
  recordedAt: z.coerce.date().default(() => new Date())
});

export type CreateHealthRecordInput = z.infer<typeof createHealthRecordSchema>;

export const updateHealthRecordSchema = createHealthRecordSchema.partial();

// ==============================================================================
// Vaccination Schemas
// ==============================================================================

export const createVaccinationSchema = z.object({
  vaccineName: z.string().trim().min(1, 'Vaccine name is required').max(150),
  administeredDate: z.coerce.date(),
  nextDueDate: z.coerce.date().optional().nullable(),
  dose: z.string().trim().max(100).optional().nullable(),
  veterinarianId: z.string().uuid().optional().nullable(),
  notes: z.string().trim().max(2000).optional().nullable()
});

export type CreateVaccinationInput = z.infer<typeof createVaccinationSchema>;

export const updateVaccinationSchema = createVaccinationSchema.partial();

// ==============================================================================
// Medication Schemas
// ==============================================================================

export const createMedicationSchema = z.object({
  name: z.string().trim().min(1, 'Medication name is required').max(150),
  dosage: z.string().trim().min(1, 'Dosage is required').max(100),
  frequency: z.string().trim().min(1, 'Frequency is required').max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  instructions: z.string().trim().max(3000).optional().nullable(),
  status: z.nativeEnum(MedicationStatus).or(z.string().min(1)).default(MedicationStatus.ACTIVE)
});

export type CreateMedicationInput = z.infer<typeof createMedicationSchema>;

export const updateMedicationSchema = createMedicationSchema.partial();

// ==============================================================================
// Scan Schemas
// ==============================================================================

export const createScanSchema = z.object({
  bodyPart: z.string().trim().max(100).optional().nullable(),
  captureTimestamp: z.coerce.date().default(() => new Date()),
  notes: z.string().trim().max(1000).optional().nullable()
});

export type CreateScanInput = z.infer<typeof createScanSchema>;

// ==============================================================================
// Consultation Schemas
// ==============================================================================

export const createConsultationSchema = z.object({
  animalId: z.string().uuid('Valid animal ID is required'),
  veterinarianId: z.string().uuid().optional().nullable(),
  subject: z.string().trim().min(3, 'Subject must be at least 3 characters').max(200),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  scheduledAt: z.coerce.date().optional().nullable()
});

export type CreateConsultationInput = z.infer<typeof createConsultationSchema>;

export const updateConsultationStatusSchema = z.object({
  status: z.nativeEnum(ConsultationStatus)
});

export const createConsultationMessageSchema = z.object({
  message: z.string().trim().min(1, 'Message cannot be empty').max(5000),
  attachmentId: z.string().uuid().optional().nullable()
});

export type CreateConsultationMessageInput = z.infer<typeof createConsultationMessageSchema>;

export const createClinicalNoteSchema = z.object({
  diagnosis: z.string().trim().min(1, 'Diagnosis is required').max(5000),
  treatment: z.string().trim().min(1, 'Treatment is required').max(5000),
  notes: z.string().trim().max(5000).optional().nullable(),
  followUpDate: z.coerce.date().optional().nullable()
});

export type CreateClinicalNoteInput = z.infer<typeof createClinicalNoteSchema>;

// ==============================================================================
// Veterinarian Profile Schemas
// ==============================================================================

export const updateVetProfileSchema = z.object({
  licenseNumber: z.string().trim().min(1).max(100).optional(),
  specialization: z.string().trim().min(1).max(100).optional(),
  experienceYears: z.number().int().min(0).max(70).optional(),
  clinicName: z.string().trim().max(200).optional().nullable(),
  bio: z.string().trim().max(2000).optional().nullable()
});

export const updateVetVerificationSchema = z.object({
  status: z.nativeEnum(VetVerificationStatus),
  notes: z.string().trim().max(1000).optional()
});

// ==============================================================================
// Model Management Schemas (Admin)
// ==============================================================================

export const createModelVersionSchema = z.object({
  name: z.string().trim().min(1).max(150),
  version: z.string().trim().min(1).max(50),
  framework: z.nativeEnum(ModelFramework).or(z.string().min(1)),
  artifactUri: z.string().trim().min(1).max(500),
  modelSizeBytes: z.number().int().positive().optional().nullable(),
  inputWidth: z.number().int().positive().default(224),
  inputHeight: z.number().int().positive().default(224),
  accuracy: z.number().min(0).max(1).optional().nullable(),
  precision: z.number().min(0).max(1).optional().nullable(),
  recall: z.number().min(0).max(1).optional().nullable(),
  f1Score: z.number().min(0).max(1).optional().nullable(),
  validationDataset: z.string().trim().max(255).optional().nullable(),
  status: z.nativeEnum(ModelStatus).or(z.string().min(1)).default(ModelStatus.CANDIDATE),
  notes: z.string().trim().max(2000).optional().nullable()
});

export const updateModelVersionSchema = createModelVersionSchema.partial();
export type CreateModelVersionInput = z.infer<typeof createModelVersionSchema>;
export type UpdateModelVersionInput = z.infer<typeof updateModelVersionSchema>;
