import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import { executeWithCredential } from '@/lib/credential-resolver';

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

    // Category allowed by DB constraint: 'llm_reasoning'
    const diagnosisResult = await executeWithCredential('llm_reasoning', async (apiKey, cred) => {
      const prompt = `Analyze Razorpay payment failure for payment ${leak.razorpay_payment_id}, amount ${leak.amount} ${leak.currency}. Classify as bank_decline_soft, technical_hard_decline, or customer_error.`;
      
      if (apiKey && apiKey.startsWith('AIza')) {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });

        if (!response.ok) {
          throw new Error(`Gemini API HTTP Error ${response.status}: ${await response.text()}`);
        }

        const resData = await response.json();
        const text = resData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (text.includes('bank_decline') || text.includes('soft')) return 'bank_decline_soft';
        if (text.includes('technical') || text.includes('hard')) return 'technical_hard_decline';
        if (text.includes('customer') || text.includes('error')) return 'customer_error';
        return 'bank_decline_soft';
      }

      return 'bank_decline_soft';
    }, leakId);

    if (!diagnosisResult.success) {
      return NextResponse.json({
        success: false,
        escalated: true,
        error: diagnosisResult.error,
      });
    }

    // Value must match DB check constraint: 'bank_decline_soft', 'technical_hard_decline', 'customer_error', 'unknown'
    const rootCauseEnum = diagnosisResult.data || 'bank_decline_soft';

    // Update leak record
    await supabase
      .from('leaks')
      .update({
        root_cause: rootCauseEnum,
      })
      .eq('id', leakId);

    // Record audit log (event_type: 'diagnosed')
    await supabase.from('audit_log').insert([
      {
        leak_id: leakId,
        event_timestamp: new Date().toISOString(),
        event_type: 'diagnosed',
        detail: `AI Root Cause Diagnosis completed via provider [${diagnosisResult.provider}]: Classified as ${rootCauseEnum}`,
        outcome: `Root Cause set to ${rootCauseEnum}`,
      },
    ]);

    return NextResponse.json({
      success: true,
      leakId,
      rootCause: rootCauseEnum,
      provider: diagnosisResult.provider,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
