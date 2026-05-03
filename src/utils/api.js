const API_BASE = '/api';
function getToken() { return localStorage.getItem('taskflow_token'); }
export function setToken(t) { localStorage.setItem('taskflow_token', t); }
export function removeToken() { localStorage.removeItem('taskflow_token'); }

export async function api(endpoint, options = {}) {
  const token = getToken();
  const config = { headers: { 'Content-Type': 'application/json' }, ...options };
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  if (config.body && typeof config.body === 'object') config.body = JSON.stringify(config.body);
  const res = await fetch(`${API_BASE}${endpoint}`, config);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

export const auth = {
  login: (body) => api('/auth/login', { method: 'POST', body }),
  signup: (body) => api('/auth/signup', { method: 'POST', body }),
  me: () => api('/auth/me'),
};
export const projects = {
  list: () => api('/projects'),
  get: (id) => api(`/projects/${id}`),
  create: (body) => api('/projects', { method: 'POST', body }),
  update: (id, body) => api(`/projects/${id}`, { method: 'PUT', body }),
  delete: (id) => api(`/projects/${id}`, { method: 'DELETE' }),
  addMember: (id, body) => api(`/projects/${id}/members`, { method: 'POST', body }),
  removeMember: (id, userId) => api(`/projects/${id}/members/${userId}`, { method: 'DELETE' }),
};
export const tasks = {
  create: (pid, body) => api(`/projects/${pid}/tasks`, { method: 'POST', body }),
  update: (tid, body) => api(`/tasks/${tid}`, { method: 'PUT', body }),
  delete: (tid) => api(`/tasks/${tid}`, { method: 'DELETE' }),
};
export const dashboard = { get: () => api('/dashboard') };
export const users = { list: () => api('/users') };
