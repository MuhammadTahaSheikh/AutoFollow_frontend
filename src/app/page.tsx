'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import Logo from '@/components/Logo';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Logo size="sm" variant="full" textClassName="text-lg" />
          <div className="flex gap-3">
            <Link href="/login" className="btn-secondary">Log in</Link>
            <Link href="/register" className="btn-primary">Get started</Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center">
        <div className="max-w-6xl mx-auto px-6 py-20 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900">
              Turn leads into customers with AI follow-ups
            </h1>
            <p className="mt-6 text-lg text-slate-600 leading-relaxed">
              Manage your leads, generate personalized follow-up messages with AI,
              and automate email outreach — all in one dashboard.
            </p>
            <div className="mt-8 flex gap-4">
              <Link href="/register" className="btn-primary px-6 py-3 text-base">
                Start free
              </Link>
              <Link href="/login" className="btn-secondary px-6 py-3 text-base">
                Sign in
              </Link>
            </div>
          </div>

          <div className="card p-6 space-y-4">
            <div className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg">
              <div className="w-10 h-10 bg-brand-600 rounded-full flex items-center justify-center text-white font-medium">JD</div>
              <div>
                <p className="font-medium">John Doe</p>
                <p className="text-sm text-slate-500">New lead · Website</p>
              </div>
              <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">AI Ready</span>
            </div>
            <div className="p-4 bg-slate-50 rounded-lg text-sm text-slate-700 leading-relaxed">
              Hi John, thanks for reaching out! I wanted to follow up on your inquiry about our services.
              Would you be available for a quick 15-minute call this week to discuss your needs?
            </div>
            <div className="flex gap-2 text-xs text-slate-500">
              <span className="bg-slate-100 px-2 py-1 rounded">Follow-up</span>
              <span className="bg-slate-100 px-2 py-1 rounded">Scheduled: 2 days</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
