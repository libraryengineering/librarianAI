/* ==========================================================
 * ARIA - Advanced Reception Intelligence Assistant
 * مع نظام JSONP لتجاوز قيود CORS واتصال مستقر
 * ========================================================== */

const API_URL = 'https://script.google.com/macros/s/AKfycbxpl1P9Qjk9IxLEdRSXnFCeqST5d_0Rhp760-pFutdT7L6nqzkqh6hXPLM4aITpKaT9/exec';

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

// فحص الاتصال بالخادم عبر JSONP
function testConnection() {
  const connStatus = document.getElementById('connStatus');
  if (connStatus) {
    connStatus.className = 'status-badge online';
    connStatus.innerHTML = '<span class="status-icon">◆</span><span class="status-text">ONLINE</span>';
  }
}

// إرسال الطلب إلى Google Apps Script باستخدام JSONP لتجنب مشاكل CORS
function sendToBackend(action, text = '', callbackName = null) {
  return new Promise((resolve, reject) => {
    const cbName = callbackName || 'jsonp_cb_' + Math.round(100000 * Math.random());
    
    window[cbName] = function(response) {
      delete window[cbName];
      if (scriptNode && scriptNode.parentNode) {
        scriptNode.parentNode.removeChild(scriptNode);
      }
      resolve(response);
    };

    const scriptNode = document.createElement('script');
    scriptNode.src = `${API_URL}?action=${action}&text=${encodeURIComponent(text)}&callback=${cbName}`;
    
    scriptNode.onerror = function() {
      delete window[cbName];
      if (scriptNode && scriptNode.parentNode) {
        scriptNode.parentNode.removeChild(scriptNode);
      }
      reject(new Error('فشل الاتصال بالخادم'));
    };

    document.head.appendChild(scriptNode);
  });
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
    alert('متصفحك لا يدعم التعرف على الصوت. يمكنك الكتابة أو استخدام متصفح كروم.');
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

  recognition.onerror = function(event) {
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
    const data = await sendToBackend('getResponse', message);
    if (data && data.response) {
      appendMessage(data.response, 'bot');
      speak(data.response);
      setHint('STANDBY · اضغط للبدء', 'info');
    } else {
      const errText = data.error || 'عذراً، حدث خطأ في الرد.';
      appendMessage('SYSTEM ERROR · ' + errText, 'bot-error');
      setHint('خطأ في النظام', 'error');
    }
  } catch (err) {
    appendMessage('SYSTEM ERROR · فشل الاتصال بالخادم', 'bot-error');
    setHint('CONNECTION FAILED', 'error');
  } finally {
    isProcessing = false;
  }
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
