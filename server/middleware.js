import jwt from 'jsonwebtoken';
import db from './database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'taskflow_secret_key_2026';

// Authenticate JWT token from Authorization header
export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.prepare('SELECT id, name, email, role, avatar_color FROM users WHERE id = ?').get(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
}

// Check if user is admin of a specific project
export function requireProjectAdmin(req, res, next) {
  const projectId = req.params.id || req.params.projectId;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID required' });
  }

  const membership = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this project' });
  }

  if (membership.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required for this action' });
  }

  req.projectRole = membership.role;
  next();
}

// Check if user is a member of the project (any role)
export function requireProjectMember(req, res, next) {
  const projectId = req.params.id || req.params.projectId;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID required' });
  }

  const membership = db.prepare(
    'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
  ).get(projectId, req.user.id);

  if (!membership) {
    return res.status(403).json({ error: 'You are not a member of this project' });
  }

  req.projectRole = membership.role;
  next();
}

// Generate JWT token
export function generateToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
}

export { JWT_SECRET };
