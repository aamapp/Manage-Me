
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7';

/**
 * সুপাবেজ কানেকশন সেটআপ।
 * ব্যবহারকারীর প্রদানকৃত সুপাবেজ ক্রেডেনশিয়াল ব্যবহার করা হয়েছে।
 */

// Added explicit string type to allow comparison with placeholder literals in isConfigured
const supabaseUrl: string = 'https://qlmdoatgvovggvgzhwoy.supabase.co'; 
const supabaseAnonKey: string = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbWRvYXRndm92Z2d2Z3pod295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTcxOTUsImV4cCI6MjA4NTE5MzE5NX0.Sf9cFInslT7iMF7huEuS-os1xd7uvepmRZEarlUKNRk';

// চেক করা হচ্ছে কনফিগারেশন কি প্লেসহোল্ডার নাকি আসল
export const isConfigured = 
  supabaseUrl !== '' && 
  supabaseUrl !== 'https://your-project-url.supabase.co' && 
  supabaseAnonKey !== 'your-anon-key';

// সুপাবেজ ক্লায়েন্ট তৈরি
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
