from flask import Flask, render_template, request, redirect, url_for, flash, session, jsonify
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash
import mysql.connector
import os
import json

load_dotenv()

app = Flask(__name__)
app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key")


def get_db_connection():
    return mysql.connector.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DB", "logic_bubble_app")
    )


# ── Home ─────────────────────────────────────────────
@app.route("/")
def home():
    return render_template("home.html")


# ── Register ─────────────────────────────────────────
@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email    = request.form.get("email",    "").strip()
        password = request.form.get("password", "").strip()

        if not username or not email or not password:
            flash("All fields are required.", "error")
            return render_template("register.html")

        password_hash = generate_password_hash(password)

        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            "SELECT id FROM users WHERE email = %s OR username = %s",
            (email, username)
        )
        if cursor.fetchone():
            cursor.close(); conn.close()
            flash("Username or email already exists.", "error")
            return render_template("register.html")

        cursor.execute(
            "INSERT INTO users (username, email, password_hash) VALUES (%s, %s, %s)",
            (username, email, password_hash)
        )
        conn.commit()
        cursor.close(); conn.close()

        flash("Account created successfully. Please log in.", "success")
        return redirect(url_for("login"))

    return render_template("register.html")


# ── Login ─────────────────────────────────────────────
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        identifier = request.form.get("identifier", "").strip()  # v4.1.1: username or email
        password   = request.form.get("password",   "").strip()

        if not identifier or not password:
            flash("Username/email and password are required.", "error")
            return render_template("login.html")

        conn   = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        # v4.1.1: accept either username or email
        cursor.execute(
            "SELECT * FROM users WHERE email = %s OR username = %s",
            (identifier, identifier)
        )
        user = cursor.fetchone()
        cursor.close(); conn.close()

        if user and check_password_hash(user["password_hash"], password):
            session["user_id"]  = user["id"]
            session["username"] = user["username"]
            session["role"]     = user.get("role", "user")
            flash("Login successful.", "success")
            return redirect(url_for("dashboard"))

        flash("Invalid credentials.", "error")

    return render_template("login.html")


# ── Logout ────────────────────────────────────────────
@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "success")
    return redirect(url_for("home"))


# ── Dashboard ─────────────────────────────────────────
@app.route("/dashboard")
def dashboard():
    if "user_id" not in session:
        flash("Please log in first.", "error")
        return redirect(url_for("login"))

    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, title, created_at, updated_at FROM projects "
        "WHERE user_id = %s ORDER BY updated_at DESC",
        (session["user_id"],)
    )
    projects = cursor.fetchall()
    cursor.close(); conn.close()

    return render_template("dashboard.html", projects=projects)


# ── Editor ────────────────────────────────────────────
@app.route("/editor")
def editor():
    if "user_id" not in session:
        flash("Please log in first.", "error")
        return redirect(url_for("login"))
    return render_template("editor.html", project_data=None)


@app.route("/editor/<int:project_id>")
def open_project(project_id):
    if "user_id" not in session:
        flash("Please log in first.", "error")
        return redirect(url_for("login"))

    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute(
        "SELECT id, title, source_text, graph_json FROM projects "
        "WHERE id = %s AND user_id = %s LIMIT 1",
        (project_id, session["user_id"])
    )
    project = cursor.fetchone()
    cursor.close(); conn.close()

    if not project:
        flash("Project not found.", "error")
        return redirect(url_for("dashboard"))

    project['graph_data'] = json.loads(project['graph_json'] or '{}')
    return render_template("editor.html", project_data=project)


# ── Save project ──────────────────────────────────────
@app.route("/save-project", methods=["POST"])
def save_project():
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Please log in first."}), 401

    data        = request.get_json()
    project_id  = data.get("project_id") or None
    title       = (data.get("title") or "").strip()
    source_text = data.get("source_text") or ""
    graph_data  = data.get("graph_data")  or {}

    if not title:
        return jsonify({"success": False, "message": "Project title is required."}), 400

    graph_json = json.dumps(graph_data)
    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if project_id:
        cursor.execute(
            "SELECT id FROM projects WHERE id = %s AND user_id = %s",
            (project_id, session["user_id"])
        )
        if cursor.fetchone():
            cursor.execute(
                "UPDATE projects SET title=%s, source_text=%s, graph_json=%s WHERE id=%s",
                (title, source_text, graph_json, project_id)
            )
        else:
            cursor.close(); conn.close()
            return jsonify({"success": False, "message": "Project not found."}), 404
    else:
        cursor.execute(
            "INSERT INTO projects (user_id, title, source_text, graph_json) VALUES (%s,%s,%s,%s)",
            (session["user_id"], title, source_text, graph_json)
        )
        project_id = cursor.lastrowid

    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"success": True, "message": "Project saved.", "project_id": project_id})


# ── Delete project ────────────────────────────────────
@app.route("/delete-project/<int:project_id>", methods=["POST"])
def delete_project(project_id):
    if "user_id" not in session:
        if request.headers.get("X-Requested-With") == "XMLHttpRequest":
            return jsonify({"success": False, "message": "Please log in first."}), 401
        flash("Please log in first.", "error")
        return redirect(url_for("login"))

    conn   = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        "DELETE FROM projects WHERE id = %s AND user_id = %s",
        (project_id, session["user_id"])
    )
    conn.commit()
    affected = cursor.rowcount
    cursor.close(); conn.close()

    # v04: return JSON for AJAX requests
    if request.headers.get("X-Requested-With") == "XMLHttpRequest":
        if affected:
            return jsonify({"success": True,  "message": "Project deleted."})
        return jsonify({"success": False, "message": "Project not found."}), 404

    if affected:
        flash("Project deleted.", "success")
    else:
        flash("Project not found.", "error")
    return redirect(url_for("dashboard"))


# ── User preferences API (v04) ────────────────────────
@app.route("/api/preferences", methods=["GET", "POST"])
def user_preferences():
    if "user_id" not in session:
        return jsonify({"success": False, "message": "Not logged in."}), 401

    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)

    if request.method == "GET":
        cursor.execute(
            "SELECT preferences_json FROM users WHERE id = %s", (session["user_id"],)
        )
        row = cursor.fetchone()
        cursor.close(); conn.close()
        raw = row["preferences_json"] if row else None
        prefs = json.loads(raw) if raw else {}
        return jsonify({"success": True, "preferences": prefs})

    # POST — save preferences
    data = request.get_json() or {}
    cursor.execute(
        "UPDATE users SET preferences_json = %s WHERE id = %s",
        (json.dumps(data), session["user_id"])
    )
    conn.commit()
    cursor.close(); conn.close()
    return jsonify({"success": True, "message": "Preferences saved."})


# ── Document page (v04) ──────────────────────────────
@app.route("/document")
def document():
    return render_template("document.html")


# ── About + Contact page (v04) ───────────────────────
@app.route("/about", methods=["GET", "POST"])
def about():
    if request.method == "POST":
        name    = request.form.get("name",    "").strip()
        email   = request.form.get("email",   "").strip()
        subject = request.form.get("subject", "").strip()
        body    = request.form.get("body",    "").strip()

        if not name or not email or not body:
            flash("Name, email, and message are required.", "error")
            return render_template("about.html")

        conn   = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "INSERT INTO messages (name, email, subject, body) VALUES (%s,%s,%s,%s)",
            (name, email, subject, body)
        )
        conn.commit()
        cursor.close(); conn.close()

        flash("Your message has been sent. Thank you!", "success")
        return redirect(url_for("about"))

    return render_template("about.html")


# ── Admin: view messages (v04) ────────────────────────
@app.route("/admin/messages")
def admin_messages():
    if "user_id" not in session:
        flash("Please log in first.", "error")
        return redirect(url_for("login"))
    if session.get("role") != "admin":
        flash("Admin access required.", "error")
        return redirect(url_for("dashboard"))

    conn   = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM messages ORDER BY created_at DESC")
    messages = cursor.fetchall()
    cursor.close(); conn.close()

    return render_template("admin_messages.html", messages=messages)


# ///////////////////////////////////////////////////////////

if __name__ == "__main__":
    app.run(debug=True)
