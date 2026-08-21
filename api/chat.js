// هنا نقوم بمعالجة الطلبات الآمنة عبر Vercel Serverless Function
export default async function handler(req, res) {
    // التأكد من أن الطلب من نوع POST فقط
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { promptText } = req.body;
    // قراءة مفتاح الـ API المخفي في متغيرات بيئة Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'مفتاح API غير معرف في إعدادات Vercel' });
    }

    try {
        // إرسال الطلب إلى Gemini API بشكل آمن من السيرفر
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }],
                generationConfig: { maxOutputTokens: 150, temperature: 0.7 }
            })
        });

        const data = await response.json();
        // إعادة النتيجة إلى التطبيق
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: 'حدث خطأ أثناء الاتصال بالخادم' });
    }
}
