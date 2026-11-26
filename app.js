
/* ==========================================
   HERBALIA STORE - MAIN APP
   ========================================== */

/* ---------- CONFIGURATION ---------- */

const DEFAULT_PRODUCTS = [
  {
    id: "p1",
    name: "روغن بست‌کیور",
    category: "روغن‌های گیاهی",
    price: 444000,
    description: "فرآورده روغنی",
    image: ""
  },
  {
    id: "p2",
    name: "محصولات نازله",
    category: "مراقبت و سلامت",
    price: 400000,
    description: "بسته ۳۰ عددی",
    image: ""
  },
  {
    id: "p3",
    name: "چوب صندل",
    category: "گیاهان و فرآورده‌ها",
    price: null,
    description: "برای استعلام قیمت پیام دهید",
    image: ""
  },
  {
    id: "p4",
    name: "جاوی",
    category: "گیاهان و فرآورده‌ها",
    price: null,
    description: "در رنگ‌بندی‌های مختلف",
    image: ""
  }
];

const $ = id => document.getElementById(id);

const money = n => {
  const price = Number(n);

  return n == null || !Number.isFinite(price)
    ? "استعلام قیمت"
    : new Intl.NumberFormat("fa-IR").format(price) + " تومان";
};

let products = DEFAULT_PRODUCTS;
let cart = [];
let activeCategory = "همه";

try {
  const storedCart = JSON.parse(
    localStorage.getItem("herbalia_cart") || "[]"
  );

  if (Array.isArray(storedCart)) {
    cart = storedCart
      .filter(item => item && item.id != null)
      .map(item => ({
        id: String(item.id),
        qty: Math.max(1, Number(item.qty) || 1)
      }));
  }
} catch {
  cart = [];
}


/* ---------- SUPABASE ---------- */

const CFG = window.HERBALIA_CONFIG || {};

const sb =
  CFG.SUPABASE_URL &&
  CFG.SUPABASE_ANON_KEY &&
  window.supabase
    ? window.supabase.createClient(
        CFG.SUPABASE_URL,
        CFG.SUPABASE_ANON_KEY
      )
    : null;


/* ---------- HELPERS ---------- */

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[c]));
}

function toast(message) {
  const el = $("toast");
  if (!el) return;

  el.textContent = message;
  el.classList.add("show");

  setTimeout(() => {
    el.classList.remove("show");
  }, 2400);
}

function save() {
  localStorage.setItem(
    "herbalia_cart",
    JSON.stringify(cart)
  );
}

function getProduct(id) {
  return products.find(
    p => String(p.id) === String(id)
  );
}

function getPrice(product) {
  if (!product || product.price == null || product.price === "") {
    return null;
  }

  const price = Number(product.price);

  return Number.isFinite(price) && price >= 0
    ? price
    : null;
}


/* ---------- PRODUCTS ---------- */

function renderProducts() {
  const grid = $("productGrid");
  if (!grid) return;

  const list =
    activeCategory === "همه"
      ? products
      : products.filter(
          p => p.category === activeCategory
        );

  grid.innerHTML = list.map(p => `
    <article class="product-card">

      <div class="product-image">
        ${
          p.image
            ? `<img
                src="${escapeHtml(p.image)}"
                alt="${escapeHtml(p.name)}"
                loading="lazy">`
            : `<div class="product-placeholder">
                ${escapeHtml(p.name)}
              </div>`
        }

        <span class="product-tag">
          ${escapeHtml(p.category)}
        </span>
      </div>

      <div class="product-info">
        <small>HERBALIA BOTANICAL SELECTION</small>

        <h3>${escapeHtml(p.name)}</h3>

        <div class="product-bottom">
          <span class="price">
            ${money(getPrice(p))}
          </span>

          <button
            class="add-btn"
            data-add="${escapeHtml(p.id)}">
            افزودن +
          </button>
        </div>
      </div>

    </article>
  `).join("") || "<p>محصولی در این دسته ثبت نشده است.</p>";

  grid.querySelectorAll("[data-add]").forEach(button => {
    button.onclick = () => {
      addToCart(button.dataset.add);
    };
  });
}

async function loadProducts() {
  if (!sb) {
    renderProducts();
    renderCart();
    return;
  }

  const { data, error } = await sb
    .from("products")
    .select("*")
    .order("created_at");

  if (error) {
    console.error("SUPABASE LOAD ERROR:", error);
    toast("بارگذاری محصولات با خطا مواجه شد");
    return;
  }

  products = Array.isArray(data) ? data : [];

  // حذف اقلام قدیمی که دیگر در دیتابیس وجود ندارند
  const validIds = new Set(
    products.map(p => String(p.id))
  );

  const oldLength = cart.length;

  cart = cart.filter(item =>
    validIds.has(String(item.id))
  );

  if (cart.length !== oldLength) {
    save();
    toast("سبد خرید قدیمی به‌روزرسانی شد");
  }

  renderProducts();
  renderCart();
}


/* ---------- CART ---------- */

function addToCart(id) {
  const product = getProduct(id);

  if (!product) {
    toast("محصول پیدا نشد");
    return;
  }

  const item = cart.find(
    x => String(x.id) === String(product.id)
  );

  if (item) {
    item.qty++;
  } else {
    cart.push({
      id: String(product.id),
      qty: 1
    });
  }

  save();
  renderCart();

  toast("به سبد خرید اضافه شد");
}

function renderCart() {
  const count = $("cartCount");
  const items = $("cartItems");
  const totalEl = $("cartTotal");

  const totalCount = cart.reduce(
    (sum, item) => sum + item.qty,
    0
  );

  if (count) {
    count.textContent =
      new Intl.NumberFormat("fa-IR").format(totalCount);
  }

  if (!items || !totalEl) return;

  const visibleItems = cart
    .map(item => ({
      item,
      product: getProduct(item.id)
    }))
    .filter(x => x.product);

  items.innerHTML = visibleItems.length
    ? visibleItems.map(({ item, product }) => `
        <div class="cart-line">

          <div class="cart-thumb">✧</div>

          <div>
            <h4>${escapeHtml(product.name)}</h4>

            <small>${money(getPrice(product))}</small>

            <div class="qty">
              <button
                data-qty="${escapeHtml(product.id)}"
                data-delta="-1">−</button>

              <span>${item.qty}</span>

              <button
                data-qty="${escapeHtml(product.id)}"
                data-delta="1">+</button>
            </div>
          </div>

          <button
            class="remove-line"
            data-remove="${escapeHtml(product.id)}">
            ×
          </button>

        </div>
      `).join("")
    : `
      <p style="
        font-size:12px;
        color:#858d7d;
        text-align:center;
        padding:45px 0">
        سبد خرید شما خالی است.
      </p>
    `;

  const total = visibleItems.reduce(
    (sum, { item, product }) =>
      sum + (getPrice(product) ?? 0) * item.qty,
    0
  );

  totalEl.textContent = money(total);

  items.querySelectorAll("[data-qty]").forEach(button => {
    button.onclick = () => {
      const item = cart.find(
        x => String(x.id) === String(button.dataset.qty)
      );

      if (!item) return;

      item.qty += Number(button.dataset.delta);

      if (item.qty < 1) {
        cart = cart.filter(
          x => String(x.id) !== String(button.dataset.qty)
        );
      }

      save();
      renderCart();
    };
  });

  items.querySelectorAll("[data-remove]").forEach(button => {
    button.onclick = () => {
      cart = cart.filter(
        x => String(x.id) !== String(button.dataset.remove)
      );

      save();
      renderCart();
    };
  });
}


/* ---------- CART DRAWER ---------- */

function openCart() {
  $("cartDrawer")?.classList.add("open");
  $("drawerBackdrop")?.classList.add("show");
}

function closeCart() {
  $("cartDrawer")?.classList.remove("open");
  $("drawerBackdrop")?.classList.remove("show");
}

if ($("cartOpen")) {
  $("cartOpen").onclick = openCart;
}

if ($("cartClose")) {
  $("cartClose").onclick = closeCart;
}

if ($("drawerBackdrop")) {
  $("drawerBackdrop").onclick = closeCart;
}


/* ---------- CATEGORY FILTERS ---------- */

if ($("categoryFilters")) {
  $("categoryFilters").addEventListener("click", event => {
    const button = event.target.closest("[data-category]");

    if (!button) return;

    activeCategory = button.dataset.category;

    document.querySelectorAll(".filter").forEach(el => {
      el.classList.toggle("active", el === button);
    });

    renderProducts();
  });
}


/* ---------- CHECKOUT MODAL ---------- */

const checkoutButton = $("checkoutBtn");
const checkoutModal = $("checkoutBackdrop");
const checkoutClose = $("checkoutClose");

if (checkoutButton && checkoutModal) {
  checkoutButton.onclick = () => {

    if (!cart.length) {
      toast("سبد خرید خالی است");
      return;
    }

    const unavailable = cart.some(item => {
      const product = getProduct(item.id);

      return (
        !product ||
        getPrice(product) === null
      );
    });

    if (unavailable) {
      toast("قیمت یکی از محصولات در دسترس نیست");
      return;
    }

    // بستن کامل پنجره سبد خرید
    closeCart();

    // باز کردن پنجره مستقل سفارش
    checkoutModal.classList.add("show");
  };
}

if (checkoutClose && checkoutModal) {
  checkoutClose.onclick = () => {
    checkoutModal.classList.remove("show");
  };
}

if (checkoutModal) {
  checkoutModal.addEventListener("click", event => {
    if (event.target === checkoutModal) {
      checkoutModal.classList.remove("show");
    }
  });
}


/* ---------- CHECKOUT FORM ---------- */

if ($("checkoutForm")) {
  $("checkoutForm").onsubmit = event => {
    event.preventDefault();

    toast("اتصال ثبت سفارش به دیتابیس در مرحله بعد انجام می‌شود");
  };
}


/* ---------- ADMIN PANEL ---------- */

function openAdmin() {
  $("adminBackdrop")?.classList.add("show");
}

function closeAdmin() {
  $("adminBackdrop")?.classList.remove("show");
}

if ($("adminOpen")) {
  $("adminOpen").onclick = async () => {
    openAdmin();

    if (!sb) {
      toast("اتصال Supabase تنظیم نشده است");
      return;
    }

    const { data, error } = await sb.auth.getSession();

    if (error) {
      console.error(error);
      toast("بررسی ورود مدیر ناموفق بود");
      return;
    }

    if (data.session) {
      showAdmin();
    }
  };
}

if ($("adminClose")) {
  $("adminClose").onclick = closeAdmin;
}

if ($("adminBackdrop")) {
  $("adminBackdrop").addEventListener("click", event => {
    if (event.target === $("adminBackdrop")) {
      closeAdmin();
    }
  });
}

function showAdmin() {
  $("adminLogin")?.classList.add("hidden");
  $("adminContent")?.classList.remove("hidden");

  renderAdmin();
}

if ($("adminLoginBtn")) {
  $("adminLoginBtn").onclick = async () => {

    if (!sb) {
      toast("اتصال Supabase برقرار نیست");
      return;
    }

    const { error } = await sb.auth.signInWithPassword({
      email: $("adminEmail").value.trim(),
      password: $("adminPassword").value
    });

    if (error) {
      console.error("ADMIN LOGIN ERROR:", error);
      toast("ایمیل یا رمز صحیح نیست");
      return;
    }

    showAdmin();
  };
}


/* ---------- ADMIN PRODUCTS ---------- */

function renderAdmin() {
  const container = $("adminProducts");

  if (!container) return;

  container.innerHTML = products.map(p => `
    <div class="admin-product">

      <div>
        <b>${escapeHtml(p.name)}</b>
        <br>
        <span>
          ${money(getPrice(p))} · ${escapeHtml(p.category)}
        </span>
      </div>

      <div>
        <button data-edit="${escapeHtml(p.id)}">
          ویرایش
        </button>

        <button data-del="${escapeHtml(p.id)}">
          حذف
        </button>
      </div>

    </div>
  `).join("");

  container.querySelectorAll("[data-edit]").forEach(button => {
    button.onclick = () => {
      editProduct(button.dataset.edit);
    };
  });

  container.querySelectorAll("[data-del]").forEach(button => {
    button.onclick = async () => {

      if (!confirm("این محصول حذف شود؟")) return;
      if (!sb) return;

      const { error } = await sb
        .from("products")
        .delete()
        .eq("id", button.dataset.del);

      if (error) {
        console.error(error);
        toast("حذف محصول انجام نشد");
        return;
      }

      await loadProducts();
      renderAdmin();

      toast("محصول حذف شد");
    };
  });
}


/* ---------- PRODUCT FORM ---------- */

if ($("addProductBtn")) {
  $("addProductBtn").onclick = () => {
    $("productForm").classList.remove("hidden");
    $("productForm").reset();
    $("editId").value = "";
  };
}

if ($("cancelProduct")) {
  $("cancelProduct").onclick = () => {
    $("productForm").classList.add("hidden");
  };
}

function editProduct(id) {
  const product = getProduct(id);

  if (!product) return;

  $("editId").value = product.id;
  $("pName").value = product.name;
  $("pCategory").value = product.category;
  $("pPrice").value = product.price ?? "";
  $("pImage").value = product.image || "";
  $("pDescription").value = product.description || "";

  $("productForm").classList.remove("hidden");
}


/* ---------- SAVE PRODUCT ---------- */

if ($("productForm")) {
  $("productForm").onsubmit = async event => {

    event.preventDefault();

    if (!sb) {
      toast("اتصال Supabase برقرار نیست");
      return;
    }

    const id = $("editId").value;
    let image = $("pImage").value.trim();

    const file = $("pFile")?.files?.[0];

    if (file) {

      const ext = (
        file.name.split(".").pop() || "jpg"
      ).toLowerCase();

      const path =
        Date.now() +
        "-" +
        Math.random().toString(36).slice(2, 8) +
        "." +
        ext;

      const upload = await sb
        .storage
        .from("product-images")
        .upload(path, file, {
          contentType: file.type
        });

      if (upload.error) {
        console.error(upload.error);
        toast("آپلود عکس انجام نشد");
        return;
      }

      image = sb
        .storage
        .from("product-images")
        .getPublicUrl(path)
        .data.publicUrl;
    }

    const rawPrice = $("pPrice").value.trim();

    const row = {
      name: $("pName").value.trim(),
      category: $("pCategory").value,
      price: rawPrice === "" ? null : Number(rawPrice),
      image,
      description: $("pDescription").value.trim()
    };

    if (
      row.price !== null &&
      (!Number.isFinite(row.price) || row.price < 0)
    ) {
      toast("قیمت واردشده معتبر نیست");
      return;
    }

    const result = id
      ? await sb.from("products").update(row).eq("id", id)
      : await sb.from("products").insert(row);

    if (result.error) {
      console.error("SUPABASE SAVE ERROR:", result.error);
      toast(result.error.message);
      return;
    }

    await loadProducts();
    renderAdmin();

    $("productForm").classList.add("hidden");

    toast("محصول ذخیره شد");
  };
}


/* ---------- EXPORT PRODUCTS ---------- */

if ($("exportData")) {
  $("exportData").onclick = () => {

    const blob = new Blob(
      [JSON.stringify(products, null, 2)],
      { type: "application/json" }
    );

    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "herbalia-products.json";

    link.click();

    URL.revokeObjectURL(link.href);
  };
}


/* ---------- MOBILE MENU ---------- */

if ($("menuToggle")) {
  $("menuToggle").onclick = () => {
    document.querySelector(".main-nav")?.classList.toggle("open");
  };
}

document.querySelectorAll(".main-nav a").forEach(link => {
  link.onclick = () => {
    document.querySelector(".main-nav")?.classList.remove("open");
  };
});


/* ---------- INITIALIZE ---------- */

renderProducts();
renderCart();
loadProducts();

console.log("HERBALIA STORE INITIALIZED");



