// ============================================================
// NGym - التطبيق الكامل (حل مشكلة الصور وقراءة التمارين)
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

document.addEventListener('DOMContentLoaded', async function() {
    const loadingScreen = document.getElementById('loading-screen');
    const appScreen = document.getElementById('app');
    
    if (loadingScreen) loadingScreen.style.display = 'none';
    if (appScreen) appScreen.style.display = 'block';

    loadUserData();
    loadChatHistory();
    loadRoutines();

    await loadFullExercisesDatabase();

    updateUI();
    renderWorkouts();
    updateBodygraph();

    setupEventListeners();
    setupAdminPanel();
    setupChat();
    setupTabSwitching();
});

async function loadFullExercisesDatabase() {
    try {
        const response = await fetch('/data/exercises.json');
        if (response.ok) {
            const data = await response.json();
            if (Array.isArray(data) && data.length > 0) {
                exerciseDB = data;
            }
        }
    } catch (e) {
        console.log('استخدام القائمة المضمنة');
    }
}

function loadUserData() {
    if (!localStorage.getItem('userWeight')) localStorage.setItem('userWeight', '70');
    if (!localStorage.getItem('userGoal')) localStorage.setItem('userGoal', 'fitness');
    if (!localStorage.getItem('streak')) localStorage.setItem('streak', '0');
    if (!localStorage.getItem('xp')) localStorage.setItem('xp', '0');
    if (!localStorage.getItem('rank')) localStorage.setItem('rank', 'برونزي');

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
    if (document.getElementById('calories-left')) document.getElementById('calories-left').textContent = remaining;
    if (document.getElementById('target-cal')) document.getElementById('target-cal').textContent = target.calories;
    if (document.getElementById('eaten-cal')) document.getElementById('eaten-cal').textContent = eaten.calories;
    if (document.getElementById('burned-cal')) document.getElementById('burned-cal').textContent = burned;

    const ring = document.getElementById('calories-ring');
    if (ring) {
        const circumference = 339.292;
        const progress = Math.min((target.calories - remaining) / target.calories, 1);
        ring.style.strokeDashoffset = circumference * (1 - Math.max(progress, 0));
    }

    updateMacroBar('protein', eaten.protein, target.protein);
    updateMacroBar('carbs', eaten.carbs, target.carbs);
    updateMacroBar('fats', eaten.fats, target.fats);

    const xp = parseInt(localStorage.getItem('xp')) || 0;
    const streak = parseInt(localStorage.getItem('streak')) || 0;
    const rank = localStorage.getItem('rank') || 'برونزي';
    const xpTarget = 450 + (streak * 20);
    
    if (document.getElementById('xp-current')) document.getElementById('xp-current').textContent = xp;
    if (document.getElementById('xp-bar')) document.getElementById('xp-bar').style.width = Math.min((xp / xpTarget) * 100, 100) + '%';
    if (document.getElementById('rank-badge')) document.getElementById('rank-badge').textContent = rank;
    if (document.getElementById('streak-days')) document.getElementById('streak-days').textContent = streak;

    const ranks = ['مبتدئ', 'برونزي', 'فضي', 'ذهبي', 'ألماسي', 'أسطوري'];
    let nextRank = 'ذهبي';
    const idx = ranks.indexOf(rank);
    if (idx !== -1 && idx < ranks.length - 1) nextRank = ranks[idx + 1];
    if (document.getElementById('next-rank')) document.getElementById('next-rank').textContent = nextRank;
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
// دالة عرض التمارين وتوليد الصور من السيرفر المباشر
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
        container.innerHTML = '<div class="text-center text-slate-500 py-8 text-sm">لا توجد تمارين مطابقة للتصنيف</div>';
        return;
    }

    container.innerHTML = filtered.map(ex => {
        const formattedId = String(ex.id).padStart(4, '0');
        
        // رابط مباشر مضمون يقرأ صور GIF مفتوحة المصدر مباشرة
        const imgPath = ex.gifUrl || `https://v2.exercisedb.io/image/${formattedId}`;
        const fallbackImg = `https://raw.githubusercontent.com/yuhasbs/exercise-assets/main/gifs/${formattedId}.gif`;

        return `
        <div class="workout-card bg-slate-800/80 border border-slate-700/60 rounded-xl p-3 mb-3">
            <div class="flex justify-between items-start mb-2">
                <div class="flex-1 pl-2">
                    <h4 class="font-bold text-sm text-white">${ex.name}</h4>
                    <p class="text-xs text-slate-400 mt-0.5">${ex.muscle || ''} · ${ex.equipment || ''}</p>
                </div>
                <button class="favorite-btn text-lg ${isFavorite(ex.id) ? 'text-amber-400' : 'text-slate-600'}" data-id="${ex.id}">⭐</button>
            </div>
            
            <div class="w-full h-48 my-2 rounded-lg overflow-hidden bg-slate-900 border border-slate-700/50 flex justify-center items-center">
                <img src="${imgPath}" 
                     loading="lazy" 
                     alt="${ex.name}" 
                     class="h-full w-full object-contain" 
                     onerror="this.onerror=null; this.src='${fallbackImg}';" />
            </div>

            <div class="flex justify-between items-center mt-2 pt-2 border-t border-slate-700/50">
                <button class="start-workout-btn btn-primary text-xs py-2 px-4 w-full bg-green-500 text-slate-950 font-bold rounded-lg" data-id="${ex.id}">ابدأ التمرين</button>
            </div>
        </div>
    `}).join('');

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
    return favs.includes(String(id));
}

function toggleFavorite(id) {
    let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    const strId = String(id);
    if (favs.includes(strId)) favs = favs.filter(f => f !== strId);
    else favs.push(strId);
    localStorage.setItem('favorites', JSON.stringify(favs));
}

let currentExerciseId = null;

function openSetModal(exerciseId) {
    currentExerciseId = exerciseId;
    const ex = exerciseDB.find(e => String(e.id) === String(exerciseId));
    if (document.getElementById('set-exercise-name')) document.getElementById('set-exercise-name').textContent = ex ? ex.name : 'تمرين';
    document.getElementById('set-modal')?.classList.remove('hidden');
}

function closeSetModal() {
    document.getElementById('set-modal')?.classList.add('hidden');
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

function setupChat() {
    document.getElementById('send-chat-btn')?.addEventListener('click', sendChatMessage);
    document.getElementById('chat-input')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendChatMessage(); });
}

function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const container = document.getElementById('chat-messages');
    if (!container) return;
    if (history.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-500 text-xs py-4">مرحباً! أنا مدربك الذكي، كيف يمكنني مساعدتك اليوم؟</div>';
        return;
    }
    container.innerHTML = history.map(msg => `
        <div class="flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-2">
            <div class="max-w-[80%] rounded-2xl px-3.5 py-2 text-xs ${msg.role === 'user' ? 'bg-green-500 text-slate-950 font-medium' : 'bg-slate-700 text-slate-100'}">
                ${msg.text}
            </div>
        </div>
    `).join('');
    container.scrollTop = container.scrollHeight;
}

async function sendChatMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';

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

let adminClickCount = 0;

function setupAdminPanel() {
    document.getElementById('app-logo-header')?.addEventListener('click', function() {
        adminClickCount++;
        if (adminClickCount === 5) {
            adminClickCount = 0;
            document.getElementById('admin-modal')?.classList.remove('hidden');
        }
        setTimeout(() => { adminClickCount = 0; }, 3000);
    });

    document.getElementById('admin-login-btn')?.addEventListener('click', function() {
        const pass = document.getElementById('admin-password').value;
        if (pass === (localStorage.getItem('admin_password') || 'NGYM2026')) {
            document.getElementById('admin-panel-content')?.classList.remove('hidden');
            renderCodes();
        } else {
            alert('كلمة المرور غير صحيحة');
        }
    });

    document.getElementById('generate-code-btn')?.addEventListener('click', function() {
        const duration = document.getElementById('code-duration').value;
        const prefix = { '1m': 'NGYM-1M', '3m': 'NGYM-3M', '1y': 'NGYM-1Y' }[duration];
        const code = `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const codes = JSON.parse(localStorage.getItem('admin_codes') || '[]');
        codes.push({ code, used: false });
        localStorage.setItem('admin_codes', JSON.stringify(codes));
        renderCodes();
    });

    document.getElementById('close-admin-modal')?.addEventListener('click', function() {
        document.getElementById('admin-modal')?.classList.add('hidden');
    });
}

function renderCodes() {
    const codes = JSON.parse(localStorage.getItem('admin_codes') || '[]');
    const container = document.getElementById('codes-list');
    if (container) {
        container.innerHTML = codes.map(c => `
            <div class="flex justify-between text-xs border-b border-slate-800 py-1">
                <span class="font-mono">${c.code}</span>
                <span class="${c.used ? 'text-red-400' : 'text-green-400'}">${c.used ? 'مستخدم' : 'فعال'}</span>
            </div>
        `).join('');
    }
}

function switchToTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active-tab'));
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (targetBtn) targetBtn.classList.add('active-tab');

    document.querySelectorAll('.tab-panel').forEach(p => p.classList.add('hidden-tab'));
    const targetPanel = document.getElementById(`tab-${tabName}`);
    if (targetPanel) targetPanel.classList.remove('hidden-tab');

    if (tabName === 'workouts') renderWorkouts();
    if (tabName === 'coach') loadChatHistory();
}

function setupTabSwitching() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchToTab(this.dataset.tab);
        });
    });

    document.getElementById('floating-agent-btn')?.addEventListener('click', function() {
        switchToTab('coach');
    });
}

function setupEventListeners() {
    document.getElementById('save-set-btn')?.addEventListener('click', saveSet);
    document.getElementById('close-set-modal')?.addEventListener('click', closeSetModal);

    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderWorkouts();
        });
    });

    const imageInput = document.getElementById('coach-image-input');
    document.getElementById('upload-image-btn')?.addEventListener('click', () => imageInput?.click());
    
    imageInput?.addEventListener('change', function(e) {
        if (e.target.files && e.target.files[0]) {
            document.getElementById('chat-input').value = '📷 [صورة]: قم بتحليل هذه الوجبة وتوليد الماكروز.';
            sendChatMessage();
        }
    });

    const audioBtn = document.getElementById('record-audio-btn');
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (SpeechRecognition && audioBtn) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.interimResults = false;

        audioBtn.addEventListener('click', function() {
            audioBtn.classList.add('bg-red-500');
            recognition.start();
        });

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chat-input').value = transcript;
            audioBtn.classList.remove('bg-red-500');
            sendChatMessage();
        };

        recognition.onerror = function() {
            audioBtn.classList.remove('bg-red-500');
            alert('حدث خطأ أثناء التقاط الصوت، حاول مجدداً.');
        };

        recognition.onend = function() {
            audioBtn.classList.remove('bg-red-500');
        };
    } else if (audioBtn) {
        audioBtn.addEventListener('click', function() {
            alert('المتصفح لا يدعم ميزة تحويل الصوت إلى نص مباشرة.');
        });
    }
}

function loadRoutines() {
    const routines = JSON.parse(localStorage.getItem('routines') || '[]');
    const container = document.getElementById('routines-list');
    if (!container) return;
    if (routines.length === 0) {
        container.innerHTML = '<div class="text-slate-500 text-xs">لا توجد روتينات مخصصة بعد.</div>';
        return;
    }
    container.innerHTML = routines.map(r => `<div>• ${r.name}</div>`).join('');
}
