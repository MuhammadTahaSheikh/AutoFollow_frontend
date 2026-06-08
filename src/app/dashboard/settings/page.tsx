'use client';

import { useEffect, useState } from 'react';
import { api, UserProfile } from '@/lib/api';

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    company_name: '',
    job_title: '',
    phone: '',
    calendar_url: '',
    services_description: '',
  });

  useEffect(() => {
    api.profile
      .get()
      .then(({ profile: p }) => {
        setProfile(p);
        setForm({
          company_name: p.company_name || '',
          job_title: p.job_title || '',
          phone: p.phone || '',
          calendar_url: p.calendar_url || '',
          services_description: p.services_description || '',
        });
      })
      .catch((err) => setMessage(err instanceof Error ? err.message : 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { profile: updated } = await api.profile.update(form);
      setProfile(updated);
      setMessage('Profile saved. AI emails will use these details.');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-slate-400 animate-pulse">Loading settings...</div>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Business Profile</h1>
      <p className="text-slate-500 mb-8">
        These details replace placeholders in AI-generated emails — your name, company, phone, and calendar link.
      </p>

      {message && (
        <div className={`p-3 text-sm rounded-lg mb-6 ${message.includes('saved') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 max-w-xl space-y-4">
        {profile && (
          <div className="pb-4 border-b border-slate-200">
            <p className="text-sm text-slate-500">Account</p>
            <p className="font-medium">{profile.name}</p>
            <p className="text-sm text-slate-500">{profile.email}</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Company name</label>
          <input
            className="input-field"
            value={form.company_name}
            onChange={(e) => setForm({ ...form, company_name: e.target.value })}
            placeholder="e.g. bestechVison"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your title</label>
          <input
            className="input-field"
            value={form.job_title}
            onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            placeholder="e.g. Sales Manager"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
          <input
            className="input-field"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="e.g. 03114315611"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Calendar link</label>
          <input
            className="input-field"
            type="url"
            value={form.calendar_url}
            onChange={(e) => setForm({ ...form, calendar_url: e.target.value })}
            placeholder="https://calendly.com/your-link"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">What you offer</label>
          <textarea
            className="input-field min-h-[100px]"
            value={form.services_description}
            onChange={(e) => setForm({ ...form, services_description: e.target.value })}
            placeholder="Brief description of your service and key benefits for leads"
          />
          <p className="text-xs text-slate-500 mt-1">
            Used in AI emails instead of generic benefits like &quot;streamline your operations&quot;
          </p>
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save profile'}
        </button>
      </form>
    </div>
  );
}
