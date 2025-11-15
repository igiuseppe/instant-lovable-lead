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
    const { leadId } = await req.json();

    if (!leadId) {
      throw new Error('Lead ID is required');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single();

    if (leadError || !lead) {
      throw new Error('Lead not found');
    }

    // Update status to calling
    await supabase
      .from('leads')
      .update({
        status: 'calling',
        call_started_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    // Simulate call with AI - Generate qualification data
    const qualificationPrompt = `
You are an AI voice agent conducting a lead qualification call for CommerceClarity, a retail analytics platform.

Lead information:
- Name: ${lead.name} ${lead.surname}
- Email: ${lead.email}
- Website: ${lead.website || 'Not provided'}

Your task is to simulate a completed qualification call and provide structured output.

Qualification Criteria:
- Qualified if: 10,000+ monthly visits OR 500+ monthly orders, interested in analytics/CRO/personalization, timeline ≤ 3 months
- Score 70-100% = Qualified
- Score 40-69% = Potential
- Score 0-39% = Not Qualified

Generate realistic call data including:
1. Current platform (e.g., Shopify, WooCommerce, Custom)
2. Monthly traffic (number)
3. Monthly orders (number)
4. Improvement areas (array of 2-3 items)
5. Implementation timeline
6. Brief call summary (2-3 sentences)
7. Key insights (array of 3-4 items)
8. Objections if any (array of 0-2 items)
9. Qualification result (Qualified/Potential/Not Qualified)
10. Qualification score (0-100)
11. Next actions (array of 2-3 items)
12. Meeting scheduled (boolean)

Respond ONLY with valid JSON matching this exact structure:
{
  "current_platform": "string",
  "monthly_traffic": number,
  "monthly_orders": number,
  "improvement_areas": ["string"],
  "implementation_timeline": "string",
  "call_summary": "string",
  "key_insights": ["string"],
  "objections": ["string"],
  "qualification_result": "string",
  "qualification_score": number,
  "next_actions": ["string"],
  "meeting_scheduled": boolean
}`;

    // Call Lovable AI for qualification
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
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
            content: 'You are a helpful AI that generates realistic sales qualification data in JSON format. Always respond with valid JSON only, no markdown or extra text.',
          },
          {
            role: 'user',
            content: qualificationPrompt,
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      
      // Fallback to basic simulation if AI fails
      const fallbackData = generateFallbackData();
      await updateLeadWithResults(supabase, leadId, fallbackData);
      
      return new Response(
        JSON.stringify({ success: true, mode: 'fallback' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    let qualificationData;

    try {
      const content = aiData.choices[0].message.content;
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      qualificationData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      qualificationData = generateFallbackData();
    }

    // Update lead with qualification results
    await updateLeadWithResults(supabase, leadId, qualificationData);

    return new Response(
      JSON.stringify({ success: true, leadId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in start-qualification-call:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function generateFallbackData() {
  return {
    current_platform: 'Shopify',
    monthly_traffic: 15000,
    monthly_orders: 650,
    improvement_areas: ['Conversion optimization', 'Analytics insights', 'Personalization'],
    implementation_timeline: 'Within 2 months',
    call_summary: 'Productive call with strong interest in analytics and conversion optimization. Currently using basic analytics and looking to upgrade.',
    key_insights: [
      'High traffic but lower conversion rate indicates optimization opportunity',
      'Currently using basic Shopify analytics, needs more depth',
      'Budget approved for Q1 implementation',
    ],
    objections: ['Concerned about implementation timeline'],
    qualification_result: 'Qualified',
    qualification_score: 85,
    next_actions: [
      'Send detailed product demo',
      'Schedule follow-up with technical team',
      'Provide case studies from similar retailers',
    ],
    meeting_scheduled: true,
  };
}

async function updateLeadWithResults(supabase: any, leadId: string, data: any) {
  const callEndTime = new Date();
  const callStartTime = new Date(callEndTime.getTime() - 180000); // 3 minutes ago

  // Determine final status
  let finalStatus = 'call_completed';
  if (data.qualification_score >= 70) {
    finalStatus = 'qualified';
  } else if (data.qualification_score < 40) {
    finalStatus = 'not_qualified';
  }

  await supabase
    .from('leads')
    .update({
      status: finalStatus,
      call_ended_at: callEndTime.toISOString(),
      call_duration_seconds: 180,
      current_platform: data.current_platform,
      monthly_traffic: data.monthly_traffic,
      monthly_orders: data.monthly_orders,
      improvement_areas: data.improvement_areas,
      implementation_timeline: data.implementation_timeline,
      call_summary: data.call_summary,
      key_insights: data.key_insights,
      objections: data.objections || [],
      qualification_result: data.qualification_result,
      qualification_score: data.qualification_score,
      next_actions: data.next_actions,
      meeting_scheduled: data.meeting_scheduled,
      meeting_datetime: data.meeting_scheduled
        ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 1 week from now
        : null,
    })
    .eq('id', leadId);
}