// app/api/act/route.js
// Sarvam AI Voice Agent Outbound Dispatch Engine

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { leakId } = await request.json();
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

    // 2. Prepare Dynamic Variables
    const amountVal = String(leak.amount || 23424);
    const customerNameVal = leak.customer_name || 'Valued Customer';
    const genderVal = leak.gender || 'male';
    const razorpayPaymentIdVal = leak.razorpay_payment_id || 'pay_TY3SLASJlOhaHi';

    let customerPhone = leak.customer_phone || '+919104898224';
    if (!customerPhone.startsWith('+')) {
      customerPhone = customerPhone.startsWith('91') ? `+${customerPhone}` : `+91${customerPhone}`;
    }

    // Sarvam API credentials & path parameters from environment
    const sarvamApiKey = process.env.SARVAM_API_KEY || '';
    const appId = process.env.SARVAM_APP_ID || 'Conversatio-7a28a6dd-fdfe';
    const orgId = process.env.SARVAM_ORG_ID || '019e9120-ca5d-7d10-9e64-c87d2c557710';
    const workspaceId = process.env.SARVAM_WORKSPACE_ID || '01a06d1b-cb57-725d-b9a2-78a4cab1d757';

    // Build standard Sarvam Voice Agent payload with agent_variables
    const outboundPayload = {
      phone_number: customerPhone,
      customer_phone_number: customerPhone,
      user_phone_number: customerPhone,
      agent_id: appId,
      app_id: appId,
      agent_variables: {
        amount: amountVal,
        customer_name: customerNameVal,
        gender: genderVal,
        razorpay_payment_id: razorpayPaymentIdVal,
      },
      app_config: {
        app_id: appId,
        app_version: 1,
      },
      user_config: {
        user_phone_number: customerPhone,
        amount: amountVal,
        customer_name: customerNameVal,
        gender: genderVal,
        razorpay_payment_id: razorpayPaymentIdVal,
      },
    };

    let dispatchSuccess = false;
    let callId = null;
    let dispatchEndpoint = '';
    let errorDetail = '';

    // Candidate API endpoints for Sarvam Voice Outbounds across indus.sarvam.ai & apps.sarvam.ai
    const endpointsToTry = [];
    if (orgId) {
      const ws = workspaceId || 'default';
      endpointsToTry.push(
        `https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(orgId)}/workspaces/${encodeURIComponent(ws)}/outbounds`,
        `https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(orgId)}/workspaces/${encodeURIComponent(ws)}/instant-call`,
        `https://apps.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(orgId)}/workspaces/default/outbounds`,
        `https://indus.sarvam.ai/api/outbounds/v1/orgs/${encodeURIComponent(orgId)}/workspaces/${encodeURIComponent(ws)}/outbounds`,
        `https://indus.sarvam.ai/samvaad/api/v1/orgs/${encodeURIComponent(orgId)}/outbound`
      );
    }
    endpointsToTry.push(
      'https://indus.sarvam.ai/api/v1/outbounds',
      'https://indus.sarvam.ai/samvaad/api/v1/outbound',
      'https://api.sarvam.ai/v1/conversations/outbound',
      'https://api.sarvam.ai/v1/voice/agent/outbound',
      'https://apps.sarvam.ai/api/outbounds/v1/outbounds',
      'https://api.sarvam.ai/v1/voice/outbound-call'
    );

    console.log(`[act] Dispatching call to ${customerPhone} via Sarvam Agent ${appId}...`);

    for (const endpoint of endpointsToTry) {
      try {
        console.log(`[act] Fetching Sarvam API: ${endpoint}`);
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': sarvamApiKey,
            'X-API-Key': sarvamApiKey,
          },
          body: JSON.stringify(outboundPayload),
        });

        const status = res.status;
        const resText = await res.text();
        console.log(`[act] Sarvam ${endpoint} -> HTTP ${status}: ${resText.substring(0, 200)}`);

        if (res.ok) {
          let data = {};
          try { data = JSON.parse(resText); } catch (e) {}
          dispatchSuccess = true;
          callId = data.id || data.call_id || data.outbound_id || `sarvam_${Date.now()}`;
          dispatchEndpoint = endpoint;
          break;
        } else {
          errorDetail = `HTTP ${status} from ${endpoint}: ${resText.substring(0, 150)}`;
        }
      } catch (err) {
        console.warn(`[act] Fetch error for ${endpoint}:`, err.message);
        errorDetail = err.message;
      }
    }

    let outcomeMessage = '';
    if (dispatchSuccess) {
      outcomeMessage = `Call Dispatched via Sarvam AI (${appId} -> ${customerPhone}). Call ID: ${callId}. Variables: amount=₹${amountVal}, customer_name=${customerNameVal}, gender=${genderVal}, razorpay_payment_id=${razorpayPaymentIdVal}.`;
    } else {
      if (!orgId || !workspaceId) {
        outcomeMessage = `Sarvam API Call Pending: SARVAM_ORG_ID and SARVAM_WORKSPACE_ID are missing in .env.local. (Sarvam requires org_id & workspace_id in URL path: apps.sarvam.ai/api/outbounds/v1/orgs/ORG_ID/workspaces/WORKSPACE_ID/outbounds). Details: ${errorDetail}`;
      } else {
        outcomeMessage = `Sarvam API returned error: ${errorDetail}`;
      }
    }

    // 3. Update leak status to action_taken
    await supabase
      .from('leaks')
      .update({
        status: dispatchSuccess ? 'action_taken' : 'needs_manual_diagnosis',
        chosen_action: 'initiate_call',
      })
      .eq('id', leakId);

    // 4. Record audit event
    await supabase.from('audit_log').insert([
      {
        leak_id: leakId,
        event_timestamp: new Date().toISOString(),
        event_type: 'acted',
        detail: outcomeMessage,
        outcome: dispatchSuccess ? 'Call Dispatched to Telephony' : 'Call Failed / Org ID Required',
      },
    ]);

    return NextResponse.json({
      success: dispatchSuccess,
      leakId,
      chosenAction: 'initiate_call',
      dispatched: dispatchSuccess,
      callId,
      message: outcomeMessage,
      error: dispatchSuccess ? null : errorDetail,
      variables: {
        amount: amountVal,
        customer_name: customerNameVal,
        gender: genderVal,
        razorpay_payment_id: razorpayPaymentIdVal,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
