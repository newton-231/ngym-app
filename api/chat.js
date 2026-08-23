// هنا نقوم بضبط هيلكة الطلبات وفقاً لشروط Gemini REST API الرسمية (camelCase)
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { messages, systemPrompt, imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey || !apiKey.trim()) {
        return res.status(500).json({ 
            error: 'لم يتم العثور على مفتاح GEMINI_API_KEY في متغيراّت بيئة Vercel. يرجى إضافته من Vercel Settings -> Environment Variables.' 
        });
    }

    try {
        const cleanContents = [];
        const recent = (messages || []).slice(-10);

        for (const msg of recent) {
            const role = msg.role === 'model' ? 'model' : 'user';
            const parts = [];

            if (msg.imageBase64) {
                // إزالة البادئة data:image/jpeg;base64, إن وجدت
                const cleanB64 = msg.imageBase64.includes(',') 
                    ? msg.imageBase64.split(',')[1] 
                    : msg.imageBase64;
                parts.push({ 
                    inlineData: { 
                        mimeType: "image/jpeg", 
                        data: cleanB64 
                    } 
                });
            }

            if (msg.text && msg.text.trim()) {
                parts.push({ text: msg.text.trim() });
            }

            if (parts.length === 0) continue;

            // دمج الرسائل المتتالية من نفس الطرف
            if (cleanContents.length > 0 && cleanContents[cleanContents.length - 1].role === role) {
                cleanContents[cleanContents.length - 1].parts.push(...parts);
            } else {
                cleanContents.push({ role, parts });
            }
        }

        // التأكد من أن الرسالة الأولى هي من user دائماً كما تشترط API
        while (cleanContents.length > 0 && cleanContents[0].role !== 'user') {
            cleanContents.shift();
        }

        if (cleanContents.length === 0) {
            cleanContents.push({ role: 'user', parts: [{ text: 'مرحباً' }] });
        }

        const requestBody = { contents: cleanContents };

        // استخدام systemInstruction بأسلوب camelCase الخاص بـ REST API
        if (systemPrompt && systemPrompt.trim()) {
            requestBody.systemInstruction = {
                parts: [{ text: systemPrompt.trim() }]
            };
        }

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
            return res.status(500).json({ error: 'لم يقم النموذج بإرجاع نص. قد تكون الإجابة محجوبة لدواعي الأمان.' });
        }

        return res.status(200).json({ reply: responseText });

    } catch (error) {
        console.error("Server Internal Error:", error);
        return res.status(500).json({ error: `عطل تقني في السيرفر الداخلي: ${error.message}` });
    }
}
