// =====================================================
// 7. نافذة تسجيل التمرين - الإصدار المعدل
// =====================================================
function openExerciseModal(id, name, muscle, met) {
    currentExercise = { id, name, muscle, met };
    document.getElementById('exercise-name').value = name;
    document.getElementById('exercise-modal').classList.remove('hidden');
}

// تعديل دالة تسجيل التمرين (لحساب السعرات المحروقة)
function logExerciseWithDetails(id, name, muscle, met, durationMinutes) {
    const user = getUserData();
    // حساب السعرات المحروقة = (MET * 3.5 * الوزن / 200) * المدة
    const burned = Math.round(((met * 3.5 * user.weight) / 200) * durationMinutes);
    const currentBurned = parseInt(localStorage.getItem('todayBurnedCalories')) || 0;
    localStorage.setItem('todayBurnedCalories', currentBurned + burned);
    
    // تحديث العضلات المستهدفة
    let muscles = JSON.parse(localStorage.getItem('todayTargetedMuscles')) || [];
    if (!muscles.includes(muscle)) muscles.push(muscle);
    localStorage.setItem('todayTargetedMuscles', JSON.stringify(muscles));
    
    // مكافأة XP
    addXP(25);
    updateDashboardUI();
    return burned;
}

// تعديل مستمع حدث النافذة
document.getElementById('exercise-form')?.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!currentExercise) return;
    const duration = parseInt(document.getElementById('exercise-duration').value) || 10;
    const burned = logExerciseWithDetails(
        currentExercise.id,
        currentExercise.name,
        currentExercise.muscle,
        currentExercise.met,
        duration
    );
    closeModal('exercise-modal');
    alert(`✅ تم تسجيل ${currentExercise.name} لمدة ${duration} دقيقة، أحرقت ${burned} سعرة (+25 XP)`);
    currentExercise = null;
});
