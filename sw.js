const CACHE_NAME = 'ngym-cache-v4';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './sw.js',
    './firebase-messaging-sw.js',
    './manifest.json',
    './data/exercises.json',
    './assets/gifs/manifest.json',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap',
    'https://cdn-icons-png.flaticon.com/512/2964/2964514.png'
];

// تثبيت ملف الـ Service Worker وتخزين الملفات الرئيسية
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(ASSETS_TO_CACHE.map((asset) =>
                cache.add(asset).catch((error) => {
                    console.warn('تعذر تخزين المورد في الكاش:', asset, error);
                })
            ));
        })
    );
});

// تفعيل وتحديث الكاش
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
});

// استرجاع البيانات أثناء تصفح التطبيق أوفلاين
self.addEventListener('fetch', (e) => {
    if (e.request.method !== 'GET') return;
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            const isExerciseImage = new URL(e.request.url).pathname.includes('/assets/gifs/');
            if (cachedResponse && isExerciseImage) return cachedResponse;
            return fetch(e.request).then((networkResponse) => {
                if (networkResponse.ok && isExerciseImage) {
                    const copy = networkResponse.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
                }
                return networkResponse;
            }).catch(() => cachedResponse || caches.match('./index.html'));
        })
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SHOW_NOTIFICATION') {
        const title = event.data.title || 'NGym 🏋️';
        const options = event.data.options || {};
        event.waitUntil(self.registration.showNotification(title, options));
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then((clientList) => {
            if (clientList.length > 0) return clientList[0].focus();
            return clients.openWindow('/');
        })
    );
});
