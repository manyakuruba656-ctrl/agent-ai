import os
import sys
from pathlib import Path

# Add local .venv site-packages to sys.path if running under a system/uv interpreter
_venv_site = Path(__file__).parent / ".venv" / "Lib" / "site-packages"
if _venv_site.exists() and str(_venv_site) not in sys.path:
    sys.path.insert(0, str(_venv_site))

import io
import json
import base64
from flask import Flask, render_template, request, Response, jsonify, stream_with_context
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)

app = Flask(__name__)

# Curated Groq models
AVAILABLE_MODELS = [
    {
        "id": "qwen/qwen3.8-27b",
        "name": "Qwen 3.8 27B",
        "badge": "Recommended",
        "description": "State-of-the-art open model with high intelligence, coding, and reasoning capability.",
        "context_window": "32k tokens"
    },
    {
        "id": "groq/compound",
        "name": "Groq Compound",
        "badge": "Ultra Fast",
        "description": "Optimized multi-step engine for lightning speed and accurate responses.",
        "context_window": "32k tokens"
    },
    {
        "id": "openai/gpt-oss-120b",
        "name": "GPT-OSS 120B",
        "badge": "120B",
        "description": "Massive 120B parameter open weight model with expansive reasoning depth.",
        "context_window": "64k tokens"
    },
    {
        "id": "openai/gpt-oss-20b",
        "name": "GPT-OSS 20B",
        "badge": "Efficient",
        "description": "Fast and responsive open model for day-to-day conversational tasks.",
        "context_window": "32k tokens"
    }
]

# Supported language names mapping
LANGUAGES = {
    "auto": "Auto Detect (Match User's Language)",
    "en": "English",
    "es": "Spanish (Español)",
    "fr": "French (Français)",
    "de": "German (Deutsch)",
    "hi": "Hindi (हिन्दी)",
    "zh": "Chinese (中文)",
    "ar": "Arabic (العربية)",
    "ja": "Japanese (日本語)",
    "pt": "Portuguese (Português)",
    "ru": "Russian (Русский)",
    "it": "Italian (Italiano)"
}

PERSONA_PROMPTS = {
    "coder": (
        "You are an Elite Software Engineer and Natural Language Programming Expert. "
        "You translate natural language ideas into clean, efficient, bug-free, and well-documented code. "
        "Always explain complex logic clearly, suggest best practices, include unit tests when appropriate, "
        "and format all code cleanly in markdown with explicit language tags."
    ),
    "analyst": (
        "You are an Analytical, Fact-Driven AI Assistant committed to utmost accuracy and objective reasoning. "
        "Break down queries into structured, step-by-step logic. Verify assertions, explain underlying mechanisms, "
        "and clearly acknowledge uncertainty where facts cannot be verified."
    ),
    "creative": (
        "You are a Master Content Creator, Storyteller, and Copywriter. "
        "Produce captivating, imaginative, polished, and compelling written content—including articles, essays, "
        "emails, marketing copy, video scripts, and poems—with outstanding tone and structure."
    ),
    "general": (
        "You are a helpful, versatile, and highly capable AI assistant powered by Groq's high-speed inference engine. "
        "Provide direct, concise, and accurate answers across all topics."
    )
}

def get_api_key():
    """Retrieve and validate the Groq API key from environment."""
    load_dotenv(override=True)
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key or key == "your_groq_api_key_here":
        return None
    return key

def get_client(api_key=None):
    """Instantiate the Groq client."""
    from groq import Groq
    key = api_key or get_api_key()
    if not key:
        return None
    return Groq(api_key=key)

@app.route("/")
def index():
    """Render the main chat web interface."""
    return render_template("index.html")

@app.route("/api/status", methods=["GET"])
def get_status():
    """Check API key configuration status."""
    key = get_api_key()
    has_key = key is not None and len(key) > 8
    preview = f"{key[:4]}...{key[-4:]}" if has_key else ""
    default_model = os.getenv("DEFAULT_MODEL", "qwen/qwen3.8-27b")
    return jsonify({
        "configured": has_key,
        "key_preview": preview,
        "default_model": default_model,
        "status": "ready" if has_key else "needs_key"
    })

@app.route("/api/models", methods=["GET"])
def get_models():
    """Return available models list."""
    default_model = os.getenv("DEFAULT_MODEL", "qwen/qwen3.8-27b")
    return jsonify({
        "models": AVAILABLE_MODELS,
        "default_model": default_model
    })

@app.route("/api/save-key", methods=["POST"])
def save_api_key():
    """Allows user to update the Groq API key directly into .env."""
    data = request.get_json() or {}
    new_key = data.get("api_key", "").strip()
    
    if not new_key or not new_key.startswith("gsk_"):
        return jsonify({
            "error": "Invalid Groq API key format. Keys typically start with 'gsk_'."
        }), 400

    env_path = os.path.join(os.path.dirname(__file__), ".env")
    lines = []
    found = False
    
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            lines = f.readlines()
            
    new_lines = []
    for line in lines:
        if line.strip().startswith("GROQ_API_KEY="):
            new_lines.append(f"GROQ_API_KEY={new_key}\n")
            found = True
        else:
            new_lines.append(line)
            
    if not found:
        new_lines.append(f"\nGROQ_API_KEY={new_key}\n")
        
    with open(env_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)
        
    os.environ["GROQ_API_KEY"] = new_key
    load_dotenv(override=True)
    
    return jsonify({
        "success": True,
        "message": "Groq API key successfully updated in .env"
    })

@app.route("/api/upload-file", methods=["POST"])
def upload_file():
    """
    Parse uploaded documents (PDF, text, code, CSV), images, audio, or video files.
    """
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded."}), 400

    file = request.files["file"]
    filename = file.filename or "uploaded_file"
    file_bytes = file.read()
    file_size = len(file_bytes)

    # Calculate human-readable size
    if file_size < 1024:
        size_str = f"{file_size} B"
    elif file_size < 1024 * 1024:
        size_str = f"{file_size / 1024:.1f} KB"
    else:
        size_str = f"{file_size / (1024 * 1024):.1f} MB"

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    # 1. PDF Documents
    if ext == "pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(file_bytes))
            pages_text = []
            max_pages = min(len(reader.pages), 30)
            for i in range(max_pages):
                txt = reader.pages[i].extract_text()
                if txt:
                    pages_text.append(f"--- Page {i+1} ---\n{txt}")
            extracted = "\n\n".join(pages_text)
            if len(reader.pages) > 30:
                extracted += f"\n\n[Note: Document truncated at 30 pages out of {len(reader.pages)} total]"

            return jsonify({
                "filename": filename,
                "file_type": "document",
                "icon": "📄",
                "size_str": size_str,
                "text_content": f"[Attached Document: {filename} ({len(reader.pages)} pages)]\n\n{extracted}",
                "summary": f"PDF document with {len(reader.pages)} pages ({size_str})"
            })
        except Exception as e:
            return jsonify({"error": f"Failed to extract text from PDF: {str(e)}"}), 400

    # 2. Text & Code files
    text_extensions = {
        "txt", "md", "csv", "tsv", "json", "xml", "html", "htm", "css",
        "js", "ts", "py", "java", "c", "cpp", "h", "cs", "go", "rs", "php",
        "rb", "swift", "kt", "sql", "sh", "bat", "ps1", "yml", "yaml", "env", "log"
    }
    if ext in text_extensions:
        try:
            text = file_bytes.decode("utf-8", errors="replace")
            # Truncate if excessively large (> 120,000 chars)
            if len(text) > 120000:
                text = text[:120000] + "\n...[File truncated to 120k characters for context limit]"
            return jsonify({
                "filename": filename,
                "file_type": "document",
                "icon": "📝",
                "size_str": size_str,
                "text_content": f"[Attached File: {filename} ({size_str})]\n```{ext}\n{text}\n```",
                "summary": f"Code/Text file: {filename} ({size_str})"
            })
        except Exception as e:
            return jsonify({"error": f"Failed to read text file: {str(e)}"}), 400

    # 3. Audio files (Transcribe via Groq Whisper!)
    audio_extensions = {"mp3", "wav", "m4a", "ogg", "webm", "aac", "flac"}
    if ext in audio_extensions:
        api_key = get_api_key()
        if not api_key:
            return jsonify({"error": "GROQ_API_KEY required for audio transcription."}), 401
        try:
            client = get_client(api_key)
            transcription = client.audio.transcriptions.create(
                file=(filename, file_bytes),
                model="whisper-large-v3-turbo"
            )
            transcript_text = transcription.text.strip()
            return jsonify({
                "filename": filename,
                "file_type": "audio",
                "icon": "🎙️",
                "size_str": size_str,
                "text_content": f"[Audio Transcript for {filename} ({size_str})]:\n\"{transcript_text}\"",
                "summary": f"Audio transcribed with Groq Whisper ({len(transcript_text.split())} words)"
            })
        except Exception as e:
            return jsonify({"error": f"Audio transcription failed: {str(e)}"}), 500

    # 4. Images
    image_extensions = {"png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"}
    if ext in image_extensions:
        mime = f"image/{'svg+xml' if ext == 'svg' else ext}"
        b64 = base64.b64encode(file_bytes).decode("utf-8")
        data_url = f"data:{mime};base64,{b64}"
        return jsonify({
            "filename": filename,
            "file_type": "image",
            "icon": "🖼️",
            "size_str": size_str,
            "data_url": data_url,
            "text_content": f"[Attached Image: {filename} ({size_str})]",
            "summary": f"Image file: {filename} ({size_str})"
        })

    # 5. Videos
    video_extensions = {"mp4", "webm", "mov", "avi", "mkv"}
    if ext in video_extensions:
        return jsonify({
            "filename": filename,
            "file_type": "video",
            "icon": "🎬",
            "size_str": size_str,
            "text_content": f"[Attached Video File: {filename} ({size_str})]",
            "summary": f"Video file: {filename} ({size_str})"
        })

    # Fallback generic file
    return jsonify({
        "filename": filename,
        "file_type": "other",
        "icon": "📎",
        "size_str": size_str,
        "text_content": f"[Attached File: {filename} ({size_str})]",
        "summary": f"File: {filename} ({size_str})"
    })

@app.route("/api/transcribe", methods=["POST"])
def transcribe_audio():
    """
    Transcribe microphone recording chunks using Groq Whisper.
    """
    api_key = get_api_key()
    if not api_key:
        return jsonify({"error": "GROQ_API_KEY is not configured."}), 401

    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided."}), 400

    audio_file = request.files["audio"]
    audio_bytes = audio_file.read()
    filename = audio_file.filename or "recording.webm"
    language = request.form.get("language")

    try:
        client = get_client(api_key)
        kwargs = {
            "file": (filename, audio_bytes),
            "model": "whisper-large-v3-turbo"
        }
        if language and language != "auto" and language in LANGUAGES:
            kwargs["language"] = language

        transcription = client.audio.transcriptions.create(**kwargs)
        return jsonify({
            "text": transcription.text.strip()
        })
    except Exception as e:
        return jsonify({"error": f"Transcription error: {str(e)}"}), 500

@app.route("/api/chat", methods=["POST"])
def chat():
    """
    Handle chat completions with streaming SSE, persona modes, and multilingual support.
    """
    api_key = get_api_key()
    if not api_key:
        return jsonify({
            "error": "GROQ_API_KEY is not configured. Please add your key to the .env file or use the settings dialog."
        }), 401

    data = request.get_json() or {}
    messages = data.get("messages", [])
    model = data.get("model") or os.getenv("DEFAULT_MODEL", "qwen/qwen3.8-27b")
    temperature = float(data.get("temperature", 0.7))
    max_tokens = int(data.get("max_tokens", 4096))
    custom_system_prompt = data.get("system_prompt", "").strip()
    persona = data.get("persona", "general")
    language = data.get("language", "auto")
    stream = data.get("stream", True)

    if not messages:
        return jsonify({"error": "No messages provided."}), 400

    # Build effective system prompt
    base_persona_text = PERSONA_PROMPTS.get(persona, PERSONA_PROMPTS["general"])
    prompt_parts = [base_persona_text]

    if custom_system_prompt:
        prompt_parts.append(f"User Custom Instructions: {custom_system_prompt}")

    if language and language != "auto" and language in LANGUAGES:
        target_lang = LANGUAGES[language]
        prompt_parts.append(f"LANGUAGE DIRECTIVE: You MUST formulate your entire response in {target_lang}.")

    effective_system_prompt = "\n\n".join(prompt_parts)

    formatted_messages = [{"role": "system", "content": effective_system_prompt}]
    for msg in messages:
        if msg.get("role") in ("user", "assistant") and msg.get("content"):
            formatted_messages.append({
                "role": msg.get("role"),
                "content": msg.get("content")
            })

    try:
        client = get_client(api_key)
    except Exception as e:
        return jsonify({"error": f"Failed to initialize Groq client: {str(e)}"}), 500

    if not stream:
        try:
            completion = client.chat.completions.create(
                model=model,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=False
            )
            reply = completion.choices[0].message.content
            return jsonify({
                "reply": reply,
                "model": model,
                "usage": {
                    "prompt_tokens": getattr(completion.usage, "prompt_tokens", 0),
                    "completion_tokens": getattr(completion.usage, "completion_tokens", 0),
                    "total_tokens": getattr(completion.usage, "total_tokens", 0)
                }
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    # Streaming mode via Server-Sent Events (SSE)
    def generate():
        try:
            response = client.chat.completions.create(
                model=model,
                messages=formatted_messages,
                temperature=temperature,
                max_tokens=max_tokens,
                stream=True
            )
            for chunk in response:
                if chunk.choices and len(chunk.choices) > 0:
                    delta = chunk.choices[0].delta
                    content = getattr(delta, "content", None)
                    if content:
                        yield f"data: {json.dumps({'content': content})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            error_msg = str(e)
            yield f"data: {json.dumps({'error': error_msg})}\n\n"
            yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive"
        }
    )

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() in ("true", "1")
    print(f"[*] Starting Groq Chatbot server on http://127.0.0.1:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
