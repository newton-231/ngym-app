// ==================================================
// NGym - التطبيق الذكي بالكامل (JavaScript)
// الإصدار النهائي المتكامل مع Firebase
// ==================================================

// ---- 1. البيانات الثابتة والقيم الافتراضية ----
const DEFAULT_USER_DATA = {
    weight: 70, targetWeight: 75, height: 175, age: 24,
    gender: 'male', activity: 1.375, goal: 'bulking', xp: 0, apiKey: ''
};

const FALLBACK_WORKOUTS = [
    { id: 'pushup', name: 'تمرين الضغط', name_ar: 'تمرين الضغط', category: 'Calisthenics', target_muscle: 'Chest', location: 'home', met: 3.8 },
    { id: 'squat', name: 'Squat', name_ar: 'تمرين القرفصاء', category: 'Calisthenics', target_muscle: 'Legs', location: 'home', met: 5 },
    { id: 'plank', name: 'Plank', name_ar: 'تمرين البلانك', category: 'Calisthenics', target_muscle: 'Core', location: 'home', met: 4 }
];

let exerciseDatabase = [];
let selectedBase64Image = null;
let currentFilter = 'all';
let currentExercise = null;
let reminderInterval = null;
let logoClickCount = 0;
let logoClickTimer = null;

// ---- استخدام المتغير العام db من index.html (بدون إعادة تعريف) ----
if (typeof db === 'undefined') {
    var db = {
        collection: () => ({
            doc: () => ({
                set: () => Promise.resolve(),
                get: () => Promise.resolve({ exists: false, data: () => ({}) }),
                update: () => Promise.resolve()
            }),
            where: () => ({
                get: () => Promise.resolve({ empty: true, docs: [] })
            }),
            orderBy: () => ({
                limit: () => ({
                    get: () => Promise.resolve({ empty: true, docs: [] })
                })
            })
        })
    };
    console.warn('⚠️ db غير معرف، تم استخدام نسخة وهمية');
} else {
    console.log('✅ db متصل من index.html');
}

// ---- 2. إدارة التخزين المحلي الآمن ----
function getUserData() {
    try {
        return {
            weight: parseFloat(localStorage.getItem('userWeight')) || DEFAULT_USER_DATA.weight,
            targetWeight: parseFloat(localStorage.getItem('userTargetWeight')) || DEFAULT_USER_DATA.targetWeight,
            height: parseFloat(localStorage.getItem('userHeight')) || DEFAULT_USER_DATA.height,
            age: parseInt(localStorage.getItem('userAge')) || DEFAULT_USER_DATA.age,
            gender: localStorage.getItem('userGender') || DEFAULT_USER_DATA.gender,
            activity: parseFloat(localStorage.getItem('userActivity')) || DEFAULT_USER_DATA.activity,
            goal: localStorage.getItem('userGoal') || DEFAULT_USER_DATA.goal,
            xp: parseInt(localStorage.getItem('userXP')) || DEFAULT_USER_DATA.xp,
            apiKey: localStorage.getItem('geminiApiKey') || ''
        };
    } catch(e) {
        return DEFAULT_USER_DATA;
    }
}

function saveUserData(data) {
    try {
        if (data.weight) localStorage.setItem('userWeight', data.weight);
        if (data.targetWeight) localStorage.setItem('userTargetWeight', data.targetWeight);
        if (data.height) localStorage.setItem('userHeight', data.height);
        if (data.age) localStorage.setItem('userAge', data.age);
        if (data.gender) localStorage.setItem('userGender', data.gender);
        if (data.activity) localStorage.setItem('userActivity', data.activity);
        if (data.goal) localStorage.setItem('userGoal', data.goal);
        if (data.apiKey !== undefined) localStorage.setItem('geminiApiKey', data.apiKey);
        localStorage.setItem('hasOnboarded', 'true');
    } catch(e) {
        console.warn("Storage restricted", e);
    }
}

function checkDailyReset() {
    try {
        const today = new Date().toISOString().split('T')[0];
        if (localStorage.getItem('lastActiveDate') !== today) {
            localStorage.setItem('todayEatenCalories', 0);
            localStorage.setItem('todayEatenProtein', 0);
            localStorage.setItem('todayEatenCarbs', 0);
            localStorage.setItem('todayEatenFats', 0);
            localStorage.setItem('todayBurnedCalories', 0);
            localStorage.setItem('todayTargetedMuscles', JSON.stringify([]));
            localStorage.setItem('lastActiveDate', today);
        }
    } catch(e) {}
}

// ---- 3. دالة التنقل بين التبويبات (الحل الشامل لمنع التجمد) ----
function switchTab(tabId) {
    try {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden'));
        const target = document.getElementById(tabId);
        if (target) target.classList.remove('hidden');

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-emerald-400');
            btn.classList.add('text-slate-400');
        });
        const activeBtn = document.querySelector(`[onclick*="${tabId}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('text-slate-400');
            activeBtn.classList.add('text-emerald-400');
        }
    } catch(e) {
        console.error("Error switching tab:", e);
    }
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

// ---- 4. المحرك الرياضي ----
function calculateNutritionTargets() {
    const u = getUserData();
    let bmr = (10 * u.weight) + (6.25 * u.height) - (5 * u.age) + (u.gender === 'male' ? 5 : -161);
    let tdee = bmr * u.activity;
    let calories = tdee, protein = u.weight * 2.0;
    if (u.goal === 'bulking') { calories = tdee + 400; protein = u.weight * 2.2; }
    else if (u.goal === 'cutting') { calories = tdee - 450; protein = u.weight * 2.4; }
    let fats = (calories * 0.25) / 9;
    let carbs = Math.max(0, (calories - (protein * 4) - (fats * 9)) / 4);
    return { calories: Math.round(calories), protein: Math.round(protein), carbs: Math.round(carbs), fats: Math.round(fats) };
}

function logMeal(cal, pro, carb, fat) {
    const getNum = (k) => parseInt(localStorage.getItem(k)) || 0;
    localStorage.setItem('todayEatenCalories', getNum('todayEatenCalories') + cal);
    localStorage.setItem('todayEatenProtein', getNum('todayEatenProtein') + pro);
    localStorage.setItem('todayEatenCarbs', getNum('todayEatenCarbs') + carb);
    localStorage.setItem('todayEatenFats', getNum('todayEatenFats') + fat);
    addXP(15);
    updateDashboardUI();
}

function logExerciseWithDetails(muscle, metValue, durationMinutes) {
    const user = getUserData();
    const burned = Math.round(((metValue * 3.5 * user.weight) / 200) * durationMinutes);
    const currentBurned = parseInt(localStorage.getItem('todayBurnedCalories')) || 0;
    localStorage.setItem('todayBurnedCalories', currentBurned + burned);
    let muscles = JSON.parse(localStorage.getItem('todayTargetedMuscles')) || [];
    if (!muscles.includes(muscle)) muscles.push(muscle);
    localStorage.setItem('todayTargetedMuscles', JSON.stringify(muscles));
    addXP(25);
    updateDashboardUI();
    return burned;
}

function addXP(amt) {
    let xp = (parseInt(localStorage.getItem('userXP')) || 0) + amt;
    localStorage.setItem('userXP', xp);
}

function getRank(xp) {
    if (xp >= 1000) return { title: 'مقاتل محترف 🏆', color: 'text-amber-400' };
    if (xp >= 500) return { title: 'رياضي متقدم ⚡', color: 'text-purple-400' };
    if (xp >= 200) return { title: 'متدرب نشط 🔥', color: 'text-blue-400' };
    return { title: 'مبتدئ طموح 🌱', color: 'text-emerald-400' };
}

// ---- 5. تحديث الواجهة ----
function updateDashboardUI() {
    checkDailyReset();
    const targets = calculateNutritionTargets();
    const eatenCal = parseInt(localStorage.getItem('todayEatenCalories')) || 0;
    const burnedCal = parseInt(localStorage.getItem('todayBurnedCalories')) || 0;
    const eatenPro = parseInt(localStorage.getItem('todayEatenProtein')) || 0;
    const eatenCarb = parseInt(localStorage.getItem('todayEatenCarbs')) || 0;
    const eatenFat = parseInt(localStorage.getItem('todayEatenFats')) || 0;

    const netTarget = targets.calories + burnedCal;
    const remaining = netTarget - eatenCal;

    const elements = {
        'target-calories': targets.calories,
        'eaten-calories': eatenCal,
        'burned-calories': burnedCal,
        'remaining-calories': remaining,
        'target-protein': `${eatenPro}/${targets.protein}g`,
        'target-carbs': `${eatenCarb}/${targets.carbs}g`,
        'target-fats': `${eatenFat}/${targets.fats}g`
    };
    for (let id in elements) {
        const el = document.getElementById(id);
        if (el) el.textContent = elements[id];
    }

    const bars = {
        'protein-bar': (eatenPro / targets.protein) * 100,
        'carbs-bar': (eatenCarb / targets.carbs) * 100,
        'fats-bar': (eatenFat / targets.fats) * 100
    };
    for (let id in bars) {
        const el = document.getElementById(id);
        if (el) el.style.width = `${Math.min(100, bars[id] || 0)}%`;
    }

    const circle = document.getElementById('calories-progress-circle');
    if (circle) {
        const circumference = 2 * Math.PI * 42;
        const percent = Math.min(100, Math.max(0, (eatenCal / (netTarget || 1)) * 100));
        circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
    }

    const user = getUserData();
    const rank = getRank(user.xp);
    const rankEl = document.getElementById('user-rank');
    const xpEl = document.getElementById('user-xp');
    if (rankEl) {
        rankEl.textContent = rank.title;
        rankEl.className = `font-bold text-sm ${rank.color}`;
    }
    if (xpEl) xpEl.textContent = `${user.xp} XP`;

    highlightMuscles();
    updateSubscriptionUI();
}

function highlightMuscles() {
    const activeMuscles = JSON.parse(localStorage.getItem('todayTargetedMuscles')) || [];
    document.querySelectorAll('.muscle-group').forEach(el => el.classList.remove('muscle-active'));
    activeMuscles.forEach(m => {
        const el = document.getElementById(`muscle-${m}`);
        if (el) el.classList.add('muscle-active');
    });
}

// ---- 6. تحميل بيانات التمارين ----
async function loadExerciseDatabase() {
    try {
        const response = await fetch('/data/exercises.json');
        if (!response.ok) throw new Error('فشل تحميل ملف التمارين');
        const data = await response.json();
        exerciseDatabase = data;
        renderWorkoutsList();
    } catch (error) {
        exerciseDatabase = FALLBACK_WORKOUTS;
        renderWorkoutsList();
    }
}

function getExerciseGifUrl(exercise) {
    if (exercise.gif_url) return exercise.gif_url;
    return `assets/gifs/1/${exercise.id}.gif`;
}

// ---- 7. التمارين ----
function toggleFavorite(id) {
    let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (favs.includes(id)) favs = favs.filter(f => f !== id);
    else favs.push(id);
    localStorage.setItem('favorites', JSON.stringify(favs));
    renderWorkoutsList();
}

function filterWorkouts(filter) {
    currentFilter = filter;
    renderWorkoutsList();
}

function renderWorkoutsList() {
    const container = document.getElementById('workouts-list');
    if (!container) return;

    let filtered = exerciseDatabase;
    if (currentFilter === 'favorites') {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        filtered = exerciseDatabase.filter(ex => favs.includes(ex.id));
    } else if (currentFilter === 'home') {
        filtered = exerciseDatabase.filter(ex => ex.location === 'home');
    } else if (currentFilter === 'gym') {
        filtered = exerciseDatabase.filter(ex => ex.location === 'gym');
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 text-xs py-8">لا توجد تمارين مطابقة</div>';
        return;
    }

    container.innerHTML = filtered.map(ex => {
        const isFav = JSON.parse(localStorage.getItem('favorites') || '[]').includes(ex.id);
        const gifPath = getExerciseGifUrl(ex);
        const displayName = ex.name_ar || ex.name || 'تمرين';
        return `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm">
            <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 flex-shrink-0">
                <img src="${gifPath}" alt="${displayName}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='assets/gifs/default.gif';">
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-slate-200 truncate">${displayName}</h4>
                <p class="text-[10px] text-slate-400 mt-0.5 truncate">${ex.target_muscle || ''}</p>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
                <button onclick="toggleFavorite('${ex.id}')" class="text-${isFav ? 'yellow-400' : 'slate-500'} text-sm">
                    <i class="fa-solid fa-star"></i>
                </button>
                <button onclick="openExerciseModal('${ex.id}', '${displayName}', '${ex.target_muscle}', ${ex.met || 5})" class="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-xl text-[10px] font-semibold">
                    تسجيل
                </button>
            </div>
        </div>
    `}).join('');
}

function openExerciseModal(id, name, muscle, met) {
    currentExercise = { id, name, muscle, met };
    const input = document.getElementById('exercise-name');
    if (input) input.value = name;
    openModal('exercise-modal');
}

// ---- 8. المدرب الذكي والاشتراكات والمسؤول ----
async function handleSendMessage() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    const text = input.value.trim();
    input.value = '';

    renderChatMessage('user', text);
    const msgId = renderChatMessage('assistant', 'جاري التفكير...');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage: text })
        });
        const data = await response.json();
        updateChatMessage(msgId, data.reply || 'تم استلام استفسارك بنجاح!');
    } catch(e) {
        updateChatMessage(msgId, '🎯 أنا معك هنا! استمر في الالتزام بخطتك اليومية.');
    }
}

function renderChatMessage(sender, text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const id = 'msg-' + Date.now();
    const isUser = sender === 'user';
    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="flex ${isUser ? 'justify-end' : 'justify-start'} mb-2">
            <div class="${isUser ? 'bg-emerald-600 text-slate-950 font-medium' : 'bg-slate-800 text-slate-100'} px-3.5 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed">
                ${text}
            </div>
        </div>
    `);
    container.scrollTop = container.scrollHeight;
    return id;
}

function updateChatMessage(id, newText) {
    const el = document.getElementById(id);
    if (el) el.querySelector('div').textContent = newText;
}

async function checkSubscriptionStatus() {
    const endDate = localStorage.getItem('subscriptionEndDate');
    if (!endDate) return 'active';
    return new Date() > new Date(endDate) ? 'expired' : 'active';
}

async function updateSubscriptionUI() {
    const status = await checkSubscriptionStatus();
    const statusEl = document.getElementById('subscription-status');
    if (statusEl) {
        statusEl.textContent = status === 'expired' ? '⛔ انتهت فترة التجربة' : '✅ اشتراك فعال';
    }
}

async function generateCode(days) {
    if (!db) { alert("❌ Firebase غير متصل."); return; }
    const code = 'NGYM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        await db.collection('codes').doc(code).set({ days: days, isUsed: false, createdAt: new Date().toISOString() });
        alert(`✅ كود جديد:\n${code}\n(المدة: ${days} يوم)`);
    } catch(e) {
        alert("حدث خطأ أثناء إنشاء الكود");
    }
}

async function redeemSubscriptionCode(code) {
    if (!db) { alert("❌ Firebase غير متصل."); return; }
    try {
        const doc = await db.collection('codes').doc(code.trim()).get();
        if (doc.exists && !doc.data().isUsed) {
            const days = doc.data().days || 30;
            const newEnd = new Date();
            newEnd.setDate(newEnd.getDate() + days);
            localStorage.setItem('subscriptionEndDate', newEnd.toISOString());
            await db.collection('codes').doc(code.trim()).update({ isUsed: true });
            alert("✅ تم تفعيل الاشتراك بنجاح!");
            updateDashboardUI();
        } else {
            alert("❌ الكود غير صالحة أو مستخدم سابقاً");
        }
    } catch(e) {
        alert("فشل التحقق من الكود");
    }
}

// ---- 9. التهيئة عند التحميل ----
document.addEventListener('DOMContentLoaded', function () {
    loadExerciseDatabase();
    updateDashboardUI();

    document.getElementById('send-chat-btn')?.addEventListener('click', handleSendMessage);
    document.getElementById('chat-input')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleSendMessage();
    });

    document.getElementById('renew-btn')?.addEventListener('click', function() {
        const code = prompt('أدخل كود التفعيل:');
        if (code) redeemSubscriptionCode(code);
    });
});
