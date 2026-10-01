import {
  ApiResponse,
  UserSummary,
  Animal,
  TimelineEvent,
  Scan,
  HealthRecord,
  Vaccination,
  Medication,
  Consultation,
  ConsultationMessage,
  VeterinarianProfile,
  ModelVersion,
  AuditLog,
  UserRole,
  VetVerificationStatus,
  ModelStatus,
  MedicationStatus,
  ConsultationStatus
} from '@vetvision/shared-types';

export class ApiError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code = 'API_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.details = details;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
    credentials: 'include' // Transmit HttpOnly session cookie
  });

  let data: ApiResponse<T>;
  try {
    data = await response.json();
  } catch {
    throw new ApiError(
      `Network response parse failed: ${response.statusText}`,
      'PARSE_ERROR'
    );
  }

  if (!response.ok || !data.success) {
    throw new ApiError(
      data.error?.message || `Request failed with HTTP ${response.status}`,
      data.error?.code || 'UNKNOWN_ERROR',
      data.error?.details
    );
  }

  return data.data as T;
}

export const api = {
  // --- Auth ---
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ user: UserSummary }>('/api/v1/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials)
      }),
    register: (payload: any) =>
      request<{ user: UserSummary }>('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    logout: () =>
      request<{ message: string }>('/api/v1/auth/logout', {
        method: 'POST'
      }),
    me: () =>
      request<{ user: UserSummary & { veterinarianProfile?: VeterinarianProfile | null } }>(
        '/api/v1/auth/me'
      ),
    changePassword: (payload: { currentPassword: string; newPassword: string }) =>
      request<{ message: string }>('/api/v1/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
  },

  // --- Animals ---
  animals: {
    list: () => request<{ animals: Animal[] }>('/api/v1/animals'),
    getById: (id: string) => request<{ animal: Animal }>('/api/v1/animals/' + id),
    create: (payload: any) =>
      request<{ animal: Animal }>('/api/v1/animals', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    update: (id: string, payload: any) =>
      request<{ animal: Animal }>('/api/v1/animals/' + id, {
        method: 'PUT',
        body: JSON.stringify(payload)
      }),
    delete: (id: string) =>
      request<{ message: string }>('/api/v1/animals/' + id, {
        method: 'DELETE'
      }),
    getTimeline: (id: string) =>
      request<{ animal: Partial<Animal>; stats: any; events: TimelineEvent[] }>(
        '/api/v1/animals/' + id + '/timeline'
      )
  },

  // --- Health Records & Clinical Care ---
  health: {
    listRecords: (animalId: string) =>
      request<{ records: HealthRecord[] }>('/api/v1/animals/' + animalId + '/health'),
    createRecord: (animalId: string, payload: any) =>
      request<{ record: HealthRecord }>('/api/v1/animals/' + animalId + '/health', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    listVaccinations: (animalId: string) =>
      request<{ vaccinations: Vaccination[] }>('/api/v1/animals/' + animalId + '/vaccinations'),
    createVaccination: (animalId: string, payload: any) =>
      request<{ vaccination: Vaccination }>('/api/v1/animals/' + animalId + '/vaccinations', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    listMedications: (animalId: string) =>
      request<{ medications: Medication[] }>('/api/v1/animals/' + animalId + '/medications'),
    createMedication: (animalId: string, payload: any) =>
      request<{ medication: Medication }>('/api/v1/animals/' + animalId + '/medications', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    updateMedicationStatus: (medicationId: string, status: MedicationStatus) =>
      request<{ medication: Medication }>('/api/v1/medications/' + medicationId + '/status', {
        method: 'PATCH',
        body: JSON.stringify({ status })
      })
  },

  // --- Scans & AI Inference ---
  scans: {
    upload: (animalId: string, formData: FormData) =>
      request<{ scan: Scan }>('/api/v1/animals/' + animalId + '/scans', {
        method: 'POST',
        body: formData
      }),
    listForAnimal: (animalId: string) =>
      request<{ scans: Scan[] }>('/api/v1/animals/' + animalId + '/scans'),
    listRecent: () => request<{ scans: Scan[] }>('/api/v1/scans/recent'),
    getById: (id: string) => request<{ scan: Scan }>('/api/v1/scans/' + id)
  },

  // --- Consultations ---
  consultations: {
    list: () => request<{ consultations: Consultation[] }>('/api/v1/consultations'),
    getById: (id: string) => request<{ consultation: Consultation }>('/api/v1/consultations/' + id),
    request: (payload: { animalId: string; subject: string; description: string; veterinarianId?: string; scheduledAt?: Date }) =>
      request<{ consultation: Consultation }>('/api/v1/consultations', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    updateStatus: (id: string, status: ConsultationStatus, scheduledAt?: Date) =>
      request<{ consultation: Consultation }>('/api/v1/consultations/' + id + '/status', {
        method: 'PATCH',
        body: JSON.stringify({ status, scheduledAt })
      }),
    sendMessage: (id: string, message: string, attachmentId?: string) =>
      request<{ message: ConsultationMessage }>('/api/v1/consultations/' + id + '/messages', {
        method: 'POST',
        body: JSON.stringify({ message, attachmentId })
      }),
    createClinicalNote: (id: string, payload: { diagnosis: string; treatment: string; notes?: string }) =>
      request<{ clinicalNote: HealthRecord }>('/api/v1/consultations/' + id + '/clinical-notes', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
  },

  // --- Veterinarians ---
  veterinarians: {
    listVerified: () => request<{ veterinarians: VeterinarianProfile[] }>('/api/v1/veterinarians')
  },

  // --- Admin ---
  admin: {
    listUsers: (page = 1, limit = 20) =>
      request<{ total: number; page: number; limit: number; users: any[] }>(
        `/api/v1/admin/users?page=${page}&limit=${limit}`
      ),
    listVets: (status?: VetVerificationStatus) =>
      request<{ veterinarians: VeterinarianProfile[] }>(
        `/api/v1/admin/veterinarians${status ? '?status=' + status : ''}`
      ),
    verifyVet: (userId: string, status: VetVerificationStatus) =>
      request<{ veterinarianProfile: VeterinarianProfile }>(
        '/api/v1/admin/veterinarians/' + userId + '/verification',
        {
          method: 'PATCH',
          body: JSON.stringify({ status })
        }
      ),
    listModels: () => request<{ models: ModelVersion[] }>('/api/v1/admin/models'),
    createModel: (payload: any) =>
      request<{ model: ModelVersion }>('/api/v1/admin/models', {
        method: 'POST',
        body: JSON.stringify(payload)
      }),
    setModelStatus: (id: string, status: ModelStatus) =>
      request<{ model: ModelVersion }>('/api/v1/admin/models/' + id + '/status', {
        method: 'PATCH',
        body: JSON.stringify({ status })
      }),
    listAuditLogs: (page = 1, limit = 50) =>
      request<{ total: number; page: number; limit: number; logs: AuditLog[] }>(
        `/api/v1/admin/audit-logs?page=${page}&limit=${limit}`
      )
  },

  // --- Health / Telemetry ---
  system: {
    health: () => request<{ status: string; database: string; aiService: string }>('/api/v1/health')
  }
};
