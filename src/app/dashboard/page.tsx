'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, canManageMembers, Lead, LeadStats, LeadStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import LeadForm from '@/components/LeadForm';
import LeadModal from '@/components/LeadModal';

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const isManager = canManageMembers(user?.role);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<LeadStats | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [leadsRes, statsRes] = await Promise.all([
        api.leads.list({ search: search || undefined, status: statusFilter || undefined }),
        api.leads.stats(),
      ]);
      setLeads(leadsRes.leads);
      setStats(statsRes.stats);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreate = async (data: Partial<Lead> & { assignedUserIds?: number[] }) => {
    await api.leads.create(data);
    setShowForm(false);
    fetchData();
  };

  const handleUpdate = async (data: Partial<Lead> & { assignedUserIds?: number[] }) => {
    if (!editingLead) return;
    await api.leads.update(editingLead.id, data);
    setEditingLead(null);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this lead?')) return;
    await api.leads.delete(id);
    fetchData();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-slate-500">Manage and follow up with your leads</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Add Lead
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-900' },
            { label: 'New', value: stats.new, color: 'text-blue-600' },
            { label: 'Contacted', value: stats.contacted, color: 'text-yellow-600' },
            { label: 'Qualified', value: stats.qualified, color: 'text-purple-600' },
            { label: 'Converted', value: stats.converted, color: 'text-green-600' },
            { label: 'Lost', value: stats.lost, color: 'text-red-600' },
          ].map((s) => (
            <div key={s.label} className="card p-4">
              <p className="text-sm text-slate-500">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="p-4 border-b border-slate-200 flex gap-4">
          <input
            className="input-field max-w-xs"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="input-field max-w-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {(['new', 'contacted', 'qualified', 'converted', 'lost'] as LeadStatus[]).map((s) => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-400">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No leads yet. Add your first lead to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-slate-500 border-b border-slate-100">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Source</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  {isManager && <th className="px-4 py-3 font-medium">Assigned to</th>}
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.email}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.phone || '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.source}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[lead.status]}`}>
                        {lead.status}
                      </span>
                    </td>
                    {isManager && (
                      <td className="px-4 py-3 text-slate-600 text-sm">
                        {lead.assignees && lead.assignees.length > 0
                          ? lead.assignees.map((a) => a.name).join(', ')
                          : <span className="text-slate-400">Not assigned</span>}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedLead(lead)}
                          className="text-sm text-brand-600 hover:underline"
                        >
                          AI Follow-up
                        </button>
                        <button
                          onClick={() => setEditingLead(lead)}
                          className="text-sm text-slate-600 hover:underline"
                        >
                          Edit
                        </button>
                        {isManager && (
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="text-sm text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Add New Lead</h2>
            <LeadForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
          </div>
        </div>
      )}

      {editingLead && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-4">Edit Lead</h2>
            <LeadForm
              initial={editingLead}
              onSubmit={handleUpdate}
              onCancel={() => setEditingLead(null)}
            />
          </div>
        </div>
      )}

      {selectedLead && (
        <LeadModal
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdate={fetchData}
        />
      )}
    </div>
  );
}
