// ==========================================================
// NGym - Chat API Handler
// Resilient Multi-Model Version
// ==========================================================

const fs = require('fs');
const path = require('path');

let fullExercises = null;
function loadExerciseCatalog() {
    if (fullExercises) return fullExercises;
    try {
        fullExercises = JSON.parse(
            fs.readFileSync(path.join(process.cwd(), 'data', 'exercises.json'), 'utf8')
        );
        return fullExercises;
    } catch (e) {
        console.error('فشل تحميل exercises.json:', e);
        return [];
    }
}

function getExerciseGroup(exercise) {
    if (exercise?.group) return String(exercise.group).toLowerCase();
    const muscle = String(exercise?.target || exercise?.primaryMuscles?.[0] || '').toLowerCase();
    if (muscle.includes('pectoral') || muscle === 'chest' || muscle === 'serratus anterior') return 'chest';
    if (muscle.includes('lat') || muscle.includes('back') || muscle.includes('trap') || muscle === 'spine') return 'back';
    if (muscle.includes('delt') || muscle.includes('shoulder') || muscle === 'levator scapulae') return 'shoulders';
    if (['biceps', 'triceps', 'forearms'].includes(muscle)) return 'arms';
    if (muscle === 'abs' || muscle === 'abdominals' || muscle.includes('waist')) return 'abs';
    if (['quads', 'quadriceps', 'adductors'].includes(muscle)) return 'legs_front';
    if (['hamstrings', 'glutes', 'abductors'].includes(muscle)) return 'legs_back';
    if (['calves', 'calf'].includes(muscle)) return 'legs_calves';
    if (muscle === 'cardiovascular system') return 'cardio';
    return '';
}

function getExercisePlace(exercise) {
    if (exercise?.place) return String(exercise.place).toLowerCase();
    const equipment = String(exercise?.equipment || '').toLowerCase();
    if (equipment === 'body weight' || equipment === 'body only') return 'home_no_equip';
    if (equipment === 'dumbbell') return 'home_dumbbell';
    return 'gym';
}

const MUSCLE_KEYWORDS = {
    chest: ['chest', 'صدر', 'pectoral', 'bench press', 'push up', 'ضغط', 'بينش', 'بنج'],
    back: ['back', 'ظهر', 'lats', 'lat', 'pull up', 'pull-up', 'row', 'سحب', 'عقلة', 'تجديف'],
    shoulders: ['shoulder', 'أكتاف', 'كتف', 'delt', 'press over', 'رفرفة'],
    biceps: ['biceps', 'باي', 'curl', 'مرجحة', 'بايسبس'],
    triceps: ['triceps', 'تراي', 'extension', 'ترايسبس', 'ديبس', 'dips'],
    legs_front: ['quad', 'أمامي', 'squat', 'سكوات', 'قرفصاء', 'lunge', 'طعن', 'فخذ أمامي'],
    legs_back: ['hamstring', 'خلفي', 'glute', 'مؤخرة', 'deadlift', 'رفعة ميتة', 'rdl'],
    legs: ['legs', 'leg', 'أرجل', 'رجل'],
    calves: ['calf', 'سمانة', 'calves'],
    abs: ['ab', 'abs', 'بطن', 'crunch', 'بلانك', 'plank', 'سيت أب'],
    forearms: ['forearm', 'ساعد', 'wrist'],
    traps: ['trap', 'ترابيس', 'shrug', 'رفع أكتاف'],
    arms: ['arms', 'ذراع', 'ذراعين'],
    cardio: ['cardio', 'cardiovascular', 'كارديو', 'قلب']
};

const rateLimitMap = new Map();
const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000;
const securityLogAttempts = new Map();
const uidRateLimitMap = new Map();
const UID_RATE_LIMIT = 60;

setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
        if (entry.resetAt < now) rateLimitMap.delete(ip);
    }
}, 10 * 60 * 1000);

function getRelevantExercises(userMessage, maxCount = 25) {
    const all = loadExerciseCatalog();
    if (!all.length) return [];

    const msg = String(userMessage || '').toLowerCase();
    const matchedMuscles = new Set();

    for (const [muscle, keywords] of Object.entries(MUSCLE_KEYWORDS)) {
        if (keywords.some(keyword => msg.includes(keyword.toLowerCase()))) {
            matchedMuscles.add(muscle);
        }
    }

    let filtered = all;

    if (matchedMuscles.size > 0) {
        const muscleMap = {
            chest: ['chest'],
            back: ['back'],
            shoulders: ['shoulders'],
            arms: ['arms'],
            biceps: ['arms'],
            triceps: ['arms'],
            legs_front: ['legs_front'],
            legs_back: ['legs_back'],
            legs: ['legs_front', 'legs_back', 'legs_calves'],
            calves: ['legs_calves'],
            abs: ['abs'],
            forearms: ['arms'],
            traps: ['back'],
            cardio: ['cardio']
        };

        const targetMuscles = [];
        for (const muscle of matchedMuscles) {
            targetMuscles.push(...(muscleMap[muscle] || []));
        }

        filtered = all.filter(exercise => targetMuscles.includes(getExerciseGroup(exercise)));
    }

    if (msg.includes('دمبل') || msg.includes('dumbbell')) {
        filtered = filtered.filter(exercise => getExercisePlace(exercise) === 'home_dumbbell');
    } else if (msg.includes('منزل') || msg.includes('home') || msg.includes('بدون أدوات')) {
        filtered = filtered.filter(exercise => getExercisePlace(exercise) === 'home_no_equip');
    } else if (msg.includes('نادي') || msg.includes('gym')) {
        filtered = filtered.filter(exercise => getExercisePlace(exercise) === 'gym');
    } else if (msg.includes('بار') || msg.includes('barbell')) {
        filtered = filtered.filter(exercise => String(exercise.equipment || '').toLowerCase().includes('barbell'));
    }

    return filtered.slice(0, maxCount);
}

function formatExercisesForPrompt(exercises) {
    return exercises.map(exercise => `${exercise.id} | ${exercise.name}`).join('\n');
}

function buildBaseInstruction(userMessage) {
    const relevant = getRelevantExercises(userMessage);
    const catalogText = formatExercisesForPrompt(relevant);
    console.log(`📚 التمارين المرسلة إلى Gemini (${relevant.length}):\n${catalogText}`);

    return `أنت مدرب تمارين ولياقة بدنية. أجب بالعربية عند الإمكان، واحتفظ بأسماء التمارين الإنجليزية عند الحاجة.

التمارين المتاحة (${relevant.length} تمرين، فقط ما يطابق سؤال المستخدم):
${catalogText}

عندما تقترح تمريناً له GIF، أضف وسم [GIF: exercise_id] في سطر مستقل باستخدام المعرّف من القائمة أعلاه.
إذا احتاج المستخدم تمريناً غير موجود، اقترح تمريناً مشابهاً من القائمة أو قل "لا يوجد في القائمة الحالية".

قواعد:

- اقترح فقط تمارين من القائمة أعلاه.
- لا تخترع معرّفات.
- لا تستخدم جداول Markdown أو عناوين تبدأ بعلامة #؛ استخدم فقرات قصيرة وقوائم نقطية بسيطة.
- أضف وسم [GIF: id] من القائمة في سطر مستقل بعد اسم كل تمرين مقترح مباشرة.
- إذا لم تفهم السؤال، اطلب توضيحاً.`;
}

function buildSystemInstruction(userContext, userMessage) {
    const base = buildBaseInstruction(userMessage);
    if (!userContext) return base;
    return `${base}

سياق المستخدم الحالي:
${JSON.stringify(userContext)}
اعتمد على الهدف والنشاط والسعرات في التقديم.`;
}

// ==========================================
// 3. قائمة النماذج الاحتياطية (من الأحدث للأقدم)
// ==========================================
const GEMINI_MODELS = [
    'gemini-3.6-flash',   // الأحدث والأسرع (يفضَّل)
    'gemini-2.5-flash',   // احتياطي 1
    'gemini-2.0-flash',   // احتياطي 2
    'gemini-1.5-flash',   // احتياطي 3 (قديم لكن يعمل)
];

// ==========================================
// 4. Handler الرئيسي
// ==========================================
module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const uid = await verifyFirebaseRequest(req, res);
    if (!uid) return;
    const uidNow = Date.now();
    let uidEntry = uidRateLimitMap.get(uid);
    if (!uidEntry || uidEntry.resetAt < uidNow) {
        uidEntry = { count: 0, resetAt: uidNow + WINDOW_MS };
        uidRateLimitMap.set(uid, uidEntry);
    } else if (uidEntry.count >= UID_RATE_LIMIT) {
        return res.status(429).json({
            error: 'تجاوزت الحد المسموح. حاول لاحقاً.',
            retryAfter: Math.ceil((uidEntry.resetAt - Date.now()) / 1000)
        });
    }
    uidEntry.count += 1;

    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || 'unknown';
    const now = Date.now();
    let entry = rateLimitMap.get(ip);
    if (!entry || entry.resetAt < now) {
        entry = { count: 0, resetAt: now + WINDOW_MS };
        rateLimitMap.set(ip, entry);
    } else if (entry.count >= RATE_LIMIT) {
        return res.status(429).json({
            error: 'لقد تجاوزت الحد المسموح. حاول لاحقاً.',
            retryAfter: Math.ceil((entry.resetAt - Date.now()) / 1000)
        });
    }

    try {
        // قراءة الجسم
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        body = body || {};

        // فحص الاشتراك من Firestore فقط. لا نثق بأي بيانات اشتراك من العميل.
        try {
            const admin = require('firebase-admin');
            if (!admin.apps.length) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount)
                });
            }
            const db = admin.firestore();
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) {
                await logSecurityFailure(db, uid, 'المستخدم غير موجود', req);
                return res.status(401).json({ error: 'المستخدم غير موجود' });
            }
            const data = userDoc.data() || {};
            const now = new Date();
            const trialEnd = parseFirestoreDate(data.trialEndDate);
            const subscriptionEnd = parseFirestoreDate(data.subscriptionEndDate);
            const hasActiveTrial = trialEnd && trialEnd > now;
            const hasActiveSubscription = subscriptionEnd && subscriptionEnd > now;
            if (!hasActiveTrial && !hasActiveSubscription) {
                await logSecurityFailure(db, uid, 'لا اشتراك نشط', req);
                return res.status(403).json({
                    error: 'trial_expired',
                    message: 'انتهت تجربتك المجانية. تواصل معنا على واتساب لتفعيل المدرب الذكي.',
                    contact: 'https://wa.me/972569699311',
                    phone: data.phone || null
                });
            }
        } catch (firestoreError) {
            console.error('Firestore Check Error:', firestoreError);
            return res.status(503).json({ error: 'تعذر التحقق من الاشتراك' });
        }

        console.log('📥 البيانات المستلمة:', JSON.stringify(body));

        console.log('📥 البيانات المستلمة:', JSON.stringify(body).substring(0, 500));
        // استخراج النص
        const userMessage = body.promptText ||
                            body.userMessage ||
                            body.message ||
                            body.prompt ||
                            body.text ||
                            body.content ||
                            (body.messages && body.messages[body.messages.length - 1]?.content) ||
                            null;

        const imageBase64 = body.image || body.imageBase64 || null;
        const userContext = body.userContext || null;

        // التحقق من المفتاح
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY missing');
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY مفقود' });
        }

        if (!userMessage) {
            console.error('❌ الرسالة فارغة');
            return res.status(400).json({ error: 'الرسالة فارغة' });
        }

        // بناء الطلب
        const requestBody = {
            system_instruction: { parts: [{ text: buildSystemInstruction(userContext, userMessage) }] },
            contents: [{
                parts: [{ text: String(userMessage) }]
            }]
        };

        // إضافة الصورة إن وجدت
        if (imageBase64) {
            const cleanBase64 = imageBase64.includes(',')
                ? imageBase64.split(',')[1]
                : imageBase64;
            requestBody.contents[0].parts.push({
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: cleanBase64
                }
            });
        }

        // ==========================================
        // 5. المحاولة مع جميع النماذج بالترتيب
        // ==========================================
        let lastError = null;
        let succeeded = false;
        let replyText = null;

        for (const model of GEMINI_MODELS) {
            try {
                console.log(`🔄 تجربة النموذج: ${model}`);
                
                const apiResponse = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(requestBody)
                    }
                );

                const data = await apiResponse.json();

                // إذا نجح
                if (apiResponse.ok) {
                    replyText = data.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (replyText) {
                        console.log(`✅ نجح النموذج: ${model}`);
                        succeeded = true;
                        break;
                    }
                }

                // إذا فشل — سجّل الخطأ وجرّب التالي
                console.warn(`⚠️ فشل النموذج ${model}:`, data.error?.message || 'unknown');
                lastError = data.error?.message || `فشل النموذج ${model}`;

            } catch (modelError) {
                console.warn(`⚠️ خطأ في الاتصال بـ ${model}:`, modelError.message);
                lastError = modelError.message;
            }
        }

        // ==========================================
        // 6. إرجاع النتيجة
        // ==========================================
        if (succeeded && replyText) {
            entry.count += 1;
            return res.status(200).json({ reply: replyText });
        }

        // إذا فشلت كل النماذج
        console.error('❌ فشلت جميع النماذج. آخر خطأ:', lastError);
        return res.status(500).json({
            error: 'جميع النماذج غير متاحة حالياً. يرجى المحاولة لاحقاً.',
            details: lastError
        });
    } catch (error) {
        console.error('Gemini API Error:', error);
        return res.status(500).json({ error: 'خطأ داخلي: ' + error.message });
    }
};

function parseFirestoreDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

async function logSecurityFailure(db, uid, reason, req = null) {
    if (!uid) return;
    const now = Date.now();
    const ip = req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim()
        || req?.headers?.['x-real-ip']
        || req?.socket?.remoteAddress
        || 'unknown';
    const attempt = securityLogAttempts.get(ip) || { count: 0, resetAt: now + 60 * 60 * 1000 };
    if (attempt.resetAt <= now) {
        attempt.count = 0;
        attempt.resetAt = now + 60 * 60 * 1000;
    }
    if (attempt.count >= 5) {
        console.warn('تم تجاوز حد تسجيل المحاولات الأمنية:', ip);
        return;
    }
    attempt.count += 1;
    securityLogAttempts.set(ip, attempt);
    if (Math.random() > 0.1) return;
    try {
        await db.collection('security_logs').add({
            uid: uid || null,
            reason,
            date: new Date().toISOString()
        });
        // TODO: Configure a Firestore TTL policy on security_logs.date.
    } catch (error) {
        console.error('تعذر تسجيل محاولة أمنية فاشلة:', error);
    }
}

// Authentication and subscription checks are based only on the Firestore user document.
const legacyChatHandler = module.exports;
module.exports = async function authenticatedChatHandler(req, res) {
    if (req.method !== 'POST') return legacyChatHandler(req, res);
    return legacyChatHandler(req, res);
};

async function verifyFirebaseRequest(req, res) {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) {
        res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
        return null;
    }
    try {
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
            admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
        }
        const token = authorization.slice('Bearer '.length).trim();
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error('Firebase ID Token verification failed:', error);
        res.status(401).json({ error: 'رمز المصادقة غير صالح' });
        return null;
    }
}
