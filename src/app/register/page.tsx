'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '@/components/Logo';
import { useAuth } from '@/lib/auth';
import { api, InvitationPreview, ROLE_LABELS } from '@/lib/api';

function RegisterForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [inviteInfo, setInviteInfo] = useState<InvitationPreview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingInvite, setCheckingInvite] = useState(!!inviteToken);
  const { register } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!inviteToken) return;

    api.auth
      .verifyInvite(inviteToken)
      .then(({ invitation }) => {
        setInviteInfo(invitation);
        setEmail(invitation.email);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Invalid invitation'))
      .finally(() => setCheckingInvite(false));
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password, {
        inviteToken: inviteToken || undefined,
        organizationName: inviteToken ? undefined : organizationName || undefined,
      });
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (checkingInvite) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-slate-400 animate-pulse">Verifying invitation...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="text-2xl font-bold">
            {inviteInfo ? 'Join your team' : 'Create your account'}
          </h1>
          <p className="text-slate-500 mt-1">
            {inviteInfo
              ? `You've been invited to ${inviteInfo.organization_name} as ${ROLE_LABELS[inviteInfo.role]}`
              : 'Start managing leads with AI'}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full name</label>
            <input
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              readOnly={!!inviteInfo}
              required
            />
          </div>
          {!inviteInfo && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Organization name <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                className="input-field"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Your company or team name"
              />
              <p className="text-xs text-slate-500 mt-1">You will be the Super Admin of this organization</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
            <input
              type="password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-xs text-slate-400 mt-1">Minimum 8 characters</p>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5">
            {loading ? 'Creating account...' : inviteInfo ? 'Accept invitation' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{' '}
          <Link href="/login" className="text-brand-600 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">Loading...</div>}>
      <RegisterForm />
    </Suspense>
  );
}
