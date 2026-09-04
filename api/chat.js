module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // قراءة الرسالة سواء أرسلت كـ message أو prompt أو content
        const { message, prompt, history, messages } = req.body;
        const userMessage = message || prompt || (messages && messages[messages.length - 1]?.content);

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير معرف' });
        }

        if (!userMessage) {
            return res.status(400).json({ error: 'لم يتم استلام أي نص في الطلب' });
        }

        // بناء الـ contents بشكل سليم ومقبول لدى Gemini API
        const contents = [
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ];

        // استدعاء Gemini 1.5 Flash
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
            console.error('Gemini API Error Detail:', JSON.stringify(data));
            return res.status(response.status).json({ 
                error: data.error?.message || 'حدث خطأ في استجابة Gemini API' 
            });
        }

        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم استلام رد من النموذج.';

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error('Server Exception:', error);
        return res.status(500).json({ error: 'حدث خطأ داخلي في السيرفر' });
    }
};
