# VetVision AI: Production Deployment & Infrastructure Guide

## 1. Overview & Topology

VetVision AI is architected for containerized, scalable cloud deployment. The system decouples the client-facing presentation layer, the application orchestration API, the dedicated AI inference worker, and stateful storage tiers.

```mermaid
graph TD
    Client[Web Browser / Mobile Client] -->|HTTPS :443| LB[Reverse Proxy / Ingress / Cloudflare]
    LB -->|Path /| WebApp[apps/web: NGINX Static Container]
    LB -->|Path /api/v1| NodeAPI[apps/api: Node.js Express Container]
    
    subgraph Private Internal Network
        NodeAPI -->|Port 5432| DB[(PostgreSQL Database Cluster)]
        NodeAPI -->|S3 Protocol| S3[(S3-Compatible Object Store)]
        NodeAPI -->|HTTP Port 8000 + Internal Secret| AIService[services/ai: FastAPI Inference Container]
        AIService --> WeightsVolume[(Mounted Model Weights Volume)]
    end
```

---

## 2. Docker Compose Local Deployment

For rapid local testing and development, run:

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Start PostgreSQL, API, AI Service, and Web Frontend
docker compose up --build
```

### Services Defined in `docker-compose.yml`:
- **`postgres`**: PostgreSQL 16 Alpine with persistent volume `pgdata`.
- **`ai`**: Python 3.12 FastAPI service listening on `internal:8000`. Not exposed directly to public internet.
- **`api`**: Node.js 20 Express server listening on `:4000`. Automatically runs migrations and connects to database.
- **`web`**: React Vite application served on `:5173`.

---

## 3. Production Environment Checklist

Ensure the following environment variables are securely injected in production (never commit `.env` to Git):

| Variable | Description | Recommended Production Setting |
| :--- | :--- | :--- |
| `NODE_ENV` | Runtime environment | `production` |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/vetvision?sslmode=require` |
| `SESSION_SECRET` | Secret used to hash session tokens | 64+ char random hex string |
| `COOKIE_SECURE` | Secure cookie flag | `true` (enforces HTTPS) |
| `CORS_ORIGINS` | Permitted browser origins | `https://app.vetvision.ai` |
| `STORAGE_PROVIDER` | Object storage provider | `s3` |
| `OBJECT_STORAGE_BUCKET`| S3 Bucket Name | E.g., `vetvision-production-assets` |
| `OBJECT_STORAGE_REGION`| S3 Bucket Region | E.g., `us-east-1` |
| `OBJECT_STORAGE_ACCESS_KEY`| IAM Access Key | Restrict to S3 PutObject/GetObject |
| `OBJECT_STORAGE_SECRET_KEY`| IAM Secret Key | Injected via KMS / Secrets Manager |
| `AI_SERVICE_URL` | Internal URL to AI container | `http://vetvision-ai:8000` |
| `AI_SERVICE_INTERNAL_SECRET`| Shared HMAC secret | 64+ char random hex string |

---

## 4. Database Migrations & Seeding

### Migrations
In production pipelines (CI/CD):
```bash
npx prisma migrate deploy
```

### Development Seeding
To populate seed accounts and dummy clinical cases in local/staging environments:
```bash
npm run db:seed
```

> **Warning:** Never run seed scripts with default passwords in production environments.

---

## 5. AI Service & Model Weights Provisioning

The AI service dynamically checks for configured weights:
- **PyTorch format:** `.pt` or `.pth`
- **ONNX format:** `.onnx`

### Safe Model Provisioning
1. Mount a read-only volume or download weights during container startup:
   ```bash
   aws s3 cp s3://vetvision-models/lsd_resnet50_v1.onnx /models/lsd.onnx
   ```
2. Set `MODEL_ARTIFACT_PATH=/models/lsd.onnx` and `MODEL_FRAMEWORK=ONNX`.
3. If no weights are present, the inference service automatically reports `MODEL_UNAVAILABLE` rather than hallucinating predictions, preserving system stability.

---

## 6. Health Checks & Probes

| Service | Endpoint | Success Code | Check Frequency |
| :--- | :--- | :--- | :--- |
| Node API | `GET /api/v1/health` | `200 OK` | Every 10s |
| AI Service | `GET /internal/v1/health` | `200 OK` | Every 15s |

Kubernetes / ECS Liveness Probe example:
```yaml
livenessProbe:
  httpGet:
    path: /api/v1/health
    port: 4000
  initialDelaySeconds: 15
  periodSeconds: 10
```

---

## 7. Security Hardening

- **TLS 1.3:** Enforced at the load balancer / Cloudflare edge.
- **Strict Headers:** Helmet configures CSP, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`.
- **Rate Limiting:** Active per IP (`RATE_LIMIT_WINDOW_MS=900000`, `RATE_LIMIT_MAX_REQUESTS=100`).
- **File Validation:** Magic-byte inspection, allowlisted extensions, SHA-256 integrity validation, randomized UUID storage paths.
