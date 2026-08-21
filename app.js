// 1. تسجيل الـ Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch(err => console.log(err));
    });
}

// 2. طلب إذن التنبيهات وإرسال إشعار التمرين اليومي
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                sendDailyWorkoutNotification();
            }
        });
    }
}

function sendDailyWorkoutNotification() {
    if (Notification.permission === 'granted') {
        const today = new Date().getDay();
        const days = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const workoutToday = sampleWorkouts[days[today]];
        
        new Notification("NGym - تنبيه التمرين 🔥", {
            body: `جدولك اليوم: ${workoutToday ? workoutToday.title : 'راحة واستشفاء'}`,
            icon: './icon.png'
        });
    }
}

// 3. محاكات/ربط الـ AI Agent للحصول على تحليل مخصص للتمرين
async function consultAIAgent(exerciseName, weight, reps) {
    const aiResponseContainer = document.getElementById('aiCoachResponse');
    if (aiResponseContainer) {
        aiResponseContainer.innerText = "جاري تحليل أداءك بواسطة الـ AI Agent... 🤖";
    }

    // هنا يتم ربط الـ API الخاص بـ OpenAI / Gemini أو السيرفر الخاص بك
    // مثال لاستجابة الـ Agent بناءً على المدخلات:
    setTimeout(() => {
        let feedback = `رائع جداً! رفع ${weight} كجم لـ ${reps} تكرار في تمرين (${exerciseName}) أداء ممتاز. `;
        if (reps >= 12) {
            feedback += "نقترح زيادة الوزن بمقدار 2.5 كجم في الجولة القادمة للتضخيم الأفضل 💪.";
        } else {
            feedback += "حافظ على هذا الوزن وتركيز التكنيك للوصول لـ 12 تكرار 🎯.";
        }

        if (aiResponseContainer) {
            aiResponseContainer.innerText = `🤖 نصيحة الـ AI Coach:\n${feedback}`;
        }
    }, 1000);
}

// تثبيت التطبيق PWA
let deferredPrompt;
const installAppBtn = document.getElementById('installAppBtn');

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installAppBtn) installAppBtn.style.display = 'block';
});

if (installAppBtn) {
    installAppBtn.addEventListener('click', () => {
        installAppBtn.style.display = 'none';
        if (deferredPrompt) {
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
        }
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

// عناصر البيانات والداشبورد
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

const goalMap = {
    bulking: "هدف الخطة: تضخيم عضلات 💪",
    cutting: "هدف الخطة: تنشيف وخسارة دهون 🔥",
    fitness: "هدف الخطة: لياقة ورشاقة 🏃‍♂️"
};

// تمارين الأسبوع
const sampleWorkouts = {
    sat: {
        title: "تمرين الصدر والترابايس 💪",
        exercises: [
            { id: "sat_ex1", name: "ضغط الصدر مستوي بالبار (Bench Press)", sets: "4 جولات × 10 تكرارات", gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Zsd24xbWZ4a2J2YmZ3MWpneGptdHFvbmF3NWJrb2p2Nnc5eXRvYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKL3sC625wB2u4E/giphy.gif" },
            { id: "sat_ex2", name: "تجميع صدر علوي بالدمبل (Incline Press)", sets: "3 جولات × 12 تكرار", gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNndnOHp3NGNxeW8zMnBsZjFuaTFxMmdxNmpsMWZxdndidWRiandhdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlCqV35D6VIakP6/giphy.gif" },
            { id: "sat_ex3", name: "تجميع سلك سفلي (Cable Fly)", sets: "3 جولات × 15 تكرار", gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmZ1MmZyd2s5NzB1dW1ia2RwMWFwY3B5MWt5NnZ2OGw0NDJxbHFpYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4PZJ04HkFq2L8k/giphy.gif" }
        ]
    },
    sun: {
        title: "تمرين الظهر والبايسبس 🏋️‍♂️",
        exercises: [
            { id: "sun_ex1", name: "سحب ظهر عالي (Lat Pulldown)", sets: "4 جولات × 12 تكرار", gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExMmZ1MmZyd2s5NzB1dW1ia2RwMWFwY3B5MWt5NnZ2OGw0NDJxbHFpYSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4PZJ04HkFq2L8k/giphy.gif" },
            { id: "sun_ex2", name: "سحب بار أرضي (Barbell Row)", sets: "3 جولات × 10 تكرارات", gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Zsd24xbWZ4a2J2YmZ3MWpneGptdHFvbmF3NWJrb2p2Nnc5eXRvYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKL3sC625wB2u4E/giphy.gif" },
            { id: "sun_ex3", name: "تبادل بالدمبل للبايسبس (Bicep Curls)", sets: "3 جولات × 12 تكرار", gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNndnOHp3NGNxeW8zMnBsZjFuaTFxMmdxNmpsMWZxdndidWRiandhdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlCqV35D6VIakP6/giphy.gif" }
        ]
    },
    mon: { title: "يوم راحة واستشفاء 🧘‍♂️", exercises: [] },
    tue: {
        title: "تمرين الأكتاف والبطن 🛡️",
        exercises: [
            { id: "tue_ex1", name: "ضغط أكتاف بالدمبل (Overhead Press)", sets: "4 جولات × 10 تكرارات", gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Zsd24xbWZ4a2J2YmZ3MWpneGptdHFvbmF3NWJrb2p2Nnc5eXRvYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKL3sC625wB2u4E/giphy.gif" },
            { id: "tue_ex2", name: "رفرفة جانبي (Lateral Raises)", sets: "4 جولات × 15 تكرار", gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNndnOHp3NGNxeW8zMnBsZjFuaTFxMmdxNmpsMWZxdndidWRiandhdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlCqV35D6VIakP6/giphy.gif" }
        ]
    },
    wed: {
        title: "تمرين الأرجل والسكوات 🦵",
        exercises: [
            { id: "wed_ex1", name: "سكوات بالبار (Barbell Squat)", sets: "4 جولات × 10 تكرارات", gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExM3Zsd24xbWZ4a2J2YmZ3MWpneGptdHFvbmF3NWJrb2p2Nnc5eXRvYiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKL3sC625wB2u4E/giphy.gif" },
            { id: "wed_ex2", name: "دفع أرجل بالماكينة (Leg Press)", sets: "3 جولات × 12 تكرار", gif: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExNndnOHp3NGNxeW8zMnBsZjFuaTFxMmdxNmpsMWZxdndidWRiandhdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlCqV35D6VIakP6/giphy.gif" }
        ]
    },
    thu: { title: "تمرين كارديو وبطن 🔥", exercises: [] },
    fri: { title: "يوم راحة 🧘‍♂️", exercises: [] }
};

// حساب السعرات والماكروز
function calculateNutrition(weight, height, goal) {
    let bmr = (10 * weight) + (6.25 * height) - (5 * 25) + 5; 
    let tdee = bmr * 1.45;

    let calories = Math.round(tdee);
    let protein = Math.round(weight * 2.0);

    if (goal === 'bulking') {
        calories += 400;
    } else if (goal === 'cutting') {
        calories -= 400;
        protein = Math.round(weight * 2.2);
    }

    let fat = Math.round((calories * 0.25) / 9);
    let carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4);

    return { calories, protein, carbs, fat };
}

// عرض كارت الماكروز و AI Coach Box
function renderNutritionAndAICard(profile) {
    const nutrition = calculateNutrition(profile.weight, profile.height, profile.goal);
    
    let container = document.getElementById('aiAndNutritionContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'aiAndNutritionContainer';
        container.style.cssText = "display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px;";
        dashboardSection.insertBefore(container, dashboardSection.children[1]);
    }

    container.innerHTML = `
        <!-- كارت السعرات -->
        <div style="background: #141414; border: 1px solid var(--primary-green); border-radius: 12px; padding: 15px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                <h4 style="color: var(--primary-green); font-size: 15px;">احتياجك الغذائي اليومي 🥗</h4>
                <button onclick="requestNotificationPermission()" style="background: #222; color: #fff; border: 1px solid #444; border-radius: 6px; padding: 4px 8px; font-size: 11px; cursor: pointer;">تفعيل التنبيهات 🔔</button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; text-align: center;">
                <div style="background: #222; padding: 8px; border-radius: 8px;">
                    <span style="font-size: 11px; color: #aaa; display: block;">السعرات</span>
                    <strong style="color: #fff; font-size: 14px;">${nutrition.calories}</strong>
                </div>
                <div style="background: #222; padding: 8px; border-radius: 8px;">
                    <span style="font-size: 11px; color: #aaa; display: block;">البروتين</span>
                    <strong style="color: #2ecc71; font-size: 14px;">${nutrition.protein}g</strong>
                </div>
                <div style="background: #222; padding: 8px; border-radius: 8px;">
                    <span style="font-size: 11px; color: #aaa; display: block;">الكارب</span>
                    <strong style="color: #f39c12; font-size: 14px;">${nutrition.carbs}g</strong>
                </div>
                <div style="background: #222; padding: 8px; border-radius: 8px;">
                    <span style="font-size: 11px; color: #aaa; display: block;">الدهون</span>
                    <strong style="color: #e74c3c; font-size: 14px;">${nutrition.fat}g</strong>
                </div>
            </div>
        </div>

        <!-- صندوق رد الـ AI Agent -->
        <div style="background: #111; border: 1px dashed #333; border-radius: 12px; padding: 12px;">
            <p id="aiCoachResponse" style="color: #00ff66; font-size: 13px; margin: 0; line-height: 1.5;">
                🤖 **AI Coach جاهز!** سجل أوزان التمرين اضغط "حفظ واستشارة AI" لتلقي التقييم الشامل.
            </p>
        </div>
    `;
}

// فحص الدخول التلقائي
window.addEventListener('DOMContentLoaded', () => {
    const savedProfile = localStorage.getItem('ngym_user');
    if (savedProfile) {
        const profile = JSON.parse(savedProfile);
        userGoalBadge.innerText = goalMap[profile.goal];
        heroSection.style.display = 'none';
        dashboardSection.style.display = 'block';
        renderNutritionAndAICard(profile);
        loadDayWorkout('sat');
        requestNotificationPermission();
    }
});

// الأدمن والتنقل
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
        weight: Number(weight),
        height: Number(height),
        level: userLevelSelect.value
    };

    localStorage.setItem('ngym_user', JSON.stringify(userProfile));
    userGoalBadge.innerText = goalMap[userProfile.goal];
    userOnboardingSection.style.display = 'none';
    dashboardSection.style.display = 'block';
    
    renderNutritionAndAICard(userProfile);
    loadDayWorkout('sat');
    requestNotificationPermission();
});

// عرض تمارين اليوم
function loadDayWorkout(dayKey) {
    const data = sampleWorkouts[dayKey];
    workoutTitle.innerText = data.title;
    exerciseList.innerHTML = '';

    if (data.exercises.length === 0) {
        exerciseList.innerHTML = `<div style="text-align: center; color: #888; padding: 30px; background: #121212; border-radius: 12px;">اليوم مخصص للراحة والاستشفاء 🧘‍♂️</div>`;
        return;
    }

    const logs = JSON.parse(localStorage.getItem('ngym_logs')) || {};

    data.exercises.forEach((ex, index) => {
        const savedData = logs[ex.id] || { weight: '', reps: '', done: false };

        const card = document.createElement('div');
        card.style.cssText = "background: #181818; border: 1px solid #2a2a2a; border-radius: 12px; padding: 15px; display: flex; flex-direction: column; gap: 10px;";
        
        card.innerHTML = `
            <h4 style="color: #fff; font-size: 15px;">${index + 1}. ${ex.name}</h4>
            <p style="color: var(--primary-green); font-size: 13px; font-weight: bold;">${ex.sets}</p>
            
            <div style="width: 100%; height: 180px; background: #111; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center;">
                <img src="${ex.gif}" alt="${ex.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                <span style="display: none; color: #666; font-size: 12px;">عذراً، تعذر تحميل حركة التمرين ⚠️</span>
            </div>

            <div style="display: flex; gap: 8px; margin-top: 5px;">
                <input type="number" id="weight_${ex.id}" value="${savedData.weight}" placeholder="الوزن (كجم)" class="modal-input" style="margin: 0; text-align: center;">
                <input type="number" id="reps_${ex.id}" value="${savedData.reps}" placeholder="التكرار" class="modal-input" style="margin: 0; text-align: center;">
            </div>

            <button id="btn_${ex.id}" onclick="saveExerciseLog('${ex.id}', '${ex.name}')" style="background: ${savedData.done ? '#27ae60' : '#333'}; color: #fff; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-size: 13px;">
                ${savedData.done ? 'تم التخزين وإرسال الأداء للـ AI ✅' : 'حفظ الوزن وإرسال للـ AI 💾'}
            </button>
        `;
        exerciseList.appendChild(card);
    });
}

function saveExerciseLog(exId, exName) {
    const weightVal = document.getElementById(`weight_${exId}`).value;
    const repsVal = document.getElementById(`reps_${exId}`).value;
    const btn = document.getElementById(`btn_${exId}`);

    if (!weightVal || !repsVal) {
        alert("يرجى إدخال الوزن وعدد التكرارات أولاً!");
        return;
    }

    const logs = JSON.parse(localStorage.getItem('ngym_logs')) || {};
    logs[exId] = { weight: weightVal, reps: repsVal, done: true };

    localStorage.setItem('ngym_logs', JSON.stringify(logs));
    btn.style.background = '#27ae60';
    btn.innerText = 'تم التخزين وإرسال الأداء للـ AI ✅';

    // استدعاء AI Agent لتحليل الوزن
    consultAIAgent(exName, weightVal, repsVal);
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
        localStorage.removeItem('ngym_logs');
        location.reload();
    }
});
