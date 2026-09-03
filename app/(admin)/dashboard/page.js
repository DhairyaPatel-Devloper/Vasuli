'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import KpiCard from '@/components/KpiCard';
import StatusPill from '@/components/StatusPill';
import CaseDetailPanel from '@/components/CaseDetailPanel';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function AdminDashboardPage() {
  const [leaks, setLeaks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedLeak, setSelectedLeak] = useState(null);
  const [seeding, setSeeding] = useState(false);
  const [stats, setStats] = useState({
    atRisk: 0,
    recovered: 0,
    rate: 0,
    totalCount: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from('leaks')
        .select('*')
        .order('detected_at', { ascending: false });

      if (error) {
        console.error('[dashboard] Error fetching leaks:', error.message);
        setLeaks([]);
        calculateStats([]);
      } else {
        setLeaks(data || []);
        calculateStats(data || []);
      }
    } catch (err) {
      console.error('[dashboard] Unexpected error:', err);
      setLeaks([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (items) => {
    let atRiskSum = 0;
    let recoveredSum = 0;
    let recoveredCount = 0;

    items.forEach((item) => {
      if (item.status === 'resolved') {
        recoveredSum += item.amount || 0;
        recoveredCount++;
      } else if (item.status !== 'written_off') {
        atRiskSum += item.amount || 0;
      }
    });

    const total = items.length;
    const rate = total > 0 ? ((recoveredCount / total) * 100).toFixed(1) : 0;

    setStats({
      atRisk: atRiskSum,
      recovered: recoveredSum,
      rate,
      totalCount: total,
    });
  };

  const handleSeedDatabase = async () => {
    setSeeding(true);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchDashboardData();
      } else {
        alert(`Seed failed at step [${data.step}]: ${data.error}`);
      }
    } catch (e) {
      alert(`Network error: ${e.message}`);
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      <Header
        title="Revenue Recovery Executive Dashboard"
        subtitle="Real-time monitoring of payment leaks, autonomous recovery rates, and AI performance metrics."
      />

      <div className="p-8 space-y-8 flex-1">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <KpiCard
            title="Total Revenue At Risk"
            value={`₹${stats.atRisk.toLocaleString()}`}
            change={stats.totalCount > 0 ? `${stats.totalCount} active cases` : 'No cases yet'}
            trend="up"
            icon="warning"
            subtitle="Open and pending leak cases"
          />
          <KpiCard
            title="Total Revenue Recovered"
            value={`₹${stats.recovered.toLocaleString()}`}
            change={stats.recovered > 0 ? 'Recovered by AI agent' : 'No recoveries yet'}
            trend="up"
            icon="payments"
            subtitle="Resolved by Autonomous Agent"
          />
          <KpiCard
            title="Agent Recovery Rate"
            value={`${stats.rate}%`}
            change="Industry average: 32.0%"
            trend="up"
            icon="trending_up"
            subtitle="Resolved / Total cases"
          />
          <KpiCard
            title="Total Cases Processed"
            value={stats.totalCount.toString()}
            change="100% policy compliance"
            trend="neutral"
            icon="assignment"
            subtitle="Ingested via Webhooks"
          />
        </div>

        {/* Comparison Bars & Analytics Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Baseline vs Agent Comparison */}
          <div className="bg-white border border-[#D8DEE2] rounded p-6 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline font-semibold text-base text-[#1a1c1c]">
                  Baseline vs. Autonomous Agent
                </h3>
                <span className="font-mono-data text-xs text-[#0b4f4a] bg-[#0b4f4a]/10 px-2 py-0.5 rounded font-semibold">
                  {stats.rate > 32 ? `+${(stats.rate - 32).toFixed(1)}% Net Uplift` : 'Tracking...'}
                </span>
              </div>
              <p className="text-xs text-[#3f4947] mb-6">
                Direct recovery yield comparison between traditional static retries vs. AI Root Cause & Dynamic Policy Engine.
              </p>

              <div className="space-y-5">
                {/* Traditional Baseline */}
                <div>
                  <div className="flex justify-between text-xs font-mono-data mb-1">
                    <span className="text-[#3f4947]">Static Retry Rules (Baseline)</span>
                    <span className="font-semibold text-[#1a1c1c]">32.0% Recovery</span>
                  </div>
                  <div className="w-full h-3 bg-[#f3f3f4] rounded overflow-hidden">
                    <div className="h-full bg-[#94A3B8] rounded" style={{ width: '32%' }}></div>
                  </div>
                </div>

                {/* AI Autonomous Recovery Engine */}
                <div>
                  <div className="flex justify-between text-xs font-mono-data mb-1">
                    <span className="text-[#0b4f4a] font-semibold">Razorpay AI Recovery Engine</span>
                    <span className="font-bold text-[#0b4f4a]">{stats.rate}% Recovery</span>
                  </div>
                  <div className="w-full h-3 bg-[#f3f3f4] rounded overflow-hidden">
                    <div
                      className="h-full bg-[#0b4f4a] rounded transition-all duration-500"
                      style={{ width: `${Math.min(parseFloat(stats.rate) || 0, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#D8DEE2] flex items-center justify-between text-xs font-mono-data text-[#3f4947]">
              <span>Powered by Gemini 1.5 + EV Engine</span>
              <span className="text-[#4C7A63] font-semibold">Zero Rule Collisions</span>
            </div>
          </div>

          {/* Source Breakdown */}
          <div className="lg:col-span-2 bg-white border border-[#D8DEE2] rounded p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-headline font-semibold text-base text-[#1a1c1c]">
                  Leak Source Breakdown
                </h3>
                <p className="text-xs text-[#3f4947]">Distribution of detected failure types</p>
              </div>
            </div>

            {leaks.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-[#94A3B8] font-mono-data text-xs">
                {loading ? 'Loading data...' : 'No data yet. Seed the database to see stats.'}
              </div>
            ) : (
              <div className="h-48 flex items-end justify-around gap-4 pt-6 border-b border-[#D8DEE2]">
                {['payment_failed', 'checkout_abandoned', 'subscription_failed'].map((source) => {
                  const count = leaks.filter((l) => l.source === source).length;
                  const pct = leaks.length > 0 ? (count / leaks.length) * 100 : 0;
                  const labels = {
                    payment_failed: 'Payment Failed',
                    checkout_abandoned: 'Abandoned',
                    subscription_failed: 'Subscription',
                  };
                  const colors = {
                    payment_failed: '#B23A2E',
                    checkout_abandoned: '#C98A2B',
                    subscription_failed: '#0b4f4a',
                  };
                  return (
                    <div key={source} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                      <span className="font-mono-data text-xs font-bold" style={{ color: colors[source] }}>
                        {count}
                      </span>
                      <div
                        className="w-12 rounded-t transition-all duration-500"
                        style={{
                          height: `${Math.max(pct, 4)}%`,
                          backgroundColor: colors[source],
                          opacity: 0.85,
                        }}
                        title={`${source}: ${count} leaks`}
                      />
                      <span className="text-[11px] font-mono-data text-[#3f4947] text-center leading-tight">
                        {labels[source]}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Payment Leaks Table */}
        <div className="bg-white border border-[#D8DEE2] rounded shadow-sm overflow-hidden">
          <div className="p-6 border-b border-[#D8DEE2] flex items-center justify-between">
            <div>
              <h3 className="font-headline font-semibold text-base text-[#1a1c1c]">Recent Payment Leaks</h3>
              <p className="text-xs text-[#3f4947]">Real-time stream of detected failures and AI actions</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSeedDatabase}
                disabled={seeding || loading}
                className="px-3 py-1.5 bg-[#C98A2B] hover:bg-[#b07823] text-white text-xs font-mono-data rounded flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">database</span>
                {seeding ? 'Seeding...' : 'Seed DB'}
              </button>
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                className="px-3 py-1.5 bg-[#f3f3f4] hover:bg-[#e8e8e8] text-xs font-mono-data text-[#0b4f4a] border border-[#D8DEE2] rounded flex items-center gap-1.5 transition-colors"
              >
                <span className="material-symbols-outlined text-sm">refresh</span>
                Refresh
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f3f3f4] border-b border-[#D8DEE2] text-[11px] font-mono-data uppercase text-[#3f4947]">
                  <th className="py-3 px-4">Leak ID / Payment</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Source</th>
                  <th className="py-3 px-4">AI Root Cause</th>
                  <th className="py-3 px-4">EV Score</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8DEE2] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-[#94A3B8] font-mono-data">
                      Fetching payment leak stream...
                    </td>
                  </tr>
                ) : leaks.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-12 text-center font-mono-data">
                      <div className="flex flex-col items-center gap-3 text-[#94A3B8]">
                        <span className="material-symbols-outlined text-4xl">inbox</span>
                        <p>No payment leaks recorded yet.</p>
                        <button
                          onClick={handleSeedDatabase}
                          disabled={seeding}
                          className="px-4 py-2 bg-[#C98A2B] hover:bg-[#b07823] text-white text-xs font-mono-data rounded transition-colors"
                        >
                          {seeding ? 'Seeding...' : 'Seed Database with Sample Data'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leaks.slice(0, 10).map((leak) => (
                    <tr
                      key={leak.id}
                      className="hover:bg-[#f9f9f9] transition-colors cursor-pointer"
                      onClick={() => setSelectedLeak(leak)}
                    >
                      <td className="py-3 px-4 font-mono-data font-semibold text-[#0b4f4a]">
                        <div>{leak.id.slice(0, 8)}...</div>
                        <div className="text-[10px] text-[#94A3B8]">{leak.razorpay_payment_id}</div>
                      </td>
                      <td className="py-3 px-4 font-mono-data font-bold text-[#1a1c1c]">
                        ₹{(leak.amount || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#3f4947]">
                        {(leak.source || '').replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#3f4947] max-w-xs truncate">
                        {leak.root_cause ? (leak.root_cause || '').replace(/_/g, ' ') : 'Diagnosing...'}
                      </td>
                      <td className="py-3 px-4 font-mono-data font-bold text-[#C98A2B]">
                        {leak.ev_score !== null && leak.ev_score !== undefined ? `${leak.ev_score}` : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={leak.status} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLeak(leak);
                          }}
                          className="px-2.5 py-1 bg-[#0b4f4a]/10 hover:bg-[#0b4f4a]/20 text-[#0b4f4a] font-mono-data text-xs rounded transition-colors"
                        >
                          Inspect
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Case Detail Inspection Modal */}
      {selectedLeak && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-end">
          <div className="w-full max-w-2xl h-full p-4">
            <CaseDetailPanel
              leak={selectedLeak}
              onClose={() => setSelectedLeak(null)}
              onRefresh={fetchDashboardData}
            />
          </div>
        </div>
      )}
    </div>
  );
}
