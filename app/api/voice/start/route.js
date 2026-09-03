import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

function createInitialTwimlResponse(sayText, actionUrl) {
  const xmlEscaped = sayText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Gather action="${actionUrl}" input="speech">
        <Say>${xmlEscaped}</Say>
    </Gather>
</Response>`;

  return new Response(xml, {
    status: 200,
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}

export async function POST(request) {
  try {
    const { searchParams } = new URL(request.url);
    const urlLeakId = searchParams.get('leakId');

    let bodyLeakId = null;
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/x-www-form-urlencoded') || contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      bodyLeakId = formData.get('leakId') || formData.get('LeakId');
    } else {
      const body = await request.json().catch(() => ({}));
      bodyLeakId = body.leakId || body.LeakId;
    }

    const leakId = urlLeakId || bodyLeakId;

    if (leakId) {
      const supabase = getSupabaseServerClient();
      await supabase.from('audit_log').insert([
        {
          leak_id: leakId,
          event_timestamp: new Date().toISOString(),
          event_type: 'acted',
          detail: `Outbound Twilio voice call connected for leak ${leakId}. Webhook triggered /api/voice/start.`,
          outcome: 'Voice Call Started',
        },
      ]);
    }

    const respondActionUrl = `/api/voice/respond${leakId ? `?leakId=${encodeURIComponent(leakId)}` : ''}`;
    const initialGreeting = 'Namaste! Main Payment Recovery Assistant bol raha hoon. Aapka payment issue ho gaya tha, kya aap abhi retry karna chahte hain?';

    return createInitialTwimlResponse(initialGreeting, respondActionUrl);
  } catch (error) {
    console.error('Error in voice start route:', error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Say>An error occurred starting the call.</Say><Hangup/></Response>`,
      { status: 200, headers: { 'Content-Type': 'text/xml; charset=utf-8' } }
    );
  }
}

export async function GET(request) {
  return POST(request);
}
