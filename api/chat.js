// 1. بصمة الجهاز لتأمين التجربة
function getDeviceId() {
    let deviceId = localStorage.getItem('ngym_device_id');
    if (!deviceId) {
        deviceId = 'DEV-' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem('ngym_device_id', deviceId);
    }
    return deviceId;
}

// 2. حساب الماكروز والسعرات ديناميكياً
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

// 3. تحديث عناصر الواجهة وإخفاء نص التحميل
function updateUIProgress(eatenCalories = 0, eatenCarbs = 0, eatenProtein = 0, eatenFat = 0) {
    const macros = calculateDynamicMacros();
    const kcalLeft = Math.max(0, macros.totalCalories - eatenCalories);

    // إخفاء عبارة جاري التحميل وتحديث الأرقام
    const mainContainer = document.querySelector('.main-content') || document.body;
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
        alert('تنبيه: ' + err.message);
        return null;
    }
}

// تشغيل الواجهة فور فتح الصفحة
document.addEventListener('DOMContentLoaded', () => {
    getDeviceId();
    updateUIProgress();
});
