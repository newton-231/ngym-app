const admin = require('firebase-admin');
const crypto = require('crypto');
const attempts = new Map();
function database() {
    if (!admin.apps.length) {
        const a = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
        admin.initializeApp({ credential: admin.credential.cert({ projectId: a.project_id, clientEmail: a.client_email, privateKey: (a.private_key || '').replace(/\\n/g, '\n') }) });
    }
    return admin.firestore();
}
function normalizeCode(value) { return String(value || '').trim().toUpperCase(); }
module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
    try {
        const header = req.headers.authorization || '';
        if (!/^Bearer\s+/i.test(header)) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
        database();
        const decoded = await admin.auth().verifyIdToken(header.replace(/^Bearer\s+/i, '').trim());
        const key = `${decoded.uid}:${ip}`, item = attempts.get(key) || { count: 0, at: Date.now() };
        if (Date.now() - item.at > 3600000) item.count = 0;
        if (item.count >= 10) return res.status(429).json({ error: 'محاولات كثيرة، حاول لاحقاً' });
        item.count++; item.at = Date.now(); attempts.set(key, item);
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const code = normalizeCode(body.code);
        if (!/^NGYM-[A-Z0-9]{8,}$/.test(code)) return res.status(400).json({ error: 'الكود غير صالح' });
        const db = database(), codeRef = db.collection('codes').doc(code), userRef = db.collection('users').doc(decoded.uid);
        const result = await db.runTransaction(async tx => {
            const [codeDoc, userDoc] = await Promise.all([tx.get(codeRef), tx.get(userRef)]);
            const data = codeDoc.exists ? codeDoc.data() : {};
            if (!codeDoc.exists || data.isUsed || (data.expiresAt && new Date(data.expiresAt).getTime() < Date.now())) { const e = new Error('INVALID'); e.statusCode = 400; throw e; }
            if (!userDoc.exists || !userDoc.data().phone) { const e = new Error('PHONE_REQUIRED'); e.statusCode = 403; throw e; }
            if (!data.phone || userDoc.data().phone !== data.phone) { const e = new Error('PHONE_MISMATCH'); e.statusCode = 403; throw e; }
            const now = new Date();
            const currentEnd = new Date(userDoc.data().subscriptionEndDate || 0);
            const start = !Number.isNaN(currentEnd.getTime()) && currentEnd > now ? currentEnd : now;
            const endDate = new Date(start.getTime() + Number(data.days || 30) * 86400000);
            const end = endDate.toISOString();
            tx.update(codeRef, { isUsed: true, usedBy: decoded.uid, usedAt: now.toISOString() });
            tx.set(userRef, { subscriptionEndDate: end, updatedAt: now.toISOString() }, { merge: true });
            tx.set(db.collection('phones').doc(data.phone), { subscriptionEndDate: end, lastActivatedAt: now.toISOString() }, { merge: true });
            return end;
        });
        return res.status(200).json({ subscriptionEndDate: result });
    } catch (error) {
        if (error.statusCode === 403) return res.status(403).json({ error: error.message === 'PHONE_REQUIRED' ? 'لم يتم تسجيل رقم هاتف' : 'الكود مخصص لرقم آخر' });
        if (error.statusCode === 400) return res.status(400).json({ error: 'الكود غير صالح أو منتهي' });
        console.error('Activate API error:', error); return res.status(500).json({ error: 'تعذر تفعيل الكود حالياً' });
    }
};
