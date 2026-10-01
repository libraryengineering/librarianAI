/* ============================================
 * ARIA · Advanced Reception Intelligence Assistant
 * ============================================ */

const API_URL = 'https://script.google.com/macros/s/AKfycbyZu5JKper1teRwjp5mxprmxFMn-F37mdczFwkwQuKJSvYJOEO9TZErGlaoRTlAgxbt/exec';

let recognition = null;
let isListening = false;
let isMuted = false;
let isProcessing = false;

/* ============ التهيئة ============ */
window.addEventListener('load', () => {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
  setHint('STANDBY · اضغط للبدء', 'info');
});

/* ============ التعرف على الصوت ============ */
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
    handleUserInput(event.results[0][0].transcript);
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
      'network': 'NETWORK ERROR · خطأ في الشبكة'
    };
    setHint(errs[event.error] || 'ERROR · ' + event.error, 'error');
  };

  rec.onend = () => {
    isListening = false;
    document.getElementById('micBtn').classList.remove('listening');
    document.getElementById('micIcon').style.display = 'block';
    document.getElementById('stopIcon').style.display = 'none';

    if (!isProcessing) {
      setCoreState('idle');
      setHint('STANDBY · اضغط للبدء', 'info');
    }
  };

  return rec;
}

function toggleListening() {
  if (isProcessing) return;
  if (!recognition) recognition = initRecognition();
  if (!recognition) return;

  if (isListening) {
    recognition.stop();
  } else {
    try { recognition.start(); }
    catch (e) {
      setTimeout(() => { try { recognition.start(); } catch(e2){} }, 300);
    }
  }
}

/* ============ معالجة السؤال ============ */
async function handleUserInput(text) {
  addMessage(text, 'user');
  setHint('PROCESSING · أبحث في البيانات...', 'info');
  isProcessing = true;
  setCoreState('thinking');
  document.getElementById('micBtn').classList.add('thinking');

  try {
    const url = new URL(API_URL);
    url.searchParams.set('action', 'getResponse');
    url.searchParams.set('text', text);

    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow'
    });

    if (!response.ok) throw new Error('Connection failed');

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    const answer = data.response || 'لم أستطع المعالجة';
    addMessage(answer, 'bot');
    speak(answer);
    setHint('STANDBY · اضغط للبدء', 'info');

  } catch (e) {
    console.error(e);
    addMessage('SYSTEM ERROR · فشل الاتصال', 'bot');
    setHint('CONNECTION FAILED', 'error');
  } finally {
    isProcessing = false;
    setCoreState('idle');
    document.getElementById('micBtn').classList.remove('thinking');
  }
}

/* ============ النطق ============ */
function speak(text) {
  if (isMuted || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'ar-SA';
  u.rate = 1.0;
  u.pitch = 1.05;
  u.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const arVoice = voices.find(v => v.lang.startsWith('ar'));
  if (arVoice) u.voice = arVoice;

  u.onstart = () => {
    setCoreState('speaking');
    document.getElementById('waveform').classList.add('active');
    setHint('SPEAKING · ARIA تتحدث...', 'info');
  };

  u.onend = () => {
    setCoreState('idle');
    document.getElementById('waveform').classList.remove('active');
    setHint('STANDBY · اضغط للبدء', 'info');
  };

  u.onerror = () => {
    setCoreState('idle');
    document.getElementById('waveform').classList.remove('active');
  };

  window.speechSynthesis.speak(u);
}

/* ============ الواجهة ============ */
function setCoreState(state) {
  const core = document.getElementById('core');
  core.className = 'core';
  if (state !== 'idle') core.classList.add(state);
}

function setHint(text, type) {
  const hint = document.getElementById('hint');
  hint.textContent = text;
  hint.className = 'status-val';
  if (type) hint.classList.add(type);
}

function addMessage(text, sender) {
  const conv = document.getElementById('conversation');
  const div = document.createElement('div');
  div.className = 'console-line ' + (sender === 'user' ? 'user-line' : 'bot-line');

  const tag = sender === 'user' ? '[YOU]' : '[ARIA]';
  div.innerHTML = `
    <span class="console-tag">${tag}</span>
    <span class="console-text"></span>
  `;
  div.querySelector('.console-text').textContent = text;
  conv.appendChild(div);
  conv.scrollTop = conv.scrollHeight;

  while (conv.children.length > 6) {
    conv.removeChild(conv.firstChild);
  }
}

function clearChat() {
  document.getElementById('conversation').innerHTML = `
    <div class="console-line bot-line">
      <span class="console-tag">[ARIA]</span>
      <span class="console-text">مرحباً بك. أنا ARIA، جاهزة لمساعدتك.</span>
    </div>
  `;
  window.speechSynthesis.cancel();
  setCoreState('idle');
  document.getElementById('waveform').classList.remove('active');
  setHint('STANDBY · اضغط للبدء', 'info');
}

function toggleMute() {
  isMuted = !isMuted;
  const btn = document.getElementById('muteBtn');
  btn.classList.toggle('muted', isMuted);
  if (isMuted) {
    window.speechSynthesis.cancel();
    setHint('AUDIO MUTED', 'info');
  } else {
    setHint('AUDIO ENABLED', 'success');
  }
}

/* ============ Space Bar ============ */
document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    toggleListening();
  }
});
