import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { leadId, transcript } = await req.json();
    console.log('Processing transcript for lead:', leadId);

    if (!transcript || transcript.trim() === '') {
      throw new Error('Transcript is empty');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Call Lovable AI to process the transcript
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant analyzing sales call transcripts. Extract and structure the following information from the transcript:
            
1. Call Summary: A concise 2-3 sentence summary of the conversation
2. Qualification Score: A number from 0-100 representing how qualified the lead is (based on budget, authority, need, timeline)
3. Key Insights: An array of 3-5 bullet points about the prospect's business, pain points, and opportunities
4. Demo Personalization: Specific recommendations for personalizing the demo based on the conversation
5. Booked Meeting: If a meeting was scheduled, extract the date and time. Return null if no meeting was scheduled.

Return ONLY a valid JSON object with this exact structure:
{
  "call_summary": "string",
  "qualification_score": number,
  "key_insights": ["string", "string", ...],
  "demo_personalization": "string",
  "meeting_datetime": "ISO8601 datetime or null"
}`
          },
          {
            role: 'user',
            content: `Analyze this sales call transcript:\n\n${transcript}`
          }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_call_data",
              description: "Extract structured data from the call transcript",
              parameters: {
                type: "object",
                properties: {
                  call_summary: { type: "string" },
                  qualification_score: { type: "number", minimum: 0, maximum: 100 },
                  key_insights: { type: "array", items: { type: "string" } },
                  demo_personalization: { type: "string" },
                  meeting_datetime: { type: "string", nullable: true }
                },
                required: ["call_summary", "qualification_score", "key_insights", "demo_personalization", "meeting_datetime"],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "extract_call_data" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response:', JSON.stringify(aiData));

    // Extract the tool call result
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || !toolCall.function?.arguments) {
      throw new Error('No tool call in AI response');
    }

    const result = JSON.parse(toolCall.function.arguments);
    console.log('Extracted data:', result);

    // Update the lead in Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const updateData: any = {
      transcript,
      call_summary: result.call_summary,
      qualification_score: result.qualification_score,
      key_insights: result.key_insights,
      next_actions: [result.demo_personalization],
    };

    if (result.meeting_datetime) {
      updateData.meeting_scheduled = true;
      updateData.meeting_datetime = result.meeting_datetime;
    }

    const { data, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', leadId)
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log('Lead updated successfully:', data);

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing transcript:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
