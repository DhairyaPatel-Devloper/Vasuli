import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from('policy_config')
      .select('*')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    const defaultPolicy = {
      max_attempts_per_day: 3,
      max_total_attempts: 5,
      quiet_hours_start: '22:00',
      quiet_hours_end: '08:00',
      hard_stop_keywords: ['stop', 'unsubscribe', 'chargeback', 'fraud', 'legal', 'lawyer'],
      cooldown_hours: 4,
    };

    return NextResponse.json({ success: true, policy: data || defaultPolicy });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const supabase = getSupabaseServerClient();

    // Fetch existing row ID if exists
    const { data: existing } = await supabase.from('policy_config').select('id').limit(1).single();

    let result;
    if (existing?.id) {
      result = await supabase
        .from('policy_config')
        .update({
          max_attempts_per_day: body.max_attempts_per_day,
          max_total_attempts: body.max_total_attempts,
          quiet_hours_start: body.quiet_hours_start,
          quiet_hours_end: body.quiet_hours_end,
          hard_stop_keywords: body.hard_stop_keywords,
          cooldown_hours: body.cooldown_hours,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id)
        .select()
        .single();
    } else {
      result = await supabase
        .from('policy_config')
        .insert([
          {
            max_attempts_per_day: body.max_attempts_per_day || 3,
            max_total_attempts: body.max_total_attempts || 5,
            quiet_hours_start: body.quiet_hours_start || '22:00',
            quiet_hours_end: body.quiet_hours_end || '08:00',
            hard_stop_keywords: body.hard_stop_keywords || ['stop', 'unsubscribe', 'chargeback'],
            cooldown_hours: body.cooldown_hours || 4,
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();
    }

    if (result.error) throw result.error;

    return NextResponse.json({ success: true, policy: result.data });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
