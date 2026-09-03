'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyAdminRole = async () => {
      try {
        const supabase = getSupabaseBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.push('/login');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile?.role === 'operator') {
          router.push('/queue');
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error('[AdminLayout] Auth verification error:', err);
        setLoading(false);
      }
    };

    verifyAdminRole();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f9f9] text-[#0b4f4a] font-mono-data text-xs">
        Verifying Admin Security Privileges...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#f9f9f9]">
      <Sidebar role="admin" />
      <div className="flex-1 flex flex-col min-w-0">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
