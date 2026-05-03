import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email || !password) { setError('All fields are required'); return; }
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-left">
        <div className="auth-shapes"><div></div><div></div><div></div></div>
        <h1>TaskFlow</h1>
        <p>Manage your team's projects, assign tasks, and track progress — all in one place.</p>
      </div>
      <div className="auth-right">
        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Welcome back</h2>
          <p className="subtitle">Sign in to your account to continue</p>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-group">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="auth-footer">
            Don't have an account? <Link to="/signup">Create one</Link>
          </div>
          <div style={{ marginTop: 20, padding: 14, background: 'var(--bg-glass)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Demo Credentials:</strong><br/>
            Admin: admin@taskflow.com / admin123<br/>
            Member: priya@taskflow.com / member123
          </div>
        </form>
      </div>
    </div>
  );
}
