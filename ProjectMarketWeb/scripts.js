document.getElementById("login-btn").onclick = function () {
  document.getElementById("login-popup").style.display = "flex";
};
document.getElementById("close-login-popup").onclick = function () {
  document.getElementById("login-popup").style.display = "none";
};
if (localStorage.getItem("isAdmin") === null)
  localStorage.setItem("isAdmin", "false");
if (localStorage.getItem("isLoggedIn") === null)
  localStorage.setItem("isLoggedIn", "false");
window.addEventListener("click", function (event) {
  var loginPopup = document.getElementById("login-popup");
  if (event.target == loginPopup) {
    loginPopup.style.display = "none";
  }

  var productFormPopup = document.getElementById("product-form-popup");
  if (event.target == productFormPopup) {
    productFormPopup.style.display = "none";
  }
});
document.querySelector(".login-form").onsubmit = function (e) {
  e.preventDefault();
  var usernameInput = document.getElementById("username").value;
  var passwordInput = document.getElementById("password").value;
  if (usernameInput === "admin1" && passwordInput === "admin1") {
    document.getElementById("login-popup").style.display = "none";
    document.getElementById("login-btn").style.display = "none";
    document.getElementById("admin").style.display = "block";
    document.getElementById("open-product-form-btn").style.display = "block";
    document.getElementById("open-register-form").style.display = "none";
    // Đánh dấu là admin (lưu vào localStorage để giữ trạng thái khi render lại)
    localStorage.setItem("isAdmin", "true");
    localStorage.setItem("isLoggedIn", "true");

    // Cập nhật ngay UI cho các nút hiện có

    renderProducts();
    // Render lại để các sản phẩm mới cũng hiển thị đúng
  } else if (
    users.find(
      (user) =>
        user.username === usernameInput && user.password === passwordInput
    )
  ) {
    document.getElementById("login-popup").style.display = "none";
    document.getElementById("login-btn").style.display = "none";
    document.getElementById("username-display").style.display = "block";
    document.getElementById("displayed-username").innerText = usernameInput;
    document.getElementById("open-register-form").style.display = "none";
    localStorage.setItem("isLoggedIn", "true");
  } else {
    alert("Sai tên đăng nhập hoặc mật khẩu!");
  }
};
/* ============================== #region REGISTER FORM ============================== */
// Lấy các phần tử cần thiết
const modal = document.getElementById("modal-toggle");
const openButton = document.getElementById("open-register-form");
const turnbackButton = document.getElementById("turnback");
const registerButton = document.getElementById("register");
const modalOverlay = document.querySelector(".modal_overlay");

// --- Khai báo Mảng (Array) để lưu tạm thời và Tên Local Storage Key ---
let users = [];
const STORAGE_KEY = "userAccounts";

// --- Hàm tải dữ liệu người dùng từ Local Storage khi khởi động ---
function loadUsers() {
  const storedUsers = localStorage.getItem(STORAGE_KEY);
  if (storedUsers) {
    // Chuyển chuỗi JSON thành mảng JavaScript
    users = JSON.parse(storedUsers);
    console.log("Đã tải dữ liệu người dùng từ Local Storage:", users);
  }
}

// Gọi hàm tải dữ liệu khi code chạy
loadUsers();
// 1. Chức năng mở Modal
openButton.addEventListener("click", () => {
  modal.style.display = "flex"; // Hiện modal
});

// 2. Chức năng đóng Modal (Nút "Trở lại" và click vào overlay)
function closeModal() {
  modal.style.display = "none"; // Ẩn modal
}

turnbackButton.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", closeModal);

// 3. Chức năng nút "Đăng kí"
registerButton.addEventListener("click", (event) => {
  // Ngăn hành vi submit form mặc định (nếu có)
  event.preventDefault();

  // Lấy giá trị từ các trường input
  const username = document.querySelector(
    '.auth-form_input[placeholder="Tên đăng nhập"]'
  ).value;
  const password = document.querySelector(
    '.auth-form_input[placeholder="Mật khẩu"]'
  ).value;
  const confirmPassword = document.getElementById("last-input").value;

  // Ví dụ kiểm tra cơ bản
  if (username === "" || password === "" || confirmPassword === "") {
    alert("Vui lòng điền đầy đủ tất cả các trường!");
    return;
  }

  if (password !== confirmPassword) {
    alert("Mật khẩu và Nhập lại mật khẩu không khớp!");
    return;
  }

  // **Kiểm tra trùng lặp Tên đăng nhập (quan trọng)**
  const existingUser = users.find((user) => user.username === username);
  if (existingUser) {
    alert("Tên đăng nhập đã tồn tại. Vui lòng chọn tên khác!");
    return;
  }

  // --- LOGIC LƯU DỮ LIỆU ---

  // 1. Tạo đối tượng người dùng mới
  const newUser = {
    username: username,
    password: password, // Lưu ý: Trong thực tế, KHÔNG BAO GIỜ lưu mật khẩu dưới dạng văn bản thuần
  };

  // 2. Thêm người dùng mới vào Mảng
  users.push(newUser);

  // 3. Cập nhật Local Storage
  // Lưu ý: Local Storage chỉ lưu chuỗi, nên cần dùng JSON.stringify() để chuyển mảng thành chuỗi
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));

  // --- KẾT THÚC LOGIC LƯU DỮ LIỆU ---

  console.log("Đăng ký thành công!");
  console.log("Dữ liệu người dùng hiện tại (trong mảng):", users);

  alert("Đăng ký thành công! Chúc bạn có trải nghiệm mua sắm vui vẻ");

  // Xóa dữ liệu input sau khi đăng ký thành công (tùy chọn)
  document.querySelector(
    '.auth-form_input[placeholder="Tên đăng nhập"]'
  ).value = "";
  document.querySelector('.auth-form_input[placeholder="Mật khẩu"]').value = "";
  document.getElementById("last-input").value = "";

  closeModal();
});

/* =============================== #endregion REGISTER FORM ============================= */
//thêm sản phẩm
let products = [];

function parsePrice(value) {
  //format giá
  if (typeof value === "number") return value;
  if (!value) return 0;
  const digits = String(value).replace(/[^0-9]/g, "");
  return digits ? parseInt(digits, 10) : 0;
}

function formatPrice(value) {
  return parsePrice(value).toLocaleString("vi-VN");
}

function escapeHtml(str) {
  //kiểm tra có kí tự đặc biệt
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function resizeImage(file, maxWidth, maxHeight, quality, callback) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const img = new Image();
    img.onload = function () {
      let width = img.width;
      let height = img.height;

      // Tính toán lại kích thước
      if (width > maxWidth) {
        height = Math.round((maxWidth / width) * height);
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = Math.round((maxHeight / height) * width);
        height = maxHeight;
      }

      // Vẽ lại ảnh lên canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // Lấy base64 với chất lượng nén
      const dataUrl = canvas.toDataURL("image/jpeg", quality); // quality: 0.7 = 70%
      callback(dataUrl);
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}
const form = document.getElementById("productForm");
const productList = document.getElementById("productList");

let storedProducts = localStorage.getItem("products");
if (storedProducts) {
  products = JSON.parse(storedProducts);
}

let editingIndex = null;

function renderProducts(list = products) {
  productList.innerHTML = "";
  list.forEach((product, index) => {
    const productHTML = `
      <div class="product-card">
        <a class="home-product-item" href="#">
          <div class="home-product-item__img" style="background-image: url(${
            product.image
          })"></div>
          <h4 class="home-product-item__name">${product.name}</h4>
          <div class="home-product-item__price">
            <span class="home-product-item__price-current">${formatPrice(
              product.value
            )}đ</span>
          </div>
          <div class="home-product-item__action">Số lượng:
            <span class="home-product-item__sold">${product.quantity}</span>
          </div>
        </a>
        <button class ="buy-btn" id="buyBtn" style="display: block" onclick="buyProduct(${index})">Mua</button>
        <button class="add-to-cart" id="addcartBtn" style="display: block" onclick="addToCart('${escapeHtml(
          product.name
        )}', ${product.value})">Thêm vào giỏ</button>
      </div>`;
    productList.insertAdjacentHTML("beforeend", productHTML);
  });
}
function deleteProduct(index) {
  products.splice(index, 1);
  localStorage.setItem("products", JSON.stringify(products));
  renderProducts();
}
form.addEventListener("submit", (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value;
  const value = document.getElementById("value").value;
  const quantity = document.getElementById("quantity").value;
  const category = document.getElementById("category").value;
  const file = document.getElementById("image").files[0];

  // Nếu đang sửa (editingIndex khác null)
  if (editingIndex !== null) {
    const product = products[editingIndex];

    // Nếu có file mới thì resize ảnh
    if (file) {
      resizeImage(file, 400, 400, 0.7, function (imageData) {
        product.name = name;
        product.value = value;
        product.quantity = quantity;
        product.category = category;
        product.image = imageData;
        localStorage.setItem("products", JSON.stringify(products));
        renderProducts();
        form.reset();
        document.getElementById("product-form-popup").style.display = "none";
        editingIndex = null;
      });
    } else {
      // Không có ảnh mới -> giữ ảnh cũ
      product.name = name;
      product.value = value;
      product.quantity = quantity;
      product.category = category;
      localStorage.setItem("products", JSON.stringify(products));
      renderProducts();
      form.reset();
      document.getElementById("product-form-popup").style.display = "none";
      editingIndex = null;
    }
    return;
  }

  // Nếu đang thêm mới
  if (file) {
    resizeImage(file, 400, 400, 0.7, function (imageData) {
      products.push({ name, value, quantity, category, image: imageData });
      localStorage.setItem("products", JSON.stringify(products));
      renderProducts();
      form.reset();
      document.getElementById("product-form-popup").style.display = "none";
    });
  }
});

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

searchBtn.addEventListener("click", () => {
  const keyword = searchInput.value.toLowerCase().trim();
  const filtered = products.filter((product) =>
    product.name.toLowerCase().includes(keyword)
  );
  renderProducts(filtered);
  localStorage.setItem("searchKeyword", keyword);
});
searchInput.addEventListener("keyup", (e) => {
  if (e.key === "Enter") searchBtn.click();
});

function editProduct(index) {
  const product = products[index];
  if (!product) return;

  editingIndex = index; // Đánh dấu đang sửa sản phẩm nào

  // Điền dữ liệu cũ vào form
  document.getElementById("name").value = product.name;
  document.getElementById("value").value = product.value;
  document.getElementById("quantity").value = product.quantity;
  document.getElementById("category").value = product.category;

  // Mở popup thêm/sửa sản phẩm
  document.getElementById("product-form-popup").style.display = "flex";
}

renderProducts();

document.getElementById("open-product-form-btn").onclick = function () {
  document.getElementById("product-form-popup").style.display = "flex";
};
document.getElementById("close-product-form-popup").onclick = function () {
  document.getElementById("product-form-popup").style.display = "none";
};

// Giỏ hàng
let cart = JSON.parse(localStorage.getItem("cart")) || [];
let btn = document.getElementById("cartShop");
let menu = document.getElementById("cartMenu");
let cartItems = document.getElementById("cartItems");
let totalPriceEl = document.getElementById("totalPrice");

// Toggle bật/tắt menu khi bấm nút giỏ hàng
btn.onclick = () => {
  menu.style.display = menu.style.display === "block" ? "none" : "block";
};

// Ấn ra ngoài thì tự đóng menu
window.onclick = (e) => {
  if (!btn.contains(e.target) && !menu.contains(e.target)) {
    menu.style.display = "none";
  }
};
menu.onclick = (e) => {
  e.stopPropagation();
};
// Hàm tinh tổng tiền
function updateTotal() {
  let items = document.querySelectorAll("#cartItems li");
  let total = 0;
  items.forEach((item) => {
    let price = parseInt(item.getAttribute("data-price"));
    let qty = parseInt(item.querySelector(".count").textContent);
    total += price * qty;
  });
  document.getElementById("totalPrice").textContent = total.toLocaleString();
}

// Thêm vào giỏ hàng
function addToCart(name, value) {
  if (localStorage.getItem("isLoggedIn") !== "true") {
    alert(" Bạn cần đăng nhập để thêm sản phẩm vào giỏ hàng!");
    return;
  }
  let item = cart.find((p) => p.name === name);
  if (item) {
    item.quantity++;
  } else {
    cart.push({ name, value, quantity: 1 });
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}
// Cập nhật số lượng
function changeQty(name, delta) {
  let item = cart.find((p) => p.name === name);
  if (!item) return;
  item.quantity += delta;
  if (item.quantity <= 0) {
    cart = cart.filter((p) => p.name !== name);
  }
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}
// Hiển thị giỏ hàng
function renderCart() {
  cartItems.innerHTML = "";
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
    total += p.value * p.quantity;
    cartItems.appendChild(li);
  });
  totalPriceEl.textContent = total.toLocaleString();
}

// Logic của lọc sản phẩm
// === CÁC BỘ PHẬN CỦA BỘ LỌC ===
const filterProductName = document.getElementById("filterProductName");
const filterProductCategory = document.getElementById("filterProductCategory");
const filterPriceMin = document.getElementById("filterPriceMin");
const filterPriceMax = document.getElementById("filterPriceMax");
const applyFilterBtn = document.getElementById("applyFilterBtn");
const clearFilterBtn = document.getElementById("clearFilterBtn");

function applyFilters() {
  // gán giá trị input từ filterProductName và filterProductCategory cho nameFilter categoryFilter
  const nameFilter = filterProductName.value.toLowerCase().trim();
  const categoryFilter = filterProductCategory.value.toLowerCase().trim();

  // gán giá trị là 0 hoặc một giá trị cho minPriceFilter và vô cực hoặc một giá trị cho maxPriceFilter
  const minPriceFilter = parseFloat(filterPriceMin.value) || 0;
  const maxPriceFilter = parseFloat(filterPriceMax.value) || Infinity;

  // filter cho từng adj trong mảng products
  const filteredProducts = products.filter((product) => {
    const productName = product.name.toLowerCase();
    const productCategory = (product.category || "").toLowerCase();
    const productPrice = parsePrice(product.value);

    const nameMatch = productName.includes(nameFilter);
    const categoryMatch = productCategory.includes(categoryFilter);
    const priceMatch =
      productPrice >= minPriceFilter && productPrice <= maxPriceFilter;

    // return khớp tất cả điều kiện
    return nameMatch && categoryMatch && priceMatch;
  });

  // renderProducts danh sách sản phẩm đã lọc
  renderProducts(filteredProducts);
}

// hàm xóa filter
function clearFilters() {
  // gán hết 4 filter.value  = ''
  filterProductName.value = "";
  filterProductCategory.value = "";
  filterPriceMin.value = "";
  filterPriceMax.value = "";
  // renderProducts products lại
  renderProducts(products);
}

// gán click cho applyFilterBtn và clearFilterBtn
applyFilterBtn.addEventListener("click", applyFilters);
clearFilterBtn.addEventListener("click", clearFilters);

// ==================== POPUP XÁC NHẬN MUA HÀNG ====================
let checkoutList = []; // danh sách sản phẩm chờ thanh toán

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

  // Thêm vào danh sách thanh toán
  checkoutList.push(product);
  renderCheckoutPopup();
  document.getElementById("checkout-popup").style.display = "flex";
}

function renderCheckoutPopup() {
  const checkoutItems = document.getElementById("checkout-items");
  const checkoutTotal = document.getElementById("checkout-total");
  checkoutItems.innerHTML = "";

  let total = 0;
  checkoutList.forEach((item) => {
    total += parsePrice(item.value);
    const div = document.createElement("div");
    div.className = "checkout-item";
    div.innerHTML = `
      <p><strong>${escapeHtml(item.name)}</strong> - ${formatPrice(
      item.value
    )}đ</p>
    `;
    checkoutItems.appendChild(div);
  });

  checkoutTotal.textContent = formatPrice(total);
}

// Đóng popup
document.getElementById("close-checkout-popup").onclick = function () {
  document.getElementById("checkout-popup").style.display = "none";
  checkoutList = [];
};

// Hủy mua
document.getElementById("cancel-checkout").onclick = function () {
  document.getElementById("checkout-popup").style.display = "none";
  checkoutList = [];
};

// Thanh toán
document.getElementById("confirm-checkout").onclick = function () {
  // Trừ số lượng của từng sản phẩm
  checkoutList.forEach((item) => {
    const product = products.find((p) => p.name === item.name);
    if (product && product.quantity > 0) {
      product.quantity--;
    }
  });

  // Lưu lại localStorage
  localStorage.setItem("products", JSON.stringify(products));

  // Render lại sản phẩm
  renderProducts();

  alert("🎉 Bạn đã mua thành công sản phẩm!");
  document.getElementById("checkout-popup").style.display = "none";
  checkoutList = [];
};
// Lấy các phần tử cần thiết
const adminBtn = document.getElementById("admin-btn");
const adminPopup = document.getElementById("admin-popup");
const closeAdminPopup = document.getElementById("close-admin-popup");
const cancelAdminBtn = document.getElementById("cancel-admin");
const accessAdminBtn = document.getElementById("access-admin"); // Nút Truy cập

// Hàm hiển thị popup admin
function openAdminPopup() {
  adminPopup.style.display = "flex"; // Dùng flex để căn giữa
}

// Hàm ẩn popup admin
function closeAdminPopupFunc() {
  adminPopup.style.display = "none";
}

// Gắn sự kiện click cho nút mở popup admin
if (adminBtn) {
  adminBtn.addEventListener("click", openAdminPopup);
}

// Gắn sự kiện click cho nút đóng popup admin (biểu tượng X)
if (closeAdminPopup) {
  closeAdminPopup.addEventListener("click", closeAdminPopupFunc);
}

// Gắn sự kiện click cho nút "Đóng" trong popup
if (cancelAdminBtn) {
  cancelAdminBtn.addEventListener("click", closeAdminPopupFunc);
}

// Gắn sự kiện click cho nút "Truy cập" trong popup (bạn sẽ xử lý logic chuyển hướng tại đây)
if (accessAdminBtn) {
  accessAdminBtn.addEventListener("click", () => {
    alert("Chuyển hướng đến trang quản trị viên!"); // Thay bằng logic chuyển hướng thực tế
    closeAdminPopupFunc();
  });
}

// Đóng popup khi click ra ngoài vùng nội dung popup
if (adminPopup) {
  adminPopup.addEventListener("click", (event) => {
    if (event.target === adminPopup) {
      closeAdminPopupFunc();
    }
  });
}

// ==================== USER PROFILE POPUP LOGIC ====================
// getElementByID
// userDisplay tên ng dùng ("username-display")
const userDisplay = document.getElementById("username-display");

// Popup ng dùng ("user-popup")
const userPopup = document.getElementById("user-popup");

// nút x close ("close-user-popup")
const closeUserPopup = document.getElementById("close-user-popup");

// Nút đăng xuất ("logout-btn")
const logoutBtn = document.getElementById("logout-btn");

// hiển thị tên trong popup ("popup-username")
const popupUsername = document.getElementById("popup-username");

// Sự kiện mở popup
// khi click vào tên user trên header
userDisplay.addEventListener("click", () => {
  // Lấy tên ng dùng hiện tại từ header
  const currentUsername = document.getElementById("displayed-username").innerText;
  // Cập nhật tên vô popup
  popupUsername.innerText = currentUsername;
  // Hiển thị flex popup
  userPopup.style.display = "flex";
})

// Hàm chung để đóng popup
function closeUserPopupFunc() {
  userPopup.style.display = "none";
}

// Sự kiện đóng popup
// 1. Khi bấm nút x
closeUserPopup.addEventListener("click", closeUserPopupFunc);

// 2. Khi bấm ra ngoài vùng nội dung popup
userPopup.addEventListener("click", (event) => {
  if(event.target === userPopup) {
    closeUserPopupFunc();
  }
});

// Sự kiện nút đăng xuất
// Khi bấm vào logout
logoutBtn.addEventListener("click", () => {
  // Xóa trạng thái đã đăng nhập, admin (nếu có), giỏ hàng
  localStorage.removeItem("isLoggedIn");
  localStorage.removeItem("isAdmin");
  localStorage.removeItem("cart");
  // Reload trang
  window.location.reload();
});
// ==================== END USER PROFILE POPUP LOGIC ====================