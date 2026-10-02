// ==============================================================================
// VetVision AI Shared Domain Types & Contracts
// ==============================================================================

// --- User & Role Enums ---
export enum UserRole {
  OWNER = 'OWNER',
  VETERINARIAN = 'VETERINARIAN',
  ADMIN = 'ADMIN'
}

export enum VetVerificationStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

// --- Animal & Health Enums ---
export enum AnimalSpecies {
  CATTLE = 'CATTLE',
  DOG = 'DOG',
  CAT = 'CAT',
  HORSE = 'HORSE',
  SHEEP = 'SHEEP',
  GOAT = 'GOAT',
  OTHER = 'OTHER'
}

export enum AnimalSex {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  MALE_NEUTERED = 'MALE_NEUTERED',
  FEMALE_SPAYED = 'FEMALE_SPAYED',
  UNKNOWN = 'UNKNOWN'
}

export enum RecordType {
  GENERAL_CHECKUP = 'GENERAL_CHECKUP',
  VACCINATION = 'VACCINATION',
  INJURY = 'INJURY',
  SKIN_LESION = 'SKIN_LESION',
  SURGERY = 'SURGERY',
  LAB_WORK = 'LAB_WORK',
  FOLLOW_UP = 'FOLLOW_UP',
  OTHER = 'OTHER'
}

export enum MedicationStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  DISCONTINUED = 'DISCONTINUED'
}

// --- Scan & AI Enums ---
export enum ScanStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  REVIEW_REQUIRED = 'REVIEW_REQUIRED'
}

export enum PredictionStatus {
  AVAILABLE = 'AVAILABLE',
  LOW_CONFIDENCE = 'LOW_CONFIDENCE',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  FAILED = 'FAILED'
}

export enum PredictedClass {
  NORMAL = 'NORMAL',
  MILD = 'MILD',
  SEVERE = 'SEVERE'
}

export enum ModelFramework {
  PYTORCH = 'PYTORCH',
  ONNX = 'ONNX',
  TENSORFLOW = 'TENSORFLOW'
}

export enum ModelStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DEPRECATED = 'DEPRECATED',
  CANDIDATE = 'CANDIDATE'
}

// --- Consultation Enums ---
export enum ConsultationStatus {
  REQUESTED = 'REQUESTED',
  ACCEPTED = 'ACCEPTED',
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

// ==============================================================================
// Domain Entity Interfaces
// ==============================================================================

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  role: UserRole;
  emailVerifiedAt?: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface VeterinarianProfile {
  id: string;
  userId: string;
  licenseNumber: string;
  specialization: string;
  experienceYears: number;
  clinicName?: string | null;
  bio?: string | null;
  verificationStatus: VetVerificationStatus;
  createdAt: Date | string;
  user?: UserSummary;
}

export interface FileAsset {
  id: string;
  ownerId: string;
  storageKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  checksum: string;
  url?: string;
  createdAt: Date | string;
}

export interface Animal {
  id: string;
  ownerId: string;
  name: string;
  species: AnimalSpecies | string;
  breed?: string | null;
  sex: AnimalSex | string;
  dateOfBirth?: Date | string | null;
  weight?: number | null;
  color?: string | null;
  identificationNumber?: string | null;
  profileImageId?: string | null;
  profileImage?: FileAsset | null;
  notes?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  scans?: Scan[];
  healthRecords?: HealthRecord[];
  vaccinations?: Vaccination[];
  medications?: Medication[];
  consultations?: Consultation[];
}

export interface HealthRecord {
  id: string;
  animalId: string;
  recordedBy: string;
  recordType: RecordType | string;
  title: string;
  description: string;
  diagnosis?: string | null;
  treatment?: string | null;
  recordedAt: Date | string;
  createdAt: Date | string;
  author?: UserSummary | null;
}

export interface Vaccination {
  id: string;
  animalId: string;
  vaccineName: string;
  administeredDate: Date | string;
  nextDueDate?: Date | string | null;
  dose?: string | null;
  veterinarianId?: string | null;
  notes?: string | null;
  createdAt: Date | string;
  veterinarian?: UserSummary | null;
}

export interface Medication {
  id: string;
  animalId: string;
  prescribedBy?: string | null;
  name: string;
  dosage: string;
  frequency: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  instructions?: string | null;
  status: MedicationStatus | string;
  createdAt: Date | string;
  prescriber?: UserSummary | null;
}

export interface ModelVersion {
  id: string;
  name: string;
  version: string;
  framework: ModelFramework | string;
  artifactUri: string;
  modelSizeBytes?: number | null;
  inputWidth?: number | null;
  inputHeight?: number | null;
  accuracy?: number | null;
  precision?: number | null;
  recall?: number | null;
  f1Score?: number | null;
  validationDataset?: string | null;
  status: ModelStatus | string;
  notes?: string | null;
  createdAt: Date | string;
}

export interface Prediction {
  id: string;
  scanId: string;
  modelVersionId?: string | null;
  predictedClass?: PredictedClass | null;
  confidence?: number | null;
  normalProbability?: number | null;
  mildProbability?: number | null;
  severeProbability?: number | null;
  inferenceTimeMs?: number | null;
  preprocessingVersion?: string | null;
  deviceType?: string | null;
  status: PredictionStatus;
  createdAt: Date | string;
  modelVersion?: ModelVersion | null;
}

export interface Scan {
  id: string;
  animalId: string;
  uploadedBy: string;
  fileAssetId: string;
  bodyPart?: string | null;
  captureTimestamp: Date | string;
  status: ScanStatus;
  modelVersionId?: string | null;
  createdAt: Date | string;
  completedAt?: Date | string | null;
  fileAsset?: FileAsset;
  prediction?: Prediction | null;
  animal?: Animal;
}

export interface ConsultationMessage {
  id: string;
  consultationId: string;
  senderId: string;
  message: string;
  attachmentId?: string | null;
  attachment?: FileAsset | null;
  createdAt: Date | string;
  readAt?: Date | string | null;
  sender?: UserSummary;
}

export interface Consultation {
  id: string;
  animalId: string;
  ownerId: string;
  veterinarianId?: string | null;
  subject: string;
  description: string;
  status: ConsultationStatus;
  scheduledAt?: Date | string | null;
  startedAt?: Date | string | null;
  completedAt?: Date | string | null;
  createdAt: Date | string;
  animal?: Animal;
  owner?: UserSummary;
  veterinarian?: VeterinarianProfile | null;
  messages?: ConsultationMessage[];
}

export interface AuditLog {
  id: string;
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: Date | string;
}

// ==============================================================================
// Longitudinal Timeline Event
// ==============================================================================
export type TimelineEventType = 'SCAN' | 'HEALTH_RECORD' | 'VACCINATION' | 'MEDICATION' | 'CONSULTATION';

export interface TimelineEvent {
  id: string;
  type: TimelineEventType;
  date: Date | string;
  title: string;
  description?: string | null;
  badge?: string | null;
  severity?: 'NORMAL' | 'MILD' | 'SEVERE' | 'INFO';
  data: Scan | HealthRecord | Vaccination | Medication | Consultation;
}

// ==============================================================================
// API Response Envelopes
// ==============================================================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    requestId?: string;
  };
}

// ==============================================================================
// Internal AI Service Contracts
// ==============================================================================
export interface AIInferenceRequest {
  imagePath: string;
  imageMimeType: string;
  modelVersionId?: string;
}

export interface AIInferenceResponse {
  status: PredictionStatus;
  predictedClass?: PredictedClass;
  confidence?: number;
  normalProbability?: number;
  mildProbability?: number;
  severeProbability?: number;
  inferenceTimeMs?: number;
  modelVersion?: string;
  preprocessingVersion?: string;
  deviceType?: string;
  errorMessage?: string;
}

// ==============================================================================
// OTP Verification Contracts
// ==============================================================================
export interface SendOtpRequest {
  email: string;
}

export interface SendOtpResponse {
  email: string;
  requireOtp: boolean;
  cooldownSeconds: number;
  message: string;
}

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponse {
  user: UserSummary;
  message: string;
}

export interface ResendOtpRequest {
  email: string;
}

export interface ResendOtpResponse {
  email: string;
  cooldownSeconds: number;
  message: string;
}

