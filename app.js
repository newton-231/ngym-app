// المتغيرات الخاصة بالضغط 5 مرات
// تسجيل الـ Service Worker للعمل أوفلاين
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(() => console.log('NGym Service Worker Registered Successfully!'))
            .catch((err) => console.log('Service Worker Registration Failed:', err));
    });
}
let clickCount = 0;
let clickTimer = null;

// عناصر الواجهة (DOM Elements)
const adminLogoBtn = document.getElementById('adminLogoBtn');
const adminModal = document.getElementById('adminModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const submitAdminBtn = document.getElementById('submitAdminBtn');
const adminPasswordInput = document.getElementById('adminPasswordInput');
const startBtn = document.getElementById('startBtn');

// 1. الاستماع للضغطات الخمس المتتالية على اللوجو
adminLogoBtn.addEventListener('click', () => {
    clickCount++;
    
    // إعادة ضبط العداد إذا توقف المستخدم عن الضغط لمدة ثانيتين
    clearTimeout(clickTimer);
    
    if (clickCount === 5) {
        // فتح النافذة المنبثقة للأدمن
        adminModal.style.display = 'flex';
        adminPasswordInput.focus();
        clickCount = 0; // إعادة العداد للصفر
    } else {
        clickTimer = setTimeout(() => {
            clickCount = 0;
        }, 2000);
    }
});

// 2. إغلاق النافذة المنبثقة عند الضغط على زر X
closeModalBtn.addEventListener('click', () => {
    adminModal.style.display = 'none';
    adminPasswordInput.value = ''; // مسح كلمة المرور المدخلة
});

// 3. التحقق من كلمة المرور عند الضغط على زر "دخول"
submitAdminBtn.addEventListener('click', () => {
    const enteredPassword = adminPasswordInput.value.trim();

    if (enteredPassword === "Newton123") {
        alert("أهلاً بك يا بطل! تم تسجيل دخول المسؤول بنجاح.");
        adminModal.style.display = 'none';
        adminPasswordInput.value = '';
        // هنا سنفتح لوحة توليد الأكواد لاحقاً
    } else if (enteredPassword === "") {
        alert("الرجاء إدخال كلمة المرور أولاً!");
    } else {
        alert("كلمة المرور غير صحيحة!");
        adminPasswordInput.value = '';
    }
});

// 4. زر ابدأ رحلتك الآن
startBtn.addEventListener('click', () => {
    alert("جاري تجهيز باقي الواجهات والميزات للبدء!");
});