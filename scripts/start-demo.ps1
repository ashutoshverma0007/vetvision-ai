# ==============================================================================
# VetVision AI - Single-Command Local Demonstration Launcher
# ==============================================================================
# Starts all four application tiers with port-conflict checks and health validation.
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\start-demo.ps1

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   VetVision AI - College Demonstration Startup Routine                " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$ROOT = Split-Path -Parent $PSScriptRoot
Set-Location $ROOT

function Test-PortOpen {
    param([int]$Port)
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcp.BeginConnect("127.0.0.1", $Port, $null, $null)
        $wait = $asyncResult.AsyncWaitHandle.WaitOne(800, $false)
        if ($wait -and $tcp.Connected) {
            $tcp.EndConnect($asyncResult)
            $tcp.Close()
            return $true
        }
        $tcp.Close()
        return $false
    } catch {
        return $false
    }
}

# 1. PostgreSQL Database (Port 5432)
if (Test-PortOpen 5432) {
    Write-Host "[OK] PostgreSQL is already active on port 5432." -ForegroundColor Green
} else {
    Write-Host "[*] Starting Embedded PostgreSQL on port 5432..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT'; node scripts/start-local-db.mjs"
    $attempts = 0
    while (-not (Test-PortOpen 5432) -and $attempts -lt 15) {
        Start-Sleep -Seconds 1
        $attempts++
    }
    if (Test-PortOpen 5432) {
        Write-Host "[OK] PostgreSQL started successfully on port 5432." -ForegroundColor Green
    } else {
        Write-Host "[WARN] PostgreSQL port 5432 not responding yet." -ForegroundColor Yellow
    }
}

# 2. FastAPI AI Inference Microservice (Port 8000)
if (Test-PortOpen 8000) {
    Write-Host "[OK] FastAPI AI Service is already active on port 8000." -ForegroundColor Green
} else {
    Write-Host "[*] Starting FastAPI AI Service on port 8000..." -ForegroundColor Yellow
    $pythonVenv = Join-Path $ROOT "services\ai\.venv\Scripts\python.exe"
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT'; & '$pythonVenv' services/ai/main.py"
    $attempts = 0
    while (-not (Test-PortOpen 8000) -and $attempts -lt 15) {
        Start-Sleep -Seconds 1
        $attempts++
    }
    if (Test-PortOpen 8000) {
        Write-Host "[OK] FastAPI AI Service started successfully on port 8000." -ForegroundColor Green
    } else {
        Write-Host "[WARN] AI Service port 8000 not responding yet." -ForegroundColor Yellow
    }
}

# 3. Express Backend API (Port 4000)
if (Test-PortOpen 4000) {
    Write-Host "[OK] Express Backend API is already active on port 4000." -ForegroundColor Green
} else {
    Write-Host "[*] Starting Express API Server on port 4000..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT'; npm run dev:api"
    $attempts = 0
    while (-not (Test-PortOpen 4000) -and $attempts -lt 15) {
        Start-Sleep -Seconds 1
        $attempts++
    }
    if (Test-PortOpen 4000) {
        Write-Host "[OK] Express Backend API started successfully on port 4000." -ForegroundColor Green
    } else {
        Write-Host "[WARN] Backend API port 4000 not responding yet." -ForegroundColor Yellow
    }
}

# 4. React 18 / Vite Web Client (Port 5173)
if (Test-PortOpen 5173) {
    Write-Host "[OK] Vite Web Frontend is already active on port 5173." -ForegroundColor Green
} else {
    Write-Host "[*] Starting Vite Web Frontend on port 5173..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT'; npm run dev:web"
    $attempts = 0
    while (-not (Test-PortOpen 5173) -and $attempts -lt 15) {
        Start-Sleep -Seconds 1
        $attempts++
    }
    if (Test-PortOpen 5173) {
        Write-Host "[OK] Vite Web Frontend started successfully on port 5173." -ForegroundColor Green
    } else {
        Write-Host "[WARN] Frontend port 5173 not responding yet." -ForegroundColor Yellow
    }
}

# 5. Health Check
Write-Host ""
Write-Host "--- Performing Automated Health Check ---" -ForegroundColor Cyan
Start-Sleep -Seconds 2

try {
    $apiHealth = Invoke-RestMethod -Uri "http://localhost:4000/api/v1/health" -TimeoutSec 5 -ErrorAction Stop
    if ($apiHealth.data.database -eq "HEALTHY" -and $apiHealth.data.aiService -eq "HEALTHY") {
        Write-Host "[OK] Backend Health Check: ALL SYSTEMS OPERATIONAL (DB: HEALTHY, AI: HEALTHY)" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Backend Health Check: $($apiHealth | ConvertTo-Json -Compress)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "[WARN] Backend health endpoint not reachable." -ForegroundColor Yellow
}

try {
    $webResp = Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing -TimeoutSec 5 -ErrorAction Stop
    if ($webResp.StatusCode -eq 200) {
        Write-Host "[OK] Frontend Web Server: READY (HTTP 200 OK)" -ForegroundColor Green
    }
} catch {
    Write-Host "[WARN] Frontend web client not reachable." -ForegroundColor Yellow
}

# 6. Demonstration Access Summary
Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "                    DEMONSTRATION READY                               " -ForegroundColor Green
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "  Frontend Web Portal:   http://localhost:5173" -ForegroundColor White
Write-Host "  Backend API:           http://localhost:4000" -ForegroundColor White
Write-Host "  API Health Check:      http://localhost:4000/api/v1/health" -ForegroundColor White
Write-Host "  AI Inference Service:  http://localhost:8000" -ForegroundColor White
Write-Host "  PostgreSQL Database:   localhost:5432 (Database: vetvision_ai)" -ForegroundColor White
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  Demo Login Roles (use Quick-Fill on http://localhost:5173/login):" -ForegroundColor Cyan
Write-Host "    - Animal Owner:      owner@vetvision.ai" -ForegroundColor White
Write-Host "    - Veterinarian:      vet@vetvision.ai" -ForegroundColor White
Write-Host "    - Administrator:     admin@vetvision.ai" -ForegroundColor White
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  To stop all services safely, run: powershell -File .\scripts\stop-demo.ps1" -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""
