/* --------------------------------------------------
   GroqBot 2.0 - Client Application Logic
   -------------------------------------------------- */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatContainer = document.getElementById('chatContainer');
    const messagesList = document.getElementById('messagesList');
    const welcomeScreen = document.getElementById('welcomeScreen');
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    const sendIcon = sendBtn.querySelector('.send-icon');
    const stopIcon = sendBtn.querySelector('.stop-icon');
    const charCounter = document.getElementById('charCounter');
    const modelSelect = document.getElementById('modelSelect');
    const personaSelect = document.getElementById('personaSelect');
    const languageSelect = document.getElementById('languageSelect');
    const newChatBtn = document.getElementById('newChatBtn');
    const clearChatBtn = document.getElementById('clearChatBtn');
    const exportChatBtn = document.getElementById('exportChatBtn');
    const clearAllSessionsBtn = document.getElementById('clearAllSessionsBtn');
    const sessionsList = document.getElementById('sessionsList');
    const historySearchInput = document.getElementById('historySearchInput');
    const missingKeyBanner = document.getElementById('missingKeyBanner');
    const bannerConfigureBtn = document.getElementById('bannerConfigureBtn');
    const apiStatusBadge = document.getElementById('apiStatusBadge');
    const apiStatusText = document.getElementById('apiStatusText');
    const quickThemeBtn = document.getElementById('quickThemeBtn');
    const activeThemeLabel = document.getElementById('activeThemeLabel');
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('openSidebarBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarBackdrop = document.getElementById('sidebarBackdrop');

    // Attachments & Voice Elements
    const attachFileBtn = document.getElementById('attachFileBtn');
    const fileUploadInput = document.getElementById('fileUploadInput');
    const attachmentsTray = document.getElementById('attachmentsTray');
    const voiceInputBtn = document.getElementById('voiceInputBtn');

    // Settings Modal Elements
    const settingsModal = document.getElementById('settingsModal');
    const openSettingsBtn = document.getElementById('openSettingsBtn');
    const closeSettingsBtn = document.getElementById('closeSettingsBtn');
    const cancelSettingsBtn = document.getElementById('cancelSettingsBtn');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const modalApiKey = document.getElementById('modalApiKey');
    const toggleApiKeyVisibility = document.getElementById('toggleApiKeyVisibility');
    const modalSystemPrompt = document.getElementById('modalSystemPrompt');
    const temperatureSlider = document.getElementById('temperatureSlider');
    const tempValue = document.getElementById('tempValue');
    const ttsRateSlider = document.getElementById('ttsRateSlider');
    const ttsRateValue = document.getElementById('ttsRateValue');
    const autoReadCheckbox = document.getElementById('autoReadCheckbox');
    const themeGrid = document.getElementById('themeGrid');
    const toastContainer = document.getElementById('toastContainer');

    // Application State
    let activeSessionId = null;
    let sessions = [];
    let isGenerating = false;
    let abortController = null;
    let attachedFiles = []; // [{ filename, icon, size_str, text_content }]
    let activeUtterance = null;
    let currentSpeakingBtn = null;

    // Preferences (localStorage)
    let savedTheme = localStorage.getItem('groq_theme');
    let currentTheme = (savedTheme === 'light' || savedTheme === 'solar') ? 'light' : 'dark';
    let systemPrompt = localStorage.getItem('groq_system_prompt') || '';
    let temperature = parseFloat(localStorage.getItem('groq_temperature') || '0.7');
    let ttsRate = parseFloat(localStorage.getItem('groq_tts_rate') || '1.0');
    let autoRead = localStorage.getItem('groq_auto_read') === 'true';
    let selectedPersona = localStorage.getItem('groq_persona') || 'general';
    let selectedLanguage = localStorage.getItem('groq_language') || 'auto';

    // Voice Recording State
    let isRecording = false;
    let speechRecognition = null;
    let mediaRecorder = null;
    let audioChunks = [];

    // Configure Marked.js
    if (window.marked) {
        marked.setOptions({
            breaks: true,
            gfm: true,
            highlight: function(code, lang) {
                if (window.hljs && lang && hljs.getLanguage(lang)) {
                    try {
                        return hljs.highlight(code, { language: lang }).value;
                    } catch (e) {
                        console.error('Highlight error', e);
                    }
                }
                return code;
            }
        });
    }

    // --------------------------------------------------
    // Initialization
    // --------------------------------------------------
    function init() {
        applyTheme(currentTheme);
        loadSessions();
        checkApiStatus();
        fetchModels();
        setupEventListeners();
        setupSpeechRecognition();

        // Restore saved settings values in UI
        personaSelect.value = selectedPersona;
        languageSelect.value = selectedLanguage;
        temperatureSlider.value = temperature;
        tempValue.textContent = temperature.toFixed(2);
        ttsRateSlider.value = ttsRate;
        ttsRateValue.textContent = `${ttsRate.toFixed(2)}x`;
        autoReadCheckbox.checked = autoRead;
        modalSystemPrompt.value = systemPrompt;
    }

    // --------------------------------------------------
    // Theme Management
    // --------------------------------------------------
    const THEMES = {
        dark: 'Dark',
        light: 'Light'
    };

    function applyTheme(themeKey) {
        if (themeKey !== 'light') themeKey = 'dark';
        currentTheme = themeKey;
        document.documentElement.setAttribute('data-theme', themeKey);
        localStorage.setItem('groq_theme', themeKey);

        if (window.setKineticTheme) {
            window.setKineticTheme(themeKey);
        }

        if (activeThemeLabel) {
            activeThemeLabel.textContent = THEMES[themeKey];
        }

        // Highlight active theme in settings
        document.querySelectorAll('.theme-card-btn').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-theme-val') === themeKey);
        });

        // Update highlight.js theme for light/dark
        const hljsLink = document.getElementById('hljs-theme');
        if (hljsLink) {
            if (themeKey === 'light') {
                hljsLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css';
            } else {
                hljsLink.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark-dimmed.min.css';
            }
        }
    }

    function cycleTheme() {
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        applyTheme(nextTheme);
        showToast(`Switched to ${THEMES[nextTheme]} Mode`, 'info');
    }

    // --------------------------------------------------
    // API Status Check & Models
    // --------------------------------------------------
    async function checkApiStatus() {
        try {
            const res = await fetch('/api/status');
            const data = await res.json();
            const statusDot = apiStatusBadge.querySelector('.status-dot');

            if (data.configured) {
                statusDot.className = 'status-dot connected';
                apiStatusText.textContent = `Connected (${data.key_preview})`;
                missingKeyBanner.classList.add('hidden');
            } else {
                statusDot.className = 'status-dot error';
                apiStatusText.textContent = 'API Key Needed';
                missingKeyBanner.classList.remove('hidden');
            }

            if (data.default_model && !localStorage.getItem('groq_selected_model')) {
                modelSelect.value = data.default_model;
            }
        } catch (err) {
            console.warn('Status check failed', err);
            apiStatusText.textContent = 'Offline / Error';
        }
    }

    async function fetchModels() {
        try {
            const res = await fetch('/api/models');
            const data = await res.json();
            if (data.models && data.models.length > 0) {
                const savedModel = localStorage.getItem('groq_selected_model') || data.default_model;
                modelSelect.innerHTML = '';
                data.models.forEach(m => {
                    const opt = document.createElement('option');
                    opt.value = m.id;
                    opt.textContent = `${m.name} (${m.badge})`;
                    if (m.id === savedModel) opt.selected = true;
                    modelSelect.appendChild(opt);
                });
            }
        } catch (err) {
            console.error('Failed to load models list', err);
        }
    }

    // --------------------------------------------------
    // Session & History Management
    // --------------------------------------------------
    function loadSessions() {
        try {
            const saved = localStorage.getItem('groq_sessions');
            sessions = saved ? JSON.parse(saved) : [];
        } catch (e) {
            sessions = [];
        }

        if (sessions.length === 0) {
            createNewSession();
        } else {
            activeSessionId = sessions[0].id;
            renderSessionsList();
            renderActiveSessionMessages();
        }
    }

    function saveSessions() {
        localStorage.setItem('groq_sessions', JSON.stringify(sessions));
        renderSessionsList();
    }

    function getActiveSession() {
        return sessions.find(s => s.id === activeSessionId);
    }

    function createNewSession() {
        stopVoiceSpeech();
        const newSession = {
            id: 'session_' + Date.now(),
            title: 'New Conversation',
            createdAt: new Date().toISOString(),
            messages: []
        };
        sessions.unshift(newSession);
        activeSessionId = newSession.id;
        clearAttachments();
        saveSessions();
        renderActiveSessionMessages();
        closeSidebarOnMobile();
        chatInput.focus();
    }

    function switchSession(id) {
        if (isGenerating) {
            showToast('Please wait for generation to complete or stop it first.', 'info');
            return;
        }
        stopVoiceSpeech();
        activeSessionId = id;
        clearAttachments();
        saveSessions();
        renderActiveSessionMessages();
        closeSidebarOnMobile();
    }

    function deleteSession(id, e) {
        e.stopPropagation();
        sessions = sessions.filter(s => s.id !== id);
        if (sessions.length === 0) {
            createNewSession();
        } else if (activeSessionId === id) {
            activeSessionId = sessions[0].id;
        }
        saveSessions();
        renderActiveSessionMessages();
    }

    function clearAllSessions() {
        if (confirm('Are you sure you want to clear all chat history?')) {
            stopVoiceSpeech();
            sessions = [];
            createNewSession();
            showToast('Chat history cleared', 'info');
        }
    }

    function renderSessionsList(filterQuery = '') {
        sessionsList.innerHTML = '';
        const q = filterQuery.toLowerCase().trim();

        const filtered = q
            ? sessions.filter(s => s.title.toLowerCase().includes(q) || s.messages.some(m => m.content.toLowerCase().includes(q)))
            : sessions;

        if (filtered.length === 0) {
            const empty = document.createElement('div');
            empty.style.cssText = 'padding: 12px; font-size: 0.8rem; color: var(--text-muted); text-align: center;';
            empty.textContent = 'No matching chats found.';
            sessionsList.appendChild(empty);
            return;
        }

        filtered.forEach(s => {
            const item = document.createElement('div');
            item.className = `session-item ${s.id === activeSessionId ? 'active' : ''}`;
            item.innerHTML = `
                <span class="session-title" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
                <button class="session-delete-btn" title="Delete chat" aria-label="Delete chat">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" stroke-width="2" fill="none"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                </button>
            `;
            item.addEventListener('click', () => switchSession(s.id));
            item.querySelector('.session-delete-btn').addEventListener('click', (e) => deleteSession(s.id, e));
            sessionsList.appendChild(item);
        });
    }

    function renderActiveSessionMessages() {
        const session = getActiveSession();
        messagesList.innerHTML = '';

        if (!session || session.messages.length === 0) {
            welcomeScreen.style.display = 'flex';
        } else {
            welcomeScreen.style.display = 'none';
            session.messages.forEach(msg => {
                appendMessageToDOM(msg.role, msg.content, false);
            });
            scrollToBottom();
        }
    }

    // --------------------------------------------------
    // DOM Message Rendering
    // --------------------------------------------------
    function appendMessageToDOM(role, text, isStreaming = false) {
        welcomeScreen.style.display = 'none';

        const row = document.createElement('div');
        row.className = `message-row ${role === 'user' ? 'user' : 'bot'}`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = role === 'user' ? '👤' : '⚙';

        const bubble = document.createElement('div');
        bubble.className = 'message-bubble';

        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';

        if (role === 'user') {
            contentDiv.textContent = text;
        } else {
            contentDiv.innerHTML = formatMarkdown(text);
            if (isStreaming) {
                const cursor = document.createElement('span');
                cursor.className = 'streaming-cursor';
                contentDiv.appendChild(cursor);
            }
        }

        bubble.appendChild(contentDiv);

        // Assistant Message Actions (Copy & Read Aloud)
        if (role !== 'user' && !isStreaming) {
            const meta = document.createElement('div');
            meta.className = 'message-meta';
            meta.innerHTML = `
                <button class="meta-action-btn speak-msg-btn" title="Read aloud (Voice TTS)">
                    <span>🔊</span>
                    <span>Speak</span>
                </button>
                <button class="meta-action-btn copy-msg-btn" title="Copy text">
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>Copy</span>
                </button>
            `;

            const speakBtn = meta.querySelector('.speak-msg-btn');
            speakBtn.addEventListener('click', () => toggleReadAloud(text, speakBtn));

            meta.querySelector('.copy-msg-btn').addEventListener('click', () => {
                navigator.clipboard.writeText(text);
                showToast('Copied to clipboard!', 'success');
            });

            bubble.appendChild(meta);
        }

        row.appendChild(avatar);
        row.appendChild(bubble);
        messagesList.appendChild(row);

        attachCodeCopyButtons(bubble);
        scrollToBottom();
        return { row, bubble, contentDiv };
    }

    function formatMarkdown(text) {
        if (!window.marked) return escapeHtml(text);
        try {
            return marked.parse(text);
        } catch (e) {
            return escapeHtml(text);
        }
    }

    function attachCodeCopyButtons(container) {
        const preBlocks = container.querySelectorAll('pre');
        preBlocks.forEach(pre => {
            if (pre.parentElement.classList.contains('code-block-wrapper')) return;

            const wrapper = document.createElement('div');
            wrapper.className = 'code-block-wrapper';

            const codeEl = pre.querySelector('code');
            const lang = (codeEl?.className.match(/language-(\w+)/) || [])[1] || 'code';

            const header = document.createElement('div');
            header.className = 'code-header';
            header.innerHTML = `
                <span>${lang}</span>
                <button class="copy-code-btn" title="Copy code">
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>Copy</span>
                </button>
            `;

            header.querySelector('.copy-code-btn').addEventListener('click', () => {
                const code = codeEl ? codeEl.innerText : pre.innerText;
                navigator.clipboard.writeText(code);
                const btn = header.querySelector('.copy-code-btn span');
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy'; }, 2000);
            });

            pre.parentNode.insertBefore(wrapper, pre);
            wrapper.appendChild(header);
            wrapper.appendChild(pre);
        });
    }

    function scrollToBottom() {
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // --------------------------------------------------
    // File Ingestion & Attachments
    // --------------------------------------------------
    function handleFileSelect(e) {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;
        uploadFiles(files);
        fileUploadInput.value = '';
    }

    async function uploadFiles(files) {
        for (const file of files) {
            showToast(`Uploading & processing ${file.name}...`, 'info');
            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/upload-file', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to upload file');

                attachedFiles.push({
                    filename: data.filename,
                    icon: data.icon || '📎',
                    size_str: data.size_str,
                    text_content: data.text_content
                });

                renderAttachmentsTray();
                showToast(`Attached: ${data.filename}`, 'success');
            } catch (err) {
                showToast(`File error: ${err.message}`, 'error');
            }
        }
    }

    function renderAttachmentsTray() {
        attachmentsTray.innerHTML = '';
        attachedFiles.forEach((f, idx) => {
            const card = document.createElement('div');
            const isImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(f.filename);
            const ext = f.filename.includes('.') ? f.filename.split('.').pop().toUpperCase() : 'FILE';
            card.className = 'attachment-card-multimodal';
            card.innerHTML = `
                <div class="attachment-icon-badge">${isImage ? '📷' : (f.icon || '📄')}</div>
                <div class="attachment-details">
                    <div class="attachment-filename" title="${escapeHtml(f.filename)}">${escapeHtml(f.filename)}</div>
                    <div class="attachment-meta">
                        <span class="attachment-type-pill">${ext}</span>
                        <span class="attachment-size">${f.size_str}</span>
                        <span class="attachment-ready-badge">✓ Ready</span>
                    </div>
                </div>
                <button class="chip-remove-btn" title="Remove attachment" type="button" aria-label="Remove attachment">&times;</button>
            `;
            card.querySelector('.chip-remove-btn').addEventListener('click', () => {
                attachedFiles.splice(idx, 1);
                renderAttachmentsTray();
            });
            attachmentsTray.appendChild(card);
        });
    }

    function clearAttachments() {
        attachedFiles = [];
        renderAttachmentsTray();
    }

    // --------------------------------------------------
    // Voice Interaction (STT & TTS)
    // --------------------------------------------------
    function setupSpeechRecognition() {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRec) {
            speechRecognition = new SpeechRec();
            speechRecognition.continuous = false;
            speechRecognition.interimResults = true;

            speechRecognition.onstart = () => {
                isRecording = true;
                voiceInputBtn.classList.add('recording');
                showToast('Listening... Speak now', 'info');
            };

            speechRecognition.onresult = (e) => {
                let transcript = '';
                for (let i = e.resultIndex; i < e.results.length; i++) {
                    transcript += e.results[i][0].transcript;
                }
                chatInput.value = (chatInput.value + ' ' + transcript).trim();
                updateCharCounter();
                autoResizeTextarea();
            };

            speechRecognition.onerror = (e) => {
                console.warn('Speech recognition error:', e.error);
                stopVoiceRecording();
            };

            speechRecognition.onend = () => {
                stopVoiceRecording();
            };
        }
    }

    async function toggleVoiceRecording() {
        if (isRecording) {
            stopVoiceRecording();
            return;
        }

        // Try Web Speech Recognition first
        if (speechRecognition) {
            try {
                const lang = languageSelect.value;
                if (lang && lang !== 'auto') {
                    speechRecognition.lang = lang;
                }
                speechRecognition.start();
                return;
            } catch (err) {
                console.warn('SpeechRecognition failed, falling back to MediaRecorder Whisper', err);
            }
        }

        // Fallback: Audio recording + Groq Whisper
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            showToast('Voice input is not supported in this browser.', 'error');
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorder = new MediaRecorder(stream);
            audioChunks = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) audioChunks.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
                showToast('Transcribing audio with Groq Whisper...', 'info');

                const formData = new FormData();
                formData.append('audio', audioBlob, 'voice_recording.webm');
                formData.append('language', languageSelect.value);

                try {
                    const res = await fetch('/api/transcribe', { method: 'POST', body: formData });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || 'Failed to transcribe audio');
                    if (data.text) {
                        chatInput.value = (chatInput.value + ' ' + data.text).trim();
                        updateCharCounter();
                        autoResizeTextarea();
                        showToast('Voice transcribed!', 'success');
                    }
                } catch (err) {
                    showToast(err.message, 'error');
                } finally {
                    stream.getTracks().forEach(track => track.stop());
                }
            };

            mediaRecorder.start();
            isRecording = true;
            voiceInputBtn.classList.add('recording');
            showToast('Recording audio... Click again to send to Whisper.', 'info');

        } catch (err) {
            showToast('Microphone access denied.', 'error');
        }
    }

    function stopVoiceRecording() {
        isRecording = false;
        voiceInputBtn.classList.remove('recording');

        if (speechRecognition) {
            try { speechRecognition.stop(); } catch (e) {}
        }
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
        }
    }

    // Voice Output (TTS)
    function toggleReadAloud(text, buttonElement) {
        if (!window.speechSynthesis) {
            showToast('Text-to-Speech not supported in this browser.', 'error');
            return;
        }

        if (window.speechSynthesis.speaking && currentSpeakingBtn === buttonElement) {
            stopVoiceSpeech();
            return;
        }

        stopVoiceSpeech();

        // Strip markdown syntax for clean audio speech
        const cleanText = text
            .replace(/```[\s\S]*?```/g, ' Code snippet omitted. ')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/[*_#~]/g, '')
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');

        activeUtterance = new SpeechSynthesisUtterance(cleanText);
        activeUtterance.rate = ttsRate;

        // Auto select voice matching language if available
        const lang = languageSelect.value;
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0 && lang && lang !== 'auto') {
            const matchedVoice = voices.find(v => v.lang.startsWith(lang));
            if (matchedVoice) activeUtterance.voice = matchedVoice;
        }

        currentSpeakingBtn = buttonElement;
        if (currentSpeakingBtn) {
            currentSpeakingBtn.classList.add('speaking');
            currentSpeakingBtn.querySelector('span:last-child').textContent = 'Stop';
        }

        activeUtterance.onend = () => {
            stopVoiceSpeech();
        };

        activeUtterance.onerror = () => {
            stopVoiceSpeech();
        };

        window.speechSynthesis.speak(activeUtterance);
    }

    function stopVoiceSpeech() {
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
        if (currentSpeakingBtn) {
            currentSpeakingBtn.classList.remove('speaking');
            const span = currentSpeakingBtn.querySelector('span:last-child');
            if (span) span.textContent = 'Speak';
            currentSpeakingBtn = null;
        }
        activeUtterance = null;
    }

    // --------------------------------------------------
    // Chat Generation & Streaming
    // --------------------------------------------------
    async function handleSendMessage(promptText = null) {
        let text = (promptText || chatInput.value).trim();
        if ((!text && attachedFiles.length === 0) || isGenerating) return;

        const session = getActiveSession();
        if (!session) return;

        stopVoiceSpeech();

        // If files are attached, prepend their content to user prompt
        if (attachedFiles.length > 0) {
            const filesContext = attachedFiles.map(f => f.text_content).join('\n\n');
            text = text ? `${filesContext}\n\n${text}` : filesContext;
            clearAttachments();
        }

        // Auto-title session on first message
        if (session.messages.length === 0) {
            session.title = text.slice(0, 32).replace(/\n/g, ' ') + (text.length > 32 ? '...' : '');
            saveSessions();
        }

        // Add user message
        session.messages.push({ role: 'user', content: text });
        appendMessageToDOM('user', text, false);

        chatInput.value = '';
        updateCharCounter();
        autoResizeTextarea();

        setGeneratingState(true);

        const { bubble, contentDiv } = appendMessageToDOM('assistant', '', true);
        let fullResponse = '';

        abortController = new AbortController();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: session.messages,
                    model: modelSelect.value,
                    persona: personaSelect.value,
                    language: languageSelect.value,
                    temperature: temperature,
                    system_prompt: systemPrompt,
                    stream: true
                }),
                signal: abortController.signal
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP error ${response.status}`);
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed || !trimmed.startsWith('data: ')) continue;
                    const dataStr = trimmed.slice(6);

                    if (dataStr === '[DONE]') break;

                    try {
                        const parsed = JSON.parse(dataStr);
                        if (parsed.error) throw new Error(parsed.error);
                        if (parsed.content) {
                            fullResponse += parsed.content;
                            contentDiv.innerHTML = formatMarkdown(fullResponse) + '<span class="streaming-cursor"></span>';
                            attachCodeCopyButtons(bubble);
                            scrollToBottom();
                        }
                    } catch (parseErr) {
                        if (parseErr.message !== 'Unexpected end of JSON input') {
                            console.warn('SSE parse error:', parseErr);
                        }
                    }
                }
            }

            // Stream complete
            contentDiv.innerHTML = formatMarkdown(fullResponse || '*(No response)*');
            attachCodeCopyButtons(bubble);

            // Add action footer
            const meta = document.createElement('div');
            meta.className = 'message-meta';
            meta.innerHTML = `
                <button class="meta-action-btn speak-msg-btn" title="Read aloud (Voice TTS)">
                    <span>🔊</span>
                    <span>Speak</span>
                </button>
                <button class="meta-action-btn copy-msg-btn" title="Copy text">
                    <svg viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" stroke-width="2" fill="none"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>Copy</span>
                </button>
            `;

            const speakBtn = meta.querySelector('.speak-msg-btn');
            speakBtn.addEventListener('click', () => toggleReadAloud(fullResponse, speakBtn));

            meta.querySelector('.copy-msg-btn').addEventListener('click', () => {
                navigator.clipboard.writeText(fullResponse);
                showToast('Copied to clipboard!', 'success');
            });

            bubble.appendChild(meta);

            // Save to session
            session.messages.push({ role: 'assistant', content: fullResponse });
            saveSessions();

            // Auto-read response if enabled
            if (autoRead) {
                toggleReadAloud(fullResponse, speakBtn);
            }

        } catch (err) {
            if (err.name === 'AbortError') {
                contentDiv.innerHTML = formatMarkdown(fullResponse + '\n\n*(Generation stopped)*');
                if (fullResponse) {
                    session.messages.push({ role: 'assistant', content: fullResponse });
                    saveSessions();
                }
                showToast('Generation cancelled.', 'info');
            } else {
                contentDiv.innerHTML = `<div style="color: var(--danger); font-weight: 500;">⚠️ Error: ${escapeHtml(err.message)}</div>`;
                showToast(`Failed: ${err.message}`, 'error');
                if (err.message.includes('GROQ_API_KEY')) {
                    missingKeyBanner.classList.remove('hidden');
                }
            }
        } finally {
            setGeneratingState(false);
            scrollToBottom();
        }
    }

    function setGeneratingState(generating) {
        isGenerating = generating;
        if (generating) {
            sendIcon.classList.add('hidden');
            stopIcon.classList.remove('hidden');
            sendBtn.setAttribute('title', 'Stop generation');
        } else {
            sendIcon.classList.remove('hidden');
            stopIcon.classList.add('hidden');
            sendBtn.setAttribute('title', 'Send message');
            abortController = null;
        }
    }

    function stopGeneration() {
        if (abortController) {
            abortController.abort();
        }
    }

    // --------------------------------------------------
    // Settings Modal
    // --------------------------------------------------
    function openSettings() {
        settingsModal.classList.remove('hidden');
        modalApiKey.focus();
    }

    function closeSettings() {
        settingsModal.classList.add('hidden');
        modalApiKey.value = '';
    }

    async function handleSaveSettings() {
        const apiKeyVal = modalApiKey.value.trim();
        const sysPromptVal = modalSystemPrompt.value.trim();
        const tempVal = parseFloat(temperatureSlider.value);
        const rateVal = parseFloat(ttsRateSlider.value);
        const autoReadVal = autoReadCheckbox.checked;

        systemPrompt = sysPromptVal;
        temperature = tempVal;
        ttsRate = rateVal;
        autoRead = autoReadVal;

        localStorage.setItem('groq_system_prompt', systemPrompt);
        localStorage.setItem('groq_temperature', temperature);
        localStorage.setItem('groq_tts_rate', ttsRate);
        localStorage.setItem('groq_auto_read', autoRead);

        if (apiKeyVal) {
            try {
                saveSettingsBtn.disabled = true;
                saveSettingsBtn.textContent = 'Saving...';
                const res = await fetch('/api/save-key', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ api_key: apiKeyVal })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || 'Failed to save key');

                showToast('Groq API Key saved to .env!', 'success');
                checkApiStatus();
            } catch (err) {
                showToast(err.message, 'error');
                return;
            } finally {
                saveSettingsBtn.disabled = false;
                saveSettingsBtn.textContent = 'Save Changes';
            }
        }

        showToast('Preferences saved successfully', 'success');
        closeSettings();
    }

    // Export conversation
    function exportConversation() {
        const session = getActiveSession();
        if (!session || session.messages.length === 0) {
            showToast('No messages to export.', 'info');
            return;
        }

        let markdownContent = `# ${session.title}\n\n*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;
        session.messages.forEach(m => {
            const speaker = m.role === 'user' ? '**User**' : '**Groq Assistant**';
            markdownContent += `### ${speaker}\n\n${m.content}\n\n`;
        });

        const blob = new Blob([markdownContent], { type: 'text/markdown;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${session.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showToast('Conversation exported as Markdown!', 'success');
    }

    function clearCurrentChat() {
        const session = getActiveSession();
        if (!session) return;
        if (confirm('Clear messages in this chat?')) {
            stopVoiceSpeech();
            session.messages = [];
            clearAttachments();
            saveSessions();
            renderActiveSessionMessages();
            showToast('Conversation cleared.', 'info');
        }
    }

    // --------------------------------------------------
    // Event Listeners
    // --------------------------------------------------
    function setupEventListeners() {
        // Send / Stop
        sendBtn.addEventListener('click', () => {
            if (isGenerating) stopGeneration();
            else handleSendMessage();
        });

        // Chat Input Keyboard
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        });

        chatInput.addEventListener('input', () => {
            updateCharCounter();
            autoResizeTextarea();
        });

        // File Attachments
        attachFileBtn.addEventListener('click', () => fileUploadInput.click());
        fileUploadInput.addEventListener('change', handleFileSelect);

        // Voice Input
        voiceInputBtn.addEventListener('click', toggleVoiceRecording);

        // Generative AI Presets click
        document.querySelectorAll('.creator-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const template = btn.getAttribute('data-template');
                chatInput.value = template;
                chatInput.focus();
                autoResizeTextarea();
                updateCharCounter();
            });
        });

        // Hero Prompt Box Actions
        const heroUploadBtn = document.getElementById('heroUploadBtn');
        if (heroUploadBtn) {
            heroUploadBtn.addEventListener('click', () => fileUploadInput.click());
        }

        const heroVoiceBtn = document.getElementById('heroVoiceBtn');
        if (heroVoiceBtn) {
            heroVoiceBtn.addEventListener('click', () => toggleVoiceRecording());
        }

        const heroFocusInputBtn = document.getElementById('heroFocusInputBtn');
        if (heroFocusInputBtn) {
            heroFocusInputBtn.addEventListener('click', () => {
                chatInput.focus();
            });
        }

        const welcomePromptTrigger = document.getElementById('welcomePromptTrigger');
        if (welcomePromptTrigger) {
            welcomePromptTrigger.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                chatInput.focus();
            });
        }

        // Quick Action Cards & Try Asking Chips
        document.querySelectorAll('.quick-action-card, .try-chip').forEach(card => {
            card.addEventListener('click', () => {
                if (card.id === 'quickActionAnalyzeCard' || card.id === 'tryChipPdf') {
                    fileUploadInput.click();
                    const prompt = card.getAttribute('data-prompt');
                    if (prompt) {
                        chatInput.value = prompt;
                        autoResizeTextarea();
                        updateCharCounter();
                    }
                    return;
                }
                const prompt = card.getAttribute('data-prompt');
                if (prompt) handleSendMessage(prompt);
            });
        });

        // Dropdown changes
        modelSelect.addEventListener('change', () => {
            localStorage.setItem('groq_selected_model', modelSelect.value);
            showToast(`Model: ${modelSelect.options[modelSelect.selectedIndex].text}`, 'info');
        });

        personaSelect.addEventListener('change', () => {
            selectedPersona = personaSelect.value;
            localStorage.setItem('groq_persona', selectedPersona);
            showToast(`Mode: ${personaSelect.options[personaSelect.selectedIndex].text}`, 'info');
        });

        languageSelect.addEventListener('change', () => {
            selectedLanguage = languageSelect.value;
            localStorage.setItem('groq_language', selectedLanguage);
            showToast(`Language: ${languageSelect.options[languageSelect.selectedIndex].text}`, 'info');
        });

        // History Search
        historySearchInput.addEventListener('input', (e) => {
            renderSessionsList(e.target.value);
        });

        // Action Buttons
        newChatBtn.addEventListener('click', createNewSession);
        clearChatBtn.addEventListener('click', clearCurrentChat);
        exportChatBtn.addEventListener('click', exportConversation);
        clearAllSessionsBtn.addEventListener('click', clearAllSessions);
        quickThemeBtn.addEventListener('click', cycleTheme);

        // Mobile drawer toggles
        openSidebarBtn.addEventListener('click', () => {
            sidebar.classList.add('open');
            sidebarBackdrop.classList.add('active');
        });
        closeSidebarBtn.addEventListener('click', closeSidebarOnMobile);
        sidebarBackdrop.addEventListener('click', closeSidebarOnMobile);

        // Settings Modal events
        openSettingsBtn.addEventListener('click', openSettings);
        bannerConfigureBtn.addEventListener('click', openSettings);
        closeSettingsBtn.addEventListener('click', closeSettings);
        cancelSettingsBtn.addEventListener('click', closeSettings);
        saveSettingsBtn.addEventListener('click', handleSaveSettings);

        toggleApiKeyVisibility.addEventListener('click', () => {
            const isPass = modalApiKey.type === 'password';
            modalApiKey.type = isPass ? 'text' : 'password';
            toggleApiKeyVisibility.textContent = isPass ? '🔒' : '👁️';
        });

        temperatureSlider.addEventListener('input', () => {
            tempValue.textContent = parseFloat(temperatureSlider.value).toFixed(2);
        });

        ttsRateSlider.addEventListener('input', () => {
            ttsRateValue.textContent = `${parseFloat(ttsRateSlider.value).toFixed(2)}x`;
        });

        // Theme grid clicks in settings
        document.querySelectorAll('.theme-card-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const themeVal = btn.getAttribute('data-theme-val');
                applyTheme(themeVal);
            });
        });

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !settingsModal.classList.contains('hidden')) {
                closeSettings();
            }
        });
    }

    function closeSidebarOnMobile() {
        sidebar.classList.remove('open');
        sidebarBackdrop.classList.remove('active');
    }

    function autoResizeTextarea() {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 220) + 'px';
    }

    function updateCharCounter() {
        const len = chatInput.value.length;
        charCounter.textContent = `${len.toLocaleString()} / 25,000`;
    }

    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icons = { success: '✓', error: '✕', info: 'ℹ' };
        toast.innerHTML = `<span>${icons[type] || '•'}</span><span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    function escapeHtml(text) {
        if (!text) return '';
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Run initialization
    init();
});
