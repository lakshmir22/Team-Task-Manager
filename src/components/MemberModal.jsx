import React from 'react';

export default function MemberModal({ members, allUsers, onAdd, onClose }) {
  const memberIds = new Set(members.map(m => m.id));
  const available = allUsers.filter(u => !memberIds.has(u.id));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h2>Add Team Members</h2>
        {available.length === 0 ? (
          <div className="empty-state" style={{ padding: 24 }}>
            <div className="empty-icon">👥</div>
            <h3>All users are already members</h3>
          </div>
        ) : (
          available.map(u => (
            <div key={u.id} className="member-item">
              <div className="avatar" style={{ background: u.avatar_color }}>{u.name?.[0]}</div>
              <div className="member-info">
                <div className="member-name">{u.name}</div>
                <div className="member-email">{u.email}</div>
              </div>
              <span className="member-role-badge">{u.role}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => onAdd(u.id)}>+ Add</button>
            </div>
          ))
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
