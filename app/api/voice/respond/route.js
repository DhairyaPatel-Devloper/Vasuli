// app/api/voice/respond/route.js
// Sarvam Voice Agent Dialogue Logger & Webhook Turn Responder (Zero-LLM Server Dependency)

import { NextResponse } from 'next/server';
import { addToCallHistory, endCall } from '@/lib/call-memory';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlLeakId = searchParams.get('leakId');

    let body = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await request.json().catch(() => ({}));
    }

    const callId = body.call_id || body.callId || body.session_id || `sarvam_${Date.now()}`;
    const transcript = body.transcript || body.speechResult || body.user_transcript || body.text || '';
    const leakId = urlLeakId || body.leakId || body.leak_id;

    const supabase = getSupabaseServerClient();
    let leak = null;
    if (leakId) {
      const { data } = await supabase.from('leaks').select('*').eq('id', leakId).single();
      leak = data;
    }

    // Dynamic Variables
    const amount = String(body.amount || leak?.amount || 23424);
    const customer_name = body.customer_name || leak?.customer_name || 'Valued Customer';
    const gender = body.gender || leak?.gender || 'male';
    const razorpay_payment_id = body.razorpay_payment_id || leak?.razorpay_payment_id || 'pay_TY3ixhYyn5HWfv';

    // 1. Record incoming user transcript to memory
    if (transcript && transcript.trim()) {
      addToCallHistory(callId, 'user', transcript.trim());
    }

    // 2. The Sarvam Voice Agent platform handles conversation reasoning natively on its telephony servers
    // We parse agent reply from payload or return conversational script acknowledgment
    const agentReply = body.agent_reply || body.sarvam_reply || body.reply || 
      'Payment link aapke mobile number 9104898224 par SMS aur WhatsApp bhej diya gaya hai. Dhanyawaad! [END_CALL_RESOLVED]';

    addToCallHistory(callId, 'assistant', agentReply);

    // 3. Outcome Marker Evaluation
    const hasResolved = agentReply.includes('[END_CALL_RESOLVED]') || body.status === 'completed' || body.resolved === true;
    const hasEscalate = agentReply.includes('[END_CALL_ESCALATE]') || body.escalated === true;
    const hasNoResolution = agentReply.includes('[END_CALL_NO_RESOLUTION]') || body.status === 'no-answer';
    const isEndCall = hasResolved || hasEscalate || hasNoResolution;

    let outcomeMarker = null;
    let newLeakStatus = null;
    let auditOutcome = null;

    if (hasResolved) {
      outcomeMarker = 'END_CALL_RESOLVED';
      newLeakStatus = 'resolved';
      auditOutcome = 'Payment Recovered Successfully via Voice Agent';
    } else if (hasEscalate) {
      outcomeMarker = 'END_CALL_ESCALATE';
      newLeakStatus = 'escalated';
      auditOutcome = 'Disputed / Escalated to Operator Queue';
    } else if (hasNoResolution) {
      outcomeMarker = 'END_CALL_NO_RESOLUTION';
      newLeakStatus = 'needs_manual_diagnosis';
      auditOutcome = 'Call Concluded Without Resolution';
    }

    const cleanedReply = agentReply
      .replace(/\[END_CALL_(RESOLVED|ESCALATE|NO_RESOLUTION)\]/g, '')
      .trim();

    // 4. Update leak status & audit log if outcome is reached
    if (leakId && newLeakStatus) {
      await supabase
        .from('leaks')
        .update({ status: newLeakStatus })
        .eq('id', leakId);

      await supabase.from('audit_log').insert([
        {
          leak_id: leakId,
          event_timestamp: new Date().toISOString(),
          event_type: hasEscalate ? 'escalated' : 'acted',
          detail: `Voice call outcome [${outcomeMarker}]. Dialogue: "${cleanedReply}"`,
          outcome: auditOutcome,
        },
      ]);
    }

    // 5. Record turn into voice_call_logs table
    try {
      await supabase.from('voice_call_logs').insert([
        {
          leak_id: leakId || null,
          call_id: callId,
          agent_name: process.env.SARVAM_AGENT_NAME || 'Conversatio-7a28a6dd-fdfe',
          user_transcript: transcript || null,
          sarvam_reply: agentReply,
          cleaned_reply: cleanedReply,
          outcome_marker: outcomeMarker,
          is_end_call: isEndCall,
        },
      ]);
    } catch (dbErr) {
      console.warn('[voice/respond] Error logging to voice_call_logs:', dbErr.message);
    }

    if (isEndCall) {
      endCall(callId);
    }

    return NextResponse.json({
      success: true,
      callId,
      reply: agentReply,
      cleanedReply,
      endCall: isEndCall,
      outcomeMarker,
      variables: {
        amount,
        customer_name,
        gender,
        razorpay_payment_id,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
