import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { VOICE_SYSTEM_PROMPT } from '@/lib/voice-system-prompt';
import { getCallHistory, addToCallHistory, endCall } from '@/lib/call-memory';
import { executeWithCredential, getActiveCredential } from '@/lib/credential-resolver';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function createTwimlResponse(sayText, isEndCall = false, actionUrl = '/api/voice/respond') {
  const xmlEscaped = sayText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  let xml = '';
  if (isEndCall) {
    xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say>${xmlEscaped}</Say>
    <Hangup/>
</Response>`;
  } else {
    xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather action="${actionUrl}" input="speech">
        <Say>${xmlEscaped}</Say>
    </Gather>
</Response>`;
  }

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlLeakId = searchParams.get('leakId');

    let callSid = null;
    let speechResult = null;
    let bodyLeakId = null;

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      callSid = formData.get('CallSid') || formData.get('callSid');
      speechResult = formData.get('SpeechResult') || formData.get('speechResult');
      bodyLeakId = formData.get('leakId') || formData.get('LeakId');
    } else {
      const body = await request.json().catch(() => ({}));
      callSid = body.CallSid || body.callSid;
      speechResult = body.SpeechResult || body.speechResult;
      bodyLeakId = body.leakId || body.LeakId;
    }

    const leakId = urlLeakId || bodyLeakId;

    if (!callSid) {
      return NextResponse.json({ success: false, error: 'CallSid is required' }, { status: 400 });
    }

    // 1. Add incoming user speech to call history if present
    if (speechResult && speechResult.trim()) {
      addToCallHistory(callSid, 'user', speechResult.trim());
    }

    // 2. Execute Gemini call with active credential & rotation failover
    const executionResult = await executeWithCredential('llm_reasoning', async (apiKey, credRecord) => {
      const ai = new GoogleGenAI({ apiKey });
      const history = getCallHistory(callSid);

      // If call just started and no speech result was provided yet, include initial context turn
      const contents = history.length > 0
        ? history.map(turn => ({
            role: turn.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: turn.text }]
          }))
        : [{ role: 'user', parts: [{ text: 'Hello, I received a message regarding a payment.' }] }];

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        systemInstruction: VOICE_SYSTEM_PROMPT,
        contents,
      });

      return response.text;
    }, leakId);

    // 3. Handle Gemini execution failure
    if (!executionResult.success) {
      endCall(callSid);
      return createTwimlResponse(
        'We are currently experiencing technical difficulties. A payment recovery specialist will follow up with you shortly. Thank you.',
        true
      );
    }

    const geminiReply = executionResult.data || '';

    // 4. Save model reply to memory history
    addToCallHistory(callSid, 'assistant', geminiReply);

    // 5. Check reply for markers
    const MARKER_RESOLVED = '[END_CALL_RESOLVED]';
    const MARKER_ESCALATE = '[END_CALL_ESCALATE]';
    const MARKER_NO_RESOLUTION = '[END_CALL_NO_RESOLUTION]';

    const hasResolved = geminiReply.includes(MARKER_RESOLVED);
    const hasEscalate = geminiReply.includes(MARKER_ESCALATE);
    const hasNoResolution = geminiReply.includes(MARKER_NO_RESOLUTION);
    const hasMarker = hasResolved || hasEscalate || hasNoResolution;

    // Clean marker out before speaking
    const cleanedReply = geminiReply
      .replace(/\[END_CALL_(RESOLVED|ESCALATE|NO_RESOLUTION)\]/g, '')
      .trim();

    const actionUrl = `/api/voice/respond${leakId ? `?leakId=${encodeURIComponent(leakId)}` : ''}`;

    // 6. Handle Marker logic (Update DB, end call memory, return Hangup TwiML)
    if (hasMarker) {
      const supabase = getSupabaseServerClient();

      if (leakId) {
        if (hasResolved) {
          await supabase.from('leaks').update({ status: 'resolved' }).eq('id', leakId);
          await supabase.from('audit_log').insert([
            {
              leak_id: leakId,
              event_timestamp: new Date().toISOString(),
              event_type: 'acted',
              detail: `Voice call completed successfully. Customer agreed to retry or set payment date. Spoken: "${cleanedReply}"`,
              outcome: 'Payment Recovered Successfully',
            },
          ]);
        } else if (hasEscalate) {
          await supabase.from('leaks').update({ status: 'needs_manual_diagnosis' }).eq('id', leakId);
          await supabase.from('audit_log').insert([
            {
              leak_id: leakId,
              event_timestamp: new Date().toISOString(),
              event_type: 'escalated',
              detail: `Voice call escalated to operator queue due to dispute language. Spoken: "${cleanedReply}"`,
              outcome: 'Escalated to Specialist',
            },
          ]);
        } else if (hasNoResolution) {
          await supabase.from('leaks').update({ status: 'action_taken' }).eq('id', leakId);
          await supabase.from('audit_log').insert([
            {
              leak_id: leakId,
              event_timestamp: new Date().toISOString(),
              event_type: 'acted',
              detail: `Voice call ended with no commitment. Spoken: "${cleanedReply}"`,
              outcome: 'Call Ended - No Resolution',
            },
          ]);
        }
      }

      endCall(callSid);
      return createTwimlResponse(cleanedReply, true, actionUrl);
    }

    // 7. No marker found — respond with Gather to keep call active
    return createTwimlResponse(cleanedReply, false, actionUrl);
  } catch (error) {
    console.error('Error in voice respond route:', error);
    return createTwimlResponse(
      'An unexpected error occurred during the call. An operator will reach out to assist you.',
      true
    );
  }
}

export async function GET(request) {
  return POST(request);
}
