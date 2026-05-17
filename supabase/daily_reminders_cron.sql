-- Daily Reminders Cron Job Setup

-- 1. Enable the pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Setup the cron job to run 3 times a day
-- For example: at 09:00, 14:00 (2 PM), and 20:00 (8 PM)
-- The HTTP request will call our new 'daily-reminders' edge function.
-- Replace 'https://YOUR_PROJECT_REF.supabase.co' with your actual Supabase URL
-- Replace 'YOUR_ANON_KEY' with your actual Supabase Anon (or Service Role) Key

SELECT cron.schedule(
  'daily-reminders-job-1',
  '*/15 * * * *', -- Runs every 15 minutes
  $$
    SELECT net.http_post(
        url:='https://YOUR_PROJECT_REF.supabase.co/functions/v1/daily-reminders',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);

-- Note: You will need to deploy the edge function from your terminal using:
-- supabase functions deploy daily-reminders --no-verify-jwt
