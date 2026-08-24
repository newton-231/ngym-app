// ============================================================
// NGym - التطبيق الكامل
// ============================================================

// ---------- بيانات وهمية للتمارين (سيتم استبدالها بـ BodyIQDB) ----------
const MOCK_EXERCISES = [
    { id: '1', name: 'Sit-Up 3/4', muscle: 'abdominals', equipment: 'body only', gifUrl: '' },
    { id: '2', name: 'Hamstring 90/90', muscle: 'hamstrings', equipment: 'body only', gifUrl: '' },
    { id: '3', name: 'Ab Crunch Machine', muscle: 'abdominals', equipment: 'machine', gifUrl: '' },
    { id: '4', name: 'Ab Roller', muscle: 'abdominals', equipment: 'other', gifUrl: '' },
    { id: '5', name: 'Adductor', muscle: 'adductors', equipment: 'foam roll', gifUrl: '' },
];

let exerciseDB = [...MOCK_EXERCISES];
let currentFilter = 'all';
let currentRoutineExercises = [];

// ============================================================
// 1. التهيئة والتحميل
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    // إخفاء شاشة التحميل
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    // تحميل البيانات من localStorage
    loadUserData();
    loadChatHistory();
    loadFavorites();
    loadRoutines();

    // تحديث الواجهة
    updateUI();
    renderWorkouts();
    updateBodygraph();

    // ربط الأحداث
    setupEventListeners();
    setupAdminPanel();
    setupChat();
    setupRoutines();
    setupWorkoutLogging();
    setupTabSwitching();
});

// ============================================================
// 2. إدارة البيانات المحلية
// ============================================================
function loadUserData() {
    // القيم الافتراضية
    if (!localStorage.getItem('userWeight')) localStorage.setItem('userWeight', '70');
    if (!localStorage.getItem('userGoal')) localStorage.setItem('userGoal', 'fitness');
    if (!localStorage.getItem('streak')) localStorage.setItem('streak', '0');
    if (!localStorage.getItem('xp')) localStorage.setItem('xp', '0');
    if (!localStorage.getItem('rank')) localStorage.setItem('rank', 'برونزي');
    if (!localStorage.getItem('eatenCalories')) localStorage.setItem('eatenCalories', '0');
    if (!localStorage.getItem('eatenProtein')) localStorage.setItem('eatenProtein', '0');
    if (!localStorage.getItem('eatenCarbs')) localStorage.setItem('eatenCarbs', '0');
    if (!localStorage.getItem('eatenFats')) localStorage.setItem('eatenFats', '0');
    if (!localStorage.getItem('burnedCalories')) localStorage.setItem('burnedCalories', '0');
    if (!localStorage.getItem('todayDate')) localStorage.setItem('todayDate', new Date().toDateString());
}

function getMacrosTarget() {
    const weight = parseFloat(localStorage.getItem('userWeight')) || 70;
    const goal = localStorage.getItem('userGoal') || 'fitness';
    let cal, protein, carbs, fats;
    if (goal === 'bulking') { cal = weight * 40; protein = weight * 2.2; carbs = weight * 5; fats = weight * 0.9; }
    else if (goal === 'cutting') { cal = weight * 30; protein = weight * 2.5; carbs = weight * 3; fats = weight * 0.7; }
    else { cal = weight * 35; protein = weight * 2; carbs = weight * 4; fats = weight * 0.8; }
    return { calories: Math.round(cal), protein: Math.round(protein), carbs: Math.round(carbs), fats: Math.round(fats) };
}

// ============================================================
// 3. تحديث الواجهة الرئيسية (دائرة، ماكروز، XP، رتب)
// ============================================================
function updateUI() {
    // الماكروز المستهدفة
    const target = getMacrosTarget();
    const eaten = {
        calories: parseInt(localStorage.getItem('eatenCalories')) || 0,
        protein: parseInt(localStorage.getItem('eatenProtein')) || 0,
        carbs: parseInt(localStorage.getItem('eatenCarbs')) || 0,
        fats: parseInt(localStorage.getItem('eatenFats')) || 0
    };
    const burned = parseInt(localStorage.getItem('burnedCalories')) || 0;

    // السعرات المتبقية
    const remaining = Math.max(target.calories - eaten.calories + burned, 0);
    document.getElementById('calories-left').textContent = remaining;
    document.getElementById('target-cal').textContent = target.calories;
    document.getElementById('eaten-cal').textContent = eaten.calories;
    document.getElementById('burned-cal').textContent = burned;

    // تحديث الدائرة
    const ring = document.getElementById('calories-ring');
    const circumference = 339.292;
    const progress = Math.min((target.calories - remaining) / target.calories, 1);
    ring.style.strokeDashoffset = circumference * (1 - progress);

    // تحديث أشرطة الماكروز
    updateMacroBar('protein', eaten.protein, target.protein);
    updateMacroBar('carbs', eaten.carbs, target.carbs);
    updateMacroBar('fats', eaten.fats, target.fats);

    // تحديث XP والرتب
    const xp = parseInt(localStorage.getItem('xp')) || 0;
    const streak = parseInt(localStorage.getItem('streak')) || 0;
    const rank = localStorage.getItem('rank') || 'برونزي';
    const xpTarget = 450 + (streak * 20);
    document.getElementById('xp-current').textContent = xp;
    document.getElementById('xp-target').textContent = xpTarget;
    document.getElementById('xp-bar').style.width = Math.min((xp / xpTarget) * 100, 100) + '%';
    document.getElementById('rank-badge').textContent = rank;
    document.getElementById('streak-days').textContent = streak;

    // تحديد الرتبة القادمة
    const ranks = ['مبتدي', 'برونزي', 'فضي', 'ذهبي', 'ألماسي', 'أسطوري'];
    let nextRank = 'ذهبي';
    const idx = ranks.indexOf(rank);
    if (idx !== -1 && idx < ranks.length - 1) nextRank = ranks[idx + 1];
    document.getElementById('next-rank').textContent = nextRank;
}

function updateMacroBar(type, current, target) {
    const percent = Math.min((current / target) * 100, 100);
    document.getElementById(`${type}-bar`).style.width = percent + '%';
    document.getElementById(`${type}-values`).textContent = `${Math.round(current)} / ${Math.round(target)}g`;
}

// ============================================================
// 4. خريطة العضلات (Bodygraph)
// ============================================================
function updateBodygraph() {
    // محاكاة: نلون العضلات حسب آخر تمرين مسجل
    const muscles = ['chest', 'core', 'shoulders', 'arms', 'legs'];
    const colors = ['#4ade80', '#4ade80', '#2a2a2a', '#2a2a2a', '#2a2a2a'];
    // في التطبيق الحقيقي: نقرأ من localStorage سجلات اليوم ونلون حسب التمارين المسجلة
    muscles.forEach((m, i) => {
        const el = document.getElementById(`muscle-${m}`);
        if (el) el.setAttribute('fill', colors[i] || '#2a2a2a');
    });
    // نسخة للأكتاف الثنائية
    document.querySelectorAll('[id^="muscle-shoulders"]').forEach(el => el.setAttribute('fill', colors[2] || '#2a2a2a'));
    document.querySelectorAll('[id^="muscle-arms"]').forEach(el => el.setAttribute('fill', colors[3] || '#2a2a2a'));
    document.querySelectorAll('[id^="muscle-legs"]').forEach(el => el.setAttribute('fill', colors[4] || '#2a2a2a'));
}

// ============================================================
// 5. نظام التمارين (عرض، تصفية، مفضلة)
// ============================================================
function renderWorkouts() {
    let filtered = [...exerciseDB];
    if (currentFilter === 'favorites') {
        const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
        filtered = filtered.filter(ex => favs.includes(ex.id));
    } else if (currentFilter === 'home') {
        filtered = filtered.filter(ex => ex.equipment && ex.equipment.includes('body'));
    } else if (currentFilter !== 'all') {
        filtered = filtered.filter(ex => ex.muscle && ex.muscle.includes(currentFilter));
    }
    // إزالة التكرارات حسب الـ id
    const seen = new Set();
    filtered = filtered.filter(ex => { const key = ex.id; if (seen.has(key)) return false; seen.add(key); return true; });

    const container = document.getElementById('workout-list');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-gray-500 py-8">لا توجد تمارين مطابقة</div>';
        return;
    }
    container.innerHTML = filtered.map(ex => `
        <div class="workout-card" data-id="${ex.id}">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold">${ex.name}</h4>
                    <p class="text-xs text-gray-400">${ex.muscle || ''} ${ex.equipment ? '· ' + ex.equipment : ''}</p>
                </div>
                <button class="favorite-btn ${isFavorite(ex.id) ? 'text-yellow-400' : 'text-gray-500'}" data-id="${ex.id}">⭐</button>
            </div>
            <div class="flex gap-2 mt-2">
                <button class="start-workout-btn btn-primary text-sm py-1 px-3" data-id="${ex.id}">ابدا التمرين</button>
                ${ex.gifUrl ? `<img src="${ex.gifUrl}" onerror="this.style.display='none'" class="w-12 h-12 rounded object-cover" />` : ''}
            </div>
        </div>
    `).join('');

    // ربط الأحداث (لأزرار البدء والمفضلة)
    document.querySelectorAll('.start-workout-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            openSetModal(id);
        });
    });
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            toggleFavorite(id);
            renderWorkouts();
        });
    });
}

function isFavorite(id) {
    const favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    return favs.includes(id);
}

function toggleFavorite(id) {
    let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (favs.includes(id)) favs = favs.filter(f => f !== id);
    else favs.push(id);
    localStorage.setItem('favorites', JSON.stringify(favs));
}

// ============================================================
// 6. نافذة تسجيل الجولات (Sets)
// ============================================================
let currentExerciseId = null;

function openSetModal(exerciseId) {
    currentExerciseId = exerciseId;
    const ex = exerciseDB.find(e => e.id === exerciseId);
    document.getElementById('set-exercise-name').textContent = ex ? ex.name : 'تمرين';
    document.getElementById('set-number').value = 1;
    document.getElementById('set-reps').value = 10;
    document.getElementById('set-weight').value = 0;
    document.getElementById('set-modal').style.display = 'flex';
}

function closeSetModal() {
    document.getElementById('set-modal').style.display = 'none';
    currentExerciseId = null;
}

function saveSet() {
    if (!currentExerciseId) return;
    const reps = parseInt(document.getElementById('set-reps').value) || 0;
    const weight = parseFloat(document.getElementById('set-weight').value) || 0;
    // حساب السعرات المحروقة (MET تقديري)
    const userWeight = parseFloat(localStorage.getItem('userWeight')) || 70;
    const met = 4.5; // قيمة تقريبية لتمارين المقاومة
    const duration = 0.05; // 3 دقائق تقريباً لكل جولة
    const burned = (met * 3.5 * userWeight * duration) / 200;
    const currentBurned = parseInt(localStorage.getItem('burnedCalories')) || 0;
    localStorage.setItem('burnedCalories', Math.round(currentBurned + burned));

    // إضافة XP
    const xpGain = Math.round(reps / 2) + 5;
    const currentXP = parseInt(localStorage.getItem('xp')) || 0;
    localStorage.setItem('xp', currentXP + xpGain);

    // تحديث الـ Streak
    const today = new Date().toDateString();
    if (localStorage.getItem('lastWorkoutDate') !== today) {
        const streak = parseInt(localStorage.getItem('streak')) || 0;
        localStorage.setItem('streak', streak + 1);
        localStorage.setItem('lastWorkoutDate', today);
    }

    // تحديث خريطة العضلات
    const ex = exerciseDB.find(e => e.id === currentExerciseId);
    if (ex && ex.muscle) {
        const muscleMap = { abdominals: 'core', hamstrings: 'legs', adductors: 'legs' };
        const muscle = muscleMap[ex.muscle] || 'core';
        // نلون العضلة في الخريطة (سيتم تطبيقه في下次 تحديث)
    }

    // إغلاق النافذة وتحديث الواجهة
    closeSetModal();
    updateUI();
    updateBodygraph();
    alert(`🔥 أحسنت! أحرقت ${Math.round(burned)} سعرة وحصلت على ${xpGain} XP`);
}

// ============================================================
// 7. نظام الروتينات
// ============================================================
function loadRoutines() {
    const routines = JSON.parse(localStorage.getItem('routines') || '[]');
    const container = document.getElementById('routines-list');
    if (routines.length === 0) {
        container.innerHTML = 'لا توجد روتينات مخصصة بعد.';
        return;
    }
    container.innerHTML = routines.map(r => `<div class="text-sm">• ${r.name} (${r.exercises.length} تمارين)</div>`).join('');
}

function openRoutineModal() {
    document.getElementById('routine-modal').style.display = 'flex';
    // عرض قائمة التمارين المتاحة لاختيارها
    const list = document.getElementById('routine-exercises-list');
    list.innerHTML = exerciseDB.map(ex => `
        <div class="flex items-center gap-2 text-sm">
            <input type="checkbox" class="routine-check" data-id="${ex.id}" />
            <span>${ex.name}</span>
        </div>
    `).join('');
}

function saveRoutine() {
    const name = document.getElementById('routine-name').value.trim();
    if (!name) return alert('الرجاء إدخال اسم للروتين');
    const checks = document.querySelectorAll('.routine-check:checked');
    const exercises = Array.from(checks).map(c => c.dataset.id);
    if (exercises.length < 2) return alert('اختر على الأقل تمرينين');
    const routines = JSON.parse(localStorage.getItem('routines') || '[]');
    routines.push({ name, exercises, createdAt: new Date().toISOString() });
    localStorage.setItem('routines', JSON.stringify(routines));
    document.getElementById('routine-modal').style.display = 'none';
    loadRoutines();
}

// ============================================================
// 8. المدرب الذكي (Chat)
// ============================================================
function setupChat() {
    document.getElementById('send-chat-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
}

function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const container = document.getElementById('chat-messages');
    container.innerHTML = history.map(msg => `
        <div class="mb-2 ${msg.role === 'user' ? 'text-right' : 'text-left'}">
            <span class="inline-block px-4 py-2 rounded-2xl ${msg.role === 'user' ? 'bg-green-600 text-white' : 'bg-gray-700 text-white'}">
                ${msg.text}
            </span>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    input.value = '';

    // إضافة رسالة المستخدم
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.push({ role: 'user', text });
    localStorage.setItem('chatHistory', JSON.stringify(history));
    loadChatHistory();

    // إرسال إلى الخادم
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: history.slice(-6),
                systemPrompt: `أنت مدرب لياقة. وزن المستخدم ${localStorage.getItem('userWeight')} كجم، هدفه ${localStorage.getItem('userGoal')}.`
            })
        });
        const data = await response.json();
        const reply = data.reply || 'عذراً، لم أفهم، حاول مجدداً.';
        history.push({ role: 'model', text: reply });
        localStorage.setItem('chatHistory', JSON.stringify(history));
        loadChatHistory();
    } catch (error) {
        console.error('خطأ في الاتصال بالمدرب:', error);
        // رسالة احتياطية
        history.push({ role: 'model', text: 'حدث عطل في الاتصال، حاول لاحقاً.' });
        localStorage.setItem('chatHistory', JSON.stringify(history));
        loadChatHistory();
    }
}

// ============================================================
// 9. لوحة المشرف (Admin Panel)
// ============================================================
let adminClickCount = 0;

function setupAdminPanel() {
    // الضغط 5 مرات على الشعار (في الرأس)
    document.querySelector('header h1')?.addEventListener('click', function() {
        adminClickCount++;
        if (adminClickCount === 5) {
            adminClickCount = 0;
            document.getElementById('admin-modal').style.display = 'flex';
            document.getElementById('admin-password').focus();
        }
        setTimeout(() => { adminClickCount = 0; }, 3000);
    });

    document.getElementById('admin-login-btn').addEventListener('click', function() {
        const pass = document.getElementById('admin-password').value;
        const stored = localStorage.getItem('admin_password') || 'NGYM2026';
        if (pass === stored) {
            document.getElementById('admin-panel-content').classList.remove('hidden');
            renderCodes();
        } else {
            alert('كلمة المرور غير صحيحة');
        }
    });

    document.getElementById('generate-code-btn').addEventListener('click', function() {
        const duration = document.getElementById('code-duration').value;
        const prefix = { '1m': 'NGYM-1M', '3m': 'NGYM-3M', '1y': 'NGYM-1Y' }[duration];
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const code = `${prefix}-${random}`;
        const expiry = new Date();
        if (duration === '1m') expiry.setMonth(expiry.getMonth() + 1);
        else if (duration === '3m') expiry.setMonth(expiry.getMonth() + 3);
        else if (duration === '1y') expiry.setFullYear(expiry.getFullYear() + 1);
        const codes = JSON.parse(localStorage.getItem('admin_codes') || '[]');
        codes.push({ code, expiry: expiry.toISOString(), used: false });
        localStorage.setItem('admin_codes', JSON.stringify(codes));
        renderCodes();
        alert(`تم إنشاء الكود: ${code}`);
    });

    document.getElementById('close-admin-modal').addEventListener('click', function() {
        document.getElementById('admin-modal').style.display = 'none';
        document.getElementById('admin-panel-content').classList.add('hidden');
    });
}

function renderCodes() {
    const codes = JSON.parse(localStorage.getItem('admin_codes') || '[]');
    const container = document.getElementById('codes-list');
    container.innerHTML = codes.map(c => `
        <div class="flex justify-between text-sm border-b border-gray-700 py-1">
            <span>${c.code}</span>
            <span class="${c.used ? 'text-red-400' : 'text-green-400'}">${c.used ? 'مستخدم' : 'فعال'}</span>
        </div>
    `).join('');
}

// ============================================================
// 10. تبديل التبويبات
// ============================================================
function setupTabSwitching() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
            this.classList.add('active-tab');
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden-tab'));
            document.getElementById(`tab-${tab}`).classList.remove('hidden-tab');
            if (tab === 'workouts') renderWorkouts();
            if (tab === 'coach') loadChatHistory();
        });
    });
}

// ============================================================
// 11. ربط الأحداث العامة
// ============================================================
function setupEventListeners() {
    document.getElementById('save-set-btn').addEventListener('click', saveSet);
    document.getElementById('close-set-modal').addEventListener('click', closeSetModal);
    document.getElementById('create-routine-btn').addEventListener('click', openRoutineModal);
    document.getElementById('save-routine-btn').addEventListener('click', saveRoutine);
    document.getElementById('close-routine-modal').addEventListener('click', function() {
        document.getElementById('routine-modal').style.display = 'none';
    });

    // أشرطة التصفية
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderWorkouts();
        });
    });

    // رفع الصورة (محاكاة)
    document.getElementById('upload-image-btn').addEventListener('click', function() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(ev) {
                    // محاكاة إرسال الصورة للمدرب
                    document.getElementById('chat-input').value = '📷 أرسلت صورة وجبة، قم بتحليلها';
                    sendChatMessage();
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    });

    // تسجيل الصوت (محاكاة)
    document.getElementById('record-audio-btn').addEventListener('click', function() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    // محاكاة تسجيل 3 ثوان
                    document.getElementById('chat-input').value = '🎙️ رسالة صوتية: أريد تمرين للبطن';
                    sendChatMessage();
                    stream.getTracks().forEach(t => t.stop());
                })
                .catch(() => alert('الرجاء السماح بالوصول إلى الميكروفون'));
        } else {
            alert('المتصفح لا يدعم التسجيل الصوتي');
        }
    });

    // إغلاق النوافذ المنبثقة بالنقر خارجها
    document.querySelectorAll('.modal-overlay').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) this.style.display = 'none';
        });
    });
}

// ============================================================
// 12. تهيئة بيانات وهمية للتجربة
// ============================================================
// محاكاة تحميل بيانات BodyIQDB
function loadExerciseData() {
    // في التطبيق الحقيقي: fetch('/data/exercises.json')
    // ولكن نستخدم البيانات الوهمية الموجودة
    console.log('تم تحميل ' + exerciseDB.length + ' تمرين');
}

loadExerciseData();

// تشغيل تحديث دوري كل 30 ثانية
setInterval(() => {
    updateUI();
    updateBodygraph();
}, 30000);

console.log('🚀 NGym جاهز!');
