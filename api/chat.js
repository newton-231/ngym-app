module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        body = body || {};

        const userMessage = body.message || body.prompt || body.text || body.content || 
                          (body.messages && body.messages[body.messages.length - 1]?.content) ||
                          (body.messages && body.messages[body.messages.length - 1]?.text);

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY مفقود تماماً من Vercel' });
        }

        if (!userMessage) {
            return res.status(400).json({ error: 'النص المدخل في الشات فارغ', receivedBody: body });
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

        const responseText = await apiResponse.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (e) {
            data = { rawText: responseText };
        }

        if (!apiResponse.ok) {
            // إرجاع الخطأ الخام الذي تقوله جوجل حرفياً للمتصفح
            return res.status(apiResponse.status).json({
                googleErrorDetails: data,
                status: apiResponse.status
            });
        }

        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم استلام رد نصي من النموذج.';
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        return res.status(500).json({ error: 'خطأ غير متوقع في السيرفر: ' + error.message });
    }
};
