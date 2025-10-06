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
let products = [];

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
      <div class="grid__column-2-4">
        <a class="home-product-item" href="#">
          <div class="home-product-item__img" style="background-image: url(${product.image})"></div>
          <h4 class="home-product-item__name">${product.name}</h4>
          <div class="home-product-item__price">
            <span class="home-product-item__price-old">999.000đ</span>
            <span class="home-product-item__price-current">200.000đ</span>
          </div>
          <div class="home-product-item__action">
            <span class="home-product-item__like home-product-item__like--liked">
              <i class="home-product-item__like-icon-empty fa-regular fa-heart"></i>
              <i class="home-product-item__like-icon-fill fa-solid fa-heart"></i>
            </span>
            <div class="home-product-item__rating">
              <i class="home-product-item__star--gold fa-solid fa-star"></i>
              <i class="home-product-item__star--gold fa-solid fa-star"></i>
              <i class="home-product-item__star--gold fa-solid fa-star"></i>
              <i class="home-product-item__star--gold fa-solid fa-star"></i>
              <i class="fa-solid fa-star"></i>
            </div>
            <span class="home-product-item__sold">${product.quantity} đã bán</span>
          </div>
          <div class="home-product-item__origin">
            <span class="home-product-item__brand">${product.color}</span>
            <span class="home-product-item__origin-name">Việt Nam</span>
          </div>
          <div class="home-product-item__favourite">
            <i class="fa-solid fa-check"></i>
            <span>Yêu thích</span>
          </div>
          <div class="home-product-item__sale-off">
            <span class="home-product-item__sale-off-percent">10%</span>
            <span class="home-product-item__sale-off-label">Giảm</span>
          </div>
        </a>
        <button class="delete-btn" onclick="deleteProduct(${index})">Xóa</button>
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
  let color = document.getElementById("value").value;
  let quantity = document.getElementById("quantity").value;
  let file = document.getElementById("image").files[0];

  if (file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      let imageData = event.target.result;
      products.push({ name, color, quantity, image: imageData });
      localStorage.setItem("products", JSON.stringify(products));
      renderProducts();
      form.reset();
      document.getElementById("product-form-popup").style.display = "none";
    };
    reader.readAsDataURL(file);
  }
});

const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");

if (searchInput && searchBtn) {
  searchBtn.addEventListener("click", () => {
    const keyword = searchInput.value.trim(); // FIX
    localStorage.setItem("searchKeyword", keyword);
  });

  searchInput.addEventListener("keyup", (e) => {
    if (e.key === "Enter") searchBtn.click();
  });
}

renderProducts();

document.getElementById("open-product-form-btn").onclick = function () {
  document.getElementById("product-form-popup").style.display = "flex";
};
document.getElementById("close-product-form-popup").onclick = function () {
  document.getElementById("product-form-popup").style.display = "none";
};
let btn = document.getElementById("cartShop");
let menu = document.getElementById("cartMenu");

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

// Gắn sự kiện cho nút + và -
document.querySelectorAll(".plus").forEach((plusBtn) => {
  plusBtn.onclick = () => {
    let count = plusBtn.previousElementSibling;
    count.textContent = parseInt(count.textContent) + 1;
    updateTotal();
  };
});

document.querySelectorAll(".minus").forEach((minusBtn) => {
  minusBtn.onclick = () => {
    let count = minusBtn.nextElementSibling;
    let newVal = parseInt(count.textContent) - 1;
    if (newVal > 0) {
      count.textContent = newVal;
      updateTotal();
    }
  };
});

// Tính tổng ban đầu
updateTotal();
