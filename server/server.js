import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import db from './database.js';
import { authenticateToken, requireProjectAdmin, requireProjectMember, generateToken } from './middleware.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ==================== AUTH ROUTES ====================
app.get("/", (req, res) => {
  res.send("TaskFlow API is running successfully");
});
// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Check duplicate
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Random avatar color
    const colors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#3b82f6'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    // Insert user
    const userRole = role === 'admin' ? 'admin' : 'member';
    const result = db.prepare(
      'INSERT INTO users (name, email, password, role, avatar_color) VALUES (?, ?, ?, ?, ?)'
    ).run(name, email.toLowerCase(), hashedPassword, userRole, avatarColor);

    const token = generateToken(result.lastInsertRowid);

    res.status(201).json({
      message: 'Account created successfully',
      token,
      user: {
        id: result.lastInsertRowid,
        name,
        email: email.toLowerCase(),
        role: userRole,
        avatar_color: avatarColor
      }
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar_color: user.avatar_color
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user
app.get('/api/auth/me', authenticateToken, (req, res) => {
  res.json({ user: req.user });
});

// ==================== USERS ROUTES ====================

// Get all users (for assignment dropdowns)
app.get('/api/users', authenticateToken, (req, res) => {
  try {
    const users = db.prepare('SELECT id, name, email, role, avatar_color FROM users ORDER BY name').all();
    res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PROJECT ROUTES ====================

// List user's projects
app.get('/api/projects', authenticateToken, (req, res) => {
  try {
    const projects = db.prepare(`
      SELECT p.*, 
        u.name as owner_name,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count
      FROM projects p
      JOIN users u ON p.owner_id = u.id
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = ?
      ORDER BY p.updated_at DESC
    `).all(req.user.id);

    // Attach member avatars for each project
    const getMembers = db.prepare(`
      SELECT u.id, u.name, u.avatar_color 
      FROM project_members pm 
      JOIN users u ON pm.user_id = u.id 
      WHERE pm.project_id = ? 
      LIMIT 5
    `);

    const projectsWithMembers = projects.map(p => ({
      ...p,
      members: getMembers.all(p.id)
    }));

    res.json({ projects: projectsWithMembers });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create project
app.post('/api/projects', authenticateToken, (req, res) => {
  try {
    const { name, description, color } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can create projects' });
    }

    const projectColor = color || '#8b5cf6';
    const result = db.prepare(
      'INSERT INTO projects (name, description, owner_id, color) VALUES (?, ?, ?, ?)'
    ).run(name.trim(), description || '', req.user.id, projectColor);

    // Auto-add creator as admin member
    db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(result.lastInsertRowid, req.user.id, 'admin');

    // Log activity
    db.prepare(
      'INSERT INTO activity_log (project_id, user_id, action, details) VALUES (?, ?, ?, ?)'
    ).run(result.lastInsertRowid, req.user.id, 'project_created', `Created project "${name.trim()}"`);

    res.status(201).json({
      message: 'Project created successfully',
      project: {
        id: result.lastInsertRowid,
        name: name.trim(),
        description: description || '',
        owner_id: req.user.id,
        color: projectColor,
        status: 'active'
      }
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project details
app.get('/api/projects/:id', authenticateToken, requireProjectMember, (req, res) => {
  try {
    const project = db.prepare(`
      SELECT p.*, u.name as owner_name 
      FROM projects p 
      JOIN users u ON p.owner_id = u.id 
      WHERE p.id = ?
    `).get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Get members
    const members = db.prepare(`
      SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = ?
      ORDER BY pm.role DESC, u.name
    `).all(req.params.id);

    // Get tasks
    const tasks = db.prepare(`
      SELECT t.*, 
        creator.name as creator_name,
        assignee.name as assignee_name,
        assignee.avatar_color as assignee_color
      FROM tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE t.project_id = ?
      ORDER BY 
        CASE t.priority 
          WHEN 'urgent' THEN 1 
          WHEN 'high' THEN 2 
          WHEN 'medium' THEN 3 
          WHEN 'low' THEN 4 
        END,
        t.created_at DESC
    `).all(req.params.id);

    // Recent activity
    const activity = db.prepare(`
      SELECT a.*, u.name as user_name, u.avatar_color
      FROM activity_log a
      JOIN users u ON a.user_id = u.id
      WHERE a.project_id = ?
      ORDER BY a.created_at DESC
      LIMIT 20
    `).all(req.params.id);

    res.json({
      project,
      members,
      tasks,
      activity,
      userRole: req.projectRole
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
app.put('/api/projects/:id', authenticateToken, requireProjectAdmin, (req, res) => {
  try {
    const { name, description, status, color } = req.body;

    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name.trim()); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.id);

    db.prepare(`UPDATE projects SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project
app.delete('/api/projects/:id', authenticateToken, requireProjectAdmin, (req, res) => {
  try {
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== PROJECT MEMBERS ====================

// Add member to project
app.post('/api/projects/:id/members', authenticateToken, requireProjectAdmin, (req, res) => {
  try {
    const { userId, role } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if already a member
    const existing = db.prepare(
      'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(req.params.id, userId);

    if (existing) {
      return res.status(409).json({ error: 'User is already a member of this project' });
    }

    const memberRole = role === 'admin' ? 'admin' : 'member';
    db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(req.params.id, userId, memberRole);

    // Log activity
    db.prepare(
      'INSERT INTO activity_log (project_id, user_id, action, details) VALUES (?, ?, ?, ?)'
    ).run(req.params.id, req.user.id, 'member_added', `Added ${user.name} to the project`);

    res.status(201).json({ message: `${user.name} added to project` });
  } catch (error) {
    console.error('Error adding member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove member from project
app.delete('/api/projects/:id/members/:userId', authenticateToken, requireProjectAdmin, (req, res) => {
  try {
    const { userId } = req.params;

    // Prevent removing yourself if you're the owner
    const project = db.prepare('SELECT owner_id FROM projects WHERE id = ?').get(req.params.id);
    if (project && project.owner_id === parseInt(userId)) {
      return res.status(400).json({ error: 'Cannot remove the project owner' });
    }

    const user = db.prepare('SELECT name FROM users WHERE id = ?').get(userId);

    db.prepare(
      'DELETE FROM project_members WHERE project_id = ? AND user_id = ?'
    ).run(req.params.id, userId);

    // Unassign tasks from removed member
    db.prepare(
      'UPDATE tasks SET assignee_id = NULL WHERE project_id = ? AND assignee_id = ?'
    ).run(req.params.id, userId);

    // Log activity
    if (user) {
      db.prepare(
        'INSERT INTO activity_log (project_id, user_id, action, details) VALUES (?, ?, ?, ?)'
      ).run(req.params.id, req.user.id, 'member_removed', `Removed ${user.name} from the project`);
    }

    res.json({ message: 'Member removed from project' });
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== TASK ROUTES ====================

// Get tasks for a project (with filters)
app.get('/api/projects/:id/tasks', authenticateToken, requireProjectMember, (req, res) => {
  try {
    const { status, assignee, priority } = req.query;
    let query = `
      SELECT t.*, 
        creator.name as creator_name,
        assignee.name as assignee_name,
        assignee.avatar_color as assignee_color
      FROM tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE t.project_id = ?
    `;
    const params = [req.params.id];

    if (status) { query += ' AND t.status = ?'; params.push(status); }
    if (assignee) { query += ' AND t.assignee_id = ?'; params.push(assignee); }
    if (priority) { query += ' AND t.priority = ?'; params.push(priority); }

    query += ` ORDER BY 
      CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END,
      t.created_at DESC`;

    const tasks = db.prepare(query).all(...params);
    res.json({ tasks });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create task
app.post('/api/projects/:id/tasks', authenticateToken, requireProjectMember, (req, res) => {
  try {
    // Only admin can create tasks
    if (req.projectRole !== 'admin') {
      return res.status(403).json({ error: 'Only project admins can create tasks' });
    }

    const { title, description, assignee_id, priority, due_date, status } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Task title is required' });
    }

    // If assignee specified, verify they're a project member
    if (assignee_id) {
      const isMember = db.prepare(
        'SELECT id FROM project_members WHERE project_id = ? AND user_id = ?'
      ).get(req.params.id, assignee_id);

      if (!isMember) {
        return res.status(400).json({ error: 'Assignee must be a project member' });
      }
    }

    const result = db.prepare(`
      INSERT INTO tasks (title, description, project_id, assignee_id, creator_id, status, priority, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title.trim(),
      description || '',
      req.params.id,
      assignee_id || null,
      req.user.id,
      status || 'todo',
      priority || 'medium',
      due_date || null
    );

    // Update project timestamp
    db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(req.params.id);

    // Log activity
    db.prepare(
      'INSERT INTO activity_log (project_id, task_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)'
    ).run(req.params.id, result.lastInsertRowid, req.user.id, 'task_created', `Created task "${title.trim()}"`);

    // Return the full task with joins
    const task = db.prepare(`
      SELECT t.*, 
        creator.name as creator_name,
        assignee.name as assignee_name,
        assignee.avatar_color as assignee_color
      FROM tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE t.id = ?
    `).get(result.lastInsertRowid);

    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update task
app.put('/api/tasks/:taskId', authenticateToken, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check membership
    const membership = db.prepare(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(task.project_id, req.user.id);

    if (!membership) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }

    const { title, description, assignee_id, status, priority, due_date } = req.body;

    // Members can only update status of tasks assigned to them
    if (membership.role === 'member') {
      if (title !== undefined || description !== undefined || assignee_id !== undefined || 
          priority !== undefined || due_date !== undefined) {
        return res.status(403).json({ error: 'Members can only update task status' });
      }

      if (task.assignee_id !== req.user.id) {
        return res.status(403).json({ error: 'You can only update tasks assigned to you' });
      }
    }

    const updates = [];
    const values = [];

    if (title !== undefined) { updates.push('title = ?'); values.push(title.trim()); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (assignee_id !== undefined) { updates.push('assignee_id = ?'); values.push(assignee_id || null); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (priority !== undefined) { updates.push('priority = ?'); values.push(priority); }
    if (due_date !== undefined) { updates.push('due_date = ?'); values.push(due_date || null); }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(req.params.taskId);

    db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

    // Update project timestamp
    db.prepare('UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(task.project_id);

    // Log status change
    if (status && status !== task.status) {
      const statusLabels = { todo: 'To Do', in_progress: 'In Progress', in_review: 'In Review', done: 'Done' };
      db.prepare(
        'INSERT INTO activity_log (project_id, task_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)'
      ).run(task.project_id, task.id, req.user.id, 'status_changed',
        `Moved "${task.title}" to ${statusLabels[status] || status}`);
    }

    // Return updated task
    const updatedTask = db.prepare(`
      SELECT t.*, 
        creator.name as creator_name,
        assignee.name as assignee_name,
        assignee.avatar_color as assignee_color
      FROM tasks t
      LEFT JOIN users creator ON t.creator_id = creator.id
      LEFT JOIN users assignee ON t.assignee_id = assignee.id
      WHERE t.id = ?
    `).get(req.params.taskId);

    res.json({ message: 'Task updated successfully', task: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete task
app.delete('/api/tasks/:taskId', authenticateToken, (req, res) => {
  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check admin membership
    const membership = db.prepare(
      'SELECT role FROM project_members WHERE project_id = ? AND user_id = ?'
    ).get(task.project_id, req.user.id);

    if (!membership || membership.role !== 'admin') {
      return res.status(403).json({ error: 'Only project admins can delete tasks' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.taskId);

    // Log activity
    db.prepare(
      'INSERT INTO activity_log (project_id, user_id, action, details) VALUES (?, ?, ?, ?)'
    ).run(task.project_id, req.user.id, 'task_deleted', `Deleted task "${task.title}"`);

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== DASHBOARD ROUTE ====================

app.get('/api/dashboard', authenticateToken, (req, res) => {
  try {
    // Get user's projects
    const projectIds = db.prepare(
      'SELECT project_id FROM project_members WHERE user_id = ?'
    ).all(req.user.id).map(p => p.project_id);

    if (projectIds.length === 0) {
      return res.json({
        stats: { total: 0, todo: 0, in_progress: 0, in_review: 0, done: 0, overdue: 0 },
        myTasks: [],
        recentActivity: [],
        projects: []
      });
    }

    const placeholders = projectIds.map(() => '?').join(',');

    // Task stats across all user's projects
    const stats = {
      total: db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders})`).get(...projectIds).c,
      todo: db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) AND status = 'todo'`).get(...projectIds).c,
      in_progress: db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) AND status = 'in_progress'`).get(...projectIds).c,
      in_review: db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) AND status = 'in_review'`).get(...projectIds).c,
      done: db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) AND status = 'done'`).get(...projectIds).c,
      overdue: db.prepare(`SELECT COUNT(*) as c FROM tasks WHERE project_id IN (${placeholders}) AND status != 'done' AND due_date < date('now')`).get(...projectIds).c
    };

    // My assigned tasks (upcoming/overdue)
    const myTasks = db.prepare(`
      SELECT t.*, p.name as project_name, p.color as project_color
      FROM tasks t
      JOIN projects p ON t.project_id = p.id
      WHERE t.assignee_id = ? AND t.status != 'done'
      ORDER BY 
        CASE WHEN t.due_date < date('now') THEN 0 ELSE 1 END,
        t.due_date ASC,
        CASE t.priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 END
      LIMIT 10
    `).all(req.user.id);

    // Recent activity across all projects
    const recentActivity = db.prepare(`
      SELECT a.*, u.name as user_name, u.avatar_color, p.name as project_name
      FROM activity_log a
      JOIN users u ON a.user_id = u.id
      JOIN projects p ON a.project_id = p.id
      WHERE a.project_id IN (${placeholders})
      ORDER BY a.created_at DESC
      LIMIT 15
    `).all(...projectIds);

    // Projects summary
    const projects = db.prepare(`
      SELECT p.*,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = ?
      ORDER BY p.updated_at DESC
    `).all(req.user.id);

    res.json({ stats, myTasks, recentActivity, projects });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== HEALTH CHECK ====================

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'TaskFlow API is running', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 TaskFlow API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
  console.log(`\n📋 Demo Credentials:`);
  console.log(`   Admin: admin@taskflow.com / admin123`);
  console.log(`   Member: priya@taskflow.com / member123`);
});

export default app;
