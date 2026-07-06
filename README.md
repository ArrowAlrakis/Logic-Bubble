# Logic Bubble App

A full-stack web application that turns source text into interactive visual logic maps.
Users extract phrases as bubbles, connect them with arrows, insert junction dots,
and save their maps as named projects.

Project Live Demo: https://logic-bubble.lymis.uk/

Developers: Xuehua-neve and I.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Server | Python 3.10+, Flask 3.1 |
| Database | MySQL 8 (via XAMPP / MariaDB) |
| Templating | Jinja2 + Tailwind CSS (CDN) |
| Front-end | Vanilla JS (native ES Modules) |
| Auth | Werkzeug password hashing, Flask sessions |

### Why no Webpack / Vite?

This project uses **Flask server-side rendering** with **native ES Modules**
(`<script type="module">`). The browser's built-in module loader handles
`import` / `export` without a build step. A bundler would add complexity
(npm, config files, build commands) that provides no benefit here:
- There is no JSX or TypeScript to transpile.
- Module scripts are deferred automatically by the browser.
- Flask's `url_for('static', …)` serves files directly from `/static/`.

---

## Local Setup

### 1. Prerequisites

- Python 3.10 or later
- [XAMPP](https://www.apachefriends.org) (Apache + MySQL)
- A modern browser (Chrome / Firefox recommended)

### 2. Clone / unzip the project

```bash
cd path/to/project
```

### 3. Create and activate a virtual environment

```bash
# Windows
py -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 4. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 5. Start MySQL (XAMPP)

1. Open **XAMPP Control Panel**
2. Start **Apache** and **MySQL**
3. Open **phpMyAdmin** at `http://localhost/phpmyadmin`

### 6. Initialise the database

The `sql/logic_bubble_app.sql` file contains the complete schema (all tables,
roles, and seed data). There is no separate migration file.

In phpMyAdmin:
1. Create a database named `logic_bubble_app`
2. Select it, click **Import**, and upload `sql/logic_bubble_app.sql`

Or via the MySQL CLI:

```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS logic_bubble_app;"
mysql -u root -p logic_bubble_app < sql/logic_bubble_app.sql
```

### 7. Configure environment variables

Create a `.env` file in the project root (copy the example below):

```env
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=
MYSQL_DB=logic_bubble_app
SECRET_KEY=change-me-in-production
```

> **Note:** `SECRET_KEY` must be a long random string in any deployed environment.

### 8. Run the development server

```bash
python app.py
# or
py app.py
```

Open `http://127.0.0.1:5000` in your browser.

---

## Features

### User system
- Register, login, logout
- Session-based authentication
- Passwords stored as Werkzeug hashes

### Editor
- Submit / paste source text
- Select text to extract as a bubble node
- Drag bubbles; inertia-scroll after release
- Merge two bubbles by dragging one onto another
- Connect nodes by clicking them in sequence
- Insert junction dots on lines or below bubbles
- Edit bubble text (double-click or **F2**)
- Assign a border colour to any bubble (right-click → Set Color)
- Export the canvas as **PNG** (html2canvas)
- Export the project as **JSON**
- Undo history (up to 80 steps)

### Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Ctrl S` | Save project |
| `Ctrl Z` | Undo |
| `Enter` | Extract selected text / Edit selected bubble |
| `F2` | Edit selected bubble |
| `C` | Start connect from selected node |
| `.` | Insert dot node |
| `Del` / `Backspace` | Delete selected node |
| `Esc` | Cancel connect / close menu |

### Project management
- Save projects by name (ID-based update — renaming title no longer creates duplicates)
- Dashboard lists all saved projects with last-updated time
- Open existing project in the editor
- Delete projects from the dashboard (with ownership check)

---

## Project Structure

```
├── app.py                  Flask routes and database logic
├── requirements.txt
├── .env                    Local environment variables (not committed)
│
├── sql/
│   └── logic_bubble_app.sql   Complete schema + seed data (single file)
│
├── templates/
│   ├── base.html           Shared nav / layout (Tailwind CDN)
│   ├── macros.html         Jinja2 reusable UI components
│   ├── home.html
│   ├── login.html
│   ├── register.html
│   ├── dashboard.html
│   ├── editor.html         Standalone editor page
│   ├── document.html       Feature documentation
│   ├── about.html          Team + contact form
│   └── admin_messages.html Admin contact message viewer
│
├── static/
│   ├── css/
│   │   ├── theme.css       CSS custom properties (design tokens) + site toast
│   │   └── style.css       Editor-specific styles
│   └── js/
│       ├── main.js         ES module entry point
│       ├── utils.js        Shared DOM helpers (no deps)
│       ├── state.js        App state + undo history
│       ├── zoom.js         Canvas zoom and pan
│       ├── prefs.js        User preferences load/save/apply
│       ├── ui.js           Topbar, panels, keyboard, context menu
│       ├── bubble.js       Bubble node logic + colour support
│       ├── dot.js          Junction dot node logic
│       └── lines.js        SVG connection lines
│
└── tests/
    └── test_app.py         pytest integration tests
```

---

## Running Tests

```bash
pip install pytest
pytest tests/ -v
```

Tests require a running MySQL instance.
Set the same `.env` variables as the main app, or export them directly:

```bash
export MYSQL_HOST=localhost MYSQL_USER=root MYSQL_PASSWORD= MYSQL_DB=logic_bubble_app
pytest tests/ -v
```

---
## Admin Account

The SQL seed file includes a Admin account(only admin can get into /admin/message page):

| Field | Value |
|-------|-------|
| Username | `Admin` |
| Password | `AdminPassword` |

---

## Test Account (seed data)

The SQL seed file includes a test user:

| Field | Value |
|-------|-------|
| Username | `aaa` |
| Email | `aaa@aaa.com` |
| Password | `aaa` |

---

## Team

| Name | Role |
|------|------|
| Xuehua Hu | Full-Stack Developer |
| Arrow | Front-End Developer |
| Samia Ouagague | UI/UX Designer |
| Shiran Qiao | Back-End Developer |

Instructor: **Wasim Singh** — Sheridan College, IMM Web App Delivery, 2025–2026.

---

## Credits & Licenses

### Front-end Libraries

| Library | Version | License | Purpose |
|---------|---------|---------|---------|
| [Tailwind CSS](https://tailwindcss.com) | Play CDN v3 | MIT | Utility-first CSS for non-editor pages |
| [html2canvas](https://html2canvas.hertzen.com) | 1.4.1 | MIT | PNG export of the editor workspace |

### Fonts (Google Fonts — Open Font License)

| Font | Use |
|------|-----|
| [Syne](https://fonts.google.com/specimen/Syne) | Display typeface throughout the app |
| [JetBrains Mono](https://www.jetbrains.com/lp/mono/) | Monospace text in the editor panels |

### Back-end / Runtime

| Package | Notes |
|---------|-------|
| [Flask 3.1](https://flask.palletsprojects.com) | Python web framework (BSD-3-Clause) |
| [mysql-connector-python](https://dev.mysql.com/doc/connector-python/en/) | MySQL driver (GPL-2.0) |
| [Werkzeug](https://werkzeug.palletsprojects.com) | Password hashing, WSGI utilities (BSD-3-Clause) |
| [Jinja2](https://jinja.palletsprojects.com) | HTML templating engine (BSD-3-Clause) |
| [python-dotenv](https://github.com/theskumar/python-dotenv) | `.env` file loading (BSD-3-Clause) |
