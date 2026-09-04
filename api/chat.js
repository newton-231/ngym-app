module.exports = async (req, res) => {
    // السماح فقط بطلبات POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { message, history } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير معرف في Environment Variables' });
        }

        // إعداد محادثة Gemini
        const contents = [];
        
        // إضافة السجل الساق إن وجد
        if (history && Array.isArray(history)) {
            history.forEach(item => {
                contents.push({
                    role: item.role === 'user' ? 'user' : 'model',
                    parts: [{ text: item.text }]
                });
            });
        }

        // إضافة الرسالة الحالية
        contents.push({
            role: 'user',
            parts: [{ text: message }]
        });

        // استدعاء Gemini API مع النموذج الصحيح gemini-1.5-flash
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ contents })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('Gemini API Error Response:', data);
            return res.status(response.status).json({ 
                error: data.error?.message || 'حدث خطأ أثناء التواصل مع Gemini API' 
            });
        }

        // استخراج النص من الاستجابة
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم استلام رد من النموذج.';

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: 'حدث خطأ داخلي في السيرفر' });
    }
};
