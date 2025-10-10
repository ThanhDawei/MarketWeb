
document.getElementById("login-btn").onclick = function () {
  document.getElementById("login-popup").style.display = "flex";
};
document.getElementById("close-login-popup").onclick = function () {
  document.getElementById("login-popup").style.display = "none";
};

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
    document.getElementById("username-display").style.display = "block";
    document.getElementById("displayed-username").innerText = usernameInput;
  } else {
    alert("Sai tên đăng nhập hoặc mật khẩu!");
  }
};

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
            <span class="home-product-item__sold">${
              product.quantity
            }</span>
          </div>
        </a>
        <button class="delete-btn" onclick="deleteProduct(${index})">Xóa</button>
        <button class="add-to-cart" onclick="addToCart('${escapeHtml(
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
  let name = document.getElementById("name").value;
  let value = document.getElementById("value").value;
  let quantity = document.getElementById("quantity").value;
  let category = document.getElementById("category").value;
  let file = document.getElementById("image").files[0];

  if (file) {
    // Resize và nén ảnh trước khi lưu
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
const filterProductName = document.getElementById('filterProductName');
const filterProductCategory = document.getElementById('filterProductCategory');
const filterPriceMin = document.getElementById('filterPriceMin');
const filterPriceMax = document.getElementById('filterPriceMax');
const applyFilterBtn = document.getElementById('applyFilterBtn');
const clearFilterBtn = document.getElementById('clearFilterBtn');

function applyFilters() {
  // gán giá trị input từ filterProductName và filterProductCategory cho nameFilter categoryFilter
  const nameFilter = filterProductName.value.toLowerCase().trim();
  const categoryFilter = filterProductCategory.value.toLowerCase().trim();

  // gán giá trị là 0 hoặc một giá trị cho minPriceFilter và vô cực hoặc một giá trị cho maxPriceFilter
  const minPriceFilter = parseFloat(filterPriceMin.value) || 0;
  const maxPriceFilter = parseFloat(filterPriceMax.value) || Infinity;

  // filter cho từng adj trong mảng products
  const filteredProducts = products.filter(product => {
    const productName = product.name.toLowerCase();
    const productCategory = (product.category || '').toLowerCase();
    const productPrice = parsePrice(product.value);

    const nameMatch = productName.includes(nameFilter);
    const categoryMatch = productCategory.includes(categoryFilter);
    const priceMatch = productPrice >= minPriceFilter && productPrice <= maxPriceFilter;

    // return khớp tất cả điều kiện
    return nameMatch && categoryMatch && priceMatch;
  });

  // renderProducts danh sách sản phẩm đã lọc
  renderProducts(filteredProducts);
}

// hàm xóa filter
function clearFilters() {
  // gán hết 4 filter.value  = ''
  filterProductName.value = '';
  filterProductCategory.value = '';
  filterPriceMin.value = '';
  filterPriceMax.value = '';
  // renderProducts products lại
  renderProducts(products);
}

// gán click cho applyFilterBtn và clearFilterBtn
applyFilterBtn.addEventListener('click', applyFilters);
clearFilterBtn.addEventListener('click', clearFilters);
