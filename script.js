/* ==========================================================
 * ARIA - Advanced Reception Intelligence Assistant (Direct Mode)
 * ========================================================== */

// ضع مفتاح الـ API الخاص بك هنا مباشرة (يبدأ بـ AIzaSy... أو المفتاح المباشر لديك)
const GEMINI_API_KEY = 'AQ.Ab8RN6K7CI2aNCa0WTwq01y6pOrScpUNA3nJHFtxlpjCXhxg0Q';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY;

let recognition = null;
let isListening = false;
let isMuted = false;
let isProcessing = false;

window.addEventListener('load', () => {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.getVoices();
  }
  setHint('STANDBY · اضغط للبدء', 'info');
  testConnection();
});

function testConnection() {
  const connStatus = document.getElementById('connStatus');
  if (connStatus) {
    connStatus.className = 'status-badge online';
    connStatus.innerHTML = '<span class="status-icon">◆</span><span class="status-text">ONLINE</span>';
  }
}

function setHint(text, type = 'info') {
  const hint = document.getElementById('hint');
  if (hint) {
    hint.textContent = text;
  }
}

function toggleListening() {
  if (isListening) {
    stopListening();
  } else {
    startListening();
  }
}

function startListening() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    alert('متصفحك لا يدعم التعرف على الصوت. يمكنك الكتابة مباشرة.');
    return;
  }

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.lang = 'ar-SA';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = function() {
    isListening = true;
    document.getElementById('micBtn').classList.add('active');
    document.getElementById('micIcon').style.display = 'none';
    document.getElementById('stopIcon').style.display = 'block';
    setHint('جاري الاستماع...', 'listening');
  };

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    appendMessage(transcript, 'user');
    handleUserMessage(transcript);
  };

  recognition.onerror = function() {
    stopListening();
    setHint('حدث خطأ في الصوت، حاول مرة أخرى', 'error');
  };

  recognition.onend = function() {
    stopListening();
  };

  try {
    recognition.start();
  } catch (e) {
    stopListening();
  }
}

function stopListening() {
  isListening = false;
  const micBtn = document.getElementById('micBtn');
  if (micBtn) micBtn.classList.remove('active');
  
  const micIcon = document.getElementById('micIcon');
  const stopIcon = document.getElementById('stopIcon');
  if (micIcon) micIcon.style.display = 'block';
  if (stopIcon) stopIcon.style.display = 'none';
  
  setHint('STANDBY · اضغط للبدء', 'info');
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
  }
}

async function handleUserMessage(message) {
  if (isProcessing) return;
  isProcessing = true;
  setHint('جاري المعالجة...', 'processing');

  try {
    const responseText = await callGeminiDirectly(message);
    appendMessage(responseText, 'bot');
    speak(responseText);
    setHint('STANDBY · اضغط للبدء', 'info');
  } catch (err) {
    appendMessage('SYSTEM ERROR · فشل الاتصال بالذكاء الاصطناعي', 'bot-error');
    setHint('CONNECTION FAILED', 'error');
  } finally {
    isProcessing = false;
  }
}

async function callGeminiDirectly(userMessage) {
  const systemPrompt = 'أنتِ "ARIA"، موظفة استقبال ذكية وودودة. أجب باختصار واحترافية (2-3 جمل). السؤال: ' + userMessage;
  
  const response = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 800 }
    })
  });

  if (!response.ok) {
    throw new Error('Network response was not ok');
  }

  const data = await response.json();
  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    return data.candidates[0].content.parts[0].text.trim();
  }
  return 'عذراً، لم أستطع فهم الرد.';
}

function appendMessage(text, sender) {
  const consoleBox = document.getElementById('conversation');
  if (!consoleBox) return;

  const line = document.createElement('div');
  line.className = `console-line ${sender === 'user' ? 'user-line' : sender === 'bot-error' ? 'bot-error-line' : 'bot-line'}`;
  
  const tag = document.createElement('span');
  tag.className = 'console-tag';
  tag.textContent = sender === 'user' ? '[YOU]' : '[ARIA]';

  const content = document.createElement('span');
  content.className = 'console-text';
  content.textContent = text;

  line.appendChild(tag);
  line.appendChild(content);
  consoleBox.appendChild(line);
  consoleBox.scrollTop = consoleBox.scrollHeight;
}

function speak(text) {
  if (isMuted) return;
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ar-SA';
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }
}

function toggleMute() {
  isMuted = !isMuted;
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) {
    muteBtn.classList.toggle('muted', isMuted);
  }
  if (isMuted && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
  }
}

function clearChat() {
  const consoleBox = document.getElementById('conversation');
  if (consoleBox) {
    consoleBox.innerHTML = `
      <div class="console-line bot-line">
        <span class="console-tag">[ARIA]</span>
        <span class="console-text">مرحباً بك. أنا ARIA، جاهزة لمساعدتك.</span>
      </div>
    `;
  }
}
