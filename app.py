import os
import sqlite3

from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash


app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "blood-shehuo-dev-secret")
CORS(app, supports_credentials=True)

DB_PATH = os.path.join(app.instance_path, "users.db")


def get_db():
    os.makedirs(app.instance_path, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_db() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    if not username or not password:
        return jsonify({"success": False, "msg": "用户名和密码不能为空"}), 400
    if len(password) < 6:
        return jsonify({"success": False, "msg": "密码至少需要 6 位"}), 400

    try:
        with get_db() as conn:
            conn.execute(
                "INSERT INTO users (username, password_hash) VALUES (?, ?)",
                (username, generate_password_hash(password)),
            )
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "msg": "用户名已存在"}), 409

    session["user"] = username
    return jsonify({"success": True, "msg": "注册成功，已自动登录"})


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

    if user and check_password_hash(user["password_hash"], password):
        session["user"] = username
        return jsonify({"success": True, "msg": "登录成功"})

    return jsonify({"success": False, "msg": "用户名或密码错误"}), 401


@app.route("/me", methods=["GET"])
def me():
    username = session.get("user")
    return jsonify({"success": bool(username), "username": username})


@app.route("/")
def home():
    return send_from_directory(app.root_path, "index.html")


@app.route("/<path:path>")
def static_pages(path):
    return send_from_directory(app.root_path, path)


if __name__ == "__main__":
    init_db()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
