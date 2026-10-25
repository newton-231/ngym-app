// ==================================================
// NGym - التطبيق الذكي بالكامل (JavaScript)
// الإصدار النهائي النظيف - نسخة واحدة لكل دالة
// ==================================================

const DEFAULT_USER_DATA = {
    weight: 70, targetWeight: 75, height: 175, age: 24,
    gender: 'male', activity: 1.375, goal: 'bulking', xp: 0, apiKey: ''
};

const FALLBACK_WORKOUTS = [
    { id: 'pushup', name: 'Push-Up', group: 'chest', place: 'home_no_equip', target: 'pectorals', equipment: 'body weight', primaryMuscles: ['pectorals'], secondaryMuscles: [], instructions: [] },
    { id: 'squat', name: 'Squat', group: 'legs_front', place: 'home_no_equip', target: 'quads', equipment: 'body weight', primaryMuscles: ['quads'], secondaryMuscles: [], instructions: [] },
    { id: 'plank', name: 'Plank', group: 'abs', place: 'home_no_equip', target: 'abs', equipment: 'body weight', primaryMuscles: ['abs'], secondaryMuscles: [], instructions: [] }
];

let exerciseDatabase = [];
let exerciseGifManifest = {};
let selectedBase64Image = null;
let currentFilter = 'all';
let workoutVisibleCount = 40;
let previousWorkoutSearch = '';
let currentTab = 'sec-dashboard';
let currentExercise = null;
let currentGifExercise = null;
let reminderInterval = null;
let fcmMessaging = null;
let fcmToken = null;
let fcmServiceWorkerRegistration = null;
let analyticsInstance = null;
let logoClickCount = 0;
let logoClickTimer = null;
let lastReminderCheckedMinute = '';
let reminderServiceWorkerRegistration = null;
let appStateInterval = null;
let splashAuthReady = false;
let splashUserReady = false;
let splashExercisesReady = false;
let splashHidden = false;
let deferredInstallPrompt = null;
const EXERCISE_IMAGE_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="320" height="240" viewBox="0 0 320 240"%3E%3Crect width="320" height="240" fill="%231e293b"/%3E%3Ctext x="160" y="125" text-anchor="middle" fill="%2394a3b8" font-size="20" font-family="Arial"%3ENo image%3C/text%3E%3C/svg%3E';

window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredInstallPrompt = event;
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    document.getElementById('install-app-btn')?.classList.add('hidden');
    showToast('تم تثبيت تطبيق NGym بنجاح.', 'success');
});

function showToast(message, type = 'info', duration = 3000, retryAction = null) {
    const container = document.getElementById('toast-container') || (() => {
        const element = document.createElement('div');
        element.id = 'toast-container';
        document.body.appendChild(element);
        return element;
    })();
    const toast = document.createElement('div');
    toast.className = `toast toast-${['success', 'error', 'warning', 'info'].includes(type) ? type : 'info'}`;
    const text = document.createElement('span');
    text.textContent = message;
    toast.appendChild(text);
    if (typeof retryAction === 'function') {
        const retryButton = document.createElement('button');
        retryButton.type = 'button';
        retryButton.className = 'toast-retry';
        retryButton.textContent = 'إعادة المحاولة';
        retryButton.addEventListener('click', () => {
            toast.remove();
            retryAction();
        });

                toast.appendChild(retryButton);
    }
    container.appendChild(toast);
    window.setTimeout(() => toast.remove(), duration);
}

function showError(error) {
    const message = error?.userMessage || error?.message || 'حدث خطأ غير متوقع. حاول مرة أخرى.';
    showToast(message, 'error', 5000, error?.retry);
}

try {
    if (window.firebase?.analytics) analyticsInstance = firebase.analytics();
} catch (error) {
    console.warn('تعذر تهيئة Firebase Analytics:', error);
}

function logEvent(name, params = {}) {
    try {
        if (analyticsInstance) firebase.analytics().logEvent(name, params);
    } catch (error) {
        console.warn(`تعذر تسجيل حدث Analytics: ${name}`, error);
    }
}

function hideSplash() {
    if (splashHidden) return;
    splashHidden = true;
    const splash = document.getElementById('splash-screen');
    if (!splash) return;
    splash.classList.add('fade-out');
    window.setTimeout(() => {
        splash.style.display = 'none';
    }, 350);
}

function tryHideSplash() {
    if (splashAuthReady && splashUserReady && splashExercisesReady) hideSplash();
}

async function loadUserDataFromFirestore() {
    try {
        if (dbInstance && typeof dbInstance.collection === 'function') {
            const snapshot = await dbInstance.collection('users').doc(getDeviceId()).get();
            if (snapshot.exists && snapshot.data()) {
                saveUserData(snapshot.data());
            }
        }
    } catch (error) {
        console.warn('تعذر تحميل بيانات المستخدم من Firestore:', error);
    } finally {
        splashUserReady = true;
        tryHideSplash();
    }
}

function initializeSplashReadiness() {
    const auth = window.firebase?.auth;
    if (typeof auth !== 'function') {
        splashAuthReady = true;
        loadUserDataFromFirestore();
        tryHideSplash();
        return;
    }
    try {
        auth().onAuthStateChanged((user) => {
            splashAuthReady = true;
            if (user) logEvent('sign_in', { method: 'firebase' });
            loadUserDataFromFirestore();
            tryHideSplash();
        }, (error) => {
            console.warn('تعذر التحقق من حالة المصادقة:', error);
            splashAuthReady = true;
            loadUserDataFromFirestore();
            tryHideSplash();
        });
    } catch (error) {
        console.warn('تعذر تهيئة المصادقة:', error);
        splashAuthReady = true;
        loadUserDataFromFirestore();
        tryHideSplash();
    }
}

function readJsonStorage(key, fallback) {
    try {
        const value = localStorage.getItem(key);
        return value ? JSON.parse(value) : fallback;
    } catch (error) {
        console.warn(`تعذر قراءة التخزين المحلي: ${key}`, error);
        return fallback;
    }
}

function writeStorage(key, val) {
    try {
        localStorage.setItem(key, JSON.stringify(val));
        return true;
    } catch (error) {
        console.warn(`تعذر تحديث التخزين المحلي: ${key}`, error);
        return false;
    }

}

function getAppState() {
    const chatHistory = readJsonStorage('chatHistory', []);
    return {
        currentTab,
        chatHistory: Array.isArray(chatHistory) ? chatHistory.slice(-20) : [],
        currentExerciseId: currentExercise?.id || currentGifExercise?.id || null,
        notificationSettings: readJsonStorage('ngym_reminders', {})
    };
}

function saveAppState() {
    writeStorage('ngym_app_state', getAppState());
}

function restoreAppState() {
    const state = readJsonStorage('ngym_app_state', {});
    if (!state || typeof state !== 'object') return;

    if (typeof state.currentTab === 'string' && document.getElementById(state.currentTab)) {
        currentTab = state.currentTab;
        switchTab(currentTab);
    }
    if (Array.isArray(state.chatHistory)) {
        writeStorage('chatHistory', state.chatHistory.slice(-20));
        loadChatHistory();
    }
    if (state.currentExerciseId) {
        const exercise = exerciseDatabase.find(item => item.id === state.currentExerciseId);
        if (exercise) openExerciseGifModal(exercise.id);
    }
    if (state.notificationSettings && typeof state.notificationSettings === 'object') {
        writeStorage('ngym_reminders', state.notificationSettings);
        loadReminderSettings();
    }
}

function clearLocalData() {
    if (!window.confirm('هل أنت متأكد من حذف جميع البيانات المحلية؟ لا يمكن التراجع عن هذا الإجراء.')) return;
    try {
        localStorage.clear();
        sessionStorage.removeItem('adminToken');
        currentTab = 'sec-dashboard';
        currentExercise = null;
        currentGifExercise = null;
        closeExerciseGifModal();
        switchTab(currentTab);
        alert('تم مسح البيانات المحلية بنجاح.');
        window.location.reload();
    } catch (error) {
        console.error('تعذر مسح البيانات المحلية:', error);
        alert('تعذر مسح البيانات المحلية.');
    }

}

function readStorageValue(key, fallback = null) {
    try {
        return localStorage.getItem(key) ?? fallback;
    } catch (error) {
        console.warn(`تعذر قراءة التخزين المحلي: ${key}`, error);
        return fallback;
    }
}

const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.ngym.app';
const SUPPORT_WHATSAPP_NUMBER = '972569699311';

function formatLastVisit(timestamp) {
    const elapsedHours = Math.max(0, Math.floor((Date.now() - timestamp) / 3600000));
    if (elapsedHours < 1) return 'آخر زيارة: منذ أقل من ساعة';
    if (elapsedHours === 1) return 'آخر زيارة: منذ ساعة';
    return `آخر زيارة: منذ ${elapsedHours} ساعات`;
}

function renderLastVisit() {
    const previousVisit = Number(readStorageValue('ngym_last_visit', 0));
    const element = document.getElementById('last-visit');
    if (element) {
        element.textContent = previousVisit > 0
            ? formatLastVisit(previousVisit)
            : 'آخر زيارة: هذه هي الزيارة الأولى';
    }
}

async function shareApp() {
    const shareData = {
        title: 'NGym - تطبيق اللياقة الذكي',
        text: 'جرّب تطبيق NGym للتدريب والتغذية ومتابعة التقدم.',
        url: window.location.origin + '/'
    };
    try {
        if (navigator.share) {
            await navigator.share(shareData);
            return;
        }
        await navigator.clipboard.writeText(shareData.url);
        showToast('تم نسخ رابط التطبيق.', 'success');
    } catch (error) {
        if (error.name !== 'AbortError') showError({ message: 'تعذر مشاركة رابط التطبيق.' });
    }
}

function rateApp() {
    window.open(GOOGLE_PLAY_URL, '_blank', 'noopener,noreferrer');
}

function openSupportWhatsApp() {
    const message = encodeURIComponent('مرحباً، أحتاج إلى مساعدة في تطبيق NGym.');
    window.open(`https://wa.me/${SUPPORT_WHATSAPP_NUMBER}?text=${message}`, '_blank', 'noopener,noreferrer');
}

function getDeviceId() {
    let deviceId = localStorage.getItem('ngym_device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('ngym_device_id', deviceId);
    }
    return deviceId;
}

// ---- db Instance ----
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

// ---- User Data ----
function getUserData() {
    const stored = readJsonStorage('userData', {});
    return {
        weight: parseFloat(stored.weight ?? readStorageValue('userWeight')) || DEFAULT_USER_DATA.weight,
        targetWeight: parseFloat(stored.targetWeight ?? readStorageValue('userTargetWeight')) || DEFAULT_USER_DATA.targetWeight,
        height: parseFloat(stored.height ?? readStorageValue('userHeight')) || DEFAULT_USER_DATA.height,
        age: parseInt(stored.age ?? readStorageValue('userAge')) || DEFAULT_USER_DATA.age,
        gender: stored.gender || readStorageValue('userGender') || DEFAULT_USER_DATA.gender,
        activity: parseFloat(stored.activity ?? readStorageValue('userActivity')) || DEFAULT_USER_DATA.activity,
        goal: stored.goal || readStorageValue('userGoal') || DEFAULT_USER_DATA.goal,
        xp: parseInt(stored.xp ?? readStorageValue('userXP')) || DEFAULT_USER_DATA.xp,
        apiKey: stored.apiKey ?? readStorageValue('geminiApiKey', '') ?? ''
    };
}

function saveUserData(data) {
    try {
        const safeNumber = (value) => { const num = parseFloat(value); return isNaN(num) ? null : num; };
        const weight = safeNumber(data.weight); if (weight !== null) localStorage.setItem('userWeight', weight);
        const targetWeight = safeNumber(data.targetWeight); if (targetWeight !== null) localStorage.setItem('userTargetWeight', targetWeight);
        const height = safeNumber(data.height); if (height !== null) localStorage.setItem('userHeight', height);
        const age = safeNumber(data.age); if (age !== null) localStorage.setItem('userAge', age);
        if (data.gender) localStorage.setItem('userGender', data.gender);
        if (data.activity) localStorage.setItem('userActivity', data.activity);
        if (data.goal) localStorage.setItem('userGoal', data.goal);
        if (data.apiKey !== undefined) localStorage.setItem('geminiApiKey', data.apiKey);
        localStorage.setItem('hasOnboarded', 'true');
        writeStorage('userData', { ...getUserData(), ...data });
        updateDashboardUI();
        const uid = localStorage.getItem('ngym_user_id')
            || window.NGYM_MODULAR_AUTH?.auth?.currentUser?.uid;
        if (uid && typeof window.firebase?.firestore === 'function' && dbInstance?.collection) {
            const userData = getUserData();
            dbInstance.collection('users').doc(uid).set({
                weight: userData.weight,
                targetWeight: userData.targetWeight,
                height: userData.height,
                age: userData.age,
                gender: userData.gender,
                activity: userData.activity,
                goal: userData.goal,
                hasOnboarded: true,
                updatedAt: new Date().toISOString()
            }, { merge: true }).catch(error => {
                console.warn('تعذر حفظ بيانات المستخدم في Firestore:', error);
            });
        }
    } catch (e) { console.warn("Storage restricted", e); }
}

function checkDailyReset() {
    try {
        const today = new Date().toLocaleDateString('sv');
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

// ---- Image Compression ----
function compressImage(file, maxWidth = 800, maxHeight = 800, quality = 0.7) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            const img = new Image();
            img.onload = function () {
                const canvas = document.createElement('canvas');
                let width = img.width, height = img.height;
                if (width > maxWidth) { height = (height * maxWidth) / width; width = maxWidth; }
                if (height > maxHeight) { width = (width * maxHeight) / height; height = maxHeight; }
                canvas.width = width; canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// ---- Modals ----
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (modalId === 'onboarding-modal' || modalId === 'settings-modal') {
        const u = getUserData();
        const fieldMap = {
            'input-weight': u.weight, 'input-target-weight': u.targetWeight,
            'input-height': u.height, 'input-age': u.age,
            'input-gender': u.gender,
            'select-activity': u.activity, 'select-goal': u.goal,
            'input-api-key': u.apiKey
        };
        for (let id in fieldMap) {
            const el = document.getElementById(id);
            if (el) el.value = fieldMap[id];
        }
        if (modalId === 'settings-modal') renderLastVisit();
        if (u.gender) selectGender(u.gender);
    }
    modal.classList.remove('hidden');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('hidden');
}

function getInstallPlatform() {
    const userAgent = navigator.userAgent || '';
    if (/iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
        return 'ios';
    }
    return /Android/i.test(userAgent) ? 'android' : 'other';
}

function showInstallInstructions(platform = getInstallPlatform()) {
    document.querySelectorAll('[data-install-platform]').forEach(section => {
        section.hidden = section.dataset.installPlatform !== platform;
    });
    openModal('install-instructions-modal');
}

async function handleInstallApp() {
    if (!deferredInstallPrompt) {
        showInstallInstructions();
        return;
    }

    const installPrompt = deferredInstallPrompt;
    deferredInstallPrompt = null;
    try {
        await installPrompt.prompt();
        const choice = await installPrompt.userChoice;
        if (choice?.outcome === 'accepted') {
            showToast('جارٍ تثبيت تطبيق NGym...', 'success');
        }
    } catch (error) {
        console.error('تعذر فتح نافذة تثبيت التطبيق:', error);
        showInstallInstructions('android');
    }
}

function selectGender(gender) {
    const input = document.getElementById('input-gender');
    if (input) input.value = gender;
    document.querySelectorAll('.gender-btn').forEach(button => {
        button.classList.remove('border-emerald-500', 'text-emerald-400');
        button.classList.add('border-slate-700', 'text-slate-300');
    });
    const selectedButton = document.getElementById('gender-' + gender);
    if (selectedButton) {
        selectedButton.classList.remove('border-slate-700', 'text-slate-300');
        selectedButton.classList.add('border-emerald-500', 'text-emerald-400');
    }
}

function switchTab(tabId) {
    try {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.add('hidden-tab'));
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
        currentTab = tabId;
        saveAppState();
    } catch (e) { console.error("Error switching tab:", e); }
}

// ---- Nutrition Calculator ----
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

function getCoachContext() {
    const user = getUserData();
    const targets = calculateNutritionTargets();
    const bmr = Math.round((10 * user.weight) + (6.25 * user.height) - (5 * user.age) + (user.gender === 'male' ? 5 : -161));
    const tdee = Math.round(bmr * user.activity);
    let targetedMuscles = [];
    try {
        targetedMuscles = JSON.parse(localStorage.getItem('todayTargetedMuscles') || '[]');
        if (!Array.isArray(targetedMuscles)) targetedMuscles = [];
    } catch (error) {
        console.warn('تعذر قراءة عضلات اليوم:', error);
    }
    const daily = {
        caloriesEaten: parseInt(localStorage.getItem('todayEatenCalories')) || 0,
        proteinEaten: parseInt(localStorage.getItem('todayEatenProtein')) || 0,
        carbsEaten: parseInt(localStorage.getItem('todayEatenCarbs')) || 0,
        fatsEaten: parseInt(localStorage.getItem('todayEatenFats')) || 0,
        caloriesBurned: parseInt(localStorage.getItem('todayBurnedCalories')) || 0,
        targetedMuscles
    };
    return {
        profile: {
            weight: user.weight, targetWeight: user.targetWeight, height: user.height,
            age: user.age, gender: user.gender, activityMultiplier: user.activity,
            goal: user.goal, bmr, tdee
        },
        targets,
        daily
    };
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
    const netTarget = targets.calories;
    const remaining = Math.max(0, netTarget - eatenCal);

    const elements = {
        'target-calories': targets.calories, 'eaten-calories': eatenCal,
        'burned-calories': burnedCal, 'remaining-calories': remaining,
        'target-protein': `${eatenPro}/${targets.protein}g`,
        'target-carbs': `${eatenCarb}/${targets.carbs}g`,
        'target-fats': `${eatenFat}/${targets.fats}g`
    };
    for (let id in elements) { const el = document.getElementById(id); if (el) el.textContent = elements[id]; }

    const bars = {
        'protein-bar': (eatenPro / targets.protein) * 100,
        'carbs-bar': (eatenCarb / targets.carbs) * 100,
        'fats-bar': (eatenFat / targets.fats) * 100
    };
    for (let id in bars) { const el = document.getElementById(id); if (el) el.style.width = `${Math.min(100, bars[id] || 0)}%`; }

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
    if (rankEl) { rankEl.textContent = rank.title; rankEl.className = `font-bold text-sm ${rank.color}`; }
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

// ---- Workouts ----

function getExerciseGifUrl(ex) {
    if (!ex) return EXERCISE_IMAGE_PLACEHOLDER;
    const gifPath = ex.id ? exerciseGifManifest[ex.id] : '';
    return gifPath ? `/assets/gifs/${gifPath}` : EXERCISE_IMAGE_PLACEHOLDER;
}

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[char]));
}

function getExerciseArabicName(ex) {
    return ex.name_ar || ex.arabic_name || '';
}

function getExerciseEnglishName(ex) {
    return ex.name_en || ex.name || ex.id || '';
}

function handleGifError(imgElement) {
    imgElement.onerror = null;
    imgElement.src = EXERCISE_IMAGE_PLACEHOLDER;
}

function openExerciseGifModal(exerciseId) {
    const exercise = exerciseDatabase.find(item => item.id === exerciseId);
    if (!exercise) return;
    logEvent('exercise_viewed', { exercise_id: String(exercise.id), source: 'image_modal' });
    currentGifExercise = exercise;

    const modal = document.getElementById('exercise-gif-modal');
    const image = document.getElementById('exercise-gif-modal-image');
    const arabicName = document.getElementById('exercise-gif-modal-arabic-name');
    const englishName = document.getElementById('exercise-gif-modal-english-name');
    if (!modal || !image || !arabicName || !englishName) return;

    image.onerror = () => handleGifError(image);
    image.src = getExerciseGifUrl(currentGifExercise);
    const arabicExerciseName = getExerciseArabicName(exercise);
    const englishExerciseName = getExerciseEnglishName(exercise);
    image.alt = arabicExerciseName || englishExerciseName;
    arabicName.textContent = arabicExerciseName || englishExerciseName;
    englishName.textContent = arabicExerciseName && englishExerciseName !== arabicExerciseName ? englishExerciseName : '';
    englishName.hidden = !englishName.textContent;
    modal.classList.remove('hidden');
}

function closeExerciseGifModal() {
    const modal = document.getElementById('exercise-gif-modal');
    const image = document.getElementById('exercise-gif-modal-image');
    if (modal) modal.classList.add('hidden');
    if (image) image.removeAttribute('src');
    currentGifExercise = null;
}

function filterWorkouts(filter) {
    currentFilter = filter;
    workoutVisibleCount = 40;
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
    let catalogLoaded = false;
    try {
        const response = await fetch('/data/exercises.json');
        if (!response.ok) throw new Error('فشل تحميل التمارين');
        const exercises = await response.json();
        if (!Array.isArray(exercises)) throw new Error('صيغة بيانات التمارين غير صالحة');
        exerciseDatabase = exercises;
        catalogLoaded = true;
    } catch (error) {
        exerciseDatabase = FALLBACK_WORKOUTS;
        showToast('تعذر تحميل بيانات التمارين، تم تشغيل الوضع البديل.', 'warning');
    }

    if (catalogLoaded) {
        const validExerciseIds = new Set(exerciseDatabase.map(exercise => exercise.id));
        const favorites = readJsonStorage('favorites', []);
        const validFavorites = Array.isArray(favorites)
            ? favorites.filter(id => validExerciseIds.has(id))
            : [];
        if (!Array.isArray(favorites) || validFavorites.length !== favorites.length) {
            writeStorage('favorites', validFavorites);
        }
    }

    try {
        const response = await fetch('/assets/gifs/manifest.json');
        if (!response.ok) throw new Error('فشل تحميل فهرس صور التمارين');
        exerciseGifManifest = await response.json();
    } catch (error) {
        console.error('تعذر تحميل فهرس صور التمارين:', error);
        showToast('تعذر تحميل صور التمارين، سيتم استخدام الوضع البديل.', 'warning');
        exerciseGifManifest = {};
    }

    renderWorkoutsList();
    splashExercisesReady = true;
    tryHideSplash();
}

function renderWorkoutsList() {
    const container = document.getElementById('workouts-list');
    if (!container) return;

    const searchTerm = (document.getElementById('workout-search')?.value || '').trim().toLocaleLowerCase();
    if (searchTerm !== previousWorkoutSearch) {
        previousWorkoutSearch = searchTerm;
        workoutVisibleCount = 40;
    }

    let filtered = exerciseDatabase;
    if (searchTerm) {
        filtered = filtered.filter(exercise => [
            exercise.id,
            exercise.name,
            exercise.target,
            exercise.equipment,
            getMuscleArabic(exercise.target),
            getEquipmentArabic(exercise.equipment)
        ].some(value => String(value || '').toLocaleLowerCase().includes(searchTerm)));
    }

    if (currentFilter === 'favorites') {
        const storedFavorites = readJsonStorage('favorites', []);
        const favs = Array.isArray(storedFavorites) ? storedFavorites : [];
        filtered = filtered.filter(exercise => favs.includes(exercise.id));
    } else if (['home_no_equip', 'home_dumbbell', 'gym'].includes(currentFilter)) {
        filtered = filtered.filter(exercise => exercise.place === currentFilter);
    } else if (['chest', 'back', 'shoulders', 'arms', 'abs', 'legs_front', 'legs_back', 'legs_calves', 'cardio'].includes(currentFilter)) {
        filtered = filtered.filter(exercise => exercise.group === currentFilter);
    }

    if (filtered.length === 0) {
        container.innerHTML = '<div class="text-center text-slate-400 text-xs py-8">لا توجد تمارين مطابقة</div>';
        return;
    }

    const visibleExercises = filtered.slice(0, workoutVisibleCount);
    const storedFavorites = readJsonStorage('favorites', []);
    const favs = Array.isArray(storedFavorites) ? storedFavorites : [];
    const exerciseCards = visibleExercises.map(exercise => {
        const isFav = favs.includes(exercise.id);
        const arabicName = getExerciseArabicName(exercise);
        const englishName = getExerciseEnglishName(exercise);
        const displayName = arabicName || englishName;
        const muscles = exercise.target || (exercise.primaryMuscles || []).join(', ');
        const musclesLabel = exercise.target
            ? getMuscleArabic(exercise.target)
            : (exercise.primaryMuscles || []).map(getMuscleArabic).join(', ');
        const imgUrl = getExerciseGifUrl(exercise);
        const equipmentAr = getEquipmentArabic(exercise.equipment);
        const subtitle = arabicName && englishName !== arabicName
            ? `<p class="text-[10px] text-slate-400 mt-0.5 truncate">${escapeHtml(englishName)}</p>`
            : '';
        const badgesHtml = `
            <div class="exercise-badges">
                ${equipmentAr ? `<span class="badge badge-equipment">${equipmentAr}</span>` : ''}
            </div>
        `;
        return `
        <div class="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-sm">
            <button type="button" onclick="openExerciseGifModal('${escapeHtml(exercise.id)}')" aria-label="تكبير صورة ${escapeHtml(displayName)}" class="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center overflow-hidden border border-slate-700 flex-shrink-0 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <img src="${imgUrl}" alt="${escapeHtml(displayName)}" class="w-full h-full object-cover" loading="lazy" decoding="async" onerror="handleGifError(this)">
            </button>
            <div class="flex-1 min-w-0">
                <h4 dir="rtl" class="text-sm font-bold text-slate-200 truncate">${escapeHtml(displayName)}</h4>
                ${subtitle}
                <p class="text-[10px] text-slate-400 mt-0.5 truncate">${escapeHtml(musclesLabel)}</p>
                ${badgesHtml}
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
                <button onclick="toggleFavorite('${escapeHtml(exercise.id)}')" class="text-${isFav ? 'yellow-400' : 'slate-500'} text-sm p-1">
                    <i class="fa-solid fa-star"></i>
                </button>
                <button onclick="openExerciseModal('${escapeHtml(exercise.id)}', '${escapeHtml(displayName)}', '${escapeHtml(muscles)}', 5)" class="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-xl text-[10px] font-semibold">
                    تسجيل
                </button>
            </div>
        </div>
    `;
    }).join('');

    const showMoreButton = filtered.length > visibleExercises.length
        ? '<button type="button" onclick="showMoreWorkouts()" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl py-3 text-sm font-semibold">عرض المزيد</button>'
        : '';
    container.innerHTML = exerciseCards + showMoreButton;
}

function showMoreWorkouts() {
    workoutVisibleCount += 40;
    renderWorkoutsList();
}

function toggleFavorite(id) {
    let favs = readJsonStorage('favorites', []);
    if (!Array.isArray(favs)) favs = [];
    if (favs.includes(id)) favs = favs.filter(f => f !== id);
    else favs.push(id);
    writeStorage('favorites', favs);
    renderWorkoutsList();
}

function openExerciseModal(id, name, muscle, met) {
    const exercise = exerciseDatabase.find(item => item.id === id);
    currentExercise = { id, name, muscle, met, exercise };
    logEvent('exercise_viewed', { exercise_id: String(id), source: 'exercise_modal' });
    const input = document.getElementById('exercise-name');
    if (input) input.value = name;
    const musclesInfo = document.getElementById('exercise-muscles-info');
    if (musclesInfo) {
        const primaryAr = (exercise?.primaryMuscles || []).map(getMuscleArabic).join('، ');
        const secondaryAr = (exercise?.secondaryMuscles || []).map(getMuscleArabic).join('، ');
        musclesInfo.innerHTML = `
            <div class="muscles-info" style="margin: 12px 0; padding: 12px; background: rgba(16, 185, 129, 0.08); border-radius: 10px; border-right: 3px solid #10b981;">
                <div style="font-size: 12px; color: #94a3b8; margin-bottom: 4px;">🎯 العضلة الأساسية</div>
                <div style="font-size: 14px; color: #e2e8f0; font-weight: 600;">${escapeHtml(primaryAr || 'غير محدد')}</div>
                ${secondaryAr ? `
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 10px; margin-bottom: 4px;">💪 عضلات مساعدة</div>
                    <div style="font-size: 13px; color: #cbd5e1;">${escapeHtml(secondaryAr)}</div>
                ` : ''}
            </div>
        `;
    }
    openModal('exercise-modal');
}

// ==========================================================
// دالة الشات - النسخة الوحيدة والنهائية
// ==========================================================
async function handleSendMessage() {
    console.log('🚀 بدء إرسال الرسالة...');

    const sendButton = document.getElementById('send-chat-btn');
    const input = document.getElementById('chat-input');
    if (sendButton) {
        sendButton.disabled = true;
        sendButton.classList.add('opacity-50');
    }
    if (input) input.disabled = true;

    let msgId;
    let requestTimeoutId;
    let retryText = '';
    let retryImage = null;
    try {
        if (!input) return;

        const text = input.value.trim();
        if (!text && !selectedBase64Image) return;

        const currentImage = selectedBase64Image;
        retryText = text;
        retryImage = currentImage;
        input.value = '';
        clearChatImage();

        renderChatMessage('user', text, true, currentImage);
        logEvent('chat_message_sent', {
            has_image: Boolean(currentImage),
            message_length: text.length
        });

        if (!navigator.onLine) {
            addToPendingQueue(text);
            renderChatMessage('assistant', '⚠️ أنت غير متصل بالإنترنت.', false);
            return;
        }

        msgId = renderChatMessage('assistant', 'جاري التفكير...', false);

        console.log('📤 إرسال طلب إلى /api/chat...');

        const controller = new AbortController();
        requestTimeoutId = setTimeout(() => controller.abort(), 30000);
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                promptText: text,
                userMessage: text,
                imageBase64: currentImage,
                deviceId: getDeviceId(),
                userContext: getCoachContext()
            }),
            signal: controller.signal
        });
        clearTimeout(requestTimeoutId);

        console.log('📥 حالة الاستجابة:', response.status);

        if (!response.ok) throw new Error('فشل الاتصال: ' + response.status);

        const data = await parseApiResponse(response);
        console.log('📦 البيانات المستلمة:', data);

        const reply = data.reply || data.message || 'لم يتم استلام رد';
        updateChatMessage(msgId, reply);
        saveChatMessage('assistant', reply);
        console.log('✅ تم عرض الرد بنجاح');

    } catch (e) {
        console.error('❌ خطأ:', e);
        const fallback = '🎯 واصل الالتزام بخطتك الغذائية!';
        updateChatMessage(msgId, fallback);
        saveChatMessage('assistant', fallback);
        showError({
            userMessage: 'تعذر الاتصال بالمدرب، تحقق من الإنترنت',
            retry: () => {
                if (input) input.value = retryText;
                selectedBase64Image = retryImage;
                handleSendMessage();
            }
        });
    } finally {
        if (requestTimeoutId) clearTimeout(requestTimeoutId);
        if (sendButton) {
            sendButton.disabled = false;
            sendButton.classList.remove('opacity-50');
        }
        if (input) input.disabled = false;
    }
}

async function parseApiResponse(response) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
        const body = await response.text();
        throw new Error(body.trim().startsWith('<')
            ? 'استجابة غير صالحة من الخادم (HTML بدل JSON)'
            : 'استجابة غير صالحة من الخادم');
    }
    return response.json();
}

// ---- Image and Voice ----
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
        alert('حدث خطأ أثناء معالجة الصورة.');
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
    recognition.onerror = function () { if (micBtn) micBtn.classList.remove('text-red-500', 'animate-pulse'); };
    recognition.onend = function () { if (micBtn) micBtn.classList.remove('text-red-500', 'animate-pulse'); };
    recognition.start();
}

// ---- Chat History ----
function loadChatHistory() {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    const container = document.getElementById('chat-messages');
    if (!container) return;
    container.innerHTML = '';
    if (history.length === 0) {
        renderChatMessage('assistant', 'أهلاً بك! أنا مدربك الذكي. كيف يمكنني مساعدتك اليوم؟', false);
    } else {
        history.forEach(m => renderChatMessage(m.sender, m.text, false, m.image));
    }
}

function saveChatMessage(sender, text, image = null) {
    const history = JSON.parse(localStorage.getItem('chatHistory') || '[]');
    history.push({ sender, text, image, time: new Date().toISOString() });
    if (history.length > 50) history.shift();
    localStorage.setItem('chatHistory', JSON.stringify(history));
    saveAppState();
}

function renderChatMessage(sender, text, save = true, image = null) {
    const container = document.getElementById('chat-messages');
    if (!container) return;
    const id = 'msg-' + Date.now() + Math.random().toString(36).substring(2, 5);
    const isUser = sender === 'user';
    const imgHTML = image ? `<img src="${image}" class="max-w-full h-auto rounded-lg mb-2 border border-slate-700"/>` : '';
    container.insertAdjacentHTML('beforeend', `
        <div id="${id}" class="flex ${isUser ? 'justify-end' : 'justify-start'} mb-2">
            <div class="${isUser ? 'bg-emerald-600 text-slate-950 font-medium' : 'bg-slate-800 text-slate-100'} px-4 py-3 rounded-2xl max-w-[85%] text-sm leading-relaxed shadow-sm">
                ${imgHTML}
                <div data-message-content>${formatChatText(text)}</div>
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
        const txtDiv = el.querySelector('[data-message-content]');
        if (txtDiv) txtDiv.innerHTML = formatChatText(newText);
    }
}

function formatChatText(text) {
    const sourceLines = escapeHtml(text).split(/\r?\n/);
    const formattedLines = [];
    let listItems = [];

    const flushList = () => {
        if (!listItems.length) return;
        formattedLines.push(`<ul class="list-disc list-inside my-2">${listItems.join('')}</ul>`);
        listItems = [];
    };

    for (const line of sourceLines) {
        const bullet = line.match(/^\s*[-*]\s+(.+)$/);
        if (bullet) {
            listItems.push(`<li>${bullet[1]}</li>`);
            continue;
        }

        flushList();
        const heading = line.match(/^#{2,3}\s+(.+)$/);
        if (heading) {
            const level = line.startsWith('###') ? 3 : 2;
            formattedLines.push(`<h${level} class="font-bold text-slate-100 my-2">${heading[1]}</h${level}>`);
        } else if (/^-{3,}$/.test(line.trim())) {
            formattedLines.push('<hr class="border-slate-700 my-3">');
        } else {
            formattedLines.push(line);
        }
    }
    flushList();

    const formatted = formattedLines.join('<br>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    return formatted.replace(/\[GIF:\s*([A-Za-z0-9_-]+)\s*\]/g, (match, id) => {
        if (!exerciseGifManifest[id]) return match;
        const gifUrl = getExerciseGifUrl({ id });
        return `<img src="${gifUrl}" alt="GIF ${escapeHtml(id)}" class="block max-w-full h-auto rounded-lg my-2 border border-slate-700" loading="lazy" decoding="async" onerror="this.remove()">`;
    });
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
                body: JSON.stringify({ promptText: msg, userMessage: msg, userContext: getCoachContext() })
            });
            if (!res.ok) { failedMessages.push(msg); continue; }
            const data = await parseApiResponse(res);
            renderChatMessage('assistant', data.reply || 'تم الرد', true);
            await new Promise(r => setTimeout(r, 500));
        } catch (e) {
            failedMessages.push(msg);
            showError({ message: 'تعذر إعادة إرسال إحدى رسائل الدردشة.' });
        }
    }
    localStorage.setItem('pendingChatQueue', JSON.stringify(failedMessages));
    if (failedMessages.length > 0) setTimeout(retryPendingMessages, 60000);
}

// ---- Reminders ----
function loadReminderSettings() {
    const saved = readJsonStorage('ngym_reminders', {});
    if (saved.time) {
        const t = document.getElementById('reminder-time');
        if (t) t.value = saved.time;
    }
    if (saved.days) {
        document.querySelectorAll('.day-btn').forEach(btn => {
            if (saved.days.includes(btn.dataset.day)) {
                btn.classList.add('active');
            }
        });
    }
}

function startReminderChecker() {
    if (reminderInterval) clearInterval(reminderInterval);
    reminderInterval = setInterval(() => {
        const now = new Date();
        if (now.getHours() === 0 && now.getMinutes() === 0) lastReminderCheckedMinute = '';
        const reminders = readJsonStorage('ngym_reminders', {});
        if (!reminders.enabled || !reminders.days?.includes(String(now.getDay()))) return;
        const setTime = reminders.time;
        const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const reminderKey = `${now.toLocaleDateString('sv')}-${currentTime}`;
        if (setTime === currentTime && lastReminderCheckedMinute !== reminderKey) {
            lastReminderCheckedMinute = reminderKey;
            showReminderNotification();
        }
    }, 5000);
}

function parseReminderTime(value, now = new Date()) {
    const match = String(value || '').trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const meridiem = match[3]?.toUpperCase();
    if (minutes > 59 || hours > (meridiem ? 12 : 23)) return null;
    if (meridiem) hours = hours % 12 + (meridiem === 'PM' ? 12 : 0);
    const target = new Date(now);
    target.setHours(hours, minutes, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 1);
    return target;
}

function formatReminderDate(date) {
    return date.toLocaleString('ar', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: 'numeric', minute: '2-digit'
    });
}

function formatReminderTime(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

async function initializeFcm() {
    const vapidKey = window.NGYM_FCM_VAPID_KEY || 'BKqYhmmVT0mYWBR_xjtHZ5udkx6kbPpsGH7PccAihajOiKAyZamr268VROxLopp3hJPbRrfO-kx0oX2R5EaDKII';
    if (!vapidKey || !window.firebase?.messaging || !fcmServiceWorkerRegistration) return null;
    try {
        fcmMessaging = firebase.messaging();
        fcmToken = await fcmMessaging.getToken({
            vapidKey,
            serviceWorkerRegistration: fcmServiceWorkerRegistration
        });
        return fcmToken;
    } catch (error) {
        console.warn('تعذر استخراج FCM Token:', error);
        return null;
    }
}

function showOfflineBanner() {
    let banner = document.getElementById('offline-banner');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'fixed bottom-24 left-4 right-4 z-[70] rounded-xl bg-amber-500 text-slate-950 text-center text-xs font-bold p-3 shadow-lg';
        document.body.appendChild(banner);
    }
    banner.textContent = 'أنت تعمل حالياً بدون إنترنت. بعض الميزات ستتزامن عند عودة الاتصال.';
    banner.classList.remove('hidden');
}

function hideOfflineBanner() {
    document.getElementById('offline-banner')?.classList.add('hidden');
}

async function saveReminderToFirebase(reminders, token) {
    if (!window.db || !token) return;
    try {
        await db.collection('users').doc(getDeviceId()).set({
            reminder: reminders,
            fcmToken: token,
            updatedAt: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.warn('تعذر حفظ إعدادات FCM:', error);
    }
}

async function showReminderNotification(test = false) {
    if (!('Notification' in window)) {
        if (!test) console.warn('الإشعارات غير مدعومة في هذا المتصفح');
        return false;
    }
    if (Notification.permission !== 'granted') return false;

    const options = {
        body: test ? 'تم استلام إشعار NGym بنجاح.' : 'حان وقت التمرين!',
        icon: '/icon-192.png',
        tag: test ? 'ngym-notification-test' : 'ngym-workout-reminder'
    };
    if (reminderServiceWorkerRegistration) {
        await reminderServiceWorkerRegistration.showNotification('NGym 🏋️', options);
    } else {
        new Notification('NGym 🏋️', options);
    }
    return true;
}

async function requestNotificationPermission() {
    if (!('Notification' in window)) return false;
    if (Notification.permission === 'default') {
        return (await Notification.requestPermission()) === 'granted';
    }
    return Notification.permission === 'granted';
}

async function testReminderNotification() {
    const granted = await requestNotificationPermission();
    if (!granted) {
        alert('يرجى السماح بالإشعارات من إعدادات المتصفح أولاً.');
        return;
    }
    await showReminderNotification(true);
}

// ---- Admin ----
function setupAdminPanel() {
    const logo = document.getElementById('app-logo');
    if (!logo) return;
    logo.addEventListener('click', () => {
        logoClickCount++;
        clearTimeout(logoClickTimer);
        logoClickTimer = setTimeout(() => { logoClickCount = 0; }, 3000);
        if (logoClickCount >= 5) { logoClickCount = 0; openModal('admin-modal'); }
    });
}

async function loadAdminCodes() {
    const container = document.getElementById('codes-list');
    if (!container) return;
    const token = sessionStorage.getItem('adminToken');
    if (!token) return;
    try {
        const response = await fetch('/api/admin?action=list', {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('فشل تحميل الأكواد');
        const codes = await response.json();
        if (codes.length === 0) { container.innerHTML = '<div class="text-slate-400">لا توجد أكواد</div>'; return; }
        container.innerHTML = codes.map(code => {
            const data = code.data;
            const used = data.isUsed ? 'مستخدم ✅' : 'فعال 🔓';
            const color = data.isUsed ? 'text-emerald-400' : 'text-amber-400';
            return `<div class="flex justify-between border-b border-slate-800 py-1 text-xs">
                <span class="font-mono text-emerald-400">${escapeHtml(code.id)}</span>
                <span class="${color}">${used}</span>
                <span class="text-slate-400">${data.days || 30} يوم</span>
            </div>`;
        }).join('');
    } catch (e) {
        container.innerHTML = '<div class="text-red-400">خطأ في التحميل</div>';
        showError({ message: 'تعذر تحميل أكواد الاشتراك.', retry: loadAdminCodes });
    }
}

async function updateSubscriptionUI() {
    const remaining = getRemainingTrialDays();
    const subscriptionEndDate = localStorage.getItem('subscriptionEndDate');
    const subscriptionEnd = subscriptionEndDate ? new Date(subscriptionEndDate) : null;
    const isPaid = Boolean(subscriptionEnd && !Number.isNaN(subscriptionEnd.getTime()) && subscriptionEnd > new Date());
    const isActive = remaining > 0;

    const statusText = document.getElementById('subscription-status');
    if (statusText) {
        const type = isPaid ? 'اشتراك نشط' : 'تجربة مجانية';
        statusText.textContent = isActive
            ? `✅ ${type}: ${remaining} يوم متبقي`
            : '⛔ انتهت الفترة التجريبية';
    }

    const banner = document.getElementById('subscription-banner');
    if (banner) banner.classList.toggle('hidden', isActive);

    const daysEl = document.getElementById('days-remaining');
    if (daysEl) daysEl.textContent = isActive ? `${remaining} يوم متبقي` : 'منتهي';

    const typeEl = document.getElementById('subscription-type');
    if (typeEl) typeEl.textContent = isActive ? (isPaid ? 'اشتراك نشط' : 'تجربة مجانية') : 'تواصل معنا للتفعيل';

    const renewBtn = document.getElementById('renew-btn');
    if (renewBtn) {
        renewBtn.classList.toggle('hidden', isActive);
        if (!isActive) {
            renewBtn.textContent = '📱 تجديد عبر الواتساب';
            renewBtn.onclick = () => {
                logEvent('whatsapp_click', { source: 'subscription_renewal' });
                const msg = encodeURIComponent('مرحباً، أريد تجديد اشتراكي في NGym. حسابي: @newton_2000_');
                window.open(`https://wa.me/972569699311?text=${msg}`, '_blank');
            };
        }
    }

    const chatInput = document.querySelector('.chat-input-container') || document.getElementById('chat-input')?.parentElement;
    const coachLocked = document.getElementById('coach-locked');
    if (chatInput) chatInput.style.display = isActive ? 'flex' : 'none';
    if (coachLocked) coachLocked.style.display = isActive ? 'none' : 'block';
}

function getRemainingTrialDays() {
    const now = new Date();

    const subEnd = localStorage.getItem('subscriptionEndDate');
    if (subEnd) {
        const end = new Date(subEnd);
        if (!Number.isNaN(end.getTime()) && end > now) {
            return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        }
    }

    const trialEnd = localStorage.getItem('trialEndDate');
    if (trialEnd) {
        const end = new Date(trialEnd);
        if (!Number.isNaN(end.getTime()) && end > now) {
            return Math.ceil((end - now) / (1000 * 60 * 60 * 24));
        }
        return 0;
    }

    return 0;
}

async function generateCode(days, phone = document.getElementById('admin-phone')?.value) {
    const token = sessionStorage.getItem('adminToken');
    if (!token) { alert("❌ يجب تسجيل الدخول أولاً."); return; }
    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ action: 'generate', days: parseInt(days) || 30, phone: normalizePhone(phone) })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل إنشاء الكود');
        const code = result.code;
        alert(`✅ كود جديد:\n${code}`);
        const whatsapp = document.getElementById('whatsapp-result');
        if (whatsapp && result.whatsappUrl) {
            whatsapp.innerHTML = `<a class="text-emerald-400 underline" target="_blank" rel="noopener" href="${result.whatsappUrl}">إرسال الكود عبر واتساب</a>`;
        }
        loadAdminCodes();
    } catch (e) {
        showError({ message: e.message || 'تعذر إنشاء كود الاشتراك.', retry: () => generateCode(days) });
    }
}

async function redeemSubscriptionCode(code) {
    try {
        const response = await fetch('/api/redeem', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: code.trim(), deviceId: getDeviceId() })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'فشل التحقق');
        localStorage.setItem('subscriptionEndDate', result.subscriptionEndDate);
        alert("✅ تم التفعيل!");
        updateDashboardUI();
    } catch (error) {
        showError({ message: error.message || 'فشل التحقق من كود الاشتراك.', retry: () => redeemSubscriptionCode(code) });
    }
}

// ---- Form Handlers ----
function handleOnboardingSubmit(e) {
    e.preventDefault();
    saveUserData({
        weight: document.getElementById('input-weight').value,
        targetWeight: document.getElementById('input-target-weight').value,
        height: document.getElementById('input-height').value,
        age: document.getElementById('input-age').value,
        gender: document.getElementById('input-gender').value,
        goal: document.getElementById('select-goal').value,
        activity: document.getElementById('select-activity').value,
        apiKey: document.getElementById('input-api-key').value
    });
    logEvent('onboarding_completed', { step: 2 });
    switchTab('sec-dashboard');
    updateDashboardUI();
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
    addXP(15); updateDashboardUI(); closeModal('meal-modal');
}

function handleExerciseSubmit(e) {
    e.preventDefault();
    if (!currentExercise) return;
    const duration = parseInt(document.getElementById('exercise-duration').value) || 10;
    logExerciseWithDetails(currentExercise.muscle.toLowerCase(), currentExercise.met, duration);
    closeModal('exercise-modal');
}

function toggleDay(element) { if (element) element.classList.toggle('active'); }

async function saveReminders() {
    const permissionGranted = await requestNotificationPermission();
    const inputTime = document.getElementById('reminder-time')?.value || '20:00';
    const nextReminder = parseReminderTime(inputTime);
    const time = nextReminder ? formatReminderTime(nextReminder) : inputTime;
    const selectedDays = [];
    document.querySelectorAll('.day-btn.active').forEach(btn => {
        selectedDays.push(btn.dataset.day);
    });
    const reminders = {
        time: time,
        days: selectedDays,
        enabled: selectedDays.length > 0,
        savedAt: new Date().toISOString()
    };
    writeStorage('ngym_reminders', reminders);
    const token = permissionGranted ? await initializeFcm() : null;
    await saveReminderToFirebase(reminders, token);
    alert(permissionGranted
        ? `✅ تم حفظ التنبيهات وتفعيل الإشعارات${nextReminder ? `\nموعد التنبيه التالي: ${formatReminderDate(nextReminder)}` : ''}`
        : '✅ تم حفظ التنبيهات، لكن إذن الإشعارات غير مفعل');
}

async function verifyAdmin() {
    const password = document.getElementById('admin-password')?.value;
    try {
        const response = await fetch('/api/admin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'login', password })
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'كلمة المرور غير صحيحة');
        sessionStorage.setItem('adminToken', result.token);
        document.getElementById('admin-login-section').classList.add('hidden');
        document.getElementById('admin-dashboard-section').classList.remove('hidden');
        loadAdminCodes();
    } catch (error) {
        showError({ message: error.message || 'تعذر تسجيل دخول المشرف.', retry: verifyAdmin });
    }
}

async function recordAppOpen() {
    const user = window.NGYM_MODULAR_AUTH?.auth?.currentUser
        || window.firebase?.auth?.()?.currentUser;
    if (!user?.uid) return;

    try {
        await db.collection('users').doc(user.uid).set({
            lastOpenedAt: new Date().toISOString()
        }, { merge: true });
    } catch (error) {
        console.error('تعذر تسجيل آخر فتح للتطبيق:', error);
    }
}

async function loadAppMetadata() {
    const fallbackVersion = '1.0.0';
    try {
        const response = await fetch('/manifest.json', { cache: 'no-store' });
        if (!response.ok) throw new Error('تعذر تحميل معلومات التطبيق');
        const manifest = await response.json();
        const element = document.getElementById('app-version');
        if (element) element.textContent = manifest.version || fallbackVersion;
    } catch (error) {
        const element = document.getElementById('app-version');
        if (element) element.textContent = fallbackVersion;
        showError({ message: 'تعذر تحميل معلومات تحديث التطبيق.' });
    }
}

// ---- Initialization ----
document.addEventListener('DOMContentLoaded', async function () {
    console.log('✅ DOM loaded');
    logEvent('app_opened', { timestamp: new Date().toISOString() });
    const tasks = [
        { name: 'recordAppOpen', fn: recordAppOpen },
        { name: 'loadAppMetadata', fn: loadAppMetadata },
        { name: 'initializeSplashReadiness', fn: initializeSplashReadiness }
    ];
    for (const task of tasks) {
        try {
            if (typeof task.fn === 'function') await task.fn();
        } catch (e) {
            console.error(`فشل ${task.name}:`, e);
        }
    }
    window.setTimeout(hideSplash, 5000);
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
            .then(registration => {
                reminderServiceWorkerRegistration = registration;
                fcmServiceWorkerRegistration = registration;
                console.log('✅ SW registered:', registration.scope);
            })
            .catch(error => console.error('فشل تسجيل SW:', error));

        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (refreshing) return;
            refreshing = true;
            window.location.reload();
        });
    }
    window.addEventListener('offline', () => {
        showOfflineBanner();
        showToast('أنت غير متصل بالإنترنت.', 'warning');
    });

    // DEPRECATED: Google Authentication additions retained for rollback compatibility.
    function getAuthenticatedUid() {
        return window.NGYM_MODULAR_AUTH?.auth?.currentUser?.uid
            || window.firebase?.auth?.()?.currentUser?.uid
            || localStorage.getItem('ngym_user_id')
            || null;
    }

    function setAuthScreenVisible(isVisible) {
        const authScreen = document.getElementById('auth-screen');
        if (!authScreen) return;
        authScreen.hidden = !isVisible;
        document.querySelectorAll('body > *:not(#auth-screen):not(#toast-container)').forEach((element) => {
            if (element.id !== 'splash-screen') element.hidden = isVisible;
        });
        if (!isVisible) {
            const splash = document.getElementById('splash-screen');
            if (splash) splash.hidden = true;
        }
    }

    async function persistAuthenticatedUser(user) {
        const uid = user?.uid;
        if (!uid) return;

        localStorage.setItem('ngym_user_id', uid);

        try {
            const now = new Date();
            const users = db.collection('users');
            const userRef = users.doc(uid);

            // 1. Migration أولاً — انسخ فقط بيانات الاشتراك
            const oldDeviceId = localStorage.getItem('ngym_device_id');
            if (oldDeviceId && oldDeviceId !== uid) {
                try {
                    const oldUserRef = users.doc(oldDeviceId);
                    const oldUserDoc = await oldUserRef.get();
                    if (oldUserDoc.exists) {
                        const oldData = oldUserDoc.data();
                        await userRef.set({
                            subscriptionEndDate: oldData.subscriptionEndDate || null,
                            trialEndDate: oldData.trialEndDate || null,
                            migratedFrom: oldDeviceId,
                            migratedAt: now.toISOString()
                        }, { merge: true });
                        await oldUserRef.delete();
                        logEvent('migration', { from: 'device', to: 'uid' });
                    }
                    localStorage.removeItem('ngym_device_id');
                } catch (migrationError) {
                    console.error('تعذر ترحيل بيانات الجهاز القديم:', migrationError);
                }
            }

            // 2. اقرأ الوثيقة بعد Migration
            const currentUserDoc = await userRef.get();

            // 3. البيانات الأساسية دائماً
            const baseData = {
                uid,
                email: user.email || '',
                displayName: user.displayName || '',
                photoURL: user.photoURL || '',
                lastLoginAt: now.toISOString()
            };

            // 4. إذا مستخدم جديد، أضف التجربة
            if (!currentUserDoc.exists) {
                const trialEnd = new Date(now);
                trialEnd.setDate(trialEnd.getDate() + 30);
                baseData.createdAt = now.toISOString();
                baseData.trialEndDate = trialEnd.toISOString();
                baseData.subscriptionEndDate = null;
            }

            // 5. اكتب
            await userRef.set(baseData, { merge: true });

        } catch (error) {
            console.error('تعذر حفظ بيانات مستخدم Google:', error);
            showToast('تم تسجيل الدخول، لكن تعذر حفظ بيانات الحساب.', 'warning');
        }
    }

    async function signInWithGoogle() {
        const authApi = window.NGYM_MODULAR_AUTH;
        const errorElement = document.getElementById('auth-error');
        const button = document.getElementById('google-signin-btn');
        if (!authApi) {
            if (errorElement) errorElement.textContent = 'خدمة تسجيل الدخول غير جاهزة، حاول مرة أخرى.';
            return;
        }
        if (button) button.disabled = true;
        if (errorElement) errorElement.textContent = '';
        try {
            const result = await authApi.signInWithPopup(authApi.auth, authApi.provider);
            await persistAuthenticatedUser(result.user);
            logEvent('sign_in', { method: 'google' });
            setAuthScreenVisible(false);
        } catch (error) {
            console.error('Google sign-in failed:', error);
            if (errorElement) {
                errorElement.textContent = error.code === 'auth/popup-closed-by-user'
                    ? 'تم إغلاق نافذة تسجيل الدخول.'
                    : 'تعذر تسجيل الدخول باستخدام Google. حاول مرة أخرى.';
            }
        } finally {
            if (button) button.disabled = false;
        }
    }

    window.signInWithGoogle = signInWithGoogle;

    function initializeGoogleAuthentication() {
        const authApi = window.NGYM_MODULAR_AUTH;
        const button = document.getElementById('google-signin-btn');
        if (button) button.addEventListener('click', signInWithGoogle);
        const signoutButton = document.getElementById('signout-btn');
        if (signoutButton) signoutButton.addEventListener('click', handleSignOut);
        if (!authApi) return;
        authApi.onAuthStateChanged(authApi.auth, async (user) => {
            if (user) {
                await persistAuthenticatedUser(user);
                setAuthScreenVisible(false);
            } else {
                localStorage.removeItem('ngym_user_id');
                setAuthScreenVisible(true);
            }
        });
    }

    async function handleSignOut() {
        const authApi = window.NGYM_MODULAR_AUTH;
        if (!authApi) return;
        try {
            await authApi.signOut(authApi.auth);
            localStorage.removeItem('ngym_user_id');
            localStorage.removeItem('ngym_device_id');
            window.location.reload();
        } catch (error) {
            console.error('تعذر تسجيل الخروج:', error);
            showToast('تعذر تسجيل الخروج. حاول مرة أخرى.', 'error');
        }
    }

    // Inject uid into existing API calls while retaining deviceId as a temporary fallback.
    (() => {
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (input, init = {}) => {
            const url = typeof input === 'string' ? input : input?.url || '';
            if (!/\/api\/(chat|redeem)(?:[/?#]|$)/.test(url) || !init.body) {
                return originalFetch(input, init);
            }
            try {
                const body = JSON.parse(init.body);
                const uid = getAuthenticatedUid();
                if (uid) {
                    body.uid = uid;
                    body.deviceId = body.deviceId || getDeviceId();
                    const token = await window.NGYM_MODULAR_AUTH?.auth?.currentUser?.getIdToken();
                    const headers = new Headers(init.headers || {});
                    headers.set('Content-Type', 'application/json');
                    if (token) headers.set('Authorization', `Bearer ${token}`);
                    init = { ...init, headers, body: JSON.stringify(body) };
                }
            } catch (error) {
                console.warn('تعذر إضافة uid إلى طلب API:', error);
            }
            return originalFetch(input, init);
        };
    })();

    window.addEventListener('load', () => {
        window.setTimeout(initializeGoogleAuthentication, 0);
    });
    window.addEventListener('online', () => {
        hideOfflineBanner();
        showToast('تم استعادة الاتصال بالإنترنت.', 'success');
    });
    if (!navigator.onLine) showOfflineBanner();
    loadExerciseDatabase().then(() => {
        loadChatHistory();
        restoreAppState();
    });
    updateDashboardUI();
    loadReminderSettings();
    startReminderChecker();
    setupAdminPanel();
    appStateInterval = window.setInterval(saveAppState, 30000);
    window.addEventListener('beforeunload', saveAppState);

    window.addEventListener('online', retryPendingMessages);

    document.getElementById('chat-file-input')?.addEventListener('change', handleImageUpload);
    document.getElementById('mic-btn')?.addEventListener('click', toggleVoiceRecognition);
    document.getElementById('remove-image-btn')?.addEventListener('click', clearChatImage);
    document.getElementById('send-chat-btn')?.addEventListener('click', handleSendMessage);
    document.getElementById('chat-input')?.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') handleSendMessage();
    });
    document.getElementById('workout-search')?.addEventListener(
        'input',
        debounce(renderWorkoutsList, 200)
    );
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') closeExerciseGifModal();
    });
    document.getElementById('renew-btn')?.addEventListener('click', function() {
        const code = prompt('أدخل كود التفعيل:');
        if (code) redeemSubscriptionCode(code);
    });
    document.getElementById('install-app-btn')?.addEventListener('click', handleInstallApp);
    if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true) {
        document.getElementById('install-app-btn')?.classList.add('hidden');
    }
    document.getElementById('generate-code-btn')?.addEventListener('click', function() {
        const duration = parseInt(document.getElementById('code-duration')?.value) || 30;
        generateCode(duration);
    });
});


// Phone registration migration. The Google flow above is retained as // DEPRECATED
        // compatibility code, but anonymous Firebase identities are now used for all users.
        function normalizePhone(value) {
            const digits = String(value || '').replace(/\D/g, '');
            if (digits.startsWith('00')) return `+${digits.slice(2)}`;
            if (digits.startsWith('972')) return `+${digits}`;
            if (digits.startsWith('0')) return `+970${digits.slice(1)}`;
            return `+${digits}`;
        }
        function validatePhone(value) { return /^\+[1-9]\d{7,14}$/.test(normalizePhone(value)); }
        function phoneAuthError(message) {
            const target = document.getElementById('phone-error');
            if (target) target.textContent = message;
        }
        function setPhoneAuthVisible(visible) {
            const screen = document.getElementById('phone-screen');
            if (!screen) return;
            screen.hidden = !visible;
            document.querySelectorAll('body > *:not(#phone-screen):not(#toast-container)').forEach(element => {
                if (element.id !== 'splash-screen') element.hidden = visible;
            });
        }
        async function authHeaders() {
            const user = window.NGYM_MODULAR_AUTH?.auth?.currentUser;
            const token = user ? await user.getIdToken() : '';
            return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
        }
        async function handlePhoneSubmit(event) {
            event?.preventDefault();
            const input = document.getElementById('phone-input');
            const phone = normalizePhone(input?.value);
            if (!validatePhone(phone)) return phoneAuthError('يرجى إدخال رقم صحيح مثل +970 5X XXX XXXX');
            try {
                const authApi = window.NGYM_MODULAR_AUTH;
                await authApi.ensureAnonymousAuth();
                const response = await fetch('/api/register', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ phone }) });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'تعذر تسجيل الرقم');
                localStorage.setItem('ngym_phone', phone);
                localStorage.setItem('trialEndDate', result.trialEndDate || '');
                if (result.subscriptionEndDate) {
                    localStorage.setItem('subscriptionEndDate', result.subscriptionEndDate);
                }
                setPhoneAuthVisible(false);
                if (localStorage.getItem('hasOnboarded') !== 'true') openModal('onboarding-modal');
                await checkSubscriptionFromServer();
            } catch (error) { phoneAuthError(error.message || 'تعذر تسجيل الرقم حالياً'); }
        }
        function handleShowCode() {
            const form = document.getElementById('code-section');
            if (form) form.hidden = !form.hidden;
        }
        async function handleActivateCode(event) {
            event?.preventDefault();
            const form = event?.currentTarget;
            const input = form?.querySelector('input')
                || document.getElementById('code-input')
                || document.getElementById('coach-code-input');
            const feedback = form?.querySelector('[data-code-feedback]');
            const setFeedback = (message, isError = false) => {
                if (feedback) {
                    feedback.textContent = message;
                    feedback.classList.toggle('text-red-400', isError);
                    feedback.classList.toggle('text-emerald-400', !isError);
                } else {
                    phoneAuthError(message);
                }
            };
            const code = String(input?.value || '').trim().toUpperCase();
            if (!/^NGYM-[A-Z0-9]{8,}$/.test(code)) {
                setFeedback('يرجى إدخال كود تفعيل صحيح', true);
                return;
            }
            const submitButton = form?.querySelector('button');
            const originalButtonText = submitButton?.textContent;
            if (submitButton) {
                submitButton.disabled = true;
                submitButton.textContent = 'جارٍ التحقق...';
            }
            try {
                const response = await fetch('/api/activate', { method: 'POST', headers: await authHeaders(), body: JSON.stringify({ code }) });
                const result = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(result.error || 'تعذر تفعيل الكود');
                if (!result.subscriptionEndDate) throw new Error('تم قبول الطلب لكن لم تصل صلاحية الاشتراك');
                localStorage.setItem('subscriptionEndDate', result.subscriptionEndDate);
                if (input) input.value = '';
                setFeedback('تم تفعيل الاشتراك بنجاح');
                if (form?.id === 'code-section') setPhoneAuthVisible(false);
                await updateSubscriptionUI();
                showToast('تم تفعيل الاشتراك بنجاح.', 'success');
            } catch (error) {
                setFeedback(error.message || 'تعذر تفعيل الكود', true);
            } finally {
                if (submitButton) {
                    submitButton.disabled = false;
                    submitButton.textContent = originalButtonText;
                }
            }
        }
        async function checkSubscriptionFromServer() {
            try {
                const response = await fetch('/api/check-subscription', { method: 'POST', headers: await authHeaders(), body: '{}', cache: 'no-store' });
                if (!response.ok) return;
                const result = await response.json();
                if (result.trialEndDate) localStorage.setItem('trialEndDate', result.trialEndDate);
                else localStorage.removeItem('trialEndDate');
                if (result.subscriptionEndDate) localStorage.setItem('subscriptionEndDate', result.subscriptionEndDate);
                else localStorage.removeItem('subscriptionEndDate');
                window.ngymSubscription = result;
                await updateSubscriptionUI();
            } catch (error) { console.warn('تعذر تحديث حالة الاشتراك:', error); }
        }
        window.validatePhone = validatePhone;
        window.normalizePhone = normalizePhone;
        window.handlePhoneSubmit = handlePhoneSubmit;
        window.handleShowCode = handleShowCode;
        window.handleActivateCode = handleActivateCode;
        window.addEventListener('load', () => {
            document.getElementById('phone-auth-form')?.addEventListener('submit', handlePhoneSubmit);
            document.getElementById('show-code-link')?.addEventListener('click', handleShowCode);
            document.getElementById('code-section')?.addEventListener('submit', handleActivateCode);
            document.getElementById('coach-code-form')?.addEventListener('submit', handleActivateCode);
            document.getElementById('coach-whatsapp-btn')?.addEventListener('click', () => {
                const phone = localStorage.getItem('ngym_phone') || '';
                const message = encodeURIComponent('مرحباً، أريد تفعيل NGym لرقمي ' + phone);
                window.open(`https://wa.me/972569699311?text=${message}`, '_blank');
            });
            const authApi = window.NGYM_MODULAR_AUTH;
            if (!authApi) return;
            authApi.onAuthStateChanged(authApi.auth, async user => {
                splashAuthReady = true;
                if (!user) { try { await authApi.ensureAnonymousAuth(); } catch (_) {} return; }
                setPhoneAuthVisible(!localStorage.getItem('ngym_phone'));
                if (localStorage.getItem('ngym_phone') && localStorage.getItem('hasOnboarded') !== 'true') {
                    openModal('onboarding-modal');
                }
                await checkSubscriptionFromServer();
                tryHideSplash();
            });
            window.setInterval(checkSubscriptionFromServer, 24 * 60 * 60 * 1000);
        });

function getEquipmentArabic(equipment) {
    const map = {
        'body weight': 'بدون أدوات', dumbbell: 'دمبل', cable: 'كابل', barbell: 'بار',
        'leverage machine': 'جهاز', band: 'مطاط', 'smith machine': 'جهاز سميث',
        kettlebell: 'كيتل بيل', weighted: 'بوزن إضافي', 'stability ball': 'كرة سويسرية',
        'ez barbell': 'بار متعرج', assisted: 'بمساعدة', 'sled machine': 'جهاز سليد',
        'medicine ball': 'كرة طبية', rope: 'حبل', roller: 'أسطوانة',
        'resistance band': 'حزام مقاومة', 'bosu ball': 'كرة بوسو', 'olympic barbell': 'بار أولمبي',
        'wheel roller': 'عجلة بطن', 'upper body ergometer': 'دراجة ذراعين',
        'skierg machine': 'جهاز سكي', hammer: 'جهاز هامر', 'stationary bike': 'دراجة ثابتة',
        tire: 'إطار', 'trap bar': 'بار سداسي', 'elliptical machine': 'جهاز إهليلجي',
        'stepmill machine': 'جهاز سلم'
    };
    return map[String(equipment || '').toLowerCase()] || null;
}

function getMuscleArabic(muscle) {
    const map = {
        triceps: 'ترايسبس', shoulders: 'أكتاف', biceps: 'بايسبس', hamstrings: 'خلف الفخذ',
        forearms: 'ساعد', glutes: 'مؤخرة', calves: 'سمانة', abs: 'بطن',
        quadriceps: 'أمام الفخذ', pectorals: 'صدر', delts: 'أكتاف', 'upper back': 'أعلى الظهر',
        core: 'عضلات الجذع', chest: 'صدر', lats: 'ظهر عريض', 'hip flexors': 'ثانيات الورك',
        obliques: 'بطن جانبي', 'lower back': 'أسفل الظهر', rhomboids: 'وسط الظهر',
        traps: 'ترابيس', trapezius: 'ترابيس', quads: 'أمام الفخذ',
        'cardiovascular system': 'قلب وتنفس', deltoids: 'أكتاف', 'rear deltoids': 'أكتاف خلفية',
        spine: 'عضلات العمود الفقري', brachialis: 'العضدية', back: 'ظهر', ankles: 'كاحل',
        feet: 'قدم', adductors: 'داخل الفخذ', 'rotator cuff': 'الكفة المدوّرة',
        'serratus anterior': 'المسننة الأمامية', 'latissimus dorsi': 'ظهر عريض',
        abductors: 'خارج الفخذ', 'ankle stabilizers': 'مثبتات الكاحل', soleus: 'سمانة عميقة',
        wrists: 'رسغ', 'upper chest': 'أعلى الصدر', 'wrist flexors': 'ثنّي الرسغ',
        'wrist extensors': 'بسط الرسغ', abdominals: 'بطن', 'levator scapulae': 'رافعة الكتف',
        sternocleidomastoid: 'رقبة', hands: 'يدان', groin: 'أربية', 'grip muscles': 'قبضة اليد',
        'lower abs': 'أسفل البطن', 'inner thighs': 'داخل الفخذ', shins: 'أمام الساق'
    };
    const key = String(muscle || '').toLowerCase();
    return map[key] || muscle;
}

function debounce(fn, delay = 200) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
