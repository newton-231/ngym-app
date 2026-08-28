// ==================================================
// NGym - التطبيق الذكي بالكامل (JavaScript)
// الإصدار النهائي المتكامل - جميع التعديلات المطلوبة
// ==================================================

// ---- 1. البيانات الثابتة والقيم الافتراضية ----
const DEFAULT_USER_DATA = {
    weight: 70, targetWeight: 75, height: 175, age: 24,
    gender: 'male', activity: 1.375, goal: 'bulking', xp: 0, apiKey: ''
};

const FALLBACK_WORKOUTS = [
    { id: 'pushup', name: 'تمرين الضغط', name_ar: 'تمرين الضغط', category: 'Calisthenics', target_muscle: 'Chest', location: 'home', gif_url: '/assets/gifs/default.gif' },
    { id: 'squat', name: 'Squat', name_ar: 'تمرين القرفصاء', category: 'Calisthenics', target_muscle: 'Legs', location: 'home', gif_url: '/assets/gifs/default.gif' },
    { id: 'plank', name: 'Plank', name_ar: 'تمرين البلانك', category: 'Calisthenics', target_muscle: 'Core', location: 'home', gif_url: '/assets/gifs/default.gif' }
];

let exerciseDatabase = [];
let selectedBase64Image = null;
let currentFilter = 'all';
let currentExercise = null;
let reminderInterval = null;
let logoClickCount = 0;
let logoClickTimer = null;

// ---- 2. إدارة التخزين المحلي ----
function getUserData() {
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
}

function saveUserData(data) {
    if (data.weight) localStorage.setItem('userWeight', data.weight);
    if (data.targetWeight) localStorage.setItem('userTargetWeight', data.targetWeight);
    if (data.height) localStorage.setItem('userHeight', data.height);
    if (data.age) localStorage.setItem('userAge', data.age);
    if (data.gender) localStorage.setItem('userGender', data.gender);
    if (data.activity) localStorage.setItem('userActivity', data.activity);
    if (data.goal) localStorage.setItem('userGoal', data.goal);
    if (data.apiKey !== undefined) localStorage.setItem('geminiApiKey', data.apiKey);
    localStorage.setItem('hasOnboarded', 'true');
}

function checkDailyReset() {
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
}

// ---- 3. المحرك الرياضي ----
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

// ---- 4. تحديث الواجهة ----
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

    document.getElementById('target-calories').textContent = targets.calories;
    document.getElementById('eaten-calories').textContent = eatenCal;
    document.getElementById('burned-calories').textContent = burnedCal;
    document.getElementById('remaining-calories').textContent = remaining;

    document.getElementById('target-protein').textContent = `${eatenPro}/${targets.protein}g`;
    document.getElementById('target-carbs').textContent = `${eatenCarb}/${targets.carbs}g`;
    document.getElementById('target-fats').textContent = `${eatenFat}/${targets.fats}g`;

    document.getElementById('protein-bar').style.width = `${Math.min(100, (eatenPro / targets.protein) * 100)}%`;
    document.getElementById('carbs-bar').style.width = `${Math.min(100, (eatenCarb / targets.carbs) * 100)}%`;
    document.getElementById('fats-bar').style.width = `${Math.min(100, (eatenFat / targets.fats) * 100)}%`;

    const circle = document.getElementById('calories-progress-circle');
    if (circle) {
        const circumference = 2 * Math.PI * 42;
        const percent = Math.min(100, Math.max(0, (eatenCal / netTarget) * 100));
        circle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
    }

    const user = getUserData();
    const rank = getRank(user.xp);
    document.getElementById('user-rank').textContent = rank.title;
    document.getElementById('user-rank').className = `font-bold text-sm ${rank.color}`;
    document.getElementById('user-xp').textContent = `${user.xp} XP`;

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

// ---- 5. تحميل بيانات التمارين ----
async function loadExerciseDatabase() {
    try {
        const response = await fetch('/data/exercises.json');
        if (!response.ok) throw new Error('فشل تحميل ملف التمارين');
        const data = await response.json();
        exerciseDatabase = data;
        console.log(`✅ تم تحميل ${exerciseDatabase.length} تمرين`);
        renderWorkoutsList();
    } catch (error) {
        console.error('خطأ في تحميل التمارين:', error);
        exerciseDatabase = FALLBACK_WORKOUTS;
        renderWorkoutsList();
    }
}

// ---- 6. التمارين (عرض، تصفية، مفضلة) ----
function toggleFavorite(id) {
    let favs = JSON.parse(localStorage.getItem('favorites') || '[]');
    if (favs.includes(id)) favs = favs.filter(f => f !== id);
    else favs.push(id);
    localStorage.setItem('favorites', JSON.stringify(favs));
    renderWorkoutsList();
}

function filterWorkouts(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active-filter', 'bg-emerald-600/20', 'text-emerald-400', 'border-emerald-500/30');
        btn.classList.add('bg-slate-800', 'text-slate-400');
    });
    const activeBtn = document.querySelector(`.filter-btn[onclick="filterWorkouts('${filter}')"]`);
    if (activeBtn) {
        activeBtn.classList.add('active-filter', 'bg-emerald-600/20', 'text-emerald-400', 'border-emerald-500/30');
        activeBtn.classList.remove('bg-slate-800', 'text-slate-400');
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
    } else if (currentFilter !== 'all') {
        filtered = exerciseDatabase.filter(ex => 
            ex.target_muscle && ex.target_muscle.toLowerCase().includes(currentFilter)
        );
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 text-xs py-8">لا توجد تمارين مطابقة</div>';
        return;
    }

    container.innerHTML = filtered.map(ex => {
        const isFav = JSON.parse(localStorage.getItem('favorites') || '[]').includes(ex.id);
        const gifPath = ex.gif_url || '/assets/gifs/default.gif';
        const displayName = ex.name_ar || ex.name || 'تمرين';
        const muscle = ex.target_muscle || '';
        return `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm workout-card">
            <div class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 flex-shrink-0">
                <img src="${gifPath}" alt="${displayName}" class="w-full h-full object-cover" onerror="this.src='/assets/gifs/default.gif'">
            </div>
            <div class="flex-1 min-w-0">
                <h4 class="text-xs font-bold text-slate-200 truncate">${displayName}</h4>
                <p class="text-[10px] text-slate-400 mt-0.5 truncate">${muscle} ${ex.category ? '· ' + ex.category : ''}</p>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
                <button onclick="toggleFavorite('${ex.id}')" class="text-${isFav ? 'yellow-400' : 'slate-500'} hover:text-yellow-400 transition text-sm">
                    <i class="fa-solid fa-star"></i>
                </button>
                <button onclick="openExerciseModal('${ex.id}', '${displayName}', '${muscle}', 5)" class="bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-xl text-[10px] font-semibold transition">
                    تسجيل
                </button>
            </div>
        </div>
    `}).join('');
}

// ---- 7. نافذة تسجيل التمرين (معدلة لحساب السعرات) ----
function openExerciseModal(id, name, muscle, met) {
    currentExercise = { id, name, muscle, met };
    document.getElementById('exercise-name').value = name;
    document.getElementById('exercise-modal').classList.remove('hidden');
}

// ---- 8. المدرب الذكي والمحادثة (بدون مفتاح مكشوف) ----
function buildSystemPrompt() {
    const u = getUserData();
    const targets = calculateNutritionTargets();
    return `أنت المدرب الرياضي الخبير لـ NGym. تتحدث بلغة عربية تحفيزية.
بيانات المستخدم:
• الوزن: ${u.weight} كجم | الهدف: ${u.targetWeight} كجم
• السعرات المستهدفة: ${targets.calories} Kcal | بروتين: ${targets.protein}g.
أجب باختصار وتركيز بدون مقدمات.`;
}

function saveChatMessage(sender, text) {
    let history = JSON.parse(localStorage.getItem('chatHistory')) || [];
    history.push({ sender, text });
    if (history.length > 50) history = history.slice(-50);
    localStorage.setItem('chatHistory', JSON.stringify(history));
}

function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory')) || [];
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';
    if (history.length === 0) {
        renderChatMessage('assistant', 'مرحباً بك في NGym! 🎯 أنا مدربك الذكي. كيف يمكنني مساعدتك اليوم؟');
    } else {
        history.forEach(msg => renderChatMessage(msg.sender, msg.text));
    }
}

function renderChatMessage(sender, text) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const id = 'msg-' + Date.now();
    const isUser = sender === 'user';
    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="flex ${isUser ? 'justify-end' : 'justify-start'} mb-2 chat-message">
            <div class="${isUser ? 'bg-emerald-600 text-slate-950 font-medium' : 'bg-slate-800 text-slate-100'} px-3.5 py-2 rounded-2xl max-w-[85%] text-xs leading-relaxed shadow-sm">
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

function generateLocalAIResponse(prompt) {
    const u = getUserData();
    const targets = calculateNutritionTargets();
    const p = prompt.toLowerCase();

    const workout = exerciseDatabase.find(ex => {
        const name = (ex.name_ar || ex.name || '').toLowerCase();
        const muscle = (ex.target_muscle || '').toLowerCase();
        return p.includes(name) || p.includes(muscle);
    });

    if (workout && workout.gif_url) {
        return `🔍 تمرين ${workout.name_ar || workout.name}: ${workout.target_muscle || ''}\n\n<img src="${workout.gif_url}" class="max-w-full rounded-lg mt-2 border border-slate-700" onerror="this.style.display='none'"/>`;
    }

    if (p.includes('وجبة') || p.includes('أكل') || p.includes('غداء') || p.includes('عشاء')) {
        return `بناءً على هدفك، أنصحك بوجبة غنية بالبروتين تحتوي على ${Math.round(targets.protein / 3)}g بروتين (مثل 200g صدور دجاج متبلة + 150g أرز مسلوق). 🍗`;
    }
    if (p.includes('بروتين') || p.includes('احتياج')) {
        return `احتياجك اليومي الموصى به هو ${targets.protein} جرام بروتين لضمان الاستشفاء العضلي. 💪`;
    }
    if (p.includes('تمرين') || p.includes('جدول') || p.includes('عضل')) {
        return `اليوم فرصة ممتازة للتركيز على التمارين المركبة! استخدم تبويب "التمارين" وسجل 3 جولات ضغط وعقلة لرفع الـ XP الخاص بك اليوم. 🏋️‍♂️`;
    }
    return `أهلاً بك يا بطل! أنا معك للمتابعة الوصول لوزن ${u.targetWeight} كجم. هل سجلت تمارينك أو وجباتك اليوم؟ ✨`;
}

async function callGeminiAIThroughServer(prompt, base64Img = null) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemPrompt: buildSystemPrompt(),
                userPlan: {
                    user: getUserData(),
                    targets: calculateNutritionTargets()
                },
                history: JSON.parse(localStorage.getItem('chatHistory') || '[]'),
                userMessage: prompt,
                imageBase64: base64Img || null
            })
        });

        if (!response.ok) throw new Error('فشل الاتصال بالخادم');
        const data = await response.json();
        return data.reply || generateLocalAIResponse(prompt);
    } catch (error) {
        console.error('خطأ في استدعاء الخادم:', error);
        return generateLocalAIResponse(prompt);
    }
}

// ---- 9. نظام قائمة انتظار الرسائل (Offline) ----
function addToPendingQueue(messageText, imageBase64 = null) {
    const pending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
    pending.push({
        id: 'pending-' + Date.now(),
        text: messageText,
        image: imageBase64,
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('pendingMessages', JSON.stringify(pending));
    renderPendingStatus();
}

function getPendingMessages() {
    return JSON.parse(localStorage.getItem('pendingMessages') || '[]');
}

function removeFromPendingQueue(pendingId) {
    let pending = JSON.parse(localStorage.getItem('pendingMessages') || '[]');
    pending = pending.filter(msg => msg.id !== pendingId);
    localStorage.setItem('pendingMessages', JSON.stringify(pending));
    renderPendingStatus();
}

function renderPendingStatus() {
    const pending = getPendingMessages();
    const statusEl = document.getElementById('pending-status');
    if (!statusEl) return;

    if (pending.length === 0) {
        statusEl.innerHTML = '';
        return;
    }

    statusEl.innerHTML = `
        <div class="bg-amber-950/30 border border-amber-700/50 rounded-xl p-2 text-xs text-amber-400 flex items-center gap-2">
            <i class="fa-solid fa-spinner fa-spin"></i>
            ${pending.length} رسالة(رسائل) في انتظار الاتصال بالإنترنت...
        </div>
    `;
}

function updatePendingMessageStatus(pendingId, status) {
    const msgEl = document.getElementById(`msg-${pendingId}`);
    if (msgEl) {
        const badge = msgEl.querySelector('.pending-badge');
        if (badge) {
            if (status === 'sent') {
                badge.textContent = '✅ تم الإرسال';
                badge.className = 'pending-badge text-emerald-400 text-[10px] mr-2';
                setTimeout(() => badge.remove(), 3000);
            }
        }
    }
}

async function sendSingleMessage(text, image, pendingId) {
    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemPrompt: buildSystemPrompt(),
                userPlan: {
                    user: getUserData(),
                    targets: calculateNutritionTargets()
                },
                history: JSON.parse(localStorage.getItem('chatHistory') || '[]'),
                userMessage: text,
                imageBase64: image || null
            })
        });

        if (!response.ok) throw new Error('Network error');

        const data = await response.json();
        const reply = data.reply || generateLocalAIResponse(text);

        renderChatMessage('assistant', reply);
        saveChatMessage('assistant', reply);
        removeFromPendingQueue(pendingId);
        updatePendingMessageStatus(pendingId, 'sent');
        addXP(10);
        updateDashboardUI();

    } catch (error) {
        console.error('فشل إرسال الرسالة المعلقة:', error);
    }
}

async function retryPendingMessages() {
    const pending = getPendingMessages();
    if (pending.length === 0) return;
    for (const msg of pending) {
        await sendSingleMessage(msg.text, msg.image, msg.id);
    }
}

// ---- 10. دالة إرسال الرسالة الرئيسية (مع التحقق من الاشتراك) ----
async function handleSendMessage() {
    // التحقق من صلاحية الاشتراك
    const status = checkSubscriptionStatus();
    if (status === 'expired') {
        renderChatMessage('assistant', '⛔ انتهت فترة التجربة (30 يوماً). يرجى تجديد اشتراكك للاستمرار في استخدام المدرب الذكي. 🔑');
        document.getElementById('renew-btn')?.classList.remove('hidden');
        return;
    }
    if (status === 'no_subscription') {
        renderChatMessage('assistant', '🔑 يرجى تفعيل اشتراكك للاستفادة من المدرب الذكي.');
        document.getElementById('renew-btn')?.classList.remove('hidden');
        return;
    }

    const inputEl = document.getElementById('chat-input');
    const messageText = inputEl.value.trim();
    if (!messageText && !selectedBase64Image) return;

    const textToSend = messageText || "قم بتحليل الوجبة في هذه الصورة وحساب سعراتها والبروتين بها:";
    const imageToSend = selectedBase64Image;

    const userMsgId = renderChatMessage('user', textToSend);
    saveChatMessage('user', textToSend);
    inputEl.value = '';
    clearChatImage();

    if (!navigator.onLine) {
        const pendingId = 'pending-' + Date.now();
        addToPendingQueue(textToSend, imageToSend);

        const userEl = document.getElementById(userMsgId);
        if (userEl) {
            const badge = document.createElement('span');
            badge.className = 'pending-badge text-amber-400 text-[10px] mr-2';
            badge.textContent = '⏳ في الانتظار...';
            userEl.querySelector('div')?.appendChild(badge);
        }

        const loadingId = renderChatMessage('assistant', '⏳ لا يوجد اتصال بالإنترنت. سيتم إرسال رسالتك تلقائياً عند استعادة الاتصال.');
        saveChatMessage('assistant', '⏳ سيتم إرسال رسالتك تلقائياً عند استعادة الاتصال.');
        setTimeout(() => {
            const el = document.getElementById(loadingId);
            if (el) el.remove();
        }, 5000);
        return;
    }

    const loadingId = renderChatMessage('assistant', 'جاري التفكير...');

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemPrompt: buildSystemPrompt(),
                userPlan: {
                    user: getUserData(),
                    targets: calculateNutritionTargets()
                },
                history: JSON.parse(localStorage.getItem('chatHistory') || '[]'),
                userMessage: textToSend,
                imageBase64: imageToSend || null
            })
        });

        if (!response.ok) throw new Error('API Error');

        const data = await response.json();
        const aiResponse = data.reply || generateLocalAIResponse(textToSend);

        updateChatMessage(loadingId, aiResponse);
        saveChatMessage('assistant', aiResponse);
        addXP(10);
        updateDashboardUI();

    } catch (error) {
        console.error('فشل الإرسال:', error);
        const pendingId = 'pending-' + Date.now();
        addToPendingQueue(textToSend, imageToSend);
        updateChatMessage(loadingId, '⚠️ حدث عطل مؤقت، سيتم إعادة المحاولة تلقائياً.');
        saveChatMessage('assistant', '⚠️ سيتم إعادة محاولة الإرسال.');
    }
}

// ---- 11. الصوت والصورة ----
function handleImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (evt) {
            selectedBase64Image = evt.target.result;
            document.getElementById('image-preview').src = selectedBase64Image;
            document.getElementById('image-preview-container').classList.remove('hidden');
        };
        reader.readAsDataURL(file);
    }
}

function clearChatImage() {
    selectedBase64Image = null;
    document.getElementById('image-preview-container').classList.add('hidden');
}

function toggleVoiceRecognition() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('المتصفح لا يدعم التسجيل الصوتي المباشر');
        return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    const micBtn = document.getElementById('mic-btn');
    micBtn.classList.add('text-red-500', 'animate-pulse');

    recognition.onresult = function (event) {
        document.getElementById('chat-input').value = event.results[0][0].transcript;
        micBtn.classList.remove('text-red-500', 'animate-pulse');
    };
    recognition.onerror = function () {
        micBtn.classList.remove('text-red-500', 'animate-pulse');
    };
    recognition.onend = function () {
        micBtn.classList.remove('text-red-500', 'animate-pulse');
    };
    recognition.start();
}

// ---- 12. نظام التنبيهات (مع توحيد حالة الأحرف) ----
function loadReminderSettings() {
    const settings = JSON.parse(localStorage.getItem('reminderSettings') || '{}');
    if (settings.days) {
        document.querySelectorAll('.day-btn').forEach(btn => {
            const day = btn.textContent.trim();
            const dayMap = { 'أحد': 'sunday', 'إثنين': 'monday', 'ثلاثاء': 'tuesday', 'أربعاء': 'wednesday', 'خميس': 'thursday', 'جمعة': 'friday', 'سبت': 'saturday' };
            const key = dayMap[day];
            if (settings.days.includes(key)) {
                btn.classList.add('bg-emerald-600/30', 'text-emerald-400', 'border-emerald-500');
                btn.classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700');
            }
        });
    }
    if (settings.time) {
        document.getElementById('workout-time').value = settings.time;
    }
    if (settings.reminderMinutes) {
        document.getElementById('reminder-minutes').value = settings.reminderMinutes;
    }
    updateReminderStatus(settings);
}

function toggleDay(day) {
    const btn = document.querySelector(`.day-btn[onclick="toggleDay('${day}')"]`);
    if (!btn) return;
    if (btn.classList.contains('bg-emerald-600/30')) {
        btn.classList.remove('bg-emerald-600/30', 'text-emerald-400', 'border-emerald-500');
        btn.classList.add('bg-slate-800', 'text-slate-400', 'border-slate-700');
    } else {
        btn.classList.add('bg-emerald-600/30', 'text-emerald-400', 'border-emerald-500');
        btn.classList.remove('bg-slate-800', 'text-slate-400', 'border-slate-700');
    }
}

function saveReminderSettings() {
    const selectedDays = [];
    document.querySelectorAll('.day-btn.bg-emerald-600\\/30').forEach(btn => {
        const day = btn.textContent.trim();
        const dayMap = { 'أحد': 'sunday', 'إثنين': 'monday', 'ثلاثاء': 'tuesday', 'أربعاء': 'wednesday', 'خميس': 'thursday', 'جمعة': 'friday', 'سبت': 'saturday' };
        selectedDays.push(dayMap[day]);
    });

    const time = document.getElementById('workout-time').value;
    const reminderMinutes = parseInt(document.getElementById('reminder-minutes').value) || 15;

    if (selectedDays.length === 0) {
        alert('الرجاء اختيار يوم واحد على الأقل للتمرين');
        return;
    }

    const settings = {
        days: selectedDays,
        time: time,
        reminderMinutes: reminderMinutes,
        enabled: true,
        lastNotificationDate: localStorage.getItem('lastNotificationDate') || ''
    };

    localStorage.setItem('reminderSettings', JSON.stringify(settings));
    updateReminderStatus(settings);
    startReminderChecker();
    alert('✅ تم حفظ التنبيهات بنجاح!');
}

function updateReminderStatus(settings) {
    const statusEl = document.getElementById('reminder-status');
    if (!statusEl) return;
    if (settings && settings.enabled && settings.days && settings.days.length > 0) {
        const daysArabic = settings.days.map(d => {
            const map = { 'sunday': 'الأحد', 'monday': 'الإثنين', 'tuesday': 'الثلاثاء', 'wednesday': 'الأربعاء', 'thursday': 'الخميس', 'friday': 'الجمعة', 'saturday': 'السبت' };
            return map[d] || d;
        }).join('، ');
        statusEl.innerHTML = `
            <i class="fa-solid fa-check-circle text-emerald-400"></i> 
            مفعلة: أيام (${daysArabic}) الساعة ${settings.time} (تنبيه قبل ${settings.reminderMinutes} دقيقة)
        `;
        statusEl.className = 'text-center text-xs bg-emerald-950/30 text-emerald-400 border border-emerald-800/30 p-2 rounded-xl';
    } else {
        statusEl.innerHTML = `
            <i class="fa-solid fa-bell-slash text-slate-500"></i> 
            التنبيهات غير مفعلة
        `;
        statusEl.className = 'text-center text-xs text-slate-400 bg-slate-800/50 p-2 rounded-xl border border-slate-700/50';
    }
}

function startReminderChecker() {
    if (reminderInterval) {
        clearInterval(reminderInterval);
    }

    const settings = JSON.parse(localStorage.getItem('reminderSettings') || '{}');
    if (!settings.enabled || !settings.days || settings.days.length === 0) return;

    reminderInterval = setInterval(() => {
        checkReminder();
    }, 30000);

    checkReminder();
}

function checkReminder() {
    const settings = JSON.parse(localStorage.getItem('reminderSettings') || '{}');
    if (!settings.enabled || !settings.days || settings.days.length === 0) return;

    const now = new Date();
    const today = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const todayKey = today;

    if (!settings.days.includes(todayKey)) return;

    const [hour, minute] = settings.time.split(':').map(Number);
    const reminderMinutes = settings.reminderMinutes || 15;
    
    const targetTime = new Date();
    targetTime.setHours(hour, minute - reminderMinutes, 0, 0);
    
    const timeDiff = (now.getTime() - targetTime.getTime()) / 60000;

    if (timeDiff >= 0 && timeDiff < 0.5) {
        const lastDate = localStorage.getItem('lastNotificationDate');
        const todayDate = now.toDateString();
        if (lastDate !== todayDate) {
            sendWorkoutReminder(settings);
            localStorage.setItem('lastNotificationDate', todayDate);
        }
    }
}

function sendWorkoutReminder(settings) {
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification('⏰ NGym - وقت التمرين!', {
            body: `حان وقت التمرين! استعد للذهاب إلى النادي في ${settings.reminderMinutes} دقيقة. 💪`,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🏋️</text></svg>'
        });
        setTimeout(() => notification.close(), 10000);
    }

    const logContainer = document.getElementById('reminder-log');
    if (logContainer) {
        const timeStr = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
        logContainer.innerHTML = `
            <div class="text-emerald-400 border-b border-slate-800/50 py-1 animate-pulse">
                🔔 تم تذكيرك في الساعة ${timeStr} - ${settings.reminderMinutes} دقيقة متبقية
            </div>
        ` + logContainer.innerHTML;
        if (logContainer.children.length > 10) {
            logContainer.removeChild(logContainer.lastChild);
        }
    }

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        oscillator.frequency.value = 800;
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => {
            oscillator.stop();
            gainNode.gain.value = 0;
        }, 500);
    } catch (e) { /* تجاهل الأخطاء الصوتية */ }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('إذن الإشعارات:', permission);
        });
    }
}

// ---- 13. نظام الاشتراكات ----
function checkSubscriptionStatus() {
    const endDate = localStorage.getItem('subscriptionEndDate');
    if (!endDate) return 'no_subscription';
    const now = new Date();
    const end = new Date(endDate);
    return now > end ? 'expired' : 'active';
}

function getRemainingDays() {
    const endDate = localStorage.getItem('subscriptionEndDate');
    if (!endDate) return 0;
    const now = new Date();
    const end = new Date(endDate);
    const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

function updateSubscriptionUI() {
    const status = checkSubscriptionStatus();
    const daysLeft = getRemainingDays();
    const banner = document.getElementById('subscription-banner');
    const statusEl = document.getElementById('subscription-status');
    const renewBtn = document.getElementById('renew-btn');

    if (!banner || !statusEl) return;

    if (status === 'expired') {
        statusEl.textContent = '⛔ انتهت فترة التجربة. يرجى التجديد للاستمرار.';
        banner.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-3 text-center text-xs subscription-expired';
        if (renewBtn) renewBtn.classList.remove('hidden');
    } else if (status === 'active') {
        statusEl.textContent = `✅ اشتراك فعال - متبقي ${daysLeft} يوم`;
        banner.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-3 text-center text-xs subscription-badge';
        if (renewBtn) renewBtn.classList.add('hidden');
    } else {
        statusEl.textContent = '🔑 يرجى تفعيل اشتراكك للاستفادة من جميع الميزات';
        banner.className = 'bg-slate-800 border border-slate-700 rounded-2xl p-3 text-center text-xs';
        if (renewBtn) renewBtn.classList.remove('hidden');
    }
}

function renewSubscription(months) {
    const currentEnd = localStorage.getItem('subscriptionEndDate');
    const newEnd = currentEnd ? new Date(currentEnd) : new Date();
    newEnd.setMonth(newEnd.getMonth() + months);
    localStorage.setItem('subscriptionEndDate', newEnd.toISOString());
    localStorage.setItem('subscriptionStatus', 'active');
    updateSubscriptionUI();
    alert(`✅ تم التجديد بنجاح حتى ${newEnd.toLocaleDateString()}`);
}

// ---- 14. لوحة المشرف ----
function setupAdminPanel() {
    document.getElementById('app-logo')?.addEventListener('click', function() {
        logoClickCount++;
        clearTimeout(logoClickTimer);
        logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 3000);
        
        if (logoClickCount >= 5) {
            logoClickCount = 0;
            document.getElementById('admin-modal').classList.remove('hidden');
            document.getElementById('admin-password').value = '';
            document.getElementById('admin-panel-content').classList.add('hidden');
            document.getElementById('admin-login-section').classList.remove('hidden');
            document.getElementById('admin-password').focus();
        }
    });

    document.getElementById('admin-login-btn')?.addEventListener('click', function() {
        const password = document.getElementById('admin-password').value;
        const adminPassword = 'Newton123';
        
        if (password === adminPassword) {
            document.getElementById('admin-login-section').classList.add('hidden');
            document.getElementById('admin-panel-content').classList.remove('hidden');
            loadAdminCodes();
            loadAdminUsers();
        } else {
            alert('❌ كلمة المرور غير صحيحة');
        }
    });

    document.getElementById('generate-code-btn')?.addEventListener('click', function() {
        const duration = parseInt(document.getElementById('code-duration').value);
        const code = generateActivationCode();
        
        const codes = JSON.parse(localStorage.getItem('adminCodes') || '[]');
        codes.push({
            code: code,
            duration: duration,
            usedBy: null,
            usedAt: null,
            createdAt: new Date().toISOString(),
            active: true
        });
        localStorage.setItem('adminCodes', JSON.stringify(codes));
        alert(`✅ تم إنشاء الكود: ${code}`);
        loadAdminCodes();
    });
}

function generateActivationCode() {
    const prefix = 'NGYM';
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${random}`;
}

function loadAdminCodes() {
    const codes = JSON.parse(localStorage.getItem('adminCodes') || '[]');
    const container = document.getElementById('codes-list');
    if (codes.length === 0) {
        container.innerHTML = '<div class="text-slate-400">لا توجد أكواد</div>';
        return;
    }
    container.innerHTML = codes.map(c => {
        const used = c.usedBy ? 'مستخدم ✅' : 'فعال 🔓';
        const color = c.usedBy ? 'text-emerald-400' : 'text-amber-400';
        return `<div class="flex justify-between border-b border-slate-800 py-1">
            <span class="font-mono text-emerald-400">${c.code}</span>
            <span class="${color}">${used}</span>
            <span class="text-slate-400">${c.duration} شهر</span>
        </div>`;
    }).join('');
}

function loadAdminUsers() {
    const container = document.getElementById('users-list');
    const users = JSON.parse(localStorage.getItem('adminUsers') || '[]');
    if (users.length === 0) {
        container.innerHTML = '<div class="text-slate-400">لا يوجد مستخدمون</div>';
        return;
    }
    container.innerHTML = users.map(u => `
        <div class="flex justify-between border-b border-slate-800 py-1 text-xs">
            <span>${u.id?.slice(0, 12) || 'مستخدم'}...</span>
            <span class="text-emerald-400">${u.subscriptionEnd || 'غير مفعل'}</span>
        </div>
    `).join('');
}

// ---- 15. التنقل بين التبويبات والنوافذ ----
function switchTab(tabName) {
    ['dashboard', 'workouts', 'coach', 'reminders'].forEach(t => {
        document.getElementById(`sec-${t}`)?.classList.add('hidden');
        document.getElementById(`tab-${t}`)?.classList.remove('text-emerald-400', 'bg-slate-800', 'shadow');
    });
    document.getElementById(`sec-${tabName}`)?.classList.remove('hidden');
    document.getElementById(`tab-${tabName}`)?.classList.add('text-emerald-400', 'bg-slate-800', 'shadow');
    
    if (tabName === 'workouts') renderWorkoutsList();
    if (tabName === 'coach') loadChatHistory();
}

function openModal(id) {
    if (id === 'onboarding-modal') {
        const u = getUserData();
        document.getElementById('input-weight').value = u.weight;
        document.getElementById('input-target-weight').value = u.targetWeight;
        document.getElementById('input-height').value = u.height;
        document.getElementById('input-age').value = u.age;
        document.getElementById('select-goal').value = u.goal;
        document.getElementById('select-activity').value = u.activity;
        document.getElementById('input-api-key').value = u.apiKey;
    }
    document.getElementById(id)?.classList.remove('hidden');
}

function closeModal(id) {
    document.getElementById(id)?.classList.add('hidden');
}

// ---- 16. التهيئة والتشغيل ----
document.addEventListener('DOMContentLoaded', function () {
    checkDailyReset();
    updateDashboardUI();
    loadExerciseDatabase();
    loadChatHistory();
    loadReminderSettings();
    startReminderChecker();
    requestNotificationPermission();
    setupAdminPanel();

    if (!localStorage.getItem('hasOnboarded')) {
        openModal('onboarding-modal');
    }

    window.addEventListener('online', function() {
        console.log('🔄 استعادة الاتصال بالإنترنت...');
        const pending = getPendingMessages();
        if (pending.length > 0) {
            renderChatMessage('assistant', '🔁 استعادة الاتصال بالإنترنت، جاري إرسال الرسائل المعلقة...');
            retryPendingMessages();
        }
        const indicator = document.getElementById('offline-indicator');
        if (indicator) indicator.remove();
    });

    window.addEventListener('offline', function() {
        console.log('📴 فقدان الاتصال بالإنترنت');
        const container = document.getElementById('chat-messages');
        if (container) {
            const offlineMsg = document.createElement('div');
            offlineMsg.className = 'text-center text-xs text-amber-400 bg-amber-950/30 p-2 rounded-xl border border-amber-700/50 my-2';
            offlineMsg.id = 'offline-indicator';
            offlineMsg.innerHTML = '<i class="fa-solid fa-wifi-slash"></i> لا يوجد اتصال بالإنترنت. سيتم حفظ رسائلك وإرسالها تلقائياً عند عودة الاتصال.';
            container.prepend(offlineMsg);
        }
    });

    document.getElementById('onboarding-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!localStorage.getItem('subscriptionStartDate')) {
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 30);
            localStorage.setItem('subscriptionStartDate', startDate.toISOString());
            localStorage.setItem('subscriptionEndDate', endDate.toISOString());
            localStorage.setItem('subscriptionStatus', 'active');
        }
        saveUserData({
            weight: parseFloat(document.getElementById('input-weight').value),
            targetWeight: parseFloat(document.getElementById('input-target-weight').value),
            height: parseFloat(document.getElementById('input-height').value),
            age: parseInt(document.getElementById('input-age').value),
            goal: document.getElementById('select-goal').value,
            activity: parseFloat(document.getElementById('select-activity').value),
            apiKey: document.getElementById('input-api-key').value.trim()
        });
        closeModal('onboarding-modal');
        updateDashboardUI();
    });

    document.getElementById('quick-meal-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        logMeal(
            parseInt(document.getElementById('meal-calories').value) || 0,
            parseInt(document.getElementById('meal-protein').value) || 0,
            parseInt(document.getElementById('meal-carbs').value) || 0,
            parseInt(document.getElementById('meal-fats').value) || 0
        );
        closeModal('meal-modal');
    });

    document.getElementById('exercise-form')?.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!currentExercise) return;
        const duration = parseInt(document.getElementById('exercise-duration').value) || 10;
        const burned = logExerciseWithDetails(
            currentExercise.muscle,
            currentExercise.met,
            duration
        );
        closeModal('exercise-modal');
        alert(`✅ تم تسجيل ${currentExercise.name} لمدة ${duration} دقيقة، أحرقت ${burned} سعرة (+25 XP)`);
        currentExercise = null;
    });

    document.getElementById('save-reminder-btn')?.addEventListener('click', saveReminderSettings);

    document.getElementById('renew-btn')?.addEventListener('click', function() {
        const code = prompt('أدخل كود التفعيل:');
        if (code && code.startsWith('NGYM-')) {
            const codes = JSON.parse(localStorage.getItem('adminCodes') || '[]');
            const found = codes.find(c => c.code === code && !c.usedBy);
            if (found) {
                found.usedBy = 'user-' + Date.now();
                found.usedAt = new Date().toISOString();
                found.active = false;
                localStorage.setItem('adminCodes', JSON.stringify(codes));
                renewSubscription(found.duration);
            } else {
                alert('❌ كود غير صحيح أو مستخدم بالفعل');
            }
        } else {
            alert('❌ كود غير صحيح');
        }
    });

    document.getElementById('send-chat-btn')?.addEventListener('click', handleSendMessage);
    document.getElementById('chat-input')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleSendMessage();
    });
});
