const MOCK_EXERCISES = [
    { id: '0001', name: '3/4 Sit-Up', muscle: 'abdominals', equipment: 'body weight' },
    { id: '0002', name: '45° Leg Press', muscle: 'quadriceps', equipment: 'leverage machine' },
    { id: '0003', name: 'Air Bike', muscle: 'abdominals', equipment: 'body weight' },
    { id: '0007', name: 'Alternate Incline Dumbbell Curl', muscle: 'biceps', equipment: 'dumbbell' },
    { id: '0025', name: 'Barbell Bench Press', muscle: 'chest', equipment: 'barbell' }
];

let exerciseDB = [...MOCK_EXERCISES];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    checkOnboardingStatus();
    updateUI();
    renderWorkouts();
    setupEventListeners();
    setupTabSwitching();
});

function checkOnboardingStatus() {
    const hasWeight = localStorage.getItem('userWeight');
    const hasHeight = localStorage.getItem('userHeight');

    if (!hasWeight || !hasHeight) {
        document.getElementById('onboarding-modal')?.classList.remove('hidden');
    } else {
        document.getElementById('onboarding-modal')?.classList.add('hidden');
    }
}

// معادلة Mifflin-St Jeor لحساب BMR و TDEE بدقة
function getMacrosTarget() {
    const weight = parseFloat(localStorage.getItem('userWeight')) || 70;
    const height = parseFloat(localStorage.getItem('userHeight')) || 175;
    const age = parseInt(localStorage.getItem('userAge')) || 25;
    const gender = localStorage.getItem('userGender') || 'male';
    const activity = parseFloat(localStorage.getItem('userActivity')) || 1.375;
    const goal = localStorage.getItem('userGoal') || 'fitness';

    // حساب BMR
    let bmr = (10 * weight) + (6.25 * height) - (5 * age);
    bmr = (gender === 'male') ? bmr + 5 : bmr - 161;

    // حساب الاحتياج اليومي مع النشاط (TDEE)
    let tdee = bmr * activity;

    // تعديل السعرات حسب الهدف
    if (goal === 'bulking') tdee += 400;
    else if (goal === 'cutting' || goal === 'calorie_deficit') tdee -= 500;
    else if (goal === 'women_weight_loss') tdee -= 400;

    const cal = Math.round(tdee);
    const protein = Math.round(weight * 2.0);
    const fats = Math.round((cal * 0.25) / 9);
    const carbs = Math.round((cal - ((protein * 4) + (fats * 9))) / 4);

    return { calories: cal, protein: protein, carbs: carbs, fats: fats };
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

function renderWorkouts() {
    let filtered = [...exerciseDB];
    if (currentFilter !== 'all') {
        filtered = filtered.filter(ex => ex.muscle.toLowerCase().includes(currentFilter.toLowerCase()));
    }

    const container = document.getElementById('workout-list');
    if (!container) return;

    container.innerHTML = filtered.map(ex => {
        const formattedId = String(ex.id).padStart(4, '0');
        const imgPath = `https://raw.githubusercontent.com/yuhasbs/exercise-assets/main/gifs/${formattedId}.gif`;

        return `
        <div class="bg-slate-900 border border-slate-800 rounded-xl p-3 mb-3">
            <h4 class="font-bold text-sm text-white">${ex.name}</h4>
            <p class="text-xs text-slate-400 mt-0.5">${ex.muscle} · ${ex.equipment}</p>
            <div class="w-full h-48 my-2 rounded-lg overflow-hidden bg-slate-950 flex justify-center items-center">
                <img src="${imgPath}" loading="lazy" alt="${ex.name}" class="h-full w-full object-contain" />
            </div>
        </div>
    `}).join('');
}

function setupEventListeners() {
    document.getElementById('onboarding-form')?.addEventListener('submit', function(e) {
        e.preventDefault();
        
        localStorage.setItem('userWeight', document.getElementById('init-weight').value);
        localStorage.setItem('userTargetWeight', document.getElementById('init-target-weight').value);
        localStorage.setItem('userHeight', document.getElementById('init-height').value);
        localStorage.setItem('userAge', document.getElementById('init-age').value);
        localStorage.setItem('userGender', document.getElementById('init-gender').value);
        localStorage.setItem('userActivity', document.getElementById('init-activity').value);
        localStorage.setItem('userGoal', document.getElementById('init-goal').value);

        document.getElementById('onboarding-modal').classList.add('hidden');
        updateUI();
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
}
