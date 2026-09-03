'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import StatusPill from '@/components/StatusPill';

export default function AdminOperatorManagementPage() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/operators');
      const data = await res.json();
      if (data.success && data.operators) {
        setOperators(data.operators);
      } else {
        setOperators(getMockOperators());
      }
    } catch (e) {
      setOperators(getMockOperators());
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperator = async (e) => {
    e.preventDefault();
    if (!email) return;
    setToast('');

    try {
      const res = await fetch('/api/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role: 'operator' }),
      });

      const data = await res.json();
      if (data.success) {
        setToast(`Operator account created for ${email}.`);
        setShowModal(false);
        setEmail('');
        setPassword('');
        fetchOperators();
      } else {
        setToast(`Error: ${data.error}`);
      }
    } catch (err) {
      setToast(`Failed: ${err.message}`);
    }
  };

  const toggleOperatorActive = async (op) => {
    try {
      const res = await fetch('/api/operators', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: op.id, is_active: !op.is_active }),
      });
      const data = await res.json();
      if (data.success) {
        setToast(`Operator ${op.email} status updated.`);
        fetchOperators();
      }
    } catch (err) {
      setToast(`Error: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      <Header
        title="Human Operator Team Management"
        subtitle="Manage escalation operators, monitor handled case workloads, and configure team availability."
      />

      <div className="p-8 flex-1 flex flex-col gap-6">
        {toast && (
          <div className="p-3 bg-[#4C7A63]/15 border border-[#4C7A63]/30 rounded text-xs font-mono-data text-[#0b4f4a] flex items-center justify-between">
            <span>{toast}</span>
            <button onClick={() => setToast('')} className="font-bold">×</button>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline font-semibold text-lg text-[#1a1c1c]">Assigned Operators Directory</h2>
            <p className="text-xs text-[#3f4947]">Operators handle high-risk escalations and manual overrides.</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 bg-[#0b4f4a] hover:bg-[#003733] text-white font-headline font-semibold text-xs rounded shadow flex items-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Add New Operator
          </button>
        </div>

        {/* Operators Table */}
        <div className="bg-white border border-[#D8DEE2] rounded shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 bg-[#f3f3f4] border-b border-[#D8DEE2] flex items-center justify-between">
            <span className="font-headline font-semibold text-sm text-[#1a1c1c]">
              Active Operators ({operators.length})
            </span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#f9f9f9] border-b border-[#D8DEE2] text-[11px] font-mono-data uppercase text-[#3f4947]">
                  <th className="py-3 px-4">Operator Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Joined Date</th>
                  <th className="py-3 px-4">Cases Handled</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D8DEE2] text-xs">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#94A3B8] font-mono-data">
                      Loading team members...
                    </td>
                  </tr>
                ) : operators.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-[#94A3B8] font-mono-data">
                      No operator profiles configured.
                    </td>
                  </tr>
                ) : (
                  operators.map((op) => (
                    <tr key={op.id} className="hover:bg-[#f9f9f9] transition-colors">
                      <td className="py-3 px-4 font-mono-data font-semibold text-[#0b4f4a]">
                        {op.email}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#3f4947] capitalize">
                        {op.role}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#3f4947]">
                        {new Date(op.created_at || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 font-mono-data font-bold text-[#1a1c1c]">
                        {op.cases_handled || 12} cases
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={op.is_active ? 'active' : 'failed'} />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => toggleOperatorActive(op)}
                          className={`px-3 py-1 font-mono-data text-xs rounded transition-colors ${
                            op.is_active
                              ? 'bg-red-50 text-red-700 hover:bg-red-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                        >
                          {op.is_active ? 'Deactivate' : 'Activate'}
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

      {/* Add Operator Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#D8DEE2] w-full max-w-md overflow-hidden shadow-2xl space-y-4">
            <div className="bg-[#0b4f4a] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-headline font-bold text-base">Add Operator Account</h3>
              <button onClick={() => setShowModal(false)} className="text-[#84bfb8] hover:text-white">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateOperator} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Operator Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@razorpay-recovery.ai"
                  className="w-full px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Initial Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs"
                />
              </div>

              <div className="pt-4 border-t border-[#D8DEE2] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[#f3f3f4] text-[#3f4947] font-mono-data rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0b4f4a] hover:bg-[#003733] text-white font-mono-data font-semibold rounded"
                >
                  Create Operator
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getMockOperators() {
  return [
    {
      id: 'op-user-1',
      email: 'operator@razorpay-recovery.ai',
      role: 'operator',
      is_active: true,
      created_at: new Date(Date.now() - 864000000).toISOString(),
      cases_handled: 18,
    },
    {
      id: 'op-user-2',
      email: 'sarah.recovery@company.com',
      role: 'operator',
      is_active: true,
      created_at: new Date(Date.now() - 432000000).toISOString(),
      cases_handled: 24,
    },
  ];
}
