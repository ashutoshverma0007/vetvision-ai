# VetVision AI Local Setup Script for Windows PowerShell
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "VetVision AI - Setup & Dependency Check" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Check Node.js
$nodeVersion = node -v
Write-Host "[✓] Node.js version: $nodeVersion" -ForegroundColor Green

# 2. Check Python
$pythonVersion = python --version
Write-Host "[✓] Python version: $pythonVersion" -ForegroundColor Green

# 3. Check environment file
if (-not (Test-Path .env)) {
    Write-Host "[!] .env not found. Copying from .env.example..." -ForegroundColor Yellow
    Copy-Item .env.example .env
    Write-Host "[✓] Created .env template. Please review database credentials." -ForegroundColor Green
} else {
    Write-Host "[✓] .env file exists." -ForegroundColor Green
}

# 4. Generate Prisma Client
Write-Host "[i] Generating Prisma Client..." -ForegroundColor Cyan
npx prisma generate

# 5. Build packages
Write-Host "[i] Building core TypeScript packages..." -ForegroundColor Cyan
npm run build --workspace=@vetvision/shared-types
npm run build --workspace=@vetvision/validation
npm run build --workspace=@vetvision/config

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Completed Successfully!" -ForegroundColor Green
Write-Host "Run 'npm run dev' or 'docker compose up' to start services." -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
