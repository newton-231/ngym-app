const crypto = require('crypto');
const admin = require('firebase-admin');

function getAdminApp() {
    if (admin.apps.length) return admin.app();
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    if (!serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not configured');
    }
    return admin.initializeApp({
        credential: admin.credential.cert({
            projectId: serviceAccount.project_id,
            clientEmail: serviceAccount.client_email,
            privateKey: serviceAccount.private_key.replace(/\\n/g, '\n')
        })
    });
}

function signToken() {
    const expiry = Date.now() + 8 * 60 * 60 * 1000;
    const payload = Buffer.from(JSON.stringify({ role: 'admin', expiry })).toString('base64url');
    const signature = crypto.createHmac('sha256', process.env.ADMIN_SECRET || '').update(payload).digest('base64url');
    return `${payload}.${signature}`;
}

function isValidToken(request) {
    const token = (request.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const [payload, signature] = token.split('.');
    if (!payload || !signature || !process.env.ADMIN_SECRET) return false;
    const expected = crypto.createHmac('sha256', process.env.ADMIN_SECRET).update(payload).digest('base64url');
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return false;
    try {
        const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
        return data.role === 'admin' && data.expiry > Date.now();
    } catch (error) {
        return false;
    }
}

module.exports = async (req, res) => {
    try {
        let body = req.body || {};
        if (typeof body === 'string') body = JSON.parse(body);
        const action = body.action || req.query.action;

        if (action === 'login') {
            if (!process.env.ADMIN_SECRET || !process.env.ADMIN_PASSWORD) {
                return res.status(500).json({ error: 'Admin secrets are not configured' });
            }
            if (req.method !== 'POST' || body.password !== process.env.ADMIN_PASSWORD) {
                return res.status(401).json({ error: 'كلمة المرور غير صحيحة' });
            }
            return res.status(200).json({ token: signToken() });
        }

        if (!isValidToken(req)) return res.status(401).json({ error: 'غير مصرح' });
        const db = getAdminApp().firestore();

        if (action === 'list' && req.method === 'GET') {
            const snapshot = await db.collection('codes').orderBy('createdAt', 'desc').limit(20).get();
            return res.status(200).json(snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() })));
        }

        if (action === 'generate' && req.method === 'POST') {
            const requestedDays = Number.parseInt(body.days, 10) || 30;
            const days = [30, 90, 365].includes(requestedDays) ? requestedDays : 30;
            const rawPhone = String(body.phone || '').replace(/[^\d+]/g, '');
            if (!String(body.phone || '').trim().startsWith('+')) return res.status(400).json({ error: 'رقم الهاتف يجب أن يكون بصيغة دولية' });
            const phone = rawPhone.startsWith('+') ? `+${rawPhone.slice(1).replace(/\D/g, '')}` : `+${rawPhone.replace(/\D/g, '')}`;
            if (!/^\+[1-9]\d{7,14}$/.test(phone)) return res.status(400).json({ error: 'رقم الهاتف غير صالح ومطلوب' });
            const code = `NGYM-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
            const now = new Date();
            const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            await db.collection('codes').doc(code).create({
                code, phone, days, isUsed: false, usedAt: null, usedBy: null,
                expiresAt, createdAt: now.toISOString()
            });
            const text = encodeURIComponent(`كود تفعيل NGym الخاص بك: ${code}\nصالح لمدة ${days} يوم.`);
            const whatsappLink = `https://wa.me/${phone.replace('+', '')}?text=${text}`;
            return res.status(201).json({ code, expiresAt, whatsappLink, whatsappUrl: whatsappLink });
        }

        return res.status(400).json({ error: 'عملية غير مدعومة' });
    } catch (error) {
        console.error('Admin API error:', error);
        return res.status(500).json({ error: 'خطأ داخلي في خدمة الإدارة' });
    }
};
