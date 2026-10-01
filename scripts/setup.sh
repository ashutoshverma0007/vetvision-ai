#!/usr/bin/env bash
set -e

echo "========================================"
echo "VetVision AI - Setup & Dependency Check"
echo "========================================"

# 1. Check Node & Python
echo "[✓] Node.js version: $(node -v)"
echo "[✓] Python version: $(python3 --version || python --version)"

# 2. Check environment file
if [ ! -f .env ]; then
    echo "[!] .env not found. Copying from .env.example..."
    cp .env.example .env
    echo "[✓] Created .env template."
else
    echo "[✓] .env file exists."
fi

# 3. Generate Prisma Client
echo "[i] Generating Prisma Client..."
npx prisma generate

# 4. Build packages
echo "[i] Building core TypeScript packages..."
npm run build --workspace=@vetvision/shared-types
npm run build --workspace=@vetvision/validation
npm run build --workspace=@vetvision/config

echo "========================================"
echo "Setup Completed Successfully!"
echo "Run 'npm run dev' or 'docker compose up' to start services."
echo "========================================"
