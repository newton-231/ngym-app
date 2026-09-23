const admin = require('firebase-admin');

function db() {
    if (!admin.apps.length) {
        const account = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
        admin.initializeApp({ credential: admin.credential.cert({
            projectId: account.project_id, clientEmail: account.client_email,
            privateKey: (account.private_key || '').replace(/\\n/g, '\n')
        }) });
    }
    return admin.firestore();
}
function phone(value) {
    const valueString = String(value || '').replace(/[^\d+]/g, '');
    const normalized = valueString.startsWith('+') ? `+${valueString.slice(1).replace(/\D/g, '')}` : `+${valueString.replace(/\D/g, '')}`;
    return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}
async function uid(req, res) {
    const header = req.headers.authorization || '';
    if (!/^Bearer\s+/i.test(header)) { res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' }); return null; }
    try { db(); return (await admin.auth().verifyIdToken(header.replace(/^Bearer\s+/i, '').trim())).uid; }
    catch (_) { res.status(401).json({ error: 'رمز المصادقة غير صالح' }); return null; }
}
module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        const userId = await uid(req, res); if (!userId) return;
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        if (!String(body.phone || '').trim().startsWith('+')) {
            return res.status(400).json({ error: 'رقم الهاتف يجب أن يكون بصيغة دولية' });
        }
        const normalized = phone(body.phone);
        if (!normalized) return res.status(400).json({ error: 'رقم الهاتف غير صالح' });
        const database = db();
        const userRef = database.collection('users').doc(userId);
        const phoneRef = database.collection('phones').doc(normalized);
        const now = new Date();
        const result = await database.runTransaction(async transaction => {
            const phoneDoc = await transaction.get(phoneRef);
            const userDoc = await transaction.get(userRef);
            const data = userDoc.exists ? userDoc.data() : {};
            const phoneData = phoneDoc.exists ? phoneDoc.data() : {};
            const isNewTrial = !phoneDoc.exists;
            const trialEnd = phoneData.trialEndDate || data.trialEndDate ||
                new Date(now.getTime() + 30 * 86400000).toISOString();
            const linkedUids = Array.isArray(phoneData.linkedUids) ? phoneData.linkedUids : [];
            if (!linkedUids.includes(userId)) linkedUids.push(userId);
            transaction.set(phoneRef, {
                phone: normalized,
                linkedUids,
                trialEndDate: trialEnd,
                subscriptionEndDate: phoneData.subscriptionEndDate || data.subscriptionEndDate || null,
                ...(isNewTrial ? { trialUsedAt: now.toISOString(), createdAt: now.toISOString() } : {}),
                updatedAt: now.toISOString()
            }, { merge: true });
            transaction.set(userRef, {
                uid: userId, phone: normalized, createdAt: data.createdAt || now.toISOString(),
                lastLoginAt: now.toISOString(), trialEndDate: trialEnd,
                subscriptionEndDate: phoneData.subscriptionEndDate || data.subscriptionEndDate || null
            }, { merge: true });
            return {
                trialEndDate: trialEnd,
                subscriptionEndDate: phoneData.subscriptionEndDate || data.subscriptionEndDate || null,
                isNewTrial
            };
        });
        return res.status(200).json({ phone: normalized, ...result });
    } catch (error) {
        console.error('Register API error:', error);
        return res.status(500).json({ error: 'تعذر تسجيل الحساب حالياً' });
    }
};
module.exports.normalizePhone = phone;
module.exports.getDatabase = db;
