/* ============================================
 * 🎙️ موظف الاستقبال الذكي - سارة
 * ============================================ */

let API_URL = localStorage.getItem('apiUrl') || '';
let recognition = null;
let isListening = false;
let isMuted = false;
let isProcessing = false;

/* ============ إدارة الرابط ============ */
function showApiConfig() {
  const config = document.getElementById('apiConfig');
  config.classList.toggle('show');
  document.getElementById('apiUrl').value = API_URL;
}

function saveApiUrl() {
  const url = document.getElementById('apiUrl').value.trim();
  if (!url || !url.includes('script.google.com')) {
    alert('الرجاء إدخال رابط صحيح من script.google.com');
    return;
  }
  API_URL = url;
  localStorage.setItem('apiUrl', url);
  document.getElementById('apiConfig').classList.remove('show');
  updateStatus('✅ تم الحفظ! جاهز للاستخدام', 'success');
  loadFilesInfo();
}

/* ============ الاتصال بـ Apps Script ============ */
async function callAPI(action, params = {}) {
  if (!API_URL) throw new Error('الرجاء إعداد الرابط أولاً');

  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => {
    url.searchParams.set(k, v);
  });

  const response = await fetch(url.toString(), {
    method: 'GET',
    redirect: 'follow'
  });

  if (!response.ok) throw new Error('فشل الاتصال');
  return await response.json();
}

/* ============ تحميل معلومات الملفات ============ */
async function loadFilesInfo() {
  if (!API_URL) return;
  try {
    const result = await callAPI('listFiles');
    const files = result.files || [];
    const el = document.getElementById('filesCount');
    if (files.length > 0) {
      el.textContent = `📚 أعرف ${files.length} ملف من قاعدة المعرفة`;
    } else {
      el.textContent = '📚 قاعدة المعرفة فارغة';
    }
  } catch (e) {
    console.log('فشل تحميل الملفات:', e);
  }
}

/* ============ التعرف على الصوت ============ */
function initRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    updateStatus('❌ المتصفح لا يدعم الصوت. استخدم Chrome', 'error');
    document.getElementById('micBtn').disabled = true;
    return null;
  }

  const rec = new SR();
  rec.lang = 'ar-EG';
  rec.continuous = false;
  rec.interimResults = false;
  rec.maxAlternatives = 1;

  rec.onstart = () => {
    isListening = true;
    document.getElementById('micBtn').classList.add('listening');
    updateStatus('🎤 أتحدث الآن...', 'info');
  };

  rec.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    handleUserInput(transcript);
  };

  rec.onerror = (event) => {
    isListening = false;
    document.getElementById('micBtn').classList.remove('listening');
    const errs = {
      'no-speech': 'لم أسمع شيئاً، حاول مرة أخرى',
      'not-allowed': '❌ اسمح بالوصول للميكروفون',
      'network': 'خطأ في الشبكة'
    };
    updateStatus(errs[event.error] || 'خطأ: ' + event.error, 'error');
  };

  rec.onend = () => {
    isListening = false;
    document.getElementById('micBtn').classList.remove('listening');
    if (document.getElementById('status').textContent.includes('أتحدث')) {
      updateStatus('اضغط على الميكروفون للتحدث', 'info');
    }
  };

  return rec;
}

function toggleListening() {
  if (!API_URL) {
    showApiConfig();
    updateStatus('⚠️ الرجاء إدخال رابط Apps Script أولاً', 'error');
    return;
  }

  if (isProcessing) return;
  if (!recognition) recognition = initRecognition();
  if (!recognition) return;

  if (isListening) {
    recognition.stop();
  } else {
    try { recognition.start(); } catch(e) { console.log(e); }
  }
}

/* ============ معالجة السؤال ============ */
async function handleUserInput(text) {
  addMessage(text, 'user');
  updateStatus('🔍 أبحث في قاعدة المعرفة...', 'info');
  isProcessing = true;
  document.getElementById('micBtn').classList.add('thinking');

  try {
    const result = await callAPI('getResponse', { text: text });
    const response = result.response || 'عذراً، لم أستطع الرد';
    addMessage(response, 'bot');
    speak(response);
    updateStatus('🎯 اضغط على الميكروفون للتحدث', 'info');
  } catch (e) {
    addMessage('❌ عذراً، حدث خطأ في الاتصال', 'bot');
    updateStatus('فشل الاتصال', 'error');
  } finally {
    isProcessing = false;
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
  u.pitch = 1.1;
  u.volume = 1.0;

  const voices = window.speechSynthesis.getVoices();
  const arVoice = voices.find(v => v.lang.startsWith('ar'));
  if (arVoice) u.voice = arVoice;

  window.speechSynthesis.speak(u);
}

function stopSpeaking() {
  window.speechSynthesis.cancel();
  updateStatus('⏹️ تم الإيقاف', 'info');
}

/* ============ الواجهة ============ */
function addMessage(text, sender) {
  const conv = document.getElementById('conversation');
  const div = document.createElement('div');
  div.className = 'message ' + (sender === 'user' ? 'user-msg' : 'bot-msg');
  div.textContent = text;
  conv.appendChild(div);
  conv.scrollTop = conv.scrollHeight;
}

function updateStatus(text, type) {
  const el = document.getElementById('status');
  el.textContent = text;
  el.className = 'status';
  if (type) el.classList.add(type);
}

function clearChat() {
  document.getElementById('conversation').innerHTML =
    '<div class="message bot-msg">👋 أهلاً! كيف يمكنني مساعدتك؟</div>';
  window.speechSynthesis.cancel();
  updateStatus('🎯 اضغط على الميكروفون للتحدث', 'info');
}

function toggleMute() {
  isMuted = !isMuted;
  const btn = document.getElementById('muteBtn');
  btn.textContent = isMuted ? '🔇 صامت' : '🔊 الصوت';
  btn.classList.toggle('muted', isMuted);
  if (isMuted) window.speechSynthesis.cancel();
}

/* ============ التهيئة ============ */
window.addEventListener('load', () => {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();

  if (!API_URL) {
    document.getElementById('apiConfig').classList.add('show');
    updateStatus('⚙️ أدخل رابط Apps Script للبدء', 'info');
  } else {
    updateStatus('✅ جاهز! اضغط على الميكروفون', 'success');
    loadFilesInfo();
  }
});

document.addEventListener('keydown', e => {
  if (e.code === 'Space' && !['INPUT','TEXTAREA'].includes(e.target.tagName)) {
    e.preventDefault();
    toggleListening();
  }
});
