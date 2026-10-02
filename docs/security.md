# VetVision AI Security Architecture & OWASP Compliance

## 1. Overview

VetVision AI handles sensitive animal health records, veterinary professional credentials, and diagnostic lesion captures. The system enforces zero-trust architecture across all layers.

---

## 2. Threat Modeling & Mitigation Matrix

### 2.1 Broken Access Control & IDOR
- **Mitigation:**
  - Non-sequential UUIDv4 used as primary keys for all public identifiers.
  - Relational access validation is enforced inside backend domain services, never relying on client-side route guards alone.
  - Owners can only query, modify, or upload scans for animals where `ownerId === req.user.id`.
  - Veterinarians are barred from viewing records unless assigned to an active consultation involving that animal.
  - Administrative endpoints require explicit `UserRole.ADMIN` token claims.

### 2.2 Password Storage & Authentication
- **Algorithm:** Argon2id (memoryCost: 64MB, timeCost: 3 iterations, parallelism: 4 threads).
- **Session Tokens:** 256-bit entropy generated using `crypto.randomBytes(32)`.
- **Database Hashing:** Stored as SHA-256 hashes (`session_token_hash`) in the `sessions` table.
- **Cookie Security:** Cookies are delivered with `HttpOnly`, `SameSite=Lax` (or `Strict`), and `Secure=true` in production environments. Tokens are never stored in client `localStorage` or `sessionStorage` to eliminate XSS token theft.

### 2.3 Malicious File Upload & Storage Security
- **Magic Byte Verification:** File inspection checks binary magic numbers (`FF D8 FF` for JPEG, `89 50 4E 47` for PNG, `RIFF...WEBP` for WEBP), rejecting files that fraudulently spoof MIME types.
- **Storage Isolation:** Files are written to an isolated directory outside the web root (`./data/storage`) using randomized UUID storage keys with safe extensions.
- **Path Traversal Defense:** Storage keys are strictly stripped using `path.basename` and verified against directory boundaries.
- **Safe Streaming:** Assets are served exclusively via authenticated `/api/v1/files/:id` streaming endpoints with proper `Content-Type` and `Content-Disposition`. Direct public bucket listing is prohibited.

### 2.4 SQL & NoSQL Injection
- **Prisma Parameterization:** All SQL queries are compiled and parameterized through Prisma ORM. No raw string interpolation is permitted.

### 2.5 Brute-Force & Denial of Service (DoS)
- **Rate Limiting:** Global rate limiters (1000 requests per 15-minute window) and specialized auth limiters guard against credential stuffing and brute-force registration.
- **Upload Size Limits:** Hard 10MB payload limit on multipart uploads.

### 2.6 Sensitive Data Logging & Leakage
- **Redaction Engine:** Structured JSON logger automatically scrubs keys matching `password`, `token`, `secret`, `authorization`, `cookie`, `apiKey`, and `privateKey`.
- **Zero OTP Logging:** OTP codes are strictly excluded from logging at all levels.
- **Production Masking:** Unhandled 500 exceptions suppress stack traces and internal database errors when `NODE_ENV === 'production'`.

### 2.7 Email OTP Registration & Fail-Closed Guardrails
- **Two-Stage Deferred Account Creation:** When a user initiates registration via `POST /api/v1/auth/register`, VetVision AI stores a temporary `PendingRegistration` record with Argon2id-hashed credentials. The permanent `User` record is **strictly NOT created** until verification succeeds.
- **Zero-Storage Principle:** OTP values are generated, managed, and verified exclusively through the upstream provider (MSG91 Email OTP V5 API). No plaintext or hashed OTP codes are stored in the local database.
- **Fail-Closed Architecture:** If the OTP provider configuration (`MSG91_AUTH_KEY`, `MSG91_EMAIL_TEMPLATE_ID`) is missing, requests fail closed immediately with `CONFIGURATION_REQUIRED` (HTTP 500), preventing unverified account creation.
- **Provider Abstraction (`EmailOtpProvider`):** All provider-specific calls are encapsulated behind a pluggable interface, facilitating painless integration of alternative providers without changing registration contracts.
- **Brute-Force & Flood Controls:**
  - **Cooldown:** Enforces a 60-second resend cooldown (`RESEND_COOLDOWN`, HTTP 429).
  - **Attempt Throttling:** Capped at 5 verification attempts before the pending registration is purged (`MAX_ATTEMPTS_EXCEEDED`, HTTP 403).
  - **TTL Expiration:** Pending registration records automatically expire after 10 minutes (`OTP_EXPIRED`, HTTP 400).
- **Atomic Permanent User & Session Provisioning:** Upon valid OTP verification, an atomic database transaction creates the permanent `User` record, sets `emailVerifiedAt`, provisions any associated `VeterinarianProfile`, purges the pending registration, and issues an authenticated `HttpOnly` session.
- **Bypass Prevention:** Direct API requests to protected routes or unverified login attempts are rejected with 401 Unauthorized. Page refresh preserves user email context via client-side storage without granting unauthorized session privileges.
