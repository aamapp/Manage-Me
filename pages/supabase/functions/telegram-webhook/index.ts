import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // CORS handles browser pre-flight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // For Edge Functions, we use service role key to bypass RLS since it's a server-side automation
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload = await req.json()
    const message = payload.message || payload.channel_post;
    console.log("Telegram webhook received type:", payload.message ? "Message" : (payload.channel_post ? "Channel Post" : "Other"))
    
    // Process if it's a message or channel post with text or caption or document
    if (message) {
      const text = message.caption || message.text || '';
      const docName = message.document?.file_name || '';
      const audioName = message.audio?.file_name || '';
      
      // Combine text and filenames, and replace underscores/hyphens with spaces for better matching
      const combinedText = `${text} ${docName} ${audioName}`.replace(/[_\-\.]/g, ' ').toLowerCase();
      console.log("Extracted combined text/filename:", combinedText);

      if (combinedText.trim().length >= 2) {
        // Find all completed projects
        const { data: projects, error } = await supabaseClient
          .from('projects')
          .select('id, name, notes')
          .eq('status', 'Completed')
        
        if (error) {
          console.error("Supabase fetch error:", error);
          throw error;
        }

        if (projects && projects.length > 0) {
          let updatedCount = 0;
          for (const project of projects) {
            const notes = project.notes || '';
            const isDone = notes.includes('[BACKUP_DONE]')
            
            // Check if project name exists in the telegram text
            // We use the cleaned up projectName (no underscores/hyphens/dots)
            const projectNameLower = project.name.replace(/[_\-\.]/g, ' ').toLowerCase();

            if (!isDone && combinedText.includes(projectNameLower)) {
              console.log(`Match found for project: ${project.name}`);
              
              const cleanNotes = notes.replace(/\[BACKUP_PENDING\]/g, '').trim();
              const newNotes = `[BACKUP_DONE] ${cleanNotes}`.trim();
              
              const { error: updateError } = await supabaseClient
                .from('projects')
                .update({ notes: newNotes })
                .eq('id', project.id);
                
              if (!updateError) {
                updatedCount++;
                console.log(`Successfully updated: ${project.name}`);
              } else {
                console.error(`Update failed for ${project.name}:`, updateError);
              }
            }
          }
          console.log(`Updated ${updatedCount} project(s).`);
        }
      }
    }

    return new Response(JSON.stringify({ success: true, message: "Webhook processed" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    console.error("Webhook processing error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200, // Return 200 even on error to stop Telegram from retrying endlessly
    })
  }
})
