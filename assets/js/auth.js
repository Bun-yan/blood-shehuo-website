const API_BASE = "http://127.0.0.1:5000";
const USE_API = ["127.0.0.1", "localhost"].includes(window.location.hostname);
const state = {
    mode: "login",
    user: localStorage.getItem("bloodShehuoUser") || "",
    favorites: JSON.parse(localStorage.getItem("bloodShehuoFavorites") || "[]"),
    accounts: JSON.parse(localStorage.getItem("bloodShehuoAccounts") || "{}")
};

function saveFavorites() {
    localStorage.setItem("bloodShehuoFavorites", JSON.stringify(state.favorites));
}

function saveAccounts() {
    localStorage.setItem("bloodShehuoAccounts", JSON.stringify(state.accounts));
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) {
        return;
    }
    toast.textContent = message;
    toast.classList.add("show");
    window.setTimeout(() => toast.classList.remove("show"), 2200);
}

async function postJSON(path, payload) {
    const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    return response.json();
}

function localAuth(mode, username, password) {
    if (mode === "register") {
        if (state.accounts[username]) {
            return { success: false, msg: "用户名已存在" };
        }
        if (password.length < 6) {
            return { success: false, msg: "密码至少需要 6 位" };
        }
        state.accounts[username] = password;
        saveAccounts();
        return { success: true, msg: "注册成功，已自动登录" };
    }

    if (state.accounts[username] === password) {
        return { success: true, msg: "登录成功" };
    }
    return { success: false, msg: "用户名或密码错误" };
}

function setUser(username) {
    state.user = username;
    if (username) {
        localStorage.setItem("bloodShehuoUser", username);
    } else {
        localStorage.removeItem("bloodShehuoUser");
    }
    renderProfile();
}

function renderProfile() {
    const status = document.getElementById("auth-status");
    const name = document.getElementById("member-name");
    const avatar = document.getElementById("member-avatar");

    if (status) {
        status.textContent = state.user ? `已登录：${state.user}` : "当前未登录";
    }
    if (name) {
        name.textContent = state.user || "访客";
    }
    if (avatar) {
        avatar.textContent = state.user ? state.user.slice(0, 1).toUpperCase() : "未";
    }
}

function renderFavorites() {
    const list = document.getElementById("collection-list");
    if (!list) {
        return;
    }

    const defaults = ["血社火脸谱绘制技艺", "传统艺人访谈", "血社火历史渊源"];
    const items = [...new Set([...state.favorites, ...defaults])];
    list.innerHTML = items.map((item) => `
        <li>
            <span>${item}</span>
            <button class="delete-btn" type="button" data-delete="${item}">删除</button>
        </li>
    `).join("");
}

function initAuthForm() {
    const form = document.getElementById("auth-form");
    const tabs = document.querySelectorAll(".auth-tab");
    const submit = document.getElementById("auth-submit");
    const confirmGroup = document.querySelector(".register-only");

    tabs.forEach((tab) => {
        tab.addEventListener("click", () => {
            state.mode = tab.dataset.authMode;
            tabs.forEach((item) => item.classList.toggle("active", item === tab));
            if (submit) {
                submit.textContent = state.mode === "login" ? "登录" : "注册";
            }
            if (confirmGroup) {
                confirmGroup.classList.toggle("hidden", state.mode !== "register");
            }
        });
    });

    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const username = document.getElementById("username").value.trim();
        const password = document.getElementById("password").value.trim();
        const confirm = document.getElementById("confirm-password")?.value.trim();

        if (!username || !password) {
            showToast("请输入用户名和密码");
            return;
        }
        if (state.mode === "register" && password !== confirm) {
            showToast("两次输入的密码不一致");
            return;
        }

        try {
            const data = USE_API
                ? await postJSON(state.mode === "login" ? "/login" : "/register", { username, password })
                : localAuth(state.mode, username, password);
            showToast(data.msg);
            if (data.success) {
                setUser(username);
                if (state.mode === "register") {
                    tabs[0]?.click();
                }
            }
        } catch (error) {
            const data = localAuth(state.mode, username, password);
            showToast(`${data.msg}（本地预览模式）`);
            if (data.success) {
                setUser(username);
            }
        }
    });
}

function initProfileActions() {
    document.getElementById("logout-button")?.addEventListener("click", () => {
        setUser("");
        showToast("已退出登录");
    });

    document.getElementById("save-settings")?.addEventListener("click", () => {
        showToast("设置已保存到当前浏览器");
    });

    document.getElementById("collection-list")?.addEventListener("click", (event) => {
        const target = event.target.closest("[data-delete]");
        if (!target) {
            return;
        }
        state.favorites = state.favorites.filter((item) => item !== target.dataset.delete);
        saveFavorites();
        renderFavorites();
        showToast("已移除收藏");
    });
}

function initProducts() {
    document.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => {
            const filter = chip.dataset.filter;
            document.querySelectorAll(".chip").forEach((item) => item.classList.toggle("active", item === chip));
            document.querySelectorAll(".product-card").forEach((card) => {
                const categories = card.dataset.category || "";
                card.hidden = filter !== "all" && !categories.includes(filter);
            });
        });
    });

    document.querySelectorAll(".add-favorite").forEach((button) => {
        button.addEventListener("click", () => {
            const name = button.dataset.name;
            if (!state.favorites.includes(name)) {
                state.favorites.unshift(name);
                saveFavorites();
            }
            showToast(`已收藏：${name}`);
        });
    });
}

initAuthForm();
initProfileActions();
initProducts();
renderProfile();
renderFavorites();
