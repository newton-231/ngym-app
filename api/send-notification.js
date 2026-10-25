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

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    if (!isAuthorized(req)) {
        return res.status(401).json({ error: 'غير مصرح' });
    }

    let body = req.body || {};
    if (typeof body === 'string') {
        try {
            body = JSON.parse(body);
        } catch (error) {
            return res.status(400).json({ error: 'صيغة الطلب غير صالحة' });
        }
    }

    const uid = typeof body.uid === 'string' ? body.uid.trim() : '';
    const title = typeof body.title === 'string' ? body.title.trim() : '';
    const messageBody = typeof body.body === 'string' ? body.body.trim() : '';
    const url = typeof body.url === 'string' && body.url.trim() ? body.url.trim() : '/';
    if (!uid || !title || !messageBody) {
        return res.status(400).json({ error: 'uid و title و body مطلوبة' });
    }
    let isHttpsUrl = false;
    try {
        isHttpsUrl = new URL(url).protocol === 'https:';
    } catch (error) {
        // Relative paths are also valid notification destinations.
    }
    if (!isHttpsUrl && (!url.startsWith('/') || url.startsWith('//'))) {
        return res.status(400).json({ error: 'يجب أن يكون url مساراً داخلياً أو رابط HTTPS' });
    }

    try {
        const db = getDatabase();
        const userDoc = await db.collection('users').doc(uid).get();
        const fcmToken = userDoc.exists ? userDoc.data()?.fcmToken : null;
        if (!fcmToken) {
            return res.status(404).json({ error: 'لا يوجد رمز إشعارات لهذا المستخدم' });
        }

        const messageId = await admin.messaging().send({
            token: fcmToken,
            notification: { title, body: messageBody },
            webpush: { fcmOptions: { link: url } }
        });
        return res.status(200).json({ success: true, messageId });
    } catch (error) {
        console.error('Send notification API error:', error);
        return res.status(500).json({ error: 'تعذر إرسال الإشعار حالياً' });
    }
};
