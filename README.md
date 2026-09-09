# ⚡ GroqBot 2.0 - Multimodal AI Assistant

A high-performance, modern AI chatbot web application built with **Flask**, **Groq API**, and vanilla web technologies with **zero subscription charges** and **unlimited interactions**.

![Groq AI Chatbot](https://img.shields.io/badge/Powered%20by-Groq%20LPU-orange?style=for-the-badge)
![Voice & Audio](https://img.shields.io/badge/Voice-Whisper%20%2B%20TTS-blue?style=for-the-badge)
![Multimodal](https://img.shields.io/badge/Files-PDF%2C%20Code%2C%20Images%2C%20Audio-purple?style=for-the-badge)
![Themes](https://img.shields.io/badge/Themes-5%20Themes-emerald?style=for-the-badge)

---

## ✨ Features

### 1. 🎙️ Voice Interaction (STT & TTS)
- **Voice Input (Speech-to-Text)**: Speak naturally by clicking the microphone button (`🎙️`). Uses real-time browser speech recognition with fallback to Groq's high-speed **`whisper-large-v3-turbo`** model.
- **Voice Output (Text-to-Speech)**: Read assistant responses aloud with natural voices, adjustable playback speed (0.75x to 1.5x), and an optional auto-read toggle for hands-free conversational chats.

### 2. 📎 File Attachments & Intelligence
- **Documents**: Upload `.pdf` files (extracted with `pypdf`), text, markdown, CSV, JSON, and code files (`.py`, `.js`, `.ts`, `.html`, `.css`, `.sql`, etc.).
- **Audio Files**: Upload `.mp3`, `.wav`, `.m4a`, `.ogg`, or `.webm` files—transcribed into text via Groq Whisper.
- **Images & Videos**: Visual chips with file details and multimodal context.

### 3. 🌐 Multilingual Support
- Understands and converses fluently in 10+ languages: English, Español, Français, Deutsch, हिन्दी (Hindi), 中文 (Chinese), العربية (Arabic), 日本語 (Japanese), Português, and Русский.
- Dedicated language switcher dropdown in the top navigation bar.

### 4. 💻 Natural Language Programming & Accurate Mode
- **NLP & Code Engineer Mode**: Translates natural language descriptions into clean, production-ready code with step-by-step logic, edge case handling, and unit tests.
- **Accurate & Analytical Mode**: Strict fact-based reasoning with verifiable step-by-step analysis.
- **Creative Content Creator Mode**: Drafts high-converting emails, blog posts, essays, and stories.

### 5. 🎨 5 Curated UI/UX Themes
- 🌌 **Midnight Obsidian** (Default sleek dark mode with Groq flame accents)
- ⚡ **Cyberpunk Neon** (Deep navy with electric cyan and neon magenta)
- 🌲 **Aurora Borealis** (Forest slate with glowing emerald and mint accents)
- 🟣 **Deep Amethyst** (Galactic royal purple and lavender)
- ☀️ **Solar Warm** (Clean modern daylight light mode)

### 6. 💬 Chat History & Instant Search
- Multiple conversation threads persisted in `localStorage`.
- Real-time search bar in the sidebar to find past conversations.
- 1-click Markdown export (`.md`) and session management.

### 7. 🆓 Unlimited & Free
- 100% self-hosted with no subscription barriers or paywalls. Uses your free Groq API key with fast LPU inference.

---

## 🚀 Quick Launch

### 1. Configure the `.env` file
```env
GROQ_API_KEY=your_groq_api_key_here
DEFAULT_MODEL=qwen/qwen3.8-27b
PORT=5000
```

### 2. Launch the Server
- **Double click**: [`run.bat`](run.bat)
- **PowerShell**: `.\run.ps1`
- **Manual**: `.\.venv\Scripts\python.exe app.py`

### 3. Open in Browser
```
http://127.0.0.1:5000
```
