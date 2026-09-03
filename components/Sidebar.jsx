'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase-client';

export default function Sidebar({ role = 'admin' }) {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push('/login');
  };

  const adminNav = [
    { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    { label: 'Case Management', href: '/cases', icon: 'folder_open' },
    { label: 'Policy Engine', href: '/policy', icon: 'gavel' },
    { label: 'Audit Log', href: '/audit-log', icon: 'list_alt' },
    { label: 'API Management', href: '/api-management', icon: 'key' },
    { label: 'Operator Team', href: '/operator-management', icon: 'group' },
  ];

  const operatorNav = [
    { label: 'Escalation Queue', href: '/queue', icon: 'inbox' },
    { label: 'My Audit Log', href: '/operator-audit', icon: 'history' },
  ];

  const navItems = role === 'operator' ? operatorNav : adminNav;

  return (
    <aside className="w-64 bg-[#0b4f4a] text-white flex flex-col min-h-screen border-r border-[#003733]">
      {/* Brand Header */}
      <div className="p-6 border-b border-[#003733]/50 flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-[#C98A2B] flex items-center justify-center font-headline font-bold text-white shadow-md">
          RE
        </div>
        <div>
          <h1 className="font-headline font-bold text-base tracking-wide text-white leading-tight">
            RECOVERY ENGINE
          </h1>
          <span className="font-mono-data text-[10px] text-[#84bfb8] tracking-wider uppercase">
            {role === 'operator' ? 'Operator Workspace' : 'Razorpay AI Admin'}
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-6 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#003733] text-white border-l-4 border-[#C98A2B]'
                  : 'text-[#84bfb8] hover:bg-[#003733]/50 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer / User Profile & Logout */}
      <div className="p-4 border-t border-[#003733]/50 bg-[#003733]/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#84bfb8]/20 flex items-center justify-center text-xs font-mono-data font-bold text-[#84bfb8]">
              {role === 'operator' ? 'OP' : 'AD'}
            </div>
            <div className="truncate">
              <p className="text-xs font-medium text-white truncate">
                {role === 'operator' ? 'Operator Workspace' : 'Admin User'}
              </p>
              <p className="text-[10px] font-mono-data text-[#84bfb8] capitalize">{role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-[#84bfb8] hover:text-white hover:bg-[#003733] rounded transition-colors"
          >
            <span className="material-symbols-outlined text-base">logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
