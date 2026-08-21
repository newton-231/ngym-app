// دوال التبويبات والتنقل بين الواجهات
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

// لوحة التحكم المخفية (الضغط 5 مرات على اللوجو)
let clickCount = 0;
const logoTrigger = document.getElementById('logo-trigger');
const adminModal = document.getElementById('admin-modal');
const closeAdmin = document.getElementById('close-admin');
const loginAdmin = document.getElementById('login-admin');

if (logoTrigger) {
    logoTrigger.addEventListener('click', () => {
        clickCount++;
        if (clickCount >= 5) {
            adminModal.classList.remove('hidden');
            clickCount = 0;
        }
    });
}

if (closeAdmin) {
    closeAdmin.addEventListener('click', () => {
        adminModal.classList.add('hidden');
    });
}

if (loginAdmin) {
    loginAdmin.addEventListener('click', () => {
        const pass = document.getElementById('admin-pass').value;
        // كلمة مرور مبدئية للمشرف (يمكنك تعديلها)
        if (pass === 'admin123' || pass === 'NGYM') {
            document.getElementById('admin-content').classList.remove('hidden');
            alert('تم الدوحة بنجاح لوحة التحكم مفعلة');
        } else {
            alert('كلمة المرور غير صحيحة');
        }
    });
}

// إدارة الشات وإرسال الرسائل للخادم (API)
const sendBtn = document.getElementById('send-btn');
const chatInput = document.getElementById('chat-input');
const chatBox = document.getElementById('chat-box');

async function handleSendMessage() {
    const text = chatInput.value.trim();
    if (!text) return;

    // إضافة رسالة المستخدم للواجهة
    chatBox.innerHTML += `<div class="bg-gym-green text-black p-3 rounded-xl max-w-[85%] ml-auto font-medium">${text}</div>`;
    chatInput.value = '';
    chatBox.scrollTop = chatBox.scrollHeight;

    // إضافة مؤشر التحميل المؤقت
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
        
        // إزالة مؤشر التحميل
        document.getElementById(loadingId)?.remove();

        if (response.ok) {
            const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'عذراً، لم أتمكن من صياغة الرد.';
            chatBox.innerHTML += `<div class="bg-gray-800 p-3 rounded-xl max-w-[85%] text-gray-200">${reply}</div>`;
        } else {
            chatBox.innerHTML += `<div class="bg-red-900/50 text-red-200 p-3 rounded-xl max-w-[85%]">خطأ: ${data.error || 'حدث خطأ في النظام'}</div>`;
        }
        chatBox.scrollTop = chatBox.scrollHeight;

    } catch (error) {
        document.getElementById(loadingId)?.remove();
        chatBox.innerHTML += `<div class="bg-red-900/50 text-red-200 p-3 rounded-xl max-w-[85%]">فشل الاتصال بالخادم. تحقق من الإنترنت.</div>`;
        chatBox.scrollTop = chatBox.scrollHeight;
    }
}

if (sendBtn) {
    sendBtn.addEventListener('click', handleSendMessage);
}

if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
}

// تهيئة البيانات عند فتح التطبيق
window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('sub-title').innerText = 'احتياجك الغذائي اليومي';
    // التحقق من حالة الاشتراك أو الأكواد المحفوظة محلياً
    const savedSub = localStorage.getItem('ngym_subscription');
    if (!savedSub) {
        localStorage.setItem('ngym_subscription', 'active');
    }
});
