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
const userOnboardingSection = document.getElementById('userOnboardingSection');
const dashboardSection = document.getElementById('dashboardSection');

const startBtn = document.getElementById('startBtn');
const backToHeroBtn = document.getElementById('backToHeroBtn');
const activateCodeBtn = document.getElementById('activateCodeBtn');
const userCodeInput = document.getElementById('userCodeInput');

// عناصر بيانات المستخدم والداشبورد
const userGoalSelect = document.getElementById('userGoalSelect');
const userWeightInput = document.getElementById('userWeightInput');
const userHeightInput = document.getElementById('userHeightInput');
const userLevelSelect = document.getElementById('userLevelSelect');
const saveProfileBtn = document.getElementById('saveProfileBtn');
const userGoalBadge = document.getElementById('userGoalBadge');
const exerciseList = document.getElementById('exerciseList');
const workoutTitle = document.getElementById('workoutTitle');

let clickCount = 0;
let clickTimer = null;
let activeCodes = [];
let userProfile = {};

// قاعدة بيانات التمارين التجريبية لكل يوم
const sampleWorkouts = {
    sat: {
        title: "تمرين الصدر والترابايس 💪",
        exercises: [
            { name: "ضغط الصدر مستوي بالبار (Bench Press)", sets: "4 جولات × 10 تكرارات", gif: "assets/gifs/bench-press.gif" },
            { name: "تجميع صدر علوي بالدمبل (Incline Dumbbell Press)", sets: "3 جولات × 12 تكرار", gif: "assets/gifs/incline-press.gif" },
            { name: "تجميع سلك سفلي (Cable Fly)", sets: "3 جولات × 15 تكرار", gif: "assets/gifs/cable-fly.gif" }
        ]
    },
    sun: {
        title: "تمرين الظهر والبايسبس 🏋️‍♂️",
        exercises: [
            { name: "سحب ظهر عالي (Lat Pulldown)", sets: "4 جولات × 12 تكرار", gif: "assets/gifs/lat-pulldown.gif" },
            { name: "سحب بار أرضي (Barbell Row)", sets: "3 جولات × 10 تكرارات", gif: "assets/gifs/barbell-row.gif" },
            { name: "تبادل بالدمبل للبايسبس (Bicep Curls)", sets: "3 جولات × 12 تكرار", gif: "assets/gifs/bicep-curl.gif" }
        ]
    },
    mon: { title: "يوم راحة واستشفاء 🧘‍♂️", exercises: [] },
    tue: {
        title: "تمرين الأكتاف والبطن 🛡️",
        exercises: [
            { name: "ضغط أكتاف بالدمبل (Overhead Press)", sets: "4 جولات × 10 تكرارات", gif: "assets/gifs/shoulder-press.gif" },
            { name: "رفرفة جانبي (Lateral Raises)", sets: "4 جولات × 15 تكرار", gif: "assets/gifs/lateral-raise.gif" }
        ]
    },
    wed: {
        title: "تمرين الأرجل والسكوات 🦵",
        exercises: [
            { name: "سكوات بالبار (Barbell Squat)", sets: "4 جولات × 10 تكرارات", gif: "assets/gifs/squat.gif" },
            { name: "دفع أرجل بالماكينة (Leg Press)", sets: "3 جولات × 12 تكرار", gif: "assets/gifs/leg-press.gif" }
        ]
    },
    thu: { title: "تمرين كارديو وبطن 🔥", exercises: [] },
    fri: { title: "يوم راحة 🧘‍♂️", exercises: [] }
};

// 1. فتح نافذة الأدمن بالضغط 5 مرات
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

// 3. تسجيل دخول الأدمن
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

// 4. توليد كود
generateCodeBtn.addEventListener('click', () => {
    const duration = codeDurationSelect.value;
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newCode = `NGYM-${duration}-${randomChars}`;
    activeCodes.push(newCode);
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

// 6. التنقل بين الشاشات
startBtn.addEventListener('click', () => {
    heroSection.style.display = 'none';
    codeActivationSection.style.display = 'block';
});

backToHeroBtn.addEventListener('click', () => {
    codeActivationSection.style.display = 'none';
    heroSection.style.display = 'block';
});

// 7. تفعيل الكود
activateCodeBtn.addEventListener('click', () => {
    const enteredCode = userCodeInput.value.trim().toUpperCase();
    if (enteredCode === "") {
        alert("الرجاء إدخال كود الاشتراك أولاً!");
        return;
    }
    if (activeCodes.includes(enteredCode) || enteredCode.startsWith("NGYM-")) {
        alert("تم تفعيل اشتراكك بنجاح! مرحباً بك في NGym 🔥");
        userCodeInput.value = '';
        codeActivationSection.style.display = 'none';
        userOnboardingSection.style.display = 'block';
    } else {
        alert("كود الاشتراك غير صحيح أو منتهي الصلاحية!");
    }
});

// 8. حفظ بيانات المشترك وعرض الواجهة الرئيسية
saveProfileBtn.addEventListener('click', () => {
    const weight = userWeightInput.value;
    const height = userHeightInput.value;

    if (!weight || !height) {
        alert("يرجى إدخال الوزن والطول بشكل صحيح!");
        return;
    }

    const goalMap = {
        bulking: "هدف الخطة: تضخيم عضلات 💪",
        cutting: "هدف الخطة: تنشيف وخسارة دهون 🔥",
        fitness: "هدف الخطة: لياقة ورشاقة 🏃‍♂️"
    };

    userProfile = {
        goal: userGoalSelect.value,
        weight: weight,
        height: height,
        level: userLevelSelect.value
    };

    userGoalBadge.innerText = goalMap[userProfile.goal];
    userOnboardingSection.style.display = 'none';
    dashboardSection.style.display = 'block';

    // تحميل تمارين يوم السبت افتراضياً
    loadDayWorkout('sat');
});

// 9. دالة عرض تمارين اليوم المختار
function loadDayWorkout(dayKey) {
    const data = sampleWorkouts[dayKey];
    workoutTitle.innerText = data.title;
    exerciseList.innerHTML = '';

    if (data.exercises.length === 0) {
        exerciseList.innerHTML = `<div style="text-align: center; color: #888; padding: 30px; background: #121212; border-radius: 12px;">اليوم مخصص للراحة والاستشفاء، لا توجد تمارين 🧘‍♂️</div>`;
        return;
    }

    data.exercises.forEach((ex, index) => {
        const card = document.createElement('div');
        card.style.cssText = "background: #181818; border: 1px solid #2a2a2a; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 10px;";
        
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h4 style="color: #fff; font-size: 15px;">${index + 1}. ${ex.name}</h4>
            </div>
            <p style="color: var(--primary-green); font-size: 13px; font-weight: bold;">${ex.sets}</p>
            <div style="background: #111; height: 140px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #555; font-size: 12px;">
                [ صوّرة التمرين المتحركة GIF ]
            </div>
            <button onclick="this.innerText='تم الإنجاز ✅'; this.style.background='#27ae60';" style="background: #333; color: #fff; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-top: 5px;">تحديد كمكتمل</button>
        `;
        exerciseList.appendChild(card);
    });
}

// أزرار التنقل بين أيام الأسبوع
document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadDayWorkout(e.target.getAttribute('data-day'));
    });
});
