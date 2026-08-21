// 1. نظام التحقق من الـ IP والفترة التجريبية (30 يوماً)
async function checkTrialStatus() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const userIp = data.ip;
        
        let trialData = localStorage.getItem('ngym_trial_' + userIp);
        const now = new Date().getTime();

        if (!trialData) {
            const expiry = now + (30 * 24 * 60 * 60 * 1000);
            localStorage.setItem('ngym_trial_' + userIp, expiry);
            document.getElementById('sub-title').innerText = 'تجربة مجانية: 30 يوماً متبقية';
            // إظهار شاشة الإعداد أول مرة
            document.getElementById('onboarding-modal').classList.remove('hidden');
        } else if (now > parseInt(trialData)) {
            showSubscriptionModal();
        } else {
            const daysLeft = Math.ceil((parseInt(trialData) - now) / (1000 * 60 * 60 * 24));
            document.getElementById('sub-title').innerText = `تجربة مجانية: متبقي ${daysLeft} يوم`;
        }
    } catch (e) {
        document.getElementById('sub-title').innerText = 'NGym النسخة الذكية';
    }
}

// نافذة انتهاء الاشتراك والتوجيه للواتساب
function showSubscriptionModal() {
    const modalHtml = `
        <div class="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50">
            <div class="bg-gray-900 border border-gym-green p-6 rounded-2xl w-full max-w-sm text-center">
                <h3 class="text-xl font-bold mb-3 text-gym-green">انتهت فترتك التجريبية (30 يوماً)</h3>
                <p class="text-sm text-gray-400 mb-5">لتجديد اشتراكك والحصول على الأكواد المعتمدة (شهر، 3 أشهر، سنة)، تواصل معنا مباشرة عبر الواتساب.</p>
                <a href="https://wa.me/970599000000?text=أريد%20تجديد%20اشتراك%20تطبيق%20NGym" target="_blank" class="block w-full bg-gym-green text-black font-bold py-3 rounded-xl text-sm">تواصل عبر الواتساب للتجديد</a>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// حفظ بيانات الإعداد (Onboarding)
document.getElementById('save-onboarding')?.addEventListener('click', () => {
    const weight = document.getElementById('user-weight').value;
    const goal = document.getElementById('user-goal').value;
    if(!weight) {
        alert('الرجاء إدخال الوزن');
        return;
    }
    localStorage.setItem('ngym_weight', weight);
    localStorage.setItem('ngym_goal', goal);
    
    // حساب تقريبي للماكروز بناءً على الوزن والهدف
    let calories = goal === 'bulking' ? weight * 35 : (goal === 'cutting' ? weight * 24 : weight * 28);
    document.getElementById('calories-display').innerText = Math.round(calories) + ' سعرة';
    document.getElementById('protein-display').innerText = Math.round(weight * 2) + 'ج';
    document.getElementById('carbs-display').innerText = Math.round(weight * 3) + 'ج';
    document.getElementById('fats-display').innerText = Math.round(weight * 0.9) + 'ج';

    document.getElementById('onboarding-modal').classList.add('hidden');
});

// 2. إدارة التبويبات
function switchTab(tab) {
    const nutTab = document.getElementById('tab-nutrition');
    const workTab = document.getElementById('tab-workouts');
    const btnNut = document.getElementById('btn-tab-nut');
    const btnWork = document.getElementById('btn-tab-work');

    if (tab === 'nutrition') {
        nutTab.classList.remove('hidden');
        workTab.classList.add('hidden');
        btnNut.className = "text-gym-green font-bold text-sm flex flex-col items-center";
        btnWork.className = "text-gray-400 font-bold text-sm flex flex-col items-center";
    } else {
        nutTab.classList.add('hidden');
        workTab.classList.remove('hidden');
        btnNut.className = "text-gray-400 font-bold text-sm flex flex-col items-center";
        btnWork.className = "text-gym-green font-bold text-sm flex flex-col items-center";
    }
}

// 3. لوحة التحكم المخفية (5 نقرات على الشعار)
let clickCount = 0;
document.getElementById('logo-trigger')?.addEventListener('click', () => {
    clickCount++;
    if (clickCount >= 5) {
        document.getElementById('admin-modal').classList.remove('hidden');
        clickCount = 0;
    }
});
document.getElementById('close-admin')?.addEventListener('click', () => {
    document.getElementById('admin-modal').classList.add('hidden');
});
document.getElementById('login-admin')?.addEventListener('click', () => {
    const pass = document.getElementById('admin-pass').value;
    if (pass === 'admin123' || pass === 'NGYM') {
        document.getElementById('admin-content').classList.remove('hidden');
    } else {
        alert('كلمة المرور خاطئة');
    }
});

// 4. الشات وإرسال الرسائل للـ API
const sendBtn = document.getElementById('send-btn');
const chatInput = document.getElementById('chat-input');
const chatBox = document.getElementById('chat-box');

async function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    chatBox.innerHTML += `<div class="bg-gym-green text-black p-3 rounded-xl max-w-[85%] ml-auto font-medium">${text}</div>`;
    chatInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    const loadingId = 'loading-' + Date.now();
    chatBox.innerHTML += `<div id="${loadingId}" class="bg-gray-800 p-3 rounded-xl max-w-[85%] text-gray-400 animate-pulse">جاري الرد...</div>`;
    chatBox.scrollTop = chatBox.scrollHeight;

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ promptText: text })
        });
        const data = await response.json();
        document.getElementById(loadingId)?.remove();

        if (response.ok) {
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أتمكن من صياغة الرد.';
            chatBox.innerHTML += `<div class="bg-gray-800 p-3 rounded-xl max-w-[85%] text-gray-200">${reply}</div>`;
        } else {
            chatBox.innerHTML += `<div class="bg-red-900/50 text-red-200 p-3 rounded-xl max-w-[85%]">خطأ في الخادم</div>`;
        }
        chatBox.scrollTop = chatBox.scrollHeight;
    } catch (err) {
        document.getElementById(loadingId)?.remove();
        chatBox.innerHTML += `<div class="bg-red-900/50 text-red-200 p-3 rounded-xl max-w-[85%]">فشل الاتصال بالشبكة</div>`;
    }
}

sendBtn?.addEventListener('click', handleSendMessage);
chatInput?.addEventListener('keypress', (e) => { if(e.key === 'Enter') handleSendMessage(); });

// التشغيل عند التحميل
window.addEventListener('DOMContentLoaded', () => {
    checkTrialStatus();
});
