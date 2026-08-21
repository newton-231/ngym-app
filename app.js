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

const adminLoginSection = document.getElementById('adminLoginSection');
const adminPanelSection = document.getElementById('adminPanelSection');
const generateCodeBtn = document.getElementById('generateCodeBtn');
const codeDurationSelect = document.getElementById('codeDurationSelect');
const generatedCodeContainer = document.getElementById('generatedCodeContainer');
const displayGeneratedCode = document.getElementById('displayGeneratedCode');
const copyCodeBtn = document.getElementById('copyCodeBtn');

// الشاشات
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
const resetAccountBtn = document.getElementById('resetAccountBtn');

let clickCount = 0;
let clickTimer = null;
let activeCodes = JSON.parse(localStorage.getItem('ngym_codes')) || [];

// خريطة الأهداف
const goalMap = {
    bulking: "هدف الخطة: تضخيم عضلات 💪",
    cutting: "هدف الخطة: تنشيف وخسارة دهون 🔥",
    fitness: "هدف الخطة: لياقة ورشاقة 🏃‍♂️"
};

// تمارين كل يوم
const sampleWorkouts = {
    sat: {
        title: "تمرين الصدر والترابايس 💪",
        exercises: [
            { name: "ضغط الصدر مستوي بالبار (Bench Press)", sets: "4 جولات × 10 تكرارات" },
            { name: "تجميع صدر علوي بالدمبل (Incline Press)", sets: "3 جولات × 12 تكرار" },
            { name: "تجميع سلك سفلي (Cable Fly)", sets: "3 جولات × 15 تكرار" }
        ]
    },
    sun: {
        title: "تمرين الظهر والبايسبس 🏋️‍♂️",
        exercises: [
            { name: "سحب ظهر عالي (Lat Pulldown)", sets: "4 جولات × 12 تكرار" },
            { name: "سحب بار أرضي (Barbell Row)", sets: "3 جولات × 10 تكرارات" },
            { name: "تبادل بالدمبل للبايسبس (Bicep Curls)", sets: "3 جولات × 12 تكرار" }
        ]
    },
    mon: { title: "يوم راحة واستشفاء 🧘‍♂️", exercises: [] },
    tue: {
        title: "تمرين الأكتاف والبطن 🛡️",
        exercises: [
            { name: "ضغط أكتاف بالدمبل (Overhead Press)", sets: "4 جولات × 10 تكرارات" },
            { name: "رفرفة جانبي (Lateral Raises)", sets: "4 جولات × 15 تكرار" }
        ]
    },
    wed: {
        title: "تمرين الأرجل والسكوات 🦵",
        exercises: [
            { name: "سكوات بالبار (Barbell Squat)", sets: "4 جولات × 10 تكرارات" },
            { name: "دفع أرجل بالماكينة (Leg Press)", sets: "3 جولات × 12 تكرار" }
        ]
    },
    thu: { title: "تمرين كارديو وبطن 🔥", exercises: [] },
    fri: { title: "يوم راحة 🧘‍♂️", exercises: [] }
};

// فحص الدخول التلقائي إذا كان الحساب مسجلاً مسبقاً
window.addEventListener('DOMContentLoaded', () => {
    const savedProfile = localStorage.getItem('ngym_user');
    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        userGoalBadge.innerText = goalMap[profile.goal];
        heroSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        loadDayWorkout('sat');
    }
});

// 1. فتح نافذة الأدمن 5 ضغطات
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

closeModalBtn.addEventListener('click', () => {
    adminModal.style.display = 'none';
    adminPasswordInput.value = '';
    adminLoginSection.style.display = 'block';
    adminPanelSection.style.display = 'none';
    generatedCodeContainer.style.display = 'none';
});

submitAdminBtn.addEventListener('click', () => {
    if (adminPasswordInput.value.trim() === "Newton123") {
        adminLoginSection.style.display = 'none';
        adminPanelSection.style.display = 'block';
        adminPasswordInput.value = '';
    } else {
        alert("كلمة المرور غير صحيحة!");
    }
});

generateCodeBtn.addEventListener('click', () => {
    const duration = codeDurationSelect.value;
    const randomChars = Math.random().toString(36).substring(2, 7).toUpperCase();
    const newCode = `NGYM-${duration}-${randomChars}`;
    activeCodes.push(newCode);
    localStorage.setItem('ngym_codes', JSON.stringify(activeCodes));
    displayGeneratedCode.innerText = newCode;
    generatedCodeContainer.style.display = 'block';
});

copyCodeBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(displayGeneratedCode.innerText).then(() => {
        alert(`تم نسخ الكود: ${displayGeneratedCode.innerText}`);
    });
});

startBtn.addEventListener('click', () => {
    heroSection.style.display = 'none';
    codeActivationSection.style.display = 'block';
});

backToHeroBtn.addEventListener('click', () => {
    codeActivationSection.style.display = 'none';
    heroSection.style.display = 'block';
});

activateCodeBtn.addEventListener('click', () => {
    const enteredCode = userCodeInput.value.trim().toUpperCase();
    if (!enteredCode) {
        alert("الرجاء إدخال كود الاشتراك!");
        return;
    }
    if (activeCodes.includes(enteredCode) || enteredCode.startsWith("NGYM-")) {
        alert("تم تفعيل اشتراكك بنجاح! 🔥");
        userCodeInput.value = '';
        codeActivationSection.style.display = 'none';
        userOnboardingSection.style.display = 'block';
    } else {
        alert("كود الاشتراك غير صحيح!");
    }
});

saveProfileBtn.addEventListener('click', () => {
    const weight = userWeightInput.value;
    const height = userHeightInput.value;

    if (!weight || !height) {
        alert("يرجى إدخال الوزن والطول!");
        return;
    }

    const userProfile = {
        goal: userGoalSelect.value,
        weight: weight,
        height: height,
        level: userLevelSelect.value
    };

    localStorage.setItem('ngym_user', JSON.stringify(userProfile));
    userGoalBadge.innerText = goalMap[userProfile.goal];
    userOnboardingSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    loadDayWorkout('sat');
});

function loadDayWorkout(dayKey) {
    const data = sampleWorkouts[dayKey];
    workoutTitle.innerText = data.title;
    exerciseList.innerHTML = '';

    if (data.exercises.length === 0) {
        exerciseList.innerHTML = `<div style="text-align: center; color: #888; padding: 30px; background: #121212; border-radius: 12px;">اليوم مخصص للراحة والاستشفاء 🧘‍♂️</div>`;
        return;
    }

    data.exercises.forEach((ex, index) => {
        const card = document.createElement('div');
        card.style.cssText = "background: #181818; border: 1px solid #2a2a2a; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 10px;";
        
        card.innerHTML = `
            <h4 style="color: #fff; font-size: 15px;">${index + 1}. ${ex.name}</h4>
            <p style="color: var(--primary-green); font-size: 13px; font-weight: bold;">${ex.sets}</p>
            <button onclick="this.innerText='تم الإنجاز ✅'; this.style.background='#27ae60';" style="background: #333; color: #fff; border: none; padding: 8px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-top: 5px;">تحديد كمكتمل</button>
        `;
        exerciseList.appendChild(card);
    });
}

document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        loadDayWorkout(e.target.getAttribute('data-day'));
    });
});

resetAccountBtn.addEventListener('click', () => {
    if (confirm("هل أنت تأكد من تسجيل الخروج وإعادة الضبط؟")) {
        localStorage.removeItem('ngym_user');
        location.reload();
    }
});
