'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function AdminPolicyPage() {
  const [policy, setPolicy] = useState({
    max_attempts_per_day: 3,
    max_total_attempts: 5,
    quiet_hours_start: '22:00',
    quiet_hours_end: '08:00',
    hard_stop_keywords: ['stop', 'unsubscribe', 'chargeback', 'fraud', 'legal', 'lawyer'],
    cooldown_hours: 4,
  });

  const [newKeyword, setNewKeyword] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchPolicy();
  }, []);

  const fetchPolicy = async () => {
    try {
      const res = await fetch('/api/policy');
      const data = await res.json();
      if (data.success && data.policy) {
        setPolicy(data.policy);
      }
    } catch (e) {
      console.warn('Using default policy config fallback');
    }
  };

  const handleSavePolicy = async (e) => {
    e.preventDefault();
    setSaving(true);
    setToast('');

    try {
      const res = await fetch('/api/policy', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(policy),
      });

      const data = await res.json();
      if (data.success) {
        setToast('Policy configuration saved and deployed to Agent Engine.');
      } else {
        setToast(`Error: ${data.error}`);
      }
    } catch (e) {
      setToast(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addKeyword = () => {
    if (!newKeyword.trim()) return;
    const clean = newKeyword.trim().toLowerCase();
    if (!policy.hard_stop_keywords.includes(clean)) {
      setPolicy({
        ...policy,
        hard_stop_keywords: [...policy.hard_stop_keywords, clean],
      });
    }
    setNewKeyword('');
  };

  const removeKeyword = (kw) => {
    setPolicy({
      ...policy,
      hard_stop_keywords: policy.hard_stop_keywords.filter((k) => k !== kw),
    });
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      <Header
        title="Autonomous Recovery Policy Guard"
        subtitle="Configure strict operational boundary rules, quiet hours, cooldowns, and hard-stop safety filters."
      />

      <div className="p-8 space-y-8 flex-1">
        {toast && (
          <div className="p-4 bg-[#4C7A63]/15 border border-[#4C7A63]/40 rounded text-xs font-mono-data text-[#0b4f4a] flex items-center justify-between shadow-sm">
            <span>{toast}</span>
            <button onClick={() => setToast('')} className="text-[#0b4f4a] font-bold">×</button>
          </div>
        )}

        <form onSubmit={handleSavePolicy} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Rule Configurations (2 cols desktop) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Retry Rate Limits Card */}
            <div className="bg-white border border-[#D8DEE2] rounded p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#D8DEE2]">
                <div className="w-8 h-8 rounded bg-[#0b4f4a]/10 text-[#0b4f4a] flex items-center justify-center">
                  <span className="material-symbols-outlined">restart_alt</span>
                </div>
                <div>
                  <h3 className="font-headline font-semibold text-base text-[#1a1c1c]">Retry Frequency Limits</h3>
                  <p className="text-xs text-[#3f4947]">Cap maximum automated customer contacts and recovery attempts.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                    Max Attempts / Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={policy.max_attempts_per_day}
                    onChange={(e) => setPolicy({ ...policy, max_attempts_per_day: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-sm text-[#1a1c1c]"
                  />
                  <span className="text-[11px] text-[#94A3B8] mt-1 block">Prevents customer spam</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                    Max Total Attempts
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={policy.max_total_attempts}
                    onChange={(e) => setPolicy({ ...policy, max_total_attempts: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-sm text-[#1a1c1c]"
                  />
                  <span className="text-[11px] text-[#94A3B8] mt-1 block">Lifetime case retry ceiling</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                    Cooldown Hours
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="48"
                    value={policy.cooldown_hours}
                    onChange={(e) => setPolicy({ ...policy, cooldown_hours: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-sm text-[#1a1c1c]"
                  />
                  <span className="text-[11px] text-[#94A3B8] mt-1 block">Pause between retries</span>
                </div>
              </div>
            </div>

            {/* Quiet Hours Window Card */}
            <div className="bg-white border border-[#D8DEE2] rounded p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#D8DEE2]">
                <div className="w-8 h-8 rounded bg-[#C98A2B]/10 text-[#C98A2B] flex items-center justify-center">
                  <span className="material-symbols-outlined">bedtime</span>
                </div>
                <div>
                  <h3 className="font-headline font-semibold text-base text-[#1a1c1c]">Quiet Hours Window</h3>
                  <p className="text-xs text-[#3f4947]">Automated actions during quiet hours are held in queue until window expires.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                    Quiet Hours Start
                  </label>
                  <input
                    type="time"
                    value={policy.quiet_hours_start}
                    onChange={(e) => setPolicy({ ...policy, quiet_hours_start: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-sm text-[#1a1c1c]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                    Quiet Hours End
                  </label>
                  <input
                    type="time"
                    value={policy.quiet_hours_end}
                    onChange={(e) => setPolicy({ ...policy, quiet_hours_end: e.target.value })}
                    className="w-full px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-sm text-[#1a1c1c]"
                  />
                </div>
              </div>
            </div>

            {/* Hard Stop Keywords Filter */}
            <div className="bg-white border border-[#D8DEE2] rounded p-6 shadow-sm">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#D8DEE2]">
                <div className="w-8 h-8 rounded bg-[#B23A2E]/10 text-[#B23A2E] flex items-center justify-center">
                  <span className="material-symbols-outlined">block</span>
                </div>
                <div>
                  <h3 className="font-headline font-semibold text-base text-[#1a1c1c]">Hard Stop Keywords</h3>
                  <p className="text-xs text-[#3f4947]">Immediate halt of all AI actions if customer message or ticket contains these terms.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add keyword (e.g. chargeback, lawyer, refund)..."
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addKeyword();
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-sm text-[#1a1c1c]"
                  />
                  <button
                    type="button"
                    onClick={addKeyword}
                    className="px-4 py-2 bg-[#0b4f4a] hover:bg-[#003733] text-white font-mono-data text-xs rounded transition-colors"
                  >
                    Add Word
                  </button>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  {policy.hard_stop_keywords.map((kw) => (
                    <span
                      key={kw}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#B23A2E]/10 text-[#B23A2E] border border-[#B23A2E]/30 rounded font-mono-data text-xs font-semibold"
                    >
                      <span>{kw}</span>
                      <button
                        type="button"
                        onClick={() => removeKeyword(kw)}
                        className="hover:text-red-800 font-bold ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Save Submit Button */}
            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-3 bg-[#0b4f4a] hover:bg-[#003733] text-white font-headline font-semibold text-sm rounded shadow transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <span>Saving Policy...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">save</span>
                    <span>Save Policy Configuration</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Policy Enforcement Live Panel (1 col desktop) */}
          <div className="space-y-6">
            <div className="bg-white border border-[#D8DEE2] rounded p-6 shadow-sm">
              <h3 className="font-headline font-semibold text-base text-[#1a1c1c] mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#4C7A63]">shield</span>
                Active Guard Enforcement
              </h3>

              <div className="space-y-4 text-xs">
                <div className="p-3 bg-[#f3f3f4] rounded border border-[#D8DEE2]">
                  <div className="font-mono-data font-bold text-[#0b4f4a] uppercase">Quiet Hours Guard</div>
                  <p className="text-[#3f4947] mt-0.5">
                    Currently: {isQuietHour(policy.quiet_hours_start, policy.quiet_hours_end) ? (
                      <span className="text-[#C98A2B] font-bold">QUIET HOURS ACTIVE (Queue Holding)</span>
                    ) : (
                      <span className="text-[#4C7A63] font-bold">NORMAL OPERATIONAL WINDOW</span>
                    )}
                  </p>
                </div>

                <div className="p-3 bg-[#f3f3f4] rounded border border-[#D8DEE2]">
                  <div className="font-mono-data font-bold text-[#0b4f4a] uppercase">Daily Limit Rule</div>
                  <p className="text-[#3f4947] mt-0.5">
                    Hard cap set at <span className="font-bold text-[#1a1c1c]">{policy.max_attempts_per_day} attempts / 24h</span>.
                  </p>
                </div>

                <div className="p-3 bg-[#f3f3f4] rounded border border-[#D8DEE2]">
                  <div className="font-mono-data font-bold text-[#0b4f4a] uppercase">Hard Stop Keyword Guard</div>
                  <p className="text-[#3f4947] mt-0.5">
                    Monitoring <span className="font-bold text-[#B23A2E]">{policy.hard_stop_keywords.length} protected terms</span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function isQuietHour(startStr, endStr) {
  if (!startStr || !endStr) return false;
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const [sH, sM] = startStr.split(':').map(Number);
  const startMinutes = sH * 60 + sM;

  const [eH, eM] = endStr.split(':').map(Number);
  const endMinutes = eH * 60 + eM;

  if (startMinutes > endMinutes) {
    // Overnight quiet hours (e.g. 22:00 to 08:00)
    return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
  } else {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
}
