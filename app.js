// هنا نقوم بتسجيل الـ Service Worker لدعم الـ PWA والعمل أوفلاين
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log("Service Worker Registered Successfully"))
            .catch(err => console.log("Service Worker Registration Failed", err));
    });
}

// هنا نقوم بإدارة حماية صفحة الأدمن عند الضغط 5 مرات على اللوجو
let logoClickCount = 0;
const appLogo = document.getElementById('appLogo');

if (appLogo) {
    appLogo.addEventListener('click', () => {
        logoClickCount++;
        if (logoClickCount === 5) {
            logoClickCount = 0;
            const password = prompt("🔐 أدخل كلمة السر الخاصة بلوحة التحكم:");
            if (password === "Newton123") {
                alert("تم التحقق بنجاح! مرحباً بك في لوحة الإدارة.");
            } else {
                alert("❌ كلمة السر غير صحيحة!");
            }
        }
    });
}

// هنا نقوم بالتحكم بالانتقال بين تبويبات الواجهة (التغذية / التمارين)
function switchTab(tabId, btnElement) {
    // إخفاء كل التبويبات
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });
    
    // إظهار التبويب المحدد
    document.getElementById(tabId).style.display = 'block';

    // ضبط ألوان أزرار التنقل
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
        btn.style.color = '#888';
    });
    btnElement.style.color = '#00ff66';
}

// هنا نقوم بإدارة منطق المحادثة المباشرة مع الـ AI Agent
const aiChatToggleBtn = document.getElementById('aiChatToggleBtn');
const aiChatModal = document.getElementById('aiChatModal');
const closeChatBtn = document.getElementById('closeChatBtn');
const sendChatBtn = document.getElementById('sendChatBtn');
const chatInput = document.getElementById('chatInput');
const chatMessages = document.getElementById('chatMessages');

// فتح وإغلاق نافذة المحادثة
if (aiChatToggleBtn) {
    aiChatToggleBtn.addEventListener('click', () => {
        aiChatModal.style.display = (aiChatModal.style.display === 'flex') ? 'none' : 'flex';
    });
}

if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
        aiChatModal.style.display = 'none';
    });
}

// أحداث الإرسال عند الضغط على الزر أو زر Enter
if (sendChatBtn) {
    sendChatBtn.addEventListener('click', sendChatMessage);
}

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });
}

// هنا نقوم بإرسال الرسالة عبر Vercel API بأمان
async function sendChatMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // عرض رسالة المستخدم داخل المحادثة
    appendMessage(text, 'user');
    chatInput.value = '';

    appendMessage("🤖 جاري التفكير...", 'ai-temp');

    // جلب ملف المستخدم المحلي لضبط الإجابة
    const savedProfile = localStorage.getItem('ngym_user');
    const profile = savedProfile ? JSON.parse(savedProfile) : { goal: 'fitness', weight: 70 };

    const promptText = `أنت مدرب لياقة بدنية محترف لتطبيق NGym. بيانات المتدرب: الهدف ${profile.goal}، الوزن ${profile.weight}كجم. المتدرب يقول: "${text}". إذا حدد أنه يتمرن في (المنزل أو الجيم)، اقترح عليه 3 تمارين مناسبة لمكانه وإمكانياته بإيجاز شديد وبأسلوب محفز.`;

    try {
        // الإرسال إلى ملف /api/chat المجاني والمحمي داخل Vercel
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptText })
        });

        const data = await response.json();
        removeTempMessage();

        if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0].text) {
            appendMessage(data.candidates[0].content.parts[0].text, 'ai');
        } else {
            appendMessage("⚠️ تعذر الحصول على رد من المدرب الذكي.", 'ai');
        }
    } catch (err) {
        removeTempMessage();
        appendMessage("⚠️ حدث خطأ في الاتصال بالسيرفر.", 'ai');
    }
}

// هنا نقوم بإضافة الفقرة النصية داخل مربع الشات
function appendMessage(msg, sender) {
    const div = document.createElement('div');
    div.style.padding = "8px 12px";
    div.style.borderRadius = "8px";
    div.style.maxWidth = "85%";
    div.style.lineHeight = "1.4";

    if (sender === 'user') {
        div.style.background = "#00ff66";
        div.style.color = "#000";
        div.style.alignSelf = "flex-end";
    } else {
        div.style.background = "#222";
        div.style.color = "#fff";
        div.style.alignSelf = "flex-start";
        if (sender === 'ai-temp') div.id = 'tempMsg';
    }

    div.innerText = msg;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// هنا نقوم بحذف مؤشر جاري التفكير بعد وصول الرد
function removeTempMessage() {
    const temp = document.getElementById('tempMsg');
    if (temp) temp.remove();
}
