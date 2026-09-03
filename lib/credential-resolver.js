import { getSupabaseServerClient } from './supabase-server';

/**
 * Server-side Credential Resolver matching exact Supabase SQL schema.
 * Categories allowed by DB check constraint: 'llm_reasoning', 'email', 'whatsapp', 'voice_call', 'payment_gateway'
 * Status allowed: 'active', 'rate_limited', 'failed', 'disabled'
 */
export async function executeWithCredential(category, executionFn, leakId = null) {
  const supabase = getSupabaseServerClient();

  // Fetch active credentials ordered by priority ascending
  const { data: credentials, error } = await supabase
    .from('api_credentials')
    .select('*')
    .eq('category', category)
    .eq('status', 'active')
    .order('priority', { ascending: true });

  if (error || !credentials || credentials.length === 0) {
    console.error(`No active credentials found for category [${category}]`);
    await handleEscalation(supabase, leakId, `No active API credentials configured for category: ${category}`);
    return { success: false, escalated: true, error: `No active credentials for category ${category}` };
  }

  for (const cred of credentials) {
    try {
      const apiKey = cred.encrypted_key;
      const result = await executionFn(apiKey, cred);

      await supabase
        .from('api_credentials')
        .update({ last_used_at: new Date().toISOString(), last_error: null })
        .eq('id', cred.id);

      return { success: true, data: result, provider: cred.provider_name };
    } catch (err) {
      const errorMessage = err.message || 'API execution failed';
      const isRateLimit = errorMessage.toLowerCase().includes('rate') || errorMessage.includes('429');
      const newStatus = isRateLimit ? 'rate_limited' : 'failed';

      console.warn(`Credential ID ${cred.id} failed for category [${category}]: ${errorMessage}. Retrying next priority key...`);

      await supabase
        .from('api_credentials')
        .update({
          status: newStatus,
          last_error: errorMessage,
        })
        .eq('id', cred.id);
    }
  }

  console.error(`All credentials in category [${category}] exhausted. Escalating leak ${leakId}`);
  await handleEscalation(supabase, leakId, `All API keys in category ${category} failed or rate-limited.`);
  return { success: false, escalated: true, error: `All credentials in category ${category} exhausted.` };
}

async function handleEscalation(supabase, leakId, reason) {
  if (!leakId) return;

  await supabase
    .from('leaks')
    .update({
      status: 'needs_manual_diagnosis',
      root_cause: 'unknown',
    })
    .eq('id', leakId);

  await supabase
    .from('audit_log')
    .insert([
      {
        leak_id: leakId,
        event_timestamp: new Date().toISOString(),
        event_type: 'escalated',
        detail: `System escalated leak to operator queue. Reason: ${reason}`,
        outcome: 'Needs Manual Diagnosis',
      },
    ]);
}

export async function getActiveCredential(category) {
  const supabase = getSupabaseServerClient();
  const { data: credentials, error } = await supabase
    .from('api_credentials')
    .select('*')
    .eq('category', category)
    .eq('status', 'active')
    .order('priority', { ascending: true })
    .limit(1);

  if (error || !credentials || credentials.length === 0) {
    return null;
  }
  return credentials[0];
}

