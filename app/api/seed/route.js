import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';

export async function POST() {
  try {
    const supabase = getSupabaseServerClient();

    // ── 1. policy_config ─────────────────────────────────────────────────────
    const { data: existingPolicy, error: policyReadError } = await supabase
      .from('policy_config')
      .select('id')
      .limit(1);

    if (policyReadError) {
      return NextResponse.json(
        { success: false, step: 'policy_config_read', error: policyReadError.message },
        { status: 500 }
      );
    }

    if (!existingPolicy || existingPolicy.length === 0) {
      const { error: policyInsertError } = await supabase.from('policy_config').insert([
        {
          max_attempts_per_day: 3,
          max_total_attempts: 5,
          quiet_hours_start: '21:00',
          quiet_hours_end: '09:00',
          hard_stop_keywords: ['fraud', 'chargeback', 'unauthorized', 'never made this'],
          cooldown_hours: 48,
        },
      ]);

      if (policyInsertError) {
        return NextResponse.json(
          { success: false, step: 'policy_config_insert', error: policyInsertError.message },
          { status: 500 }
        );
      }
    }

    // ── 2. api_credentials ───────────────────────────────────────────────────
    // Valid category values (from schema CHECK constraint):
    //   'llm_reasoning' | 'email' | 'whatsapp' | 'voice_call' | 'payment_gateway'
    // Exact required provider names:
    //   LLM: provider_name = 'Sarvam AI Agent', category = 'llm_reasoning'
    //   Voice: provider_name = 'Voice agent', category = 'voice_call'
    
    // Ensure any existing credentials match exact case-sensitive provider names
    await supabase
      .from('api_credentials')
      .update({ provider_name: 'Sarvam AI Agent' })
      .eq('category', 'llm_reasoning');

    await supabase
      .from('api_credentials')
      .update({ provider_name: 'Voice agent' })
      .eq('category', 'voice_call');

    const { data: existingCreds, error: credsReadError } = await supabase
      .from('api_credentials')
      .select('id')
      .limit(1);

    if (credsReadError) {
      return NextResponse.json(
        { success: false, step: 'api_credentials_read', error: credsReadError.message },
        { status: 500 }
      );
    }

    if (!existingCreds || existingCreds.length === 0) {
      const sampleCredentials = [
        {
          category: 'payment_gateway',
          provider_name: 'Razorpay Test Key',
          account_email: 'admin@company.com',
          encrypted_key: 'rzp_test_placeholder',
          encrypted_secret: 'rzp_secret_placeholder',
          priority: 1,
          status: 'active',
        },
        {
          category: 'llm_reasoning',
          provider_name: 'Sarvam AI Agent',
          account_email: 'agent@company.com',
          encrypted_key: 'sarvam_llm_placeholder',
          encrypted_secret: 'sarvam_secret_placeholder',
          priority: 1,
          status: 'active',
        },
        {
          category: 'voice_call',
          provider_name: 'Voice agent',
          account_email: 'agent@company.com',
          encrypted_key: 'sarvam_voice_placeholder',
          encrypted_secret: 'sarvam_secret_placeholder',
          priority: 1,
          status: 'active',
        },
      ];

      const { error: credsInsertError } = await supabase
        .from('api_credentials')
        .insert(sampleCredentials);

      if (credsInsertError) {
        return NextResponse.json(
          { success: false, step: 'api_credentials_insert', error: credsInsertError.message },
          { status: 500 }
        );
      }
    } else {
      // Reset any failed credentials back to active on seed re-run
      await supabase
        .from('api_credentials')
        .update({ status: 'active', last_error: null })
        .eq('status', 'failed');
    }

    // ── 3. leaks ─────────────────────────────────────────────────────────────
    const sampleLeaks = [
      {
        razorpay_payment_id: 'pay_seed001',
        amount: 14999.0,
        currency: 'INR',
        source: 'payment_failed',
        customer_phone: '+919104898224',
        customer_name: 'Rahul Kumar',
        gender: 'male',
        detected_at: new Date().toISOString(),
        root_cause: 'bank_decline_soft',
        ev_score: 88.0,
        chosen_action: 'initiate_call',
        status: 'resolved',
      },
      {
        razorpay_payment_id: 'pay_seed002',
        amount: 29999.0,
        currency: 'INR',
        source: 'subscription_failed',
        customer_phone: '+919104898224',
        customer_name: 'Priya Sharma',
        gender: 'female',
        detected_at: new Date(Date.now() - 3_600_000).toISOString(),
        root_cause: 'customer_error',
        ev_score: 65.0,
        chosen_action: 'initiate_call',
        status: 'action_taken',
      },
    ];

    const { data: insertedLeaks, error: leakInsertError } = await supabase
      .from('leaks')
      .insert(sampleLeaks)
      .select();

    if (leakInsertError) {
      return NextResponse.json(
        { success: false, step: 'leaks_insert', error: leakInsertError.message },
        { status: 500 }
      );
    }

    // ── 4. audit_log ─────────────────────────────────────────────────────────
    if (insertedLeaks && insertedLeaks.length > 0) {
      const auditEntries = insertedLeaks.map((l) => ({
        leak_id: l.id,
        event_timestamp: new Date().toISOString(),
        event_type: 'detected',
        detail: `Payment leak ingested for ${l.razorpay_payment_id}. Amount: ₹${l.amount}`,
        outcome: `Status set to: ${l.status}`,
      }));

      await supabase.from('audit_log').insert(auditEntries);
    }

    return NextResponse.json({
      success: true,
      message: `Database seeded successfully with exact Sarvam AI credentials and test leaks.`,
      count: insertedLeaks?.length ?? 0,
    });
  } catch (error) {
    console.error('[seed] Unexpected error:', error);
    return NextResponse.json(
      { success: false, step: 'unexpected', error: error.message },
      { status: 500 }
    );
  }
}
