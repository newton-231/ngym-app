module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let body = req.body;
        
        // طباعة البيانات القادمة في سجلات Vercel لنراها بوضوح
        console.log("Received Body from Frontend:", JSON.stringify(body));

        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        body = body || {};

        // البحث عن النص بأي اسم محتمل أو حتى أول نص متاح في الكائن
        let userMessage = body.message || body.prompt || body.text || body.content || body.msg;

        if (!userMessage && typeof body === 'object') {
            for (let key of Object.keys(body)) {
                if (typeof body[key] === 'string' && body[key].trim().length > 0) {
                    userMessage = body[key];
                    break;
                }
            }
        }

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY مفقود في إعدادات Vercel' });
        }

        if (!userMessage) {
            return res.status(400).json({ 
                error: 'الطلب وصل ولكن لم يتم العثور على أي حقل نصي صالح في الـ Body',
                received: body 
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

        if (!apiResponse.ok) {
            console.error("Google API Error Details:", data);
            return res.status(apiResponse.status).json({ 
                error: data.error?.message || 'خطأ من خدمة جوجل',
                details: data 
            });
        }

        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم استلام رد.';
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error("Server Exception:", error);
        return res.status(500).json({ error: 'خطأ بالسيرفر: ' + error.message });
    }
};
