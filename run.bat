@echo off
title Groq AI Flask Chatbot
echo ===================================================
echo           Starting Groq AI Flask Chatbot
echo ===================================================
echo.

if not exist .venv\Scripts\python.exe (
    echo [!] Virtual environment not found. Setting up...
    where uv >nul 2>nul
    if %errorlevel% equ 0 (
        uv venv .venv
        uv pip install -r requirements.txt --python .venv\Scripts\python.exe
    ) else (
        python -m venv .venv
        .\.venv\Scripts\pip.exe install -r requirements.txt
    )
)

echo [*] Starting Flask server on http://127.0.0.1:5000...
.\.venv\Scripts\python.exe app.py
pause
