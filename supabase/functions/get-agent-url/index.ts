import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('🔵 get-agent-url function invoked');
    const { agentId } = await req.json();
    console.log('🔵 Agent ID received:', agentId);

    if (!agentId) {
      console.error('❌ No Agent ID provided');
      throw new Error('Agent ID is required');
    }

    const ELEVENLABS_API_KEY = Deno.env.get('ELEVENLABS_API_KEY');
    const hasApiKey = !!ELEVENLABS_API_KEY;
    console.log('🔵 ELEVENLABS_API_KEY configured:', hasApiKey);
    
    if (!ELEVENLABS_API_KEY) {
      console.error('❌ ELEVENLABS_API_KEY is not configured');
      throw new Error('ELEVENLABS_API_KEY is not configured');
    }

    console.log('🔵 Requesting signed URL from ElevenLabs...');
    // Get signed URL from ElevenLabs API
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?agent_id=${agentId}`,
      {
        method: 'GET',
        headers: {
          'xi-api-key': ELEVENLABS_API_KEY,
        },
      }
    );

    console.log('🔵 ElevenLabs API response status:', response.status);

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ ElevenLabs API error:', error);
      throw new Error(`Failed to get signed URL: ${error}`);
    }

    const data = await response.json();
    console.log('✅ Signed URL received successfully');
    console.log('🔵 Signed URL data:', { hasSignedUrl: !!data.signed_url });

    return new Response(
      JSON.stringify({ signedUrl: data.signed_url }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('❌ Error in get-agent-url:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
