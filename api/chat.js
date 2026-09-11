const fs = require('fs');
const path = require('path');

function loadExerciseCatalog() {
    try {
        const exercises = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'data', 'exercises.json'), 'utf8'));
        const manifest = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'assets', 'gifs', 'manifest.json'), 'utf8'));
        return exercises.map(exercise => {
            const name = exercise.name_en || exercise.name || exercise.id;
            const arabicName = exercise.name_ar || exercise.arabic_name || '';
            return `${exercise.id} | ${arabicName ? `${arabicName} / ` : ''}${name}${manifest[exercise.id] ? ' | GIF available' : ''}`;
        }).join('\n');
    } catch (error) {
        console.error('تعذر تحميل فهرس التمارين للمدرب:', error);
        return '';
    }
}

const exerciseCatalog = loadExerciseCatalog();
const systemInstruction = `أنت مدرب تمارين ولياقة بدنية. أجب بالعربية عند الإمكان، واحتفظ بأسماء التمارين الإنجليزية عند الحاجة.
قائمة التمارين ومعرفاتها:
${exerciseCatalog}

عندما تقترح أو تشرح تمرينًا له GIF متاح، أضف وسمًا في سطر مستقل بالصيغة [GIF: exercise_id] باستخدام المعرف الموجود في القائمة. لا تستخدم هذا الوسم إلا للمعرفات الصحيحة.`;

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        body = body || {};

        console.log('📥 البيانات المستلمة:', JSON.stringify(body));

        // ✅ التعديل الأهم: إضافة promptText في بداية البحث
        const userMessage = body.promptText ||
                           body.userMessage ||
                           body.message ||
                           body.prompt ||
                           body.text ||
                           body.content ||
                           (body.messages && body.messages[body.messages.length - 1]?.content) ||
                           null;

        const imageBase64 = body.image || body.imageBase64 || null;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY مفقود' });
        }

        if (!userMessage) {
            console.error('❌ الرسالة فارغة! البيانات:', JSON.stringify(body));
            return res.status(400).json({ 
                error: 'الرسالة فارغة',
                received: body
            });
        }

        const requestBody = {
            system_instruction: { parts: [{ text: systemInstruction }] },
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
            console.error('❌ خطأ Google:', JSON.stringify(data));
            return res.status(apiResponse.status).json({
                error: data.error?.message || 'خطأ من سيرفر جوجل'
            });
        }

        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                         'لم يتم استلام رد';

        console.log('✅ الرد المرسل:', replyText);

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error('❌ خطأ داخلي:', error);
        return res.status(500).json({ error: 'خطأ داخلي: ' + error.message });
    }
};module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            try { body = JSON.parse(body); } catch (e) {}
        }
        body = body || {};

        console.log('📥 البيانات المستلمة:', JSON.stringify(body));

        // ✅ التعديل الأهم: إضافة promptText في بداية البحث
        const userMessage = body.promptText ||
                           body.userMessage ||
                           body.message ||
                           body.prompt ||
                           body.text ||
                           body.content ||
                           (body.messages && body.messages[body.messages.length - 1]?.content) ||
                           null;

        const imageBase64 = body.image || body.imageBase64 || null;

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'مفتاح GEMINI_API_KEY مفقود' });
        }

        if (!userMessage) {
            console.error('❌ الرسالة فارغة! البيانات:', JSON.stringify(body));
            return res.status(400).json({ 
                error: 'الرسالة فارغة',
                received: body
            });
        }

        const requestBody = {
            system_instruction: { parts: [{ text: systemInstruction }] },
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
            console.error('❌ خطأ Google:', JSON.stringify(data));
            return res.status(apiResponse.status).json({
                error: data.error?.message || 'خطأ من سيرفر جوجل'
            });
        }

        const replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || 
                         'لم يتم استلام رد';

        console.log('✅ الرد المرسل:', replyText);

        return res.status(200).json({ reply: replyText });

    } catch (error) {
        console.error('❌ خطأ داخلي:', error);
        return res.status(500).json({ error: 'خطأ داخلي: ' + error.message });
    }
};
