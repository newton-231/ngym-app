// 1. بصمة الجهاز لتأمين التجربة
function getDeviceId() {
    let deviceId = localStorage.getItem('ngym_device_id');
    if (!deviceId) {
        deviceId = 'DEV-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('ngym_device_id', deviceId);
    }
    return deviceId;
}

// 2. حساب الماكروز والسعرات
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

// 3. تحديث عناصر الواجهة
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

// 4. إرسال المحادثة إلى /api/chat
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

// 5. ربط حقل الإدخال وزر الإرسال بشمولية مرنة
function setupChatListeners() {
    // التقاط كل العناصر المحتملة للإدخال والزر
    const inputs = document.querySelectorAll('input, textarea');
    let chatInput = Array.from(inputs).find(i => i.type === 'text' || i.tagName === 'TEXTAREA' || i.placeholder.includes('رسال'));
    if (!chatInput && inputs.length > 0) chatInput = inputs[inputs.length - 1];

    const buttons = document.querySelectorAll('button, div, span');
    const sendBtn = Array.from(buttons).find(b => b.innerText && b.innerText.trim() === 'إرسال');

    const chatBox = document.querySelector('.chat-messages') || 
                    document.querySelector('#chat-box') || 
                    document.querySelector('.chat-body') ||
                    (chatInput ? chatInput.closest('div').previousElementSibling || chatInput.closest('div').parentElement : null);

    if (!sendBtn || !chatInput) {
        console.warn('NGym Debug: لم يتم العثور على زر الإرسال أو مربع النص بشكل مخصص');
        return;
    }

    async function processSend() {
        const text = chatInput.value.trim();
        if (!text) return;

        chatInput.value = '';

        // عرض رسالة المستخدم
        let userMsgDiv;
        if (chatBox) {
            userMsgDiv = document.createElement('div');
            userMsgDiv.style.cssText = "background:#00e676; color:#000; padding:10px 14px; border-radius:10px; margin:8px 0; align-self:flex-end; font-weight:bold; width: fit-content; margin-left: auto;";
            userMsgDiv.innerText = text;
            chatBox.appendChild(userMsgDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        // مؤشر الانتظار
        let loadingDiv;
        if (chatBox) {
            loadingDiv = document.createElement('div');
            loadingDiv.style.cssText = "background:#222; color:#00e676; padding:10px 14px; border-radius:10px; margin:8px 0; width: fit-content;";
            loadingDiv.innerText = "جاري الاتصال بالمدرب...";
            chatBox.appendChild(loadingDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        const reply = await sendToAICoach(text);

        if (loadingDiv) loadingDiv.remove();

        // عرض رد المدرب
        if (chatBox) {
            const botMsgDiv = document.createElement('div');
            botMsgDiv.style.cssText = "background:#1e1e1e; color:#fff; padding:12px 16px; border-radius:10px; margin:8px 0; border-right:4px solid #00e676; line-height:1.6;";
            botMsgDiv.innerText = reply || "⚠️ تعذر الحصول على رد من المدرب الذكي، تحقق من المفتاح أو الاتصال.";
            chatBox.appendChild(botMsgDiv);
            chatBox.scrollTop = chatBox.scrollHeight;
        }
    }

    sendBtn.addEventListener('click', (e) => {
        e.preventDefault();
        processSend();
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            processSend();
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    getDeviceId();
    updateUIProgress();
    setTimeout(setupChatListeners, 500); // تأخير بسيط لضمان اكتمال بناء عناصر HTML
});
