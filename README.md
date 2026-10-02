# VetVision AI

> AI-assisted veterinary health platform supporting animal profiles, cattle/pet health records, longitudinal tracking, Lumpy Skin Disease (LSD) screening, and veterinary consultations.

---

## 1. Prerequisites

Before setting up VetVision AI, verify that the following dependencies are installed on your workstation:

- **Node.js**: `v20.0.0` or higher
- **npm**: `v10.0.0` or higher
- **Python**: `3.10` - `3.12` (with `pip` and `venv`)
- **Docker & Docker Compose**: (optional for local standalone, required for containerized deployment)
- **PostgreSQL**: `v15` or `v16` (if running database locally outside Docker)

---

## 2. Installation

Clone the repository and install the workspace dependencies:

```bash
# Clone the repository
git clone https://github.com/ashutoshverma0007/vetvision-ai.git
cd vetvision-ai

# Install root & workspace npm dependencies
npm install

# Setup Python virtual environment for the AI service
cd services/ai
python -m venv .venv

# Activate virtual environment
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

# Install AI dependencies
pip install -r requirements.txt
cd ../..
```

---

## 3. Environment Setup

Copy `.env.example` to `.env` in the root of the project:

```bash
cp .env.example .env
```

Review and adjust the configuration parameters:

```ini
# Application Port and Mode
PORT=4000
NODE_ENV=development
APPLICATION_URL=http://localhost:5173

# Database Connection
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vetvision?schema=public"

# Session Secret (random 64+ char string)
SESSION_SECRET="your-super-secret-development-session-key-min-64-characters-long"
COOKIE_SECURE=false

# Allowed CORS Origins
CORS_ORIGINS="http://localhost:5173,http://localhost:3000"

# Storage Configuration (local or s3)
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=./data/storage

# Internal AI Service Configuration
AI_SERVICE_URL=http://localhost:8000
AI_SERVICE_INTERNAL_SECRET="internal-vetvision-ai-service-shared-secret-key"

# Email OTP Service Configuration (MSG91)
# Fail-closed: Must be set in production to enable account registration
MSG91_AUTH_KEY="your-msg91-auth-key"
MSG91_EMAIL_TEMPLATE_ID="your-msg91-email-otp-template-id"
MSG91_OTP_API_URL="https://control.msg91.com/api/v5/otp"
OTP_EXPIRY_MINUTES=10
OTP_RESEND_COOLDOWN_SECONDS=60
OTP_MAX_ATTEMPTS=5
```

---

## 4. Database Setup

Ensure PostgreSQL is running locally or start the PostgreSQL container:

```bash
# Start PostgreSQL via Docker Compose
docker compose up -d postgres
```

Verify the database connection:

```bash
npx prisma db push --preview-feature
```

---

## 5. Migrations

Apply database schema changes:

```bash
# Generate Prisma Client
npm run db:generate

# In development mode, create and apply migrations
npx prisma migrate dev --name init

# Or in production/CI:
# npx prisma migrate deploy
```

---

## 6. Seed Data

To populate the development database with realistic clinical data (Users, Animals, Health Records, Vaccinations, Medications, Scans, and Consultations):

```bash
npm run db:seed
```

### Seed Accounts (Development Only):

| Role | Email | Password |
| :--- | :--- | :--- |
| **Owner** | `farmer.john@example.com` | `Password123` |
| **Veterinarian** | `dr.sarah@vetvision.ai` | `Password123` |
| **Administrator** | `admin@vetvision.ai` | `AdminPassword123` |

> ⚠️ **Notice**: These credentials are strictly intended for local development and testing. Do not use them in production.

---

## 7. Development Commands

Run applications simultaneously or individually:

```bash
# Start API & Web frontend concurrently
npm run dev

# Or run services individually:
npm run dev:api    # Starts Node Express API on http://localhost:4000
npm run dev:web    # Starts React Vite Frontend on http://localhost:5173

# Start Python FastAPI AI service:
cd services/ai
.venv\Scripts\python -m uvicorn app.api.main:app --host 0.0.0.0 --port 8000 --reload
```

---

## 8. Testing

VetVision AI maintains comprehensive test suites spanning backend logic, storage security, AI fallback resilience, RBAC, input validation, and E2E user workflows:

```bash
# Run all Vitest suites (backend unit, RBAC, storage, validation, integration, E2E)
npm test

# Run AI service pytest suite
npm run test:ai

# Run type-checking across all workspaces
npm run typecheck

# Run linter
npm run lint
```

---

## 9. Production Build

Build all workspace packages and frontend assets for production:

```bash
npm run build
```

This compiles:
- `@vetvision/shared-types`
- `@vetvision/validation`
- `@vetvision/config`
- `@vetvision/api` (TypeScript to `dist/`)
- `@vetvision/web` (Vite production bundle to `dist/`)

---

## 10. Docker Usage

Run the entire platform (PostgreSQL, Node API, Python AI Service, and Web Frontend) with Docker Compose:

```bash
# Build and start all containers in background
docker compose up -d --build

# View container logs
docker compose logs -f

# Stop containers
docker compose down
```

### Port Mappings:
- **Web App**: `http://localhost:5173`
- **Node REST API**: `http://localhost:4000`
- **PostgreSQL**: `localhost:5432`
- **AI Service**: internal network only (reachable by API at `http://ai:8000`)

---

## 11. AI Model Configuration

VetVision AI supports both PyTorch (`.pt`, `.pth`) and ONNX (`.onnx`) model formats for Lumpy Skin Disease (LSD) screening.

### Critical Safety Principle:
VetVision AI **never fabricates predictions**. If no model artifact is provided, the platform reports `MODEL_UNAVAILABLE` rather than hallucinating diagnoses. All non-AI features (health records, animal profiles, consultations, medications) remain 100% operational.

### Configuring a Model:
1. Place your model weights in `services/ai/weights/lsd_model.onnx`.
2. Configure the environment variables in `services/ai/.env` or `.env`:
   ```ini
   MODEL_ARTIFACT_PATH=./weights/lsd_model.onnx
   MODEL_FRAMEWORK=ONNX
   MODEL_NAME=VetVision-LSD-ResNet50
   MODEL_VERSION=1.0.0
   ```
3. Restart the AI service.

---

## 12. Deployment Notes

- **Reverse Proxy**: Place an NGINX or Cloudflare ingress in front of the application to terminate TLS and forward requests.
- **Object Storage**: For AWS S3, Cloudflare R2, or MinIO, configure `STORAGE_PROVIDER=s3` and specify your credentials in production environment secrets.
- **Database Scaling**: Enable connection pooling (e.g., PgBouncer or Supabase / AWS RDS Proxy) for high concurrency.
- **Zero-Downtime Updates**: Use rolling updates for container workloads. Health check probes are located at `/api/v1/health` and `/internal/v1/health`.

For full deployment documentation, see [docs/deployment.md](file:///c:/Users/Ashutosh%20Verma/OneDrive/Desktop/VET%20VISION%20AI/docs/deployment.md).

---

## Documentation Index

- [Architecture Specification](file:///c:/Users/Ashutosh%20Verma/OneDrive/Desktop/VET%20VISION%20AI/docs/architecture.md)
- [API Documentation](file:///c:/Users/Ashutosh%20Verma/OneDrive/Desktop/VET%20VISION%20AI/docs/api.md)
- [Database Schema & Models](file:///c:/Users/Ashutosh%20Verma/OneDrive/Desktop/VET%20VISION%20AI/docs/database.md)
- [AI Research & Inference Pipeline](file:///c:/Users/Ashutosh%20Verma/OneDrive/Desktop/VET%20VISION%20AI/docs/ai-pipeline.md)
- [Security Posture & Compliance](file:///c:/Users/Ashutosh%20Verma/OneDrive/Desktop/VET%20VISION%20AI/docs/security.md)
- [Deployment & Operations](file:///c:/Users/Ashutosh%20Verma/OneDrive/Desktop/VET%20VISION%20AI/docs/deployment.md)
- [Implementation Plan & Milestones](file:///c:/Users/Ashutosh%20Verma/OneDrive/Desktop/VET%20VISION%20AI/docs/implementation-plan.md)
