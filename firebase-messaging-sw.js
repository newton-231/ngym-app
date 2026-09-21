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
    const notification = payload.notification || {};
    const title = notification.title || 'NGym 🏋️';
    self.registration.showNotification(title, {
        body: notification.body || 'حان وقت التمرين!',
        icon: notification.icon || 'https://cdn-icons-png.flaticon.com/512/2964/2964514.png',
        data: payload.data || {}
    });
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            if (clientList.length > 0) return clientList[0].focus();
            return clients.openWindow('/');
        })
    );
});
