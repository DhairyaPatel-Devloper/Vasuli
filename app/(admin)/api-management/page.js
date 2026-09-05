'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import StatusPill from '@/components/StatusPill';

export default function AdminApiManagementPage() {
  const [credentials, setCredentials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCred, setEditingCred] = useState(null);
  const [formData, setFormData] = useState({
    category: 'payment_gateway',
    provider_name: 'Razorpay Key Primary',
    account_email: 'admin@company.com',
    encrypted_key: '',
    encrypted_secret: '',
    priority: 1,
    status: 'active',
  });
  const [toast, setToast] = useState('');

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/credentials');
      const data = await res.json();
      if (data.success && data.credentials) {
        setCredentials(data.credentials);
      } else {
        console.error('[api-management] Failed to fetch credentials:', data.error);
        setCredentials([]);
      }
    } catch (e) {
      console.error('[api-management] Unexpected fetch error:', e.message);
      setCredentials([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCredential = async (e) => {
    e.preventDefault();
    setToast('');

    try {
      const method = editingCred ? 'PUT' : 'POST';
      const payload = editingCred ? { ...formData, id: editingCred.id } : formData;

      const res = await fetch('/api/credentials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        setToast(`Credential ${editingCred ? 'updated' : 'added'} successfully.`);
        setShowModal(false);
        setEditingCred(null);
        resetForm();
        fetchCredentials();
      } else {
        setToast(`Error: ${data.error}`);
      }
    } catch (err) {
      setToast(`Save error: ${err.message}`);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this API credential?')) return;
    try {
      const res = await fetch(`/api/credentials?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setToast('Credential deleted.');
        fetchCredentials();
      }
    } catch (err) {
      setToast(`Delete error: ${err.message}`);
    }
  };

  const resetForm = () => {
    setFormData({
      category: 'payment_gateway',
      provider_name: 'Razorpay Key Primary',
      account_email: 'admin@company.com',
      encrypted_key: '',
      encrypted_secret: '',
      priority: 1,
      status: 'active',
    });
  };

  const openAddModal = () => {
    resetForm();
    setEditingCred(null);
    setShowModal(true);
  };

  const openEditModal = (cred) => {
    setEditingCred(cred);
    setFormData({
      category: cred.category,
      provider_name: cred.provider_name,
      account_email: cred.account_email || '',
      encrypted_key: cred.encrypted_key || '',
      encrypted_secret: cred.encrypted_secret || '',
      priority: cred.priority,
      status: cred.status,
    });
    setShowModal(true);
  };

  // WhatsApp category removed — only standard providers maintained
  const categories = ['payment_gateway', 'llm_reasoning', 'email', 'voice_call'];

  return (
    <div className="min-h-screen bg-[#f9f9f9] flex flex-col">
      <Header
        title="Third-Party API Credentials & Key Rotation"
        subtitle="Manage encrypted API keys and secrets for payment gateways, LLMs, email, and voice calls with priority failover."
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
            <h2 className="font-headline font-semibold text-lg text-[#1a1c1c]">Configured Provider Keys & Secrets</h2>
            <p className="text-xs text-[#3f4947]">Keys are dynamically loaded by category priority order at runtime.</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-[#0b4f4a] hover:bg-[#003733] text-white font-headline font-semibold text-xs rounded shadow flex items-center justify-center gap-2 transition-colors min-h-[44px]"
          >
            <span className="material-symbols-outlined text-base">add</span>
            Add API Credential
          </button>
        </div>

        <div className="space-y-6">
          {categories.map((cat) => {
            const catCreds = credentials.filter((c) => (c.category || '').toLowerCase() === cat);
            return (
              <div key={cat} className="bg-white border border-[#D8DEE2] rounded shadow-sm overflow-hidden">
                <div className="p-4 bg-[#f3f3f4] border-b border-[#D8DEE2] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#0b4f4a]"></span>
                    <h3 className="font-headline font-bold text-sm text-[#1a1c1c] uppercase tracking-wider">
                      {cat.replace(/_/g, ' ')} Category ({catCreds.length} keys)
                    </h3>
                  </div>
                  <span className="font-mono-data text-[11px] text-[#94A3B8]">
                    Fallback order by Priority (1 = Highest)
                  </span>
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead>
                      <tr className="bg-[#f9f9f9] border-b border-[#D8DEE2] text-[11px] font-mono-data uppercase text-[#3f4947]">
                        <th className="py-3 px-4 w-20">Priority</th>
                        <th className="py-3 px-4 w-44">Provider Name</th>
                        <th className="py-3 px-4 w-48">Account Email</th>
                        <th className="py-3 px-4 w-40">Masked Key ID</th>
                        <th className="py-3 px-4 w-36">Masked Secret</th>
                        <th className="py-3 px-4 w-28">Status</th>
                        <th className="py-3 px-4 w-36">Last Error</th>
                        <th className="py-3 px-4 w-28 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#D8DEE2] text-xs">
                      {catCreds.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="py-4 text-center text-[#94A3B8] font-mono-data">
                            No active credentials configured for category [{cat}].
                          </td>
                        </tr>
                      ) : (
                        catCreds.map((cred) => (
                          <tr key={cred.id} className="hover:bg-[#f9f9f9] transition-colors">
                            <td className="py-3 px-4 font-mono-data font-bold text-[#0b4f4a]">
                              P{cred.priority}
                            </td>
                            <td className="py-3 px-4 font-mono-data font-semibold text-[#1a1c1c] truncate">
                              {cred.provider_name}
                            </td>
                            <td className="py-3 px-4 font-mono-data text-[#3f4947] truncate">
                              {cred.account_email || <span className="text-[#94A3B8] italic">—</span>}
                            </td>
                            <td className="py-3 px-4 font-mono-data font-semibold text-[#1a1c1c] truncate">
                              {maskKey(cred.encrypted_key)}
                            </td>
                            <td className="py-3 px-4 font-mono-data text-[#3f4947] truncate">
                              {cred.encrypted_secret ? maskKey(cred.encrypted_secret) : <span className="text-[#94A3B8] italic">None</span>}
                            </td>
                            <td className="py-3 px-4">
                              <StatusPill status={cred.status} />
                            </td>
                            <td className="py-3 px-4 font-mono-data text-[#B23A2E] text-[11px] truncate">
                              {cred.last_error || 'None'}
                            </td>
                            <td className="py-3 px-4 text-right space-x-2">
                              <button
                                onClick={() => openEditModal(cred)}
                                className="px-2 py-1 text-[#0b4f4a] hover:underline font-mono-data"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(cred.id)}
                                className="px-2 py-1 text-[#B23A2E] hover:underline font-mono-data"
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
                <div className="block md:hidden p-4 space-y-3">
                  {catCreds.length === 0 ? (
                    <p className="text-center text-[#94A3B8] font-mono-data text-xs py-2">
                      No active credentials for [{cat}].
                    </p>
                  ) : (
                    catCreds.map((cred) => (
                      <div key={cred.id} className="p-3 bg-[#f9f9f9] border border-[#D8DEE2] rounded text-xs space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono-data font-bold text-[#0b4f4a]">P{cred.priority} · {cred.provider_name}</span>
                          <StatusPill status={cred.status} />
                        </div>
                        <div className="font-mono-data text-xs text-[#1a1c1c] space-y-0.5">
                          <div className="font-semibold">{maskKey(cred.encrypted_key)}</div>
                          <div className="text-[11px] text-[#3f4947]">{cred.account_email || 'No email attached'}</div>
                        </div>
                        <div className="flex justify-between items-center pt-2 border-t border-[#D8DEE2]">
                          <span className="text-[10px] text-[#B23A2E] font-mono-data truncate max-w-[180px]">
                            {cred.last_error ? `Err: ${cred.last_error}` : 'Healthy'}
                          </span>
                          <div className="space-x-3">
                            <button
                              onClick={() => openEditModal(cred)}
                              className="text-[#0b4f4a] font-mono-data text-xs font-semibold"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(cred.id)}
                              className="text-[#B23A2E] font-mono-data text-xs font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-[#D8DEE2] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-[#0b4f4a] text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-headline font-bold text-base">
                {editingCred ? 'Edit API Credential' : 'Add New API Credential'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[#84bfb8] hover:text-white p-1 min-h-[44px] min-w-[44px] flex items-center justify-center">
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCredential} className="p-6 space-y-4 text-xs overflow-y-auto flex-1">
              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Provider Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                >
                  <option value="payment_gateway">Payment Gateway (Razorpay)</option>
                  <option value="llm_reasoning">LLM Reasoning & Voice AI (Sarvam AI)</option>
                  <option value="email">Transactional Email (Resend)</option>
                  <option value="voice_call">Voice Call AI (Sarvam AI)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Provider Name / Label
                </label>
                <input
                  type="text"
                  required
                  value={formData.provider_name}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  placeholder="e.g. Razorpay Test Key Primary"
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  Account Email
                </label>
                <input
                  type="email"
                  value={formData.account_email}
                  onChange={(e) => setFormData({ ...formData, account_email: e.target.value })}
                  placeholder="account@company.com"
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  API Key / Key ID (`encrypted_key`)
                </label>
                <input
                  type="password"
                  required
                  value={formData.encrypted_key}
                  onChange={(e) => setFormData({ ...formData, encrypted_key: e.target.value })}
                  placeholder="rzp_test_..."
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                  API Secret / Key Secret (`encrypted_secret`) (Optional)
                </label>
                <input
                  type="password"
                  value={formData.encrypted_secret}
                  onChange={(e) => setFormData({ ...formData, encrypted_secret: e.target.value })}
                  placeholder="Razorpay Secret / Auth Secret..."
                  className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                    Priority (1 = First Choice)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded font-mono-data text-xs min-h-[44px]"
                  >
                    <option value="active">Active</option>
                    <option value="rate_limited">Rate Limited</option>
                    <option value="failed">Failed</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-[#D8DEE2] flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-[#f3f3f4] text-[#3f4947] font-mono-data rounded min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#0b4f4a] hover:bg-[#003733] text-white font-mono-data font-semibold rounded min-h-[44px]"
                >
                  Save Credential
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function maskKey(keyStr) {
  if (!keyStr) return '••••';
  if (keyStr.length <= 8) return '••••••••';
  return `${keyStr.slice(0, 7)}...****`;
}
