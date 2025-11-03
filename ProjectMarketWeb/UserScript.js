/* UserScript.js - Hoàn thiện đầy đủ */
document.addEventListener("DOMContentLoaded", () => {
  // ----- Helpers -----
  function parsePrice(value) {
    if (typeof value === "number") return value;
    if (!value) return 0;
    const digits = String(value).replace(/[^0-9]/g, "");
    return digits ? parseInt(digits, 10) : 0;
  }

  function formatPrice(value) {
    return parsePrice(value).toLocaleString("vi-VN");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ----- DOM Elements -----
  const loginBtn = document.getElementById("login-btn");
  const loginPopup = document.getElementById("login-popup");
  const closeLoginPopup = document.getElementById("close-login-popup");

  const modal = document.getElementById("modal-toggle");
  const openRegister = document.getElementById("open-register-form");
  const turnbackButton = document.getElementById("turnback");
  const registerButton = document.getElementById("register");

  const productFormPopup = document.getElementById("product-form-popup");
  const openProductFormBtn = document.getElementById("open-product-form-btn");
  const closeProductFormPopup = document.getElementById(
    "close-product-form-popup"
  );
  const productForm = document.getElementById("productForm");

  const productList = document.getElementById("productList");

  const searchInput = document.getElementById("searchInput");
  const searchBtn = document.getElementById("searchBtn");

  const cartBtn = document.getElementById("cartShop");
  const cartMenu = document.getElementById("cartMenu");
  const cartItemsEl = document.getElementById("cartItems");
  const totalPriceEl = document.getElementById("totalPrice");
  const checkoutBtn = document.getElementById("checkoutBtn");

  const checkoutPopup = document.getElementById("checkout-popup");
  const closeCheckoutPopup = document.getElementById("close-checkout-popup");
  const confirmCheckoutBtn = document.getElementById("confirm-checkout");
  const cancelCheckoutBtn = document.getElementById("cancel-checkout");
  const checkoutItemsEl = document.getElementById("checkout-items");
  const checkoutTotalEl = document.getElementById("checkout-total");

  const usernameDisplay = document.getElementById("username-display");
  const displayedUsername = document.getElementById("displayed-username");

  const userPopup = document.getElementById("user-popup");
  const closeUserPopup = document.getElementById("close-user-popup");
  const popupUsername = document.getElementById("popup-username");
  const logoutBtn = document.getElementById("logout-btn");

  const filterProductName = document.getElementById("filterProductName");
  const filterProductCategory = document.getElementById(
    "filterProductCategory"
  );
  const filterPriceMin = document.getElementById("filterPriceMin");
  const filterPriceMax = document.getElementById("filterPriceMax");
  const applyFilterBtn = document.getElementById("applyFilterBtn");
  const clearFilterBtn = document.getElementById("clearFilterBtn");
  // ----- Storage initialization -----
  if (localStorage.getItem("isLoggedIn") === null)
    localStorage.setItem("isLoggedIn", "false");
  // ----- Users -----
  let users = [];
  const STORAGE_KEY = "userAccounts";

  function loadUsers() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) users = JSON.parse(stored);
  }
  loadUsers();
  // ----- Products -----
  let products = [];
  const PRODUCTS_KEY = "products";
  const storedProducts = localStorage.getItem(PRODUCTS_KEY);

  if (storedProducts) {
    try {
      products = JSON.parse(storedProducts);
    } catch (e) {
      products = [];
    }
  } else {
    const placeholderImg = `data:image/svg+xml;utf8,${encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#f2f2f2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="28">No Image</text></svg>'
    )}`;

    products = [];
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  // ----- Cart -----
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  // ----- Invoices -----
  let invoices = JSON.parse(localStorage.getItem("invoices")) || [];

  // ----- Render Products -----
  function renderProducts(list = products) {
    productList.innerHTML = "";
    if (!list || list.length === 0) {
      productList.innerHTML =
        '<p style="padding:20px; text-align:center; color:#666">Không có sản phẩm nào.</p>';
      return;
    }

    list.forEach((product, index) => {
      const wrapper = document.createElement("div");
      wrapper.className = "product-card";

      const imageDiv = document.createElement("div");
      imageDiv.className = "home-product-item__img";
      if (product.image) {
        imageDiv.style.backgroundImage = `url("${product.image}")`;
      } else {
        imageDiv.style.background = "#f2f2f2";
      }

      const infoDiv = document.createElement("div");
      infoDiv.className = "info";
      infoDiv.innerHTML = `
        <div>
          <h4 class="home-product-item__name">${escapeHtml(product.name)}</h4>
          <div class="home-product-item__price">
            <span class="home-product-item__price-current">${formatPrice(
              product.value
            )}đ</span>
          </div>
          <div class="home-product-item__action">Số lượng: <span class="home-product-item__sold">${
            product.quantity
          }</span></div>
        </div>
      `;

      const buyBtn = document.createElement("button");
      buyBtn.className = "buy-btn";
      buyBtn.textContent = "Mua ngay";
      buyBtn.onclick = () => buyProduct(index);

      const addCartBtn = document.createElement("button");
      addCartBtn.className = "add-to-cart";
      addCartBtn.textContent = "Thêm vào giỏ";
      addCartBtn.onclick = () => addToCart(product.name, product.value);

      wrapper.appendChild(imageDiv);
      wrapper.appendChild(infoDiv);
      wrapper.appendChild(buyBtn);
      wrapper.appendChild(addCartBtn);

      productList.appendChild(wrapper);
    });
  }

  // ----- Product Form -----
  let editingIndex = null;

  if (productForm) {
    productForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("name").value;
      const value = document.getElementById("value").value;
      const quantity = document.getElementById("quantity").value;
      const category = document.getElementById("category").value;
      const file = document.getElementById("image").files[0];

      function pushProduct(imageData) {
        if (editingIndex !== null) {
          products[editingIndex] = {
            name,
            value: parsePrice(value),
            quantity: parseInt(quantity || 0),
            category,
            image: imageData || products[editingIndex].image,
          };
          editingIndex = null;
        } else {
          products.push({
            name,
            value: parsePrice(value),
            quantity: parseInt(quantity || 0),
            category,
            image: imageData || "",
          });
        }
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        renderProducts();
        productForm.reset();
        if (productFormPopup) productFormPopup.style.display = "none";
        alert("Lưu sản phẩm thành công!");
      }

      if (file) {
        const reader = new FileReader();
        reader.onload = () => pushProduct(reader.result);
        reader.readAsDataURL(file);
      } else {
        pushProduct("");
      }
    });
  }

  // ----- Search -----
  if (searchBtn && searchInput) {
    searchBtn.addEventListener("click", () => {
      const keyword = searchInput.value.toLowerCase().trim();
      const filtered = products.filter((p) =>
        p.name.toLowerCase().includes(keyword)
      );
      renderProducts(filtered);
    });

    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Enter") searchBtn.click();
    });
  }

  // ----- Filter -----
  function applyFilters() {
    const nameFilter = (filterProductName?.value || "").toLowerCase().trim();
    const categoryFilter = (filterProductCategory?.value || "")
      .toLowerCase()
      .trim();
    const minPrice = parseFloat(filterPriceMin?.value) || 0;
    const maxPrice = parseFloat(filterPriceMax?.value) || Infinity;

    const filtered = products.filter((product) => {
      const name = (product.name || "").toLowerCase();
      const cat = (product.category || "").toLowerCase();
      const price = parsePrice(product.value);
      return (
        name.includes(nameFilter) &&
        cat.includes(categoryFilter) &&
        price >= minPrice &&
        price <= maxPrice
      );
    });
    renderProducts(filtered);
  }

  if (applyFilterBtn) applyFilterBtn.addEventListener("click", applyFilters);

  if (clearFilterBtn) {
    clearFilterBtn.addEventListener("click", () => {
      if (filterProductName) filterProductName.value = "";
      if (filterProductCategory) filterProductCategory.value = "";
      if (filterPriceMin) filterPriceMin.value = "";
      if (filterPriceMax) filterPriceMax.value = "";
      renderProducts(products);
    });
  }

  // ----- Cart Functions -----
  function renderCart() {
    if (!cartItemsEl) return;
    cartItemsEl.innerHTML = "";
    let total = 0;

    cart.forEach((p) => {
      const li = document.createElement("li");
      li.setAttribute("data-price", p.value);
      li.innerHTML = `
        ${escapeHtml(p.name)} - ${Number(p.value).toLocaleString()}đ
        <div class="quantity">
          <button onclick="changeQty('${escapeHtml(p.name)}', -1)">-</button>
          <span class="count">${p.quantity}</span>
          <button onclick="changeQty('${escapeHtml(p.name)}', 1)">+</button>
        </div>
      `;
      cartItemsEl.appendChild(li);
      total += p.value * p.quantity;
    });

    if (totalPriceEl) totalPriceEl.textContent = total.toLocaleString();
  }

  window.changeQty = function (name, delta) {
    const item = cart.find((i) => i.name === name);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) cart = cart.filter((i) => i.name !== name);
    localStorage.setItem("cart", JSON.stringify(cart));
    renderCart();
  };

  function addToCart(name, value) {
    if (localStorage.getItem("isLoggedIn") !== "true") {
      alert("Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng!");
      return;
    }
    const existing = cart.find((c) => c.name === name);
    if (existing) {
      existing.quantity++;
    } else {
      cart.push({ name, value, quantity: 1 });
    }
    localStorage.setItem("cart", JSON.stringify(cart));
    renderCart();
    alert("Đã thêm vào giỏ hàng!");
  }

  function buyProduct(index) {
    if (localStorage.getItem("isLoggedIn") !== "true") {
      alert("Bạn cần đăng nhập để mua hàng!");
      return;
    }
    const product = products[index];
    if (!product) return;
    if (product.quantity <= 0) {
      alert("Sản phẩm đã hết hàng!");
      return;
    }
    checkoutList = [product];
    renderCheckoutPopup();
    if (checkoutPopup) checkoutPopup.style.display = "flex";
  }

  // ----- Checkout -----
  let checkoutList = [];

  function renderCheckoutPopup() {
    if (!checkoutItemsEl || !checkoutTotalEl) return;
    checkoutItemsEl.innerHTML = "";
    let total = 0;

    checkoutList.forEach((item) => {
      total += parsePrice(item.value);
      const d = document.createElement("div");
      d.className = "checkout-item";
      d.innerHTML = `<p><strong>${escapeHtml(
        item.name
      )}</strong> - ${formatPrice(item.value)}đ</p>`;
      checkoutItemsEl.appendChild(d);
    });

    checkoutTotalEl.textContent = formatPrice(total);
  }

  if (confirmCheckoutBtn) {
    confirmCheckoutBtn.addEventListener("click", () => {
      const invoice = {
        id: Date.now(),
        date: new Date().toLocaleString("vi-VN"),
        user: displayedUsername?.innerText || "Guest",
        items: checkoutList.map((it) => ({ name: it.name, price: it.value })),
        total: checkoutList.reduce((sum, it) => sum + parsePrice(it.value), 0),
      };

      checkoutList.forEach((it) => {
        const p = products.find((x) => x.name === it.name);
        if (p && p.quantity > 0) p.quantity--;
      });

      invoices.push(invoice);
      localStorage.setItem("invoices", JSON.stringify(invoices));
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      renderProducts();

      alert("🎉 Bạn đã mua thành công sản phẩm!");
      if (checkoutPopup) checkoutPopup.style.display = "none";
      checkoutList = [];
    });
  }

  if (closeCheckoutPopup) {
    closeCheckoutPopup.onclick = () => {
      if (checkoutPopup) checkoutPopup.style.display = "none";
      checkoutList = [];
    };
  }

  if (cancelCheckoutBtn) {
    cancelCheckoutBtn.onclick = () => {
      if (checkoutPopup) checkoutPopup.style.display = "none";
      checkoutList = [];
    };
  }

  // ----- Login -----
  if (loginBtn && loginPopup && closeLoginPopup) {
    loginBtn.onclick = () => (loginPopup.style.display = "flex");
    closeLoginPopup.onclick = () => (loginPopup.style.display = "none");
  }

  const loginForm = document.querySelector(".login-form");
  if (loginForm) {
    loginForm.onsubmit = (e) => {
      e.preventDefault();
      const usernameInput = document.getElementById("username").value;
      const passwordInput = document.getElementById("password").value;

      if (usernameInput === "admin1" && passwordInput === "admin1") {
        if (loginPopup) loginPopup.style.display = "none";
        if (loginBtn) loginBtn.style.display = "none";
        if (openProductFormBtn) openProductFormBtn.style.display = "block";
        if (openRegister) openRegister.style.display = "none";
        if (usernameDisplay) usernameDisplay.style.display = "flex";
        if (displayedUsername) displayedUsername.innerText = "Admin";
        localStorage.setItem("isAdmin", "true");
        localStorage.setItem("isLoggedIn", "true");
        alert("Chào mừng Admin!");
        renderProducts();
        return;
      }

      if (
        users.find(
          (u) => u.username === usernameInput && u.password === passwordInput
        )
      ) {
        if (loginPopup) loginPopup.style.display = "none";
        if (loginBtn) loginBtn.style.display = "none";
        if (usernameDisplay) usernameDisplay.style.display = "flex";
        if (displayedUsername) displayedUsername.innerText = usernameInput;
        if (openRegister) openRegister.style.display = "none";
        localStorage.setItem("isLoggedIn", "true");
        alert("Đăng nhập thành công!");
      } else {
        alert("Sai tên đăng nhập hoặc mật khẩu!");
      }
    };
  }

  // ----- Register -----
  if (openRegister && modal) {
    openRegister.addEventListener(
      "click",
      () => (modal.style.display = "flex")
    );
  }

  if (turnbackButton) {
    turnbackButton.addEventListener(
      "click",
      () => (modal.style.display = "none")
    );
  }

  const modalOverlay = document.querySelector(".modal_overlay");
  if (modalOverlay) {
    modalOverlay.addEventListener(
      "click",
      () => (modal.style.display = "none")
    );
  }

  if (registerButton) {
    registerButton.addEventListener("click", (event) => {
      event.preventDefault();
      const username = document.querySelector(
        '.auth-form_input[placeholder="Tên đăng nhập"]'
      ).value;
      const password = document.querySelector(
        '.auth-form_input[placeholder="Mật khẩu"]'
      ).value;
      const confirmPassword = document.getElementById("last-input").value;

      if (!username || !password || !confirmPassword) {
        alert("Vui lòng điền đầy đủ!");
        return;
      }
      if (password !== confirmPassword) {
        alert("Mật khẩu không khớp!");
        return;
      }
      if (users.find((u) => u.username === username)) {
        alert("Tên đăng nhập đã tồn tại!");
        return;
      }

      users.push({ username, password });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
      alert("Đăng ký thành công!");

      document.querySelector(
        '.auth-form_input[placeholder="Tên đăng nhập"]'
      ).value = "";
      document.querySelector('.auth-form_input[placeholder="Mật khẩu"]').value =
        "";
      document.getElementById("last-input").value = "";
      modal.style.display = "none";
    });
  }

  // ----- Product Form Popup -----
  if (openProductFormBtn && productFormPopup) {
    openProductFormBtn.onclick = () =>
      (productFormPopup.style.display = "flex");
  }

  if (closeProductFormPopup && productFormPopup) {
    closeProductFormPopup.onclick = () =>
      (productFormPopup.style.display = "none");
  }

  // ----- Cart Toggle -----
  if (cartBtn && cartMenu) {
    cartBtn.onclick = () => {
      cartMenu.style.display =
        cartMenu.style.display === "block" ? "none" : "block";
    };

    window.addEventListener("click", (e) => {
      if (
        !cartBtn.contains(e.target) &&
        cartMenu &&
        !cartMenu.contains(e.target)
      ) {
        cartMenu.style.display = "none";
      }
    });
  }

  if (checkoutBtn) {
    checkoutBtn.onclick = () => {
      if (localStorage.getItem("isLoggedIn") !== "true") {
        alert("Bạn cần đăng nhập để mua hàng!");
        return;
      }
      if (cart.length === 0) {
        alert("Giỏ hàng trống!");
        return;
      }
      checkoutList = cart.slice();
      renderCheckoutPopup();
      if (checkoutPopup) checkoutPopup.style.display = "flex";
    };
  }

  // ----- User Profile Popup -----
  if (usernameDisplay && userPopup) {
    usernameDisplay.addEventListener("click", () => {
      const current = displayedUsername ? displayedUsername.innerText : "";
      if (popupUsername) popupUsername.innerText = current;
      userPopup.style.display = "flex";
    });

    if (closeUserPopup) {
      closeUserPopup.addEventListener(
        "click",
        () => (userPopup.style.display = "none")
      );
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("isAdmin");
        localStorage.removeItem("cart");
        window.location.reload();
      });
    }
  }

  // ----- Password Toggle -----
  const togglePassword = document.querySelector(".toggle-password");
  if (togglePassword) {
    togglePassword.addEventListener("click", function () {
      const passwordInput = document.getElementById("password");
      const type =
        passwordInput.getAttribute("type") === "password" ? "text" : "password";
      passwordInput.setAttribute("type", type);
      this.classList.toggle("fa-eye");
      this.classList.toggle("fa-eye-slash");
    });
  }

  // ----- Close popups on outside click -----
  document.addEventListener("click", (ev) => {
    if (ev.target === loginPopup) loginPopup.style.display = "none";
    if (ev.target === productFormPopup) productFormPopup.style.display = "none";
    if (ev.target === userPopup) userPopup.style.display = "none";
    if (ev.target === checkoutPopup) checkoutPopup.style.display = "none";
  });

  // ----- Initial Render -----
  renderProducts();
  renderCart();

  // ----- Expose global functions -----
  window.addToCart = addToCart;
  window.buyProduct = buyProduct;
  if (returnToUserBtn) {
    returnToUserBtn.addEventListener("click", () => {
      const adminElement = document.querySelector("admin"); // Tìm thẻ <admin>
      adminElement.style.display = "none";
      const userElement = document.querySelector("user");
      userElement.style.display = "block";
    });
  }
});
