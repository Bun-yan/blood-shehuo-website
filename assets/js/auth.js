const API_BASE = window.location.origin;
const USE_API = !window.location.hostname.endsWith("github.io");

const fallbackProducts = [
    {
        id: 1,
        name: "「血气方刚」帆布袋",
        category: "daily",
        category_label: "日用",
        price: 69,
        image: "images/文创-帆布袋.png",
        description: "把血社火脸谱的锋利线条压进通勤场景，红白撞色醒目，适合装书、本子和随身杂物。"
    },
    {
        id: 2,
        name: "血社火·沙棘饮",
        category: "food",
        category_label: "风味",
        price: 12,
        image: "images/文创-饮料.png",
        description: "以西北沙棘风味搭配脸谱瓶身，把地方味觉与非遗视觉放在同一只瓶子里。"
    },
    {
        id: 3,
        name: "主题折扇与脸谱手办",
        category: "collectible",
        category_label: "收藏",
        price: 89,
        image: "images/文创-扇子.png",
        description: "折扇呈现社火队列表演氛围，搭配同款脸谱手办，适合桌面陈列和活动伴手礼。"
    },
    {
        id: 4,
        name: "血社火文创糕点礼盒",
        category: "gift food",
        category_label: "礼赠",
        price: 128,
        image: "images/文创-盒子.png",
        description: "简洁纸盒包裹中式糕点，脸谱插画让伴手礼更有地方识别度。"
    },
    {
        id: 5,
        name: "血社火脸谱冰箱贴",
        category: "collectible gift",
        category_label: "收藏",
        price: 39,
        image: "images/文创-冰箱贴.png",
        description: "立体脸谱与铃铛元素组合，小体量、高识别度，适合旅游纪念和社群传播。"
    },
    {
        id: 6,
        name: "社火脸谱工艺杯",
        category: "daily gift",
        category_label: "概念款",
        price: 99,
        image: "",
        description: "借鉴社火脸谱工艺杯的成熟文创方向，把脸谱色块用于杯身与礼盒包装，适合会议礼品和景区零售。"
    }
];

const state = {
    mode: "login",
    user: localStorage.getItem("bloodShehuoUser") || "",
    products: fallbackProducts,
    activeFilter: "all",
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

async function requestJSON(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options
    });
    const data = await response.json();
    if (!response.ok) {
        throw data;
    }
    return data;
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
    state.user = username || "";
    if (state.user) {
        localStorage.setItem("bloodShehuoUser", state.user);
    } else {
        localStorage.removeItem("bloodShehuoUser");
    }
    renderProfile();
}

function productCard(product) {
    const image = product.image
        ? `<img src="${product.image}" alt="${product.name}">`
        : `<div class="concept-art">杯</div>`;

    return `
        <article class="product-card" data-category="${product.category}">
            ${image}
            <div class="product-info">
                <div class="product-meta">
                    <span>${product.category_label}</span>
                    <strong>¥${Number(product.price).toFixed(0)}</strong>
                </div>
                <h2>${product.name}</h2>
                <p>${product.description}</p>
                <button class="btn add-favorite" type="button" data-product-id="${product.id}" data-name="${product.name}">加入收藏</button>
            </div>
        </article>
    `;
}

function renderProducts() {
    const grid = document.getElementById("product-grid");
    if (!grid) {
        return;
    }

    const products = state.activeFilter === "all"
        ? state.products
        : state.products.filter((product) => product.category.includes(state.activeFilter));

    if (!products.length) {
        grid.innerHTML = `<p class="empty-state">暂时没有这个分类的产品。</p>`;
        return;
    }
    grid.innerHTML = products.map(productCard).join("");
}

async function loadProducts() {
    if (!document.getElementById("product-grid")) {
        return;
    }

    if (!USE_API) {
        renderProducts();
        return;
    }

    try {
        const data = await requestJSON(`/api/products?category=${state.activeFilter}`);
        state.products = data.products;
    } catch (error) {
        showToast("产品接口暂不可用，已显示静态数据");
    }
    renderProducts();
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

function renderFavorites(items = null) {
    const list = document.getElementById("collection-list");
    if (!list) {
        return;
    }

    const products = items || state.favorites
        .map((id) => state.products.find((product) => String(product.id) === String(id)))
        .filter(Boolean);

    if (!products.length) {
        list.innerHTML = `<li><span>还没有收藏，去文创页点“加入收藏”试试。</span></li>`;
        return;
    }

    list.innerHTML = products.map((product) => `
        <li>
            <span>${product.name}</span>
            <button class="delete-btn" type="button" data-delete-id="${product.id}">删除</button>
        </li>
    `).join("");
}

async function loadFavorites() {
    if (!document.getElementById("collection-list")) {
        return;
    }

    if (!USE_API || !state.user) {
        renderFavorites();
        return;
    }

    try {
        const data = await requestJSON("/api/favorites");
        renderFavorites(data.favorites);
    } catch (error) {
        renderFavorites();
    }
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
                ? await requestJSON(state.mode === "login" ? "/login" : "/register", {
                    method: "POST",
                    body: JSON.stringify({ username, password })
                })
                : localAuth(state.mode, username, password);

            showToast(data.msg);
            if (data.success) {
                setUser(username);
                await loadFavorites();
                if (state.mode === "register") {
                    tabs[0]?.click();
                }
            }
        } catch (error) {
            showToast(error.msg || "操作失败");
        }
    });
}

function initProfileActions() {
    document.getElementById("logout-button")?.addEventListener("click", async () => {
        if (USE_API) {
            await requestJSON("/logout", { method: "POST", body: "{}" }).catch(() => null);
        }
        setUser("");
        renderFavorites([]);
        showToast("已退出登录");
    });

    document.getElementById("save-settings")?.addEventListener("click", () => {
        showToast("设置已保存到当前浏览器");
    });

    document.getElementById("collection-list")?.addEventListener("click", async (event) => {
        const target = event.target.closest("[data-delete-id]");
        if (!target) {
            return;
        }
        const productId = target.dataset.deleteId;

        if (USE_API && state.user) {
            await requestJSON(`/api/favorites/${productId}`, { method: "DELETE" }).catch((error) => showToast(error.msg || "删除失败"));
            await loadFavorites();
        } else {
            state.favorites = state.favorites.filter((id) => String(id) !== String(productId));
            saveFavorites();
            renderFavorites();
        }
        showToast("已移除收藏");
    });
}

function initProducts() {
    document.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", async () => {
            state.activeFilter = chip.dataset.filter;
            document.querySelectorAll(".chip").forEach((item) => item.classList.toggle("active", item === chip));
            await loadProducts();
        });
    });

    document.getElementById("product-grid")?.addEventListener("click", async (event) => {
        const button = event.target.closest(".add-favorite");
        if (!button) {
            return;
        }

        const productId = button.dataset.productId;
        const name = button.dataset.name;

        if (USE_API) {
            if (!state.user) {
                showToast("请先登录后再收藏");
                return;
            }
            try {
                const data = await requestJSON("/api/favorites", {
                    method: "POST",
                    body: JSON.stringify({ product_id: productId })
                });
                showToast(data.msg);
            } catch (error) {
                showToast(error.msg || "收藏失败");
            }
        } else {
            if (!state.favorites.includes(productId)) {
                state.favorites.unshift(productId);
                saveFavorites();
            }
            showToast(`已收藏：${name}`);
        }
    });
}

function initProductForm() {
    const form = document.getElementById("product-form");
    if (!form) {
        return;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const product = Object.fromEntries(formData.entries());

        if (!USE_API) {
            product.id = Date.now();
            state.products.unshift(product);
            renderProducts();
            form.reset();
            showToast("公开静态版已临时添加，刷新后会恢复");
            return;
        }

        try {
            const data = await requestJSON("/api/products", {
                method: "POST",
                body: JSON.stringify(product)
            });
            state.products.unshift(data.product);
            renderProducts();
            form.reset();
            showToast(data.msg);
        } catch (error) {
            showToast(error.msg || "产品发布失败");
        }
    });
}

async function syncSession() {
    if (!USE_API) {
        renderProfile();
        return;
    }

    try {
        const data = await requestJSON("/me");
        setUser(data.username || "");
    } catch (error) {
        renderProfile();
    }
}

(async function init() {
    initAuthForm();
    initProfileActions();
    initProducts();
    initProductForm();
    await syncSession();
    await loadProducts();
    await loadFavorites();
})();
