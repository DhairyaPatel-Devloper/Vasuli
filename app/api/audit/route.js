import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const leakId = searchParams.get('leakId');
    const eventType = searchParams.get('eventType');

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from('audit_log')
      .select('*, leaks(razorpay_payment_id, amount, status)')
      .order('event_timestamp', { ascending: false });

    if (leakId) {
      query = query.eq('leak_id', leakId);
    }
    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ success: true, logs: data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
