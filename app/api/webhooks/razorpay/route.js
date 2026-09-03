import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const body = await request.json();
    
    const payload = body.payload?.payment?.entity || body;
    const razorpayPaymentId = payload.id || `pay_${Math.random().toString(36).substring(2, 9)}`;
    const amount = (payload.amount ? payload.amount / 100 : body.amount) || 14999;
    const currency = payload.currency || 'INR';

    // Map source to allowed DB check constraint values: 'payment_failed', 'checkout_abandoned', 'subscription_failed'
    const eventType = body.event || 'payment.failed';
    let dbSource = 'payment_failed';
    if (eventType.includes('checkout')) dbSource = 'checkout_abandoned';
    if (eventType.includes('subscription')) dbSource = 'subscription_failed';

    const supabase = getSupabaseServerClient();

    // 1. Insert new leak into database
    const { data: leak, error: leakError } = await supabase
      .from('leaks')
      .insert([
        {
          razorpay_payment_id: razorpayPaymentId,
          amount: amount,
          currency: currency,
          source: dbSource,
          detected_at: new Date().toISOString(),
          status: 'open',
          root_cause: 'unknown',
        },
      ])
      .select()
      .single();

    if (leakError) {
      console.error('Error recording leak:', leakError);
      return NextResponse.json({ success: false, error: leakError.message }, { status: 500 });
    }

    // 2. Insert audit log record (event_type check constraint: 'detected')
    await supabase.from('audit_log').insert([
      {
        leak_id: leak.id,
        event_timestamp: new Date().toISOString(),
        event_type: 'detected',
        detail: `Razorpay failure ingested: Payment ${razorpayPaymentId}, Amount: ₹${amount}, Source: ${dbSource}`,
        outcome: 'Status set to open',
      },
    ]);

    return NextResponse.json({
      success: true,
      message: 'Razorpay webhook failure ingested successfully',
      leakId: leak.id,
      razorpayPaymentId,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
