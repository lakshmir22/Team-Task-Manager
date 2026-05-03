import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const initials = user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <svg viewBox="0 0 32 32" fill="none">
          <rect width="32" height="32" rx="8" fill="#8b5cf6"/>
          <path d="M9 16l4 4 10-10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        TaskFlow
      </div>
      <div className="navbar-nav">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? 'active' : ''}>Dashboard</NavLink>
        <NavLink to="/projects" className={({isActive}) => isActive ? 'active' : ''}>Projects</NavLink>
      </div>
      <div className="navbar-user">
        <div className="user-info" style={{ textAlign: 'right' }}>
          <div className="name">{user?.name}</div>
          <div className="role">{user?.role}</div>
        </div>
        <div className="avatar" style={{ background: user?.avatar_color || '#8b5cf6' }}>{initials}</div>
        <button className="btn-logout" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}
