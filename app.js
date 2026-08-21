// تسجيل الـ Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

// عناصر الواجهة
const adminLogoBtn = document.getElementById('adminLogoBtn');
const adminModal = document.getElementById('adminModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const submitAdminBtn = document.getElementById('submitAdminBtn');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const startBtn = document.getElementById('startBtn');

const adminLoginSection = document.getElementById('adminLoginSection');
const adminPanelSection = document.getElementById('adminPanelSection');
const generateCodeBtn = document.getElementById('generateCodeBtn');
const codeDurationSelect = document.getElementById('codeDurationSelect');
const generatedCodeContainer = document.getElementById('generatedCodeContainer');
const displayGeneratedCode = document.getElementById('displayGeneratedCode');
const copyCodeBtn = document.getElementById('copyCodeBtn');

let clickCount = 0;
let clickTimer = null;

// 1. الفتح عند الضغط 5 مرات
adminLogoBtn.addEventListener('click', () => {
    clickCount++;
    clearTimeout(clickTimer);
    
    if (clickCount === 5) {
        adminModal.style.display = 'flex';
        adminPasswordInput.focus();
        clickCount = 0;
    } else {
        clickTimer = setTimeout(() => { clickCount = 0; }, 2000);
    }
});

// 2. إغلاق النافذة
closeModalBtn.addEventListener('click', () => {
    adminModal.style.display = 'none';
    adminPasswordInput.value = '';
    adminLoginSection.style.display = 'block';
    adminPanelSection.style.display = 'none';
    generatedCodeContainer.style.display = 'none';
});

// 3. التحقق من كلمة المرور وفتح اللوحة
submitAdminBtn.addEventListener('click', () => {
    const pass = adminPasswordInput.value.trim();
    if (pass === "Newton123") {
        adminLoginSection.style.display = 'none';
        adminPanelSection.style.display = 'block';
        adminPasswordInput.value = '';
    } else {
        alert("كلمة المرور غير صحيحة!");
        adminPasswordInput.value = '';
    }
});

// 4. دالة توليد أكواد عشوائية فريدة
generateCodeBtn.addEventListener('click', () => {
    const duration = codeDurationSelect.value;
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newCode = `NGYM-${duration}-${randomChars}`;

    displayGeneratedCode.innerText = newCode;
    generatedCodeContainer.style.display = 'block';
});

// 5. نسخ الكود
copyCodeBtn.addEventListener('click', () => {
    const code = displayGeneratedCode.innerText;
    navigator.clipboard.writeText(code).then(() => {
        alert(`تم نسخ الكود: ${code}`);
    });
});

// زر ابدأ
startBtn.addEventListener('click', () => {
    alert("جاري تجهيز باقي الواجهات والميزات للبدء!");
});
