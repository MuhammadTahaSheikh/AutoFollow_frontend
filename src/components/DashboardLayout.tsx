'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Logo from '@/components/Logo';
import { canManageMembers, ROLE_LABELS } from '@/lib/api';
import { useAuth } from '@/lib/auth';

const navItems = [
  { href: '/dashboard', label: 'Leads', icon: '👥', matchPrefix: '/dashboard/leads' },
  { href: '/dashboard/emails', label: 'Emails', icon: '✉️' },
  { href: '/dashboard/ai', label: 'AI Templates', icon: '✨' },
  { href: '/dashboard/sequences', label: 'Sequences', icon: '🔁', adminOnly: true },
  { href: '/dashboard/members', label: 'Members', icon: '🤝', adminOnly: true },
  { href: '/dashboard/billing', label: 'Billing', icon: '💳', adminOnly: true },
  { href: '/dashboard/settings', label: 'Settings', icon: '⚙️' },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden">
      <aside className="w-64 shrink-0 bg-white border-r border-slate-200 flex flex-col h-full">
        <div className="shrink-0 p-6 border-b border-slate-200">
          <Logo size="sm" />
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
          {navItems
            .filter((item) => !item.adminOnly || canManageMembers(user.role))
            .map((item) => {
            const active =
              pathname === item.href ||
              (item.matchPrefix && pathname.startsWith(item.matchPrefix));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 p-4 border-t border-slate-200">
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
            {user.role && (
              <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-brand-50 text-brand-700">
                {ROLE_LABELS[user.role]}
              </span>
            )}
          </div>
          <button
            onClick={() => { logout(); router.push('/login'); }}
            className="w-full mt-2 text-left px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 rounded-lg"
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
