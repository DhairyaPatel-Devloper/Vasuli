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

  // Test Case Creation Modal State
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoMode, setDemoMode] = useState('custom'); // 'custom' or 'dual'
  const [demoName, setDemoName] = useState('Dhairya Patel');
  const [demoEmail, setDemoEmail] = useState('dhairyapatel0246@gmail.com');
  const [demoPhone, setDemoPhone] = useState('+919104898224');
  const [demoAmount, setDemoAmount] = useState(15000);
  const [demoSource, setDemoSource] = useState('payment_failed');
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [refreshingCaseId, setRefreshingCaseId] = useState(null);

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
            if (updated) setSelectedCase({ ...updated });
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

  // Specific case refresh (Ref button) without full page reload
  const handleRefreshSingleCase = async (e, caseId) => {
    if (e) e.stopPropagation();
    setRefreshingCaseId(caseId);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('leaks')
        .select('*')
        .eq('id', caseId)
        .single();

      if (data && !error) {
        setCases((prev) => prev.map((c) => (c.id === caseId ? data : c)));
        setSelectedCase({ ...data });
      }
    } catch (err) {
      console.warn('Failed to refresh case:', err.message);
    } finally {
      setRefreshingCaseId(null);
    }
  };

  // Create Test Case with Full Customer Data and Auto-Run Pipeline
  const handleRunDemoTestCases = async (e) => {
    e.preventDefault();
    setDemoSubmitting(true);
    try {
      const res = await fetch('/api/leaks/test-cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: demoMode,
          name: demoName,
          email: demoEmail,
          phone: demoPhone,
          amount: demoAmount,
          source: demoSource,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowDemoModal(false);
        await fetchCases();
      } else {
        alert(`Error creating test cases: ${data.error}`);
      }
    } catch (err) {
      alert(`Network error: ${err.message}`);
    } finally {
      setDemoSubmitting(false);
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

      <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-6">
        {/* Search and Filters Toolbar */}
        <div className="bg-white border border-[#D8DEE2] rounded p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[#94A3B8] text-sm">
                search
              </span>
              <input
                type="text"
                placeholder="Search Leak ID, Payment ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded text-xs font-mono-data text-[#1a1c1c] focus:outline-none focus:border-[#0b4f4a] min-h-[44px]"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-48 px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded text-xs font-mono-data text-[#1a1c1c] focus:outline-none focus:border-[#0b4f4a] min-h-[44px]"
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

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowDemoModal(true)}
              className="px-3 py-2 bg-[#C98A2B] hover:bg-[#b07823] text-white text-xs font-mono-data font-semibold rounded flex items-center gap-1.5 transition-colors shadow-sm min-h-[44px]"
            >
              <span className="material-symbols-outlined text-sm">science</span>
              Create Test Cases
            </button>

            <button
              onClick={fetchCases}
              disabled={loading}
              className="px-3 py-2 bg-[#0b4f4a] hover:bg-[#003733] text-white text-xs font-mono-data rounded flex items-center gap-1.5 transition-colors disabled:opacity-50 min-h-[44px]"
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
                Click row to inspect details · "Ref" re-fetches single case
              </span>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse table-fixed">
                <thead>
                  <tr className="bg-[#f9f9f9] border-b border-[#D8DEE2] text-[11px] font-mono-data uppercase text-[#3f4947]">
                    <th className="py-3 px-3 w-36">Leak / Payment ID</th>
                    <th className="py-3 px-3 w-24">Amount</th>
                    <th className="py-3 px-3 w-28">Source</th>
                    <th className="py-3 px-3 w-24">Status</th>
                    <th className="py-3 px-3 w-16 text-center">EV</th>
                    <th className="py-3 px-3 w-16 text-right">Action</th>
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
                          ? 'No cases in database yet. Click "Create Test Cases" above.'
                          : 'No cases matching current filter.'}
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map((c) => {
                      const isSelected = selectedCase?.id === c.id;
                      const isRowRefreshing = refreshingCaseId === c.id;
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCase(c)}
                          className={`cursor-pointer transition-colors ${
                            isSelected ? 'bg-[#0b4f4a]/10 border-l-4 border-[#0b4f4a]' : 'hover:bg-[#f9f9f9]'
                          }`}
                        >
                          <td className="py-3 px-3 font-mono-data font-semibold text-[#0b4f4a] truncate">
                            <div>{c.id.slice(0, 8)}...</div>
                            <div className="text-[10px] text-[#94A3B8] truncate">{c.razorpay_payment_id}</div>
                          </td>
                          <td className="py-3 px-3 font-mono-data font-bold text-[#1a1c1c]">
                            ₹{(c.amount || 0).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-mono-data text-[#3f4947] capitalize truncate">
                            {(c.source || '').replace(/_/g, ' ')}
                          </td>
                          <td className="py-3 px-3">
                            <StatusPill status={c.status} />
                          </td>
                          <td className="py-3 px-3 font-mono-data font-bold text-[#C98A2B] text-center">
                            {c.ev_score !== null && c.ev_score !== undefined ? `${c.ev_score}` : '-'}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={(e) => handleRefreshSingleCase(e, c.id)}
                              disabled={isRowRefreshing}
                              title="Re-fetch this case from Supabase"
                              className="px-2 py-1 bg-[#f3f3f4] hover:bg-[#e8e8e8] border border-[#D8DEE2] rounded text-[11px] font-mono-data text-[#0b4f4a] font-semibold transition-colors disabled:opacity-50"
                            >
                              {isRowRefreshing ? '...' : 'Ref'}
                            </button>
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
                  {cases.length === 0 ? 'No cases yet. Click "Create Test Cases" above.' : 'No cases matching filter.'}
                </p>
              ) : (
                filteredCases.map((c) => {
                  const isSelected = selectedCase?.id === c.id;
                  const isRowRefreshing = refreshingCaseId === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className={`p-4 rounded border text-xs cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-[#0b4f4a]/10 border-[#0b4f4a] ring-1 ring-[#0b4f4a]'
                          : 'bg-white border-[#D8DEE2]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono-data font-bold text-[#0b4f4a] truncate">{c.razorpay_payment_id}</span>
                        <div className="flex items-center gap-2">
                          <StatusPill status={c.status} />
                          <button
                            onClick={(e) => handleRefreshSingleCase(e, c.id)}
                            disabled={isRowRefreshing}
                            className="px-2 py-1 bg-[#f3f3f4] border border-[#D8DEE2] rounded text-[10px] font-mono-data text-[#0b4f4a] font-semibold min-h-[36px] min-w-[36px]"
                          >
                            {isRowRefreshing ? '...' : 'Ref'}
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center font-mono-data mb-1">
                        <span className="text-[#3f4947]">Amount:</span>
                        <span className="font-bold text-[#1a1c1c]">₹{(c.amount || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[11px] text-[#94A3B8] font-mono-data">
                        <span>{(c.root_cause || 'Pending diagnosis').replace(/_/g, ' ')}</span>
                        <span>EV: {c.ev_score ?? '—'}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Case Detail Column */}
          <div className="lg:col-span-5 flex flex-col">
            <CaseDetailPanel
              leak={selectedCase}
              onClose={() => setSelectedCase(null)}
              onRefresh={fetchCases}
            />
          </div>
        </div>
      </div>

      {/* Interactive Live Demo / Custom Case Modal */}
      {showDemoModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#D8DEE2] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-[#0b4f4a] text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-headline font-bold text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-400">science</span>
                  Create Test Case (Live Customer Demo)
                </h3>
                <p className="text-[11px] font-mono-data text-[#84bfb8]">
                  Automated Detect → Diagnose → EV Decide → Act Pipeline
                </p>
              </div>
              <button
                onClick={() => setShowDemoModal(false)}
                className="text-[#84bfb8] hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleRunDemoTestCases} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 p-1 bg-[#f3f3f4] rounded border border-[#D8DEE2]">
                <button
                  type="button"
                  onClick={() => setDemoMode('custom')}
                  className={`flex-1 py-1.5 px-3 rounded font-mono-data font-semibold text-xs transition-colors ${
                    demoMode === 'custom'
                      ? 'bg-[#0b4f4a] text-white shadow-sm'
                      : 'text-[#3f4947] hover:text-[#1a1c1c]'
                  }`}
                >
                  Custom Single Case
                </button>
                <button
                  type="button"
                  onClick={() => setDemoMode('dual')}
                  className={`flex-1 py-1.5 px-3 rounded font-mono-data font-semibold text-xs transition-colors ${
                    demoMode === 'dual'
                      ? 'bg-[#0b4f4a] text-white shadow-sm'
                      : 'text-[#3f4947] hover:text-[#1a1c1c]'
                  }`}
                >
                  Dual Demo (₹2.5k + ₹15k)
                </button>
              </div>

              {/* Customer Full Name */}
              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Customer Full Name
                </label>
                <input
                  type="text"
                  required
                  value={demoName}
                  onChange={(e) => setDemoName(e.target.value)}
                  placeholder="e.g. Dhairya Patel"
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              {/* Customer Mobile Number */}
              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Customer Mobile Number (Destination for Sarvam Voice Call)
                </label>
                <input
                  type="tel"
                  required
                  value={demoPhone}
                  onChange={(e) => setDemoPhone(e.target.value)}
                  placeholder="+919104898224"
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              {/* Customer Target Email */}
              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Customer Email Address (Destination for Recovery Email)
                </label>
                <input
                  type="email"
                  required
                  value={demoEmail}
                  onChange={(e) => setDemoEmail(e.target.value)}
                  placeholder="dhairyapatel0246@gmail.com"
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              {demoMode === 'custom' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                        Failed Amount (₹ INR)
                      </label>
                      <input
                        type="number"
                        min="100"
                        required
                        value={demoAmount}
                        onChange={(e) => setDemoAmount(Number(e.target.value))}
                        placeholder="15000"
                        className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                        Failure Source
                      </label>
                      <select
                        value={demoSource}
                        onChange={(e) => setDemoSource(e.target.value)}
                        className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                      >
                        <option value="payment_failed">Payment Failed (Checkout)</option>
                        <option value="checkout_abandoned">Checkout Abandoned</option>
                        <option value="subscription_failed">Subscription Failed</option>
                      </select>
                    </div>
                  </div>
                </>
              )}

              {demoMode === 'dual' && (
                <div className="p-3 bg-[#C98A2B]/10 border border-[#C98A2B]/30 rounded text-[#1a1c1c] space-y-1">
                  <span className="font-semibold block font-headline text-xs text-[#0b4f4a]">
                    Dual Demo Cases:
                  </span>
                  <ul className="list-disc pl-4 text-[11px] text-[#3f4947] space-y-0.5">
                    <li><strong>Case 1 (₹2,500)</strong>: Resolves to transactional recovery email via Resend.</li>
                    <li><strong>Case 2 (₹15,000)</strong>: Resolves to live outbound Sarvam AI Voice Agent call.</li>
                  </ul>
                </div>
              )}

              <div className="pt-4 border-t border-[#D8DEE2] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowDemoModal(false)}
                  className="px-4 py-2 bg-[#f3f3f4] text-[#3f4947] font-mono-data rounded min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={demoSubmitting}
                  className="px-4 py-2 bg-[#0b4f4a] hover:bg-[#003733] text-white font-mono-data font-semibold rounded flex items-center gap-1.5 min-h-[44px] disabled:opacity-50"
                >
                  {demoSubmitting ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Executing Pipeline...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">play_arrow</span>
                      Launch Test Case
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
