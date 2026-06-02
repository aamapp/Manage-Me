import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qlmdoatgvovggvgzhwoy.supabase.co'; 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFsbWRvYXRndm92Z2d2Z3pod295Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2MTcxOTUsImV4cCI6MjA4NTE5MzE5NX0.Sf9cFInslT7iMF7huEuS-os1xd7uvepmRZEarlUKNRk';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking expenses table...");
  const { data: exp, error: expErr } = await supabase.from('expenses').select('*').limit(1);
  if (expErr) {
    console.error("Expenses error:", expErr);
  } else {
    console.log("Expenses first row keys:", exp.length > 0 ? Object.keys(exp[0]) : "No rows found");
  }

  console.log("Checking income_records table...");
  const { data: inc, error: incErr } = await supabase.from('income_records').select('*').limit(1);
  if (incErr) {
    console.error("Income records error:", incErr);
  } else {
    console.log("Income records first row keys:", inc.length > 0 ? Object.keys(inc[0]) : "No rows found");
  }
}

check();
