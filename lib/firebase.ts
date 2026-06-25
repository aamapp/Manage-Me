import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import firebaseConfig from '../firebase-applet-config.json';
import { supabase } from './supabase';

declare global {
  interface Window {
    AndroidBridge?: {
      requestPushPermission: (userId: string) => void;
    };
    setAndroidFCMToken?: (token: string) => Promise<void>;
  }
}

const app = initializeApp(firebaseConfig);
let messaging: any = null;
try {
  messaging = getMessaging(app);
} catch (e) {
  console.warn('Firebase Messaging is not supported or failed to initialize in this environment:', e);
}

const mergeTokens = (existingTokens: string | null | undefined, newToken: string) => {
  if (!existingTokens) return newToken;
  const tokensArray = existingTokens.split(',').map(t => t.trim()).filter(Boolean);
  if (!tokensArray.includes(newToken)) {
    tokensArray.push(newToken);
  }
  return tokensArray.join(',');
};

export const requestNotificationPermission = async (userId: string) => {
  // Check if we are inside Android WebView with Native Bridge
  if (window.AndroidBridge) {
    console.log('Using Android Native Bridge for Push Notifications');
    
    // Create a global function for Android to call back with the token
    window.setAndroidFCMToken = async (token: string) => {
      console.log('Received FCM token from Android:', token);
      if (token && userId) {
        
        // 1. Fetch current profile to get older tokens
        const { data: profile } = await supabase
          .from('profiles')
          .select('fcm_token')
          .eq('id', userId)
          .single();

        const newFCMTokenStr = mergeTokens(profile?.fcm_token, token);

        // Update profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ fcm_token: newFCMTokenStr })
          .eq('id', userId);

        if (profileError) {
          console.error('Error updating FCM token in profiles:', profileError);
        }

        // 2. Fetch and update user metadata
        const { data } = await supabase.auth.getUser();
        const currentMetaToken = data?.user?.user_metadata?.fcm_token;
        const newMetaFCMTokenStr = mergeTokens(currentMetaToken, token);
        
        if (currentMetaToken !== newMetaFCMTokenStr) {
          await supabase.auth.updateUser({
            data: { fcm_token: newMetaFCMTokenStr }
          });
          
          window.dispatchEvent(new CustomEvent('app_toast', { 
            detail: { message: 'অ্যান্ড্রয়েড অ্যাপে নোটিফিকেশন সফলভাবে চালু হয়েছে!', type: 'success' } 
          }));
        }
      }
    };

    // Call the native Android method
    window.AndroidBridge.requestPushPermission(userId);
    return;
  }

  // Fallback to Standard Web Notification API
  if (!('Notification' in window)) {
    throw new Error('আপনার ডিভাইস বা ব্রাউজারে নোটিফিকেশন সাপোর্ট করে না।');
  }

  try {
    console.log('Requesting notification permission...');
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      if (!messaging) {
        console.warn('FCM Messaging is not supported or initialized. Skipping token retrieval.');
        return;
      }
      // Get the FCM token
      const token = await getToken(messaging, {
        vapidKey: 'BDbjGbPon8pjckPCxZ7xewSIEkWsnUPwl0KyYMLGHyqWI-uQydbC4d8bgEXDsAY-7jFvTU_WG4Q8Pec_Ziyp0b0'
      });
      
      if (token) {
        console.log('FCM Token:', token);
        // Save the token to Supabase for this user (in both user_metadata and profiles table)
        if (userId) {
          // 1. Fetch current profile
          const { data: profile } = await supabase
            .from('profiles')
            .select('fcm_token')
            .eq('id', userId)
            .single();

          const newFCMTokenStr = mergeTokens(profile?.fcm_token, token);

          await supabase
            .from('profiles')
            .update({ fcm_token: newFCMTokenStr })
            .eq('id', userId);

          // 2. Fetch and update User Metadata
          const { data } = await supabase.auth.getUser();
          const currentMetaToken = data?.user?.user_metadata?.fcm_token;
          const newMetaFCMTokenStr = mergeTokens(currentMetaToken, token);

          if (currentMetaToken !== newMetaFCMTokenStr) {
            await supabase.auth.updateUser({
              data: { fcm_token: newMetaFCMTokenStr }
            });
          }
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
  if (!messaging) {
    console.warn('FCM Messaging is not supported or initialized. Skipping listener setup.');
    return;
  }
  onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    // You can show a custom toast or UI notification here
    if (payload.notification) {
      const title = payload.notification.title || 'New Notification';
      const body = payload.notification.body;
      const imageUrl = payload.notification.image || (payload.data && payload.data.image);

      // Speak the body (fallback to title if body is empty)
      if ('speechSynthesis' in window) {
        const textToSpeak = body || title;
        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        utterance.lang = 'bn-BD'; // Set language to Bengali (modify if needed)
        window.speechSynthesis.speak(utterance);
      }

      // Example: Using browser's native notification if app is in foreground
      new Notification(title, {
        body: body,
        icon: '/icon.png',
        image: imageUrl || undefined
      } as NotificationOptions);
    }
  });
};
