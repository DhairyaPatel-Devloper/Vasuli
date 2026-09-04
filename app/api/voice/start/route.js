// app/api/voice/start/route.js
// Sarvam Voice Agent on_start Hook & Session Initialization

import { NextResponse } from 'next/server';
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

    const leakId = urlLeakId || body.leakId || body.leak_id;
    const supabase = getSupabaseServerClient();

    let leak = null;
    if (leakId) {
      const { data } = await supabase.from('leaks').select('*').eq('id', leakId).single();
      leak = data;
    }

    // Dynamic variables for Sarvam Voice Agent
    const amount = String(leak?.amount || 23424);
    const customer_name = leak?.customer_name || body.customer_name || 'Valued Customer';
    const gender = leak?.gender || body.gender || 'male';
    const razorpay_payment_id = leak?.razorpay_payment_id || body.razorpay_payment_id || 'pay_TY3ixhYyn5HWfv';
    const customer_phone = leak?.customer_phone || '+919104898224';

    const salutation = gender === 'female' ? 'Ma\'am' : 'Sir';
    const greeting = `Namaste ${customer_name} Ji! Main Razorpay Support se Vasuli bol raha hoon. Kya meri baat ${customer_name} Ji se ho rahi hai?`;

    if (leakId) {
      await supabase.from('audit_log').insert([
        {
          leak_id: leakId,
          event_timestamp: new Date().toISOString(),
          event_type: 'acted',
          detail: `Sarvam Voice Agent call session started for ${customer_name} (${customer_phone}). Variables loaded: amount=₹${amount}, gender=${gender}, razorpay_payment_id=${razorpay_payment_id}.`,
          outcome: 'Voice Call Session Connected',
        },
      ]);
    }

    // Return variables for Sarvam on_start tool hook
    return NextResponse.json({
      success: true,
      greeting,
      user_phone_number: customer_phone,
      agent_variables: {
        amount,
        customer_name,
        gender,
        razorpay_payment_id,
      },
      variables: {
        amount,
        customer_name,
        gender,
        razorpay_payment_id,
      },
      prompt_vars: {
        amount: `₹${amount}`,
        customer_name,
        gender,
        razorpay_payment_id,
      },
      config: {
        agent_name: 'Conversatio-7a28a6dd-fdfe',
        app_id: 'Conversatio-7a28a6dd-fdfe',
        agent_phone_number: '+918064266222',
        language: 'hi-IN',
        tts_model: 'bulbul:v3',
        stt_model: 'saaras:v3',
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  return POST(request);
}
