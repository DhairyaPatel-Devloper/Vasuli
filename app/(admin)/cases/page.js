'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import StatusPill from '@/components/StatusPill';
import CaseDetailPanel from '@/components/CaseDetailPanel';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function AdminCasesPage() {
  const [cases, setCases] = useState([]);
  const [filteredCases, setFilteredCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    filterData();
  }, [searchTerm, statusFilter, cases]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCases = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('leaks')
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('[cases] Error fetching leaks:', error.message);
        setCases([]);
      } else {
        setCases(data || []);
        if (data && data.length > 0) {
          if (!selectedCase) {
            setSelectedCase(data[0]);
          } else {
            const updated = data.find((c) => c.id === selectedCase.id);
            if (updated) setSelectedCase(updated);
          }
        }
      }
    } catch (err) {
      console.error('[cases] Unexpected error:', err);
      setCases([]);
    } finally {
      setLoading(false);
    }
  };

  const filterData = () => {
    let result = cases;

    if (statusFilter !== 'all') {
      result = result.filter((c) => (c.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          (c.id || '').toLowerCase().includes(term) ||
          (c.razorpay_payment_id || '').toLowerCase().includes(term) ||
          (c.root_cause || '').toLowerCase().includes(term)
      );
    }

    setFilteredCases(result);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      <Header
        title="Payment Leak Case Management"
        subtitle="Inspect individual payment leaks, trigger AI diagnostics, review EV calculations, and monitor execution histories."
      />

      <div className="p-8 flex-1 flex flex-col gap-6">
        {/* Search and Filters Toolbar */}
        <div className="bg-white border border-[#D8DEE2] rounded p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#94A3B8] text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Search Leak ID, Payment ID, root cause..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded text-xs font-mono-data text-[#1a1c1c] focus:outline-none focus:border-[#0b4f4a]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded text-xs font-mono-data text-[#1a1c1c] focus:outline-none focus:border-[#0b4f4a]"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="action_taken">Action Taken</option>
              <option value="resolved">Resolved</option>
              <option value="escalated">Escalated</option>
              <option value="needs_manual_diagnosis">Needs Manual Diagnosis</option>
              <option value="written_off">Written Off</option>
            </select>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={fetchCases}
              disabled={loading}
              className="px-3 py-2 bg-[#0b4f4a] hover:bg-[#003733] text-white text-xs font-mono-data rounded flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">sync</span>
              Refresh Cases
            </button>
          </div>
        </div>

        {/* Master-Detail Split Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          {/* Case List Column */}
          <div className="lg:col-span-7 bg-white border border-[#D8DEE2] rounded shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-[#f3f3f4] border-b border-[#D8DEE2] flex items-center justify-between">
              <span className="font-headline font-semibold text-sm text-[#1a1c1c]">
                Case Queue ({filteredCases.length})
              </span>
              <span className="font-mono-data text-[11px] text-[#94A3B8]">
                Click row to inspect details
              </span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#f9f9f9] border-b border-[#D8DEE2] text-[11px] font-mono-data uppercase text-[#3f4947]">
                    <th className="py-3 px-4">Leak ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Source</th>
                    <th className="py-3 px-4">Detected</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">EV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D8DEE2] text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#94A3B8] font-mono-data">
                        Loading payment leaks...
                      </td>
                    </tr>
                  ) : filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-[#94A3B8] font-mono-data">
                        {cases.length === 0
                          ? 'No cases in database yet. Go to Dashboard → Seed DB.'
                          : 'No cases matching current filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c) => {
                      const isSelected = selectedCase?.id === c.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCase(c)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#0b4f4a]/10 border-l-4 border-[#0b4f4a]' : 'hover:bg-[#f9f9f9]'
                          }`}
                        >
                          <td className="py-3 px-4 font-mono-data font-semibold text-[#0b4f4a]">
                            <div>{c.id.slice(0, 10)}...</div>
                            <div className="text-[10px] text-[#94A3B8]">{c.razorpay_payment_id}</div>
                          </td>
                          <td className="py-3 px-4 font-mono-data font-bold text-[#1a1c1c]">
                            ₹{(c.amount || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 font-mono-data text-[#3f4947] capitalize">
                            {(c.source || '').replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-4 font-mono-data text-[#3f4947]">
                            {new Date(c.detected_at).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">
                            <StatusPill status={c.status} />
                          </td>
                          <td className="py-3 px-4 font-mono-data font-bold text-[#C98A2B] text-right">
                            {c.ev_score !== null && c.ev_score !== undefined ? `${c.ev_score}` : '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Stacked Card View */}
            <div className="block md:hidden p-4 space-y-3 flex-1 overflow-y-auto">
              {filteredCases.length === 0 ? (
                <p className="text-center text-[#94A3B8] font-mono-data text-xs py-8">
                  {cases.length === 0 ? 'No cases yet.' : 'No cases matching filter.'}
                </p>
              ) : (
                filteredCases.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCase(c)}
                    className={`p-4 rounded border text-xs cursor-pointer transition-all ${
                      selectedCase?.id === c.id
                        ? 'bg-[#0b4f4a]/10 border-[#0b4f4a] ring-1 ring-[#0b4f4a]'
                        : 'bg-white border-[#D8DEE2]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono-data font-bold text-[#0b4f4a] truncate">{c.razorpay_payment_id}</span>
                      <StatusPill status={c.status} />
                    </div>
                    <div className="flex justify-between items-center font-mono-data mb-1">
                      <span className="text-[#3f4947]">Amount:</span>
                      <span className="font-bold text-[#1a1c1c]">₹{(c.amount || 0).toLocaleString()}</span>
                    </div>
                    <div className="text-[11px] text-[#94A3B8] font-mono-data">
                      {(c.root_cause || 'Pending diagnosis').replace(/_/g, ' ')}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Case Detail Column */}
          <div className="lg:col-span-5 flex flex-col">
            {selectedCase ? (
              <CaseDetailPanel
                leak={selectedCase}
                onRefresh={fetchCases}
              />
            ) : (
              <div className="bg-white border border-[#D8DEE2] rounded p-8 text-center flex flex-col items-center justify-center h-full text-[#94A3B8]">
                <span className="material-symbols-outlined text-4xl mb-2">touch_app</span>
                <p className="font-mono-data text-xs">
                  Select a case from the list to view complete AI analysis and audit timeline.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
