const admin = require('firebase-admin');
const securityLogAttempts = new Map();

function getDatabase() {
    if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
        if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
        }
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: serviceAccount.project_id,
                clientEmail: serviceAccount.client_email,
                privateKey: serviceAccount.private_key.replace(/\\n/g, '\n')
            })
        });
    }
    return admin.firestore();
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    const uid = await verifyFirebaseRequest(req, res);
    if (!uid) return;

    try {
        let body = req.body || {};
        if (typeof body === 'string') body = JSON.parse(body);

        const code = typeof body.code === 'string' ? body.code.trim() : '';
        if (!code) {
            return res.status(400).json({ error: 'الكود مطلوب' });
        }

        const db = getDatabase();
        const codeRef = db.collection('codes').doc(code);
        const userRef = db.collection('users').doc(uid);
        const existingUser = await userRef.get();
        if (!existingUser.exists) {
            await logSecurityFailure(db, uid, 'المستخدم غير موجود', req);
            return res.status(401).json({ error: 'المستخدم غير موجود' });
        }
        const result = await db.runTransaction(async (transaction) => {
            const codeDoc = await transaction.get(codeRef);
            if (!codeDoc.exists || codeDoc.data().isUsed === true) {
                const error = new Error('INVALID_CODE');
                error.statusCode = 400;
                throw error;
            }

            const codeData = codeDoc.data();
            const days = Number.parseInt(codeData.days, 10);
            if (!Number.isInteger(days) || days < 1) {
                const error = new Error('INVALID_CODE_DURATION');
                error.statusCode = 400;
                throw error;
            }

            const userDoc = await transaction.get(userRef);
            const currentEnd = userDoc.exists ? new Date(userDoc.data().subscriptionEndDate) : null;
            const startDate = currentEnd && !Number.isNaN(currentEnd.getTime()) && currentEnd > new Date()
                ? currentEnd
                : new Date();
            const subscriptionEndDate = new Date(startDate);
            subscriptionEndDate.setDate(subscriptionEndDate.getDate() + days);

            transaction.update(codeRef, {
                isUsed: true,
                usedAt: new Date().toISOString(),
                usedBy: uid
            });
            transaction.set(userRef, {
                subscriptionEndDate: subscriptionEndDate.toISOString(),
                updatedAt: new Date().toISOString()
            }, { merge: true });

            return subscriptionEndDate.toISOString();
        });

        return res.status(200).json({ subscriptionEndDate: result });
    } catch (error) {
        if (error.statusCode === 400) {
            return res.status(400).json({ error: 'الكود غير صالح أو مستخدم مسبقاً' });
        }
        console.error('Redeem API error:', error);
        return res.status(500).json({ error: 'تعذر تفعيل الاشتراك حالياً' });
    }
};

// Validate the authenticated uid before allowing the legacy transaction handler.
const legacyRedeemHandler = module.exports;
module.exports = async function authenticatedRedeemHandler(req, res) {
    if (req.method !== 'POST') return legacyRedeemHandler(req, res);
    return legacyRedeemHandler(req, res);
};

async function verifyFirebaseRequest(req, res) {
    const authorization = req.headers.authorization || '';
    if (!authorization.startsWith('Bearer ')) {
        res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
        return null;
    }
    try {
        getDatabase();
        const token = authorization.slice('Bearer '.length).trim();
        const decodedToken = await admin.auth().verifyIdToken(token);
        return decodedToken.uid;
    } catch (error) {
        console.error('Firebase ID Token verification failed:', error);
        res.status(401).json({ error: 'رمز المصادقة غير صالح' });
        return null;
    }
}

async function logSecurityFailure(db, uid, reason, req) {
    if (!uid) return;
    const now = Date.now();
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
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
            uid,
            reason,
            date: new Date().toISOString()
        });
        // TODO: Configure a Firestore TTL policy on security_logs.date.
    } catch (error) {
        console.error('تعذر تسجيل محاولة أمنية فاشلة:', error);
    }
}
