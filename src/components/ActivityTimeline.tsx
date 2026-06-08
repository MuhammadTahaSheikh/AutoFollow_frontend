'use client';

import { Activity, ACTIVITY_ICONS, ACTIVITY_LABELS } from '@/lib/api';

interface ActivityTimelineProps {
  activities: Activity[];
  loading?: boolean;
}

function formatTimestamp(dateStr: string) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ActivityTimeline({ activities, loading }: ActivityTimelineProps) {
  if (loading) {
    return <div className="p-8 text-center text-slate-400">Loading activity...</div>;
  }

  if (activities.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500">
        No activity yet. Actions on this lead will appear here.
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className="w-9 h-9 rounded-full bg-brand-50 flex items-center justify-center text-base shrink-0">
              {ACTIVITY_ICONS[activity.activity_type] || '•'}
            </div>
            {index < activities.length - 1 && (
              <div className="w-px flex-1 bg-slate-200 my-1 min-h-[24px]" />
            )}
          </div>
          <div className="pb-6 flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-slate-900">
                  {ACTIVITY_LABELS[activity.activity_type] || activity.activity_type}
                </p>
                <p className="text-sm text-slate-600 mt-0.5">{activity.description}</p>
              </div>
              <time className="text-xs text-slate-400 shrink-0 whitespace-nowrap">
                {formatTimestamp(activity.created_at)}
              </time>
            </div>
            {activity.user_name && (
              <p className="text-xs text-slate-400 mt-1">by {activity.user_name}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
