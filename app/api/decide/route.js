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

    // High Value + Repeated Failures rule for initiate_call
    const HIGH_VALUE_THRESHOLD = 5000;

    // Count prior failed automated attempts (event_type = 'acted')
    const { data: actedLogs } = await supabase
      .from('audit_log')
      .select('id')
      .eq('leak_id', leakId)
      .eq('event_type', 'acted');

    const priorActedCount = actedLogs ? actedLogs.length : 0;
    const isHighValue = Number(leak.amount) >= HIGH_VALUE_THRESHOLD;

    let chosenAction = null;

    // Check initiate_call priority rule FIRST
    if (isHighValue && priorActedCount >= 2 && leak.status !== 'resolved') {
      chosenAction = 'initiate_call';
    } else {
      // Calculate EV score & fallback to standard EV logic
      const cause = leak.root_cause || 'unknown';
      let probability = 0.75;
      if (cause === 'bank_decline_soft') probability = 0.88;
      if (cause === 'customer_error') probability = 0.65;
      if (cause === 'technical_hard_decline') probability = 0.20;

      const evScore = Math.round(probability * 100);

      if (evScore > 80) {
        chosenAction = 'retry_now';
      } else if (evScore > 60) {
        chosenAction = 'send_payment_link';
      } else if (evScore > 40) {
        chosenAction = 'retry_scheduled';
      } else if (evScore > 20) {
        chosenAction = 'notify_customer';
      } else {
        chosenAction = 'no_action';
      }
    }

    const cause = leak.root_cause || 'unknown';
    let probability = 0.75;
    if (cause === 'bank_decline_soft') probability = 0.88;
    if (cause === 'customer_error') probability = 0.65;
    if (cause === 'technical_hard_decline') probability = 0.20;
    const evScore = Math.round(probability * 100);

    const newStatus = chosenAction === 'no_action' ? 'needs_manual_diagnosis' : 'open';

    // Update leak record
    await supabase
      .from('leaks')
      .update({
        ev_score: evScore,
        chosen_action: chosenAction,
        status: newStatus,
      })
      .eq('id', leakId);

    // Record audit log (event_type: 'decided')
    await supabase.from('audit_log').insert([
      {
        leak_id: leakId,
        event_timestamp: new Date().toISOString(),
        event_type: 'decided',
        detail: `EV Scoring Engine calculated score: ${evScore}/100. Recommended action: [${chosenAction}]`,
        outcome: `Leak status set to ${newStatus}`,
      },
    ]);

    return NextResponse.json({
      success: true,
      leakId,
      evScore,
      chosenAction,
      status: newStatus,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
