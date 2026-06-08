'use client';

import Link from 'next/link';
import { EmailReply } from '@/lib/api';

interface EmailRepliesListProps {
  replies: EmailReply[];
  showLeadLink?: boolean;
}

export default function EmailRepliesList({ replies, showLeadLink = false }: EmailRepliesListProps) {
  if (replies.length === 0) return null;

  return (
    <div className="space-y-3">
      {replies.map((reply) => (
        <div key={reply.id} className="border border-green-100 bg-green-50/50 rounded-lg p-4">
          <div className="flex items-start justify-between gap-4 mb-2">
            <div>
              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 mr-2">
                Inbound
              </span>
              <span className="font-medium text-slate-900">{reply.subject}</span>
            </div>
            <time className="text-xs text-slate-400 shrink-0">
              {new Date(reply.received_at).toLocaleString()}
            </time>
          </div>
          <p className="text-xs text-slate-500 mb-2">
            From {reply.from_name || reply.from_email}
            {showLeadLink && reply.lead_id && (
              <>
                {' · '}
                <Link
                  href={`/dashboard/leads/${reply.lead_id}`}
                  className="text-brand-600 hover:underline"
                >
                  {reply.lead_name || 'View lead'}
                </Link>
              </>
            )}
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">{reply.body_text}</p>
        </div>
      ))}
    </div>
  );
}
