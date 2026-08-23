// هنا نقوم بإنشاء وتأمين بصمة الجهاز
function getDeviceId() {
    let deviceId = localStorage.getItem('ngym_device_id');
    if (!deviceId) {
        deviceId = 'DEV-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('ngym_device_id', deviceId);
    }
    return deviceId;
}

// هنا نحسب السعرات والماكروز ديناميكياً
function calculateDynamicMacros() {
    const userData = JSON.parse(localStorage.getItem('ngym_user')) || { weight: 70, goal: 'fitness' };
    const weight = parseFloat(userData.weight) || 70;
    
    let totalCalories = weight * 33;
    if (userData.goal === 'bulking') totalCalories = weight * 38;
    if (userData.goal === 'cutting') totalCalories = weight * 26;

    const protein = Math.round(weight * 2);
    const fat = Math.round(weight * 0.9);
    const carbs = Math.round((totalCalories - (protein * 4 + fat * 9)) / 4);

    return { totalCalories: Math.round(totalCalories), protein, carbs, fat };
}

// هنا نقوم بتحديث عناصر الواجهة وإخفاء شاشة التحميل
function updateUIProgress(eatenCalories = 0, eatenCarbs = 0, eatenProtein = 0, eatenFat = 0) {
    const macros = calculateDynamicMacros();
    const kcalLeft = Math.max(0, macros.totalCalories - eatenCalories);

    const loadingElem = document.getElementById('loading-text');
    if (loadingElem) loadingElem.style.display = 'none';

    const kcalElem = document.getElementById('kcal-left-display');
    if (kcalElem) kcalElem.innerText = kcalLeft;

    const pBar = document.getElementById('protein-bar');
    if (pBar) pBar.style.width = `${Math.min(100, (eatenProtein / macros.protein) * 100)}%`;
}

// هنا نرسل المحادثة إلى خادم /api/chat
async function sendToAICoach(userMessage, imageBase64 = null) {
    const userData = JSON.parse(localStorage.getItem('ngym_user')) || { weight: 70, goal: 'fitness', isGym: false };
    
    const systemPrompt = `أنت المدرب الشخصي الذكي لتطبيق NGym. بيانات المستخدم: الوزن ${userData.weight} كجم، الهدف: ${userData.goal}. 
    الوضع الحالي: ${userData.isGym ? 'يتدرب في الجيم ومسموح باستخدام الأوزان والحديد' : 'يتدرب في المنزل/لياقة عامة (اعتماده على وزن الجسم، السويدي، والمقاومة الخفيفة فقط دون حديد إلا إذا طلب هو ذلك)'}. 
    جاوب باختصار، حافز، وبشكل عملي جداً.`;

    let chatHistory = JSON.parse(localStorage.getItem('ngym_chat_history')) || [];
    chatHistory.push({ role: 'user', text: userMessage, imageBase64 });

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: chatHistory,
                systemPrompt: systemPrompt,
                imageBase64: imageBase64
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'فشل الاتصال بالسيرفر');

        chatHistory.push({ role: 'model', text: data.reply });
        localStorage.setItem('ngym_chat_history', JSON.stringify(chatHistory));
        
        return data.reply;
    } catch (err) {
        console.error('Chat Error:', err);
        return null;
    }
}

// هنا نربط زر الإرسال ومفتاح Enter بأحداث الشات تلقائياً
function setupChatListeners() {
    // التقاط العناصر الخاصة بالشات
    const sendBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('إرسال')) ||
                    document.querySelector('#send-btn') || 
                    document.querySelector('.send-btn');

    const chatInput = document.querySelector('input[placeholder*="رسالتك"]') || 
                      document.querySelector('#chat-input') || 
                      document.querySelector('input[type="text"]');

    const chatBox = document.querySelector('.chat-messages') || 
                    document.querySelector('#chat-box') || 
                    document.querySelector('.chat-body') ||
                    chatInput?.parentElement?.parentElement;

    if (!sendBtn || !chatInput) return;

    async function processSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        // تفريغ مربع النص
        chatInput.value = '';

        // عرض رسالة المستخدم فوراً داخل الشات
        if (chatBox) {
            const userMsgDiv = document.createElement('div');
            userMsgDiv.style.cssText = "background:#00e676; color:#000; padding:8px 12px; border-radius:10px; margin:6px 0; align-self:flex-end; font-weight:bold;";
            userMsgDiv.innerText = text;
            chatBox.appendChild(userMsgDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        // عرض نص الانتظار
        let loadingDiv;
        if (chatBox) {
            loadingDiv = document.createElement('div');
            loadingDiv.style.cssText = "background:#222; color:#888; padding:8px 12px; border-radius:10px; margin:6px 0;";
            loadingDiv.innerText = "جاري الاتصال بالمدرب...";
            chatBox.appendChild(loadingDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        // استدعاء API السيرفر
        const reply = await sendToAICoach(text);

        if (loadingDiv) loadingDiv.remove();

        // عرض رد المدرب
        if (chatBox) {
            const botMsgDiv = document.createElement('div');
            botMsgDiv.style.cssText = "background:#1e1e1e; color:#fff; padding:10px 14px; border-radius:10px; margin:6px 0; border-left:3px solid #00e676;";
            botMsgDiv.innerText = reply || "⚠️ تعذر الحصول على رد من المدرب الذكي.";
            chatBox.appendChild(botMsgDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

    // تفعيل الضغط على الزر
    sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        processSend();
    });

    // تفعيل الضغط على زر Enter
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            processSend();
        }
    });
}

// تشغيل الأكواد بعد تحميل العناصر
document.addEventListener('DOMContentLoaded', () => {
    getDeviceId();
    updateUIProgress();
    setupChatListeners();
});
