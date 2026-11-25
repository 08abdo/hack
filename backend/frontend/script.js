const API_URL = "/api";

let currentCategory = "all";
let categoriesList = [];
let products = [];
let cart = [];
let activeSelectedProduct = null;
let activeSelectedColor = "";
let activeSelectedSize = "";

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

// تحويل استدعاءات alert الإفتراضية إلى Toast
window.alert = function (message) {
  let iconType = "info";
  if (
    message.includes("خطأ") ||
    message.includes("تعذر") ||
    message.includes("فشل")
  ) {
    iconType = "error";
  } else if (message.includes("نجاح") || message.includes("شكراً")) {
    iconType = "success";
  } else if (
    message.includes("يرجى") ||
    message.includes("تأكد") ||
    message.includes("الرجاء") ||
    message.includes("فارغة")
  ) {
    iconType = "warning";
  }
  showToast(message, iconType);
};

document.addEventListener("DOMContentLoaded", () => {
  fetchCategoriesFromApi();
  fetchProductsFromApi();
  initTheme();
});

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

// ---------------- Fetch Categories API ----------------
async function fetchCategoriesFromApi() {
  try {
    const res = await fetch(`${API_URL}/categories`);
    if (!res.ok) throw new Error("فشل جلب الأقسام");

    categoriesList = await res.json();
    renderCategories();
  } catch (err) {
    console.error("خطأ جلب الأقسام:", err);
    categoriesList = [];
    renderCategories();
  }
}

function renderCategories() {
  const container = document.getElementById("categories-bar");
  if (!container) return;

  const allCategoryBtn = `
    <button onclick="filterCategory('all')" class="cat-btn ${currentCategory === "all" ? "active" : ""}">
      الكل
    </button>
  `;

  const dynamicCategoryBtns = categoriesList
    .map(
      (cat) => `
    <button onclick="filterCategory('${cat.name}')" class="cat-btn ${currentCategory === cat.name ? "active" : ""}">
      ${cat.name}
    </button>
  `,
    )
    .join("");

  container.innerHTML = allCategoryBtn + dynamicCategoryBtns;
}

function filterCategory(catName) {
  currentCategory = catName;
  renderCategories();

  const titleEl = document.getElementById("current-category-title");
  if (titleEl) {
    titleEl.textContent =
      catName === "all" ? "جميع المنتجات" : `قسم ${catName}`;
  }

  const filtered =
    catName === "all"
      ? products
      : products.filter((p) => p.category === catName);

  renderProducts(filtered);
}

// ---------------- Fetch Products API ----------------
async function fetchProductsFromApi() {
  const container = document.getElementById("products-grid");
  if (container) {
    container.innerHTML = `
      <div style="grid-column: 1/-1; text-align: center; padding: 3rem 0;">
        <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem; color: #4f46e5;"></i>
        <p style="margin-top: 1rem; color: #6b7280;">جاري تحميل المنتجات...</p>
      </div>
    `;
  }

  try {
    const res = await fetch(`${API_URL}/products`);
    if (!res.ok) throw new Error("فشل الاتصال بالسيرفر");

    products = await res.json();
    filterCategory(currentCategory);
  } catch (err) {
    console.error("خطأ جلب المنتجات:", err);
    renderProducts([]);
  }
}

// دالة مساعدة لمعالجة رابط الصورة سواء كانت نص أو كائن
function getProductMainImage(product) {
  if (!product.images || product.images.length === 0) return "image/logo.png";
  const imgObj = product.images[0];
  if (typeof imgObj === "string") return imgObj;
  return imgObj.src || imgObj.url || "image/logo.png";
}

function renderProducts(items) {
  const container = document.getElementById("products-grid");
  const countEl = document.getElementById("product-count");

  if (countEl) countEl.innerText = `${items.length} منتج`;
  if (!container) return;
  container.innerHTML = "";

  if (items.length === 0) {
    container.innerHTML =
      "<p class='no-products'>لا توجد منتجات حالياً في هذا القسم.</p>";
    return;
  }

  items.forEach((product) => {
    const mainImg = getProductMainImage(product);
    const title = product.name || "منتج بدون اسم";
    const desc = product.desc_text || product.description || "";
    const oldPriceDisplay = product.old_price
      ? `<del class="old-price">${product.old_price} دج</del>`
      : "";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card-img-wrapper" onclick="openProductModal('${product.id}')">
        <img src="${mainImg}" alt="${title}" class="product-img" loading="lazy" decoding="async">
      </div>
      <div class="product-body">
        <div>
          <h4 class="product-title">${title}</h4>
          <p class="product-desc">${desc}</p>
        </div>
        <div class="card-footer-row">
          <div class="price-container">
            <span class="price-tag">${product.price} دج</span>
            ${oldPriceDisplay}
          </div>
          <div class="card-actions">
            <button onclick="addToCart('${product.id}')" class="btn-icon" title="أضف للسلة">
              <i class="fa-solid fa-cart-plus"></i>
            </button>
            <button onclick="openProductModal('${product.id}')" class="btn btn-primary">
              طلب
            </button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

// ---------------- Modal & Order ----------------
function openProductModal(id) {
  const p = products.find((x) => String(x.id) === String(id));
  if (!p) return;

  activeSelectedProduct = p;
  activeSelectedColor = "";
  activeSelectedSize = "";

  const mainImg = getProductMainImage(p);

  document.getElementById("modal-title").textContent = p.name;
  document.getElementById("modal-desc").textContent =
    p.desc_text || p.description || "";
  document.getElementById("modal-price").textContent = `${p.price} دج`;
  document.getElementById("modal-img").src = mainImg;

  const colorWrapper = document.getElementById("colors-wrapper");
  const colorContainer = document.getElementById("modal-colors-container");
  colorContainer.innerHTML = "";

  const availableColors = (p.images || []).filter(
    (img) => typeof img === "object" && img.color && img.color.trim() !== "",
  );

  if (availableColors.length > 0) {
    colorWrapper.classList.remove("hidden");
    availableColors.forEach((imgObj, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-btn option-btn";
      btn.innerText = imgObj.color;

      btn.onclick = () => {
        document
          .querySelectorAll("#modal-colors-container .cat-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeSelectedColor = imgObj.color;
        if (imgObj.src) document.getElementById("modal-img").src = imgObj.src;
      };

      colorContainer.appendChild(btn);
      if (idx === 0) btn.click();
    });
  } else {
    colorWrapper.classList.add("hidden");
  }

  const sizeWrapper = document.getElementById("sizes-wrapper");
  const sizeContainer = document.getElementById("modal-sizes-container");
  sizeContainer.innerHTML = "";

  if (p.sizes && p.sizes.length > 0) {
    sizeWrapper.classList.remove("hidden");
    p.sizes.forEach((sizeVal, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cat-btn option-btn";
      btn.innerText = sizeVal;

      btn.onclick = () => {
        document
          .querySelectorAll("#modal-sizes-container .cat-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeSelectedSize = sizeVal;
      };

      sizeContainer.appendChild(btn);
      if (idx === 0) btn.click();
    });
  } else {
    sizeWrapper.classList.add("hidden");
  }

  document.getElementById("product-modal").classList.remove("hidden");
}

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
  activeSelectedProduct = null;
  activeSelectedColor = "";
  activeSelectedSize = "";
}

async function submitDirectOrder() {
  const name = document.getElementById("order-name").value.trim();
  const phone = document.getElementById("order-phone").value.trim();
  const address = document.getElementById("order-address").value.trim();

  if (!name || !phone || !address) {
    alert("يرجى ملء كافة البيانات المطلوبة (الاسم، الهاتف والعنوان).");
    return;
  }

  if (!activeSelectedProduct) return;

  const orderData = {
    customer_name: name,
    phone,
    address,
    total: activeSelectedProduct.price,
    product_name: activeSelectedProduct.name,
    product_img: document.getElementById("modal-img").src,
    color: activeSelectedColor || "افتراضي",
    size: activeSelectedSize || "غير محدد",
  };

  try {
    const res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    if (res.ok) {
      alert(`شكراً لك ${name}، تم إرسال طلبك بنجاح! سيتم تأكيد الطلب عن قريب عبر الواتساب`);
      closeProductModal();
      document.getElementById("order-name").value = "";
      document.getElementById("order-phone").value = "";
      document.getElementById("order-address").value = "";
    } else {
      alert("حدث خطأ أثناء إرسال الطلب، حاول ثانية.");
    }
  } catch (err) {
    console.error("خطأ الاتصال:", err);
    alert("تعذر الاتصال بالسيرفر.");
  }
}

// ---------------- Cart Functionality ----------------
function toggleCartModal() {
  document.getElementById("cart-modal").classList.toggle("hidden");
}

function addToCart(id) {
  const p = products.find((x) => String(x.id) === String(id));
  if (!p) return;

  const mainImg = getProductMainImage(p);
  const defaultColor =
    p.images && p.images.length > 0 && typeof p.images[0] === "object"
      ? p.images[0].color
      : "افتراضي";
  const defaultSize = p.sizes && p.sizes.length > 0 ? p.sizes[0] : "";

  const existing = cart.find(
    (item) =>
      String(item.id) === String(id) &&
      item.color === defaultColor &&
      item.size === defaultSize,
  );

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: p.id,
      name: p.name,
      price: parseFloat(p.price) || 0,
      img: mainImg,
      color: defaultColor,
      size: defaultSize,
      qty: 1,
    });
  }

  updateCartUI();
  showToast("تمت إضافة المنتج إلى السلة بنجاح!", "success");
}

function updateCartUI() {
  const cartBody = document.getElementById("cart-items");
  const cartBadge = document.getElementById("cart-badge");
  const cartTotalEl = document.getElementById("cart-total");

  const totalQty = cart.reduce((acc, item) => acc + item.qty, 0);
  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  if (cartBadge) {
    cartBadge.innerText = totalQty;
    cartBadge.classList.toggle("hidden", totalQty === 0);
  }

  if (cartTotalEl) {
    cartTotalEl.innerText = `${totalPrice.toFixed(2)} دج`;
  }

  if (cart.length === 0) {
    cartBody.innerHTML = `
      <div class="empty-cart">
        <i class="fa-solid fa-basket-shopping"></i>
        <p>السلة فارغة حالياً</p>
      </div>
    `;
    return;
  }

  cartBody.innerHTML = cart
    .map((item, idx) => {
      const sizeText = item.size ? ` | المقاس: ${item.size}` : "";
      return `
    <div class="cart-item">
      <div class="cart-item-info">
        <img src="${item.img}" class="cart-item-img" loading="lazy">
        <div>
          <strong class="cart-item-name">${item.name}</strong>
          <br><small class="text-subtle">${item.price} دج × ${item.qty}${sizeText}</small>
        </div>
      </div>
      <button onclick="removeFromCart(${idx})" class="btn-icon delete-btn" title="حذف">
        <i class="fa-solid fa-trash"></i>
      </button>
    </div>
  `;
    })
    .join("");
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
  showToast("تم إزالة المنتج من السلة", "info");
}

async function checkoutCart() {
  if (cart.length === 0) {
    alert("السلة فارغة!");
    return;
  }

  const name = document.getElementById("cart-cust-name").value.trim();
  const phone = document.getElementById("cart-cust-phone").value.trim();
  const address = document.getElementById("cart-cust-address").value.trim();

  if (!name || !phone || !address) {
    alert("يرجى ملء الاسم ورقم الهاتف والعنوان في السلة لإتمام الطلب.");
    return;
  }

  const itemsNames = cart
    .map((i) => `${i.name}${i.size ? " (" + i.size + ")" : ""} × ${i.qty}`)
    .join(" + ");
  const totalPrice = cart.reduce((acc, item) => acc + item.price * item.qty, 0);

  const orderData = {
    customer_name: name,
    phone,
    address,
    total: totalPrice.toFixed(2),
    product_name: itemsNames,
    product_img: cart[0].img,
    color: "سلة متعددة",
    size: "متعدد",
  };

  try {
    const res = await fetch(`${API_URL}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orderData),
    });

    if (res.ok) {
      alert("شكراً لك! تم إرسال الطلب بنجاح سيتم تأكيد الطلب عن قريب عبر الواتساب.");
      cart = [];
      updateCartUI();
      toggleCartModal();
      document.getElementById("cart-cust-name").value = "";
      document.getElementById("cart-cust-phone").value = "";
      document.getElementById("cart-cust-address").value = "";
    } else {
      alert("حدث خطأ أثناء الاتصال بالسيرفر.");
    }
  } catch (err) {
    console.error("خطأ:", err);
    alert("تعذر الاتصال بالسيرفر.");
  }
}
