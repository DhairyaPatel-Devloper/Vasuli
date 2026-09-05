// app/api/voice/webhook/route.js
// Sarvam AI Voice Agent Lifecycle & Call-End Webhook Endpoint
// Extracts output variables: call_disposition, call_summary, promise_to_pay_date

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlLeakId = searchParams.get('leakId');

    const body = await request.json().catch(() => ({}));
    const supabase = getSupabaseServerClient();

    console.log('[voice/webhook] Raw payload:', JSON.stringify(body, null, 2));

    // 1. Extract identifiers
    const callId = body.call_id || body.callId || body.session_id || body.interaction_id || `sarvam_${Date.now()}`;
    const leakId = urlLeakId || body.leak_id || body.leakId || body.webhook_config?.metadata?.leak_id || body.metadata?.leak_id;
    const callStatus = (body.status || body.call_status || body.completion_status || 'completed').toLowerCase();
    const transcript = body.transcript || body.interaction_transcript || body.conversation_transcript || '';
    const recordingUrl = body.recording_url || body.audio_url || null;

    // 2. Extract Sarvam output variables
    const outputVars =
      body.final_agent_variables ||
      body.output_variables ||
      body.agent_variables ||
      body.variables ||
      {};

    const callDisposition = outputVars.call_disposition || '';
    const callSummary = outputVars.call_summary || '';
    const promiseToPayDate = outputVars.promise_to_pay_date || '';

    // Input variables (echoed back)
    const inputVars = body.initial_agent_variables || body.input_variables || {};
    const amount = inputVars.amount || outputVars.amount || '';
    const customerName = inputVars.customer_name || outputVars.customer_name || '';
    const razorpayPaymentId = inputVars.razorpay_payment_id || outputVars.razorpay_payment_id || '';

    // 3. Map disposition → leak status
    let newStatus = 'open';
    let outcomeText = `Call ended: ${callStatus}`;

    if (callDisposition) {
      switch (callDisposition) {
        case 'payment_confirmed':
          newStatus = 'resolved';
          outcomeText = 'Payment confirmed via voice agent';
          break;
        case 'promise_to_pay':
          newStatus = 'action_taken';
          outcomeText = `Customer promised to pay${promiseToPayDate ? ` by ${promiseToPayDate}` : ''}`;
          break;
        case 'dispute_raised':
          newStatus = 'escalated';
          outcomeText = 'Customer raised dispute';
          break;
        case 'refused':
          newStatus = 'needs_manual_diagnosis';
          outcomeText = 'Customer refused to pay';
          break;
        case 'wrong_person':
          newStatus = 'needs_manual_diagnosis';
          outcomeText = 'Wrong person reached';
          break;
        case 'not_reachable':
          newStatus = 'open';
          outcomeText = 'Customer not reachable';
          break;
        case 'voicemail_left':
          newStatus = 'action_taken';
          outcomeText = 'Voicemail left';
          break;
        case 'sensitive_escalation':
          newStatus = 'escalated';
          outcomeText = 'Sensitive topic — escalated';
          break;
      }
    } else {
      // Fallback: no disposition, use call status
      newStatus = callStatus.includes('completed') ? 'action_taken' : 'open';
      outcomeText = `Call ${callStatus} (no disposition received)`;
    }

    // 4. Update leaks table
    if (leakId) {
      await supabase
        .from('leaks')
        .update({ status: newStatus })
        .eq('id', leakId);

      await supabase.from('audit_log').insert([
        {
          leak_id: leakId,
          event_timestamp: new Date().toISOString(),
          event_type: callDisposition === 'dispute_raised' || callDisposition === 'sensitive_escalation' ? 'escalated' : 'acted',
          detail: `Voice call ${callStatus}. Disposition: ${callDisposition || 'N/A'}. Summary: "${callSummary || 'N/A'}". Customer: ${customerName}, Amount: ₹${amount}, Ref: ${razorpayPaymentId}`,
          outcome: outcomeText,
        },
      ]);
    }

    // 5. Insert into voice_call_logs
    try {
      await supabase.from('voice_call_logs').insert([
        {
          leak_id: leakId || null,
          call_id: callId,
          agent_name: 'Vasuli - Razorpay Payment Recovery',
          user_transcript: transcript || `Status: ${callStatus}`,
          sarvam_reply: callSummary || `Call ${callStatus}. Recording: ${recordingUrl || 'N/A'}`,
          cleaned_reply: `Disposition: ${callDisposition || 'N/A'}${promiseToPayDate ? ` | Pay by: ${promiseToPayDate}` : ''}`,
          outcome_marker: callDisposition || callStatus,
          is_end_call: true,
        },
      ]);
    } catch (dbErr) {
      console.warn('[voice/webhook] voice_call_logs insert warning:', dbErr.message);
    }

    console.log(`[voice/webhook] Processed: leak=${leakId}, disposition=${callDisposition}, status→${newStatus}`);

    return NextResponse.json({
      success: true,
      callId,
      leakId,
      callDisposition,
      callSummary,
      promiseToPayDate,
      leakStatus: newStatus,
      outcome: outcomeText,
    });
  } catch (error) {
    console.error('[voice/webhook] Unexpected error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return POST(request);
}
