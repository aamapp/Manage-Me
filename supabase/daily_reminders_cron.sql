-- Daily Reminders Cron Job Setup ( দিনে ৩ বার )

-- ১. আগের সব শিডিউল ডিলিট করা (যদি থাকে)
-- (নোট: যদি নিচের কোনো জব আগে থেকে না থাকে তাহলে Error আসতে পারে, সেক্ষেত্রে Error ইগনোর করে শুধু cron.schedule রান করতে পারেন অথবা যেই জবটি নেই সেটির লাইন কমেন্ট করে দিতে পারেন)
-- SELECT cron.unschedule('daily-reminders-job-10-min');
-- SELECT cron.unschedule('daily-reminders-job-3-times');
-- SELECT cron.unschedule('daily-reminders-hourly');

-- ২. নতুন শিডিউল সেট আপ করা (প্রতি ঘণ্টার শুরুতে, অর্থাৎ ০০ মিনিটে)
-- এটি প্রতি ঘন্টায় চেক করবে এবং ইউজারের সেটিংস অনুযায়ী সঠিক সময়ে নোটিফিকেশন পাঠাবে।
-- Replace 'https://YOUR_PROJECT_REF.supabase.co' with your actual Supabase URL
-- Replace 'YOUR_ANON_KEY' or Service Role Key with your actual Key

SELECT cron.schedule(
  'daily-reminders-hourly',
  '0 * * * *', 
  $$
    SELECT net.http_post(
        url:='https://qlmdoatgvovggvgzhwoy.supabase.co/functions/v1/daily-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

