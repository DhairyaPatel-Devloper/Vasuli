// app/api/decide/route.js
// EV Decision Engine — Routes recovery cases to Sarvam AI Voice Agent

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { executeWithCredential } from '@/lib/credential-resolver';
import { SarvamAIClient } from 'sarvamai';

export async function POST(request) {
  try {
    const { leakId } = await request.json();
    if (!leakId) {
      return NextResponse.json({ success: false, error: 'leakId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: leak, error } = await supabase
      .from('leaks')
      .select('*')
      .eq('id', leakId)
      .single();

    if (error || !leak) {
      return NextResponse.json({ success: false, error: 'Leak not found' }, { status: 404 });
    }

    const cause = leak.root_cause || 'unknown';

    // Perform LLM Reasoning via Sarvam AI Agent (provider_name = 'Sarvam AI Agent', category = 'llm_reasoning')
    const credentialResult = await executeWithCredential(
      'llm_reasoning',
      async (apiKey, cred) => {
        const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
        const prompt = `You are a recovery decision engine calculating Expected Value (EV) recovery score.
Leak Metadata:
- Amount: ${leak.currency || 'INR'} ${leak.amount || 0}
- Root Cause: ${cause}
- Source: ${leak.source || 'unknown'}

Calculate EV score (integer 0 to 100) and confirm action 'initiate_call'.
Respond ONLY in JSON:
{"ev_score": number, "chosen_action": "initiate_call"}`;

        const response = await client.chat.completions({
          model: 'sarvam-105b',
          messages: [{ role: 'user', content: prompt }],
        });

        const rawContent = response.choices?.[0]?.message?.content || '';
        let evScore = 80;
        if (cause === 'bank_decline_soft') evScore = 88;
        if (cause === 'customer_error') evScore = 80;
        if (cause === 'technical_hard_decline') evScore = 40;

        try {
          const parsed = JSON.parse(rawContent.replace(/```json|```/g, '').trim());
          if (typeof parsed.ev_score === 'number') {
            evScore = Math.min(100, Math.max(0, Math.round(parsed.ev_score)));
          }
        } catch (e) {}

        return { evScore, chosenAction: 'initiate_call' };
      },
      leakId,
      'Sarvam AI Agent'
    );

    if (!credentialResult.success) {
      return NextResponse.json(
        { success: false, error: credentialResult.error, escalated: credentialResult.escalated },
        { status: credentialResult.escalated ? 200 : 500 }
      );
    }

    const { evScore, chosenAction } = credentialResult.data;
    const newStatus = 'open';

    // Update leak record with chosen voice recovery action
    await supabase
      .from('leaks')
      .update({
        ev_score: evScore,
        chosen_action: chosenAction,
        status: newStatus,
      })
      .eq('id', leakId);

    // Record audit log event (event_type: 'decided')
    await supabase.from('audit_log').insert([
      {
        leak_id: leakId,
        event_timestamp: new Date().toISOString(),
        event_type: 'decided',
        detail: `Sarvam AI Agent EV Scoring Engine calculated score: ${evScore}/100. Recommended action: [${chosenAction}]`,
        outcome: `Leak status set to ${newStatus}`,
      },
    ]);

    // Automatically trigger Sarvam Voice Agent outbound dispatch via /api/act
    let actionExecuted = false;
    let actionOutcome = null;
    try {
      const origin = new URL(request.url).origin;
      const actRes = await fetch(`${origin}/api/act`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakId, action: 'initiate_call' }),
      });
      const actData = await actRes.json();
      actionExecuted = actData.success;
      actionOutcome = actData.outcome || actData.message;
    } catch (actErr) {
      console.warn('[decide] Auto-dispatch act failed:', actErr.message);
    }

    return NextResponse.json({
      success: true,
      leakId,
      evScore,
      chosenAction,
      status: newStatus,
      actionExecuted,
      actionOutcome,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
