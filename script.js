/* ============================================
 * ARIA · Advanced Reception Intelligence Assistant
 * مع JSONP لتجاوز CORS
 * ============================================ */

const API_URL = 'https://script.google.com/macros/s/AKfycbxDkXgekCw1PcjpuO9jCQQPKeaRFOExFxQTMXckX276UkESBnrzGrRFwRik7T59tkQI/exec';

let recognition = null;
let isListening = false;
let isMuted = false;
let isProcessing = false;

window.addEventListener('load', () => {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
  setHint('STANDBY · اضغطي للبدء', 'info');
});

function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    setHint('SYSTEM ERROR · المتصفح لا يدعم الصوت', 'error');
    return null;
  }

  const rec = new SR();
  rec.lang = 'ar-EG';
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    isListening = true;
    setCoreState('listening');
    setHint('LISTENING · أسمعك...', 'info');
    document.getElementById('micBtn').classList.add('listening');
    document.getElementById('micIcon').style.display = 'none';
    document.getElementById('stopIcon').style.display = 'block';
  };

  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    handleUserInput(transcript);
  };

  rec.onerror = (event) => {
    isListening = false;
    setCoreState('idle');
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('micIcon').style.display = 'block';
    document.getElementById('stopIcon').style.display = 'none';
    const errs = {
      'no-speech': 'NO INPUT · لم أسمع شيئاً',
      'not-allowed': 'ACCESS DENIED · اسمحي بالميكروفون',
      'network': 'NETWORK ERROR'
    };
    setHint(errs[event.error] || 'ERROR', 'error');
  };

  rec.onend = () => {
    isListening = false;
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('micIcon').style.display = 'block';
    document.getElementById('stopIcon').style.display = 'none';
    if (!isProcessing) {
      setCoreState('idle');
      setHint('STANDBY · اضغطي للبدء', 'info');
    }
  };

  return rec;
}

function toggleListening() {
  if (isProcessing) return;
  if (!recognition) recognition = initRecognition();
  if (!recognition) return;
  if (isListening) recognition.stop();
  else {
    try { recognition.start(); }
    catch(e) { setTimeout(() => { try { recognition.start(); } catch(e2){} }, 300); }
  }
}

/* ============ JSONP Call ============ */
function jsonpCall(text, onSuccess, onError) {
  const callbackName = 'ariaCallback_' + Date.now() + '_' + Math.floor(Math.random() * 1000);

  // دالة الاستقبال
  window[callbackName] = function(data) {
    try {
      delete window[callbackName];
      const s = document.getElementById(callbackName);
      if (s && s.parentNode) s.parentNode.removeChild(s);
    } catch(e) {}
    onSuccess(data);
  };

  // بناء الرابط
  const url = new URL(API_URL);
  url.searchParams.set('action', 'getResponse');
  url.searchParams.set('text', text);
  url.searchParams.set('callback', callbackName);

  // إضافة script tag
  const script = document.createElement('script');
  script.id = callbackName;
  script.src = url.toString();

  script.onerror = function() {
    try {
      delete window[callbackName];
      const s = document.getElementById(callbackName);
      if (s && s.parentNode) s.parentNode.removeChild(s);
    } catch(e) {}
    onError('فشل الاتصال بالخادم');
  };

  document.body.appendChild(script);

  // مهلة زمنية
  setTimeout(() => {
    if (window[callbackName]) {
      try {
        delete window[callbackName];
        const s = document.getElementById(callbackName);
        if (s && s.parentNode) s.parentNode.removeChild(s);
      } catch(e) {}
      onError('انتهت المهلة');
    }
  }, 20000);
}

/* ============ معالجة السؤال ============ */
function handleUserInput(text) {
  addMessage(text, 'user');
  setHint('PROCESSING · أفكر...', 'info');
  isProcessing = true;
  setCoreState('thinking');
  document.getElementById('micBtn').classList.add('thinking');

  jsonpCall(
    text,
    // نجاح
    function(data) {
      isProcessing = false;
      setCoreState('idle');
      document.getElementById('micBtn').classList.remove('thinking');

      if (data.error) {
        addMessage('SYSTEM ERROR · ' + data.error, 'bot');
        setHint('ERROR', 'error');
        return;
      }

      const answer = data.response || 'لم أستطع المعالجة';
      addMessage(answer, 'bot');
      speak(answer);
      setHint('STANDBY · اضغطي للبدء', 'info');
    },
    // فشل
    function(err) {
      isProcessing = false;
      setCoreState('idle');
      document.getElementById('micBtn').classList.remove('thinking');
      addMessage('SYSTEM ERROR · ' + err, 'bot');
      setHint('CONNECTION FAILED', 'error');
    }
  );
}

/* ============ النطق ============ */
function speak(text) {
  if (isMuted || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  let cleanText = text
    .replace(/[*_#`~]/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[\u{1F300}-\u{1F9FF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleanText) return;

  const sentences = cleanText
    .split(/[.!?؟]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);

  const voices = window.speechSynthesis.getVoices();
  const arVoice = voices.find(v => v.lang.startsWith('ar-SA')) ||
                  voices.find(v => v.lang.startsWith('ar-EG')) ||
                  voices.find(v => v.lang.startsWith('ar'));

  setCoreState('speaking');
  const wf = document.getElementById('waveform');
  if (wf) wf.classList.add('active');
  setHint('SPEAKING · ARIA تتحدث...', 'info');

  let currentIndex = 0;

  function speakNext() {
    if (currentIndex >= sentences.length) {
      setCoreState('idle');
      if (wf) wf.classList.remove('active');
      setHint('STANDBY · اضغطي للبدء', 'info');
      return;
    }

    const sentence = sentences[currentIndex];
    currentIndex++;

    const u = new SpeechSynthesisUtterance(sentence);
    u.lang = 'ar-SA';
    u.rate = 0.95;
    u.pitch = 1.05;
    u.volume = 1.0;

    if (arVoice) u.voice = arVoice;

    u.onend = () => setTimeout(speakNext, 150);
    u.onerror = () => setTimeout(speakNext, 100);

    window.speechSynthesis.speak(u);
  }

  speakNext();
}

/* ============ الواجهة ============ */
function setCoreState(state) {
  const core = document.getElementById('core');
  if (!core) return;
  core.className = 'core';
  if (state !== 'idle') core.classList.add(state);
}

function setHint(text, type) {
  const hint = document.getElementById('hint');
  if (!hint) return;
  hint.textContent = text;
  hint.className = 'status-val';
  if (type) hint.classList.add(type);
}

function addMessage(text, sender) {
  const conv = document.getElementById('conversation');
  if (!conv) return;
  const div = document.createElement('div');
  div.className = 'console-line ' + (sender === 'user' ? 'user-line' : 'bot-line');

  const tag = sender === 'user' ? '[YOU]' : '[ARIA]';
  div.innerHTML = '<span class="console-tag">' + tag + '</span><span class="console-text"></span>';
  div.querySelector('.console-text').textContent = text;
  conv.appendChild(div);
  conv.scrollTop = conv.scrollHeight;

  while (conv.children.length > 6) {
    conv.removeChild(conv.firstChild);
  }
}

function clearChat() {
  const conv = document.getElementById('conversation');
  if (!conv) return;
  conv.innerHTML = '<div class="console-line bot-line"><span class="console-tag">[ARIA]</span><span class="console-text">مرحباً بك. أنا ARIA، جاهزة لمساعدتك.</span></div>';
  window.speechSynthesis.cancel();
  setCoreState('idle');
  const wf = document.getElementById('waveform');
  if (wf) wf.classList.remove('active');
  setHint('STANDBY · اضغطي للبدء', 'info');
}

function toggleMute() {
  isMuted = !isMuted;
  const btn = document.getElementById('muteBtn');
  if (btn) btn.classList.toggle('muted', isMuted);
  if (isMuted) {
    window.speechSynthesis.cancel();
    setHint('AUDIO MUTED', 'info');
  } else {
    setHint('AUDIO ENABLED', 'success');
  }
}

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    toggleListening();
  }
});
