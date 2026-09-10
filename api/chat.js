module.exports = async (req, res) => {
    // 1. التأكد من أن الطلب هو POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        // 2. قراءة البيانات المرسلة من التطبيق
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        body = body || {};

        // 3. تسجيل ما وصل للخادم للتشخيص
        console.log('📥 البيانات المستلمة:', JSON.stringify(body));

        // 4. استخراج الرسالة من أي حقل ممكن
        const userMessage = body.userMessage ||    // من app.js
                           body.message ||        // احتياطي
                           body.prompt ||         // احتياطي
                           body.text ||           // احتياطي
                           body.content ||        // احتياطي
                           (body.messages && body.messages[body.messages.length - 1]?.content) ||
                           null;

        // 5. استخراج الصورة إن وجدت
        const imageBase64 = body.image || body.imageBase64 || null;

        // 6. التحقق من وجود المفتاح
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY مفقود' });
        }

        // 7. التحقق من وجود الرسالة
        if (!userMessage) {
            console.error('❌ الرسالة فارغة! البيانات المستلمة:', body);
            return res.status(400).json({ 
                error: 'الرسالة فارغة. يرجى كتابة نص.',
                received: body
            });
        }

        // 8. بناء الطلب إلى Gemini
        const requestBody = {
            contents: [{
                parts: [{ text: String(userMessage) }]
            }]
        };

        // 9. إضافة الصورة إن وجدت
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

        // 10. إرسال الطلب إلى Gemini
        const apiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey.trim()}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody)
            }
        );

        const data = await apiResponse.json();

        // 11. معالجة الأخطاء من Google
        if (!apiResponse.ok) {
            console.error('❌ خطأ Google:', JSON.stringify(data));
            return res.status(apiResponse.status).json({
                error: data.error?.message || 'خطأ من سيرفر جوجل'
            });
        }

        // 12. استخراج الرد
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                         'لم يتم استلام رد';

        console.log('✅ الرد المرسل:', replyText);

        // 13. إرجاع الرد
        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error('❌ خطأ داخلي:', error);
        return res.status(500).json({ error: 'خطأ داخلي: ' + error.message });
    }
};
