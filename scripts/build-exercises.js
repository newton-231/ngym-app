#!/usr/bin/env node
/**
 * NGym - استخراج تمارين الـ GIF من ملف البيانات الكبير (hasaneyldrm/exercises-dataset)
 *
 * الاستخدام (من جذر المشروع):
 *   node scripts/build-exercises.js path/to/exercises_72828a.json
 *
 * المخرجات:
 *   data/exercises.json          -> قائمة التمارين المختصرة (بدون فيديو/صور/10 لغات)
 *   assets/gifs/manifest.json    -> id -> "Folder_N/xxxx-yyyy.gif"  (مطابقة 100%)
 *   data/gif-codes.csv           -> جدول للمراجعة (يفتح في Excel)
 *
 * القاعدة الذهبية: الربط بين التمرين والـ GIF يتم فقط عبر اسم ملف GIF الموجود في
 * gif_url داخل نفس سجل التمرين (مثال: videos/0001-2gPfomN.gif). لا يوجد أي
 * ربط بالترتيب (index) إطلاقاً.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const sourcePath = path.resolve(process.argv[2] || path.join(root, 'exercises_72828a.json'));
const gifsRoot = path.join(root, 'assets', 'gifs');
const outExercises = path.join(root, 'data', 'exercises.json');
const outManifest = path.join(gifsRoot, 'manifest.json');
const outCsv = path.join(root, 'data', 'gif-codes.csv');
const IMAGE_EXT = new Set(['.gif', '.png', '.jpg', '.jpeg', '.webp', '.avif']);

// ---------- التصنيف حسب العضلة المستهدفة (يطابق تبويبات التطبيق) ----------
const TARGET_TO_GROUP = {
    'pectorals': 'chest', 'serratus anterior': 'chest',
    'lats': 'back', 'upper back': 'back', 'spine': 'back', 'traps': 'back',
    'delts': 'shoulders', 'levator scapulae': 'shoulders',
    'biceps': 'arms', 'triceps': 'arms', 'forearms': 'arms',
    'abs': 'abs',
    'quads': 'legs_front', 'adductors': 'legs_front',
    'hamstrings': 'legs_back', 'glutes': 'legs_back', 'abductors': 'legs_back',
    'calves': 'legs_calves',
    'cardiovascular system': 'cardio'
};

// ---------- مكان التمرين حسب المعدات ----------
function placeOf(equipment) {
    if (equipment === 'body weight') return 'home_no_equip';
    if (equipment === 'dumbbell') return 'home_dumbbell';
    return 'gym';
}

const EQUIPMENT_AR = {
    'body weight': 'بدون أدوات', 'dumbbell': 'دمبل', 'cable': 'كابل', 'barbell': 'بار',
    'leverage machine': 'جهاز', 'band': 'مطاط', 'smith machine': 'جهاز سميث',
    'kettlebell': 'كيتل بيل', 'weighted': 'بوزن إضافي', 'stability ball': 'كرة سويسرية',
    'ez barbell': 'بار متعرج', 'assisted': 'بمساعدة', 'sled machine': 'جهاز سليد',
    'medicine ball': 'كرة طبية', 'rope': 'حبل', 'roller': 'أسطوانة',
    'resistance band': 'حزام مقاومة', 'bosu ball': 'كرة بوسو', 'olympic barbell': 'بار أولمبي',
    'wheel roller': 'عجلة بطن', 'upper body ergometer': 'دراجة ذراعين',
    'skierg machine': 'جهاز سكي', 'hammer': 'جهاز هامر', 'stationary bike': 'دراجة ثابتة',
    'tire': 'إطار', 'trap bar': 'بار سداسي', 'elliptical machine': 'جهاز إهليلجي',
    'stepmill machine': 'جهاز سلم'
};

const MUSCLE_AR = {
    'triceps': 'ترايسبس', 'shoulders': 'أكتاف', 'biceps': 'بايسبس', 'hamstrings': 'خلف الفخذ',
    'forearms': 'ساعد', 'glutes': 'مؤخرة', 'calves': 'سمانة', 'abs': 'بطن',
    'quadriceps': 'أمام الفخذ', 'pectorals': 'صدر', 'delts': 'أكتاف', 'upper back': 'أعلى الظهر',
    'core': 'عضلات الجذع', 'chest': 'صدر', 'lats': 'ظهر عريض', 'hip flexors': 'ثانيات الورك',
    'obliques': 'بطن جانبي', 'lower back': 'أسفل الظهر', 'rhomboids': 'وسط الظهر',
    'traps': 'ترابيس', 'trapezius': 'ترابيس', 'quads': 'أمام الفخذ',
    'cardiovascular system': 'قلب وتنفس', 'deltoids': 'أكتاف', 'rear deltoids': 'أكتاف خلفية',
    'spine': 'عضلات العمود الفقري', 'brachialis': 'العضدية', 'back': 'ظهر', 'ankles': 'كاحل',
    'feet': 'قدم', 'adductors': 'داخل الفخذ', 'rotator cuff': 'الكفة المدوّرة',
    'serratus anterior': 'المسننة الأمامية', 'latissimus dorsi': 'ظهر عريض',
    'abductors': 'خارج الفخذ', 'ankle stabilizers': 'مثبتات الكاحل', 'soleus': 'سمانة عميقة',
    'wrists': 'رسغ', 'upper chest': 'أعلى الصدر', 'wrist flexors': 'ثنّي الرسغ',
    'wrist extensors': 'بسط الرسغ', 'abdominals': 'بطن', 'levator scapulae': 'رافعة الكتف',
    'sternocleidomastoid': 'رقبة', 'hands': 'يدان', 'groin': 'أربية', 'grip muscles': 'قبضة اليد',
    'lower abs': 'أسفل البطن', 'inner thighs': 'داخل الفخذ', 'shins': 'أمام الساق'
};

function titleCase(name) {
    return String(name).trim().replace(/(^|[\s\-(\/])([a-z])/g, (m, p, c) => p + c.toUpperCase());
}

function csvCell(value) {
    const s = String(value ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// ---------- 1) فحص ملفات الـ GIF الموجودة فعلياً ----------
const gifFiles = new Map(); // اسم الملف بدون الامتداد -> المسار النسبي
for (const name of fs.readdirSync(gifsRoot)) {
    const dir = path.join(gifsRoot, name);
    if (!/^Folder_\d+$/.test(name) || !fs.statSync(dir).isDirectory()) continue;
    for (const fileName of fs.readdirSync(dir)) {
        if (!IMAGE_EXT.has(path.extname(fileName).toLowerCase())) continue;
        gifFiles.set(path.basename(fileName, path.extname(fileName)), `${name}/${fileName}`);
    }
}

// ---------- 2) قراءة المصدر وبناء الملفات ----------
const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const exercises = [];
const manifest = {};
const problems = [];
const seenIds = new Set();

for (const item of source) {
    const stem = path.basename(String(item.gif_url || ''), path.extname(String(item.gif_url || '')));
    const gifPath = gifFiles.get(stem);
    if (!gifPath) { problems.push(`لا يوجد ملف GIF للتمرين ${item.id} (${item.name}) -> ${stem}`); continue; }
    if (seenIds.has(item.id)) { problems.push(`معرّف مكرر: ${item.id}`); continue; }
    seenIds.add(item.id);

    const group = TARGET_TO_GROUP[item.target];
    if (!group) { problems.push(`عضلة غير معروفة "${item.target}" في ${item.id}`); continue; }
    const steps = (item.instruction_steps && item.instruction_steps.en) || [];

    manifest[item.id] = gifPath;
    exercises.push({
        id: item.id,
        name: titleCase(item.name),
        group,
        place: placeOf(item.equipment),
        body_part: item.body_part,
        target: item.target,
        equipment: item.equipment,
        primaryMuscles: [item.target],
        secondaryMuscles: item.secondary_muscles || [],
        instructions: steps
    });
}

// ---------- 3) فحوصات الجودة ----------
const usedEquipment = new Set(exercises.map(e => e.equipment));
const usedMuscles = new Set(exercises.flatMap(e => [...e.primaryMuscles, ...e.secondaryMuscles]));
for (const eq of usedEquipment) if (!EQUIPMENT_AR[eq]) problems.push(`معدة بلا ترجمة عربية: ${eq}`);
for (const mu of usedMuscles) if (!MUSCLE_AR[mu]) problems.push(`عضلة بلا ترجمة عربية: ${mu}`);
const referenced = new Set(Object.values(manifest).map(p => path.basename(p, path.extname(p))));
const orphanGifs = [...gifFiles.keys()].filter(stem => !referenced.has(stem));

if (problems.length) {
    console.error(`❌ توقف السكربت، عدد المشاكل: ${problems.length} (أول 15 فقط):`);
    problems.slice(0, 15).forEach(p => console.error('  - ' + p));
    process.exit(1);
}

// ---------- 4) الكتابة ----------
fs.mkdirSync(path.dirname(outExercises), { recursive: true });
fs.writeFileSync(outExercises, JSON.stringify(exercises));
fs.writeFileSync(outManifest, JSON.stringify(manifest, null, 2) + '\n');
const csv = ['id,name,group,place,target,equipment,equipment_ar,gif']
    .concat(exercises.map(e => [e.id, e.name, e.group, e.place, e.target, e.equipment,
        EQUIPMENT_AR[e.equipment], manifest[e.id]].map(csvCell).join(',')));
fs.writeFileSync(outCsv, '\ufeff' + csv.join('\n') + '\n');

// ---------- 5) تقرير ----------
const count = key => exercises.reduce((m, e) => (m[e[key]] = (m[e[key]] || 0) + 1, m), {});
console.log(`✅ تم استخراج ${exercises.length} تمريناً، كلها لها GIF مطابق.`);
console.log('حسب التبويب (group):', count('group'));
console.log('حسب المكان (place):', count('place'));
console.log(`GIF غير مرتبط بأي تمرين: ${orphanGifs.length}`);
console.log(`حجم data/exercises.json: ${(fs.statSync(outExercises).size / 1024).toFixed(0)} KB`);
module.exports = { EQUIPMENT_AR, MUSCLE_AR };
