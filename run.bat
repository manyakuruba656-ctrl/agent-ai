@echo off
title Groq AI Flask Chatbot
echo ===================================================
echo           Starting Groq AI Flask Chatbot
echo ===================================================
echo.

set PYTHON_EXE=
for /f "delims=" %%I in ('powershell -NoProfile -Command "@(Get-ChildItem -Path \"$env:APPDATA\uv\python\" -Filter \"python.exe\" -Recurse -ErrorAction SilentlyContinue | Where-Object { $_.FullName -notmatch 'Lib' } | Select-Object -ExpandProperty FullName)[0]"') do set PYTHON_EXE=%%I

if "%PYTHON_EXE%"=="" (
    if exist .venv\Scripts\python.exe (
        set PYTHON_EXE=.\.venv\Scripts\python.exe
    ) else (
        set PYTHON_EXE=python
    )
)

set PYTHONPATH=%~dp0.venv\Lib\site-packages;%PYTHONPATH%

echo [*] Starting Flask server on http://127.0.0.1:5000...
echo [*] Using interpreter: %PYTHON_EXE%
"%PYTHON_EXE%" app.py
pause
