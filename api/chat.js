export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { promptText } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير معرف في Vercel' });
    }

    try {
        // تحديث المسار إلى gemini-2.5-flash المعتمد في رسالة الخطأ
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

        if (!response.ok) {
            console.error('Gemini API Error:', data);
            return res.status(response.status).json({ error: data.error?.message || 'خطأ في استجابة Gemini API' });
        }

        return res.status(200).json(data);
    } catch (error) {
        console.error('Server Handler Error:', error);
        return res.status(500).json({ error: 'حدث خطأ في الاتصال بالخادم الداخلي' });
    }
}
