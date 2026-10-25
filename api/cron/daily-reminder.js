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

function isAuthorized(req) {
    const secret = process.env.CRON_SECRET;
    if (!secret) return false;

    const authorization = String(req.headers.authorization || '');
    const match = authorization.match(/^Bearer\s+(.+)$/i);
    if (!match) return false;

    const supplied = Buffer.from(match[1]);
    const expected = Buffer.from(secret);
    return supplied.length === expected.length && crypto.timingSafeEqual(supplied, expected);
}

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'غير مصرح' });
    }

    try {
        const snapshot = await getDatabase().collection('users')
            .where('fcmToken', '!=', null)
            .limit(100)
            .get();
        const tokens = snapshot.docs
            .map(doc => doc.data()?.fcmToken)
            .filter(token => typeof token === 'string' && token.trim());

        const results = await Promise.allSettled(tokens.map(token => admin.messaging().send({
            token,
            notification: {
                title: 'NGym',
                body: '💪 حان وقت تمرينك اليومي في NGym!'
            },
            webpush: {
                fcmOptions: { link: '/' }
            }
        })));
        const sent = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.length - sent;

        return res.status(200).json({ success: true, eligible: tokens.length, sent, failed });
    } catch (error) {
        console.error('Daily reminder cron error:', error);
        return res.status(500).json({ error: 'تعذر إرسال التذكيرات اليومية' });
    }
};
