'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function OperatorAuditLogPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetchOperatorLogs();
  }, []);

  const fetchOperatorLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/audit');
      const data = await res.json();

      if (data.success && data.logs) {
        setLogs(data.logs);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error('[operator-audit] Unexpected error:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = filterType === 'all'
    ? logs
    : logs.filter((l) => (l.event_type || '').toLowerCase() === filterType.toLowerCase());

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      <Header
        title="Operator Activity & Read-Only Audit History"
        subtitle="Immutable view of manual overrides, resolved escalations, and human decision logs."
      />

      <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-6">
        <div className="bg-white border border-[#D8DEE2] rounded p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full sm:w-auto">
            <span className="text-xs font-semibold text-[#1a1c1c] uppercase tracking-wider">
              Filter Log View:
            </span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded text-xs font-mono-data text-[#1a1c1c] min-h-[44px]"
            >
              <option value="all">All Operator Activity</option>
              <option value="human_override">Human Overrides Only</option>
              <option value="escalated">System Escalations</option>
              <option value="recovery_action">Actions Executed</option>
            </select>
          </div>

          <button
            onClick={fetchOperatorLogs}
            className="px-3 py-2 bg-[#0b4f4a] text-white text-xs font-mono-data rounded hover:bg-[#003733] transition-colors min-h-[44px] flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">sync</span>
            Refresh Logs
          </button>
        </div>

        <div className="bg-white border border-[#D8DEE2] rounded shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 bg-[#f3f3f4] border-b border-[#D8DEE2] flex items-center justify-between">
            <span className="font-headline font-semibold text-sm text-[#1a1c1c]">
              Operator History Ledger ({filteredLogs.length}) - Read Only
            </span>
          </div>

          <div className="hidden md:block overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9f9f9] border-b border-[#D8DEE2] text-[11px] font-mono-data uppercase text-[#3f4947]">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Leak ID</th>
                  <th className="py-3 px-4">Details</th>
                  <th className="py-3 px-4">Outcome</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8DEE2] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-[#94A3B8] font-mono-data">
                      Loading activity records...
                    </td>
                  </tr>
                ) : filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-[#94A3B8] font-mono-data">
                      No operator log items found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#f9f9f9] transition-colors">
                      <td className="py-3 px-4 font-mono-data text-[#3f4947]">
                        {new Date(log.event_timestamp).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded text-[10px] font-mono-data font-bold uppercase bg-[#C98A2B]/15 text-[#C98A2B] border border-[#C98A2B]/30">
                          {log.event_type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono-data font-semibold text-[#0b4f4a]">
                        {log.leak_id}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#3f4947]">
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

          <div className="block md:hidden p-4 space-y-3 flex-1 overflow-y-auto">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 bg-white border border-[#D8DEE2] rounded space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono-data font-bold text-[#C98A2B]">{log.event_type}</span>
                  <span className="text-[10px] text-[#94A3B8] font-mono-data">
                    {new Date(log.event_timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="font-mono-data text-[#0b4f4a]">Leak ID: {log.leak_id}</div>
                <p className="font-mono-data text-[#3f4947]">{log.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


