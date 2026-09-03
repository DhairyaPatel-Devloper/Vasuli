'use client';

import { useState, useEffect } from 'react';
import StatusPill from './StatusPill';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function CaseDetailPanel({ leak, onClose, onRefresh }) {
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    if (leak?.id) {
      fetchTimeline(leak.id);
    }
  }, [leak?.id]);

  const fetchTimeline = async (leakId) => {
    setLoadingTimeline(true);
    const supabase = getSupabaseBrowserClient();
    const { data } = await supabase
      .from('audit_log')
      .select('*')
      .eq('leak_id', leakId)
      .order('event_timestamp', { ascending: false });

    setTimeline(data || []);
    setLoadingTimeline(false);
  };

  const handleRunDiagnosis = async () => {
    if (!leak?.id) return;
    setActionLoading(true);
    setActionMessage('Running AI Root Cause Diagnosis...');
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakId: leak.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage('Diagnosis complete! Calculating EV Score...');
        // Auto trigger decision next
        await handleRunDecision();
      } else {
        setActionMessage(`Diagnosis failed: ${data.error}`);
      }
    } catch (e) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
      fetchTimeline(leak.id);
      if (onRefresh) onRefresh();
    }
  };

  const handleRunDecision = async () => {
    if (!leak?.id) return;
    setActionLoading(true);
    setActionMessage('Computing EV Score & Recovery Action...');
    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakId: leak.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`EV Computed: ${data.evScore}. Recommended Action: ${data.chosenAction}`);
      } else {
        setActionMessage(`Decision Engine: ${data.error}`);
      }
    } catch (e) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
      fetchTimeline(leak.id);
      if (onRefresh) onRefresh();
    }
  };

  const handleExecuteAction = async () => {
    if (!leak?.id) return;
    setActionLoading(true);
    setActionMessage('Evaluating Policy Guards & Executing Recovery Action...');
    try {
      const res = await fetch('/api/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakId: leak.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActionMessage(`Action Executed Successfully: ${data.outcome}`);
      } else {
        setActionMessage(`Execution Result: ${data.message || data.error}`);
      }
    } catch (e) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
      fetchTimeline(leak.id);
      if (onRefresh) onRefresh();
    }
  };

  if (!leak) return null;

  return (
    <div className="bg-white border border-[#D8DEE2] rounded shadow-lg flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-[#0b4f4a] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-xl">shield_with_house</span>
            <h2 className="font-headline font-bold text-lg">Case Details</h2>
          </div>
          <p className="font-mono-data text-xs text-[#84bfb8] mt-0.5">ID: {leak.id}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[#84bfb8] hover:text-white transition-colors p-1"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      {/* Main Content Body */}
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        {/* Meta summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-[#f3f3f4] rounded border border-[#D8DEE2]">
          <div>
            <span className="text-[11px] font-medium text-[#3f4947] uppercase block">Payment ID</span>
            <span className="font-mono-data font-semibold text-xs text-[#1a1c1c] truncate block">
              {leak.razorpay_payment_id || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#3f4947] uppercase block">Amount</span>
            <span className="font-mono-data font-bold text-sm text-[#0b4f4a] block">
              ₹{(leak.amount || 0).toLocaleString()} {leak.currency || 'INR'}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#3f4947] uppercase block">Source</span>
            <span className="font-mono-data text-xs text-[#1a1c1c] block capitalize">
              {leak.source || 'Webhook'}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#3f4947] uppercase block">Current Status</span>
            <div className="mt-0.5">
              <StatusPill status={leak.status} />
            </div>
          </div>
        </div>

        {/* Action Status Banner */}
        {actionMessage && (
          <div className="p-3 bg-[#C98A2B]/10 border border-[#C98A2B]/30 rounded flex items-center justify-between text-xs text-[#1a1c1c]">
            <span className="font-medium">{actionMessage}</span>
            {actionLoading && (
              <span className="w-4 h-4 border-2 border-[#C98A2B] border-t-transparent rounded-full animate-spin"></span>
            )}
          </div>
        )}

        {/* AI Root Cause Analysis Section */}
        <div className="border border-[#D8DEE2] rounded p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0b4f4a]">psychology</span>
              <h3 className="font-headline font-semibold text-sm text-[#1a1c1c]">AI Root Cause Diagnosis</h3>
            </div>
            <button
              onClick={handleRunDiagnosis}
              disabled={actionLoading}
              className="px-3 py-1 bg-[#0b4f4a] hover:bg-[#003733] text-white text-xs font-mono-data rounded transition-colors disabled:opacity-50"
            >
              Diagnose
            </button>
          </div>
          <p className="text-xs text-[#3f4947] bg-[#f9f9f9] p-3 rounded border border-[#D8DEE2]/60 font-mono-data">
            {leak.root_cause || 'No diagnosis generated yet. Click "Diagnose" to execute AI analysis.'}
          </p>
        </div>

        {/* EV Score & Action Recommendation */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-[#D8DEE2] rounded p-4 bg-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[#1a1c1c]">EV Recovery Score</span>
              <button
                onClick={handleRunDecision}
                disabled={actionLoading}
                className="text-[11px] text-[#0b4f4a] underline hover:text-[#003733]"
              >
                Compute
              </button>
            </div>
            <div className="font-mono-data font-bold text-2xl text-[#C98A2B]">
              {leak.ev_score !== null && leak.ev_score !== undefined ? `${leak.ev_score} / 100` : 'Not Scored'}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1">Expected net yield after policy friction</p>
          </div>

          <div className="border border-[#D8DEE2] rounded p-4 bg-white">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-[#1a1c1c]">Chosen Action</span>
              <button
                onClick={handleExecuteAction}
                disabled={actionLoading || !leak.chosen_action}
                className="px-2.5 py-1 bg-[#4C7A63] hover:bg-[#395c4b] text-white text-xs font-mono-data rounded transition-colors disabled:opacity-50"
              >
                Execute
              </button>
            </div>
            <div className="font-mono-data font-semibold text-sm text-[#0b4f4a]">
              {leak.chosen_action ? leak.chosen_action.toUpperCase().replace(/_/g, ' ') : 'Pending Decision'}
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1">Guarded by Policy Engine</p>
          </div>
        </div>

        {/* Timeline of Events (from audit_log) */}
        <div className="border border-[#D8DEE2] rounded p-4 bg-white">
          <h3 className="font-headline font-semibold text-sm text-[#1a1c1c] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0b4f4a]">history</span>
            Audit Event Timeline
          </h3>

          {loadingTimeline ? (
            <p className="text-xs text-[#94A3B8] font-mono-data">Loading event logs...</p>
          ) : timeline.length === 0 ? (
            <p className="text-xs text-[#94A3B8] font-mono-data">No audit log entries recorded for this case.</p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#D8DEE2]">
              {timeline.map((event) => (
                <div key={event.id} className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-[#0b4f4a] border-2 border-white"></div>
                  <div className="bg-[#f9f9f9] p-3 rounded border border-[#D8DEE2]/60">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-mono-data font-bold text-[#0b4f4a] uppercase">
                        {event.event_type}
                      </span>
                      <span className="font-mono-data text-[10px] text-[#94A3B8]">
                        {new Date(event.event_timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-[#3f4947] font-mono-data">{event.detail}</p>
                    {event.outcome && (
                      <span className="inline-block mt-2 text-[10px] font-mono-data text-[#4C7A63] bg-[#4C7A63]/10 px-2 py-0.5 rounded">
                        Outcome: {event.outcome}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
