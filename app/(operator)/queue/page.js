'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import StatusPill from '@/components/StatusPill';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function OperatorQueuePage() {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeak, setSelectedLeak] = useState(null);
  const [overrideNote, setOverrideNote] = useState('');
  const [customAction, setCustomAction] = useState('send_whatsapp_retry_link');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('leaks')
        .select('*')
        .in('status', ['needs_manual_diagnosis', 'escalated'])
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('[queue] Error fetching escalations:', error.message);
        setEscalations([]);
      } else {
        setEscalations(data || []);
      }
    } catch (err) {
      console.error('[queue] Unexpected error:', err);
      setEscalations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleManualOverride = async (actionType) => {
    if (!selectedLeak) return;
    setActionLoading(true);
    setMessage('');

    try {
      const supabase = getSupabaseBrowserClient();
      let newStatus = selectedLeak.status;
      let chosenAct = selectedLeak.chosen_action;

      if (actionType === 'resolve') {
        // 'resolved' is a valid status in the DB schema
        newStatus = 'resolved';
        chosenAct = 'human_manual_resolution';
      } else if (actionType === 'write_off') {
        newStatus = 'written_off';
        chosenAct = 'human_write_off';
      } else if (actionType === 'trigger_action') {
        // 'action_taken' is the valid schema status (not 'action_selected')
        newStatus = 'action_taken';
        chosenAct = customAction;
      }

      // 1. Update leak row
      const { error: leakError } = await supabase
        .from('leaks')
        .update({
          status: newStatus,
          chosen_action: chosenAct,
          root_cause: `[HUMAN OVERRIDE]: ${overrideNote || 'Operator manual intervention'}`,
        })
        .eq('id', selectedLeak.id);

      if (leakError) throw leakError;

      // 2. Write audit log row with event_type: 'human_override'
      await supabase.from('audit_log').insert([
        {
          leak_id: selectedLeak.id,
          event_timestamp: new Date().toISOString(),
          event_type: 'human_override',
          detail: `Operator override executed: Action=${actionType}, ChosenAction=${chosenAct}. Note: ${overrideNote || 'N/A'}`,
          outcome: `Status set to ${newStatus}`,
        },
      ]);

      setMessage(`Override applied! Leak status updated to ${newStatus}.`);
      setSelectedLeak(null);
      setOverrideNote('');
      fetchQueue();
    } catch (e) {
      setMessage(`Error executing override: ${e.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      <Header
        title="Human Escalation Queue"
        subtitle="Operator Workspace: Manage escalated leaks, rate-limit failures, and manual overrides."
      />

      <div className="p-8 flex-1 flex flex-col gap-6">
        {/* Top Warning Alert Banner */}
        <div className="bg-[#C98A2B]/10 border border-[#C98A2B]/40 rounded p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#C98A2B] text-2xl">warning</span>
            <div>
              <h3 className="font-headline font-semibold text-sm text-[#1a1c1c]">
                Escalated Cases Require Operator Review
              </h3>
              <p className="text-xs text-[#3f4947]">
                Cases land in this queue when API keys are rate-limited, hard-stop policies trigger, or confidence drops below safety thresholds.
              </p>
            </div>
          </div>
          <button
            onClick={fetchQueue}
            className="px-3 py-1.5 bg-[#0b4f4a] text-white font-mono-data text-xs rounded hover:bg-[#003733] transition-colors"
          >
            Refresh Queue
          </button>
        </div>

        {message && (
          <div className="p-3 bg-[#4C7A63]/15 border border-[#4C7A63]/30 rounded text-xs font-mono-data text-[#0b4f4a]">
            {message}
          </div>
        )}

        {/* Escalation Queue Table */}
        <div className="bg-white border border-[#D8DEE2] rounded shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 bg-[#f3f3f4] border-b border-[#D8DEE2] flex items-center justify-between">
            <span className="font-headline font-semibold text-sm text-[#1a1c1c]">
              Pending Escalations ({escalations.length})
            </span>
            <span className="font-mono-data text-[11px] text-[#94A3B8]">
              High priority revenue items
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9f9f9] border-b border-[#D8DEE2] text-[11px] font-mono-data uppercase text-[#3f4947]">
                  <th className="py-3 px-4">Leak ID</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Detected At</th>
                  <th className="py-3 px-4">Escalation Reason / Diagnosis</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Human Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8DEE2] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#94A3B8] font-mono-data">
                      Loading queue items...
                    </td>
                  </tr>
                ) : escalations.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#4C7A63] font-mono-data">
                      No pending escalations in queue. Engine operating normally!
                    </td>
                  </tr>
                ) : (
                  escalations.map((leak) => (
                    <tr key={leak.id} className="hover:bg-[#f9f9f9] transition-colors">
                      <td className="py-3 px-4 font-mono-data font-semibold text-[#0b4f4a]">
                        <div>{leak.id}</div>
                        <div className="text-[10px] text-[#94A3B8]">{leak.razorpay_payment_id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono-data font-bold text-[#1a1c1c]">
                        ₹{(leak.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#3f4947]">
                        {new Date(leak.detected_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#B23A2E] max-w-xs truncate">
                        {leak.root_cause || 'Needs manual review'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={leak.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedLeak(leak)}
                          className="px-3 py-1.5 bg-[#C98A2B] hover:bg-[#b07823] text-white font-mono-data text-xs rounded transition-colors"
                        >
                          Manual Override
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Reflow Card View */}
          <div className="block md:hidden p-4 space-y-3 flex-1 overflow-y-auto">
            {escalations.map((leak) => (
              <div key={leak.id} className="p-4 bg-white border border-[#D8DEE2] rounded space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-mono-data font-bold text-[#0b4f4a]">{leak.id}</span>
                  <StatusPill status={leak.status} />
                </div>
                <div className="font-mono-data text-sm font-bold text-[#1a1c1c]">
                  Amount: ₹{(leak.amount || 0).toLocaleString()}
                </div>
                <p className="font-mono-data text-[#B23A2E] text-[11px]">{leak.root_cause}</p>
                <div className="pt-2 flex justify-end">
                  <button
                    onClick={() => setSelectedLeak(leak)}
                    className="w-full py-2 bg-[#C98A2B] hover:bg-[#b07823] text-white font-mono-data text-xs rounded"
                  >
                    Manual Override
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Override Action Modal */}
      {selectedLeak && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#D8DEE2] w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
            {/* Modal Header */}
            <div className="bg-[#0b4f4a] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-headline font-bold text-base">Human Operator Override</h3>
              <button onClick={() => setSelectedLeak(null)} className="text-[#84bfb8] hover:text-white">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-[#f3f3f4] rounded border border-[#D8DEE2] font-mono-data space-y-1">
                <div>Leak ID: <span className="font-bold text-[#0b4f4a]">{selectedLeak.id}</span></div>
                <div>Amount: <span className="font-bold text-[#1a1c1c]">₹{selectedLeak.amount}</span></div>
                <div className="text-[#B23A2E]">Reason: {selectedLeak.root_cause}</div>
              </div>

              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Operator Resolution Note
                </label>
                <textarea
                  rows="2"
                  value={overrideNote}
                  onChange={(e) => setOverrideNote(e.target.value)}
                  placeholder="Explain resolution reason or customer contact outcome..."
                  className="w-full px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs text-[#1a1c1c] focus:outline-none focus:border-[#0b4f4a]"
                ></textarea>
              </div>

              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Select Custom Action (For Action Override)
                </label>
                <select
                  value={customAction}
                  onChange={(e) => setCustomAction(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs text-[#1a1c1c]"
                >
                  <option value="send_whatsapp_retry_link">Send WhatsApp Payment Link</option>
                  <option value="send_sms_payment_reminder">Send SMS Reminder (Sarvam AI)</option>
                  <option value="schedule_quiet_hour_retry">Schedule Quiet Hour Retry</option>
                  <option value="trigger_razorpay_refund">Trigger Razorpay Refund Test</option>
                </select>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-[#D8DEE2] grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleManualOverride('resolve')}
                  disabled={actionLoading}
                  className="py-2.5 bg-[#4C7A63] hover:bg-[#395c4b] text-white font-mono-data text-xs rounded font-semibold transition-colors disabled:opacity-50"
                >
                  Mark Resolved
                </button>
                <button
                  onClick={() => handleManualOverride('trigger_action')}
                  disabled={actionLoading}
                  className="py-2.5 bg-[#0b4f4a] hover:bg-[#003733] text-white font-mono-data text-xs rounded font-semibold transition-colors disabled:opacity-50"
                >
                  Trigger Action
                </button>
                <button
                  onClick={() => handleManualOverride('write_off')}
                  disabled={actionLoading}
                  className="py-2.5 bg-[#B23A2E] hover:bg-[#8f2f25] text-white font-mono-data text-xs rounded font-semibold transition-colors disabled:opacity-50"
                >
                  Write Off
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


