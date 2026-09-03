import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const supabase = getSupabaseServerClient();
    let query = supabase.from('leaks').select('*').order('detected_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, leaks: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServerClient();

    const { data, error } = await supabase
      .from('leaks')
      .insert([
        {
          razorpay_payment_id: body.razorpay_payment_id || `pay_${Math.random().toString(36).slice(2, 9)}`,
          amount: body.amount || 999,
          currency: body.currency || 'INR',
          source: body.source || 'manual_test',
          detected_at: new Date().toISOString(),
          status: 'detected',
          root_cause: body.root_cause || 'Manual test leak created',
        },
      ])
      .select()
      .single();

    if (error) throw error;

    await supabase.from('audit_log').insert([
      {
        leak_id: data.id,
        event_timestamp: new Date().toISOString(),
        event_type: 'ingested',
        detail: `Leak manually created for testing: ${data.razorpay_payment_id}`,
        outcome: 'Status set to detected',
      },
    ]);

    return NextResponse.json({ success: true, leak: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
