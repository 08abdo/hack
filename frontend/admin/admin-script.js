const API_URL = "/api";

// 🔑 رمز الدخول الخاص بك (تقدر تبدلو هنا)
const ADMIN_PASSWORD = "oubaid040808oubaid";

let uploadedImages = [];
let allProducts = [];
let allCategories = [];

// ---------------- SweetAlert Toast Notification ----------------
function showToast(message, icon = "success") {
  Swal.fire({
    title: message,
    icon: icon,
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    customClass: {
      popup: "custom-toast-popup",
    },
    background: document.documentElement.classList.contains("dark")
      ? "#1e1b4b"
      : "#ffffff",
    color: document.documentElement.classList.contains("dark")
      ? "#ffffff"
      : "#1e1b4b",
  });
}

window.alert = function (message) {
  let iconType = "info";
  if (
    message.includes("خطأ") ||
    message.includes("تعذر") ||
    message.includes("فشل")
  ) {
    iconType = "error";
  } else if (message.includes("نجاح") || message.includes("تم")) {
    iconType = "success";
  } else if (message.includes("يرجى") || message.includes("تأكد")) {
    iconType = "warning";
  }
  showToast(message, iconType);
};

document.addEventListener("DOMContentLoaded", () => {
  initTheme();
  checkAuth();
});

// ---------------- Authorization ----------------
function checkAuth() {
  const isAuth = sessionStorage.getItem("admin_authenticated");
  const authModal = document.getElementById("auth-modal");
  const logoutBtn = document.getElementById("logout-btn");

  if (isAuth === "true") {
    if (authModal) authModal.classList.add("hidden");
    if (logoutBtn) logoutBtn.classList.remove("hidden");
    loadDashboardData();
  } else {
    if (authModal) authModal.classList.remove("hidden");
    if (logoutBtn) logoutBtn.classList.add("hidden");
  }
}

function handleLogin(e) {
  e.preventDefault();
  const inputPass = document.getElementById("admin-pass")?.value;

  if (inputPass === ADMIN_PASSWORD) {
    sessionStorage.setItem("admin_authenticated", "true");
    document.getElementById("auth-modal")?.classList.add("hidden");
    document.getElementById("logout-btn")?.classList.remove("hidden");
    showToast("تم تسجيل الدخول بنجاح", "success");
    loadDashboardData();
  } else {
    Swal.fire({
      icon: "error",
      title: "رمز غير صحيح",
      text: "كلمة المرور التي أدخلتها غير صحيحة!",
      confirmButtonText: "حسناً",
      background: document.documentElement.classList.contains("dark")
        ? "#1e1b4b"
        : "#ffffff",
      color: document.documentElement.classList.contains("dark")
        ? "#ffffff"
        : "#1e1b4b",
    });
  }
}

function logoutAdmin() {
  sessionStorage.removeItem("admin_authenticated");
  location.reload();
}

// ---------------- Theme Management ----------------
function initTheme() {
  const isDark = localStorage.getItem("theme") === "dark";
  if (isDark) {
    document.documentElement.classList.add("dark");
  }
  updateThemeIcons();
}

function toggleDarkMode() {
  document.documentElement.classList.toggle("dark");
  const isDark = document.documentElement.classList.contains("dark");
  localStorage.setItem("theme", isDark ? "dark" : "light");
  updateThemeIcons();
}

function updateThemeIcons() {
  const isDark = document.documentElement.classList.contains("dark");
  const sunIcon = document.getElementById("theme-sun");
  const moonIcon = document.getElementById("theme-moon");

  if (sunIcon && moonIcon) {
    sunIcon.classList.toggle("hidden", !isDark);
    moonIcon.classList.toggle("hidden", isDark);
  }
}

// ---------------- Image Processing ----------------
function previewSelectedImages(event) {
  const files = event.target.files;
  if (!files) return;

  Array.from(files).forEach((file, index) => {
    const reader = new FileReader();
    reader.onload = function (e) {
      uploadedImages.push({
        id: Date.now() + index,
        src: e.target.result,
        color: "",
      });
      renderImagePreviews();
    };
    reader.readAsDataURL(file);
  });
}

function renderImagePreviews() {
  const container = document.getElementById("images-preview-container");
  if (!container) return;
  container.innerHTML = "";

  uploadedImages.forEach((img, idx) => {
    const item = document.createElement("div");
    item.className = "preview-item";
    item.innerHTML = `
      <img src="${img.src}" alt="صورة">
      <input type="text" placeholder="اللون" value="${img.color || ""}" onchange="updateImageColor(${idx}, this.value)" class="input preview-color-input">
      <button type="button" onclick="removeImage(${idx})" class="btn-icon remove-img-btn" title="حذف الصورة">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    container.appendChild(item);
  });
}

function updateImageColor(index, colorValue) {
  if (uploadedImages[index]) {
    uploadedImages[index].color = colorValue;
  }
}

function removeImage(index) {
  uploadedImages.splice(index, 1);
  renderImagePreviews();
}

// ---------------- Modal Management ----------------
function toggleProductFormModal() {
  const modal = document.getElementById("product-form-modal");
  if (modal) modal.classList.toggle("hidden");
}

function openAddProductModal() {
  const modalTitle = document.getElementById("form-modal-title");
  const prodId = document.getElementById("product-id");
  const form = document.getElementById("product-form");

  if (modalTitle) modalTitle.innerText = "إضافة منتج جديد";
  if (prodId) prodId.value = "";
  if (form) form.reset();

  uploadedImages = [];
  renderImagePreviews();
  populateCategoryDropdown();
  toggleProductFormModal();
}

function openEditProductModal(id) {
  const p = allProducts.find((item) => item.id === id);
  if (!p) return;

  populateCategoryDropdown();

  const modalTitle = document.getElementById("form-modal-title");
  const prodId = document.getElementById("product-id");
  const prodName = document.getElementById("product-name-input");
  const prodPrice = document.getElementById("product-price-input");
  const prodOldPrice = document.getElementById("product-old-price-input");
  const prodCost = document.getElementById("product-cost-input");
  const prodCategory = document.getElementById("product-category-input");
  const prodSizes = document.getElementById("product-sizes-input");
  const prodDesc = document.getElementById("product-desc-input");

  if (modalTitle) modalTitle.innerText = "تعديل المنتج";
  if (prodId) prodId.value = p.id;
  if (prodName) prodName.value = p.name || "";
  if (prodPrice) prodPrice.value = p.price || "";
  if (prodOldPrice) prodOldPrice.value = p.old_price || "";
  if (prodCost) prodCost.value = p.cost || "";
  if (prodCategory) prodCategory.value = p.category || "";

  if (prodSizes) {
    if (Array.isArray(p.sizes)) {
      prodSizes.value = p.sizes.join(", ");
    } else if (typeof p.sizes === "string") {
      prodSizes.value = p.sizes;
    } else {
      prodSizes.value = "";
    }
  }

  if (prodDesc) prodDesc.value = p.desc_text || p.description || "";

  uploadedImages = p.images ? JSON.parse(JSON.stringify(p.images)) : [];
  renderImagePreviews();

  const modal = document.getElementById("product-form-modal");
  if (modal) modal.classList.remove("hidden");
}

// ---------------- Categories Management ----------------
async function fetchCategories() {
  try {
    const res = await fetch(`${API_URL}/categories`);
    if (!res.ok) throw new Error("فشل في جلب الأقسام");
    allCategories = await res.json();
    return allCategories;
  } catch (err) {
    console.error("خطأ في جلب الأقسام:", err);
    return [];
  }
}

async function handleSaveCategory(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const input = document.getElementById("category-name-input");
  const name = input?.value.trim();

  if (!name) {
    Swal.fire({
      icon: "warning",
      title: "تنبيه",
      text: "يرجى إدخال اسم القسم أولاً.",
      confirmButtonText: "حسناً",
    });
    return;
  }

  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_URL}/categories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });

    const data = await res.json();

    if (res.ok) {
      input.value = "";
      Swal.fire({
        icon: "success",
        title: "نجاح",
        text: "تمت إضافة القسم بنجاح!",
        timer: 1500,
        showConfirmButton: false,
      });
      await renderAdminCategories();
      populateCategoryDropdown();
    } else {
      Swal.fire({
        icon: "error",
        title: "تعذر الإضافة",
        text: data.error || "حدث خطأ أثناء إضافة القسم",
        confirmButtonText: "حسناً",
      });
    }
  } catch (err) {
    console.error("خطأ الاتصال بالسيرفر:", err);
    Swal.fire({
      icon: "error",
      title: "خطأ اتصال",
      text: "تعذر الاتصال بالسيرفر، تأكد من تشغيل الباك إند.",
      confirmButtonText: "حسناً",
    });
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function deleteCategory(id) {
  const result = await Swal.fire({
    title: "تأكيد الحذف",
    text: "هل أنت تأكد من حذف هذا القسم؟",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "نعم، احذف",
    cancelButtonText: "إلغاء",
    background: document.documentElement.classList.contains("dark")
      ? "#1e1b4b"
      : "#ffffff",
    color: document.documentElement.classList.contains("dark")
      ? "#ffffff"
      : "#1e1b4b",
  });

  if (result.isConfirmed) {
    try {
      const res = await fetch(`${API_URL}/categories/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("تم حذف القسم بنجاح", "success");
        await renderAdminCategories();
        populateCategoryDropdown();
      }
    } catch (err) {
      console.error("خطأ حذف القسم:", err);
    }
  }
}

async function renderAdminCategories() {
  const categories = await fetchCategories();
  const container = document.getElementById("categories-badges-list");
  if (!container) return;

  container.innerHTML = "";

  if (categories.length === 0) {
    container.innerHTML = `<small class="text-subtle">لا توجد أقسام حالياً. أضف قسماً ليرتبط بالمنتجات.</small>`;
    return;
  }

  categories.forEach((cat) => {
    const badge = document.createElement("div");
    badge.className = "pill";
    badge.style.display = "inline-flex";
    badge.style.alignItems = "center";
    badge.style.gap = "8px";
    badge.style.padding = "6px 12px";
    badge.innerHTML = `
      <span>${cat.name}</span>
      <button onclick="deleteCategory(${cat.id})" style="background:none; border:none; color:#ef4444; cursor:pointer;" title="حذف">
        <i class="fa-solid fa-xmark"></i>
      </button>
    `;
    container.appendChild(badge);
  });
}

function populateCategoryDropdown() {
  const select = document.getElementById("product-category-input");
  if (!select) return;

  select.innerHTML = `<option value="">-- اختر القسم --</option>`;

  allCategories.forEach((cat) => {
    const opt = document.createElement("option");
    opt.value = cat.name;
    opt.textContent = cat.name;
    select.appendChild(opt);
  });
}

// ---------------- API Calls ----------------
async function fetchProducts() {
  try {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error("فشل في جلب المنتجات");
    allProducts = await res.json();
    return allProducts;
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function fetchOrders() {
  try {
    const res = await fetch(`${API_URL}/orders`);
    if (!res.ok) throw new Error("فشل في جلب الطلبات");
    return await res.json();
  } catch (err) {
    console.error(err);
    return [];
  }
}

async function handleSaveProduct(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');

  const id = document.getElementById("product-id")?.value || "";
  const name =
    document.getElementById("product-name-input")?.value.trim() || "";
  const price =
    parseFloat(document.getElementById("product-price-input")?.value) || 0;
  const oldPrice =
    parseFloat(document.getElementById("product-old-price-input")?.value) ||
    null;
  const cost =
    parseFloat(document.getElementById("product-cost-input")?.value) || 0;
  const category =
    document.getElementById("product-category-input")?.value.trim() || "";
  const desc =
    document.getElementById("product-desc-input")?.value.trim() || "";

  const rawSizes = document.getElementById("product-sizes-input")?.value || "";
  const sizes = rawSizes
    ? rawSizes
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
    : [];

  const productData = {
    name,
    price,
    old_price: oldPrice,
    cost,
    category,
    sizes,
    images:
      uploadedImages.length > 0
        ? uploadedImages
        : [{ src: "image/logo.png", color: "افتراضي" }],
    desc_text: desc,
  };

  const url = id ? `${API_URL}/products/${id}` : `${API_URL}/products`;
  const method = id ? "PUT" : "POST";

  if (submitBtn) submitBtn.disabled = true;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productData),
    });

    if (res.ok) {
      toggleProductFormModal();
      document.getElementById("product-form")?.reset();
      uploadedImages = [];
      renderImagePreviews();
      showToast(
        id ? "تم تعديل المنتج بنجاح!" : "تمت إضافة المنتج بنجاح!",
        "success",
      );
      await loadDashboardData();
    } else {
      alert("حدث خطأ أثناء حفظ/تعديل المنتج");
    }
  } catch (err) {
    console.error("خطأ الاتصال بالسيرفر:", err);
    alert("تعذر الاتصال بالسيرفر");
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

async function renderAdminProducts() {
  const products = await fetchProducts();
  const tbody = document.getElementById("admin-products-list");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (products.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">لا توجد منتجات حالياً</td></tr>`;
    return;
  }

  products.forEach((p) => {
    const mainImg =
      p.images && p.images.length > 0 ? p.images[0].src : "image/logo.png";
    const oldPriceDisplay = p.old_price
      ? `<del class="old-price">${p.old_price} دج</del>`
      : "";

    const sizesDisplay =
      p.sizes && p.sizes.length > 0
        ? p.sizes.map((s) => `<span class="pill">${s}</span>`).join(" ")
        : "<small class='text-subtle'>لا يوجد</small>";

    const calculatedProfit =
      p.profit !== undefined ? p.profit : (p.price || 0) - (p.cost || 0);

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><img src="${mainImg}" alt="${p.name}" class="table-img"></td>
      <td><strong>${p.name}</strong><br><small class="text-subtle">${p.images ? p.images.length : 0} صور/ألوان</small></td>
      <td><span class="pill">${p.category || "غير محدد"}</span></td>
      <td>${sizesDisplay}</td>
      <td><strong>${p.price} دج</strong> ${oldPriceDisplay}</td>
      <td><span class="profit-text">+${calculatedProfit.toFixed(2)} دج</span></td>
      <td>
        <div class="action-btns">
          <button onclick="openEditProductModal(${p.id})" class="btn-icon" style="color: #3b82f6;" title="تعديل">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button onclick="deleteProduct(${p.id})" class="btn-icon" style="color: #ef4444;" title="حذف">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function renderAdminOrders() {
  const orders = await fetchOrders();
  const tbody = document.getElementById("admin-orders-list");
  if (!tbody) return;
  tbody.innerHTML = "";

  if (orders.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;">لا توجد طلبات حالياً</td></tr>`;
    return;
  }

  orders.forEach((o) => {
    let statusClass = "status-pending";
    if (o.status === "تم التوصيل") statusClass = "status-completed";
    if (o.status === "ملغى") statusClass = "status-cancelled";

    const colorBadge = o.color
      ? `<span class="pill">اللون: ${o.color}</span>`
      : "";
    const sizeBadge = o.size
      ? `<span class="pill">المقاس: ${o.size}</span>`
      : "";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${o.order_code || "#ORD-" + o.id}</strong></td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${o.product_img || "image/logo.png"}" alt="المنتج" class="table-img">
          <div>
            <strong>${o.product_name || "منتج غير محدد"}</strong><br>
            ${colorBadge} ${sizeBadge}
          </div>
        </div>
      </td>
      <td>${o.customer_name || o.customer || ""}</td>
      <td>${o.phone || ""}</td>
      <td>${o.address || ""}</td>
      <td><strong>${o.total || 0} دج</strong></td>
      <td><span class="status-badge ${statusClass}">${o.status || "قيد الانتظار"}</span></td>
      <td>
        <div class="action-btns">
          <button onclick="changeOrderStatus(${o.id}, 'تم التوصيل')" class="btn-icon" style="color: #22c55e;" title="تأكيد التوصيل">
            <i class="fa-solid fa-check"></i>
          </button>
          <button onclick="changeOrderStatus(${o.id}, 'ملغى')" class="btn-icon" style="color: #ef4444;" title="إلغاء الطلب">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function deleteProduct(id) {
  const result = await Swal.fire({
    title: "تأكيد الحذف",
    text: "هل أنت تأكد من حذف هذا المنتج؟",
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor: "#ef4444",
    cancelButtonColor: "#6b7280",
    confirmButtonText: "نعم، احذف",
    cancelButtonText: "إلغاء",
    background: document.documentElement.classList.contains("dark")
      ? "#1e1b4b"
      : "#ffffff",
    color: document.documentElement.classList.contains("dark")
      ? "#ffffff"
      : "#1e1b4b",
  });

  if (result.isConfirmed) {
    try {
      const res = await fetch(`${API_URL}/products/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("تم حذف المنتج بنجاح", "success");
        await loadDashboardData();
      }
    } catch (err) {
      console.error("خطأ الحذف:", err);
    }
  }
}

async function changeOrderStatus(orderId, newStatus) {
  try {
    const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      showToast(`تم تغيير حالة الطلب إلى: ${newStatus}`, "info");
      await renderAdminOrders();
    }
  } catch (err) {
    console.error("خطأ تغيير الحالة:", err);
  }
}

async function updateStats() {
  const products = await fetchProducts();
  const orders = await fetchOrders();

  const statOrders = document.getElementById("stat-orders");
  const statProducts = document.getElementById("stat-products");
  const statSales = document.getElementById("stat-sales");

  if (statOrders) statOrders.innerText = orders.length;
  if (statProducts) statProducts.innerText = products.length;

  const totalProfit = products.reduce((acc, curr) => {
    const profit =
      curr.profit !== undefined
        ? parseFloat(curr.profit)
        : (parseFloat(curr.price) || 0) - (parseFloat(curr.cost) || 0);
    return acc + (profit || 0);
  }, 0);

  if (statSales) statSales.innerText = `${totalProfit.toFixed(2)} دج`;
}

async function loadDashboardData() {
  await renderAdminCategories();
  await renderAdminProducts();
  await renderAdminOrders();
  await updateStats();
}
