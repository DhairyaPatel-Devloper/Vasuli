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

    // Clean up any legacy credential provider names in DB
    await supabase
      .from('api_credentials')
      .update({ provider_name: 'Sarvam AI Agent (+918064266222)' })
      .ilike('provider_name', '%gemini%');

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
          provider_name: 'Sarvam AI Agent (Reasoning & Voice)',
          account_email: 'agent@company.com',
          encrypted_key: 'sarvam_placeholder',
          priority: 1,
          status: 'active',
        },
        {
          category: 'email',
          provider_name: 'Resend Email',
          account_email: 'mail@company.com',
          encrypted_key: 're_placeholder',
          priority: 1,
          status: 'active',
        },
        {
          category: 'whatsapp',
          provider_name: 'Sarvam AI Notifications (+918064266222)',
          account_email: 'notifications@company.com',
          encrypted_key: 'sarvam_placeholder',
          priority: 1,
          status: 'active',
        },
        {
          category: 'voice_call',
          provider_name: 'Sarvam AI Voice Agent (+918064266222)',
          account_email: 'agent@company.com',
          encrypted_key: 'sarvam_placeholder',
          encrypted_secret: 'sarvam_org_placeholder',
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
    // Valid source values (from schema CHECK constraint):
    //   'payment_failed' | 'checkout_abandoned' | 'subscription_failed'
    // Valid status values:
    //   'open' | 'action_taken' | 'resolved' | 'escalated' | 'needs_manual_diagnosis' | 'written_off'
    const sampleLeaks = [
      {
        razorpay_payment_id: 'pay_seed001',
        amount: 14999.0,
        currency: 'INR',
        source: 'payment_failed',
        customer_phone: '+919104898224',
        customer_name: 'Dhairya Patel',
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
        customer_name: 'Rahul Sharma',
        detected_at: new Date(Date.now() - 3_600_000).toISOString(),
        root_cause: 'customer_error',
        ev_score: 65.0,
        chosen_action: 'initiate_call',
        status: 'action_taken',
      },
      {
        razorpay_payment_id: 'pay_seed003',
        amount: 8500.0,
        currency: 'INR',
        source: 'checkout_abandoned',
        customer_phone: '+919104898224',
        customer_name: 'Ananya Verma',
        detected_at: new Date(Date.now() - 7_200_000).toISOString(),
        root_cause: 'technical_hard_decline',
        ev_score: 30.0,
        chosen_action: 'initiate_call',
        status: 'needs_manual_diagnosis',
      },
      {
        razorpay_payment_id: 'pay_seed004',
        amount: 49999.0,
        currency: 'INR',
        source: 'payment_failed',
        customer_phone: '+919104898224',
        customer_name: 'Vikram Singh',
        detected_at: new Date(Date.now() - 14_400_000).toISOString(),
        root_cause: 'bank_decline_soft',
        ev_score: 92.0,
        chosen_action: 'initiate_call',
        status: 'open',
      },
      {
        razorpay_payment_id: 'pay_seed005',
        amount: 5999.0,
        currency: 'INR',
        source: 'checkout_abandoned',
        customer_phone: '+919104898224',
        customer_name: 'Pooja Iyer',
        detected_at: new Date(Date.now() - 21_600_000).toISOString(),
        root_cause: 'bank_decline_soft',
        ev_score: 72.0,
        chosen_action: 'initiate_call',
        status: 'escalated',
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
    // Valid event_type values (from schema CHECK constraint):
    //   'detected' | 'diagnosed' | 'policy_check' | 'action_taken'
    //   | 'resolved' | 'escalated' | 'human_override' | 'written_off'
    if (insertedLeaks && insertedLeaks.length > 0) {
      const auditEntries = insertedLeaks.map((l) => ({
        leak_id: l.id,
        event_timestamp: new Date().toISOString(),
        event_type: 'detected',
        detail: `Payment leak ingested for ${l.razorpay_payment_id}. Amount: ₹${l.amount}`,
        outcome: `Status set to: ${l.status}`,
      }));

      const { error: auditInsertError } = await supabase
        .from('audit_log')
        .insert(auditEntries);

      if (auditInsertError) {
        // Non-fatal — leaks were inserted OK
        console.warn('[seed] audit_log insert error:', auditInsertError.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Database seeded successfully! ${insertedLeaks?.length ?? 0} payment leaks and audit events inserted.`,
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
