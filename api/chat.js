module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        const userMessage = body.userMessage || body.message || body.prompt || body.text || 
                           body.content || (body.messages && body.messages[body.messages.length - 1]?.content);

        const imageBase64 = body.image || body.imageBase64 || null;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY مفقود في إعدادات Vercel' });
        }

        if (!userMessage) {
            return res.status(400).json({ error: 'النص المدخل فارغ' });
        }

        const requestBody = {
            contents: [{
                parts: [{ text: String(userMessage) }]
            }]
        };

        if (imageBase64) {
            const cleanBase64 = imageBase64.includes(',') 
                ? imageBase64.split(',')[1] 
                : imageBase64;
            requestBody.contents[0].parts.push({
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: cleanBase64
                }
            });
        }

        // ✅ التعديل المطلوب هنا: تغيير النموذج إلى gemini-3.6-flash
        const apiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error('Google API Error:', JSON.stringify(data));
            return res.status(apiResponse.status).json({
                error: data.error?.message || 'خطأ من سيرفر جوجل'
            });
        }

        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                         'لم يتم استلام رد من النموذج.';

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error('Server Error:', error);
        return res.status(500).json({ error: 'خطأ داخلي في السيرفر: ' + error.message });
    }
};
