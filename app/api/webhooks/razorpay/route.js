// app/api/webhooks/razorpay/route.js
// Razorpay Failure Ingestion Webhook — Sets up leaks for Sarvam Voice Agent Recovery

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const body = await request.json();

    const payload = body.payload?.payment?.entity || body;
    const razorpayPaymentId = payload.id || `pay_${Math.random().toString(36).substring(2, 9)}`;
    const amount = (payload.amount ? payload.amount / 100 : body.amount) || 23424;
    const currency = payload.currency || 'INR';

    // Map source to allowed DB check constraint values: 'payment_failed', 'checkout_abandoned', 'subscription_failed'
    const eventType = body.event || 'payment.failed';
    let dbSource = 'payment_failed';
    if (eventType.includes('checkout')) dbSource = 'checkout_abandoned';
    if (eventType.includes('subscription')) dbSource = 'subscription_failed';

    // Extract customer phone from Razorpay payload
    let rawContact = payload.contact || body.contact || payload.phone || payload.notes?.phone || payload.notes?.customer_phone || '';
    let customerPhone = rawContact ? String(rawContact).trim() : null;
    if (customerPhone && !customerPhone.startsWith('+')) {
      customerPhone = customerPhone.startsWith('91') ? `+${customerPhone}` : `+91${customerPhone}`;
    }

    const customerName = payload.notes?.customer_name || payload.notes?.name || payload.email?.split('@')[0] || 'Valued Customer';
    const customerEmail = payload.email || body.payload?.payment?.entity?.email || payload?.payment?.entity?.email || null;
    const gender = payload.notes?.gender || 'male';

    const supabase = getSupabaseServerClient();

    // 1. Insert new leak with default voice recovery action
    const { data: leak, error: leakError } = await supabase
      .from('leaks')
      .insert([
        {
          razorpay_payment_id: razorpayPaymentId,
          amount,
          currency,
          customer_phone: customerPhone,
          customer_email: payload?.payment?.entity?.email || null,
          customer_name: customerName,
          gender,
          source: dbSource,
          detected_at: new Date().toISOString(),
          status: 'open',
          root_cause: 'unknown',
          chosen_action: 'initiate_call',
        },
      ])
      .select()
      .single();

    if (leakError) {
      console.error('Error recording leak:', leakError);
      return NextResponse.json({ success: false, error: leakError.message }, { status: 500 });
    }

    // 2. Insert audit log record (event_type: 'detected')
    await supabase.from('audit_log').insert([
      {
        leak_id: leak.id,
        event_timestamp: new Date().toISOString(),
        event_type: 'detected',
        detail: `Razorpay failure ingested: Payment ${razorpayPaymentId}, Amount: ₹${amount}, Customer: ${customerName} (${customerPhone || 'Phone pending'}), Action: initiate_call`,
        outcome: 'Status set to open',
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Razorpay payment failure ingested for Sarvam Voice Agent recovery',
      leakId: leak.id,
      razorpayPaymentId,
      customerPhone,
      variables: {
        amount: String(amount),
        customer_name: customerName,
        gender,
        razorpay_payment_id: razorpayPaymentId,
      },
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
