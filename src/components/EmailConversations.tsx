'use client';

import Link from 'next/link';
import { useState } from 'react';
import { LeadConversation } from '@/lib/emailThreads';
import EmailThreadList from '@/components/EmailThreadList';

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

interface EmailConversationsProps {
  conversations: LeadConversation[];
  onCancel?: (scheduleId: number) => void;
}

export default function EmailConversations({ conversations, onCancel }: EmailConversationsProps) {
  const [expandedLeads, setExpandedLeads] = useState<Set<number>>(
    () => new Set(conversations.slice(0, 3).map((conversation) => conversation.leadId))
  );

  const toggleLead = (leadId: number) => {
    setExpandedLeads((current) => {
      const next = new Set(current);
      if (next.has(leadId)) next.delete(leadId);
      else next.add(leadId);
      return next;
    });
  };

  if (conversations.length === 0) return null;

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => {
        const isExpanded = expandedLeads.has(conversation.leadId);

        return (
          <div key={conversation.leadId} className="card overflow-hidden">
            <button
              type="button"
              onClick={() => toggleLead(conversation.leadId)}
              className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50/80 transition-colors"
            >
              <span className="flex items-center justify-center w-10 h-10 rounded-full bg-brand-50 text-brand-700 text-sm font-semibold shrink-0">
                {getInitials(conversation.leadName || conversation.leadEmail)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-slate-900">{conversation.leadName}</span>
                  {conversation.replyCount > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                      {conversation.replyCount} repl{conversation.replyCount === 1 ? 'y' : 'ies'}
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 truncate">{conversation.leadEmail}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs text-slate-400 hidden sm:inline">
                  {conversation.threads.length} thread{conversation.threads.length === 1 ? '' : 's'}
                </span>
                <Link
                  href={`/dashboard/leads/${conversation.leadId}`}
                  onClick={(e) => e.stopPropagation()}
                  className="text-sm text-brand-600 hover:underline"
                >
                  View lead
                </Link>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 bg-slate-50/40 p-4">
                <EmailThreadList threads={conversation.threads} onCancel={onCancel} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
