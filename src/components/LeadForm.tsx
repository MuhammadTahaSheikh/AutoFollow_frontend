'use client';

import { useState } from 'react';
import { Lead, LeadStatus } from '@/lib/api';

interface LeadFormProps {
  initial?: Partial<Lead>;
  onSubmit: (data: Partial<Lead>) => Promise<void>;
  onCancel: () => void;
}

const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'];

export default function LeadForm({ initial, onSubmit, onCancel }: LeadFormProps) {
  const [name, setName] = useState(initial?.name || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [source, setSource] = useState(initial?.source || 'manual');
  const [status, setStatus] = useState<LeadStatus>(initial?.status || 'new');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({ name, email, phone, source, status, notes });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lead');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Name *</label>
          <input className="input-field" value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
          <input type="email" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input className="input-field" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Source</label>
          <input className="input-field" value={source} onChange={(e) => setSource(e.target.value)} placeholder="website, referral..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
          <select className="input-field" value={status} onChange={(e) => setStatus(e.target.value as LeadStatus)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
        <textarea className="input-field" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : initial?.id ? 'Update Lead' : 'Create Lead'}
        </button>
      </div>
    </form>
  );
}
