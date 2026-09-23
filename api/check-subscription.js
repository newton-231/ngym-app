const admin = require('firebase-admin');
function database() {
    if (!admin.apps.length) {
        const a = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
        admin.initializeApp({ credential: admin.credential.cert({ projectId: a.project_id, clientEmail: a.client_email, privateKey: (a.private_key || '').replace(/\\n/g, '\n') }) });
    }
    return admin.firestore();
}
module.exports = async (req, res) => {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    try {
        const header = req.headers.authorization || '';
        if (!/^Bearer\s+/i.test(header)) return res.status(401).json({ error: 'يجب تسجيل الدخول أولاً' });
        database();
        const decoded = await admin.auth().verifyIdToken(header.replace(/^Bearer\s+/i, '').trim());
        const snap = await database().collection('users').doc(decoded.uid).get();
        if (!snap.exists) return res.status(404).json({ error: 'المستخدم غير مسجل' });
        const data = snap.data() || {}, now = Date.now();
        const trialEnd = data.trialEndDate ? new Date(data.trialEndDate).getTime() : 0;
        const subscriptionEnd = data.subscriptionEndDate ? new Date(data.subscriptionEndDate).getTime() : 0;
        const isCoachActive = trialEnd > now || subscriptionEnd > now;
        const end = subscriptionEnd > now ? subscriptionEnd : trialEnd;
        const daysRemaining = end > now ? Math.ceil((end - now) / 86400000) : 0;
        return res.status(200).json({
            trialEndDate: data.trialEndDate || null,
            subscriptionEndDate: data.subscriptionEndDate || null,
            isCoachActive,
            daysRemaining,
            isTrialExpired: trialEnd > 0 && trialEnd < now && subscriptionEnd <= now,
            phone: data.phone || null
        });
    } catch (error) {
        console.error('Subscription API error:', error);
        return res.status(401).json({ error: 'رمز المصادقة غير صالح' });
    }
};
