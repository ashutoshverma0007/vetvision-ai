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
- **Production Masking:** Unhandled 500 exceptions suppress stack traces and internal database errors when `NODE_ENV === 'production'`.
