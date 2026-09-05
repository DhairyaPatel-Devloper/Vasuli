'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';

export default function AdminOperatorManagementPage() {
  const [operators, setOperators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingOp, setEditingOp] = useState(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

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
        setOperators([]);
      }
    } catch (e) {
      console.warn('Failed to fetch operators:', e.message);
      setOperators([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperator = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSaving(true);
    setToast('');

    try {
      const res = await fetch('/api/operators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          mobile_no: mobileNo,
          role: 'operator',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setToast(`Operator account created for ${email}.`);
        setShowAddModal(false);
        resetForm();
        fetchOperators();
      } else {
        setToast(`Error: ${data.error}`);
      }
    } catch (err) {
      setToast(`Failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateOperator = async (e) => {
    e.preventDefault();
    if (!editingOp) return;
    setSaving(true);
    setToast('');

    try {
      const payload = {
        id: editingOp.id,
        email,
        mobile_no: mobileNo,
        is_active: isActive,
      };
      if (password && password.trim()) {
        payload.password = password.trim();
      }

      const res = await fetch('/api/operators', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setToast(`Operator ${email} updated successfully.`);
        setEditingOp(null);
        resetForm();
        fetchOperators();
      } else {
        setToast(`Error: ${data.error}`);
      }
    } catch (err) {
      setToast(`Update failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteOperator = async (id, opEmail) => {
    if (!confirm(`Are you sure you want to PERMANENTLY delete operator ${opEmail} from the database?`)) return;
    try {
      const res = await fetch(`/api/operators?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setToast(`Operator ${opEmail} permanently removed.`);
        fetchOperators();
      } else {
        setToast(`Delete error: ${data.error}`);
      }
    } catch (err) {
      setToast(`Delete error: ${err.message}`);
    }
  };

  const openEditModal = (op) => {
    setEditingOp(op);
    setEmail(op.email || '');
    setPassword('');
    setMobileNo(op.mobile_no || op.mobile_number || '');
    setIsActive(op.is_active ?? true);
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setMobileNo('');
    setIsActive(true);
    setEditingOp(null);
  };

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      <Header
        title="Human Operator Team Management"
        subtitle="Manage escalation operators, configure contact details, and maintain team availability."
      />

      <div className="p-4 sm:p-6 lg:p-8 flex-1 flex flex-col gap-6">
        {toast && (
          <div className="p-3 bg-[#4C7A63]/15 border border-[#4C7A63]/30 rounded text-xs font-mono-data text-[#0b4f4a] flex items-center justify-between">
            <span>{toast}</span>
            <button onClick={() => setToast('')} className="font-bold min-h-[36px] min-w-[36px] flex items-center justify-center">×</button>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-headline font-semibold text-lg text-[#1a1c1c]">Assigned Operators Directory</h2>
            <p className="text-xs text-[#3f4947]">Operators handle high-risk escalations and manual overrides.</p>
          </div>
          <button
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="px-4 py-2.5 bg-[#0b4f4a] hover:bg-[#003733] text-white font-headline font-semibold text-xs rounded shadow flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          >
            <span className="material-symbols-outlined text-base">person_add</span>
            Add New Operator
          </button>
        </div>

        {/* Operators Table Container */}
        <div className="bg-white border border-[#D8DEE2] rounded shadow-sm overflow-hidden flex-1 flex flex-col">
          <div className="p-4 bg-[#f3f3f4] border-b border-[#D8DEE2] flex items-center justify-between">
            <span className="font-headline font-semibold text-sm text-[#1a1c1c]">
              Operator Team ({operators.length})
            </span>
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse table-fixed">
              <thead>
                <tr className="bg-[#f9f9f9] border-b border-[#D8DEE2] text-[11px] font-mono-data uppercase text-[#3f4947]">
                  <th className="py-3 px-4 w-48">Operator Email</th>
                  <th className="py-3 px-4 w-36">Mobile Number</th>
                  <th className="py-3 px-4 w-24">Role</th>
                  <th className="py-3 px-4 w-28">Joined Date</th>
                  <th className="py-3 px-4 w-28">Status</th>
                  <th className="py-3 px-4 w-32 text-right">Actions</th>
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
                      No operator profiles configured in database. Click "Add New Operator" above.
                    </td>
                  </tr>
                ) : (
                  operators.map((op) => (
                    <tr key={op.id} className="hover:bg-[#f9f9f9] transition-colors">
                      <td className="py-3 px-4 font-mono-data font-semibold text-[#0b4f4a] truncate">
                        {op.email}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#1a1c1c] truncate font-semibold">
                        {op.mobile_no || op.mobile_number || <span className="text-[#94A3B8] italic font-normal">—</span>}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#3f4947] capitalize">
                        {op.role}
                      </td>
                      <td className="py-3 px-4 font-mono-data text-[#3f4947]">
                        {new Date(op.created_at || Date.now()).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded text-[11px] font-mono-data border tracking-wide uppercase font-semibold ${
                            op.is_active
                              ? 'bg-[#4C7A63]/15 text-[#4C7A63] border-[#4C7A63]/30'
                              : 'bg-[#B23A2E]/15 text-[#B23A2E] border-[#B23A2E]/30'
                          }`}
                        >
                          {op.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-3">
                        <button
                          onClick={() => openEditModal(op)}
                          className="px-2 py-1 text-[#0b4f4a] hover:underline font-mono-data font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteOperator(op.id, op.email)}
                          className="px-2 py-1 text-[#B23A2E] hover:underline font-mono-data font-semibold"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="block md:hidden p-4 space-y-3 flex-1 overflow-y-auto">
            {operators.length === 0 ? (
              <p className="text-center text-[#94A3B8] font-mono-data text-xs py-6">
                No operator profiles configured.
              </p>
            ) : (
              operators.map((op) => (
                <div key={op.id} className="p-4 bg-white border border-[#D8DEE2] rounded text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono-data font-bold text-[#0b4f4a] truncate">{op.email}</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono-data border uppercase font-semibold ${
                        op.is_active
                          ? 'bg-[#4C7A63]/15 text-[#4C7A63] border-[#4C7A63]/30'
                          : 'bg-[#B23A2E]/15 text-[#B23A2E] border-[#B23A2E]/30'
                      }`}
                    >
                      {op.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="font-mono-data text-[#3f4947] text-[11px] space-y-1">
                    <div>Mobile No: <span className="text-[#1a1c1c] font-semibold">{op.mobile_no || op.mobile_number || '—'}</span></div>
                    <div>Joined: {new Date(op.created_at || Date.now()).toLocaleDateString()}</div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2 border-t border-[#D8DEE2]">
                    <button
                      onClick={() => openEditModal(op)}
                      className="text-[#0b4f4a] font-mono-data text-xs font-semibold px-2 py-1"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteOperator(op.id, op.email)}
                      className="text-[#B23A2E] font-mono-data text-xs font-semibold px-2 py-1"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Operator Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#D8DEE2] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-[#0b4f4a] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-headline font-bold text-base">Add Operator Account</h3>
              <button onClick={() => setShowAddModal(false)} className="text-[#84bfb8] hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateOperator} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Operator Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="operator@company.com"
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Mobile Number (`mobile_no`)
                </label>
                <input
                  type="tel"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
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
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              <div className="pt-4 border-t border-[#D8DEE2] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#f3f3f4] text-[#3f4947] font-mono-data rounded min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#0b4f4a] hover:bg-[#003733] text-white font-mono-data font-semibold rounded min-h-[44px] disabled:opacity-50"
                >
                  {saving ? 'Creating...' : 'Create Operator'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Operator Modal */}
      {editingOp && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#D8DEE2] w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-[#0b4f4a] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-headline font-bold text-base">Edit Operator Account</h3>
              <button onClick={() => setEditingOp(null)} className="text-[#84bfb8] hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateOperator} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Operator Email Address
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Mobile Number (`mobile_no`)
                </label>
                <input
                  type="tel"
                  value={mobileNo}
                  onChange={(e) => setMobileNo(e.target.value)}
                  placeholder="+919876543210"
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="font-semibold text-[#1a1c1c] uppercase tracking-wider text-xs">
                  Account Status:
                </label>
                <button
                  type="button"
                  onClick={() => setIsActive(!isActive)}
                  className={`px-3 py-1.5 rounded font-mono-data text-xs font-semibold transition-colors min-h-[40px] ${
                    isActive
                      ? 'bg-[#4C7A63]/15 text-[#4C7A63] border border-[#4C7A63]/30'
                      : 'bg-[#B23A2E]/15 text-[#B23A2E] border border-[#B23A2E]/30'
                  }`}
                >
                  {isActive ? 'Active' : 'Inactive'} (Click to toggle)
                </button>
              </div>

              <div className="pt-4 border-t border-[#D8DEE2] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingOp(null)}
                  className="px-4 py-2 bg-[#f3f3f4] text-[#3f4947] font-mono-data rounded min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-[#0b4f4a] hover:bg-[#003733] text-white font-mono-data font-semibold rounded min-h-[44px] disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
