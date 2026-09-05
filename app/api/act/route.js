// app/api/act/route.js
// Sarvam AI Voice Agent Outbound Dispatch Engine

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { executeWithCredential } from '@/lib/credential-resolver';

export async function POST(request) {
  try {
    const { leakId, action: requestedAction } = await request.json();
    if (!leakId) {
      return NextResponse.json({ success: false, error: 'leakId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();

    // 1. Fetch leak metadata
    const { data: leak, error: leakError } = await supabase
      .from('leaks')
      .select('*')
      .eq('id', leakId)
      .single();

    if (leakError || !leak) {
      return NextResponse.json({ success: false, error: 'Leak not found' }, { status: 404 });
    }

    const actionToTake = requestedAction || leak.chosen_action || 'initiate_call';

    if (actionToTake === 'send_email') {
      const origin = new URL(request.url).origin;
      const emailRes = await fetch(`${origin}/api/notify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakId }),
      });
      const emailData = await emailRes.json();
      return NextResponse.json(emailData, { status: emailRes.status });
    }

    let customerPhone = (leak.customer_no || leak.customer_phone || '').trim();
    let customerNameVal = leak.customer_name || '';

    // 2. If phone is missing, automatically fetch from Razorpay API using payment_id
    if (!customerPhone && leak.razorpay_payment_id && !leak.razorpay_payment_id.startsWith('pay_seed') && !leak.razorpay_payment_id.startsWith('pay_test')) {
      try {
        const { data: rzpCreds } = await supabase
          .from('api_credentials')
          .select('*')
          .eq('category', 'payment_gateway')
          .eq('status', 'active')
          .order('priority', { ascending: true })
          .limit(1);

        if (rzpCreds && rzpCreds.length > 0) {
          const rzpKey = rzpCreds[0].encrypted_key;
          const rzpSecret = rzpCreds[0].encrypted_secret;
          const authHeader = 'Basic ' + Buffer.from(`${rzpKey}:${rzpSecret}`).toString('base64');
          
          console.log(`[act] Fetching customer contact from Razorpay API for ${leak.razorpay_payment_id}...`);
          const rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(leak.razorpay_payment_id)}`, {
            headers: { Authorization: authHeader },
          });

          if (rzpRes.ok) {
            const paymentData = await rzpRes.json();
            if (paymentData.contact) {
              customerPhone = paymentData.contact.trim();
              customerNameVal = paymentData.notes?.customer_name || paymentData.email?.split('@')[0] || customerNameVal;
              
              // Persist fetched phone & name to Supabase leaks table
              await supabase
                .from('leaks')
                .update({
                  customer_no: customerPhone,
                  customer_phone: customerPhone,
                  customer_name: customerNameVal || 'Valued Customer',
                })
                .eq('id', leakId);
              
              console.log(`[act] Successfully retrieved phone from Razorpay: ${customerPhone}`);
            }
          }
        }
      } catch (rzpErr) {
        console.warn('[act] Error fetching payment details from Razorpay API:', rzpErr.message);
      }
    }

    // 3. Fallback phone validation
    if (!customerPhone) {
      return NextResponse.json(
        {
          success: false,
          error: `customer_no is missing for leak ${leakId}. Please provide a valid phone number on the leak record or ensure Razorpay webhook includes customer contact.`,
        },
        { status: 400 }
      );
    }

    // Format phone number to E.164 format
    if (!customerPhone.startsWith('+')) {
      customerPhone = customerPhone.startsWith('91') ? `+${customerPhone}` : `+91${customerPhone}`;
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const callbackUrl = `${baseUrl}/api/voice/callback`;
    customerNameVal = customerNameVal || leak.customer_name || 'Valued Customer';
    const amountVal = String(leak.amount || 0);
    const genderVal = leak.gender || 'male';
    const razorpayPaymentIdVal = leak.razorpay_payment_id || '';

    // 4. Clean Sarvam Outbound payload
    const outboundBody = {
      app_config: {
        app_id: 'Conversatio-7a28a6dd-fdfe',
        app_version: 2,
        connection_config: {
          connection_id: '990fc074-bc-251fbebb-5c6e',
          agent_phone_number: '+918064266222'
        },
        agent_variables: {
          customer_name: customerNameVal,
          amount: amountVal,
          gender: genderVal,
          razorpay_payment_id: razorpayPaymentIdVal
        }
      },
      user_config: {
        user_phone_number: customerPhone
      },
      webhook_config: {
        url: callbackUrl,
        metadata: { leak_id: leak.id }
      }
    };

    // 5. Dispatch voice call using credential-resolver
    const credentialResult = await executeWithCredential(
      'voice_call',
      async (apiKey, cred) => {
        if (!apiKey || typeof apiKey !== 'string' || apiKey.trim() === '') {
          throw new Error(`Voice API Key is missing or null in api_credentials for provider: ${cred?.provider_name || 'Voice agent'}`);
        }

        console.log('[act] Outbound body:', JSON.stringify(outboundBody, null, 2));

        const response = await fetch(
          'https://apps.sarvam.ai/api/outbounds/v1/orgs/019e9120-ca5d-7d10-9e64-c87d2c557710/workspaces/01a06d1b-cb57-725d-b9a2-78a4cab1d757/outbounds',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-API-Key': apiKey
            },
            body: JSON.stringify(outboundBody)
          }
        );

        const status = response.status;
        const resText = await response.text();

        if (!response.ok) {
          throw new Error(`Sarvam Voice API returned HTTP ${status}: ${resText}`);
        }

        let resData = {};
        try {
          resData = JSON.parse(resText);
        } catch (e) {}

        return {
          callId: resData.call_id || resData.id || resData.outbound_id || `sarvam_${Date.now()}`,
          rawResponse: resData,
        };
      },
      leakId,
      'Voice agent'
    );

    if (!credentialResult.success) {
      return NextResponse.json(
        { success: false, error: credentialResult.error, escalated: credentialResult.escalated },
        { status: credentialResult.escalated ? 200 : 500 }
      );
    }

    const { callId } = credentialResult.data;
    const outcomeMessage = `Sarvam Outbound Call Dispatched to ${customerPhone} (Call ID: ${callId}). Agent: +918064266222. Callback: ${callbackUrl}`;

    // 6. Update leak status to action_taken
    await supabase
      .from('leaks')
      .update({
        status: 'action_taken',
        chosen_action: 'initiate_call',
        customer_no: customerPhone,
        customer_phone: customerPhone,
      })
      .eq('id', leakId);

    // 7. Record audit event
    await supabase.from('audit_log').insert([
      {
        leak_id: leakId,
        event_timestamp: new Date().toISOString(),
        event_type: 'acted',
        detail: outcomeMessage,
        outcome: 'Call Dispatched to Telephony',
      },
    ]);

    return NextResponse.json({
      success: true,
      leakId,
      chosenAction: 'initiate_call',
      dispatched: true,
      customerPhone,
      callId,
      message: outcomeMessage,
      requestBody: outboundBody,
      provider: credentialResult.provider,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
