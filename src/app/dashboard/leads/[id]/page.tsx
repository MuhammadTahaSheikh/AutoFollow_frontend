'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  api,
  Activity,
  AITemplate,
  canManageMembers,
  EmailSchedule,
  EmailReply,
  Lead,
  LeadNote,
  LeadStatus,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';
import ActivityTimeline from '@/components/ActivityTimeline';
import LeadNotes from '@/components/LeadNotes';
import LeadForm from '@/components/LeadForm';
import LeadModal from '@/components/LeadModal';
import EmailRepliesList from '@/components/EmailRepliesList';

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

type Tab = 'overview' | 'activity' | 'notes' | 'emails' | 'ai';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'activity', label: 'Activity' },
  { id: 'notes', label: 'Notes' },
  { id: 'emails', label: 'Emails' },
  { id: 'ai', label: 'AI Messages' },
];

const EMAIL_STATUS_COLORS: Record<EmailSchedule['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const leadId = parseInt(params.id as string, 10);
  const isManager = canManageMembers(user?.role);

  const [tab, setTab] = useState<Tab>('overview');
  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [notes, setNotes] = useState<LeadNote[]>([]);
  const [emails, setEmails] = useState<EmailSchedule[]>([]);
  const [emailReplies, setEmailReplies] = useState<EmailReply[]>([]);
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [tabLoading, setTabLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);

  const fetchLead = useCallback(async () => {
    try {
      const [leadRes, repliesRes] = await Promise.allSettled([
        api.leads.get(leadId),
        api.emails.replies(leadId),
      ]);
      if (leadRes.status !== 'fulfilled') {
        router.replace('/dashboard');
        return;
      }
      setLead(leadRes.value.lead);
      if (repliesRes.status === 'fulfilled') {
        setEmailReplies(repliesRes.value.replies);
      }
    } catch {
      router.replace('/dashboard');
    } finally {
      setLoading(false);
    }
  }, [leadId, router]);

  const fetchTabData = useCallback(async (activeTab: Tab) => {
    setTabLoading(true);
    try {
      if (activeTab === 'activity') {
        const { activities: data } = await api.activities.forLead(leadId);
        setActivities(data);
      } else if (activeTab === 'notes') {
        const { notes: data } = await api.notes.list(leadId);
        setNotes(data);
      } else if (activeTab === 'emails') {
        const [schedulesRes, repliesRes] = await Promise.allSettled([
          api.emails.list(leadId),
          api.emails.replies(leadId),
        ]);
        if (schedulesRes.status === 'fulfilled') setEmails(schedulesRes.value.schedules);
        if (repliesRes.status === 'fulfilled') setEmailReplies(repliesRes.value.replies);
      } else if (activeTab === 'ai') {
        const { templates: data } = await api.ai.templates(leadId);
        setTemplates(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTabLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    if (!Number.isNaN(leadId)) fetchLead();
  }, [leadId, fetchLead]);

  useEffect(() => {
    if (lead && tab !== 'overview') fetchTabData(tab);
  }, [lead, tab, fetchTabData]);

  const refreshAll = useCallback(async () => {
    await fetchLead();
    if (tab === 'activity') {
      const { activities: data } = await api.activities.forLead(leadId);
      setActivities(data);
    } else if (tab !== 'overview') {
      await fetchTabData(tab);
    }
  }, [fetchLead, fetchTabData, tab, leadId]);

  const handleUpdate = async (data: Partial<Lead> & { assignedUserIds?: number[] }) => {
    await api.leads.update(leadId, data);
    setShowEdit(false);
    await refreshAll();
  };

  const handleDelete = async () => {
    if (!confirm('Delete this lead permanently?')) return;
    await api.leads.delete(leadId);
    router.push('/dashboard');
  };

  const handleCancelEmail = async (id: number) => {
    if (!confirm('Cancel this scheduled email?')) return;
    await api.emails.cancel(id);
    await fetchTabData('emails');
    const { activities: data } = await api.activities.forLead(leadId);
    setActivities(data);
  };

  if (loading || !lead) {
    return <div className="p-8 text-center text-slate-400">Loading lead...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <Link href="/dashboard" className="text-sm text-brand-600 hover:underline">
          ← Back to Leads
        </Link>
      </div>

      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{lead.name}</h1>
            <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[lead.status]}`}>
              {lead.status}
            </span>
          </div>
          <p className="text-slate-500 mt-1">{lead.email}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAiModal(true)} className="btn-primary">
            AI Follow-up
          </button>
          <button onClick={() => setShowEdit(true)} className="btn-secondary">
            Edit
          </button>
          {isManager && (
            <button onClick={handleDelete} className="btn-secondary text-red-600 border-red-200">
              Delete
            </button>
          )}
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
              tab === t.id
                ? 'text-brand-600 border-b-2 border-brand-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t.label}
            {t.id === 'emails' && emailReplies.length > 0 && (
              <span className="ml-1.5 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                {emailReplies.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="card p-6">
        {tab === 'overview' && (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Contact Details</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-slate-400">Email</dt>
                  <dd className="text-slate-900">{lead.email}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Phone</dt>
                  <dd className="text-slate-900">{lead.phone || '—'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Source</dt>
                  <dd className="text-slate-900 capitalize">{lead.source}</dd>
                </div>
              </dl>
            </div>
            <div>
              <h3 className="text-sm font-medium text-slate-500 mb-3">Lead Information</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs text-slate-400">Status</dt>
                  <dd>
                    <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[lead.status]}`}>
                      {lead.status}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">Created</dt>
                  <dd className="text-slate-900">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </dd>
                </div>
                {isManager && lead.assignees && (
                  <div>
                    <dt className="text-xs text-slate-400">Assigned to</dt>
                    <dd className="text-slate-900">
                      {lead.assignees.length > 0
                        ? lead.assignees.map((a) => a.name).join(', ')
                        : 'Not assigned'}
                    </dd>
                  </div>
                )}
                {lead.notes && (
                  <div>
                    <dt className="text-xs text-slate-400">Legacy notes</dt>
                    <dd className="text-slate-900 whitespace-pre-wrap">{lead.notes}</dd>
                  </div>
                )}
              </dl>
            </div>
            {emailReplies.length > 0 && (
              <div className="md:col-span-2">
                <h3 className="text-sm font-medium text-slate-500 mb-3">Latest reply</h3>
                <EmailRepliesList replies={emailReplies.slice(0, 1)} />
                {emailReplies.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setTab('emails')}
                    className="text-sm text-brand-600 hover:underline mt-2"
                  >
                    View all {emailReplies.length} replies →
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {tab === 'activity' && (
          <ActivityTimeline activities={activities} loading={tabLoading} />
        )}

        {tab === 'notes' && (
          <LeadNotes leadId={leadId} notes={notes} onUpdate={() => fetchTabData('notes')} />
        )}

        {tab === 'emails' && (
          tabLoading ? (
            <div className="p-8 text-center text-slate-400">Loading emails...</div>
          ) : emails.length === 0 && emailReplies.length === 0 ? (
            <div className="p-8 text-center text-slate-500">No emails yet.</div>
          ) : (
            <div className="space-y-8">
              {emailReplies.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Replies received</h3>
                  <EmailRepliesList replies={emailReplies} />
                </div>
              )}

              {emails.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-slate-500 mb-3">Sent &amp; scheduled</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                          <th className="px-2 py-3 font-medium">Subject</th>
                          <th className="px-2 py-3 font-medium">Scheduled</th>
                          <th className="px-2 py-3 font-medium">Status</th>
                          <th className="px-2 py-3 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {emails.map((email) => (
                          <tr key={email.id} className="border-b border-slate-50">
                            <td className="px-2 py-3 font-medium">{email.subject}</td>
                            <td className="px-2 py-3 text-sm text-slate-600">
                              {new Date(email.scheduled_at).toLocaleString()}
                            </td>
                            <td className="px-2 py-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${EMAIL_STATUS_COLORS[email.status]}`}>
                                {email.status}
                              </span>
                            </td>
                            <td className="px-2 py-3">
                              {email.status === 'pending' && (
                                <button
                                  onClick={() => handleCancelEmail(email.id)}
                                  className="text-sm text-red-600 hover:underline"
                                >
                                  Cancel
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {tab === 'ai' && (
          tabLoading ? (
            <div className="p-8 text-center text-slate-400">Loading AI messages...</div>
          ) : templates.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              No AI messages yet. Use &quot;AI Follow-up&quot; to generate one.
            </div>
          ) : (
            <div className="space-y-4">
              {templates.map((t) => (
                <div key={t.id} className="border border-slate-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-1 rounded-full bg-brand-50 text-brand-700 capitalize">
                      {t.type.replace('_', ' ')}
                    </span>
                    <time className="text-xs text-slate-400">
                      {new Date(t.created_at).toLocaleString()}
                    </time>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.content}</p>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {showEdit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Edit Lead</h2>
            <LeadForm
              initial={lead}
              onSubmit={handleUpdate}
              onCancel={() => setShowEdit(false)}
            />
          </div>
        </div>
      )}

      {showAiModal && (
        <LeadModal
          lead={lead}
          onClose={() => setShowAiModal(false)}
          onUpdate={refreshAll}
        />
      )}
    </div>
  );
}
