'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function OperatorLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyOperatorAuth = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('[OperatorLayout] Auth verification error:', err);
        setLoading(false);
      }
    };

    verifyOperatorAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] text-[#0b4f4a] font-mono-data text-xs">
        Loading Operator Workspace...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-[#f9f9f9]">
      <Sidebar role="operator" />
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

