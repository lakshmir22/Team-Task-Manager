import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { dashboard as dashApi } from '../utils/api';
import { useAuth } from '../App';

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    dashApi.get().then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!data) return <div className="empty-state"><h3>Failed to load dashboard</h3></div>;

  const { stats, myTasks, recentActivity, projects } = data;

  const statCards = [
    { label: 'Total Tasks', value: stats.total, icon: '📋', color: '#8b5cf6' },
    { label: 'In Progress', value: stats.in_progress, icon: '🔄', color: '#06b6d4' },
    { label: 'Completed', value: stats.done, icon: '✅', color: '#10b981' },
    { label: 'In Review', value: stats.in_review, icon: '👁️', color: '#f59e0b' },
    { label: 'To Do', value: stats.todo, icon: '📝', color: '#64748b' },
    { label: 'Overdue', value: stats.overdue, icon: '⚠️', color: '#ef4444' },
  ];

  const isOverdue = (d) => d && new Date(d) < new Date() ? true : false;

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1>Welcome back, {user?.name?.split(' ')[0]} 👋</h1>
        <p>Here's what's happening across your projects</p>
      </div>

      <div className="stats-grid">
        {statCards.map((s, i) => (
          <div key={i} className="stat-card" style={{ animationDelay: `${i * 0.05}s` }}>
            <div className="stat-icon" style={{ background: `${s.color}20`, color: s.color }}>{s.icon}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
            <div style={{ position: 'absolute', top: 0, right: 0, width: 80, height: 80, borderRadius: '50%', background: s.color, opacity: 0.06, transform: 'translate(20px,-20px)' }}></div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>📌 My Tasks</h2>
            <span className="badge">{myTasks.length}</span>
          </div>
          {myTasks.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">🎉</div><h3>All caught up!</h3><p>No pending tasks assigned to you</p></div>
          ) : (
            myTasks.map(t => (
              <div key={t.id} className="task-item" onClick={() => navigate(`/projects/${t.project_id}`)}>
                <div className={`task-priority priority-${t.priority}`}></div>
                <div className="task-info">
                  <div className="task-title">{t.title}</div>
                  <div className="task-meta">
                    <span>{t.project_name}</span>
                    <span className={isOverdue(t.due_date) ? 'tag tag-overdue' : ''}>
                      {t.due_date ? (isOverdue(t.due_date) ? '⚠ Overdue' : `Due ${t.due_date}`) : 'No due date'}
                    </span>
                  </div>
                </div>
                <span className={`tag tag-${t.priority}`}>{t.priority}</span>
              </div>
            ))
          )}
        </div>

        <div className="dashboard-section">
          <div className="section-header">
            <h2>⚡ Recent Activity</h2>
          </div>
          {recentActivity.length === 0 ? (
            <div className="empty-state"><div className="empty-icon">📭</div><h3>No activity yet</h3></div>
          ) : (
            recentActivity.map(a => (
              <div key={a.id} className="activity-item">
                <div className="avatar avatar-sm" style={{ background: a.avatar_color }}>{a.user_name?.[0]}</div>
                <div className="activity-text"><strong>{a.user_name}</strong> {a.details} <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>in {a.project_name}</span></div>
                <div className="activity-time">{timeAgo(a.created_at)}</div>
              </div>
            ))
          )}
        </div>

        <div className="dashboard-section full-width">
          <div className="section-header">
            <h2>📂 Your Projects</h2>
            <span className="badge">{projects.length} projects</span>
          </div>
          <div className="projects-grid" style={{ gap: 12 }}>
            {projects.map(p => {
              const pct = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
              return (
                <div key={p.id} className="project-card" onClick={() => navigate(`/projects/${p.id}`)} style={{ padding: 16 }}>
                  <div className="project-color-bar" style={{ background: p.color }}></div>
                  <h3 style={{ fontSize: '1rem' }}>{p.name}</h3>
                  <div className="project-stats">
                    <span className="project-stat"><strong>{p.task_count}</strong> tasks</span>
                    <span className="project-stat"><strong>{p.done_count}</strong> done</span>
                    <span className="project-stat"><strong>{p.member_count}</strong> members</span>
                  </div>
                  <div className="project-progress">
                    <div className="bar" style={{ width: `${pct}%`, background: p.color }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
