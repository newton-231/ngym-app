importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: 'AIzaSyDDZ6DRL_7n8gHaJH3I14ULAIKsUsT90Xw',
    authDomain: 'ngym-app.firebaseapp.com',
    projectId: 'ngym-app',
    storageBucket: 'ngym-app.firebasestorage.app',
    messagingSenderId: '1048781288073',
    appId: '1:1048781288073:web:bf9cc9368331eabaf6cc58'
});

const messaging = firebase.messaging();
messaging.onBackgroundMessage((payload) => {
    const n = payload.notification || {};
    self.registration.showNotification(n.title || 'NGym 🏋️', {
        body: n.body || 'حان وقت التمرين!',
        icon: n.icon || 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
        data: payload.data || {}
    });
});

const CACHE_NAME = 'ngym-cache-v5';
const STATIC_CACHE = `${CACHE_NAME}-static`;
const GIF_CACHE = `${CACHE_NAME}-gifs`;

const ASSETS_TO_CACHE = [
    './', './index.html', './style.css', './app.js', './manifest.json',
    './data/exercises.json', './assets/gifs/manifest.json',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
    'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&display=swap',
    'https://cdn-icons-png.flaticon.com/512/2964/2964514.png'
];

self.addEventListener('install', (e) => {
    self.skipWaiting();
    e.waitUntil(
        caches.open(STATIC_CACHE).then(cache =>
            Promise.all(ASSETS_TO_CACHE.map(url =>
                cache.add(url).catch(err => console.warn('فشل:', url, err))
            ))
        )
    );
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        Promise.all([
            self.clients.claim(),
            caches.keys().then(keys => Promise.all(
                keys.filter(k => k !== STATIC_CACHE && k !== GIF_CACHE)
                    .map(k => caches.delete(k))
            ))
        ])
    );
});

self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (e.request.method !== 'GET') return;
    if (url.pathname.startsWith('/api/')) return;

    // GIFs: cache-first
    if (url.pathname.includes('/assets/gifs/')) {
        e.respondWith(
            caches.match(e.request).then(cached =>
                cached || fetch(e.request).then(res => {
                    if (res.ok) {
                        const copy = res.clone();
                        caches.open(GIF_CACHE).then(c => c.put(e.request, copy));
                    }
                    return res;
                }).catch(() => Response.error())
            )
        );
        return;
    }

    // HTML/JS/CSS: network-first
    e.respondWith(
        fetch(e.request).then(res => {
            if (res.ok) {
                const copy = res.clone();
                caches.open(STATIC_CACHE).then(c => c.put(e.request, copy));
            }
            return res;
        }).catch(() =>
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                if (e.request.mode !== 'navigate') return Response.error();
                return caches.match('./index.html').then(index => index || Response.error());
            })
        )
    );
});

self.addEventListener('message', (event) => {
    if (event.data?.type === 'SHOW_NOTIFICATION') {
        event.waitUntil(self.registration.showNotification(
            event.data.title || 'NGym 🏋️', event.data.options || {}
        ));
    }
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window' }).then(list =>
            list.length ? list[0].focus() : clients.openWindow('/')
        )
    );
});
