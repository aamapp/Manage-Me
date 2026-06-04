importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  projectId: "aam-logs",
  appId: "1:731483938151:web:2bbb991bdafa26d805a3c2",
  apiKey: "AIzaSyDw0KKFT0HSBmPFsdZsWLDdeIaJlyMYqZY",
  authDomain: "aam-logs.firebaseapp.com",
  messagingSenderId: "731483938151",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification?.title || 'নতুন আপডেট';
  const imageUrl = payload.notification?.image || payload.data?.image || '';
  
  const notificationOptions = {
    body: payload.notification?.body || '',
    icon: '/icon.png',
    image: imageUrl || undefined
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
