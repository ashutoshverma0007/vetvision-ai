# VetVision AI — Demo Day Runbook for College Presentation

**Date:** October 28, 2026  
**Audience:** Academic Evaluators, Faculty & Demonstration Panel  
**Scope:** Running the local four-tier VetVision AI application and executing the AI Lumpy Skin Disease (LSD) screening workflow live.

---

## 1. System Prerequisites

Before starting the demo, ensure the following are present on the machine:
- **Operating System:** Windows 10 or 11 (PowerShell 5.1+)
- **Node.js:** v20+ (`node -v`)
- **Python:** Python 3.12 (`python --version`) with virtual environment at `services/ai/.venv`
- **Network Ports Available:**
  - `5432`: PostgreSQL Database
  - `8000`: FastAPI AI Inference Microservice
  - `4000`: Express Backend API
  - `5173`: React / Vite Web Client

---

## 2. One-Command Demonstration Startup

Open PowerShell in the project root directory (`VET VISION AI`) and run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-demo.ps1
```

### What this script does:
1. Detects if any tier is already running to prevent duplicate process conflicts.
2. Starts Embedded PostgreSQL on port `5432` if inactive.
3. Starts the FastAPI AI Microservice on port `8000` using the local `.venv`.
4. Starts the Express Backend API on port `4000`.
5. Starts the React / Vite Web Client on port `5173`.
6. Executes automated health probes against both the backend and frontend.

---

## 3. Service Verification & Health Checks

Verify that all services report healthy before opening your presentation browser:

### A. Backend API & Database & AI Service Combined Health Check
Open your browser or run in PowerShell:
```powershell
Invoke-RestMethod -Uri "http://localhost:4000/api/v1/health" | ConvertTo-Json
```
**Expected Output:**
```json
{
  "success": true,
  "data": {
    "status": "OPERATIONAL",
    "version": "1.0.0",
    "database": "HEALTHY",
    "aiService": "HEALTHY",
    "environment": "development"
  }
}
```

### B. Frontend Web Client
Navigate to:
```
http://localhost:5173
```
You should see the VetVision AI Landing Page with the Clinical Navigation bar, Live AI Screening banner, and theme toggle.

---

## 4. Demo Login Credentials

The application includes pre-seeded demonstration accounts. On the login screen (`http://localhost:5173/login`), use the convenient **Demo Quick-Fill** buttons or type the credentials:

| Role | Email | Quick-Fill Action | Primary Purpose |
| :--- | :--- | :--- | :--- |
| **Animal Owner** | `owner@vetvision.ai` | Click "Owner Demo" | Animal profiles, image upload, AI screening, consultation requests |
| **Veterinarian** | `vet@vetvision.ai` | Click "Veterinarian Demo" | Case reviews, clinical notes, appointment scheduling |
| **Administrator** | `admin@vetvision.ai` | Click "Admin Demo" | Model registry inspection, audit logs, user management |

*(Passwords match the standard development seed password specified in `.env` / `prisma/seed.ts`)*

---

## 5. Live Scanner Demonstration Sequence (Step-by-Step)

Follow this exact sequence for your teacher/panel:

### Step 1: Login as Owner
1. Open `http://localhost:5173/login`.
2. Click the green **"Owner Demo"** button (pre-fills `owner@vetvision.ai`).
3. Click **"Sign In to Account"**.
4. You are redirected to the **Owner Dashboard** (`http://localhost:5173/dashboard`).

### Step 2: Select Patient Animal
1. Click **"Animals"** in the top navigation or select **"Bella"** from the registered animals list.
2. Show the animal profile: Bella is a Holstein Friesian cattle registered with RFID `RFID-982000412389102`.
3. Note Bella's longitudinal history (scans, checkups, vaccinations).

### Step 3: Launch AI Scanner
1. Click **"New Scan"** or **"Run Diagnostic Scan"** on Bella's profile (or go to `http://localhost:5173/animals/:id/scans/new`).
2. **Body Part**: Select or enter `Lateral Torso & Flank`.
3. **Observations / Symptoms**: Enter `Circumscribed cutaneous nodules detected during morning inspection`.
4. **Image Upload**: Click the upload dropzone and select a demonstration image:
   - File location: `data/storage/0fa7f247-a87e-4d18-b28a-c71478ee26b7.jpg`
   - Notice the preview renders immediately with image size and MIME verification.
5. Click **"Analyze Scan with AI"**.

### Step 4: Explain Real AI Results (What to Highlight to Teacher)
Within milliseconds, the real EfficientNet-B0 ONNX runtime processes the image:
1. **Screening Result**: Highlights **Severe Cutaneous Lesions (73.05% Confidence)**.
2. **Uncertainty & Probabilities Distribution**:
   - Severe: `73.05%`
   - Mild: `22.39%`
   - Normal: `4.56%`
   - Sum equals `1.0000` (demonstrating proper Softmax calibration).
3. **Inference Latency**: Shows CPU runtime latency (`~15–35 ms`).
4. **Clinical Safety Disclaimer**: Point out the prominent banner indicating that this is an AI-assisted decision support screening, not a definitive diagnosis, adhering to veterinary safety standards.
5. **Model Registry Provenance**: Shows model version `lsd-efficientnetb0-v1.0.0` with SHA-256 integrity checksum.

### Step 5: Verify Persistence & Health Record
1. Click **"Back to Animal Scans"** or view the **Diagnostic Scans** tab.
2. Point out that the scan is permanently stored in PostgreSQL with its file asset checksum, prediction probabilities, and timestamp.
3. Show the **"Request Consultation for this Scan"** button to demonstrate the clinical bridge connecting animal owners to licensed veterinarians.

---

## 6. Common Issues & Fast Recovery Steps

| Issue | Cause | 10-Second Fix |
| :--- | :--- | :--- |
| **"Can't reach database server at localhost:5432"** | PostgreSQL stopped | Run `node scripts/start-local-db.mjs` in a terminal window. |
| **Health reports `aiService: OFFLINE`** | FastAPI microservice stopped | Run `services\ai\.venv\Scripts\python.exe services/ai/main.py`. |
| **Vite page is blank or connection refused** | Frontend server stopped | Run `npm run dev:web`. |
| **Port conflict (e.g. port 4000 already in use)** | Stale Node process | Run `powershell -File .\scripts\stop-demo.ps1`, then re-run `.\scripts\start-demo.ps1`. |
| **Missing demo cattle Bella or demo users** | Database needs seed data | Run `npm run db:seed`. |

---

## 7. Safe Shutdown Routine

When your demonstration is finished, run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\stop-demo.ps1
```

This terminates only the processes listening on ports `5173`, `4000`, `8000`, and `5432` without touching any other programs.
