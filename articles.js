
(() => {
  const CFG = window.HERBALIA_CONFIG || {};
  const ADMIN_ID = "41abf7b4-1a4c-4f3e-afb2-012d34543b82";

  if (!window.supabase || !CFG.SUPABASE_URL || !CFG.SUPABASE_ANON_KEY) {
    console.error("Herbalia: Supabase config is missing.");
    return;
  }

  const db = window.supabase.createClient(
    CFG.SUPABASE_URL,
    CFG.SUPABASE_ANON_KEY
  );

  const $ = (selector, root = document) => root.querySelector(selector);

  const escapeHTML = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  const slugify = value =>
    value.trim().toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-|-$/g, "") + "-" + Date.now();

  let editingId = null;

  function addStyles() {
    if ($("#herbalia-articles-style")) return;

    const style = document.createElement("style");
    style.id = "herbalia-articles-style";
    style.textContent = `
      #herbaliaArticles { margin-top:35px; padding:20px; border:1px solid #dfe5da; border-radius:16px; }
      #herbaliaArticles input, #herbaliaArticles textarea, #herbaliaArticles select {
        display:block; width:100%; box-sizing:border-box; margin:8px 0 14px;
        padding:12px; border:1px solid #d9dfd5; border-radius:9px;
        background:#fff; color:#202820; font:inherit;
      }
      #herbaliaArticles textarea { min-height:110px; resize:vertical; }
      #herbaliaArticles button {
        border:0; border-radius:9px; padding:10px 16px; margin:4px;
        cursor:pointer; font:inherit;
      }
      .ha-primary { background:#243b2d; color:white; }
      .ha-secondary { background:#e9eee5; color:#243b2d; }
      .ha-danger { background:#f8e8e5; color:#963b32; }
      .ha-item { padding:14px 0; border-bottom:1px solid #e5e9e1; }
      .ha-item img { width:75px; height:65px; object-fit:cover; border-radius:8px; vertical-align:middle; margin-left:10px; }
      #haArticleModal { display:none; position:fixed; inset:0; z-index:99999; background:#0009; overflow:auto; padding:20px; }
      #haArticleModal.open { display:block; }
      #haArticleModal > div { max-width:760px; margin:35px auto; padding:24px; background:#fbfaf6; border-radius:16px; color:#202820; line-height:2; }
      #haArticleModal img { max-width:100%; border-radius:12px; }
    `;
    document.head.appendChild(style);
  }

  function addAdminPanel() {
    const admin = $("#adminContent");
    if (!admin || $("#herbaliaArticles")) return;

    const panel = document.createElement("section");
    panel.id = "herbaliaArticles";
    panel.innerHTML = `
      <h3>مدیریت مقالات هربالیا</h3>
      <p>افزودن، ویرایش و انتشار مقالات سایت</p>

      <form id="haArticleForm">
        <input id="haTitle" placeholder="عنوان مقاله" required>
        <input id="haCategory" placeholder="دسته‌بندی مقاله" required>
        <textarea id="haSummary" placeholder="خلاصه مقاله" required></textarea>
        <textarea id="haContent" placeholder="متن کامل مقاله" required></textarea>

        <label>تصویر مقاله</label>
        <input id="haImageFile" type="file" accept="image/*">
        <input id="haImage" placeholder="یا آدرس تصویر">

        <label>وضعیت مقاله</label>
        <select id="haStatus">
          <option value="draft">پیش‌نویس</option>
          <option value="published">منتشر شده</option>
        </select>

        <button class="ha-primary" type="submit">ذخیره مقاله</button>
        <button class="ha-secondary" type="button" id="haCancel">لغو ویرایش</button>
      </form>

      <hr>
      <h3>مقالات ثبت‌شده</h3>
      <div id="haArticleList">در حال دریافت مقالات...</div>
    `;

    admin.appendChild(panel);
    $("#haArticleForm").addEventListener("submit", saveArticle);
    $("#haCancel").addEventListener("click", resetForm);
    loadAdminArticles();
  }

  async function saveArticle(event) {
    event.preventDefault();

    const { data: { user }, error: authError } = await db.auth.getUser();
    if (authError || !user || user.id !== ADMIN_ID) {
      alert("دسترسی مدیریت تأیید نشد.");
      return;
    }

    const title = $("#haTitle").value.trim();
    const category = $("#haCategory").value.trim();
    const summary = $("#haSummary").value.trim();
    const content = $("#haContent").value.trim();
    const status = $("#haStatus").value;
    const file = $("#haImageFile").files[0];

    if (!title || !category || !summary || !content) {
      alert("لطفاً همه فیلدهای ضروری را تکمیل کن.");
      return;
    }

    const button = $('#haArticleForm button[type="submit"]');
    button.disabled = true;
    button.textContent = "در حال ذخیره...";

    try {
      let image = $("#haImage").value.trim();

      if (file) {
        if (!file.type.startsWith("image/")) {
          throw new Error("فقط فایل تصویری مجاز است.");
        }

        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `articles/${Date.now()}-${safeName}`;

        const { error: uploadError } = await db.storage
          .from("product-images")
          .upload(path, file);

        if (uploadError) throw uploadError;

        const { data } = db.storage
          .from("product-images")
          .getPublicUrl(path);

        image = data.publicUrl;
      }

      const oldArticle = editingId
        ? await db.from("articles").select("published_at").eq("id", editingId).single()
        : { data: null, error: null };

      if (oldArticle.error) throw oldArticle.error;

      const article = {
        title,
        slug: slugify(title),
        category,
        summary,
        content,
        image: image || null,
        status,
        published_at: status === "published"
          ? oldArticle.data?.published_at || new Date().toISOString()
          : null,
        updated_at: new Date().toISOString()
      };

      const result = editingId
        ? await db.from("articles").update(article).eq("id", editingId)
        : await db.from("articles").insert(article);

      if (result.error) throw result.error;

      alert("مقاله با موفقیت ذخیره شد.");
      resetForm();
      await loadAdminArticles();
      await loadPublicArticles();

    } catch (error) {
      console.error(error);
      alert("خطا در ذخیره مقاله: " + (error.message || "خطای نامشخص"));
    } finally {
      button.disabled = false;
      button.textContent = "ذخیره مقاله";
    }
  }

  function resetForm() {
    editingId = null;
    $("#haArticleForm")?.reset();
    const button = $('#haArticleForm button[type="submit"]');
    if (button) button.textContent = "ذخیره مقاله";
  }

  async function loadAdminArticles() {
    const list = $("#haArticleList");
    if (!list) return;

    const { data, error } = await db
      .from("articles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      list.textContent = "خطا در دریافت مقالات: " + error.message;
      return;
    }

    if (!data?.length) {
      list.textContent = "هنوز مقاله‌ای ثبت نشده است.";
      return;
    }

    list.innerHTML = data.map(article => `
      <div class="ha-item">
        ${article.image ? `<img src="${escapeHTML(article.image)}" alt="">` : ""}
        <strong>${escapeHTML(article.title)}</strong>
        <small> — ${article.status === "published" ? "منتشر شده" : "پیش‌نویس"}</small>
        <div>
          <button class="ha-secondary" data-edit="${escapeHTML(article.id)}">ویرایش</button>
          <button class="ha-danger" data-delete="${escapeHTML(article.id)}">حذف</button>
        </div>
      </div>
    `).join("");

    list.querySelectorAll("[data-edit]").forEach(button => {
      button.addEventListener("click", () => {
        const article = data.find(item => item.id === button.dataset.edit);
        if (!article) return;

        editingId = article.id;
        $("#haTitle").value = article.title || "";
        $("#haCategory").value = article.category || "";
        $("#haSummary").value = article.summary || "";
        $("#haContent").value = article.content || "";
        $("#haImage").value = article.image || "";
        $("#haStatus").value = article.status || "draft";
        $("#haArticleForm").scrollIntoView({ behavior: "smooth" });
        $('#haArticleForm button[type="submit"]').textContent = "ذخیره تغییرات";
      });
    });

    list.querySelectorAll("[data-delete]").forEach(button => {
      button.addEventListener("click", async () => {
        if (!confirm("این مقاله حذف شود؟")) return;

        const { error } = await db
          .from("articles")
          .delete()
          .eq("id", button.dataset.delete);

        if (error) {
          alert("خطا در حذف: " + error.message);
          return;
        }

        await loadAdminArticles();
        await loadPublicArticles();
      });
    });
  }

  function createArticleModal() {
    if ($("#haArticleModal")) return;

    const modal = document.createElement("div");
    modal.id = "haArticleModal";
    modal.innerHTML = `
      <div>
        <button class="ha-secondary" id="haCloseModal">بستن ✕</button>
        <div id="haArticleDetail"></div>
      </div>
    `;
    document.body.appendChild(modal);

    $("#haCloseModal").addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", event => {
      if (event.target === modal) modal.classList.remove("open");
    });
  }

  async function loadPublicArticles() {
    const grid = $(".journal-grid");
    if (!grid) return;

    const { data, error } = await db
      .from("articles")
      .select("id,title,category,summary,content,image,published_at")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (error) {
      console.error("Article loading error:", error);
      return;
    }

    // اگر مقاله‌ای منتشر نشده، کارت‌های فعلی سایت حفظ می‌شوند.
    if (!data?.length) return;

    createArticleModal();

    grid.innerHTML = data.map(article => `
      <article class="journal-card">
        ${article.image ? `<img src="${escapeHTML(article.image)}" alt="${escapeHTML(article.title)}" loading="lazy">` : ""}
        <div>
          <small>${escapeHTML(article.category)}</small>
          <h3>${escapeHTML(article.title)}</h3>
          <p>${escapeHTML(article.summary)}</p>
          <button class="ha-primary" data-open-article="${escapeHTML(article.id)}">ادامه مطلب</button>
        </div>
      </article>
    `).join("");

    grid.querySelectorAll("[data-open-article]").forEach(button => {
      button.addEventListener("click", () => {
        const article = data.find(item => item.id === button.dataset.openArticle);
        if (!article) return;

        $("#haArticleDetail").innerHTML = `
          <small>${escapeHTML(article.category)}</small>
          <h2>${escapeHTML(article.title)}</h2>
          ${article.image ? `<img src="${escapeHTML(article.image)}" alt="${escapeHTML(article.title)}">` : ""}
          <p>${escapeHTML(article.summary)}</p>
          <div style="white-space:pre-wrap">${escapeHTML(article.content)}</div>
        `;

        $("#haArticleModal").classList.add("open");
      });
    });
  }

  async function init() {
    addStyles();
    addAdminPanel();
    await loadPublicArticles();

    db.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        addAdminPanel();
        loadAdminArticles();
      }
    });

    const admin = $("#adminContent");
    if (admin) {
      new MutationObserver(() => {
        if (admin.style.display !== "none" && getComputedStyle(admin).display !== "none") {
          addAdminPanel();
          loadAdminArticles();
        }
      }).observe(admin, {
        attributes: true,
        attributeFilter: ["style", "class"]
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
