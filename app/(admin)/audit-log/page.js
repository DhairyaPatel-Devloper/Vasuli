'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function AdminAuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [eventTypeFilter, searchTerm, logs]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();

      if (data.success && data.logs) {
        setLogs(data.logs);
      } else {
        console.error('[audit-log] Error fetching logs:', data.error);
        setLogs([]);
      }
    } catch (err) {
      console.error('[audit-log] Unexpected error:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = logs;

    if (eventTypeFilter !== 'all') {
      result = result.filter(
        (item) => (item.event_type || '').toLowerCase() === eventTypeFilter.toLowerCase()
      );
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          (item.leak_id || '').toLowerCase().includes(term) ||
          (item.detail || '').toLowerCase().includes(term) ||
          (item.leaks?.razorpay_payment_id || '').toLowerCase().includes(term)
      );
    }

    setFilteredLogs(result);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      <Header
        title="Immutable Audit Event Ledger"
        subtitle="Complete system history of every webhook ingestion, AI root-cause analysis, policy evaluation, action execution, and human override."
      />

      <div className="p-8 flex-1 flex flex-col gap-6">
        {/* Filters Toolbar */}
        <div className="bg-white border border-[#D8DEE2] rounded p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#94A3B8] text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Search Leak ID, Payment ID, or detail..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded text-xs font-mono-data text-[#1a1c1c] focus:outline-none focus:border-[#0b4f4a]"
              />
            </div>

            {/* Event types match schema CHECK constraint exactly */}
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="w-full sm:w-56 px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded text-xs font-mono-data text-[#1a1c1c] focus:outline-none focus:border-[#0b4f4a]"
            >
              <option value="all">All Event Types</option>
              <option value="detected">Detected</option>
              <option value="diagnosed">Diagnosed</option>
              <option value="policy_check">Policy Check</option>
              <option value="action_taken">Action Taken</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
              <option value="human_override">Human Override</option>
              <option value="written_off">Written Off</option>
            </select>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-2 bg-[#0b4f4a] hover:bg-[#003733] text-white text-xs font-mono-data rounded flex items-center gap-1.5 transition-colors self-end md:self-auto disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            Refresh Log Stream
          </button>
        </div>

        {/* Audit Log Table Container */}
        <div className="bg-white border border-[#D8DEE2] rounded shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 bg-[#f3f3f4] border-b border-[#D8DEE2] flex items-center justify-between">
            <span className="font-headline font-semibold text-sm text-[#1a1c1c]">
              Audit Trail Records ({filteredLogs.length})
            </span>
            <span className="font-mono-data text-[11px] text-[#94A3B8]">Append-only event log</span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9f9f9] border-b border-[#D8DEE2] text-[11px] font-mono-data uppercase text-[#3f4947]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Leak ID</th>
                  <th className="py-3 px-4">Razorpay Payment ID</th>
                  <th className="py-3 px-4">Event Details</th>
                  <th className="py-3 px-4">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8DEE2] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#94A3B8] font-mono-data">
                      Loading audit logs...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-12 text-center font-mono-data">
                      <div className="flex flex-col items-center gap-2 text-[#94A3B8]">
                        <span className="material-symbols-outlined text-4xl">history</span>
                        <p>
                          {logs.length === 0
                            ? 'No audit events yet. Events are created automatically when leaks are processed.'
                            : 'No records matching current filter.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#f9f9f9] transition-colors">
                      <td className="py-3 px-4 font-mono-data text-[#3f4947] whitespace-nowrap">
                        {new Date(log.event_timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono-data font-bold uppercase ${getEventTypeBadgeStyle(log.event_type)}`}
                        >
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono-data font-semibold text-[#0b4f4a]">
                        {log.leak_id ? log.leak_id.slice(0, 12) + '...' : 'N/A'}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#1a1c1c]">
                        {log.leaks?.razorpay_payment_id || '-'}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#3f4947] max-w-md truncate">
                        {log.detail}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#4C7A63] font-medium">
                        {log.outcome || '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Reflow Card View */}
          <div className="block md:hidden p-4 space-y-3 flex-1 overflow-y-auto">
            {filteredLogs.length === 0 ? (
              <p className="text-center text-[#94A3B8] font-mono-data text-xs py-8">
                {loading ? 'Loading...' : 'No audit events yet.'}
              </p>
            ) : (
              filteredLogs.map((log) => (
                <div key={log.id} className="p-4 bg-white border border-[#D8DEE2] rounded space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono-data font-bold uppercase ${getEventTypeBadgeStyle(log.event_type)}`}
                    >
                      {log.event_type}
                    </span>
                    <span className="font-mono-data text-[10px] text-[#94A3B8]">
                      {new Date(log.event_timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="font-mono-data text-[#0b4f4a] font-bold">
                    {log.leaks?.razorpay_payment_id || log.leak_id || 'N/A'}
                  </div>
                  <p className="font-mono-data text-[#3f4947]">{log.detail}</p>
                  {log.outcome && (
                    <div className="font-mono-data text-[11px] text-[#4C7A63]">Outcome: {log.outcome}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getEventTypeBadgeStyle(type) {
  const norm = (type || '').toLowerCase();
  switch (norm) {
    case 'detected':
      return 'bg-blue-100 text-blue-800';
    case 'diagnosed':
      return 'bg-purple-100 text-purple-800';
    case 'policy_check':
      return 'bg-teal-100 text-teal-800';
    case 'action_taken':
      return 'bg-green-100 text-green-800';
    case 'resolved':
      return 'bg-emerald-100 text-emerald-800';
    case 'escalated':
      return 'bg-amber-100 text-amber-800';
    case 'human_override':
      return 'bg-orange-100 text-orange-800';
    case 'written_off':
      return 'bg-gray-100 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}
