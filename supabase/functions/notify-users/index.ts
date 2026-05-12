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

    let userId = ''
    let title = ''
    let body = ''

    // Check if it's a Supabase Database Webhook Payload
    if (payload.type && payload.record && payload.table) {
      if (payload.table === 'projects') {
        userId = payload.record.userid || payload.record.userId
        if (payload.type === 'INSERT') {
          title = `নতুন প্রজেক্ট: ${payload.record.name}`
          body = `আপনার প্রজেক্টটি পিন্ডিং আছে। বকেয়া: ${payload.record.dueamount || 0}`
        } else if (payload.type === 'UPDATE') {
          title = `প্রজেক্ট আপডেট: ${payload.record.name}`
          body = `প্রজেক্টটির স্ট্যাটাস এখন ${payload.record.status}। বকেয়া: ${payload.record.dueamount || 0}`
        }
      } else if (payload.table === 'due_persons') {
        userId = payload.record.userid || payload.record.userId
        title = `দেনা-পাওনা আপডেট`
        body = `${payload.record.name} এর প্রোফাইলে পরিবর্তন হয়েছে।`
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
    }

    if (!userId || !title || !body) {
      throw new Error('Missing required fields or unrecognized webhook payload')
    }

    // 1. Get the user's FCM token from auth.users (user_metadata)
    // Note: To access auth.users, we MUST use the SERVICE_ROLE_KEY
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId)
    
    if (userError || !userData.user) {
      throw new Error(`Error fetching user: ${userError?.message}`)
    }

    const userMetadata = userData.user.user_metadata
    const fcmToken = userMetadata?.fcm_token

    if (!fcmToken) {
      return new Response(JSON.stringify({ message: "User does not have an FCM token" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }

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
    const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        message: {
          token: fcmToken,
          notification: {
            title: title,
            body: body,
          },
          // Optional data payload
          data: {
            click_action: "FLUTTER_NOTIFICATION_CLICK" // Adjust based on android app needs
          }
        },
      }),
    })

    if (!fcmResponse.ok) {
      const errorData = await fcmResponse.text()
      throw new Error(`FCM Error: ${errorData}`)
    }

    const responseData = await fcmResponse.json()

    return new Response(JSON.stringify({ success: true, response: responseData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
