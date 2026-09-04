// app/api/decide/route.js
// EV Decision Engine — Routes all recovery cases to Sarvam AI Voice Agent

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

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

    // Voice Agent is the single dedicated recovery channel
    const chosenAction = 'initiate_call';
    const cause = leak.root_cause || 'unknown';

    // Calculate Expected Value (EV) recovery score (0 - 100)
    let probability = 0.80;
    if (cause === 'bank_decline_soft') probability = 0.88;
    if (cause === 'customer_error') probability = 0.80;
    if (cause === 'technical_hard_decline') probability = 0.40;
    const evScore = Math.round(probability * 100);

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
        detail: `EV Scoring Engine calculated score: ${evScore}/100. Recommended action: [${chosenAction}]`,
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
