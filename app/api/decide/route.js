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
        const amountNum = Number(leak.amount) || 0;
        const prompt = `You are a recovery decision engine calculating Expected Value (EV) recovery score.
Leak Metadata:
- Amount: INR ${amountNum}
- Root Cause: ${cause}

Decision Rules:
- High amount (₹5,000+) or repeated bank decline failures: choose 'initiate_call' (EV score 85-95).
- Lower amount (< ₹5,000) or customer-fixable error: choose 'send_email' (EV score 70-85).
Respond ONLY in JSON:
{"ev_score": number, "chosen_action": "initiate_call" | "send_email"}`;

        const response = await client.chat.completions({
          model: 'sarvam-105b',
          messages: [{ role: 'user', content: prompt }],
        });

        const rawContent = response.choices?.[0]?.message?.content || '';
        let evScore = amountNum >= 5000 ? 92 : 78;
        let chosenAction = amountNum >= 5000 ? 'initiate_call' : 'send_email';
        if (cause === 'customer_error' && amountNum < 5000) {
          evScore = 82;
          chosenAction = 'send_email';
        } else if (cause === 'bank_decline_soft' && amountNum >= 5000) {
          evScore = 93;
          chosenAction = 'initiate_call';
        }

        try {
          const parsed = JSON.parse(rawContent.replace(/```json|```/g, '').trim());
          if (typeof parsed.ev_score === 'number') {
            evScore = Math.min(100, Math.max(0, Math.round(parsed.ev_score)));
          }
          if (['initiate_call', 'send_email'].includes(parsed.chosen_action)) {
            chosenAction = parsed.chosen_action;
          }
        } catch (e) { }

        return { evScore, chosenAction };
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

    // Update leak record with chosen recovery action
    const { data: updatedLeak } = await supabase
      .from('leaks')
      .update({
        ev_score: evScore,
        chosen_action: chosenAction,
        status: newStatus,
      })
      .eq('id', leakId)
      .select('*')
      .single();

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

    // Automatically trigger execution via /api/act or /api/notify-email
    let actionExecuted = false;
    let actionOutcome = null;
    try {
      const origin = new URL(request.url).origin;
      const targetUrl = chosenAction === 'send_email' ? `${origin}/api/notify-email` : `${origin}/api/act`;
      const actRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakId, action: chosenAction }),
      });
      const actData = await actRes.json();
      actionExecuted = actData.success;
      actionOutcome = actData.outcome || actData.message || (actData.emailId ? `Email sent to ${actData.sentTo}` : null);
    } catch (actErr) {
      console.warn('[decide] Auto-dispatch act failed:', actErr.message);
    }

    return NextResponse.json({
      success: true,
      leakId,
      evScore,
      chosenAction,
      status: updatedLeak?.status || newStatus,
      leak: updatedLeak,
      actionExecuted,
      actionOutcome,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
