'use client';

import { useState, useEffect } from 'react';
import StatusPill from './StatusPill';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function CaseDetailPanel({ leak, onClose, onRefresh }) {
  const [activeLeak, setActiveLeak] = useState(leak);
  const [timeline, setTimeline] = useState([]);
  const [loadingTimeline, setLoadingTimeline] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState('');

  useEffect(() => {
    setActiveLeak(leak);
    if (leak?.id) {
      fetchTimeline(leak.id);
    } else {
      setTimeline([]);
    }
  }, [leak]);

  const fetchTimeline = async (leakId) => {
    setLoadingTimeline(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase
        .from('audit_log')
        .select('*')
        .eq('leak_id', leakId)
        .order('event_timestamp', { ascending: false });

      setTimeline(data || []);
    } catch (e) {
      console.warn('Error fetching timeline:', e.message);
    } finally {
      setLoadingTimeline(false);
    }
  };

  const handleRunDiagnosis = async () => {
    if (!activeLeak?.id) return;
    setActionLoading(true);
    setActionMessage('Running Sarvam AI Root Cause Diagnosis...');
    try {
      const res = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakId: activeLeak.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveLeak((prev) => ({
          ...prev,
          root_cause: data.rootCause,
          status: data.status || prev.status,
        }));
        setActionMessage(`Diagnosis complete: ${data.rootCause}. Computing EV score...`);
        // Auto trigger decision next
        await handleRunDecision();
      } else {
        setActionMessage(`Diagnosis failed: ${data.error}`);
      }
    } catch (e) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
      fetchTimeline(activeLeak.id);
      if (onRefresh) onRefresh();
    }
  };

  const handleRunDecision = async () => {
    if (!activeLeak?.id) return;
    setActionLoading(true);
    setActionMessage('Computing EV Recovery Score & Routing...');
    try {
      const res = await fetch('/api/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leakId: activeLeak.id }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveLeak((prev) => ({
          ...prev,
          ev_score: data.evScore,
          chosen_action: data.chosenAction || 'initiate_call',
          status: data.status || prev.status,
        }));
        setActionMessage(
          `EV Score: ${data.evScore}/100. Action: ${
            data.chosenAction === 'send_email' ? 'SEND EMAIL (Resend)' : 'INITIATE CALL (Sarvam Voice Agent)'
          }`
        );
      } else {
        setActionMessage(`Decision Engine: ${data.error}`);
      }
    } catch (e) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
      fetchTimeline(activeLeak.id);
      if (onRefresh) onRefresh();
    }
  };

  const handleSendEmail = async () => {
    if (!activeLeak?.id) return;
    setActionLoading(true);
    setActionMessage('Sending email notification via Resend...');
    try {
      const res = await fetch('/api/notify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leakId: activeLeak.id,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveLeak((prev) => ({
          ...prev,
          status: 'notified',
          chosen_action: 'send_email',
        }));
        setActionMessage(`Email sent successfully to ${data.sentTo || activeLeak.customer_email || 'dhairyapatel0246@gmail.com'}`);
      } else {
        setActionMessage(`Email Error: ${data.error || 'Failed to send email'}`);
      }
    } catch (e) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
      fetchTimeline(activeLeak.id);
      if (onRefresh) onRefresh();
    }
  };

  const handleExecuteCall = async () => {
    if (!activeLeak?.id) return;
    setActionLoading(true);
    setActionMessage('Connecting to Sarvam Voice Agent Telephony...');
    try {
      const res = await fetch('/api/act', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leakId: activeLeak.id,
          action: 'initiate_call',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActiveLeak((prev) => ({
          ...prev,
          status: 'action_taken',
          chosen_action: 'initiate_call',
        }));
        setActionMessage(`Voice Call Dispatched to ${activeLeak.customer_no || activeLeak.customer_phone || '+919104898224'}`);
      } else {
        setActionMessage(`Call Error: ${data.message || data.error}`);
      }
    } catch (e) {
      setActionMessage(`Error: ${e.message}`);
    } finally {
      setActionLoading(false);
      fetchTimeline(activeLeak.id);
      if (onRefresh) onRefresh();
    }
  };

  const hasCase = Boolean(activeLeak && activeLeak.id);

  return (
    <div className="bg-white border border-[#D8DEE2] rounded shadow-lg flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-[#0b4f4a] text-white px-6 py-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-400 text-xl">shield_with_house</span>
            <h2 className="font-headline font-bold text-lg">Case Details</h2>
          </div>
          <p className="font-mono-data text-xs text-[#84bfb8] mt-0.5">
            {hasCase ? `ID: ${activeLeak.id}` : 'No Case Selected'}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close Case Details"
            className="text-[#84bfb8] hover:text-white transition-colors p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        )}
      </div>

      {/* Main Content Body */}
      <div className="p-6 space-y-5 flex-1 overflow-y-auto">
        {/* Meta summary grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-[#f3f3f4] rounded border border-[#D8DEE2]">
          <div>
            <span className="text-[11px] font-medium text-[#3f4947] uppercase block">Payment ID</span>
            <span className="font-mono-data font-semibold text-xs text-[#1a1c1c] truncate block">
              {hasCase ? (activeLeak.razorpay_payment_id || '—') : '—'}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#3f4947] uppercase block">Amount</span>
            <span className="font-mono-data font-bold text-sm text-[#0b4f4a] block">
              {hasCase ? `₹${(activeLeak.amount || 0).toLocaleString()} ${activeLeak.currency || 'INR'}` : '—'}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#3f4947] uppercase block">Source</span>
            <span className="font-mono-data text-xs text-[#1a1c1c] block capitalize">
              {hasCase ? (activeLeak.source || 'payment_failed').replace(/_/g, ' ') : '—'}
            </span>
          </div>
          <div>
            <span className="text-[11px] font-medium text-[#3f4947] uppercase block">Current Status</span>
            <div className="mt-0.5">
              {hasCase ? (
                <StatusPill status={activeLeak.status} />
              ) : (
                <span className="font-mono-data text-xs text-[#94A3B8]">—</span>
              )}
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

        {/* Payment Root Cause Analysis Section */}
        <div className="border border-[#D8DEE2] rounded p-4 bg-white">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0b4f4a]">rule</span>
              <h3 className="font-headline font-semibold text-sm text-[#1a1c1c]">Payment Root Cause Diagnosis</h3>
            </div>
            <button
              onClick={handleRunDiagnosis}
              disabled={!hasCase || actionLoading}
              title={!hasCase ? 'Select a case first' : 'Run AI Root Cause Diagnosis'}
              className={`px-3 py-1.5 text-xs font-mono-data rounded transition-colors ${
                !hasCase
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300'
                  : 'bg-[#0b4f4a] hover:bg-[#003733] text-white shadow-sm'
              }`}
            >
              Diagnose
            </button>
          </div>
          <p className="text-xs text-[#3f4947] bg-[#f9f9f9] p-3 rounded border border-[#D8DEE2]/60 font-mono-data">
            {hasCase
              ? activeLeak.root_cause && activeLeak.root_cause !== 'unknown'
                ? activeLeak.root_cause.replace(/_/g, ' ')
                : 'No diagnosis generated yet. Click "Diagnose" to evaluate transaction failure.'
              : '—'}
          </p>
        </div>

        {/* EV Recovery Score Card */}
        <div className="border border-[#D8DEE2] rounded p-4 bg-white">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C98A2B]">analytics</span>
              <span className="text-xs font-semibold text-[#1a1c1c]">EV Recovery Score</span>
            </div>
            <button
              onClick={handleRunDecision}
              disabled={!hasCase || actionLoading}
              title={!hasCase ? 'Select a case first' : 'Compute EV Recovery Score'}
              className={`text-[11px] font-mono-data font-semibold ${
                !hasCase
                  ? 'text-gray-400 no-underline cursor-not-allowed'
                  : 'text-[#0b4f4a] underline hover:text-[#003733]'
              }`}
            >
              Compute Score
            </button>
          </div>
          <div className="font-mono-data font-bold text-3xl text-[#C98A2B] mt-1">
            {hasCase
              ? activeLeak.ev_score !== null && activeLeak.ev_score !== undefined
                ? `${activeLeak.ev_score} / 100`
                : 'Not Scored'
              : '—'}
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Expected net recovery yield after policy friction</p>
        </div>

        {/* Chosen Action & Dispatch Controls */}
        <div className="border border-[#D8DEE2] rounded p-4 bg-white space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[#0b4f4a]">
                {activeLeak?.chosen_action === 'send_email' ? 'mail' : 'ring_volume'}
              </span>
              <span className="text-xs font-semibold text-[#1a1c1c]">Recovery Action Channels</span>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleSendEmail}
                disabled={!hasCase || actionLoading}
                className="px-3 py-1.5 bg-[#0b4f4a] hover:bg-[#003733] text-white text-xs font-mono-data font-semibold rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm min-h-[44px]"
              >
                {actionLoading && activeLeak?.chosen_action === 'send_email' ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-xs">send</span>
                )}
                Send Email
              </button>

              <button
                onClick={handleExecuteCall}
                disabled={!hasCase || actionLoading}
                className="px-3 py-1.5 bg-[#C98A2B] hover:bg-[#b07823] text-white text-xs font-mono-data font-semibold rounded transition-colors disabled:opacity-50 flex items-center gap-1.5 shadow-sm min-h-[44px]"
              >
                {actionLoading && activeLeak?.chosen_action === 'initiate_call' ? (
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <span className="material-symbols-outlined text-xs">call</span>
                )}
                Execute Call
              </button>
            </div>
          </div>

          {/* Dynamic Recommendation Banner */}
          {hasCase && activeLeak.chosen_action && (
            <div className="flex items-center justify-between p-2.5 bg-[#f3f8f6] rounded border border-[#0b4f4a]/20">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-mono-data font-bold text-xs text-[#0b4f4a]">
                  RECOMMENDED: {activeLeak.chosen_action === 'send_email'
                    ? 'SEND EMAIL (Resend Provider)'
                    : activeLeak.chosen_action === 'initiate_call'
                    ? 'INITIATE CALL (Sarvam Voice Agent)'
                    : activeLeak.chosen_action.toUpperCase().replace(/_/g, ' ')}
                </span>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-mono-data font-semibold bg-[#0b4f4a]/10 text-[#0b4f4a] rounded">
                Guarded by Policy
              </span>
            </div>
          )}

          {/* Connection Details — 3-Box Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
            <div className="p-2 bg-[#f9f9f9] rounded border border-[#D8DEE2]">
              <span className="text-[10px] font-mono-data text-[#94A3B8] uppercase block">Target Email</span>
              <span className="font-mono-data font-bold text-xs text-[#0b4f4a] block truncate" title={hasCase ? (activeLeak.customer_email || 'dhairyapatel0246@gmail.com') : '—'}>
                {hasCase ? (activeLeak.customer_email || 'dhairyapatel0246@gmail.com') : '—'}
              </span>
            </div>
            <div className="p-2 bg-[#f9f9f9] rounded border border-[#D8DEE2]">
              <span className="text-[10px] font-mono-data text-[#94A3B8] uppercase block">Target Phone</span>
              <span className="font-mono-data font-bold text-xs text-[#0b4f4a] block truncate" title={hasCase ? (activeLeak.customer_no || activeLeak.customer_phone || '+919104898224') : '—'}>
                {hasCase ? (activeLeak.customer_no || activeLeak.customer_phone || '+919104898224') : '—'}
              </span>
            </div>
            <div className="p-2 bg-[#f9f9f9] rounded border border-[#D8DEE2]">
              <span className="text-[10px] font-mono-data text-[#94A3B8] uppercase block">Voice Agent ID</span>
              <span className="font-mono-data font-bold text-xs text-[#0b4f4a] block truncate">
                {hasCase ? 'Conversatio-7a28a6dd-fdfe' : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Timeline of Events (from audit_log) */}
        <div className="border border-[#D8DEE2] rounded p-4 bg-white">
          <h3 className="font-headline font-semibold text-sm text-[#1a1c1c] mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#0b4f4a]">history</span>
            Audit Event Timeline
          </h3>

          {!hasCase ? (
            <p className="text-xs text-[#94A3B8] font-mono-data text-center py-4">— No case selected —</p>
          ) : loadingTimeline ? (
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
