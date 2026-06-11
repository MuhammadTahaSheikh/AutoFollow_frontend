'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, EmailSchedule, EmailReply } from '@/lib/api';
import { buildLeadConversations } from '@/lib/emailThreads';
import EmailConversations from '@/components/EmailConversations';

export default function EmailsPage() {
  const [schedules, setSchedules] = useState<EmailSchedule[]>([]);
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'conversations' | 'outbound'>('conversations');

  const conversations = useMemo(
    () => buildLeadConversations(schedules, replies),
    [schedules, replies]
  );

  const totalReplies = replies.length;
  const pendingCount = schedules.filter((schedule) => schedule.status === 'pending').length;

  const fetchEmails = async () => {
    try {
      const [schedulesRes, repliesRes] = await Promise.all([
        api.emails.list(),
        api.emails.replies(),
      ]);
      setSchedules(schedulesRes.schedules);
      setReplies(repliesRes.replies);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmails();
  }, []);

  const handleCancel = async (id: number) => {
    if (!confirm('Cancel this scheduled email?')) return;
    await api.emails.cancel(id);
    fetchEmails();
  };

  return (
    <div className="max-w-[1200px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Email Automation</h1>
          <p className="text-slate-500 mt-1">
            Track conversations with leads — outbound from your connected inbox, replies linked to each email
          </p>
        </div>
        {!loading && (schedules.length > 0 || replies.length > 0) && (
          <div className="flex items-center gap-3 text-sm">
            <span className="px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600">
              {schedules.length} outbound
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-green-50 text-green-700">
              {totalReplies} repl{totalReplies === 1 ? 'y' : 'ies'}
            </span>
            {pendingCount > 0 && (
              <span className="px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700">
                {pendingCount} pending
              </span>
            )}
          </div>
        )}
      </div>

      {!loading && (schedules.length > 0 || replies.length > 0) && (
        <div className="flex gap-1 p-1 mb-6 bg-slate-100 rounded-lg w-fit">
          <button
            type="button"
            onClick={() => setView('conversations')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              view === 'conversations'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Conversations
          </button>
          <button
            type="button"
            onClick={() => setView('outbound')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              view === 'outbound'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Outbound queue
          </button>
        </div>
      )}

      {loading ? (
        <div className="card p-12 text-center text-slate-400">Loading emails...</div>
      ) : schedules.length === 0 && replies.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-xl">
            ✉️
          </div>
          <p className="font-medium text-slate-700">No emails yet</p>
          <p className="text-sm text-slate-500 mt-1">
            Generate an AI message from a lead and schedule or send it.
          </p>
        </div>
      ) : view === 'conversations' ? (
        <EmailConversations conversations={conversations} onCancel={handleCancel} />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Scheduled</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((schedule) => {
                  const replyCount = replies.filter(
                    (reply) =>
                      reply.lead_id === schedule.lead_id &&
                      reply.subject.toLowerCase().includes(schedule.subject.toLowerCase().replace(/^(re|fwd|fw):\s*/i, ''))
                  ).length;

                  return (
                    <tr key={schedule.id} className="table-row">
                      <td className="px-4 py-3.5">
                        <p className="font-medium text-slate-900">{schedule.lead_name}</p>
                        <p className="text-xs text-slate-500">{schedule.lead_email}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-slate-700 max-w-xs truncate">{schedule.subject}</p>
                        {replyCount > 0 && (
                          <span className="text-xs text-green-600">{replyCount} repl{replyCount === 1 ? 'y' : 'ies'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                        {new Date(schedule.scheduled_at).toLocaleString()}
                        {schedule.sent_at && (
                          <p className="text-xs text-green-600">
                            Sent: {new Date(schedule.sent_at).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                            schedule.status === 'pending'
                              ? 'bg-amber-100 text-amber-700'
                              : schedule.status === 'sent'
                                ? 'bg-green-100 text-green-700'
                                : schedule.status === 'failed'
                                  ? 'bg-red-100 text-red-700'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {schedule.status}
                        </span>
                        {schedule.error_message && (
                          <p className="text-xs text-red-500 mt-1">{schedule.error_message}</p>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {schedule.status === 'pending' && (
                          <button
                            onClick={() => handleCancel(schedule.id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
