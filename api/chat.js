module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { message, prompt, history, messages } = req.body;
        const userMessage = message || prompt || (messages && messages[messages.length - 1]?.content);

        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير موجود في Environment Variables على Vercel' });
        }

        if (!userMessage) {
            return res.status(400).json({ error: 'النص المرسل فارغ' });
        }

        const contents = [
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ];

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

        // إرجاع الخطأ الحقيقي من Google إلى المتصفح مباشرة لنراه
        if (!response.ok) {
            return res.status(response.status).json({ 
                error: `خطأ من جوجل: ${data.error?.message || JSON.stringify(data)}` 
            });
        }

        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'لم يتم استلام رد.';
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        return res.status(500).json({ error: 'خطأ بالسيرفر: ' + error.message });
    }
};
