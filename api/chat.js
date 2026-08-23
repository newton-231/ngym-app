// هنا نقوم باستقبال طلبات الشات والتحقق منها وإخفاء مفتاح Gemini
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { messages, systemPrompt, imageBase64 } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY غير معرف في متغيرات Vercel' });
    }

    try {
        let contents = [];

        // هنا نقوم بتثبيت سياق المستخدم والهدف والوضع الافتراضي (تمارين منزلية / لياقة)
        if (systemPrompt) {
            contents.push({ role: "user", parts: [{ text: systemPrompt }] });
            contents.push({ role: "model", parts: [{ text: "فهمت تماماً، أنا مدربك الشخصي وجاهز لمساعدتك." }] });
        }

        // إرفاق آخر 6 رسائل فقط للحفاظ على توكينات المحادثة
        const recentMessages = (messages || []).slice(-6);
        for (const msg of recentMessages) {
            const parts = [];
            if (msg.imageBase64) {
                parts.push({
                    inline_data: { mime_type: "image/jpeg", data: msg.imageBase64 }
                });
            }
            if (msg.text) {
                parts.push({ text: msg.text });
            }
            contents.push({
                role: msg.role === 'model' ? 'model' : 'user',
                parts: parts.length > 0 ? parts : [{ text: "..." }]
            });
        }

        // إضافة صورة جديدة إن وجدت في الطلب الحالي
        if (imageBase64 && messages?.length === recentMessages.length) {
            const lastIndex = contents.length - 1;
            if (contents[lastIndex]?.role === 'user') {
                contents[lastIndex].parts.push({
                    inline_data: { mime_type: "image/jpeg", data: imageBase64 }
                });
            }
        }

        // الاتصال المباشر بـ Gemini Flash API
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey.trim()}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: contents })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            let userMessage = 'حدث خطأ في الاتصال بالسيرفر';
            if (data.error?.message?.includes('quota')) userMessage = 'تم تجاوز حد الطلبات المجاني اليومي، حاول غداً';
            return res.status(response.status).json({ error: userMessage });
        }

        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "عذراً، لم أستطع فهم ذلك، حاول مجدداً";
        return res.status(200).json({ reply: responseText });

    } catch (error) {
        return res.status(500).json({ error: 'عطل تقني في الخادم، حاول لاحقاً' });
    }
}
