// المتغيرات العامة للنظام
let exerciseDB = [];
let currentFilter = 'all';
const BASE_IMAGE_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const SVG_FALLBACK = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🏋️</text></svg>";

// 1. جلب التمارين من المسار المحلي/السيرفر
function fetchExercises() {
    fetch('./data/exercises.json')
        .then(res => {
            if (!res.ok) throw new Error("تعذر قراءة ملف JSON");
            return res.json();
        })
        .then(data => {
            exerciseDB = data;
            localStorage.setItem('cached_exerciseDB', JSON.stringify(data));
            console.log(`✅ تم تحميل ${exerciseDB.length} تمرين بنجاح.`);
            renderWorkouts();
        })
        .catch(err => {
            console.warn("⚠️ جاري القراءة من ذاكرة التخزين المحلية...", err);
            const cachedData = localStorage.getItem('cached_exerciseDB');
            if (cachedData) {
                exerciseDB = JSON.parse(cachedData);
                renderWorkouts();
            } else {
                console.error("❌ تعذر تحميل قاعدة البيانات!");
            }
        });
}

// 2. تصفية التمارين وعرضها
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

    if (filtered.length === 0) {
        container.innerHTML = `<div style="text-align:center; padding:30px; color:#888;">لا توجد تمارين تقتصر على هذا التصنيف حالياً.</div>`;
        return;
    }

    container.innerHTML = filtered.map(ex => {
        const isFav = favorites.includes(ex.id);
        const imgPath = (ex.images && ex.images.length > 0) ? `${BASE_IMAGE_URL}${ex.images[0]}` : SVG_FALLBACK;
        const primaryMuscles = ex.primaryMuscles ? ex.primaryMuscles.join('، ') : 'عام';

        return `
            <div class="workout-card" data-id="${ex.id}">
                <img src="${imgPath}" alt="${ex.name}" class="workout-img" loading="lazy" onerror="this.src='${SVG_FALLBACK}'" />
                <div style="flex:1;">
                    <h4 style="margin:0 0 5px 0; color:#fff; font-size:1em;">${ex.name}</h4>
                    <p style="margin:0; font-size:0.8em; color:#888;">🎯 ${primaryMuscles}</p>
                </div>
                <button class="fav-btn" onclick="toggleFavorite('${ex.id}')">${isFav ? '⭐' : '☆'}</button>
                <button class="complete-btn" onclick="logWorkout('${ex.id}')">✔️ تم</button>
            </div>
        `;
    }).join('');
}

// 3. إضافة/إزالة من المفضلة
function toggleFavorite(exerciseId) {
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (favorites.includes(exerciseId)) {
        favorites = favorites.filter(id => id !== exerciseId);
    } else {
        favorites.push(exerciseId);
    }
    localStorage.setItem('favorites', JSON.stringify(favorites));
    renderWorkouts();
}

// 4. حساب السعرات المحروقة وتسجيل التمرين
function logWorkout(exerciseId) {
    const userWeight = parseFloat(localStorage.getItem('userWeight')) || 70;
    const durationMinutes = 15;
    const met = 4.5;

    const caloriesBurned = Math.round((met * 3.5 * userWeight * durationMinutes) / 200);

    const today = new Date().toDateString();
    let burnedToday = parseFloat(localStorage.getItem('burned_' + today) || '0');
    burnedToday += caloriesBurned;
    localStorage.setItem('burned_' + today, burnedToday);

    addXP(50);
    updateStreak();

    updateUIProgress();
    alert(`🔥 أحرقت حوالي ${caloriesBurned} سعرة حرارية! وتم إضافة 50 XP لحسابك.`);
}

// 5. نظام الـ XP والتسلسل والرتب
function addXP(amount) {
    let currentXP = parseInt(localStorage.getItem('userXP') || '0');
    currentXP += amount;
    localStorage.setItem('userXP', currentXP);
    updateRankUI();
}

function updateStreak() {
    const today = new Date().toDateString();
    const lastDate = localStorage.getItem('lastWorkoutDate');
    let streak = parseInt(localStorage.getItem('userStreak') || '0');

    if (lastDate !== today) {
        streak += 1;
        localStorage.setItem('userStreak', streak);
        localStorage.setItem('lastWorkoutDate', today);
    }
}

function updateRankUI() {
    const xp = parseInt(localStorage.getItem('userXP') || '0');
    const streak = parseInt(localStorage.getItem('userStreak') || '0');
    
    let rank = { name: 'حجري 🪵', color: '#8d6e63', min: 0, max: 100 };
    if (xp >= 1000) rank = { name: 'ألماسي 💎', color: '#00e5ff', min: 1000, max: 2000 };
    else if (xp >= 600) rank = { name: 'ذهبي 🥇', color: '#ffd700', min: 600, max: 1000 };
    else if (xp >= 300) rank = { name: 'فضي 🥈', color: '#c0c0c0', min: 300, max: 600 };
    else if (xp >= 100) rank = { name: 'برونزي 🥉', color: '#cd7f32', min: 100, max: 300 };

    document.getElementById('user-rank').innerText = rank.name;
    document.getElementById('user-rank').style.background = rank.color;
    document.getElementById('streak-count').innerText = streak;
    document.getElementById('xp-count').innerText = xp;
    document.getElementById('next-xp').innerText = rank.max;

    const progressPercent = Math.min(((xp - rank.min) / (rank.max - rank.min)) * 100, 100);
    document.getElementById('xp-progress').style.width = `${progressPercent}%`;
}

// 6. تحديث لوحة السعرات التفاعلية والماكروز (SVG Ring)
function updateUIProgress() {
    const targetCalories = parseFloat(localStorage.getItem('userTargetCal')) || 2000;
    const eatenCalories = parseFloat(localStorage.getItem('eaten_' + new Date().toDateString())) || 0;
    const burnedCalories = parseFloat(localStorage.getItem('burned_' + new Date().toDateString())) || 0;

    const remaining = Math.max(0, targetCalories - eatenCalories + burnedCalories);

    document.getElementById('remaining-calories').innerText = Math.round(remaining);
    document.getElementById('target-cal').innerText = Math.round(targetCalories);
    document.getElementById('eaten-cal').innerText = Math.round(eatenCalories);
    document.getElementById('burned-cal').innerText = Math.round(burnedCalories);

    // 1. تحريك الدائرة SVG
    const circle = document.getElementById('cal-ring-fill');
    if (circle) {
        const circumference = 314;
        const percent = Math.min(1, remaining / targetCalories);
        const offset = circumference - (percent * circumference);
        circle.style.strokeDashoffset = offset;
    }

    // 2. تحديث الماكروز والأشرطة
    const proteinTarget = 150, carbsTarget = 200, fatTarget = 60;
    const proteinCurr = parseFloat(localStorage.getItem('protein_' + new Date().toDateString())) || 0;
    const carbsCurr = parseFloat(localStorage.getItem('carbs_' + new Date().toDateString())) || 0;
    const fatCurr = parseFloat(localStorage.getItem('fat_' + new Date().toDateString())) || 0;

    document.getElementById('protein-curr').innerText = Math.round(proteinCurr);
    document.getElementById('carbs-curr').innerText = Math.round(carbsCurr);
    document.getElementById('fat-curr').innerText = Math.round(fatCurr);

    document.getElementById('protein-bar').style.width = `${Math.min(100, (proteinCurr / proteinTarget) * 100)}%`;
    document.getElementById('carbs-bar').style.width = `${Math.min(100, (carbsCurr / carbsTarget) * 100)}%`;
    document.getElementById('fat-bar').style.width = `${Math.min(100, (fatCurr / fatTarget) * 100)}%`;
}

// التشغيل الأولي عند فتح التطبيق
document.addEventListener('DOMContentLoaded', () => {
    fetchExercises();
    updateRankUI();
    updateUIProgress();
});
