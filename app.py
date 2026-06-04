import os
import sqlite3

from flask import Flask, jsonify, request, send_from_directory, session
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash


app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "blood-shehuo-dev-secret")
CORS(app, supports_credentials=True)

DB_PATH = os.path.join(app.instance_path, "users.db")

SEED_PRODUCTS = [
    {
        "name": "「血气方刚」帆布袋",
        "category": "daily",
        "category_label": "日用",
        "price": 69,
        "image": "images/文创-帆布袋.png",
        "description": "把血社火脸谱的锋利线条压进通勤场景，红白撞色醒目，适合装书、本子和随身杂物。",
    },
    {
        "name": "血社火·沙棘饮",
        "category": "food",
        "category_label": "风味",
        "price": 12,
        "image": "images/文创-饮料.png",
        "description": "以西北沙棘风味搭配脸谱瓶身，把地方味觉与非遗视觉放在同一只瓶子里。",
    },
    {
        "name": "主题折扇与脸谱手办",
        "category": "collectible",
        "category_label": "收藏",
        "price": 89,
        "image": "images/文创-扇子.png",
        "description": "折扇呈现社火队列表演氛围，搭配同款脸谱手办，适合桌面陈列和活动伴手礼。",
    },
    {
        "name": "血社火文创糕点礼盒",
        "category": "gift food",
        "category_label": "礼赠",
        "price": 128,
        "image": "images/文创-盒子.png",
        "description": "简洁纸盒包裹中式糕点，脸谱插画让伴手礼更有地方识别度。",
    },
    {
        "name": "血社火脸谱冰箱贴",
        "category": "collectible gift",
        "category_label": "收藏",
        "price": 39,
        "image": "images/文创-冰箱贴.png",
        "description": "立体脸谱与铃铛元素组合，小体量、高识别度，适合旅游纪念和社群传播。",
    },
    {
        "name": "社火脸谱工艺杯",
        "category": "daily gift",
        "category_label": "概念款",
        "price": 99,
        "image": "",
        "description": "借鉴社火脸谱工艺杯的成熟文创方向，把脸谱色块用于杯身与礼盒包装，适合会议礼品和景区零售。",
    },
]


def get_db():
    os.makedirs(app.instance_path, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def row_to_dict(row):
    return dict(row) if row else None


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
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                category_label TEXT NOT NULL,
                price REAL NOT NULL DEFAULT 0,
                image TEXT NOT NULL DEFAULT '',
                description TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS favorites (
                user_id INTEGER NOT NULL,
                product_id INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, product_id),
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (product_id) REFERENCES products(id)
            )
            """
        )

        existing = conn.execute("SELECT COUNT(*) AS count FROM products").fetchone()["count"]
        if existing == 0:
            conn.executemany(
                """
                INSERT INTO products (name, category, category_label, price, image, description)
                VALUES (:name, :category, :category_label, :price, :image, :description)
                """,
                SEED_PRODUCTS,
            )


def current_user():
    username = session.get("user")
    if not username:
        return None
    with get_db() as conn:
        return conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()


def require_user():
    user = current_user()
    if not user:
        return None, (jsonify({"success": False, "msg": "请先登录"}), 401)
    return user, None


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
    return jsonify({"success": True, "msg": "注册成功，已自动登录", "username": username})


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()

    if user and check_password_hash(user["password_hash"], password):
        session["user"] = username
        return jsonify({"success": True, "msg": "登录成功", "username": username})

    return jsonify({"success": False, "msg": "用户名或密码错误"}), 401


@app.route("/logout", methods=["POST"])
def logout():
    session.pop("user", None)
    return jsonify({"success": True, "msg": "已退出登录"})


@app.route("/me", methods=["GET"])
def me():
    username = session.get("user")
    return jsonify({"success": bool(username), "username": username})


@app.route("/api/products", methods=["GET"])
def list_products():
    category = (request.args.get("category") or "all").strip()
    with get_db() as conn:
        if category and category != "all":
            rows = conn.execute(
                "SELECT * FROM products WHERE category LIKE ? ORDER BY id DESC",
                (f"%{category}%",),
            ).fetchall()
        else:
            rows = conn.execute("SELECT * FROM products ORDER BY id DESC").fetchall()
    return jsonify({"success": True, "products": [row_to_dict(row) for row in rows]})


@app.route("/api/products", methods=["POST"])
def create_product():
    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    category = (data.get("category") or "gift").strip()
    category_label = (data.get("category_label") or "礼赠").strip()
    image = (data.get("image") or "").strip()
    description = (data.get("description") or "").strip()

    try:
        price = float(data.get("price") or 0)
    except (TypeError, ValueError):
        return jsonify({"success": False, "msg": "价格必须是数字"}), 400

    if not name or not description:
        return jsonify({"success": False, "msg": "产品名称和介绍不能为空"}), 400

    with get_db() as conn:
        cursor = conn.execute(
            """
            INSERT INTO products (name, category, category_label, price, image, description)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (name, category, category_label, price, image, description),
        )
        product = conn.execute("SELECT * FROM products WHERE id = ?", (cursor.lastrowid,)).fetchone()

    return jsonify({"success": True, "msg": "产品已发布", "product": row_to_dict(product)}), 201


@app.route("/api/favorites", methods=["GET"])
def list_favorites():
    user, error = require_user()
    if error:
        return error

    with get_db() as conn:
        rows = conn.execute(
            """
            SELECT products.*
            FROM favorites
            JOIN products ON products.id = favorites.product_id
            WHERE favorites.user_id = ?
            ORDER BY favorites.created_at DESC
            """,
            (user["id"],),
        ).fetchall()

    return jsonify({"success": True, "favorites": [row_to_dict(row) for row in rows]})


@app.route("/api/favorites", methods=["POST"])
def add_favorite():
    user, error = require_user()
    if error:
        return error

    data = request.get_json(silent=True) or {}
    product_id = data.get("product_id")
    if not product_id:
        return jsonify({"success": False, "msg": "缺少产品 ID"}), 400

    with get_db() as conn:
        product = conn.execute("SELECT * FROM products WHERE id = ?", (product_id,)).fetchone()
        if not product:
            return jsonify({"success": False, "msg": "产品不存在"}), 404
        conn.execute(
            "INSERT OR IGNORE INTO favorites (user_id, product_id) VALUES (?, ?)",
            (user["id"], product_id),
        )

    return jsonify({"success": True, "msg": "已加入收藏", "product": row_to_dict(product)})


@app.route("/api/favorites/<int:product_id>", methods=["DELETE"])
def remove_favorite(product_id):
    user, error = require_user()
    if error:
        return error

    with get_db() as conn:
        conn.execute(
            "DELETE FROM favorites WHERE user_id = ? AND product_id = ?",
            (user["id"], product_id),
        )

    return jsonify({"success": True, "msg": "已移除收藏"})


@app.route("/")
def home():
    return send_from_directory(app.root_path, "index.html")


@app.route("/<path:path>")
def static_pages(path):
    return send_from_directory(app.root_path, path)


init_db()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
