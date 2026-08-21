// تسجيل الـ Service Worker للعمل أوفلاين
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

// عناصر الواجهة (DOM Elements)
const adminLogoBtn = document.getElementById('adminLogoBtn');
const adminModal = document.getElementById('adminModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const submitAdminBtn = document.getElementById('submitAdminBtn');
const adminPasswordInput = document.getElementById('adminPasswordInput');

const adminLoginSection = document.getElementById('adminLoginSection');
const adminPanelSection = document.getElementById('adminPanelSection');
const generateCodeBtn = document.getElementById('generateCodeBtn');
const codeDurationSelect = document.getElementById('codeDurationSelect');
const generatedCodeContainer = document.getElementById('generatedCodeContainer');
const displayGeneratedCode = document.getElementById('displayGeneratedCode');
const copyCodeBtn = document.getElementById('copyCodeBtn');

// عناصر الشاشات والانتقال
const heroSection = document.getElementById('heroSection');
const codeActivationSection = document.getElementById('codeActivationSection');
const startBtn = document.getElementById('startBtn');
const backToHeroBtn = document.getElementById('backToHeroBtn');
const activateCodeBtn = document.getElementById('activateCodeBtn');
const userCodeInput = document.getElementById('userCodeInput');

let clickCount = 0;
let clickTimer = null;

// قائمة حفظ الأكواد النشطة مؤقتاً في الذاكرة
let activeCodes = [];

// 1. الفتح عند الضغط 5 مرات متتالية على اللوجو
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

// 2. إغلاق النافذة المنبثقة للأدمن
closeModalBtn.addEventListener('click', () => {
    adminModal.style.display = 'none';
    adminPasswordInput.value = '';
    adminLoginSection.style.display = 'block';
    adminPanelSection.style.display = 'none';
    generatedCodeContainer.style.display = 'none';
});

// 3. دخول الأدمن والتحقق من كلمة المرور
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

// 4. توليد كود وتخزينه
generateCodeBtn.addEventListener('click', () => {
    const duration = codeDurationSelect.value;
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newCode = `NGYM-${duration}-${randomChars}`;

    activeCodes.push(newCode); // إضافة الكود للقائمة المعتمدة
    displayGeneratedCode.innerText = newCode;
    generatedCodeContainer.style.display = 'block';
});

// 5. نسخ الكود المولد
copyCodeBtn.addEventListener('click', () => {
    const code = displayGeneratedCode.innerText;
    navigator.clipboard.writeText(code).then(() => {
        alert(`تم نسخ الكود: ${code}`);
    });
});

// 6. التنقل بين الشاشات (الانتقال لصفحة التفعيل)
startBtn.addEventListener('click', () => {
    heroSection.style.display = 'none';
    codeActivationSection.style.display = 'block';
});

// العودة للرئيسية
backToHeroBtn.addEventListener('click', () => {
    codeActivationSection.style.display = 'none';
    heroSection.style.display = 'block';
});

// 7. تفعيل الكود من قِبل المستخدم
activateCodeBtn.addEventListener('click', () => {
    const enteredCode = userCodeInput.value.trim().toUpperCase();

    if (enteredCode === "") {
        alert("الرجاء إدخال كود الاشتراك أولاً!");
        return;
    }

    // التحقق هل الكود موجود في قائمة الأكواد المنسوخة أو يبدأ بـ NGYM
    if (activeCodes.includes(enteredCode) || enteredCode.startsWith("NGYM-")) {
        alert("تم تفعيل اشتراكك بنجاح! مرحباً بك في NGym 🔥");
        userCodeInput.value = '';
    } else {
        alert("كود الاشتراك غير صحيح أو منتهي الصلاحية!");
    }
});
