// ==================================================
// NGym - المدرب الذكي (API Route)
// ملف: api/chat.js
// يعمل على Vercel Serverless Functions
// ==================================================

module.exports = async (req, res) => {
    // ==========================================
    // 1. التحقق من طريقة الطلب
    // ==========================================
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            error: 'Method Not Allowed. يرجى استخدام POST.' 
        });
    }

    // ==========================================
    // 2. قراءة وتحليل البيانات المرسلة
    // ==========================================
    try {
        // تحويل body إذا كان نصاً إلى كائن JSON
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

        // ==========================================
        // 3. استخراج الرسالة النصية (بأكثر من طريقة)
        // ==========================================
        const userMessage = body.userMessage ||    // من app.js (الأساسي)
                           body.message ||        // احتياطي
                           body.prompt ||         // احتياطي
                           body.text ||           // احتياطي
                           body.content ||        // احتياطي
                           (body.messages && body.messages[body.messages.length - 1]?.content) || // تاريخ المحادثة
                           null;

        // ==========================================
        // 4. استخراج الصورة إن وجدت
        // ==========================================
        const imageBase64 = body.image || body.imageBase64 || null;

        // ==========================================
        // 5. التحقق من وجود مفتاح Gemini API
        // ==========================================
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error('❌ GEMINI_API_KEY غير موجود في متغيرات البيئة');
            return res.status(500).json({ 
                error: 'مفتاح GEMINI_API_KEY مفقود. يرجى إضافته في إعدادات Vercel.' 
            });
        }

        // ==========================================
        // 6. التحقق من وجود نص للرسالة
        // ==========================================
        if (!userMessage) {
            return res.status(400).json({ 
                error: 'الرجاء كتابة رسالة للمدرب الذكي.' 
            });
        }

        // ==========================================
        // 7. بناء الطلب إلى Gemini (بالهيكل الصحيح)
        // ==========================================
        const requestBody = {
            contents: [
                {
                    parts: [
                        { text: String(userMessage) }
                    ]
                }
            ]
        };

        // ==========================================
        // 8. إضافة الصورة إلى الطلب (إن وجدت)
        // ==========================================
        if (imageBase64) {
            // تنظيف Base64 (إزالة البيانات الوصفية إن وجدت)
            const cleanBase64 = imageBase64.includes(',') 
                ? imageBase64.split(',')[1] 
                : imageBase64;
            
            requestBody.contents[0].parts.push({
                inline_data: {
                    mime_type: 'image/jpeg',
                    data: cleanBase64
                }
            });
            
            console.log('📸 تم إرفاق صورة مع الطلب');
        }

        // ==========================================
        // 9. إرسال الطلب إلى Gemini API
        // ==========================================
        // استخدام الإصدار v1beta مع النموذج الأحدث gemini-2.0-flash
        const apiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey.trim()}`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            }
        );

        // ==========================================
        // 10. قراءة استجابة Gemini
        // ==========================================
        const data = await apiResponse.json();

        // ==========================================
        // 11. معالجة الأخطاء الصادرة من Google
        // ==========================================
        if (!apiResponse.ok) {
            console.error('❌ خطأ من Google API:', JSON.stringify(data));
            
            // رسائل خطأ مفهومة للمستخدم
            let userMessage = 'حدث خطأ أثناء الاتصال بالمدرب الذكي';
            if (data.error?.message?.includes('quota')) {
                userMessage = 'تم استهلاك الحصة المجانية اليومية، حاول غداً';
            } else if (data.error?.message?.includes('safety')) {
                userMessage = 'تم حظر المحتوى بسبب سياسات الأمان، حاول صياغة السؤال بطريقة أخرى';
            } else if (data.error?.message?.includes('model')) {
                userMessage = 'النموذج غير متوفر حالياً، يرجى المحاولة لاحقاً';
            }
            
            return res.status(apiResponse.status).json({
                error: userMessage,
                details: data.error?.message || 'خطأ غير معروف'
            });
        }

        // ==========================================
        // 12. استخراج النص من الرد
        // ==========================================
        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                         'عذراً، لم أستطع معالجة طلبك. حاول مجدداً.';

        // ==========================================
        // 13. إرجاع الرد إلى التطبيق
        // ==========================================
        console.log('✅ تم إرسال الرد بنجاح');
        return res.status(200).json({ 
            reply: replyText,
            success: true
        });

    } catch (error) {
        // ==========================================
        // 14. معالجة الأخطاء الداخلية للخادم
        // ==========================================
        console.error('❌ خطأ داخلي في الخادم:', error);
        return res.status(500).json({ 
            error: 'حدث عطل تقني في الخادم. يرجى المحاولة مرة أخرى بعد قليل.',
            details: error.message
        });
    }
};
