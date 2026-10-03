/* ==========================================================
 * ARIA - Advanced Reception Intelligence Assistant (JSONP Mode)
 * ========================================================== */

// ضع رابط الـ Web App الخاص بك هنا (الذي ينتهي بـ /exec)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjpcWeWp1w8wftI2p5tJdNglOGoYMk4gAU2o-Hq2Rejy5r3qHUyeYXxDXnXKooWEUp/exec'; 

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

function setHint(text) {
  const hint = document.getElementById('hint');
  if (hint) hint.textContent = text;
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
    setHint('جاري الاستماع...');
  };

  recognition.onresult = function(event) {
    const transcript = event.results[0][0].transcript;
    appendMessage(transcript, 'user');
    handleUserMessage(transcript);
  };

  recognition.onerror = function() {
    stopListening();
    setHint('خطأ في الصوت، حاول مرة أخرى');
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
  
  document.getElementById('micIcon').style.display = 'block';
  document.getElementById('stopIcon').style.display = 'none';
  setHint('STANDBY · اضغط للبدء');
  if (recognition) {
    try { recognition.stop(); } catch(e) {}
  }
}

function handleUserMessage(message) {
  if (isProcessing) return;
  isProcessing = true;
  setHint('جاري المعالجة...');

  const callbackName = 'aria_cb_' + Math.round(Math.random() * 1000000);
  
  window[callbackName] = function(data) {
    delete window[callbackName];
    const scriptTag = document.getElementById(callbackName);
    if (scriptTag) scriptTag.remove();

    isProcessing = false;
    setHint('STANDBY · اضغط للبدء');

    if (data && data.response) {
      appendMessage(data.response, 'bot');
      speak(data.response);
    } else {
      appendMessage('عذراً، لم أستقبل رد من الخادم.', 'bot-error');
    }
  };

  const script = document.createElement('script');
  script.id = callbackName;
  script.src = `${SCRIPT_URL}?action=getResponse&text=${encodeURIComponent(message)}&callback=${callbackName}`;
  
  script.onerror = function() {
    isProcessing = false;
    setHint('CONNECTION FAILED');
    appendMessage('SYSTEM ERROR · فشل الاتصال بالخادم', 'bot-error');
  };

  document.body.appendChild(script);
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
    window.speechSynthesis.speak(utterance);
  }
}

function toggleMute() {
  isMuted = !isMuted;
  const muteBtn = document.getElementById('muteBtn');
  if (muteBtn) muteBtn.classList.toggle('muted', isMuted);
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
