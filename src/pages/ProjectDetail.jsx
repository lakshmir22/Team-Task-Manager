import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { projects as projApi, tasks as taskApi, users as userApi } from '../utils/api';
import { useAuth } from '../App';
import TaskModal from '../components/TaskModal';
import MemberModal from '../components/MemberModal';

const STATUS_COLS = [
  { key: 'todo', label: 'To Do', color: '#64748b', icon: '📝' },
  { key: 'in_progress', label: 'In Progress', color: '#06b6d4', icon: '🔄' },
  { key: 'in_review', label: 'In Review', color: '#f59e0b', icon: '👁️' },
  { key: 'done', label: 'Done', color: '#10b981', icon: '✅' },
];

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, showToast } = useAuth();
  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [allTasks, setTasks] = useState([]);
  const [userRole, setUserRole] = useState('member');
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [allUsers, setAllUsers] = useState([]);

  const load = async () => {
    try {
      const data = await projApi.get(id);
      setProject(data.project);
      setMembers(data.members);
      setTasks(data.tasks);
      setUserRole(data.userRole);
    } catch (err) {
      showToast(err.message, 'error');
      navigate('/projects');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await taskApi.update(taskId, { status: newStatus });
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
      showToast('Task status updated');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleTaskSaved = () => {
    setShowTaskModal(false);
    setEditingTask(null);
    load();
    showToast(editingTask ? 'Task updated' : 'Task created');
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Delete this task?')) return;
    try {
      await taskApi.delete(taskId);
      load();
      showToast('Task deleted');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleDeleteProject = async () => {
    if (!confirm('Delete this entire project? This cannot be undone.')) return;
    try {
      await projApi.delete(id);
      showToast('Project deleted');
      navigate('/projects');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const openMemberModal = async () => {
    try {
      const data = await userApi.list();
      setAllUsers(data.users);
      setShowMemberModal(true);
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleAddMember = async (userId) => {
    try {
      await projApi.addMember(id, { userId, role: 'member' });
      load();
      showToast('Member added');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const handleRemoveMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await projApi.removeMember(id, userId);
      load();
      showToast('Member removed');
    } catch (err) { showToast(err.message, 'error'); }
  };

  const isAdmin = userRole === 'admin';
  const isOverdue = (d) => d && new Date(d) < new Date();

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!project) return null;

  return (
    <div className="fade-in">
      <div className="project-detail-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 12, height: 12, borderRadius: 4, background: project.color }}></div>
            <h1>{project.name}</h1>
          </div>
          <p className="project-meta">{project.description || 'No description'}</p>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            <span>👤 Owner: {project.owner_name}</span>
            <span>👥 {members.length} members</span>
            <span>📋 {allTasks.length} tasks</span>
          </div>
        </div>
        <div className="project-actions">
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>+ Add Task</button>}
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={openMemberModal}>👥 Members</button>}
          {isAdmin && <button className="btn btn-danger btn-sm" onClick={handleDeleteProject}>🗑️ Delete</button>}
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/projects')}>← Back</button>
        </div>
      </div>

      <div className="kanban-board">
        {STATUS_COLS.map(col => {
          const colTasks = allTasks.filter(t => t.status === col.key);
          return (
            <div key={col.key} className="kanban-column">
              <div className="kanban-column-header">
                <div className="kanban-column-title">
                  <span className="dot" style={{ background: col.color }}></span>
                  {col.label}
                </div>
                <span className="kanban-column-count">{colTasks.length}</span>
              </div>
              {colTasks.length === 0 && (
                <div style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)', fontSize: '0.85rem' }}>No tasks</div>
              )}
              {colTasks.map(task => (
                <div key={task.id} className="kanban-card" onClick={() => { if (isAdmin) { setEditingTask(task); setShowTaskModal(true); } }}>
                  <div className="card-title">{task.title}</div>
                  {task.description && <div className="card-desc">{task.description}</div>}
                  <div className="card-footer">
                    <div className="card-tags">
                      <span className={`tag tag-${task.priority}`}>{task.priority}</span>
                      {isOverdue(task.due_date) && task.status !== 'done' && <span className="tag tag-overdue">overdue</span>}
                    </div>
                    {task.assignee_name && (
                      <div className="avatar avatar-sm" style={{ background: task.assignee_color || '#8b5cf6' }} title={task.assignee_name}>
                        {task.assignee_name[0]}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                    {task.due_date && (
                      <span className={`card-due ${isOverdue(task.due_date) && task.status !== 'done' ? 'overdue' : ''}`}>
                        📅 {task.due_date}
                      </span>
                    )}
                    <select className="status-select" value={task.status}
                      onClick={e => e.stopPropagation()}
                      onChange={e => handleStatusChange(task.id, e.target.value)}>
                      {STATUS_COLS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  {isAdmin && (
                    <button className="btn btn-danger btn-sm" style={{ marginTop: 8, width: '100%' }}
                      onClick={e => { e.stopPropagation(); handleDeleteTask(task.id); }}>Delete</button>
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Members Section */}
      <div className="members-section">
        <div className="section-header">
          <h2>👥 Team Members</h2>
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={openMemberModal}>+ Add Member</button>}
        </div>
        {members.map(m => (
          <div key={m.id} className="member-item">
            <div className="avatar" style={{ background: m.avatar_color }}>{m.name?.[0]}</div>
            <div className="member-info">
              <div className="member-name">{m.name}</div>
              <div className="member-email">{m.email}</div>
            </div>
            <span className="member-role-badge">{m.role}</span>
            {isAdmin && m.id !== project.owner_id && (
              <button className="btn btn-danger btn-sm" onClick={() => handleRemoveMember(m.id)}>Remove</button>
            )}
          </div>
        ))}
      </div>

      {showTaskModal && (
        <TaskModal
          projectId={id}
          task={editingTask}
          members={members}
          onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
          onSaved={handleTaskSaved}
        />
      )}
      {showMemberModal && (
        <MemberModal
          members={members}
          allUsers={allUsers}
          onAdd={handleAddMember}
          onClose={() => setShowMemberModal(false)}
        />
      )}
    </div>
  );
}
