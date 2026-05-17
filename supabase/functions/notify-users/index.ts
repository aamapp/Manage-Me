import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { JWT } from "https://esm.sh/google-auth-library@9"

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    console.log("Webhook payload received:", payload);

    let userId = '';
    let notificationsToSend: { title: string; body: string; imageUrl: string }[] = [];

    // User uploaded public bucket URLs for notifications
    const PENDING_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/PENDING_IMG.png';
    const DUE_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/DUE_IMG.png';
    const INCOME_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/INCOME_IMG.png';
    const DUE_PERSON_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/DENA_PAWNA_IMG.png';

    // Check if it's a Supabase Database Webhook Payload
    if (payload.type && payload.record && payload.table) {
      if (payload.table === 'projects') {
        userId = payload.record.userid || payload.record.userId;
        if (payload.type === 'INSERT') {
          notificationsToSend.push({
            title: `নতুন প্রজেক্ট: ${payload.record.name}`,
            body: `প্রজেক্টটির স্ট্যাটাস এখন ${payload.record.status || 'Pending'}।`,
            imageUrl: (payload.record.status || '').toLowerCase() === 'pending' ? PENDING_IMG : INCOME_IMG
          });
          if (payload.record.dueamount > 0) {
            notificationsToSend.push({
              title: `বকেয়া আপডেট: ${payload.record.name}`,
              body: `প্রজেক্টটিতে বকেয়া আছে: ${payload.record.dueamount} টাকা।`,
              imageUrl: DUE_IMG
            });
          }
        } else if (payload.type === 'UPDATE') {
          let statusChanged = false;
          let dueChanged = false;
          
          if (payload.old_record) {
             statusChanged = payload.old_record.status !== payload.record.status;
             dueChanged = payload.old_record.dueamount !== payload.record.dueamount;
          } else {
             statusChanged = true;
          }

          if (statusChanged) {
            notificationsToSend.push({
              title: `স্ট্যাটাস আপডেট: ${payload.record.name}`,
              body: `প্রজেক্টটির স্ট্যাটাস এখন ${payload.record.status}।`,
              imageUrl: (payload.record.status || '').toLowerCase() === 'pending' ? PENDING_IMG : INCOME_IMG
            });
          }
          if (dueChanged) {
            let img = DUE_IMG;
            let customTitle = `বকেয়া আপডেট: ${payload.record.name}`;
            let customBody = `প্রজেক্টটির বকেয়া এখন ${payload.record.dueamount} টাকা।`;

            if (payload.old_record && payload.old_record.dueamount > payload.record.dueamount) {
              img = INCOME_IMG;
              customTitle = `ইনকাম যুক্ত হয়েছে: ${payload.record.name}`;
              customBody = `আপনার প্রজেক্টে পেমেন্ট যুক্ত হয়েছে। এখন বকেয়া আছে ${payload.record.dueamount} টাকা।`;
            } else if (payload.record.dueamount === 0) {
              img = INCOME_IMG;
              customTitle = `বকেয়া পরিশোধিত: ${payload.record.name}`;
              customBody = `প্রজেক্টটির সমস্ত বকেয়া পরিশোধ করা হয়েছে!`;
            }

            notificationsToSend.push({
              title: customTitle,
              body: customBody,
              imageUrl: img
            });
          }
          
          if (!statusChanged && !dueChanged) {
             notificationsToSend.push({
               title: `প্রজেক্ট আপডেট: ${payload.record.name}`,
               body: `আপনার প্রজেক্ট আপডেট করা হয়েছে।`,
               imageUrl: PENDING_IMG
             });
          }
        }
      } else if (payload.table === 'due_persons') {
        userId = payload.record.userid || payload.record.userId;
        notificationsToSend.push({
          title: `দেনা-পাওনা আপডেট`,
          body: `${payload.record.name} এর প্রোফাইলে পরিবর্তন হয়েছে।`,
          imageUrl: DUE_PERSON_IMG
        });
      } else {
        // Fallback for other tables
        userId = payload.record.userid || payload.record.userId;
        notificationsToSend.push({
          title: `নতুন আপডেট`,
          body: `আপনার অ্যাকাউন্টে নতুন আপডেট এসেছে।`,
          imageUrl: ''
        });
      }
    } else {
      // Direct call
      userId = payload.userId;
      notificationsToSend.push({
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl || ''
      });
    }

    console.log(`Checking token for userId: ${userId}`);

    if (!userId || notificationsToSend.length === 0) {
      console.log("Missing required fields or no notifications to send.", { userId });
      return new Response(JSON.stringify({ message: "Missing required fields or no notifications" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    // 1. Get the user's FCM token from auth.users (user_metadata)
    // Note: To access auth.users, we MUST use the SERVICE_ROLE_KEY
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId)
    
    if (userError || !userData?.user) {
      console.error(`User fetch error: ${userError?.message}`);
      throw new Error(`Error fetching user: ${userError?.message}`)
    }

    const userMetadata = userData.user.user_metadata
    const fcmToken = userMetadata?.fcm_token

    if (!fcmToken) {
      console.log(`No FCM token found for user ${userId}. Cannot send notification.`);
      return new Response(JSON.stringify({ message: "User does not have an FCM token" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

    console.log(`Pushing notification to FCM Token: ${fcmToken.substring(0, 15)}...`);

    // 2. Get the Firebase Service Account JSON string from environment variables
    let serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    
    // Fallback: If not in environment secrets, try fetching from app_settings table
    if (!serviceAccountStr) {
      const { data: settingsData, error: settingsError } = await supabaseClient
        .from('app_settings')
        .select('firebase_service_account')
        .single();
        
      if (settingsError || !settingsData) {
        console.error("Error fetching Firebase Service Account from app_settings:", settingsError);
        throw new Error("Firebase configuration not found in app_settings table or FIREBASE_SERVICE_ACCOUNT secret.");
      }
      
      serviceAccountStr = typeof settingsData.firebase_service_account === 'string' 
        ? settingsData.firebase_service_account 
        : JSON.stringify(settingsData.firebase_service_account);
    }

    if (!serviceAccountStr) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable or app_settings is missing')
    }

    const serviceAccount = JSON.parse(serviceAccountStr)

    // 3. Generate an OAuth2 token for FCM
    const jwtClient = new JWT({
      email: serviceAccount.client_email,
      key: serviceAccount.private_key,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })

    const tokens = await jwtClient.getAccessToken()
    const accessToken = tokens.token

    if (!accessToken) {
      throw new Error("Failed to generate access token for FCM")
    }

    // 4. Send the push notifications via Firebase HTTP v1 API
    const allResponses = [];

    for (const notif of notificationsToSend) {
      if (!notif.title || !notif.body) continue;

      const uniqueId = Math.floor(Math.random() * 100000000).toString();
      const fcmMessage: any = {
        message: {
          token: fcmToken,
          android: {
            priority: "high"
          },
          webpush: {
            headers: {
              Urgency: "high",
            },
            notification: {
              requireInteraction: true,
              sound: "default"
            }
          },
          // Optional data payload
          data: {
            title: notif.title,
            body: notif.body,
            click_action: "FLUTTER_NOTIFICATION_CLICK",
            notification_id: uniqueId,
            channel_id: "fcm_default_channel",
            sound: "default",
            image: notif.imageUrl || ""
          }
        }
      };

      const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(fcmMessage),
      });

      if (!fcmResponse.ok) {
        const errorData = await fcmResponse.text();
        console.error("FCM API Error response:", errorData);
        allResponses.push({ success: false, error: errorData });
      } else {
        const responseData = await fcmResponse.json();
        console.log("Successfully sent push notification!", responseData);
        allResponses.push({ success: true, response: responseData });
      }
    }

    return new Response(JSON.stringify({ success: true, responses: allResponses }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error("Critical function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
