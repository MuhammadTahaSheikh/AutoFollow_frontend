'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, FollowUpSequence, FollowUpStepInput } from '@/lib/api';

const EMPTY_STEP: FollowUpStepInput = {
  delay_hours: 1,
  subject: '',
  message_template: '',
};

export default function SequencesPage() {
  const [sequences, setSequences] = useState<FollowUpSequence[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FollowUpSequence | null>(null);
  const [name, setName] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [steps, setSteps] = useState<FollowUpStepInput[]>([{ ...EMPTY_STEP }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchSequences = useCallback(async () => {
    try {
      const { sequences: data } = await api.sequences.list();
      setSequences(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSequences();
  }, [fetchSequences]);

  const resetForm = () => {
    setName('');
    setIsActive(true);
    setSteps([{ ...EMPTY_STEP }]);
    setEditing(null);
    setShowForm(false);
    setError('');
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (seq: FollowUpSequence) => {
    setEditing(seq);
    setName(seq.name);
    setIsActive(Boolean(seq.is_active));
    setSteps(
      seq.steps.length > 0
        ? seq.steps.map((s) => ({
            step_number: s.step_number,
            delay_hours: s.delay_hours,
            subject: s.subject,
            message_template: s.message_template,
          }))
        : [{ ...EMPTY_STEP }]
    );
    setShowForm(true);
    setError('');
  };

  const addStep = () => {
    setSteps((prev) => [...prev, { ...EMPTY_STEP, delay_hours: (prev.length + 1) * 24 }]);
  };

  const removeStep = (index: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: keyof FollowUpStepInput, value: string | number) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Sequence name is required');
      return;
    }
    if (steps.some((s) => !s.subject.trim() || !s.message_template.trim())) {
      setError('All steps need a subject and message');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        name: name.trim(),
        is_active: isActive,
        steps: steps.map((s, i) => ({ ...s, step_number: i + 1 })),
      };

      if (editing) {
        await api.sequences.update(editing.id, payload);
      } else {
        await api.sequences.create(payload);
      }
      resetForm();
      fetchSequences();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save sequence');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this sequence? Existing scheduled follow-ups will not be cancelled.')) return;
    await api.sequences.delete(id);
    fetchSequences();
  };

  const toggleActive = async (seq: FollowUpSequence) => {
    await api.sequences.update(seq.id, { is_active: !seq.is_active });
    fetchSequences();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Follow-Up Sequences</h1>
          <p className="text-slate-500">
            Automate multi-step email follow-ups for new leads
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          + New Sequence
        </button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-slate-400">Loading sequences...</div>
      ) : sequences.length === 0 ? (
        <div className="card p-8 text-center text-slate-500">
          No sequences yet. Create one to automatically follow up with new leads.
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map((seq) => (
            <div key={seq.id} className="card p-6">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-semibold">{seq.name}</h2>
                    <span
                      className={`text-xs px-2 py-1 rounded-full ${
                        seq.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {seq.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">
                    {seq.steps.length} step{seq.steps.length !== 1 ? 's' : ''}
                    {seq.is_active && ' · Applied to new leads automatically'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleActive(seq)}
                    className="text-sm text-slate-600 hover:underline"
                  >
                    {seq.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => openEdit(seq)}
                    className="text-sm text-brand-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(seq.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
              {seq.steps.length > 0 && (
                <div className="mt-4 space-y-2">
                  {seq.steps.map((step) => (
                    <div
                      key={step.id}
                      className="flex items-center gap-4 text-sm bg-slate-50 rounded-lg px-4 py-2"
                    >
                      <span className="font-medium text-brand-600 w-16">
                        Step {step.step_number}
                      </span>
                      <span className="text-slate-500 w-24">{step.delay_hours}h delay</span>
                      <span className="text-slate-700 truncate">{step.subject}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">
              {editing ? 'Edit Sequence' : 'New Follow-Up Sequence'}
            </h2>

            {error && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input
                  className="input-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. New Lead Welcome Series"
                />
              </div>

              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                Active — automatically apply to new leads
              </label>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-slate-700">Steps</label>
                  <button onClick={addStep} className="text-sm text-brand-600 hover:underline">
                    + Add Step
                  </button>
                </div>
                <div className="space-y-4">
                  {steps.map((step, index) => (
                    <div key={index} className="border border-slate-200 rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-slate-700">
                          Step {index + 1}
                        </span>
                        {steps.length > 1 && (
                          <button
                            onClick={() => removeStep(index)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">
                          Delay (hours from lead creation)
                        </label>
                        <input
                          type="number"
                          min={1}
                          className="input-field"
                          value={step.delay_hours}
                          onChange={(e) =>
                            updateStep(index, 'delay_hours', parseInt(e.target.value, 10) || 1)
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Subject</label>
                        <input
                          className="input-field"
                          value={step.subject}
                          onChange={(e) => updateStep(index, 'subject', e.target.value)}
                          placeholder="Email subject line"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Message</label>
                        <textarea
                          className="input-field min-h-[100px]"
                          value={step.message_template}
                          onChange={(e) => updateStep(index, 'message_template', e.target.value)}
                          placeholder="Hi {{name}}, ..."
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : editing ? 'Update Sequence' : 'Create Sequence'}
              </button>
              <button onClick={resetForm} className="btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
