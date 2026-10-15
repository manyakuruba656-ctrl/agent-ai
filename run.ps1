# PowerShell launcher for Groq AI Flask Chatbot
Write-Host "===================================================" -ForegroundColor Cyan
Write-Host "          Starting Groq AI Flask Chatbot           " -ForegroundColor Cyan
Write-Host "===================================================" -ForegroundColor Cyan

if (-not (Test-Path ".\.venv\Scripts\python.exe")) {
    Write-Host "[!] Virtual environment not found. Creating..." -ForegroundColor Yellow
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv venv .venv
        uv pip install -r requirements.txt --python .\.venv\Scripts\python.exe
    } else {
        python -m venv .venv
        .\.venv\Scripts\pip.exe install -r requirements.txt
    }
}

# Locate viable Python interpreter (handles Windows Application Control policies)
$pythonExe = $null

# Check for uv-managed Python in AppData (approved path under Application Control)
$uvPythons = @(Get-ChildItem -Path "$env:APPDATA\uv\python" -Filter "python.exe" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch "Lib" } | Select-Object -ExpandProperty FullName)
if ($uvPythons.Count -gt 0) {
    $pythonExe = $uvPythons[0]
}

if (-not $pythonExe -and (Test-Path ".\.venv\Scripts\python.exe")) {
    $pythonExe = ".\.venv\Scripts\python.exe"
}

if (-not $pythonExe) {
    $pythonExe = "python"
}

$sitePackages = Join-Path (Get-Location) ".venv\Lib\site-packages"
if (Test-Path $sitePackages) {
    $env:PYTHONPATH = $sitePackages
}

Write-Host "[*] Launching Flask server on http://127.0.0.1:5000" -ForegroundColor Green
Write-Host "[*] Using interpreter: $pythonExe" -ForegroundColor DarkGray
& $pythonExe app.py
