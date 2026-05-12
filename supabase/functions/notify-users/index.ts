import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { JWT } from "npm:google-auth-library@9"

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

    let userId = ''
    let title = ''
    let body = ''
    let imageUrl = ''

    // User uploaded public bucket URLs for notifications
    const PENDING_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/PENDING_IMG.png';
    const DUE_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/DUE_IMG.png';
    const INCOME_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/INCOME_IMG.png';
    const DUE_PERSON_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/DENA_PAWNA_IMG.png';

    // Check if it's a Supabase Database Webhook Payload
    if (payload.type && payload.record && payload.table) {
      if (payload.table === 'projects') {
        userId = payload.record.userid || payload.record.userId
        if (payload.type === 'INSERT') {
          title = `নতুন প্রজেক্ট: ${payload.record.name}`
          body = `আপনার প্রজেক্টটি পেন্ডিং আছে। বকেয়া: ${payload.record.dueamount || 0}`
          if (payload.record.status === 'pending') {
            imageUrl = PENDING_IMG;
          } else if (payload.record.dueamount > 0) {
            imageUrl = DUE_IMG;
          }
        } else if (payload.type === 'UPDATE') {
          title = `প্রজেক্ট আপডেট: ${payload.record.name}`
          body = `প্রজেক্টটির স্ট্যাটাস এখন ${payload.record.status}। বকেয়া: ${payload.record.dueamount || 0}`
          if (payload.record.status === 'pending') {
            imageUrl = PENDING_IMG;
          } else if (payload.record.dueamount > 0) {
            imageUrl = DUE_IMG;
          }
        }
      } else if (payload.table === 'due_persons') {
        userId = payload.record.userid || payload.record.userId
        title = `দেনা-পাওনা আপডেট`
        body = `${payload.record.name} এর প্রোফাইলে পরিবর্তন হয়েছে।`
        imageUrl = DUE_PERSON_IMG;
      } else {
        // Fallback for other tables
        userId = payload.record.userid || payload.record.userId
        title = `নতুন আপডেট`
        body = `আপনার অ্যাকাউন্টে নতুন আপডেট এসেছে।`
      }
    } else {
      // Direct call
      userId = payload.userId
      title = payload.title
      body = payload.body
      imageUrl = payload.imageUrl || ''
    }

    console.log(`Checking token for userId: ${userId}`);

    if (!userId || !title || !body) {
      console.log("Missing required fields:", { userId, title, body });
      return new Response(JSON.stringify({ message: "Missing required fields" }), {
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
    const serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT')
    if (!serviceAccountStr) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing')
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

    // 4. Send the push notification via Firebase HTTP v1 API
    const fcmMessage: any = {
      message: {
        token: fcmToken,
        notification: {
          title: title,
          body: body,
        },
        android: {
          priority: "high",
          notification: {
            channel_id: "fcm_default_channel",
            sound: "default"
          }
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
          title: title,
          body: body,
          click_action: "FLUTTER_NOTIFICATION_CLICK"
        }
      }
    };

    if (imageUrl) {
      fcmMessage.message.notification.image = imageUrl;
    }

    const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(fcmMessage),
    })

    if (!fcmResponse.ok) {
      const errorData = await fcmResponse.text()
      console.error("FCM API Error response:", errorData);
      throw new Error(`FCM Error: ${errorData}`)
    }

    const responseData = await fcmResponse.json()
    console.log("Successfully sent push notification!", responseData);

    return new Response(JSON.stringify({ success: true, response: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error("Critical function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
