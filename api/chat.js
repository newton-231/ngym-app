// api/chat.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { userMessage, image, messages, systemPrompt } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
        return res.status(500).json({ 
            error: 'لم يتم العثور على مفتاح GEMINI_API_KEY في متغيرات بيئة Vercel.' 
        });
    }

    try {
        let cleanContents = [];

        // إذا تم إرسال سجل محادثة كاملاً
        if (messages && Array.isArray(messages) && messages.length > 0) {
            const recent = messages.slice(-10);
            for (const msg of recent) {
                const role = msg.role === 'model' ? 'model' : 'user';
                const parts = [];

                if (msg.imageBase64 || msg.image) {
                    const imgData = msg.imageBase64 || msg.image;
                    const cleanB64 = imgData.includes(',') ? imgData.split(',')[1] : imgData;
                    parts.push({ 
                        inlineData: { mimeType: "image/jpeg", data: cleanB64 } 
                    });
                }

                if (msg.text && msg.text.trim()) {
                    parts.push({ text: msg.text.trim() });
                }

                if (parts.length > 0) {
                    cleanContents.push({ role, parts });
                }
            }
        } else {
            // في حالة إرسال رسالة منفردة وصورة من app.js
            const parts = [];
            if (image) {
                const cleanB64 = image.includes(',') ? image.split(',')[1] : image;
                parts.push({ 
                    inlineData: { mimeType: "image/jpeg", data: cleanB64 } 
                });
            }
            if (userMessage && userMessage.trim()) {
                parts.push({ text: userMessage.trim() });
            }
            if (parts.length > 0) {
                cleanContents.push({ role: 'user', parts });
            }
        }

        if (cleanContents.length === 0) {
            cleanContents.push({ role: 'user', parts: [{ text: 'مرحباً' }] });
        }

        const requestBody = { contents: cleanContents };

        // إضافة التعليمات البرمجية أو توجيهات المدرب الشخصي
        const defaultSystemPrompt = systemPrompt || "أنت كوتش لياقة بدنية وخبير تغذية رياضية ذكي. أجب باللغة العربية بأسلوب مشجع ومختصر ومباشر.";
        requestBody.systemInstruction = {
            parts: [{ text: defaultSystemPrompt.trim() }]
        };

        // استخدام نموذج Gemini المعتمد والمتاح رسمياً (gemini-1.5-flash)
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error("Gemini API Error Response:", data);
            const message = data.error?.message || 'خطأ غير معروف من خادم Gemini';
            return res.status(response.status).json({ error: `خطأ Gemini API: ${message}` });
        }

        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
            return res.status(500).json({ error: 'لم يقم النموذج بإرجاع نص.' });
        }

        return res.status(200).json({ reply: responseText });

    } catch (error) {
        console.error("Server Internal Error:", error);
        return res.status(500).json({ error: `عطل تقني في السيرفر الداخلي: ${error.message}` });
    }
}
