import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';

const db = new Database('taskflow.db');

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ==================== SCHEMA ====================

// Users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
    avatar_color TEXT DEFAULT '#8b5cf6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Projects table
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'completed')),
    color TEXT DEFAULT '#8b5cf6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Project Members (many-to-many)
db.exec(`
  CREATE TABLE IF NOT EXISTS project_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK(role IN ('admin', 'member')),
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(project_id, user_id)
  )
`);

// Tasks table
db.exec(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    project_id INTEGER NOT NULL,
    assignee_id INTEGER,
    creator_id INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'todo' CHECK(status IN ('todo', 'in_progress', 'in_review', 'done')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// Activity Log
db.exec(`
  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    project_id INTEGER,
    task_id INTEGER,
    user_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

// ==================== INDEXES ====================
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id)`);
db.exec(`CREATE INDEX IF NOT EXISTS idx_activity_project ON activity_log(project_id)`);

// ==================== SEED DATA ====================

const avatarColors = ['#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#3b82f6'];

// Seed admin user
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@taskflow.com');
if (!adminExists) {
  const hashedPassword = bcrypt.hashSync('admin123', 10);
  const adminResult = db.prepare(
    'INSERT INTO users (name, email, password, role, avatar_color) VALUES (?, ?, ?, ?, ?)'
  ).run('Admin User', 'admin@taskflow.com', hashedPassword, 'admin', '#8b5cf6');

  // Seed sample member users
  const memberPassword = bcrypt.hashSync('member123', 10);
  const members = [
    { name: 'Priya Sharma', email: 'priya@taskflow.com', color: '#06b6d4' },
    { name: 'Rahul Verma', email: 'rahul@taskflow.com', color: '#f59e0b' },
    { name: 'Sneha Patel', email: 'sneha@taskflow.com', color: '#10b981' },
    { name: 'Amit Kumar', email: 'amit@taskflow.com', color: '#ef4444' },
  ];

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password, role, avatar_color) VALUES (?, ?, ?, ?, ?)'
  );
  const memberIds = members.map(m => {
    return insertUser.run(m.name, m.email, memberPassword, 'member', m.color).lastInsertRowid;
  });

  // Seed sample projects
  const insertProject = db.prepare(
    'INSERT INTO projects (name, description, owner_id, color) VALUES (?, ?, ?, ?)'
  );
  const insertMember = db.prepare(
    'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
  );
  const insertTask = db.prepare(
    'INSERT INTO tasks (title, description, project_id, assignee_id, creator_id, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );
  const insertActivity = db.prepare(
    'INSERT INTO activity_log (project_id, task_id, user_id, action, details) VALUES (?, ?, ?, ?, ?)'
  );

  const adminId = adminResult.lastInsertRowid;

  // Project 1: E-Commerce Platform
  const p1 = insertProject.run(
    'E-Commerce Platform',
    'Build a modern e-commerce platform with cart, payments, and order tracking.',
    adminId, '#8b5cf6'
  ).lastInsertRowid;

  insertMember.run(p1, adminId, 'admin');
  insertMember.run(p1, memberIds[0], 'member');
  insertMember.run(p1, memberIds[1], 'member');
  insertMember.run(p1, memberIds[2], 'member');

  const t1 = insertTask.run('Design homepage UI', 'Create wireframes and mockups for the homepage', p1, memberIds[0], adminId, 'done', 'high', '2026-05-01').lastInsertRowid;
  const t2 = insertTask.run('Implement product catalog API', 'RESTful API for product CRUD operations', p1, memberIds[1], adminId, 'in_progress', 'urgent', '2026-05-05').lastInsertRowid;
  const t3 = insertTask.run('Shopping cart functionality', 'Add to cart, remove, update quantity', p1, memberIds[0], adminId, 'todo', 'high', '2026-05-10').lastInsertRowid;
  const t4 = insertTask.run('Payment gateway integration', 'Integrate Razorpay for payment processing', p1, memberIds[2], adminId, 'todo', 'urgent', '2026-05-15').lastInsertRowid;
  const t5 = insertTask.run('User authentication flow', 'Signup, login, forgot password with JWT', p1, memberIds[1], adminId, 'in_review', 'medium', '2026-05-03').lastInsertRowid;
  insertTask.run('Order tracking dashboard', 'Real-time order status updates for customers', p1, null, adminId, 'todo', 'medium', '2026-05-20');

  insertActivity.run(p1, t1, adminId, 'task_created', 'Created task "Design homepage UI"');
  insertActivity.run(p1, t1, memberIds[0], 'status_changed', 'Moved "Design homepage UI" to Done');
  insertActivity.run(p1, t2, adminId, 'task_created', 'Created task "Implement product catalog API"');
  insertActivity.run(p1, t5, memberIds[1], 'status_changed', 'Moved "User authentication flow" to In Review');

  // Project 2: Mobile Banking App
  const p2 = insertProject.run(
    'Mobile Banking App',
    'Secure mobile banking application with fund transfers, bill payments, and analytics.',
    adminId, '#06b6d4'
  ).lastInsertRowid;

  insertMember.run(p2, adminId, 'admin');
  insertMember.run(p2, memberIds[1], 'member');
  insertMember.run(p2, memberIds[3], 'member');

  insertTask.run('Security audit', 'Complete security review of all endpoints', p2, memberIds[3], adminId, 'in_progress', 'urgent', '2026-05-04');
  insertTask.run('Fund transfer module', 'NEFT/IMPS/UPI transfer implementation', p2, memberIds[1], adminId, 'todo', 'high', '2026-05-12');
  insertTask.run('Bill payment integration', 'Utility and credit card bill payments', p2, memberIds[3], adminId, 'todo', 'medium', '2026-05-18');
  insertTask.run('Transaction history UI', 'Searchable and filterable transaction list', p2, memberIds[1], adminId, 'done', 'low', '2026-04-28');

  // Project 3: HR Management System
  const p3 = insertProject.run(
    'HR Management System',
    'Employee onboarding, leave management, and payroll processing system.',
    adminId, '#f59e0b'
  ).lastInsertRowid;

  insertMember.run(p3, adminId, 'admin');
  insertMember.run(p3, memberIds[0], 'member');
  insertMember.run(p3, memberIds[2], 'member');

  insertTask.run('Employee onboarding flow', 'Multi-step onboarding wizard with document upload', p3, memberIds[0], adminId, 'in_progress', 'high', '2026-05-06');
  insertTask.run('Leave management module', 'Apply, approve, reject leaves with calendar view', p3, memberIds[2], adminId, 'in_review', 'medium', '2026-05-08');
  insertTask.run('Payroll calculation engine', 'Automated salary calculation with tax deductions', p3, null, adminId, 'todo', 'urgent', '2026-05-20');

  console.log('✅ Database seeded with sample data');
}

console.log('📦 Database initialized successfully');

export default db;
