// app/api/leaks/test-cases/route.js
import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const customerName = body.name || body.customer_name || 'Dhairya Patel';
    const customerEmail = body.email || body.customer_email || 'dhairyapatel0246@gmail.com';
    let customerPhone = body.phone || body.customer_no || body.customer_phone || '+919104898224';
    if (!customerPhone.startsWith('+')) {
      customerPhone = customerPhone.startsWith('91') ? `+${customerPhone}` : `+91${customerPhone}`;
    }

    const mode = body.mode || 'custom'; // 'custom' or 'dual'
    const customAmount = Number(body.amount) || 15000;
    const customSource = body.source || 'payment_failed';
    const customRootCause = body.root_cause || 'bank_decline_soft';

    const supabase = getSupabaseServerClient();
    const timestamp = new Date().toISOString();

    // Resilient insert helper that handles schema differences and uses customer_no / customer_phone gracefully
    const insertSafe = async (payload) => {
      // 1. Try with customer_no and customer_phone
      let res = await supabase.from('leaks').insert([payload]).select('*').single();

      if (res.error && res.error.message?.includes('schema cache')) {
        // Fallback: try with customer_no only
        const payloadWithNo = { ...payload };
        delete payloadWithNo.customer_phone;
        payloadWithNo.customer_no = customerPhone;
        res = await supabase.from('leaks').insert([payloadWithNo]).select('*').single();

        if (res.error && res.error.message?.includes('schema cache')) {
          // Fallback: try with customer_phone only
          const payloadWithPhone = { ...payload };
          delete payloadWithPhone.customer_no;
          payloadWithPhone.customer_phone = customerPhone;
          res = await supabase.from('leaks').insert([payloadWithPhone]).select('*').single();

          if (res.error && res.error.message?.includes('schema cache')) {
            // Minimal base payload
            const minimal = {
              razorpay_payment_id: payload.razorpay_payment_id,
              amount: payload.amount,
              currency: payload.currency,
              source: payload.source,
              status: payload.status,
              root_cause: payload.root_cause,
              detected_at: payload.detected_at,
              ev_score: payload.ev_score,
              chosen_action: payload.chosen_action,
            };
            res = await supabase.from('leaks').insert([minimal]).select('*').single();
          }
        }
      }

      if (res.error) throw res.error;
      return res.data;
    };

    const origin = new URL(request.url).origin;
    const processCase = async (leakId) => {
      try {
        const res = await fetch(`${origin}/api/decide`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leakId }),
        });
        return await res.json().catch(() => ({}));
      } catch (err) {
        return { success: false, error: err.message };
      }
    };

    if (mode === 'dual') {
      // Create both demo cases: ₹2,500 (Email) and ₹15,000 (Voice Call)
      const case1Id = `pay_demo_${Math.random().toString(36).substring(2, 8)}`;
      const case2Id = `pay_demo_${Math.random().toString(36).substring(2, 8)}`;

      const case1 = await insertSafe({
        razorpay_payment_id: case1Id,
        amount: 2500,
        currency: 'INR',
        source: 'payment_failed',
        status: 'open',
        root_cause: 'customer_error',
        customer_no: customerPhone,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_name: customerName,
        detected_at: timestamp,
        ev_score: 82,
        chosen_action: 'send_email',
      });

      const case2 = await insertSafe({
        razorpay_payment_id: case2Id,
        amount: 15000,
        currency: 'INR',
        source: 'payment_failed',
        status: 'open',
        root_cause: 'bank_decline_soft',
        customer_no: customerPhone,
        customer_phone: customerPhone,
        customer_email: customerEmail,
        customer_name: customerName,
        detected_at: timestamp,
        ev_score: 93,
        chosen_action: 'initiate_call',
      });

      await supabase.from('audit_log').insert([
        {
          leak_id: case1.id,
          event_timestamp: timestamp,
          event_type: 'detected',
          detail: `Test Case 1 ingested: Payment ${case1.razorpay_payment_id}, Amount: ₹${case1.amount}, Customer: ${customerName} (${customerPhone})`,
          outcome: 'Status set to open',
        },
        {
          leak_id: case2.id,
          event_timestamp: timestamp,
          event_type: 'detected',
          detail: `Test Case 2 ingested: Payment ${case2.razorpay_payment_id}, Amount: ₹${case2.amount}, Customer: ${customerName} (${customerPhone})`,
          outcome: 'Status set to open',
        },
      ]);

      const [decideResult1, decideResult2] = await Promise.all([
        processCase(case1.id),
        processCase(case2.id),
      ]);

      return NextResponse.json({
        success: true,
        message: 'Created 2 test cases with customer details and executed automated pipeline',
        cases: [
          { leak: case1, decision: decideResult1 },
          { leak: case2, decision: decideResult2 },
        ],
      });
    }

    // Default: Single custom case creation with full customer input data
    const payId = `pay_custom_${Math.random().toString(36).substring(2, 8)}`;
    const chosenAction = customAmount >= 5000 ? 'initiate_call' : 'send_email';
    const evScore = customAmount >= 5000 ? 93 : 82;

    const singleCase = await insertSafe({
      razorpay_payment_id: payId,
      amount: customAmount,
      currency: 'INR',
      source: customSource,
      status: 'open',
      root_cause: customRootCause,
      customer_no: customerPhone,
      customer_phone: customerPhone,
      customer_email: customerEmail,
      customer_name: customerName,
      detected_at: timestamp,
      ev_score: evScore,
      chosen_action: chosenAction,
    });

    await supabase.from('audit_log').insert([
      {
        leak_id: singleCase.id,
        event_timestamp: timestamp,
        event_type: 'detected',
        detail: `Custom test leak created: Payment ${payId}, Customer: ${customerName}, Phone: ${customerPhone}, Email: ${customerEmail}, Amount: ₹${customAmount}`,
        outcome: 'Status set to open',
      },
    ]);

    const decideResult = await processCase(singleCase.id);

    return NextResponse.json({
      success: true,
      message: `Created test case for ${customerName} (₹${customAmount}) and triggered automated pipeline`,
      leak: singleCase,
      decision: decideResult,
    });
  } catch (error) {
    console.error('[test-cases] Error creating test cases:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
