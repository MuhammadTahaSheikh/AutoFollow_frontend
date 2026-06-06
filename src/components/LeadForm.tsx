'use client';

import { useEffect, useState } from 'react';
import { api, canManageMembers, Lead, LeadStatus, TeamMember } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface LeadFormProps {
  initial?: Partial<Lead>;
  onSubmit: (data: Partial<Lead> & { assignedUserIds?: number[] }) => Promise<void>;
  onCancel: () => void;
}

const STATUSES: LeadStatus[] = ['new', 'contacted', 'qualified', 'converted', 'lost'];

export default function LeadForm({ initial, onSubmit, onCancel }: LeadFormProps) {
  const { user } = useAuth();
  const showAssignments = canManageMembers(user?.role);

  const [name, setName] = useState(initial?.name || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [source, setSource] = useState(initial?.source || 'manual');
  const [status, setStatus] = useState<LeadStatus>(initial?.status || 'new');
  const [notes, setNotes] = useState(initial?.notes || '');
  const [teamUsers, setTeamUsers] = useState<TeamMember[]>([]);
  const [assignedUserIds, setAssignedUserIds] = useState<number[]>(
    initial?.assignees?.filter((a) => a.role === 'user').map((a) => a.id) || []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!showAssignments) return;
    api.leads
      .assignableUsers()
      .then(({ users }) => setTeamUsers(users))
      .catch(() => setTeamUsers([]));
  }, [showAssignments]);

  const toggleAssignee = (userId: number) => {
    setAssignedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const allTeamUserIds = teamUsers.map((m) => m.id);
  const allSelected =
    teamUsers.length > 0 && allTeamUserIds.every((id) => assignedUserIds.includes(id));
  const someSelected =
    teamUsers.length > 0 &&
    allTeamUserIds.some((id) => assignedUserIds.includes(id)) &&
    !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      setAssignedUserIds([]);
    } else {
      setAssignedUserIds(allTeamUserIds);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await onSubmit({
        name,
        email,
        phone,
        source,
        status,
        notes,
        ...(showAssignments ? { assignedUserIds } : {}),
      });
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

      {showAssignments && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Visible to team members
          </label>
          <p className="text-xs text-slate-500 mb-3">
            Select which Users can see and work on this lead. Admins always see all leads.
          </p>
          {teamUsers.length === 0 ? (
            <p className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg">
              No User-role members yet. Invite users from the Members page.
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto p-3 bg-slate-50 rounded-lg">
              <label className="flex items-center gap-2 text-sm font-medium cursor-pointer pb-2 border-b border-slate-200">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={toggleSelectAll}
                  className="rounded border-slate-300"
                />
                <span>Select all</span>
              </label>
              {teamUsers.map((member) => (
                <label key={member.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={assignedUserIds.includes(member.id)}
                    onChange={() => toggleAssignee(member.id)}
                    className="rounded border-slate-300"
                  />
                  <span>{member.name}</span>
                  <span className="text-slate-400">({member.email})</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-end">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Saving...' : initial?.id ? 'Update Lead' : 'Create Lead'}
        </button>
      </div>
    </form>
  );
}
