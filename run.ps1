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

Write-Host "[*] Launching Flask server on http://127.0.0.1:5000" -ForegroundColor Green
& ".\.venv\Scripts\python.exe" app.py
