---
name: vetvision-ai
description: Guide and operational workflows for developing, testing, maintaining, and deploying VetVision AI.
---

# VetVision AI Workspace Skill

This skill documents standard operations, project conventions, and verification steps for VetVision AI.

## Architecture

VetVision AI follows a decoupled three-tier architecture:
1. **Frontend (`apps/web`)**: React 18, Vite, Tailwind CSS, TanStack Query, React Hook Form, Zod, Lucide icons, Recharts.
2. **Backend API (`apps/api`)**: Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, Argon2, secure cookie sessions, Multer with magic-byte validation, structured Winston-like logging.
3. **Internal AI Service (`services/ai`)**: Python 3.12, FastAPI, PyTorch & ONNX model adapter architecture, strict input preprocessing, latency benchmarking, and explicit `MODEL_UNAVAILABLE` fallback when weights are unconfigured.

## Core Rules & Guardrails

- **Zero Fake Data**: Never simulate AI diagnoses with `setTimeout` or hardcoded random probabilities.
- **Model Unavailable State**: If no weights exist at `MODEL_ARTIFACT_PATH`, the system returns `PredictionStatus.MODEL_UNAVAILABLE` honestly.
- **Role-Based Access Control**: Strict role enforcement (`OWNER`, `VETERINARIAN`, `ADMIN`) via `requireRole` middleware. Frontend roles are never trusted.
- **Storage Security**: Safe filenames via UUIDs, SHA-256 checksums, storage outside web root, content-type and magic-byte checks.

## Common Developer Commands

```bash
# Typecheck entire monorepo
npm run typecheck

# Run all test suites
npm test

# Run AI service pytest
npm run test:ai

# Build all packages and apps
npm run build

# Start local database and services via Docker
docker compose up
```
