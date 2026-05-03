import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { projects as projApi } from '../utils/api';
import { useAuth } from '../App';

const COLORS = ['#8b5cf6','#06b6d4','#f59e0b','#ef4444','#10b981','#ec4899','#3b82f6'];

export default function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: '#8b5cf6' });
  const [error, setError] = useState('');
  const { user, showToast } = useAuth();
  const navigate = useNavigate();

  const load = () => {
    projApi.list().then(d => setProjects(d.projects)).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Project name is required'); return; }
    try {
      await projApi.create(form);
      setShowCreate(false);
      setForm({ name: '', description: '', color: '#8b5cf6' });
      setError('');
      showToast('Project created!');
      load();
    } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="projects-header">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <h1>Projects</h1>
          <p>Manage and track all your team projects</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" style={{ width: 'auto' }} onClick={() => setShowCreate(true)}>+ New Project</button>
        )}
      </div>

      {projects.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">📂</div><h3>No projects yet</h3><p>{user?.role === 'admin' ? 'Create your first project to get started' : 'You haven\'t been added to any projects yet'}</p></div>
      ) : (
        <div className="projects-grid">
          {projects.map((p, i) => {
            const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
            return (
              <div key={p.id} className="project-card fade-in" style={{ animationDelay: `${i * 0.05}s` }} onClick={() => navigate(`/projects/${p.id}`)}>
                <div className="project-color-bar" style={{ background: p.color }}></div>
                <h3>{p.name}</h3>
                <p className="project-desc">{p.description || 'No description'}</p>
                <div className="project-stats">
                  <span className="project-stat">📋 <strong>{p.task_count}</strong> tasks</span>
                  <span className="project-stat">✅ <strong>{p.done_count}</strong> done</span>
                  <span className="project-stat">👥 <strong>{p.member_count}</strong> members</span>
                </div>
                <div className="member-avatars">
                  {(p.members || []).slice(0, 4).map(m => (
                    <div key={m.id} className="avatar avatar-sm" style={{ background: m.avatar_color }} title={m.name}>{m.name?.[0]}</div>
                  ))}
                  {p.member_count > 4 && <div className="avatar avatar-sm" style={{ background: '#475569' }}>+{p.member_count - 4}</div>}
                </div>
                <div className="project-progress">
                  <div className="bar" style={{ width: `${pct}%`, background: p.color }}></div>
                </div>
                <div style={{ marginTop: 8, fontSize: '0.78rem', color: 'var(--text-muted)' }}>{pct}% complete</div>
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Project</h2>
            {error && <div className="error-msg" style={{ marginBottom: 16 }}>{error}</div>}
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label>Project Name</label>
                <input type="text" placeholder="My Awesome Project" value={form.name} onChange={e => setForm({...form, name: e.target.value})} autoFocus />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea placeholder="Brief description of the project..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Color</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {COLORS.map(c => (
                    <div key={c} onClick={() => setForm({...form, color: c})} style={{
                      width: 32, height: 32, borderRadius: 8, background: c, cursor: 'pointer',
                      border: form.color === c ? '3px solid white' : '3px solid transparent', transition: 'all 0.15s'
                    }}></div>
                  ))}
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ width: 'auto' }}>Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
