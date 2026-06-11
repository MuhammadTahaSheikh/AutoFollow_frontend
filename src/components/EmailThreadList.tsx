'use client';

import { EmailSchedule } from '@/lib/api';
import { EmailThread, stripQuotedReplyText } from '@/lib/emailThreads';

const STATUS_STYLES: Record<EmailSchedule['status'], string> = {
  pending: 'bg-amber-100 text-amber-700',
  sending: 'bg-blue-100 text-blue-700',
  sent: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

interface EmailThreadListProps {
  threads: EmailThread[];
  onCancel?: (scheduleId: number) => void;
}

export default function EmailThreadList({ threads, onCancel }: EmailThreadListProps) {
  if (threads.length === 0) {
    return <div className="text-sm text-slate-500">No email threads yet.</div>;
  }

  return (
    <div className="space-y-4">
      {threads.map((thread, index) => (
        <div
          key={`${thread.schedule?.id || 'inbound'}-${index}`}
          className="rounded-xl border border-slate-200 bg-white overflow-hidden"
        >
          {thread.schedule ? (
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
                      Outbound
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[thread.schedule.status]}`}
                    >
                      {thread.schedule.status}
                    </span>
                  </div>
                            <p className="font-medium text-slate-900">{thread.schedule.subject}</p>
                            {thread.schedule.from_email && (
                              <p className="text-xs text-slate-400 mt-1">
                                From {thread.schedule.from_email}
                              </p>
                            )}
                            <p className="text-sm text-slate-500 mt-2 line-clamp-3">{thread.schedule.body}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">
                    {thread.schedule.sent_at
                      ? `Sent ${formatDateTime(thread.schedule.sent_at)}`
                      : `Scheduled ${formatDateTime(thread.schedule.scheduled_at)}`}
                  </p>
                  {thread.schedule.status === 'pending' && onCancel && (
                    <button
                      type="button"
                      onClick={() => onCancel(thread.schedule!.id)}
                      className="text-xs text-red-600 hover:underline mt-2"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Inbound only
              </span>
              <p className="text-sm font-medium text-slate-700 mt-1">{thread.label}</p>
            </div>
          )}

          {thread.replies.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {thread.replies.map((reply) => (
                <div key={reply.id} className="p-4 bg-green-50/40">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-green-700">
                        Reply
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        {reply.from_name || reply.from_email}
                      </span>
                    </div>
                    <time className="text-xs text-slate-400 shrink-0">
                      {formatDateTime(reply.received_at)}
                    </time>
                  </div>
                  <p className="text-sm font-medium text-slate-700 mb-1">{reply.subject}</p>
                  <p className="text-sm text-slate-600 whitespace-pre-wrap">
                    {stripQuotedReplyText(reply.body_text) || reply.body_text}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 text-sm text-slate-400">No replies yet for this email.</div>
          )}
        </div>
      ))}
    </div>
  );
}
