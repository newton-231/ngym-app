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

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let body = req.body || {};
        if (typeof body === 'string') body = JSON.parse(body);

        const code = typeof body.code === 'string' ? body.code.trim() : '';
        const deviceId = typeof body.deviceId === 'string' ? body.deviceId.trim() : '';
        if (!code || !deviceId) {
            return res.status(400).json({ error: 'الكود ومعرّف الجهاز مطلوبان' });
        }

        const db = getDatabase();
        const codeRef = db.collection('codes').doc(code);
        const userRef = db.collection('users').doc(deviceId);
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
                usedBy: deviceId
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
