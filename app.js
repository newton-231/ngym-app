// ============================================================
// NGym - التطبيق الكامل المحدث (Onboarding + CDN للصور)
// ============================================================

const MOCK_EXERCISES = [
    { id: '0001', name: '3/4 Sit-Up', muscle: 'abdominals', equipment: 'body weight' },
    { id: '0002', name: '45° Leg Press', muscle: 'quadriceps', equipment: 'leverage machine' },
    { id: '0003', name: 'Air Bike', muscle: 'abdominals', equipment: 'body weight' },
    { id: '0006', name: 'Alternate Heel Touchers', muscle: 'abdominals', equipment: 'body weight' },
    { id: '0007', name: 'Alternate Incline Dumbbell Curl', muscle: 'biceps', equipment: 'dumbbell' },
    { id: '0015', name: 'Axle Deadlift', muscle: 'glutes', equipment: 'barbell' },
    { id: '0025', name: 'Barbell Bench Press', muscle: 'chest', equipment: 'barbell' },
    { id: '0030', name: 'Barbell Curl', muscle: 'biceps', equipment: 'barbell' },
    { id: '0043', name: 'Barbell Squat', muscle: 'quadriceps', equipment: 'barbell' }
];

let exerciseDB = [...MOCK_EXERCISES];
let currentFilter = 'all';

// ============================================================
// 1. التهيئة والتحقق من حالة المستخدم الجديد
// ============================================================
document.addEventListener('DOMContentLoaded', async function() {
    const loadingScreen = document.getElementById('loading-screen');
    const appScreen = document.getElementById('app');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (appScreen) appScreen.style.display = 'block';

    // فحص هل المستخدم يدخل لأول مرة (أو في متصفح مخفي)
    checkOnboardingStatus();

    loadChatHistory();

    updateUI();
    renderWorkouts();

    setupEventListeners();
    setupChat();
    setupTabSwitching();
});

function checkOnboardingStatus() {
    const storedWeight = localStorage.getItem('userWeight');
    const storedGoal = localStorage.getItem('userGoal');

    // إذا لم تكن البيانات مسجلة، تظهر شاشة Onboarding فوراً
    if (!storedWeight || !storedGoal) {
        document.getElementById('onboarding-modal')?.classList.remove('hidden');
    } else {
        document.getElementById('onboarding-modal')?.classList.add('hidden');
    }
}

// ============================================================
// 2. إدارة البيانات وحساب الماكروز
// ============================================================
function getMacrosTarget() {
    const weight = parseFloat(localStorage.getItem('userWeight')) || 70;
    const goal = localStorage.getItem('userGoal') || 'fitness';
    let cal, protein, carbs, fats;

    if (goal === 'bulking') { cal = weight * 40; protein = weight * 2.2; carbs = weight * 5; fats = weight * 0.9; }
    else if (goal === 'cutting') { cal = weight * 30; protein = weight * 2.5; carbs = weight * 3; fats = weight * 0.7; }
    else if (goal === 'women_weight_loss') { cal = weight * 26; protein = weight * 1.8; carbs = weight * 2.5; fats = weight * 0.8; }
    else if (goal === 'calorie_deficit') { cal = weight * 24; protein = weight * 1.5; carbs = weight * 2; fats = weight * 0.6; }
    else { cal = weight * 35; protein = weight * 2; carbs = weight * 4; fats = weight * 0.8; }

    return { calories: Math.round(cal), protein: Math.round(protein), carbs: Math.round(carbs), fats: Math.round(fats) };
}

function updateUI() {
    const target = getMacrosTarget();
    const eaten = {
        calories: parseInt(localStorage.getItem('eatenCalories')) || 0,
        protein: parseInt(localStorage.getItem('eatenProtein')) || 0,
        carbs: parseInt(localStorage.getItem('eatenCarbs')) || 0,
        fats: parseInt(localStorage.getItem('eatenFats')) || 0
    };

    const remaining = Math.max(target.calories - eaten.calories, 0);
    if (document.getElementById('calories-left')) document.getElementById('calories-left').textContent = remaining;
    if (document.getElementById('target-cal')) document.getElementById('target-cal').textContent = target.calories;
    if (document.getElementById('eaten-cal')) document.getElementById('eaten-cal').textContent = eaten.calories;

    updateMacroBar('protein', eaten.protein, target.protein);
    updateMacroBar('carbs', eaten.carbs, target.carbs);
    updateMacroBar('fats', eaten.fats, target.fats);
}

function updateMacroBar(type, current, target) {
    const bar = document.getElementById(`${type}-bar`);
    const label = document.getElementById(`${type}-values`);
    if (bar && label) {
        const percent = Math.min((current / target) * 100, 100);
        bar.style.width = percent + '%';
        label.textContent = `${Math.round(current)} / ${Math.round(target)}g`;
    }
}

// ============================================================
// 3. عرض التمارين (مربوطة بسيرفر CDN مباشر)
// ============================================================
function renderWorkouts() {
    let filtered = [...exerciseDB];
    
    if (currentFilter === 'favorites') {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        filtered = filtered.filter(ex => favs.includes(String(ex.id)));
    } else if (currentFilter === 'home') {
        filtered = filtered.filter(ex => ex.equipment && ex.equipment.toLowerCase().includes('body'));
    } else if (currentFilter !== 'all') {
        filtered = filtered.filter(ex => ex.muscle && ex.muscle.toLowerCase().includes(currentFilter.toLowerCase()));
    }

    const container = document.getElementById('workout-list');
    if (!container) return;

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 py-8 text-sm">لا توجد تمارين مطابقة</div>';
        return;
    }

    container.innerHTML = filtered.map(ex => {
        const formattedId = String(ex.id).padStart(4, '0');
        const imgPath = `https://raw.githubusercontent.com/yuhasbs/exercise-assets/main/gifs/${formattedId}.gif`;

        return `
        <div class="workout-card bg-slate-900 border border-slate-800 rounded-xl p-3 mb-3">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h4 class="font-bold text-sm text-white">${ex.name}</h4>
                    <p class="text-xs text-slate-400 mt-0.5">${ex.muscle} · ${ex.equipment}</p>
                </div>
            </div>
            
            <div class="w-full h-48 my-2 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex justify-center items-center">
                <img src="${imgPath}" loading="lazy" alt="${ex.name}" class="h-full w-full object-contain" />
            </div>
        </div>
    `}).join('');
}

// ============================================================
// 4. الأحداث والاستجابة
// ============================================================
function setupEventListeners() {
    // نموذج إدخال البيانات للزائر الجديد
    document.getElementById('onboarding-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        const weight = document.getElementById('init-weight').value;
        const goal = document.getElementById('init-goal').value;

        localStorage.setItem('userWeight', weight);
        localStorage.setItem('userGoal', goal);

        document.getElementById('onboarding-modal').classList.add('hidden');
        updateUI();
    });

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderWorkouts();
        });
    });
}

function setupTabSwitching() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
            this.classList.add('active-tab');

            document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden-tab'));
            document.getElementById(`tab-${tabName}`)?.classList.remove('hidden-tab');
        });
    });

    document.getElementById('floating-agent-btn')?.addEventListener('click', function() {
        document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden-tab'));
        document.getElementById('tab-coach')?.classList.remove('hidden-tab');
    });
}

function setupChat() {
    document.getElementById('send-chat-btn')?.addEventListener('click', sendChatMessage);
}

function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const container = document.getElementById('chat-messages');
    if (!container) return;
    if (history.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">مرحباً بك! أنا مدربك الذكي الشخصي. كيف يمكنني مساعدتك اليوم؟</div>';
        return;
    }
}

function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;
    input.value = '';
}
