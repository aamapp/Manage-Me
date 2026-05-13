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

    // 2. Fetch all profiles that have an FCM token
    const { data: profiles, error: profileError } = await supabaseClient
      .from('profiles')
      .select('id, name, fcm_token')
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
      const fcmToken = user.fcm_token;
      if (!fcmToken) continue;

      // Fetch user_metadata to get reminder_times
      const { data: authUser, error: authErr } = await supabaseClient.auth.admin.getUserById(user.id);
      let userTimes = ['09:00', '15:00', '21:00'];
      if (!authErr && authUser?.user?.user_metadata?.reminder_times) {
        userTimes = authUser.user.user_metadata.reminder_times;
      }
      
      let isScheduledHour = false;
      for (const t of userTimes) {
          const tHour = parseInt(t.split(':')[0], 10);
          if (currentHourBD === tHour || (currentHourBD === 24 && tHour === 0)) {
              isScheduledHour = true;
              break;
          }
      }

      if (!isScheduledHour) {
          continue; // Skip this user if it's not their scheduled hour
      }

      let notificationBodyList: string[] = [];
      let totalDueAmount = 0;
      let pendingProjectsCount = 0;
      let borrowedAmount = 0;

      // --- Check 1: Projects with Due Amount
      const { data: dueProjects } = await supabaseClient
        .from('projects')
        .select('name, dueamount')
        .eq('userid', user.id)
        .gt('dueamount', 0);
      
      if (dueProjects && dueProjects.length > 0) {
        dueProjects.forEach(p => totalDueAmount += Number(p.dueamount));
      }

      // --- Check 2: Pending Projects
      const { data: pendingProjects } = await supabaseClient
        .from('projects')
        .select('name')
        .eq('userid', user.id)
        .eq('status', 'pending');
        
      if (pendingProjects && pendingProjects.length > 0) {
        pendingProjectsCount = pendingProjects.length;
      }

      // --- Check 3: Borrowed Money (Dues & Obligations)
      // Transactions: 'receive' means user received (borrowed), 'give' means user gave (lent)
      // If we calculate total receive - total give > 0, user owes money (Total ধার).
      const { data: duePersons } = await supabaseClient
        .from('due_persons')
        .select('transactions')
        .eq('userid', user.id);
        
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

      // 5. Construct Notification Message if any condition is met
      let imageUrl = '';
      const PENDING_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/PENDING_IMG.png';
      const DUE_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/DUE_IMG.png';
      const INCOME_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/INCOME_IMG.png';
      const DUE_PERSON_IMG = 'https://qlmdoatgvovggvgzhwoy.supabase.co/storage/v1/object/public/notification-images/DENA_PAWNA_IMG.png';

      if (totalDueAmount > 0) {
          notificationBodyList.push(`বকেয়া বিল: ৳${totalDueAmount}`);
          imageUrl = DUE_IMG;
      }
      if (pendingProjectsCount > 0) {
          notificationBodyList.push(`পেন্ডিং প্রজেক্ট: ${pendingProjectsCount}টি`);
          if (!imageUrl) imageUrl = PENDING_IMG;
      }
      if (borrowedAmount > 0) {
          notificationBodyList.push(`দেনা/ধার: ৳${borrowedAmount}`);
          if (!imageUrl) imageUrl = DUE_PERSON_IMG;
      }

      if (notificationBodyList.length > 0) {
          const bodyMessage = notificationBodyList.join(', ') + '। অনুগ্রহ করে চেক করুন।';
          
          const fcmMessage: any = {
            message: {
              token: fcmToken,
              notification: {
                title: "ডেইলি রিমাইন্ডার 🔔",
                body: bodyMessage,
              },
              android: {
                priority: "high",
                notification: { channel_id: "fcm_default_channel", sound: "default" }
              },
              data: {
                title: "ডেইলি রিমাইন্ডার 🔔",
                body: bodyMessage,
                click_action: "FLUTTER_NOTIFICATION_CLICK"
              }
            }
          };

          if (imageUrl) {
            fcmMessage.message.notification.image = imageUrl;
            fcmMessage.message.android.notification.image = imageUrl;
            fcmMessage.message.data.image = imageUrl;
          }

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
