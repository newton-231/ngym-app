module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // فحص وقراءة الـ body بكل الاحتمالات الممكنة
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        body = body || {};

        // البحث عن النص بأي اسم محتمل يرسله الفرونت إند
        const userMessage = body.message || body.prompt || body.text || body.content || 
                          (body.messages && body.messages[body.messages.length - 1]?.content) ||
                          (body.messages && body.messages[body.messages.length - 1]?.text);

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY مفقود في إعدادات Vercel Environment Variables' });
        }

        if (!userMessage) {
            return res.status(400).json({ 
                error: 'الطلب وصل للسيرفر ولكن حقل النص فارغ أو غير مطابق', 
                receivedBodyKeys: Object.keys(body) 
            });
        }

        const contents = [
            {
                role: 'user',
                parts: [{ text: String(userMessage) }]
            }
        ];

        const apiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents })
            }
        );

        const data = await apiResponse.json();

        // في حال رفضت جوجل الطلب، سنطبع الخطأ الحقيقي تماماً
        if (!apiResponse.ok) {
            return res.status(apiResponse.status).json({ 
                error: 'رفض من Google API', 
                googleError: data.error || data 
            });
        }

        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم استلام رد من النموذج.';
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        return res.status(500).json({ error: 'خطأ داخلي في السيرفر: ' + error.message });
    }
};
