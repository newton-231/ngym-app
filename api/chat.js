// هنا نقوم بمعالجة الطلبات الآمنة عبر Vercel Serverless Function دون إظهار مفتاح الـ API للعميل
export default async function handler(req, res) {
    // التأكد من أن الطلب القادم هو من نوع POST فقط
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { promptText } = req.body;
    // جلب مفتاح الـ API المحمي المخزن في متغيرات بيئة Vercel
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير معرف في إعدادات Vercel' });
    }

    try {
        // الاتصال بنموذج gemini-2.5-flash المتوافق مع الإصدار الحالي
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
            })
        });

        const data = await response.json();

        // التحقق مما إذا كانت الاستجابة تحتوي على خطأ من جوجل
        if (!response.ok) {
            console.error('Gemini API Error:', data);
            return res.status(response.status).json({ error: data.error?.message || 'خطأ في الاستجابة من Gemini API' });
        }

        // إرجاع النتيجة بنجاح إلى التطبيق
        return res.status(200).json(data);
    } catch (error) {
        console.error('Server Handler Error:', error);
        return res.status(500).json({ error: 'حدث خطأ في الاتصال بالخادم الداخلي' });
    }
}
