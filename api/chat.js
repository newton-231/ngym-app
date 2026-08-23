// هنا نقوم بضبط ترتيب أدوار الشات وتنسيق طلب Gemini بشكل آمن
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { messages, systemPrompt, imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير متعرف عليه في Vercel' });
    }

    try {
        const cleanContents = [];
        const recent = (messages || []).slice(-8);

        for (const msg of recent) {
            const role = msg.role === 'model' ? 'model' : 'user';
            const parts = [];

            if (msg.imageBase64) {
                parts.push({ inline_data: { mime_type: "image/jpeg", data: msg.imageBase64 } });
            }
            if (msg.text) {
                parts.push({ text: msg.text });
            }

            if (parts.length === 0) continue;

            // دمج الرسائل المتتالية من نفس الطرف لضمان تناوب الأدوّار (user -> model)
            if (cleanContents.length > 0 && cleanContents[cleanContents.length - 1].role === role) {
                cleanContents[cleanContents.length - 1].parts.push(...parts);
            } else {
                cleanContents.push({ role, parts });
            }
        }

        // التأكد من أن الترتيب ينتهي بدور user
        if (cleanContents.length === 0 || cleanContents[cleanContents.length - 1].role !== 'user') {
            cleanContents.push({ role: 'user', parts: [{ text: 'مرحباً' }] });
        }

        const requestBody = { contents: cleanContents };

        if (systemPrompt) {
            requestBody.system_instruction = {
                parts: [{ text: systemPrompt }]
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
            console.error("Gemini API Error:", data);
            return res.status(response.status).json({ error: data.error?.message || 'خطأ في استجابة المحرك' });
        }

        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "لم أستطع فهم ذلك، حاول مجدداً.";
        return res.status(200).json({ reply: responseText });

    } catch (error) {
        return res.status(500).json({ error: 'عطل تقني في الخادم' });
    }
}
