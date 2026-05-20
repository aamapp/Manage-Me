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

  // Ensure it's a POST request (typically from pg_cron webhook)
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
  }

  try {
    // 1. Initialize Supabase Client with Service Role Key to bypass RLS
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log("Starting Daily Reminders Cron Job...");

    // 2. Fetch all profiles that have an fcm_token
    // Use select('*') instead of specific columns to avoid errors if the column was just added
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('*')
      .not('fcm_token', 'is', null)

    if (profileError) throw profileError

    console.log(`Found ${profiles?.length || 0} users with FCM tokens.`);
    
    // Get current hour in BD timezone (Asia/Dhaka) assuming target users are in BD
    const currentHourBD = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Dhaka',
        hour: 'numeric',
        hour12: false
      }).format(new Date()), 10
    );
    console.log(`Current Hour in BD: ${currentHourBD}`);

    // 3. Setup Firebase Auth for FCM Push
    let serviceAccountStr = Deno.env.get('FIREBASE_SERVICE_ACCOUNT');
    
    // Fallback: If not in environment, try fetching from app_settings
    if (!serviceAccountStr) {
      const { data: settingsData } = await supabaseClient
        .from('app_settings')
        .select('firebase_service_account')
        .single();
      if (settingsData && settingsData.firebase_service_account) {
        serviceAccountStr = typeof settingsData.firebase_service_account === 'string' 
          ? settingsData.firebase_service_account 
          : JSON.stringify(settingsData.firebase_service_account);
      }
    }

    if (!serviceAccountStr) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is missing')
    }
    const serviceAccount = JSON.parse(serviceAccountStr)
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

    let notificationsSent = 0;

    // 4. Loop through each user and check for conditions
    for (const user of profiles || []) {
      const rawFcmToken = user.fcm_token || "";
      const fcmTokens = Array.from(new Set(rawFcmToken.split(',').map((t: string) => t.trim()).filter(Boolean)));
      if (fcmTokens.length === 0) continue;

      // Runs 3 times a day (triggered by cron), fallback check to ensure it's between 6 AM and 11 PM (BD time)
      if (currentHourBD < 6 || currentHourBD >= 23) {
          console.log(`Skipping notification for user ${user.id} due to outside active hours (${currentHourBD}).`);
          continue; 
      }

      let notificationsToSend: any[] = [];
      let borrowedAmount = 0;

      // --- Check 1: Projects with Due Amount
      const { data: dueProjects } = await supabaseClient
        .from('projects')
        .select('name, dueamount')
        .eq('userid', user.id)
        .gt('dueamount', 0);
      
      const DUE_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/DUE_IMG.png';
      if (dueProjects && dueProjects.length > 0) {
        for (const p of dueProjects) {
          notificationsToSend.push({
            title: "ডেইলি রিমাইন্ডার 🔔",
            body: `আপনার "${p.name}" প্রজেক্টে বকেয়া আছে ৳${p.dueamount}।`,
            imageUrl: DUE_IMG
          });
        }
      }

      // --- Check 2: Pending Projects
      const { data: pendingProjects } = await supabaseClient
        .from('projects')
        .select('name')
        .eq('userid', user.id)
        .eq('status', 'pending');
        
      const PENDING_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/PENDING_IMG.png';
      if (pendingProjects && pendingProjects.length > 0) {
        for (const p of pendingProjects) {
          notificationsToSend.push({
            title: "প্রজেক্ট পেন্ডিং ⚠️",
            body: `আপনার "${p.name}" প্রজেক্টটি এখনো পেন্ডিং অবস্থায় আছে।`,
            imageUrl: PENDING_IMG
          });
        }
      }

      // --- Check 3: Borrowed Money (Dues & Obligations)
      const { data: duePersons } = await supabaseClient
        .from('due_persons')
        .select('transactions')
        .eq('userid', user.id);
        
      const DUE_PERSON_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/DENA_PAWNA_IMG.png';
      if (duePersons && duePersons.length > 0) {
          duePersons.forEach((person: any) => {
              if (person.transactions && Array.isArray(person.transactions)) {
                  let receiveSum = 0;
                  let giveSum = 0;
                  person.transactions.forEach((tx: any) => {
                      if (tx.type === 'receive') receiveSum += Number(tx.amount || 0);
                      if (tx.type === 'give') giveSum += Number(tx.amount || 0);
                  });
                  const balance = receiveSum - giveSum;
                  if (balance > 0) { // user owes this person
                      borrowedAmount += balance;
                  }
              }
          })
      }

      if (borrowedAmount > 0) {
        notificationsToSend.push({
          title: "দেনা/ধার রিমাইন্ডার 💸",
          body: `আপনার মোট দেনা/ধার আছে ৳${borrowedAmount}। অনুগ্রহ করে শোধ করুন।`,
          imageUrl: DUE_PERSON_IMG
        });
      }

      // 5. Send separate notifications
      for (const token of fcmTokens) {
        for (const notif of notificationsToSend) {
            const uniqueTag = Math.floor(Math.random() * 100000000).toString();
            
            const fcmMessage = {
              message: {
                token: token,
                notification: {
                  title: notif.title,
                  body: notif.body,
                  image: notif.imageUrl || ""
                },
                android: {
                  priority: "high",
                  notification: {
                    channel_id: "fcm_default_channel",
                    sound: "default",
                    image: notif.imageUrl || ""
                  }
                },
                data: {
                  title: notif.title,
                  body: notif.body,
                  click_action: "FLUTTER_NOTIFICATION_CLICK",
                  notification_id: uniqueTag,
                  channel_id: "fcm_default_channel",
                  image: notif.imageUrl || ""
                }
              }
            };

            // Send FCM Notification
            const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(fcmMessage),
            })
        
            if (fcmResponse.ok) {
              notificationsSent++;
            } else {
              console.error(`Failed to send FCM to user ${user.id}:`, await fcmResponse.text());
            }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, notificationsSent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("Critical function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
