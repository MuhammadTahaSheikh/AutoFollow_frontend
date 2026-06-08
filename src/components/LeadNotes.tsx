'use client';

import { useState } from 'react';
import { api, LeadNote } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface LeadNotesProps {
  leadId: number;
  notes: LeadNote[];
  onUpdate: () => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LeadNotes({ leadId, notes, onUpdate }: LeadNotesProps) {
  const { user } = useAuth();
  const [newNote, setNewNote] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!newNote.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.notes.create({ leadId, note: newNote.trim() });
      setNewNote('');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editText.trim() || saving) return;
    setSaving(true);
    setError('');
    try {
      await api.notes.update(id, editText.trim());
      setEditingId(null);
      setEditText('');
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this note?')) return;
    setError('');
    try {
      await api.notes.delete(id);
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Add a note</label>
        <textarea
          className="input-field min-h-[100px]"
          placeholder="Write a note after a call or meeting..."
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={handleCreate}
            disabled={!newNote.trim() || saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Add Note'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}

      {notes.length === 0 ? (
        <p className="text-slate-500 text-sm text-center py-4">No notes yet.</p>
      ) : (
        <div className="space-y-4">
          {notes.map((note) => (
            <div key={note.id} className="card p-4">
              {editingId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    className="input-field min-h-[80px]"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleUpdate(note.id)}
                      disabled={saving}
                      className="btn-primary text-sm"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setEditingId(null); setEditText(''); }}
                      className="btn-secondary text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-slate-800 whitespace-pre-wrap">{note.note}</p>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">{note.author_name || 'Unknown'}</span>
                      {' · '}
                      {formatDate(note.created_at)}
                      {note.updated_at !== note.created_at && ' (edited)'}
                    </div>
                    {user?.id === note.user_id && (
                      <div className="flex gap-3">
                        <button
                          onClick={() => { setEditingId(note.id); setEditText(note.note); }}
                          className="text-xs text-brand-600 hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(note.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
