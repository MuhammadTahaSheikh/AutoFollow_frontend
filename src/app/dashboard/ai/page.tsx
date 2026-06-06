'use client';

import { useEffect, useState } from 'react';
import { api, AITemplate, MessageType } from '@/lib/api';

const TYPE_LABELS: Record<MessageType, string> = {
  follow_up: 'Follow-up',
  sales: 'Sales',
  re_engagement: 'Re-engagement',
};

const TYPE_COLORS: Record<MessageType, string> = {
  follow_up: 'bg-blue-100 text-blue-700',
  sales: 'bg-green-100 text-green-700',
  re_engagement: 'bg-purple-100 text-purple-700',
};

export default function AIPage() {
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.ai.templates()
      .then(({ templates }) => setTemplates(templates))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold">AI Templates</h1>
        <p className="text-slate-500">Previously generated follow-up, sales, and re-engagement messages</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading templates...</div>
      ) : templates.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No AI templates yet. Open a lead and generate a message to see it here.
        </div>
      ) : (
        <div className="space-y-4">
          {templates.map((t) => (
            <div key={t.id} className="card p-5">
              <div className="flex items-center gap-3 mb-3">
                <span className={`text-xs px-2 py-1 rounded-full ${TYPE_COLORS[t.type]}`}>
                  {TYPE_LABELS[t.type]}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(t.created_at).toLocaleString()}
                </span>
                {t.lead_id && (
                  <span className="text-xs text-slate-500">Lead #{t.lead_id}</span>
                )}
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {t.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
