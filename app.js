let exerciseDB = [];
let currentFilter = 'all';
let activeExerciseId = null;

const BASE_IMAGE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const SVG_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏋️</text></svg>";

// 1. حساب السعرات الديناميكي بناءً على وزن المستخدم وهدفه
function calculateDynamicTarget() {
    const weight = parseFloat(localStorage.getItem('userWeight')) || 70;
    const goal = localStorage.getItem('userGoal') || 'maintain'; // maintain, lose, gain
    
    let baseCal = weight * 24 * 1.3; // BMR تقريبي مع نشاط خفيف
    if (goal === 'lose') baseCal -= 400;
    if (goal === 'gain') baseCal += 400;
    
    localStorage.setItem('userTargetCal', Math.round(baseCal));
    return Math.round(baseCal);
}

function setupProfile() {
    const weight = prompt("أدخل وزنك الحالي (كجم):", localStorage.getItem('userWeight') || "70");
    const goal = prompt("حدد هدفك (lose: تخسيس, maintain: محافظة, gain: تضخيم):", localStorage.getItem('userGoal') || "maintain");
    
    if (weight) localStorage.setItem('userWeight', weight);
    if (goal) localStorage.setItem('userGoal', goal);
    
    calculateDynamicTarget();
    updateUIProgress();
}

// 2. جلب التمارين عرض بطاقات Liftoff مع الصور المتحركة
function fetchExercises() {
    fetch('./data/exercises.json')
        .then(res => res.json())
        .then(data => {
            exerciseDB = data;
            localStorage.setItem('cached_exerciseDB', JSON.stringify(data));
            renderWorkouts();
        })
        .catch(() => {
            const cached = localStorage.getItem('cached_exerciseDB');
            if (cached) { exerciseDB = JSON.parse(cached); renderWorkouts(); }
        });
}

function filterWorkouts(filterCategory, btnElement) {
    currentFilter = filterCategory;
    if (btnElement) {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        btnElement.classList.add('active');
    }
    renderWorkouts();
}

function renderWorkouts() {
    const container = document.getElementById('workout-container');
    if (!container) return;

    const favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    
    let filtered = exerciseDB.filter(ex => {
        if (currentFilter === 'home') return ex.equipment === 'body only' || ex.equipment === 'bands';
        if (currentFilter === 'favorites') return favorites.includes(ex.id);
        if (currentFilter === 'all') return true;
        return ex.primaryMuscles && ex.primaryMuscles.includes(currentFilter);
    });

    container.innerHTML = filtered.slice(0, 30).map(ex => {
        const isFav = favorites.includes(ex.id);
        // مسار الصورة/الـ GIF من المعتمد في BodyIQDB
        const imgPath = (ex.images && ex.images.length > 0) ? `${BASE_IMAGE_URL}${ex.images[0]}` : SVG_FALLBACK;
        const muscle = ex.primaryMuscles ? ex.primaryMuscles[0] : 'عام';

        return `
            <div class="workout-card">
                <div class="workout-header">
                    <img src="${imgPath}" class="workout-img" loading="lazy" onerror="this.src='${SVG_FALLBACK}'" />
                    <div style="flex:1;">
                        <h4 style="color:#fff; font-size:0.95em;">${ex.name}</h4>
                        <span style="font-size:0.75em; color:#00e676; background:#111; padding:2px 6px; border-radius:4px;">🎯 ${muscle}</span>
                    </div>
                    <button onclick="toggleFavorite('${ex.id}')" style="background:none; border:none; font-size:1.2em; cursor:pointer;">${isFav ? '⭐' : '☆'}</button>
                </div>
                <div style="padding:10px; display:flex; justify-content:space-between; align-items:center; background:#181818;">
                    <span style="font-size:0.8em; color:#aaa;">المعدات: ${ex.equipment || 'وزن الجسم'}</span>
                    <button class="btn-action" onclick="openSetModal('${ex.id}', '${ex.name}')">ابدأ التمرين 🏋️</button>
                </div>
            </div>
        `;
    }).join('');
}

// 3. نافذة تسجيل الجولات (Sets & Reps) بأسلوب Liftoff
function openSetModal(id, name) {
    activeExerciseId = id;
    document.getElementById('modal-exercise-name').innerText = name;
    document.getElementById('sets-container').innerHTML = '';
    addSetRow(); // إضافة جولة أولى تلقائياً
    document.getElementById('set-modal').style.display = 'flex';
}

function closeModal() {
    document.getElementById('set-modal').style.display = 'none';
}

function addSetRow() {
    const container = document.getElementById('sets-container');
    const setNum = container.children.length + 1;
    const row = document.createElement('div');
    row.className = 'set-row';
    row.innerHTML = `
        <span style="font-size:0.8em; color:#888;">جولة ${setNum}</span>
        <input type="number" class="set-weight" placeholder="وزن (كجم)" value="0">
        <input type="number" class="set-reps" placeholder="تكرار" value="10">
    `;
    container.appendChild(row);
}

function saveWorkoutLog() {
    const weights = Array.from(document.querySelectorAll('.set-weight')).map(i => parseFloat(i.value) || 0);
    const reps = Array.from(document.querySelectorAll('.set-reps')).map(i => parseFloat(i.value) || 0);
    
    // حساب حرق تقريبي بناءً على الجولات
    const ex = exerciseDB.find(e => e.id === activeExerciseId);
    const totalReps = reps.reduce((a, b) => a + b, 0);
    const burned = Math.round(totalReps * 0.5 + 15);

    const today = new Date().toDateString();
    let burnedToday = parseFloat(localStorage.getItem('burned_' + today) || '0');
    localStorage.setItem('burned_' + today, burnedToday + burned);

    // تحديث خريطة العضلات لتلك العضلة
    if (ex && ex.primaryMuscles) {
        let activeMuscles = JSON.parse(localStorage.getItem('activeMuscles_' + today) || '[]');
        ex.primaryMuscles.forEach(m => { if(!activeMuscles.includes(m)) activeMuscles.push(m); });
        localStorage.setItem('activeMuscles_' + today, JSON.stringify(activeMuscles));
    }

    addXP(75);
    updateStreak();
    updateUIProgress();
    updateBodyMap();
    closeModal();
    alert(`✅ تم تسجيل ${reps.length} جولات بنجاح! +75 XP`);
}

// 4. نظام الروتينات المخصصة
function createNewRoutine() {
    const name = prompt("أدخل اسم الروتين الجديد (مثال: روتين الصدر والبطن):");
    if (!name) return;
    
    let routines = JSON.parse(localStorage.getItem('customRoutines') || '[]');
    routines.push({ id: Date.now(), name: name, count: 0 });
    localStorage.setItem('customRoutines', JSON.stringify(routines));
    renderRoutines();
}

function renderRoutines() {
    const routines = JSON.parse(localStorage.getItem('customRoutines') || '[]');
    const container = document.getElementById('routines-list');
    if (routines.length === 0) {
        container.innerHTML = 'لا توجد روتينات مخصصة بعد.';
        return;
    }
    container.innerHTML = routines.map(r => `
        <div style="background:#252525; padding:8px 12px; border-radius:8px; margin-top:5px; display:flex; justify-content:space-between;">
            <span>📌 ${r.name}</span>
            <button onclick="alert('تم تفعيل الروتين')" class="btn-action" style="padding:2px 8px; font-size:0.75em;">بدء</button>
        </div>
    `).join('');
}

// 5. تحديث خريطة العضلات (Bodygraph)
function updateBodyMap() {
    const today = new Date().toDateString();
    const activeMuscles = JSON.parse(localStorage.getItem('activeMuscles_' + today) || '[]');
    
    activeMuscles.forEach(m => {
        const el = document.getElementById('muscle-' + m);
        if (el) el.setAttribute('fill', '#00e676');
        const el2 = document.getElementById('muscle-' + m + '-2');
        if (el2) el2.setAttribute('fill', '#00e676');
    });
}

// 6. تحديث الرتب، الشارات، والسعرات
function addXP(amount) {
    let currentXP = parseInt(localStorage.getItem('userXP') || '0');
    currentXP += amount;
    localStorage.setItem('userXP', currentXP);
    updateRankUI();
}

function updateRankUI() {
    const xp = parseInt(localStorage.getItem('userXP') || '0');
    let rank = { name: 'حجري 🪵', next: 'برونزي 🥉', color: '#8d6e63', min: 0, max: 100 };
    
    if (xp >= 1000) rank = { name: 'ألماسي 💎', next: 'القمة 🏆', color: '#00e5ff', min: 1000, max: 2000 };
    else if (xp >= 600) rank = { name: 'ذهبي 🥇', next: 'ألماسي 💎', color: '#ffd700', min: 600, max: 1000 };
    else if (xp >= 300) rank = { name: 'فضي 🥈', next: 'ذهبي 🥇', color: '#c0c0c0', min: 300, max: 600 };
    else if (xp >= 100) rank = { name: 'برونزي 🥉', next: 'فضي 🥈', color: '#cd7f32', min: 100, max: 300 };

    document.getElementById('user-rank').innerText = rank.name;
    document.getElementById('user-rank').style.background = rank.color;
    document.getElementById('next-rank-name').innerText = rank.next;
    document.getElementById('xp-count').innerText = xp;
    document.getElementById('next-xp').innerText = rank.max;

    const progressPercent = Math.min(((xp - rank.min) / (rank.max - rank.min)) * 100, 100);
    document.getElementById('xp-progress').style.width = `${progressPercent}%`;
}

function updateUIProgress() {
    const targetCal = parseInt(localStorage.getItem('userTargetCal')) || calculateDynamicTarget();
    const eatenCal = parseFloat(localStorage.getItem('eaten_' + new Date().toDateString())) || 0;
    const burnedCal = parseFloat(localStorage.getItem('burned_' + new Date().toDateString())) || 0;

    const remaining = Math.max(0, targetCal - eatenCal + burnedCal);

    document.getElementById('remaining-calories').innerText = remaining;
    document.getElementById('target-cal').innerText = targetCal;
    document.getElementById('eaten-cal').innerText = eatenCal;
    document.getElementById('burned-cal').innerText = burnedCal;

    const circle = document.getElementById('cal-ring-fill');
    if (circle) {
        const offset = 314 - (Math.min(1, remaining / targetCal) * 314);
        circle.style.strokeDashoffset = offset;
    }
}

function toggleFavorite(id) {
    let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    favs = favs.includes(id) ? favs.filter(i => i !== id) : [...favs, id];
    localStorage.setItem('favorites', JSON.stringify(favs));
    renderWorkouts();
}

function updateStreak() {
    const today = new Date().toDateString();
    if (localStorage.getItem('lastWorkoutDate') !== today) {
        let streak = parseInt(localStorage.getItem('userStreak') || '0') + 1;
        localStorage.setItem('userStreak', streak);
        localStorage.setItem('lastWorkoutDate', today);
    }
    document.getElementById('streak-count').innerText = localStorage.getItem('userStreak') || '0';
}

document.addEventListener('DOMContentLoaded', () => {
    fetchExercises();
    updateRankUI();
    updateUIProgress();
    renderRoutines();
    updateBodyMap();
});
