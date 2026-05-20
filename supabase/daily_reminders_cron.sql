-- Daily Reminders Cron Job Setup ( দিনে ৩ বার )

-- ১. আগের ১০ মিনিটের শিডিউল ডিলিট করা (যদি থাকে)
SELECT cron.unschedule('daily-reminders-job-10-min');

-- ২. নতুন শিডিউল সেট আপ করা (০৩:০০, ০৯:০০ এবং ১৫:০০ UTC -> যার মানে বাংলাদেশ সময় সকাল ৯টা, বিকাল ৩টা এবং রাত ৯টা)
-- Replace 'https://YOUR_PROJECT_REF.supabase.co' with your actual Supabase URL
-- Replace 'YOUR_ANON_KEY' or Service Role Key with your actual Key

SELECT cron.schedule(
  'daily-reminders-job-3-times',
  '0 3,9,15 * * *', 
  $$
    SELECT net.http_post(
        url:='https://qlmdoatgvovggvgzhwoy.supabase.co/functions/v1/daily-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

