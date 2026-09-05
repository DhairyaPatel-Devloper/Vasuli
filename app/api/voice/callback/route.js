// app/api/voice/callback/route.js
// Sarvam Voice Agent Post-Call Webhook Handler
// Receives output variables: call_disposition, call_summary, promise_to_pay_date

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { searchParams } = new URL(request.url);

    console.log('[voice/callback] Raw webhook payload:', JSON.stringify(body, null, 2));

    // 1. Extract leak_id from metadata
    const leakId =
      body.webhook_config?.metadata?.leak_id ||
      body.metadata?.leak_id ||
      body.leak_id ||
      searchParams.get('leakId');

    if (!leakId) {
      return NextResponse.json(
        { success: false, error: 'leak_id missing in webhook metadata' },
        { status: 400 }
      );
    }

    // 2. Extract Sarvam output variables
    const outputVars =
      body.final_agent_variables ||
      body.output_variables ||
      body.agent_variables ||
      body.variables ||
      {};

    const callDisposition = outputVars.call_disposition || 'not_reachable';
    const callSummary = outputVars.call_summary || '';
    const promiseToPayDate = outputVars.promise_to_pay_date || '';

    // 3. Extract call metadata
    const callId = body.call_id || body.callId || body.session_id || body.interaction_id || `sarvam_${Date.now()}`;
    const callStatus = (body.completion_status || body.status || body.call_status || 'completed').toLowerCase();
    const transcript = body.interaction_transcript || body.transcript || body.user_transcript || '';
    const recordingUrl = body.recording_url || body.audio_url || null;
    const callDuration = body.duration || body.call_duration || null;

    // Also read input variables back for logging
    const inputVars = body.initial_agent_variables || body.input_variables || {};
    const customerName = inputVars.customer_name || outputVars.customer_name || '';
    const amount = inputVars.amount || outputVars.amount || '';
    const razorpayPaymentId = inputVars.razorpay_payment_id || outputVars.razorpay_payment_id || '';

    const supabase = getSupabaseServerClient();

    // 4. Map call_disposition → leak status
    let newLeakStatus = 'open';
    let eventType = 'acted';
    let outcome = callDisposition;

    switch (callDisposition) {
      case 'payment_confirmed':
        newLeakStatus = 'resolved';
        eventType = 'acted';
        outcome = 'Payment confirmed by customer';
        break;
      case 'promise_to_pay':
        newLeakStatus = 'action_taken';
        eventType = 'acted';
        outcome = `Customer promised to pay${promiseToPayDate ? ` by ${promiseToPayDate}` : ''}`;
        break;
      case 'dispute_raised':
        newLeakStatus = 'escalated';
        eventType = 'escalated';
        outcome = 'Customer raised dispute';
        break;
      case 'refused':
        newLeakStatus = 'needs_manual_diagnosis';
        eventType = 'acted';
        outcome = 'Customer refused to pay';
        break;
      case 'wrong_person':
        newLeakStatus = 'needs_manual_diagnosis';
        eventType = 'acted';
        outcome = 'Wrong person reached';
        break;
      case 'not_reachable':
        newLeakStatus = 'open';
        eventType = 'acted';
        outcome = 'Customer not reachable';
        break;
      case 'voicemail_left':
        newLeakStatus = 'action_taken';
        eventType = 'acted';
        outcome = 'Voicemail left for customer';
        break;
      case 'sensitive_escalation':
        newLeakStatus = 'escalated';
        eventType = 'escalated';
        outcome = 'Sensitive topic — escalated';
        break;
      default:
        newLeakStatus = 'open';
        eventType = 'acted';
        outcome = `Call ended: ${callDisposition}`;
    }

    const detail = `Voice call ${callStatus}. Disposition: ${callDisposition}. Summary: "${callSummary || 'N/A'}". Customer: ${customerName}, Amount: ₹${amount}, Ref: ${razorpayPaymentId}`;

    // 5. Update leaks table
    const { error: leakUpdateError } = await supabase
      .from('leaks')
      .update({ status: newLeakStatus })
      .eq('id', leakId);

    if (leakUpdateError) {
      console.error('[voice/callback] Error updating leak:', leakUpdateError);
    }

    // 6. Record audit log
    await supabase.from('audit_log').insert([
      {
        leak_id: leakId,
        event_timestamp: new Date().toISOString(),
        event_type: eventType,
        detail,
        outcome,
      },
    ]);

    // 7. Insert into voice_call_logs with output variables
    try {
      await supabase.from('voice_call_logs').insert([
        {
          leak_id: leakId,
          call_id: callId,
          agent_name: 'Vasuli - Razorpay Payment Recovery',
          user_transcript: transcript || `Status: ${callStatus}`,
          sarvam_reply: callSummary || `Call ${callStatus}`,
          cleaned_reply: `Disposition: ${callDisposition}${promiseToPayDate ? ` | Pay by: ${promiseToPayDate}` : ''}`,
          outcome_marker: callDisposition,
          is_end_call: true,
        },
      ]);
    } catch (dbErr) {
      console.warn('[voice/callback] voice_call_logs insert warning:', dbErr.message);
    }

    console.log(`[voice/callback] Processed: leak=${leakId}, disposition=${callDisposition}, status→${newLeakStatus}`);

    return NextResponse.json({
      success: true,
      leakId,
      callId,
      callDisposition,
      callSummary,
      promiseToPayDate,
      leakStatus: newLeakStatus,
      outcome,
    });
  } catch (error) {
    console.error('[voice/callback] Unexpected error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return POST(request);
}
