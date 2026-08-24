// ============================================================
// NGym - التطبيق الكامل
// ============================================================

const MOCK_EXERCISES = [
    { id: '1', name: 'Sit-Up 3/4', muscle: 'abdominals', equipment: 'body only', gifUrl: '' },
    { id: '2', name: 'Hamstring 90/90', muscle: 'hamstrings', equipment: 'body only', gifUrl: '' },
    { id: '3', name: 'Ab Crunch Machine', muscle: 'abdominals', equipment: 'machine', gifUrl: '' },
    { id: '4', name: 'Ab Roller', muscle: 'abdominals', equipment: 'other', gifUrl: '' },
    { id: '5', name: 'Adductor', muscle: 'adductors', equipment: 'foam roll', gifUrl: '' },
];

let exerciseDB = [...MOCK_EXERCISES];
let currentFilter = 'all';

// ============================================================
// 1. التهيئة والتحميل
// ============================================================
document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';

    loadUserData();
    loadChatHistory();
    loadRoutines();

    updateUI();
    renderWorkouts();
    updateBodygraph();

    setupEventListeners();
    setupAdminPanel();
    setupChat();
    setupTabSwitching();
});

// ============================================================
// 2. إدارة البيانات المحلية وتصفير اليوم الجديد تلقائياً
// ============================================================
function loadUserData() {
    if (!localStorage.getItem('userWeight')) localStorage.setItem('userWeight', '70');
    if (!localStorage.getItem('userGoal')) localStorage.setItem('userGoal', 'fitness');
    if (!localStorage.getItem('streak')) localStorage.setItem('streak', '0');
    if (!localStorage.getItem('xp')) localStorage.setItem('xp', '0');
    if (!localStorage.getItem('rank')) localStorage.setItem('rank', 'برونزي');

    // التحقق من تاريخ اليوم لتصفير الوجبات تلقائياً
    const storedDate = localStorage.getItem('todayDate');
    const today = new Date().toDateString();
    if (storedDate !== today) {
        localStorage.setItem('todayDate', today);
        localStorage.setItem('eatenCalories', '0');
        localStorage.setItem('eatenProtein', '0');
        localStorage.setItem('eatenCarbs', '0');
        localStorage.setItem('eatenFats', '0');
        localStorage.setItem('burnedCalories', '0');
    }
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
// 3. تحديث الواجهة الرئيسية
// ============================================================
function updateUI() {
    const target = getMacrosTarget();
    const eaten = {
        calories: parseInt(localStorage.getItem('eatenCalories')) || 0,
        protein: parseInt(localStorage.getItem('eatenProtein')) || 0,
        carbs: parseInt(localStorage.getItem('eatenCarbs')) || 0,
        fats: parseInt(localStorage.getItem('eatenFats')) || 0
    };
    const burned = parseInt(localStorage.getItem('burnedCalories')) || 0;

    const remaining = Math.max(target.calories - eaten.calories + burned, 0);
    document.getElementById('calories-left').textContent = remaining;
    document.getElementById('target-cal').textContent = target.calories;
    document.getElementById('eaten-cal').textContent = eaten.calories;
    document.getElementById('burned-cal').textContent = burned;

    const ring = document.getElementById('calories-ring');
    const circumference = 339.292;
    const progress = Math.min((target.calories - remaining) / target.calories, 1);
    ring.style.strokeDashoffset = circumference * (1 - Math.max(progress, 0));

    updateMacroBar('protein', eaten.protein, target.protein);
    updateMacroBar('carbs', eaten.carbs, target.carbs);
    updateMacroBar('fats', eaten.fats, target.fats);

    const xp = parseInt(localStorage.getItem('xp')) || 0;
    const streak = parseInt(localStorage.getItem('streak')) || 0;
    const rank = localStorage.getItem('rank') || 'برونزي';
    const xpTarget = 450 + (streak * 20);
    document.getElementById('xp-current').textContent = xp;
    document.getElementById('xp-bar').style.width = Math.min((xp / xpTarget) * 100, 100) + '%';
    document.getElementById('rank-badge').textContent = rank;
    document.getElementById('streak-days').textContent = streak;

    const ranks = ['مبتدئ', 'برونزي', 'فضي', 'ذهبي', 'ألماسي', 'أسطوري'];
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
    const muscles = ['chest', 'core', 'shoulders-l', 'shoulders-r', 'arms-l', 'arms-r', 'legs-l', 'legs-r'];
    const burned = parseInt(localStorage.getItem('burnedCalories')) || 0;
    const activeColor = burned > 0 ? '#22c55e' : '#2a2a2a';

    muscles.forEach(m => {
        const el = document.getElementById(`muscle-${m}`);
        if (el) el.setAttribute('fill', activeColor);
    });
}

// ============================================================
// 5. نظام التمارين
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

    const container = document.getElementById('workout-list');
    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 py-8 text-sm">لا توجد تمارين مطابقة</div>';
        return;
    }
    container.innerHTML = filtered.map(ex => `
        <div class="workout-card">
            <div class="flex justify-between items-start">
                <div>
                    <h4 class="font-bold text-sm text-white">${ex.name}</h4>
                    <p class="text-xs text-slate-400 mt-0.5">${ex.muscle} · ${ex.equipment}</p>
                </div>
                <button class="favorite-btn text-lg ${isFavorite(ex.id) ? 'text-amber-400' : 'text-slate-600'}" data-id="${ex.id}">⭐</button>
            </div>
            <div class="flex justify-between items-center mt-3 pt-2 border-t border-slate-700/50">
                <button class="start-workout-btn btn-primary text-xs py-1.5 px-4" data-id="${ex.id}">ابدأ التمرين</button>
            </div>
        </div>
    `).join('');

    document.querySelectorAll('.start-workout-btn').forEach(btn => {
        btn.addEventListener('click', function() { openSetModal(this.dataset.id); });
    });
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            toggleFavorite(this.dataset.id);
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
// 6. تسجيل الجولات (Sets)
// ============================================================
let currentExerciseId = null;

function openSetModal(exerciseId) {
    currentExerciseId = exerciseId;
    const ex = exerciseDB.find(e => e.id === exerciseId);
    document.getElementById('set-exercise-name').textContent = ex ? ex.name : 'تمرين';
    document.getElementById('set-modal').classList.remove('hidden');
}

function closeSetModal() {
    document.getElementById('set-modal').classList.add('hidden');
    currentExerciseId = null;
}

function saveSet() {
    if (!currentExerciseId) return;
    const reps = parseInt(document.getElementById('set-reps').value) || 0;
    const userWeight = parseFloat(localStorage.getItem('userWeight')) || 70;
    const burned = Math.round((4.5 * 3.5 * userWeight * 0.05) / 200);

    const currentBurned = parseInt(localStorage.getItem('burnedCalories')) || 0;
    localStorage.setItem('burnedCalories', currentBurned + burned);

    const xpGain = Math.round(reps / 2) + 5;
    const currentXP = parseInt(localStorage.getItem('xp')) || 0;
    localStorage.setItem('xp', currentXP + xpGain);

    closeSetModal();
    updateUI();
    updateBodygraph();
}

// ============================================================
// 7. المدرب الذكي (Chat)
// ============================================================
function setupChat() {
    document.getElementById('send-chat-btn').addEventListener('click', sendChatMessage);
    document.getElementById('chat-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
}

function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const container = document.getElementById('chat-messages');
    if (history.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">مرحباً! أنا مدربك الذكي، كيف يمكنني مساعدتك اليوم؟</div>';
        return;
    }
    container.innerHTML = history.map(msg => `
        <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}">
            <div class="max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${msg.role === 'user' ? 'bg-green-500 text-slate-950 font-medium' : 'bg-slate-700 text-slate-100'}">
                ${msg.text}
            </div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = ''; // مسح المدخلات فوراً لتعزيز التفاعل

    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.push({ role: 'user', text });
    localStorage.setItem('chatHistory', JSON.stringify(history));
    loadChatHistory();

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: history.slice(-6),
                systemPrompt: `أنت مدرب لياقة. وزن المستخدم ${localStorage.getItem('userWeight')} كجم.`
            })
        });
        const data = await response.json();
        const reply = data.reply || 'عذراً، لم أفهم استفسارك بشكل كامل.';
        history.push({ role: 'model', text: reply });
        localStorage.setItem('chatHistory', JSON.stringify(history));
        loadChatHistory();
    } catch (error) {
        history.push({ role: 'model', text: 'حدث خطأ في الاتصال بالسيرفر. حاول لاحقاً.' });
        localStorage.setItem('chatHistory', JSON.stringify(history));
        loadChatHistory();
    }
}

// ============================================================
// 8. لوحة المشرف (Admin Panel)
// ============================================================
let adminClickCount = 0;

function setupAdminPanel() {
    // الربط المباشر بـ ID هيدر التطبيق
    document.getElementById('app-logo-header')?.addEventListener('click', function() {
        adminClickCount++;
        if (adminClickCount === 5) {
            adminClickCount = 0;
            document.getElementById('admin-modal').classList.remove('hidden');
        }
        setTimeout(() => { adminClickCount = 0; }, 3000);
    });

    document.getElementById('admin-login-btn').addEventListener('click', function() {
        const pass = document.getElementById('admin-password').value;
        if (pass === (localStorage.getItem('admin_password') || 'NGYM2026')) {
            document.getElementById('admin-panel-content').classList.remove('hidden');
            renderCodes();
        } else {
            alert('كلمة المرور غير صحيحة');
        }
    });

    document.getElementById('generate-code-btn').addEventListener('click', function() {
        const duration = document.getElementById('code-duration').value;
        const prefix = { '1m': 'NGYM-1M', '3m': 'NGYM-3M', '1y': 'NGYM-1Y' }[duration];
        const code = `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const codes = JSON.parse(localStorage.getItem('admin_codes') || '[]');
        codes.push({ code, used: false });
        localStorage.setItem('admin_codes', JSON.stringify(codes));
        renderCodes();
    });

    document.getElementById('close-admin-modal').addEventListener('click', function() {
        document.getElementById('admin-modal').classList.add('hidden');
    });
}

function renderCodes() {
    const codes = JSON.parse(localStorage.getItem('admin_codes') || '[]');
    document.getElementById('codes-list').innerHTML = codes.map(c => `
        <div class="flex justify-between text-xs border-b border-slate-800 py-1">
            <span class="font-mono">${c.code}</span>
            <span class="${c.used ? 'text-red-400' : 'text-green-400'}">${c.used ? 'مستخدم' : 'فعال'}</span>
        </div>
    `).join('');
}

// ============================================================
// 9. التبديل والتحكم في التبويبات والزر العائم
// ============================================================
function switchToTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (targetBtn) targetBtn.classList.add('active-tab');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden-tab'));
    document.getElementById(`tab-${tabName}`).classList.remove('hidden-tab');

    if (tabName === 'workouts') renderWorkouts();
    if (tabName === 'coach') loadChatHistory();
}

function setupTabSwitching() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchToTab(this.dataset.tab);
        });
    });

    // الزر العائم للانتقال المباشر للـ Agent
    document.getElementById('floating-agent-btn').addEventListener('click', function() {
        switchToTab('coach');
    });
}

// ============================================================
// 10. الأحداث العامة والصور والصوت
// ============================================================
function setupEventListeners() {
    document.getElementById('save-set-btn').addEventListener('click', saveSet);
    document.getElementById('close-set-modal').addEventListener('click', closeSetModal);

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderWorkouts();
        });
    });

    // رفع وجبة/صورة بالكاميرا
    const imageInput = document.getElementById('coach-image-input');
    document.getElementById('upload-image-btn').addEventListener('click', () => imageInput.click());
    
    imageInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            document.getElementById('chat-input').value = '📷 [صورة]: قم بتحليل هذه الوجبة وتوليد الماكروز.';
            sendChatMessage();
        }
    });

    // تسجيل الصوت
    document.getElementById('record-audio-btn').addEventListener('click', function() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
                document.getElementById('chat-input').value = '🎙️ [صوت]: اقترح لي تمريناً للبطن.';
                sendChatMessage();
                stream.getTracks().forEach(t => t.stop());
            }).catch(() => alert('يرجى السماح بصلاحية الميكروفون'));
        }
    });
}

function loadRoutines() {
    const routines = JSON.parse(localStorage.getItem('routines') || '[]');
    const container = document.getElementById('routines-list');
    if (routines.length === 0) {
        container.innerHTML = 'لا توجد روتينات مخصصة بعد.';
        return;
    }
    container.innerHTML = routines.map(r => `<div>• ${r.name}</div>`).join('');
}
