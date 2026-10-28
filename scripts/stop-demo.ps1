# ==============================================================================
# VetVision AI - Graceful Process Shutdown Routine
# ==============================================================================
# Identifies and stops processes bound to ports 5173, 4000, 8000, and 5432.
# Usage: powershell -ExecutionPolicy Bypass -File .\scripts\stop-demo.ps1

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "   VetVision AI - Stopping Local Demo Services                        " -ForegroundColor Yellow
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host ""

$targetPorts = @(5173, 4000, 8000, 5432)
$stoppedCount = 0

foreach ($port in $targetPorts) {
    $netstatOutput = netstat -ano | Select-String ":$port\s"
    $pids = @()
    foreach ($line in $netstatOutput) {
        $parts = ($line.Line.Trim() -split '\s+')
        if ($parts.Length -ge 5 -and $parts[3] -eq "LISTENING") {
            $pids += [int]$parts[4]
        }
    }
    $pids = $pids | Select-Object -Unique

    if ($pids.Count -gt 0) {
        foreach ($p in $pids) {
            try {
                $proc = Get-Process -Id $p -ErrorAction SilentlyContinue
                if ($proc) {
                    Write-Host "[*] Stopping process '$($proc.ProcessName)' (PID: $p) on port $port..." -ForegroundColor Yellow
                    Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
                    $stoppedCount++
                }
            } catch {
                Write-Host "[WARN] Could not stop PID $p" -ForegroundColor DarkGray
            }
        }
    } else {
        Write-Host "[OK] Port $port is not in use." -ForegroundColor DarkGray
    }
}

Write-Host ""
Write-Host "[OK] Shutdown routine complete. Total processes stopped: $stoppedCount" -ForegroundColor Green
Write-Host ""
