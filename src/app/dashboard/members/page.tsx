'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  api,
  canManageMembers,
  Invitation,
  ROLE_LABELS,
  TeamMember,
  UserRole,
} from '@/lib/api';
import { useAuth } from '@/lib/auth';

const ROLE_BADGE: Record<UserRole, string> = {
  super_admin: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  user: 'bg-slate-100 text-slate-700',
};

export default function MembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('user');
  const [lastInviteLink, setLastInviteLink] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'warning'>('success');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const inviteRoles: UserRole[] = isSuperAdmin ? ['admin', 'user'] : ['user'];

  const fetchData = useCallback(async () => {
    try {
      const [membersRes, invitesRes] = await Promise.all([
        api.members.list(),
        api.members.listInvitations(),
      ]);
      setMembers(membersRes.members);
      setInvitations(invitesRes.invitations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load team data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && canManageMembers(user.role)) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user, fetchData]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setMessage('');
    setMessageType('success');
    setLastInviteLink('');
    try {
      const { invitation } = await api.members.invite({ email, role });
      setLastInviteLink(invitation.invite_link);
      const text =
        invitation.email_message ||
        (invitation.email_sent
          ? `Invitation email sent to ${invitation.email}`
          : `Invitation created for ${invitation.email}`);
      setMessage(text);
      setMessageType(invitation.email_sent ? 'success' : 'warning');
      setEmail('');
      setRole('user');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setMessage('Invite link copied to clipboard');
  };

  const cancelInvite = async (id: number) => {
    try {
      await api.members.cancelInvitation(id);
      setMessage('Invitation cancelled');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel invitation');
    }
  };

  const resendInvite = async (id: number, inviteEmail: string) => {
    setError('');
    setMessage('');
    try {
      const { invitation } = await api.members.resendInvitation(id);
      const text =
        invitation.email_message ||
        (invitation.email_sent
          ? `Invitation email resent to ${inviteEmail}`
          : `Could not send email to ${inviteEmail}`);
      setMessage(text);
      setMessageType(invitation.email_sent ? 'success' : 'warning');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation email');
    }
  };

  const changeRole = async (memberId: number, newRole: UserRole) => {
    try {
      await api.members.updateRole(memberId, newRole);
      setMessage('Role updated');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const removeMember = async (memberId: number, memberName: string) => {
    if (!confirm(`Remove ${memberName} from the team?`)) return;
    try {
      await api.members.remove(memberId);
      setMessage('Member removed');
      await fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  if (!user || !canManageMembers(user.role)) {
    return (
      <div className="card p-8 text-center text-slate-500">
        You do not have permission to manage team members.
      </div>
    );
  }

  if (loading) {
    return <div className="text-slate-400 animate-pulse">Loading team...</div>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Team Members</h1>
        <p className="text-slate-500 mt-1">
          Invite colleagues to {user.organization_name || 'your organization'} and manage roles
        </p>
      </div>

      {message && (
        <div className={`p-3 text-sm rounded-lg ${
          messageType === 'success' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-800'
        }`}>
          {message}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      <div className="card p-6">
        <h2 className="font-semibold mb-4">Invite a member</h2>
        <p className="text-sm text-slate-500 mb-4">
          An invitation email is sent automatically to their inbox. You can also copy the link below if needed.
        </p>
        <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            className="input-field flex-1"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <select
            className="input-field sm:w-40"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {inviteRoles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
          <button type="submit" disabled={submitting} className="btn-primary sm:w-auto">
            {submitting ? 'Sending...' : 'Send invite email'}
          </button>
        </form>
        {lastInviteLink && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-sm">
            <p className="text-slate-600 mb-2">Share this link with your teammate:</p>
            <div className="flex gap-2">
              <input className="input-field text-xs" readOnly value={lastInviteLink} />
              <button type="button" onClick={() => copyLink(lastInviteLink)} className="btn-secondary whitespace-nowrap">
                Copy link
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">Link expires in 7 days</p>
          </div>
        )}
      </div>

      {invitations.length > 0 && (
        <div className="card overflow-hidden">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold">Pending invitations</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {invitations.map((inv) => (
              <div key={inv.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                <div>
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-sm text-slate-500">
                    {ROLE_LABELS[inv.role]} · expires {new Date(inv.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => resendInvite(inv.id, inv.email)}
                    className="btn-primary text-sm"
                  >
                    Resend email
                  </button>
                  <button onClick={() => copyLink(inv.invite_link)} className="btn-secondary text-sm">
                    Copy link
                  </button>
                  <button onClick={() => cancelInvite(inv.id)} className="text-sm text-red-600 hover:underline">
                    Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200">
          <h2 className="font-semibold">Current members ({members.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="text-left p-4 font-medium">Name</th>
                <th className="text-left p-4 font-medium">Email</th>
                <th className="text-left p-4 font-medium">Role</th>
                {isSuperAdmin && <th className="text-left p-4 font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {members.map((member) => (
                <tr key={member.id}>
                  <td className="p-4 font-medium">{member.name}</td>
                  <td className="p-4 text-slate-600">{member.email}</td>
                  <td className="p-4">
                    {isSuperAdmin && member.id !== user.id ? (
                      <select
                        className="input-field py-1 text-sm w-36"
                        value={member.role}
                        onChange={(e) => changeRole(member.id, e.target.value as UserRole)}
                      >
                        {(['super_admin', 'admin', 'user'] as UserRole[]).map((r) => (
                          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${ROLE_BADGE[member.role]}`}>
                        {ROLE_LABELS[member.role]}
                      </span>
                    )}
                  </td>
                  {isSuperAdmin && (
                    <td className="p-4">
                      {member.id !== user.id && (
                        <button
                          onClick={() => removeMember(member.id, member.name)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card p-4 text-sm text-slate-600 space-y-1">
        <p><strong>Super Admin</strong> — full access, invite Admins & Users, change roles, remove members</p>
        <p><strong>Admin</strong> — manage leads, emails, AI; invite Users only</p>
        <p><strong>User</strong> — manage leads, emails, and AI messages</p>
      </div>
    </div>
  );
}
