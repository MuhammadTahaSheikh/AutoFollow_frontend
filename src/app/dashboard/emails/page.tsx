'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, EmailSchedule, EmailReply } from '@/lib/api';
import EmailRepliesList from '@/components/EmailRepliesList';

const STATUS_STYLES: Record<EmailSchedule['status'], string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

export default function EmailsPage() {
  const [schedules, setSchedules] = useState<EmailSchedule[]>([]);
  const [replies, setReplies] = useState<EmailReply[]>([]);
  const [loading, setLoading] = useState(true);

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
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Email Automation</h1>
        <p className="text-slate-500">Track sent emails and inbound lead replies</p>
      </div>

      {!loading && replies.length > 0 && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Replies received</h2>
          <EmailRepliesList replies={replies} showLeadLink />
        </div>
      )}

      <div className="card">
        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading emails...</div>
        ) : schedules.length === 0 && replies.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No emails yet. Generate an AI message from a lead and schedule or send it.
          </div>
        ) : schedules.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No outbound emails yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-3 font-medium">Lead</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {schedules.map((s) => (
                  <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{s.lead_name}</p>
                      <p className="text-xs text-slate-500">{s.lead_email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{s.subject}</td>
                    <td className="px-4 py-3 text-slate-600 text-sm">
                      {new Date(s.scheduled_at).toLocaleString()}
                      {s.sent_at && (
                        <p className="text-xs text-green-600">Sent: {new Date(s.sent_at).toLocaleString()}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_STYLES[s.status]}`}>
                        {s.status}
                      </span>
                      {s.error_message && (
                        <p className="text-xs text-red-500 mt-1">{s.error_message}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(s.id)}
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
        )}
      </div>
    </div>
  );
}
