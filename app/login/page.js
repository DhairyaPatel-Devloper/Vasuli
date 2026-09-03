'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@razorpay-recovery.ai');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        // Fallback / Demo bypass handling for local hackathon testing
        console.warn('Supabase Auth error:', authError.message);
        if (email.includes('operator')) {
          router.push('/queue');
        } else {
          router.push('/dashboard');
        }
        return;
      }

      // Fetch user profile role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profile?.role === 'operator') {
        router.push('/queue');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const setAdminDemo = () => {
    setEmail('admin@razorpay-recovery.ai');
    setPassword('password123');
  };

  const setOperatorDemo = () => {
    setEmail('operator@razorpay-recovery.ai');
    setPassword('password123');
  };

  return (
    <div className="min-h-screen bg-[#0b4f4a] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-2xl overflow-hidden border border-[#003733]">
        {/* Top Branding Banner */}
        <div className="bg-[#003733] text-white p-8 text-center border-b border-[#0b4f4a]">
          <div className="w-14 h-14 bg-[#C98A2B] rounded-lg mx-auto flex items-center justify-center font-headline text-2xl font-bold mb-3 shadow">
            RE
          </div>
          <h1 className="font-headline font-bold text-2xl tracking-tight">Payment Recovery Engine</h1>
          <p className="text-xs font-mono-data text-[#84bfb8] mt-1 uppercase tracking-widest">
            Razorpay AI Buildathon · Track 03
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="p-8 space-y-5 bg-white">
          {error && (
            <div className="p-3 bg-[#B23A2E]/10 border border-[#B23A2E]/30 rounded text-xs font-mono-data text-[#B23A2E]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
              Work Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@razorpay-recovery.ai"
              className="w-full px-4 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded text-sm text-[#1a1c1c] font-mono-data focus:outline-none focus:border-[#0b4f4a]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1a1c1c] uppercase tracking-wider mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-2.5 bg-[#f3f3f4] border border-[#D8DEE2] rounded text-sm text-[#1a1c1c] font-mono-data focus:outline-none focus:border-[#0b4f4a]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#0b4f4a] hover:bg-[#003733] text-white font-headline font-semibold text-sm rounded shadow transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <span>Sign In to Console</span>
                <span className="material-symbols-outlined text-base">arrow_forward</span>
              </>
            )}
          </button>

          {/* Hackathon Quick Fill Preset Buttons */}
          <div className="pt-4 border-t border-[#D8DEE2] space-y-2">
            <span className="text-[11px] text-[#94A3B8] font-mono-data uppercase block text-center">
              Quick Fill Demo Role Credentials
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={setAdminDemo}
                className="py-1.5 px-3 bg-[#f3f3f4] hover:bg-[#e8e8e8] text-xs font-mono-data text-[#0b4f4a] border border-[#D8DEE2] rounded transition-colors"
              >
                Admin Persona
              </button>
              <button
                type="button"
                onClick={setOperatorDemo}
                className="py-1.5 px-3 bg-[#f3f3f4] hover:bg-[#e8e8e8] text-xs font-mono-data text-[#C98A2B] border border-[#D8DEE2] rounded transition-colors"
              >
                Operator Persona
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
