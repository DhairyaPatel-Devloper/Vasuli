// app/api/diagnose/route.js
// Payment Failure Root Cause Diagnosis (Zero-LLM Metadata Engine)

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const { leakId } = await request.json();
    if (!leakId) {
      return NextResponse.json({ success: false, error: 'leakId is required' }, { status: 400 });
    }

    const supabase = getSupabaseServerClient();
    const { data: leak, error: leakError } = await supabase
      .from('leaks')
      .select('*')
      .eq('id', leakId)
      .single();

    if (leakError || !leak) {
      return NextResponse.json({ success: false, error: 'Leak not found' }, { status: 404 });
    }

    // Determine root cause directly from payment failure signals (No LLM dependency)
    // Allowed values matching DB constraint: 'bank_decline_soft', 'technical_hard_decline', 'customer_error'
    let rootCause = 'bank_decline_soft';
    const source = (leak.source || '').toLowerCase();
    const amount = Number(leak.amount || 0);
    const paymentId = (leak.razorpay_payment_id || '').toLowerCase();

    if (source === 'checkout_abandoned' || amount > 40000) {
      rootCause = 'customer_error';
    } else if (paymentId.includes('tech') || paymentId.includes('err') || leak.currency !== 'INR') {
      rootCause = 'technical_hard_decline';
    } else {
      rootCause = 'bank_decline_soft';
    }

    // Update leak record
    await supabase
      .from('leaks')
      .update({ root_cause: rootCause })
      .eq('id', leakId);

    // Record audit log (event_type: 'diagnosed')
    await supabase.from('audit_log').insert([
      {
        leak_id: leakId,
        event_timestamp: new Date().toISOString(),
        event_type: 'diagnosed',
        detail: `Payment Failure Diagnosis: Classified as ${rootCause} based on transaction metadata.`,
        outcome: `Root Cause set to ${rootCause}`,
      },
    ]);

    return NextResponse.json({
      success: true,
      leakId,
      rootCause,
      method: 'metadata_engine',
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
