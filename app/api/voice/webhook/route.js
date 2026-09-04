// app/api/voice/webhook/route.js
// Dedicated Sarvam AI Voice Agent Lifecycle & Call-End Webhook Endpoint

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { endCall } from '@/lib/call-memory';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlLeakId = searchParams.get('leakId');

    const body = await request.json().catch(() => ({}));
    const supabase = getSupabaseServerClient();

    const callId = body.call_id || body.callId || body.session_id || body.job_id || `sarvam_${Date.now()}`;
    const leakId = urlLeakId || body.leakId || body.leak_id || body.variables?.leak_id;
    const callStatus = body.status || body.call_status || body.job_state || 'completed';
    const transcript = body.transcript || body.conversation_transcript || body.summary || '';
    const recordingUrl = body.recording_url || body.audio_url || null;

    // Variables from Sarvam
    const vars = body.variables || body.user_config || {};
    const amount = vars.amount || '23424';
    const customerName = vars.customer_name || 'Valued Customer';
    const gender = vars.gender || 'male';
    const razorpayPaymentId = vars.razorpay_payment_id || 'pay_unknown';

    // Outcome determination
    const isCompleted = callStatus.toLowerCase().includes('completed') || callStatus.toLowerCase().includes('success');
    const isFailed = callStatus.toLowerCase().includes('failed') || callStatus.toLowerCase().includes('no-answer');

    let outcomeMarker = isCompleted ? 'END_CALL_RESOLVED' : 'END_CALL_NO_RESOLUTION';
    let newStatus = isCompleted ? 'resolved' : 'needs_manual_diagnosis';
    let outcomeText = isCompleted ? 'Payment Recovered via Voice Agent' : `Call Ended: ${callStatus}`;

    // Update leaks table
    if (leakId) {
      await supabase
        .from('leaks')
        .update({ status: newStatus })
        .eq('id', leakId);

      await supabase.from('audit_log').insert([
        {
          leak_id: leakId,
          event_timestamp: new Date().toISOString(),
          event_type: 'acted',
          detail: `Sarvam Voice Agent call finished (Status: ${callStatus}). Variables: amount=₹${amount}, customer=${customerName}, ref=${razorpayPaymentId}. Summary: "${transcript.substring(0, 120)}"`,
          outcome: outcomeText,
        },
      ]);
    }

    // Insert call conclusion row into voice_call_logs table
    try {
      await supabase.from('voice_call_logs').insert([
        {
          leak_id: leakId || null,
          call_id: callId,
          agent_name: process.env.SARVAM_AGENT_NAME || 'Conversatio-7a28a6dd-fdfe',
          user_transcript: transcript || `Status: ${callStatus}`,
          sarvam_reply: `Call session concluded with status: ${callStatus}. Recording: ${recordingUrl || 'N/A'}`,
          cleaned_reply: `Call status: ${callStatus}`,
          outcome_marker: outcomeMarker,
          is_end_call: true,
        },
      ]);
    } catch (dbErr) {
      console.warn('[voice/webhook] voice_call_logs insert warning:', dbErr.message);
    }

    endCall(callId);

    return NextResponse.json({
      success: true,
      callId,
      status: 'received',
      leakStatus: newStatus,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return POST(request);
}
