'use client';

import { useState } from 'react';
import { Lead, MessageType, api } from '@/lib/api';

interface LeadModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: () => void;
}

const MESSAGE_TYPES: { value: MessageType; label: string }[] = [
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'sales', label: 'Sales' },
  { value: 're_engagement', label: 'Re-engagement' },
];

function toDatetimeLocalValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function defaultScheduleDateTime() {
  const d = new Date();
  d.setHours(d.getHours() + 24);
  d.setMinutes(0, 0, 0);
  return toDatetimeLocalValue(d);
}

function ButtonSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

export default function LeadModal({ lead, onClose, onUpdate }: LeadModalProps) {
  const [tab, setTab] = useState<'ai' | 'email'>('ai');
  const [messageType, setMessageType] = useState<MessageType>('follow_up');
  const [generated, setGenerated] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [subject, setSubject] = useState(`Following up - ${lead.name}`);
  const [scheduledAt, setScheduledAt] = useState(defaultScheduleDateTime);
  const [emailAction, setEmailAction] = useState<'send' | 'schedule' | null>(null);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');

  const generateAI = async () => {
    setGenerating(true);
    setMessage('');
    try {
      const result = await api.ai.generate(lead.id, messageType, customInstructions || undefined);
      setGenerated(result.content);
      if (result.demo) {
        setMessage(result.demoReason || 'Demo mode — fill in Settings for real details, or add GEMINI_API_KEY for unique AI messages');
      } else if (result.provider === 'gemini') {
        setMessage('Generated with Google Gemini. Edit the message below before sending.');
      } else {
        setMessage('Generated. Edit the message below before sending.');
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const sendEmail = async (immediate: boolean) => {
    if (!generated.trim() || emailAction) return;
    setEmailAction(immediate ? 'send' : 'schedule');
    setMessage('');
    try {
      if (immediate) {
        await api.emails.send({ leadId: lead.id, subject, body: generated });
      } else {
        const when = new Date(scheduledAt);
        if (Number.isNaN(when.getTime())) {
          setMessage('Please pick a valid date and time');
          return;
        }
        if (when <= new Date()) {
          setMessage('Scheduled time must be in the future');
          return;
        }
        await api.emails.schedule({
          leadId: lead.id,
          subject,
          body: generated,
          scheduledAt: when.toISOString(),
        });
      }
      onUpdate();
      onClose();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Email action failed');
    } finally {
      setEmailAction(null);
    }
  };

  const emailBusy = emailAction !== null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{lead.name}</h2>
            <p className="text-sm text-slate-500">{lead.email}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
        </div>

        <div className="flex border-b border-slate-200">
          {(['ai', 'email'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-medium ${
                tab === t ? 'text-brand-600 border-b-2 border-brand-600' : 'text-slate-500'
              }`}
            >
              {t === 'ai' ? 'AI Message' : 'Send Email'}
            </button>
          ))}
        </div>

        <div className="p-6 space-y-4">
          {message && (
            <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">{message}</div>
          )}

          {tab === 'ai' && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message Type</label>
                <select
                  className="input-field"
                  value={messageType}
                  onChange={(e) => setMessageType(e.target.value as MessageType)}
                >
                  {MESSAGE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Extra instructions <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  className="input-field min-h-[72px] text-sm"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Mention we met on LinkedIn, offer a 15-min call this week, keep it casual..."
                />
              </div>
              <button onClick={generateAI} disabled={generating || emailBusy} className="btn-primary w-full inline-flex items-center justify-center gap-2">
                {generating ? (
                  <>
                    <ButtonSpinner />
                    Generating...
                  </>
                ) : (
                  'Generate with AI'
                )}
              </button>
              {generated && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Message <span className="text-slate-400 font-normal">(edit before sending)</span>
                  </label>
                  <textarea
                    className="input-field min-h-[220px] text-sm whitespace-pre-wrap font-normal"
                    value={generated}
                    onChange={(e) => setGenerated(e.target.value)}
                  />
                </div>
              )}
            </>
          )}

          {tab === 'email' && (
            <>
              {!generated && (
                <p className="text-sm text-slate-500">Generate an AI message first, then send or schedule it here.</p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Subject</label>
                <input className="input-field" value={subject} onChange={(e) => setSubject(e.target.value)} />
              </div>
              {generated && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Message <span className="text-slate-400 font-normal">(edit before sending)</span>
                  </label>
                  <textarea
                    className="input-field min-h-[220px] text-sm whitespace-pre-wrap font-normal"
                    value={generated}
                    onChange={(e) => setGenerated(e.target.value)}
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Schedule date &amp; time
                </label>
                <input
                  type="datetime-local"
                  className="input-field"
                  value={scheduledAt}
                  min={toDatetimeLocalValue(new Date())}
                  onChange={(e) => setScheduledAt(e.target.value)}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Email will be sent automatically at this time
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => sendEmail(true)}
                  disabled={emailBusy || generating || !generated.trim()}
                  className="btn-primary flex-1 inline-flex items-center justify-center gap-2"
                >
                  {emailAction === 'send' ? (
                    <>
                      <ButtonSpinner />
                      Sending...
                    </>
                  ) : (
                    'Send Now'
                  )}
                </button>
                <button
                  onClick={() => sendEmail(false)}
                  disabled={emailBusy || generating || !generated.trim()}
                  className="btn-secondary flex-1 inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailAction === 'schedule' ? (
                    <>
                      <ButtonSpinner />
                      Scheduling...
                    </>
                  ) : (
                    'Schedule'
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
