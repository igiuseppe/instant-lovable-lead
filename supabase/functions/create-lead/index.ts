import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, surname, email, phone, website } = await req.json();

    // Validate required fields
    if (!name || !email || !phone) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name, email, phone' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create the lead
    const { data: lead, error } = await supabase
      .from('leads')
      .insert([
        {
          name,
          surname: surname || '',
          email,
          phone,
          website: website || null,
          status: 'new',
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Lead created successfully:', lead.id);

    // Automatically trigger the qualification call
    console.log('Starting qualification call for lead:', lead.id);
    const { data: callData, error: callError } = await supabase.functions.invoke(
      'start-qualification-call',
      {
        body: { leadId: lead.id }
      }
    );

    if (callError) {
      console.error('Error starting qualification call:', callError);
      // Still return success for lead creation, but note the call failed
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Lead created successfully, but qualification call failed to start',
          lead: {
            id: lead.id,
            name: lead.name,
            surname: lead.surname,
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            status: lead.status,
            created_at: lead.created_at
          },
          call_started: false,
          call_error: callError.message
        }),
        { 
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log('Qualification call started successfully');

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Lead created and qualification call started successfully',
        lead: {
          id: lead.id,
          name: lead.name,
          surname: lead.surname,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
          status: lead.status,
          created_at: lead.created_at
        },
        call_started: true,
        call_data: callData
      }),
      { 
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error creating lead:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
