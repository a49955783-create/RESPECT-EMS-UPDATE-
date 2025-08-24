import React, { useState, useRef } from 'react';
import Tesseract from 'tesseract.js';

export default function App() {
  const [image, setImage] = useState(null);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [recipient, setRecipient] = useState('');
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const canvasRef = useRef();

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
  };

  const handleImage = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => setImage(e.target.result);
    reader.readAsDataURL(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        handleImage(item.getAsFile());
      }
    }
  };

  const analyzeColor = () => {
    if (!canvasRef.current || !image) return 'غير محدد';
    const ctx = canvasRef.current.getContext('2d');
    const img = new Image();
    img.src = image;
    return new Promise((resolve) => {
      img.onload = () => {
        canvasRef.current.width = img.width;
        canvasRef.current.height = img.height;
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(10, 10, 1, 1).data;
        if (data[0] > 200 && data[1] < 80 && data[2] < 80) resolve('خارج الخدمة'); // أحمر
        else if (data[1] > 150 && data[0] < 100) resolve('في الميدان'); // أخضر
        else if (data[0] > 100 && data[2] > 100) resolve('في الميدان (مشغول)'); // بنفسجي
        else resolve('غير محدد');
      };
    });
  };

  const runOCR = async () => {
    if (!image) return;
    setLoading(true);
    const { data: { text } } = await Tesseract.recognize(image, 'ara+eng');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    const name = lines[0] || 'غير معروف';
    const code = lines[1] || '---';
    const status = await analyzeColor();
    setResult(`الاسم: ${name}\nالكود: ${code}\nالحالة: ${status}`);
    setLoading(false);
  };

  const generateFinal = () => {
    if (!recipient.trim()) {
      alert('الرجاء منك كتابة المستلم أو النائب');
      return;
    }
    setResult(prev => prev + `\nالمستلم/النائب: ${recipient}`);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(result);
    alert('تم النسخ');
  };

  return (
    <div className={`app ${theme}`} onPaste={handlePaste}>
      <h2>📋 استخراج بيانات العمليات</h2>
      <input type="file" accept="image/*" onChange={(e) => handleImage(e.target.files[0])} />
      {image && <img src={image} alt="preview" style={{ maxWidth: '200px', marginTop: '10px' }} />}
      <canvas ref={canvasRef} style={{ display: 'none' }}></canvas>
      <div>
        <button onClick={runOCR} disabled={loading}>
          {loading ? 'جاري المعالجة...' : 'استخراج من الصورة (OCR)'}
        </button>
      </div>
      <div>
        <input
          type="text"
          placeholder="اكتب المستلم أو النائب"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <button onClick={generateFinal}>توليد النص النهائي</button>
      </div>
      {result && (
        <div>
          <textarea value={result} readOnly rows="6"></textarea>
          <button onClick={copyToClipboard}>نسخ النتيجة</button>
        </div>
      )}
      <button onClick={toggleTheme}>
        {theme === 'light' ? 'الوضع الداكن' : 'الوضع الفاتح'}
      </button>
    </div>
  );
}
