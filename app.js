// 1. نظام التحقق من الفترة التجريبية عبر الـ IP
async function checkTrialStatus() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        const userIp = data.ip;
        
        let trialData = localStorage.getItem('ngym_trial_' + userIp);
        const now = new Date().getTime();

        if (!trialData) {
            const expiry = now + (30 * 24 * 60 * 60 * 1000);
            localStorage.setItem('ngym_trial_' + userIp, expiry);
            document.getElementById('sub-title').innerText = 'متبقي 30 يوماً من التجربة';
        } else if (now > parseInt(trialData)) {
            showSubscriptionModal();
        } else {
            const daysLeft = Math.ceil((parseInt(trialData) - now) / (1000 * 60 * 60 * 24));
            document.getElementById('sub-title').innerText = `متبقي ${daysLeft} يوم من التجربة`;
        }
    } catch (e) {
        document.getElementById('sub-title').innerText = 'مرحباً بك في NGym';
    }
}

function showSubscriptionModal() {
    const modalHtml = `
        <div class="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-50">
            <div class="bg-gray-900 border border-gym-green p-6 rounded-2xl w-full max-w-sm text-center">
                <h3 class="text-xl font-bold mb-3 text-gym-green">انتهت الفترة التجريبية</h3>
                <p class="text-sm text-gray-400 mb-5">تواصل معنا عبر واتساب لتفعيل اشتراكك وتجديد الأكواد (شهر، 3 أشهر، سنة).</p>
                <a href="https://wa.me/970599000000?text=أريد%20تجديد%20اشتراك%20NGym" target="_blank" class="block w-full bg-gym-green text-black font-bold py-3 rounded-xl text-sm">تواصل للتجديد</a>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

// 2. منطق التبويبات والشات (كما اتفقنا)
function switchTab(tab) {
    document.getElementById('tab-nutrition').classList.toggle('hidden', tab !== 'nutrition');
    document.getElementById('tab-workouts').classList.toggle('hidden', tab !== 'workouts');
}

// 3. تشغيل النظام
window.addEventListener('DOMContentLoaded', () => {
    checkTrialStatus();
});

// (أضف هنا كود الشات المعتاد الذي قمنا ببنائه سابقاً)
