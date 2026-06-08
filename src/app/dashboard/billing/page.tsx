'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  api,
  OrganizationBilling,
  PlanId,
  PlanInfo,
  UsageSummary,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const atLimit = used >= limit;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className={atLimit ? 'text-red-600 font-medium' : 'text-slate-500'}>
          {used} / {limit}
        </span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${atLimit ? 'bg-red-500' : 'bg-brand-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function formatDate(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function BillingPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isSuperAdmin = user?.role === 'super_admin';

  const [plans, setPlans] = useState<PlanInfo[]>([]);
  const [billing, setBilling] = useState<OrganizationBilling | null>(null);
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<PlanId | 'portal' | 'cancel' | 'resume' | null>(null);
  const [message, setMessage] = useState('');

  const checkoutStatus = searchParams.get('checkout');

  useEffect(() => {
    if (checkoutStatus === 'success') {
      setMessage('Payment successful! Your plan will update shortly.');
    } else if (checkoutStatus === 'cancelled') {
      setMessage('Checkout was cancelled.');
    }
  }, [checkoutStatus]);

  useEffect(() => {
    Promise.all([
      api.billing.plans(),
      api.billing.usage(),
      isSuperAdmin ? api.billing.subscription().catch(() => null) : Promise.resolve(null),
    ])
      .then(([plansRes, usageRes, subRes]) => {
        setPlans(plansRes.plans);
        setUsage(usageRes.usage);
        if (subRes) setBilling(subRes.billing);
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Failed to load billing'))
      .finally(() => setLoading(false));
  }, [isSuperAdmin]);

  const refresh = async () => {
    const [usageRes, subRes] = await Promise.all([
      api.billing.usage(),
      isSuperAdmin ? api.billing.subscription() : Promise.resolve(null),
    ]);
    setUsage(usageRes.usage);
    if (subRes) setBilling(subRes.billing);
  };

  const handleUpgrade = async (plan: PlanId) => {
    if (plan === 'free') return;
    setActionLoading(plan);
    setMessage('');
    try {
      const { url } = await api.billing.checkout(plan);
      window.location.href = url;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to start checkout');
      setActionLoading(null);
    }
  };

  const handlePortal = async () => {
    setActionLoading('portal');
    setMessage('');
    try {
      const { url } = await api.billing.portal();
      window.location.href = url;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to open billing portal');
      setActionLoading(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancel your subscription at the end of the current billing period?')) return;
    setActionLoading('cancel');
    setMessage('');
    try {
      const { message: msg, billing: updated } = await api.billing.cancel();
      setBilling(updated);
      setMessage(msg);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to cancel subscription');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResume = async () => {
    setActionLoading('resume');
    setMessage('');
    try {
      const { message: msg, billing: updated } = await api.billing.resume();
      setBilling(updated);
      setMessage(msg);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to resume subscription');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return <div className="text-slate-400 animate-pulse">Loading billing...</div>;
  }

  const currentPlan = billing?.plan || usage?.plan || 'free';

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Billing & Usage</h1>
      <p className="text-slate-500 mb-8">
        Manage your subscription and monitor plan usage for your organization.
      </p>

      {message && (
        <div
          className={`p-3 text-sm rounded-lg mb-6 ${
            message.includes('successful') || message.includes('resumed')
              ? 'bg-green-50 text-green-700'
              : message.includes('cancel')
                ? 'bg-amber-50 text-amber-700'
                : 'bg-red-50 text-red-700'
          }`}
        >
          {message}
        </div>
      )}

      {usage && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Current usage</h2>
          <p className="text-sm text-slate-500 mb-6">
            Plan: <span className="font-medium text-slate-700 capitalize">{usage.plan}</span>
            {' · '}
            Period starting {formatDate(usage.period_start)}
          </p>
          <div className="grid gap-4 max-w-xl">
            <UsageBar label="AI requests" used={usage.usage.ai_requests.used} limit={usage.usage.ai_requests.limit} />
            <UsageBar label="Emails" used={usage.usage.emails.used} limit={usage.usage.emails.limit} />
            <UsageBar label="Leads" used={usage.usage.leads.used} limit={usage.usage.leads.limit} />
            <UsageBar label="Team members" used={usage.usage.team_members.used} limit={usage.usage.team_members.limit} />
            <UsageBar label="Storage (MB)" used={usage.usage.storage_mb.used} limit={usage.usage.storage_mb.limit} />
          </div>
        </div>
      )}

      {isSuperAdmin && billing?.subscription.has_stripe_subscription && (
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold mb-2">Subscription</h2>
          <p className="text-sm text-slate-600 mb-4">
            Status: <span className="capitalize font-medium">{billing.subscription.status}</span>
            {billing.subscription.current_period_end && (
              <>
                {' · '}
                Renews {formatDate(billing.subscription.current_period_end)}
              </>
            )}
            {billing.subscription.cancel_at_period_end && (
              <span className="text-amber-600"> · Cancels at period end</span>
            )}
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handlePortal}
              disabled={actionLoading !== null}
              className="btn-secondary"
            >
              {actionLoading === 'portal' ? 'Opening...' : 'Manage billing'}
            </button>
            {billing.subscription.cancel_at_period_end ? (
              <button
                type="button"
                onClick={handleResume}
                disabled={actionLoading !== null}
                className="btn-primary"
              >
                {actionLoading === 'resume' ? 'Resuming...' : 'Resume subscription'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                disabled={actionLoading !== null}
                className="text-sm text-red-600 hover:text-red-700 px-3 py-2"
              >
                {actionLoading === 'cancel' ? 'Cancelling...' : 'Cancel subscription'}
              </button>
            )}
          </div>
        </div>
      )}

      <h2 className="text-lg font-semibold mb-4">Plans</h2>
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const canUpgrade = isSuperAdmin && plan.id !== 'free' && plan.id !== currentPlan;
          const isDowngrade = plan.id === 'free' && currentPlan !== 'free';

          return (
            <div
              key={plan.id}
              className={`card p-6 flex flex-col ${isCurrent ? 'ring-2 ring-brand-500' : ''}`}
            >
              {isCurrent && (
                <span className="text-xs font-medium text-brand-700 bg-brand-50 px-2 py-1 rounded-full w-fit mb-3">
                  Current plan
                </span>
              )}
              <h3 className="text-xl font-bold">{plan.name}</h3>
              <p className="text-slate-500 text-sm mt-1 mb-4">{plan.description}</p>
              <p className="text-3xl font-bold mb-4">
                {plan.price_monthly === 0 ? (
                  'Free'
                ) : (
                  <>
                    ${plan.price_monthly}
                    <span className="text-base font-normal text-slate-500">/mo</span>
                  </>
                )}
              </p>
              <ul className="space-y-2 text-sm text-slate-600 flex-1 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-brand-500">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
              {isSuperAdmin && canUpgrade && (
                <button
                  type="button"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={actionLoading !== null || !plan.stripe_price_configured}
                  className="btn-primary w-full"
                >
                  {actionLoading === plan.id
                    ? 'Redirecting...'
                    : `Upgrade to ${plan.name}`}
                </button>
              )}
              {isSuperAdmin && isDowngrade && (
                <button
                  type="button"
                  onClick={handlePortal}
                  disabled={actionLoading !== null}
                  className="btn-secondary w-full"
                >
                  Downgrade via billing portal
                </button>
              )}
              {!isSuperAdmin && isCurrent && (
                <p className="text-xs text-slate-500">Contact your super admin to change plans.</p>
              )}
            </div>
          );
        })}
      </div>

      {isSuperAdmin && checkoutStatus === 'success' && (
        <button type="button" onClick={() => refresh()} className="mt-6 text-sm text-brand-600 hover:underline">
          Refresh subscription status
        </button>
      )}
    </div>
  );
}
