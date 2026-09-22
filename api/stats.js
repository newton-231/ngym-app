const crypto = require('crypto');
const admin = require('firebase-admin');

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

function safeEqual(left, right) {
    if (!left || !right || left.length !== right.length) return false;
    return crypto.timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function isAuthorized(req) {
    const secret = process.env.ADMIN_SECRET;
    if (!secret) return false;

    const suppliedSecret = req.headers['x-admin-secret'];
    if (typeof suppliedSecret === 'string' && safeEqual(suppliedSecret, secret)) return true;

    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const [payload, signature] = token.split('.');
    if (!payload || !signature) return false;

    const expected = crypto.createHmac('sha256', secret)
        .update(payload)
        .digest('base64url');
    if (!safeEqual(signature, expected)) return false;

    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return data.role === 'admin' && Number(data.expiry) > Date.now();
    } catch (error) {
        return false;
    }
}

async function countEvents(db, eventName, start) {
    const aggregate = await db.collection('analyticsEvents')
        .where('eventName', '==', eventName)
        .where('timestamp', '>=', start)
        .count()
        .get();
    return aggregate.data().count;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'غير مصرح' });
    }

    try {
        const db = getDatabase();
        const now = new Date();
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);

        const users = db.collection('users');
        const [totalUsers, activeSubscriptions, notificationDevices, messagesToday, messagesWeek] =
            await Promise.all([
                users.count().get(),
                users.where('subscriptionEndDate', '>', now.toISOString()).count().get(),
                users.where('fcmToken', '!=', null).count().get(),
                countEvents(db, 'chat_message_sent', todayStart),
                countEvents(db, 'chat_message_sent', weekStart)
            ]);

        const exerciseEvents = await db.collection('analyticsEvents')
            .where('eventName', '==', 'exercise_viewed')
            .where('timestamp', '>=', weekStart)
            .limit(10000)
            .get();
        const exerciseCounts = new Map();
        exerciseEvents.forEach((doc) => {
            const data = doc.data();
            const params = data.params || {};
            const exerciseId = params.exercise_id || data.exerciseId;
            if (exerciseId) {
                exerciseCounts.set(exerciseId, (exerciseCounts.get(exerciseId) || 0) + 1);
            }
        });
        const topExercises = [...exerciseCounts.entries()]
            .sort((left, right) => right[1] - left[1])
            .slice(0, 10)
            .map(([exerciseId, views]) => ({ exerciseId, views }));

        return res.status(200).json({
            users: {
                total: totalUsers.data().count,
                activeSubscriptions: activeSubscriptions.data().count,
                notificationDevices: notificationDevices.data().count
            },
            messages: {
                today: messagesToday,
                week: messagesWeek
            },
            topExercises,
            period: {
                weekStart: weekStart.toISOString(),
                generatedAt: now.toISOString()
            }
        });
    } catch (error) {
        console.error('Stats API error:', error);
        return res.status(500).json({ error: 'تعذر تحميل الإحصائيات حالياً' });
    }
};
