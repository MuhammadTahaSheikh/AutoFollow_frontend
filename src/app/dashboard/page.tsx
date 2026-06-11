'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, canManageMembers, Lead, LeadStats, LeadStatus } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { CSV_IMPORT_TEMPLATE, parseLeadsCsv } from '@/lib/csvImport';
import LeadForm from '@/components/LeadForm';
import LeadModal from '@/components/LeadModal';
import LeadRowActions from '@/components/LeadRowActions';

const STATUS_COLORS: Record<LeadStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-red-100 text-red-700',
};

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function formatStatus(status: LeadStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

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
  const [importing, setImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleDownloadTemplate = () => {
    const blob = new Blob([CSV_IMPORT_TEMPLATE], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'leads-import-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setImportMessage(null);

    try {
      const text = await file.text();
      const { leads: parsedLeads, errors: parseErrors } = parseLeadsCsv(text);

      if (parsedLeads.length === 0) {
        setImportMessage({
          type: 'error',
          text: parseErrors.join(' ') || 'No valid leads found in the CSV.',
        });
        return;
      }

      setImporting(true);
      const result = await api.leads.import(parsedLeads);
      const messages = [
        `Imported ${result.imported} lead${result.imported === 1 ? '' : 's'}.`,
        ...(result.skipped > 0 ? [`Skipped ${result.skipped} duplicate${result.skipped === 1 ? '' : 's'}.`] : []),
        ...(result.failed > 0 ? [`${result.failed} row(s) failed.`] : []),
        ...parseErrors,
        ...result.errors,
      ];

      setImportMessage({
        type: result.imported > 0 || result.skipped > 0 ? 'success' : 'error',
        text: messages.join(' '),
      });

      if (result.imported > 0) {
        await fetchData();
      }
    } catch (err) {
      setImportMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to import CSV.',
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-[1400px]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leads</h1>
          <p className="text-slate-500 mt-1">Manage and follow up with your leads</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-50 transition-colors"
            >
              Template
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="px-3 py-1.5 text-sm font-medium text-slate-600 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import CSV'}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={handleCsvImport}
          />
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Add Lead
          </button>
        </div>
      </div>

      {importMessage && (
        <div
          className={`mb-6 flex items-start gap-3 p-4 rounded-xl text-sm border ${
            importMessage.type === 'success'
              ? 'bg-green-50 text-green-800 border-green-100'
              : 'bg-red-50 text-red-700 border-red-100'
          }`}
        >
          <span className="mt-0.5">{importMessage.type === 'success' ? '✓' : '!'}</span>
          <span>{importMessage.text}</span>
        </div>
      )}

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Total', value: stats.total, color: 'text-slate-900', dot: 'bg-slate-400' },
            { label: 'New', value: stats.new, color: 'text-blue-600', dot: 'bg-blue-500' },
            { label: 'Contacted', value: stats.contacted, color: 'text-amber-600', dot: 'bg-amber-500' },
            { label: 'Qualified', value: stats.qualified, color: 'text-purple-600', dot: 'bg-purple-500' },
            { label: 'Converted', value: stats.converted, color: 'text-green-600', dot: 'bg-green-500' },
            { label: 'Lost', value: stats.lost, color: 'text-red-600', dot: 'bg-red-500' },
          ].map((s) => (
            <div key={s.label} className="card p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                <p className="text-sm font-medium text-slate-500">{s.label}</p>
              </div>
              <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between bg-white">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.75}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                className="input-field pl-9"
                placeholder="Search by name, email, or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="input-field sm:max-w-[180px]"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All statuses</option>
              {(['new', 'contacted', 'qualified', 'converted', 'lost'] as LeadStatus[]).map((s) => (
                <option key={s} value={s}>{formatStatus(s)}</option>
              ))}
            </select>
          </div>
          {!loading && (
            <p className="text-sm text-slate-500 shrink-0">
              {leads.length} lead{leads.length === 1 ? '' : 's'}
            </p>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center gap-2 text-slate-400">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading leads...
            </div>
          </div>
        ) : leads.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center text-xl">
              👥
            </div>
            <p className="font-medium text-slate-700">No leads found</p>
            <p className="text-sm text-slate-500 mt-1 mb-4">
              {search || statusFilter
                ? 'Try adjusting your search or filters.'
                : 'Add your first lead or import a CSV to get started.'}
            </p>
            {!search && !statusFilter && (
              <button onClick={() => setShowForm(true)} className="btn-primary">
                + Add Lead
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="table-header">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  {isManager && <th className="px-4 py-3">Assigned to</th>}
                  <th className="px-4 py-3 text-right w-[140px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="table-row">
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/dashboard/leads/${lead.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-50 text-brand-700 text-xs font-semibold shrink-0">
                          {getInitials(lead.name)}
                        </span>
                        <span className="font-medium text-slate-900 group-hover:text-brand-600 transition-colors">
                          {lead.name}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 text-sm">{lead.email}</td>
                    <td className="px-4 py-3.5 text-slate-600 text-sm whitespace-nowrap">
                      {lead.phone || <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium capitalize">
                        {lead.source}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[lead.status]}`}>
                        {formatStatus(lead.status)}
                      </span>
                    </td>
                    {isManager && (
                      <td className="px-4 py-3.5 text-slate-600 text-sm max-w-[180px] truncate">
                        {lead.assignees && lead.assignees.length > 0
                          ? lead.assignees.map((a) => a.name).join(', ')
                          : <span className="text-slate-400">Unassigned</span>}
                      </td>
                    )}
                    <td className="px-4 py-3.5 text-right">
                      <LeadRowActions
                        leadId={lead.id}
                        onAiFollowUp={() => setSelectedLead(lead)}
                        onEdit={() => setEditingLead(lead)}
                        onDelete={() => handleDelete(lead.id)}
                        canDelete={isManager}
                      />
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
