# TaskFlow — Team Task Manager

A full-stack web application for managing team projects, assigning tasks, and tracking progress with role-based access control (Admin/Member).

## 🚀 Features

### Authentication & Authorization
- User registration (Signup) with role selection (Admin/Member)
- Secure login with JWT token-based authentication
- Protected routes — unauthenticated users are redirected to login
- Password hashing with bcrypt (10 salt rounds)

### Role-Based Access Control (RBAC)

| Action | Admin | Member |
|--------|:-----:|:------:|
| Create project | ✅ | ❌ |
| Edit / Delete project | ✅ | ❌ |
| Add / Remove members | ✅ | ❌ |
| Create / Edit / Delete tasks | ✅ | ❌ |
| Change task status | ✅ | ✅ (assigned only) |
| View dashboard | ✅ | ✅ |
| View project tasks | ✅ | ✅ (if member) |

### Project & Team Management
- Create projects with name, description, and color tag
- Add or remove team members from a project
- View member list with roles and avatars
- Project-level admin vs member roles

### Task Management (Kanban Board)
- 4-column Kanban board: **To Do → In Progress → In Review → Done**
- Task creation with title, description, assignee, priority, due date
- Priority levels: Low, Medium, High, Urgent (color-coded)
- Inline status updates via dropdown
- Overdue task detection and visual indicators
- Task editing and deletion (admin only)

### Dashboard
- 6 stat cards: Total Tasks, In Progress, Completed, In Review, To Do, Overdue
- "My Tasks" — assigned tasks sorted by urgency and due date
- Recent activity feed across all projects
- Project overview cards with progress bars

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, React Router v6, Vite |
| Backend | Node.js, Express.js |
| Database | SQLite via better-sqlite3 |
| Authentication | bcrypt + JSON Web Tokens (JWT) |
| Styling | Vanilla CSS (dark theme, glassmorphism) |

---

## 📁 Project Structure

```
ethAI/
├── index.html                      # Entry HTML
├── package.json                    # Frontend dependencies
├── vite.config.js                  # Vite config with API proxy
│
├── src/
│   ├── main.jsx                    # React entry point
│   ├── index.css                   # Global styles & design system
│   ├── App.jsx                     # Auth context, routing, toast
│   │
│   ├── utils/
│   │   └── api.js                  # API client with JWT headers
│   │
│   ├── components/
│   │   ├── Navbar.jsx              # Top navigation bar
│   │   ├── TaskModal.jsx           # Create / Edit task modal
│   │   └── MemberModal.jsx         # Add member modal
│   │
│   └── pages/
│       ├── LoginPage.jsx           # Login (split-screen UI)
│       ├── SignupPage.jsx          # Registration page
│       ├── Dashboard.jsx           # Overview dashboard
│       ├── ProjectList.jsx         # All projects grid
│       └── ProjectDetail.jsx       # Kanban board + members
│
└── server/
    ├── package.json                # Backend dependencies
    ├── database.js                 # Schema, migrations, seed data
    ├── middleware.js                # JWT auth & RBAC middleware
    └── server.js                   # Express REST API (15+ endpoints)
```

---

## 📦 Database Schema

Five tables with proper foreign keys and indexes:

```
┌──────────┐     ┌─────────────────┐     ┌──────────┐
│  users   │────<│ project_members │>────│ projects │
└──────────┘     └─────────────────┘     └──────────┘
     │                                        │
     │           ┌──────────┐                 │
     └──────────>│  tasks   │<────────────────┘
                 └──────────┘
                      │
                 ┌──────────────┐
                 │ activity_log │
                 └──────────────┘
```

- **users** — id, name, email, password, role, avatar_color
- **projects** — id, name, description, owner_id (FK), status, color
- **project_members** — project_id (FK), user_id (FK), role (junction table)
- **tasks** — id, title, description, project_id (FK), assignee_id (FK), creator_id (FK), status, priority, due_date
- **activity_log** — project_id (FK), task_id (FK), user_id (FK), action, details

---

## 🔌 REST API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register a new user |
| POST | `/api/auth/login` | Login and receive JWT |
| GET | `/api/auth/me` | Get current user profile |

### Projects (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects` | List user's projects |
| POST | `/api/projects` | Create project (admin) |
| GET | `/api/projects/:id` | Get project with tasks & members |
| PUT | `/api/projects/:id` | Update project (admin) |
| DELETE | `/api/projects/:id` | Delete project (admin) |

### Members (JWT + Project Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects/:id/members` | Add member to project |
| DELETE | `/api/projects/:id/members/:userId` | Remove member |

### Tasks (JWT required)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/projects/:id/tasks` | List tasks (with filters) |
| POST | `/api/projects/:id/tasks` | Create task (admin) |
| PUT | `/api/tasks/:taskId` | Update task |
| DELETE | `/api/tasks/:taskId` | Delete task (admin) |

### Dashboard & Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Aggregated stats & activity |
| GET | `/api/users` | List all users |
| GET | `/api/health` | Health check |

---

## ⚡ Getting Started

### Prerequisites
- Node.js v20+
- npm

### Installation

```bash
# Clone / navigate to the project
cd ethAI

# Install frontend dependencies
npm install

# Install backend dependencies
cd server
npm install
cd ..
```

### Running the Application

Open **two terminals**:

```bash
# Terminal 1 — Start Backend (port 5000)
cd server
node server.js

# Terminal 2 — Start Frontend (port 5173)
npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 🔐 Demo Credentials

The database is auto-seeded with sample users, projects, and tasks:

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@taskflow.com | admin123 |
| Member | priya@taskflow.com | member123 |
| Member | rahul@taskflow.com | member123 |
| Member | sneha@taskflow.com | member123 |
| Member | amit@taskflow.com | member123 |

**Seed data includes:**
- 3 projects (E-Commerce Platform, Mobile Banking App, HR Management System)
- 13 tasks across projects with varied statuses and priorities
- Activity log entries

---

## ✅ Validations & Error Handling

- Email format validation on signup
- Password minimum 6 characters
- Duplicate email prevention (409 Conflict)
- Required field checks on all forms
- JWT expiry handling (7-day tokens)
- Foreign key constraints on database level
- Assignee must be a project member
- Cannot remove the project owner
- Members can only update status of tasks assigned to them
- Proper HTTP status codes (400, 401, 403, 404, 409, 500)

---

## 🎨 UI Design

- **Dark theme** with navy/slate backgrounds
- **Glassmorphism** cards with backdrop-blur
- **Gradient accents** (Violet → Cyan)
- **Micro-animations** — fade-in, hover lifts, smooth transitions
- **Google Fonts** — Inter typeface
- **Responsive** — adapts to tablet and mobile viewports
- **Color-coded priorities** and status indicators

---

## 📄 License

This project is built as a full-stack project.