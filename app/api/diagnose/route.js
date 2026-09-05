// app/api/diagnose/route.js
// Payment Failure Root Cause Diagnosis (Sarvam AI LLM Reasoning Engine)

import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { executeWithCredential } from '@/lib/credential-resolver';
import { SarvamAIClient } from 'sarvamai';

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

    // Perform LLM Reasoning via Sarvam AI Agent (provider_name = 'Sarvam AI Agent', category = 'llm_reasoning')
    const credentialResult = await executeWithCredential(
      'llm_reasoning',
      async (apiKey, cred) => {
        const client = new SarvamAIClient({ apiSubscriptionKey: apiKey });
        const prompt = `You are an expert payment failure classification engine.
Analyze the following payment failure leak metadata:
- Payment ID: ${leak.razorpay_payment_id || 'unknown'}
- Amount: ${leak.currency || 'INR'} ${leak.amount || 0}
- Source: ${leak.source || 'unknown'}
- Customer Name: ${leak.customer_name || 'unknown'}

Classify the root cause into EXACTLY ONE of these 3 allowed values:
1. bank_decline_soft
2. technical_hard_decline
3. customer_error

Respond ONLY with JSON matching this structure:
{"root_cause": "bank_decline_soft" | "technical_hard_decline" | "customer_error", "reasoning": "short explanation"}`;

        const response = await client.chat.completions({
          model: 'sarvam-105b',
          messages: [{ role: 'user', content: prompt }],
        });

        const rawContent = response.choices?.[0]?.message?.content || '';
        let rootCause = 'bank_decline_soft';
        try {
          const parsed = JSON.parse(rawContent.replace(/```json|```/g, '').trim());
          if (['bank_decline_soft', 'technical_hard_decline', 'customer_error'].includes(parsed.root_cause)) {
            rootCause = parsed.root_cause;
          }
        } catch (e) {
          if (rawContent.includes('customer_error')) rootCause = 'customer_error';
          else if (rawContent.includes('technical_hard_decline')) rootCause = 'technical_hard_decline';
          else rootCause = 'bank_decline_soft';
        }

        return { rootCause, rawContent };
      },
      leakId,
      'Sarvam AI Agent'
    );

    if (!credentialResult.success) {
      return NextResponse.json(
        { success: false, error: credentialResult.error, escalated: credentialResult.escalated },
        { status: credentialResult.escalated ? 200 : 500 }
      );
    }

    const { rootCause } = credentialResult.data;

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
        detail: `Payment Failure Diagnosis via Sarvam AI Agent: Classified as ${rootCause}.`,
        outcome: `Root Cause set to ${rootCause}`,
      },
    ]);

    return NextResponse.json({
      success: true,
      leakId,
      rootCause,
      method: 'sarvam_llm_reasoning',
      provider: credentialResult.provider,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
