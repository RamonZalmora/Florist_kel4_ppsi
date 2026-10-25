$ErrorActionPreference = "Stop"
$projectPath = Split-Path -Parent $PSScriptRoot
Push-Location $projectPath
try {
    if (-not (Test-Path ".env")) {
        if (Get-Command node -ErrorAction SilentlyContinue) {
            node scripts/init-local.js
        } else {
            docker run --rm --mount "type=bind,source=$projectPath,target=/app" -w /app node:22-alpine node scripts/init-local.js
        }
    }
    docker compose up -d --build --wait --wait-timeout 180
    if ($LASTEXITCODE -ne 0) { throw "Startup gagal. Periksa: docker compose logs --tail 80 web db" }
    Write-Host "Website dan database siap. Buka http://localhost:3000/catalog (port default)."
    Write-Host "Login tim: http://localhost:3000/login. Password awal ada di .env lokal."
} finally {
    Pop-Location
}
