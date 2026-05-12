import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';
import { supabase } from './supabase';

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async (userId: string) => {
  try {
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // Get the FCM token
      const token = await getToken(messaging, {
        vapidKey: 'BDbjGbPon8pjckPCxZ7xewSIEkWsnUPwl0KyYMLGHyqWI-uQydbC4d8bgEXDsAY-7jFvTU_WG4Q8Pec_Ziyp0b0'
      });
      
      if (token) {
        console.log('FCM Token:', token);
        // Save the token to Supabase for this user (in user_metadata)
        if (userId) {
          await supabase.auth.updateUser({
            data: { fcm_token: token }
          });
        }
      } else {
        console.log('No registration token available. Request permission to generate one.');
      }
    } else {
      console.log('Do not have permission!');
    }
  } catch (error) {
    console.error('An error occurred while requesting permission: ', error);
  }
};

export const setupOnMessageListener = () => {
  onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    // You can show a custom toast or UI notification here
    if (payload.notification) {
      // Example: Using browser's native notification if app is in foreground
      new Notification(payload.notification.title || 'New Notification', {
        body: payload.notification.body,
        icon: '/icon.png'
      });
    }
  });
};
