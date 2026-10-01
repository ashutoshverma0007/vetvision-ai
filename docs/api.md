# VetVision AI REST API Reference (v1)

## 1. Overview & Conventions

All endpoints adhere to standard REST semantics and are versioned under `/api/v1/*`. Internal service-to-service communication is partitioned under `/internal/v1/*`.

### Global Request Headers
- `Content-Type: application/json` (or `multipart/form-data` for file uploads)
- `X-Request-Id`: Unique UUID trace identifier (generated automatically if not provided)
- `Cookie: vetvision_session=<token>`: HttpOnly session cookie

### Uniform API Response Envelopes
All responses return structured JSON envelopes:

```json
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "requestId": "4690858f-2f78-43bb-8197-e31d04495536"
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR | UNAUTHORIZED | FORBIDDEN | NOT_FOUND | CONFLICT",
    "message": "Human-readable explanation of error",
    "details": [ ... ]
  },
  "meta": {
    "requestId": "4690858f-2f78-43bb-8197-e31d04495536"
  }
}
```

---

## 2. Authentication Endpoints (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new user as Owner or Veterinarian | None |
| `POST` | `/api/v1/auth/login` | Authenticate with email and password | None |
| `POST` | `/api/v1/auth/logout` | Revoke current session cookie | Session |
| `GET` | `/api/v1/auth/me` | Fetch active profile and licensing details | Session |
| `POST` | `/api/v1/auth/change-password` | Change password with Argon2id | Session |

---

## 3. Animal & Health Management (`/api/v1/animals`)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/v1/animals` | List accessible animals | Owner, Vet, Admin |
| `POST` | `/api/v1/animals` | Register new animal profile | Owner, Admin |
| `GET` | `/api/v1/animals/:id` | Fetch animal details & relations | Authorized User |
| `PUT` | `/api/v1/animals/:id` | Update animal profile metadata | Owner, Admin |
| `DELETE` | `/api/v1/animals/:id` | Delete animal profile | Owner, Admin |
| `GET` | `/api/v1/animals/:id/timeline` | Get longitudinal health timeline | Authorized User |

### Health Records & Clinical Care
| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/v1/animals/:id/health` | List clinical checkup records | Authorized User |
| `POST` | `/api/v1/animals/:id/health` | Log clinical observation / checkup | Owner, Vet |
| `GET` | `/api/v1/animals/:id/vaccinations` | List immunization history | Authorized User |
| `POST` | `/api/v1/animals/:id/vaccinations` | Log vaccination record & due date | Owner, Vet |
| `GET` | `/api/v1/animals/:id/medications` | List medication prescriptions | Authorized User |
| `POST` | `/api/v1/animals/:id/medications` | Record medication dosage & frequency | Owner, Vet |
| `PATCH` | `/api/v1/medications/:id/status` | Update status (ACTIVE / COMPLETED) | Authorized User |

---

## 4. Diagnostic Scans & AI Evaluation (`/api/v1/scans`)

| Method | Endpoint | Description | Content-Type |
|---|---|---|---|
| `POST` | `/api/v1/animals/:id/scans` | Upload lesion photo and trigger AI inference | `multipart/form-data` |
| `GET` | `/api/v1/animals/:id/scans` | List all historical scans for animal | `application/json` |
| `GET` | `/api/v1/scans/recent` | List latest scans for current owner | `application/json` |
| `GET` | `/api/v1/scans/:id` | Fetch scan results, AI probabilities, latency | `application/json` |

---

## 5. Veterinary Consultations (`/api/v1/consultations`)

| Method | Endpoint | Description | Roles |
|---|---|---|---|
| `GET` | `/api/v1/consultations` | List user's consultation cases | Owner, Vet, Admin |
| `POST` | `/api/v1/consultations` | Request new consultation for animal | Owner |
| `GET` | `/api/v1/consultations/:id` | View case details, patient info, messages | Authorized Parties |
| `PATCH` | `/api/v1/consultations/:id/status`| Transition state (ACCEPTED, COMPLETED) | Assigned Vet, Admin |
| `POST` | `/api/v1/consultations/:id/messages`| Send persistent clinical dialogue message | Participating Users |
| `POST` | `/api/v1/consultations/:id/clinical-notes` | Record official diagnosis & treatment plan | Attending Vet |

---

## 6. Secure Media Assets (`/api/v1/files/:id`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/files/:id` | Securely stream image binary with access validation and cache headers |

---

## 7. Administration (`/api/v1/admin`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/admin/users` | Paginated user accounts directory |
| `GET` | `/api/v1/admin/veterinarians` | List practitioner applications |
| `PATCH` | `/api/v1/admin/veterinarians/:id/verification` | Verify or reject veterinary license |
| `GET` | `/api/v1/admin/models` | List AI models registered in catalog |
| `POST` | `/api/v1/admin/models` | Register new model version |
| `PATCH` | `/api/v1/admin/models/:id/status` | Activate/deactivate model version |
| `GET` | `/api/v1/admin/audit-logs` | Query security audit ledger |
