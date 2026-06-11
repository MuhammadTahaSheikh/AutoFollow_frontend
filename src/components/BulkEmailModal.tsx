'use client';

import { useState } from 'react';
import { Lead, MessageType, api } from '@/lib/api';

interface BulkEmailModalProps {
  leads: Lead[];
  onClose: () => void;
  onComplete: () => void;
}

const MESSAGE_TYPES: { value: MessageType; label: string }[] = [
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'sales', label: 'Sales' },
  { value: 're_engagement', label: 'Re-engagement' },
];

function ButtonSpinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

function applyNameTemplate(template: string, name: string) {
  return template.replace(/\{name\}/gi, name);
}

export default function BulkEmailModal({ leads, onClose, onComplete }: BulkEmailModalProps) {
  const [messageType, setMessageType] = useState<MessageType>('follow_up');
  const [customInstructions, setCustomInstructions] = useState('');
  const [subjectTemplate, setSubjectTemplate] = useState('Following up - {name}');
  const [messages, setMessages] = useState<Record<number, string>>({});
  const [generating, setGenerating] = useState(false);
  const [generateProgress, setGenerateProgress] = useState({ current: 0, total: 0 });
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState({ current: 0, total: 0 });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const generatedCount = Object.keys(messages).length;
  const allGenerated = generatedCount === leads.length;

  const generateAll = async () => {
    setGenerating(true);
    setErrorMessage('');
    setStatusMessage('');
    setGenerateProgress({ current: 0, total: leads.length });

    const nextMessages: Record<number, string> = {};

    try {
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        const result = await api.ai.generate(lead.id, messageType, customInstructions || undefined);
        nextMessages[lead.id] = result.content;
        setMessages({ ...nextMessages });
        setGenerateProgress({ current: i + 1, total: leads.length });
      }
      setStatusMessage(`Generated personalized messages for ${leads.length} lead${leads.length === 1 ? '' : 's'}.`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const sendAll = async () => {
    if (!allGenerated || sending) return;

    setSending(true);
    setErrorMessage('');
    setStatusMessage('');
    setSendProgress({ current: 0, total: leads.length });

    let sent = 0;
    const failures: string[] = [];

    try {
      for (let i = 0; i < leads.length; i++) {
        const lead = leads[i];
        const body = messages[lead.id];
        try {
          await api.emails.send({
            leadId: lead.id,
            subject: applyNameTemplate(subjectTemplate, lead.name),
            body,
          });
          sent++;
        } catch (err) {
          failures.push(`${lead.name}: ${err instanceof Error ? err.message : 'Failed'}`);
        }
        setSendProgress({ current: i + 1, total: leads.length });
      }

      if (failures.length === 0) {
        onComplete();
        onClose();
        return;
      }

      setErrorMessage(
        `Sent ${sent} of ${leads.length}. ${failures.slice(0, 3).join(' ')}${failures.length > 3 ? ` (+${failures.length - 3} more)` : ''}`
      );
      if (sent > 0) onComplete();
    } finally {
      setSending(false);
    }
  };

  const busy = generating || sending;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Send email to {leads.length} leads</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              {leads.map((l) => l.name).slice(0, 3).join(', ')}
              {leads.length > 3 ? ` +${leads.length - 3} more` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} disabled={busy} className="text-slate-400 hover:text-slate-600 text-xl">
            &times;
          </button>
        </div>

        <div className="p-6 space-y-4">
          {statusMessage && (
            <div className="p-3 bg-blue-50 text-blue-700 text-sm rounded-lg">{statusMessage}</div>
          )}
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{errorMessage}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Message Type</label>
            <select
              className="input-field"
              value={messageType}
              onChange={(e) => setMessageType(e.target.value as MessageType)}
              disabled={busy}
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
              disabled={busy}
              placeholder="Applied to each lead's AI message..."
            />
          </div>

          <button
            type="button"
            onClick={generateAll}
            disabled={busy}
            className="btn-primary w-full inline-flex items-center justify-center gap-2"
          >
            {generating ? (
              <>
                <ButtonSpinner />
                Generating {generateProgress.current}/{generateProgress.total}...
              </>
            ) : (
              `Generate AI messages for all (${leads.length})`
            )}
          </button>

          {generatedCount > 0 && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Subject <span className="text-slate-400 font-normal">(use {'{name}'} for each lead)</span>
                </label>
                <input
                  className="input-field"
                  value={subjectTemplate}
                  onChange={(e) => setSubjectTemplate(e.target.value)}
                  disabled={busy}
                />
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {leads.map((lead) => (
                  <div key={lead.id} className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-sm font-medium text-slate-700 mb-1">{lead.name}</p>
                    {messages[lead.id] ? (
                      <textarea
                        className="input-field min-h-[100px] text-sm whitespace-pre-wrap font-normal"
                        value={messages[lead.id]}
                        onChange={(e) =>
                          setMessages((prev) => ({ ...prev, [lead.id]: e.target.value }))
                        }
                        disabled={busy}
                      />
                    ) : (
                      <p className="text-sm text-slate-400">Not generated yet</p>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={sendAll}
                disabled={!allGenerated || busy}
                className="btn-primary w-full inline-flex items-center justify-center gap-2"
              >
                {sending ? (
                  <>
                    <ButtonSpinner />
                    Sending {sendProgress.current}/{sendProgress.total}...
                  </>
                ) : (
                  `Send ${leads.length} email${leads.length === 1 ? '' : 's'} now`
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
