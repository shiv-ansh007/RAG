import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { apiCreateNote, apiGetNotes, apiUpdateNote, apiDeleteNote } from '../api';
import type { Note } from '../api';
import { useAuth } from '../context/AuthContext';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function JournalPage() {
  const { token } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Deleting state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    apiGetNotes(token)
      .then(setNotes)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    if (!content.trim() || !token) return;
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const note = await apiCreateNote(content.trim(), token);
      setNotes((prev) => [note, ...prev]);
      setContent('');
      setSuccess('Entry saved and embedded ✓');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(note: Note) {
    setEditingId(note.id);
    setEditContent(note.content);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditContent('');
  }

  async function handleUpdate(id: string) {
    if (!editContent.trim() || !token) return;
    setUpdatingId(id);
    setError('');

    try {
      const updated = await apiUpdateNote(id, editContent.trim(), token);
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditingId(null);
      setSuccess('Entry updated & re-embedded ✓');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to update entry');
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this entry? This action cannot be undone.')) return;

    setDeletingId(id);
    setError('');

    try {
      await apiDeleteNote(id, token);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      setSuccess('Entry deleted ✓');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: unknown) {
      setError((err as Error).message ?? 'Failed to delete entry');
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <h2 className="page-title">My Journal</h2>
        <p className="page-subtitle">Write your thoughts — your AI assistant will remember them.</p>
      </div>

      {/* New Entry */}
      <div className="card">
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="entry-content">New Entry</label>
            <textarea
              id="entry-content"
              className="form-textarea"
              placeholder="What's on your mind today? Your AI assistant will be able to recall this later…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              maxLength={10000}
            />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', alignSelf: 'flex-end' }}>
              {content.length} / 10,000
            </span>
          </div>

          {error && <div className="alert alert-error">{error}</div>}
          {success && <div className="alert alert-success">{success}</div>}

          <button
            id="btn-save-entry"
            type="submit"
            className="btn btn-primary"
            disabled={saving || !content.trim()}
            style={{ alignSelf: 'flex-end' }}
          >
            {saving
              ? <><span className="spinner" /> Saving & Embedding…</>
              : '✦ Save Entry'
            }
          </button>
        </form>
      </div>

      {/* Entry List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Past Entries {notes.length > 0 && <span style={{ color: 'var(--accent-light)' }}>({notes.length})</span>}
        </h3>

        {loading && (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
            <span className="spinner" style={{ borderTopColor: 'var(--accent)' }} />
          </div>
        )}

        {!loading && notes.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📔</div>
            <p className="empty-state-text">No entries yet. Write your first one above!</p>
          </div>
        )}

        <div className="entry-list">
          {notes.map((note) => (
            <div key={note.id} className="entry-card" style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div className="entry-date">{formatDate(note.created_at)}</div>
                
                {/* Action buttons */}
                {editingId !== note.id && (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      className="btn-icon"
                      onClick={() => startEdit(note)}
                      title="Edit Entry"
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: 'var(--text-secondary)',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleDelete(note.id)}
                      disabled={deletingId === note.id}
                      title="Delete Entry"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        color: '#f87171',
                        padding: '4px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                      }}
                    >
                      {deletingId === note.id ? 'Deleting…' : '🗑 Delete'}
                    </button>
                  </div>
                )}
              </div>

              {editingId === note.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }}>
                  <textarea
                    className="form-textarea"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    rows={4}
                    maxLength={10000}
                  />
                  <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'var(--text-muted)',
                        padding: '6px 14px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUpdate(note.id)}
                      disabled={updatingId === note.id || !editContent.trim()}
                      className="btn btn-primary"
                      style={{ padding: '6px 14px', fontSize: '0.85rem' }}
                    >
                      {updatingId === note.id ? 'Updating…' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="entry-content">{note.content}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
