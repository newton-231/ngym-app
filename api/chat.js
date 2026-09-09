module.exports = async (req, res) => {
    // التأكد من أن الطلب هو POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // قراءة الجسم (body) من الطلب
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        // ✅ حل المشكلة: البحث عن userMessage كما يرسلها التطبيق الأمامي
        const userMessage = body.userMessage || body.message || body.prompt || body.text || 
                           body.content || (body.messages && body.messages[body.messages.length - 1]?.content);

        // التأكد من وجود المفتاح في متغيرات البيئة
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY مفقود في إعدادات Vercel' });
        }

        // التأكد من وجود نص للرسالة
        if (!userMessage) {
            return res.status(400).json({ error: 'النص المدخل فارغ' });
        }

        // بناء الطلب إلى Gemini باستخدام الهيكل الصحيح (v1)
        const requestBody = {
            contents: [{
                parts: [{ text: String(userMessage) }]
            }]
        };

        // ✅ استخدام النموذج الأحدث gemini-1.5-flash مع النسخة المستقرة v1
        const apiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await apiResponse.json();

        // معالجة الأخطاء الصادرة من Google
        if (!apiResponse.ok) {
            console.error("Google API Error:", JSON.stringify(data));
            return res.status(apiResponse.status).json({ 
                error: data.error?.message || 'خطأ من سيرفر جوجل' 
            });
        }

        // استخراج النص من الاستجابة
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم استلام رد من النموذج.';
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error("Server Error:", error);
        return res.status(500).json({ error: 'خطأ داخلي في السيرفر: ' + error.message });
    }
};
