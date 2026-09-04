// ==================================================
// NGym - التطبيق الذكي بالكامل (JavaScript)
// الإصدار النهائي - المصحح والمطور
// ==================================================

// ---- 1. البيانات الثابتة والقيم الافتراضية ----
const DEFAULT_USER_DATA = {
    weight: 70, targetWeight: 75, height: 175, age: 24,
    gender: 'male', activity: 1.375, goal: 'bulking', xp: 0, apiKey: ''
};

const FALLBACK_WORKOUTS = [
    { id: 'pushup', name: 'تمرين الضغط', name_ar: 'تمرين الضغط', category: 'Calisthenics', target_muscle: 'chest', location: 'home', met: 3.8 },
    { id: 'squat', name: 'Squat', name_ar: 'تمرين القرفصاء', category: 'Calisthenics', target_muscle: 'legs', location: 'home', met: 5 },
    { id: 'plank', name: 'Plank', name_ar: 'تمرين البلانك', category: 'Calisthenics', target_muscle: 'abs', location: 'home', met: 4 }
];

let exerciseDatabase = [];
let selectedBase64Image = null;
let currentFilter = 'all';
let currentExercise = null;
let reminderInterval = null;
let logoClickCount = 0;
let logoClickTimer = null;
let lastReminderCheckedMinute = '';

// ---- 2. معالجة اتصال قاعدة البيانات Firestore ----
let dbInstance = null;
if (typeof db !== 'undefined' && db !== null) {
    dbInstance = db;
    console.log('✅ db متصل بنجاح');
} else {
    dbInstance = {
        collection: () => ({
            doc: () => ({
                set: () => Promise.resolve(),
                get: () => Promise.resolve({ exists: false, data: () => ({}) }),
                update: () => Promise.resolve()
            }),
            where: () => ({ get: () => Promise.resolve({ empty: true, docs: [] }) }),
            orderBy: () => ({ limit: () => ({ get: () => Promise.resolve({ empty: true, docs: [] }) }) })
        })
    };
    console.warn('⚠️ db غير معرف، تم استخدام نسخة وهمية');
}

// ---- 3. إدارة التخزين المحلي والبيانات ----
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
    } catch (e) {
        return DEFAULT_USER_DATA;
    }
}

function saveUserData(data) {
    try {
        const safeNumber = (value) => {
            const num = parseFloat(value);
            return isNaN(num) ? null : num;
        };

        const weight = safeNumber(data.weight);
        if (weight !== null) localStorage.setItem('userWeight', weight);

        const targetWeight = safeNumber(data.targetWeight);
        if (targetWeight !== null) localStorage.setItem('userTargetWeight', targetWeight);

        const height = safeNumber(data.height);
        if (height !== null) localStorage.setItem('userHeight', height);

        const age = safeNumber(data.age);
        if (age !== null) localStorage.setItem('userAge', age);

        if (data.gender) localStorage.setItem('userGender', data.gender);
        if (data.activity) localStorage.setItem('userActivity', data.activity);
        if (data.goal) localStorage.setItem('userGoal', data.goal);
        if (data.apiKey !== undefined) localStorage.setItem('geminiApiKey', data.apiKey);

        localStorage.setItem('hasOnboarded', 'true');
        updateDashboardUI();
    } catch (e) {
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
    } catch (e) {}
}

// ---- 4. دالة ضغط الصور ----
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                }
                if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                resolve(compressedBase64);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ---- 5. التحكم بالنوافذ المنبثقة وحقول الإدخال ----
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (modalId === 'onboard-modal' || modalId === 'onboarding-modal' || modalId === 'settings-modal') {
        const u = getUserData();
        const fieldMap = {
            'user-weight': u.weight, 'input-weight': u.weight,
            'user-target-weight': u.targetWeight, 'input-target-weight': u.targetWeight,
            'user-height': u.height, 'input-height': u.height,
            'user-age': u.age, 'input-age': u.age,
            'user-gender': u.gender, 'input-gender': u.gender,
            'user-activity': u.activity, 'select-activity': u.activity,
            'user-goal': u.goal, 'select-goal': u.goal,
            'user-api-key': u.apiKey, 'input-api-key': u.apiKey
        };
        for (let id in fieldMap) {
            const el = document.getElementById(id);
            if (el) el.value = fieldMap[id];
        }
    }

    modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

// تعديل دالة التنقل للتوافق مع كلاس hidden-tab
function switchTab(tabId) {
    try {
        document.querySelectorAll('.tab-content').forEach(el => {
            el.classList.add('hidden-tab');
        });
        const target = document.getElementById(tabId);
        if (target) target.classList.remove('hidden-tab');

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('text-emerald-400', 'bg-slate-800', 'shadow');
            btn.classList.add('hover:text-slate-200');
        });
        
        const activeBtn = document.querySelector(`[onclick*="${tabId}"]`);
        if (activeBtn) {
            activeBtn.classList.remove('hover:text-slate-200');
            activeBtn.classList.add('text-emerald-400', 'bg-slate-800', 'shadow');
        }
    } catch (e) {
        console.error("Error switching tab:", e);
    }
}

// ---- 6. المحرك الرياضي والواجهة ----
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
        const el = document.getElementById(`muscle-${m.toLowerCase()}`);
        if (el) el.classList.add('muscle-active');
    });
}

// ---- 7. دالة مسارات الصور والتمارين والفلترة المحدثة ----
function getExerciseGifUrl(ex) {
    if (ex.gif_url) return ex.gif_url;
    if (ex.id) return `assets/gifs/1/${ex.id}.gif`;
    return 'assets/gifs/default.gif';
}

function filterWorkouts(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('bg-emerald-500', 'text-slate-950', 'active-filter');
        btn.classList.add('bg-slate-800', 'text-slate-300');
    });

    const activeBtn = document.querySelector(`[data-filter="${filter}"]`);
    if (activeBtn) {
        activeBtn.classList.remove('bg-slate-800', 'text-slate-300');
        activeBtn.classList.add('bg-emerald-500', 'text-slate-950', 'active-filter');
    }

    renderWorkoutsList();
}

async function loadExerciseDatabase() {
    try {
        const response = await fetch('/data/exercises.json');
        if (!response.ok) throw new Error('فشل تحميل التمارين');
        exerciseDatabase = await response.json();
    } catch (error) {
        exerciseDatabase = FALLBACK_WORKOUTS;
    }
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
    } else if (['chest', 'back', 'legs', 'arms', 'abs'].includes(currentFilter)) {
        filtered = exerciseDatabase.filter(ex => ex.target_muscle && ex.target_muscle.toLowerCase() === currentFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 text-xs py-8">لا توجد تمارين مطابقة</div>';
        return;
    }

    container.innerHTML = filtered.map(ex => {
        const isFav = JSON.parse(localStorage.getItem('favorites') || '[]').includes(ex.id);
        const displayName = ex.name_ar || ex.name || 'تمرين';
        const imgUrl = getExerciseGifUrl(ex);
        return `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm">
            <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 flex-shrink-0">
                <img src="${imgUrl}" alt="${displayName}" class="w-full h-full object-cover" onerror="this.onerror=null; this.src='assets/gifs/default.gif';">
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-slate-200 truncate">${displayName}</h4>
                <p class="text-[10px] text-slate-400 mt-0.5 truncate">${ex.target_muscle || ''}</p>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
                <button onclick="toggleFavorite('${ex.id}')" class="text-${isFav ? 'yellow-400' : 'slate-500'} text-sm p-1">
                    <i class="fa-solid fa-star"></i>
                </button>
                <button onclick="openExerciseModal('${ex.id}', '${displayName}', '${ex.target_muscle}', ${ex.met || 5})" class="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-[10px] font-semibold">
                    تسجيل
                </button>
            </div>
        </div>
    `}).join('');
}

function toggleFavorite(id) {
    let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (favs.includes(id)) favs = favs.filter(f => f !== id);
    else favs.push(id);
    localStorage.setItem('favorites', JSON.stringify(favs));
    renderWorkoutsList();
}

function openExerciseModal(id, name, muscle, met) {
    currentExercise = { id, name, muscle, met };
    const input = document.getElementById('exercise-name');
    if (input) input.value = name;
    openModal('exercise-modal');
}

// ---- 8. دعم الصور والصوت بالشات ----
async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
        const compressed = await compressImage(file);
        selectedBase64Image = compressed;
        const imgPreview = document.getElementById('image-preview');
        const container = document.getElementById('image-preview-container');
        if (imgPreview) imgPreview.src = compressed;
        if (container) container.classList.remove('hidden');
    } catch (error) {
        console.error('فشل ضغط الصورة:', error);
        alert('حدث خطأ أثناء معالجة الصورة، حاول مرة أخرى.');
    }
}

function clearChatImage() {
    selectedBase64Image = null;
    const container = document.getElementById('image-preview-container');
    if (container) container.classList.add('hidden');
    const input = document.getElementById('chat-file-input');
    if (input) input.value = '';
}

function toggleVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('المتصفح لا يدعم التسجيل الصوتي');
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) micBtn.classList.add('text-red-500', 'animate-pulse');

    recognition.onresult = function (event) {
        const chatInput = document.getElementById('chat-input');
        if (chatInput) chatInput.value = event.results[0][0].transcript;
        if (micBtn) micBtn.classList.remove('text-red-500', 'animate-pulse');
    };
    recognition.onerror = function () {
        if (micBtn) micBtn.classList.remove('text-red-500', 'animate-pulse');
    };
    recognition.onend = function () {
        if (micBtn) micBtn.classList.remove('text-red-500', 'animate-pulse');
    };
    recognition.start();
}

// ---- 9. نظام الشات والأوفلاين ----
function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';

    if (history.length === 0) {
        renderChatMessage('assistant', 'أهلاً بك! أنا مدربك الذكي الشخصي. كيف يمكنني مساعدتك اليوم؟', false);
    } else {
        history.forEach(m => renderChatMessage(m.sender, m.text, false, m.image));
    }
}

function saveChatMessage(sender, text, image = null) {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.push({ sender, text, image, time: new Date().toISOString() });
    if (history.length > 50) history.shift();
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

async function handleSendMessage() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text && !selectedBase64Image) return;

    const currentImage = selectedBase64Image;
    input.value = '';
    clearChatImage();

    renderChatMessage('user', text, true, currentImage);

    if (!navigator.onLine) {
        addToPendingQueue(text);
        renderChatMessage('assistant', '⚠️ أنت غير متصل بالإنترنت. تم حفظ الرسالة وسنرسلها تلقائياً عند عودة الاتصال.', false);
        return;
    }

    const msgId = renderChatMessage('assistant', 'جاري التفكير والإجابة...', false);

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userMessage: text, image: currentImage })
        });

        if (!response.ok) throw new Error('تعذر التواصل مع الخادم');

        const data = await response.json();
        const reply = data.reply || 'تم استلام استفسارك بنجاح!';
        updateChatMessage(msgId, reply);
        saveChatMessage('assistant', reply);
    } catch (e) {
        console.error("Chat Error:", e);
        const fallback = '🎯 واصل الالتزام بخطتك الغذائية والتمرين اليومي!';
        updateChatMessage(msgId, fallback);
        saveChatMessage('assistant', fallback);
    }
}

function renderChatMessage(sender, text, save = true, image = null) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const id = 'msg-' + Date.now() + Math.random().toString(36).substring(2, 5);
    const isUser = sender === 'user';
    const imgHTML = image ? `<img src="${image}" class="max-w-full h-auto rounded-lg mb-2 border border-slate-700"/>` : '';

    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="flex ${isUser ? 'justify-end' : 'justify-start'} mb-2">
            <div class="${isUser ? 'bg-emerald-600 text-slate-950 font-medium' : 'bg-slate-800 text-slate-100'} px-3.5 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-sm">
                ${imgHTML}
                <div>${text}</div>
            </div>
        </div>
    `);
    container.scrollTop = container.scrollHeight;
    if (save) saveChatMessage(sender, text, image);
    return id;
}

function updateChatMessage(id, newText) {
    const el = document.getElementById(id);
    if (el) {
        const txtDiv = el.querySelector('div > div:last-child') || el.querySelector('div');
        if (txtDiv) txtDiv.textContent = newText;
    }
}

function addToPendingQueue(text) {
    const queue = JSON.parse(localStorage.getItem('pendingChatQueue') || '[]');
    queue.push(text);
    localStorage.setItem('pendingChatQueue', JSON.stringify(queue));
}

async function retryPendingMessages() {
    if (!navigator.onLine) return;

    let queue = JSON.parse(localStorage.getItem('pendingChatQueue') || '[]');
    if (queue.length === 0) return;

    let failedMessages = [];

    for (let i = 0; i < queue.length; i++) {
        const msg = queue[i];
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userMessage: msg })
            });

            if (!res.ok) {
                failedMessages.push(msg);
                continue;
            }

            const data = await res.json();
            renderChatMessage('assistant', data.reply || 'تم الرد بنجاح', true);
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
            failedMessages.push(msg);
        }
    }

    localStorage.setItem('pendingChatQueue', JSON.stringify(failedMessages));

    if (failedMessages.length > 0) {
        setTimeout(retryPendingMessages, 60000);
    }
}

// ---- 10. التنبيهات والاشتراك ووضع المسؤول ----
function loadReminderSettings() {
    const timeInput = document.getElementById('reminder-time');
    const enabledInput = document.getElementById('reminder-enabled');
    if (timeInput) timeInput.value = localStorage.getItem('reminderTime') || '20:00';
    if (enabledInput) enabledInput.checked = localStorage.getItem('reminderEnabled') === 'true';
}

function startReminderChecker() {
    if (reminderInterval) clearInterval(reminderInterval);
    reminderInterval = setInterval(() => {
        const now = new Date();

        if (now.getHours() === 0 && now.getMinutes() === 0) {
            lastReminderCheckedMinute = '';
        }

        const enabled = localStorage.getItem('reminderEnabled') === 'true';
        if (!enabled) return;

        const setTime = localStorage.getItem('reminderTime');
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

        if (setTime === currentTime && lastReminderCheckedMinute !== currentTime) {
            lastReminderCheckedMinute = currentTime;
            if ("Notification" in window && Notification.permission === "granted") {
                new Notification("NGym 🏋️", { body: "حان وقت التمرين وتسجيل وجباتك اليومية!" });
            }
        }
    }, 10000);
}

function setupAdminPanel() {
    const logo = document.getElementById('app-logo');
    if (!logo) return;
    logo.addEventListener('click', () => {
        logoClickCount++;
        clearTimeout(logoClickTimer);
        logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 3000);
        if (logoClickCount >= 5) {
            logoClickCount = 0;
            openModal('admin-modal');
        }
    });
}

async function loadAdminCodes() {
    const container = document.getElementById('codes-list');
    if (!container) return;

    if (!dbInstance) {
        container.innerHTML = '<div class="text-amber-400">⚠️ Firebase غير متصل</div>';
        return;
    }

    try {
        const snapshot = await dbInstance.collection('codes')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        if (snapshot.empty) {
            container.innerHTML = '<div class="text-slate-400">لا توجد أكواد مضافة</div>';
            return;
        }

        container.innerHTML = snapshot.docs.map(doc => {
            const data = doc.data();
            const used = data.isUsed ? 'مستخدم ✅' : 'فعال 🔓';
            const color = data.isUsed ? 'text-emerald-400' : 'text-amber-400';
            return `<div class="flex justify-between border-b border-slate-800 py-1 text-xs">
                <span class="font-mono text-emerald-400">${doc.id}</span>
                <span class="${color}">${used}</span>
                <span class="text-slate-400">${data.days || 30} يوم</span>
            </div>`;
        }).join('');
    } catch (e) {
        console.error('خطأ في تحميل الأكواد:', e);
        container.innerHTML = '<div class="text-red-400">خطأ في تحميل الأكواد</div>';
    }
}

async function checkSubscriptionStatus() {
    const endDate = localStorage.getItem('subscriptionEndDate');
    if (!endDate) return 'active';
    return new Date() > new Date(endDate) ? 'expired' : 'active';
}

async function updateSubscriptionUI() {
    const status = await checkSubscriptionStatus();
    const banner = document.getElementById('subscription-banner');
    const statusText = document.getElementById('subscription-status');
    const renewBtn = document.getElementById('renew-btn');

    if (status === 'expired') {
        if (banner) banner.classList.remove('hidden');
        if (statusText) statusText.textContent = '⛔ انتهت فترة التجربة - يرجى التجديد';
        if (renewBtn) renewBtn.classList.remove('hidden');
    } else {
        if (statusText) statusText.textContent = '✅ اشتراك فعال';
        if (renewBtn) renewBtn.classList.add('hidden');
    }
}

async function generateCode(days) {
    if (!dbInstance) { alert("❌ Firebase غير متصل."); return; }
    const code = 'NGYM-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    try {
        await dbInstance.collection('codes').doc(code).set({
            days: parseInt(days) || 30,
            isUsed: false,
            createdAt: new Date().toISOString()
        });
        alert(`✅ كود جديد:\n${code}\n(المدة: ${days} يوم)`);
        loadAdminCodes();
    } catch (e) {
        alert("حدث خطأ أثناء إنشاء الكود");
    }
}

async function redeemSubscriptionCode(code) {
    if (!dbInstance) { alert("❌ Firebase غير متصل."); return; }
    try {
        const doc = await dbInstance.collection('codes').doc(code.trim()).get();
        if (doc.exists && !doc.data().isUsed) {
            const days = doc.data().days || 30;
            const newEnd = new Date();
            newEnd.setDate(newEnd.getDate() + days);
            localStorage.setItem('subscriptionEndDate', newEnd.toISOString());
            await dbInstance.collection('codes').doc(code.trim()).update({ isUsed: true });
            alert("✅ تم تفعيل الاشتراك بنجاح!");
            updateDashboardUI();
        } else {
            alert("❌ الكود غير صالح أو مستخدم سابقاً");
        }
    } catch (e) {
        alert("فشل التحقق من الكود");
    }
}

// ---- 11. دوال معالجة النماذج (Form Handlers) ----
function handleOnboardingSubmit(e) {
    e.preventDefault();
    const data = {
        weight: document.getElementById('input-weight').value,
        targetWeight: document.getElementById('input-target-weight').value,
        height: document.getElementById('input-height').value,
        age: document.getElementById('input-age').value,
        goal: document.getElementById('select-goal').value,
        activity: document.getElementById('select-activity').value,
        apiKey: document.getElementById('input-api-key').value
    };
    saveUserData(data);
    closeModal('onboarding-modal');
}

function handleMealSubmit(e) {
    e.preventDefault();
    const cal = parseInt(document.getElementById('meal-calories').value) || 0;
    const pro = parseInt(document.getElementById('meal-protein').value) || 0;
    const carb = parseInt(document.getElementById('meal-carbs').value) || 0;
    const fat = parseInt(document.getElementById('meal-fats').value) || 0;

    localStorage.setItem('todayEatenCalories', (parseInt(localStorage.getItem('todayEatenCalories')) || 0) + cal);
    localStorage.setItem('todayEatenProtein', (parseInt(localStorage.getItem('todayEatenProtein')) || 0) + pro);
    localStorage.setItem('todayEatenCarbs', (parseInt(localStorage.getItem('todayEatenCarbs')) || 0) + carb);
    localStorage.setItem('todayEatenFats', (parseInt(localStorage.getItem('todayEatenFats')) || 0) + fat);

    addXP(15);
    updateDashboardUI();
    closeModal('meal-modal');
}

function handleExerciseSubmit(e) {
    e.preventDefault();
    if (!currentExercise) return;
    const duration = parseInt(document.getElementById('exercise-duration').value) || 10;
    logExerciseWithDetails(currentExercise.muscle.toLowerCase(), currentExercise.met, duration);
    closeModal('exercise-modal');
}

// ---- 12. دوال التنبيهات (Reminders) ----
function toggleDay(element) {
    if (element) element.classList.toggle('active');
}

function saveReminders() {
    const time = document.getElementById('reminder-time')?.value;
    if (time) {
        localStorage.setItem('reminderTime', time);
        localStorage.setItem('reminderEnabled', 'true');
        const status = document.getElementById('reminder-status');
        if (status) status.textContent = `تم تفعيل التنبيه اليومي الساعة ${time}`;
        alert('✅ تم حفظ التنبيه بنجاح');
    }
}

// ---- 13. دوال لوحة المشرف (Admin) ----
function verifyAdmin() {
    const password = document.getElementById('admin-password')?.value;
    if (password === 'NGymAdmin2026') {
        document.getElementById('admin-login-section').classList.add('hidden');
        document.getElementById('admin-dashboard-section').classList.remove('hidden');
        loadAdminCodes();
    } else {
        alert('❌ كلمة المرور غير صحيحة');
    }
}

// ---- 14. التهيئة وربط المستمعات الشاملة عند التشغيل ----
document.addEventListener('DOMContentLoaded', function () {
    loadExerciseDatabase();
    updateDashboardUI();
    loadChatHistory();
    loadReminderSettings();
    startReminderChecker();
    setupAdminPanel();

    window.addEventListener('online', retryPendingMessages);

    document.getElementById('chat-file-input')?.addEventListener('change', handleImageUpload);
    document.getElementById('mic-btn')?.addEventListener('click', toggleVoiceRecognition);
    document.getElementById('remove-image-btn')?.addEventListener('click', clearChatImage);

    document.getElementById('send-chat-btn')?.addEventListener('click', handleSendMessage);
    document.getElementById('chat-input')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleSendMessage();
    });

    document.getElementById('renew-btn')?.addEventListener('click', function() {
        const code = prompt('أدخل كود التفعيل:');
        if (code) redeemSubscriptionCode(code);
    });

    document.getElementById('generate-code-btn')?.addEventListener('click', function() {
        const duration = parseInt(document.getElementById('code-duration')?.value) || 30;
        generateCode(duration);
    });
});
