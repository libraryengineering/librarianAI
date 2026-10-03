async function handleUserMessage(message) {
  if (isProcessing) return;
  isProcessing = true;
  setHint('جاري المعالجة...', 'processing');

  // رابط الـ Web App الخاص بك من Google Apps Script (ينتهي بـ /exec)
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxMtME3OYGuItzoALwkpGJmwD_DM3wfwub0twloNHgUELgongx4fZ5LtCx8JidYIYb9/exec'; // ضع رابطك هنا

  try {
    const url = `${SCRIPT_URL}?action=getResponse&text=${encodeURIComponent(message)}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data && data.response) {
      appendMessage(data.response, 'bot');
      speak(data.response);
    } else {
      appendMessage('عذراً، لم أستقبل رد من الخادم.', 'bot-error');
    }
    setHint('STANDBY · اضغط للبدء', 'info');
  } catch (err) {
    appendMessage('SYSTEM ERROR · فشل الاتصال بالخادم', 'bot-error');
    setHint('CONNECTION FAILED', 'error');
  } finally {
    isProcessing = false;
  }
}
