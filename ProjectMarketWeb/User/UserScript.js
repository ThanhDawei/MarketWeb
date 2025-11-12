/* UserScript.js - Cập nhật với tính năng hồ sơ người dùng mở rộng */
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
  const checkoutAddressEl = document.getElementById("checkout-address");
  const saveAddressCheckbox = document.getElementById("save-address-checkbox");
  const useSavedAddressRadio = document.getElementById("use-saved-address");
  const enterNewAddressRadio = document.getElementById("enter-new-address");
  const savedAddressDisplay = document.getElementById("saved-address-display");

  //Bật/tắt trạng thái của ô nhập khi người dùng chuyển lựa chọn
  if (useSavedAddressRadio) {
    useSavedAddressRadio.addEventListener("change", () => {
      if (useSavedAddressRadio.checked && checkoutAddressEl) {
        checkoutAddressEl.disabled = true;
        //Giữ nguyên địa chỉ cũ
        checkoutAddressEl.value = savedAddressDisplay
          ? savedAddressDisplay.innerText
          : checkoutAddressEl.value;
      }
    });
  }
  if (enterNewAddressRadio) {
    enterNewAddressRadio.addEventListener("change", () => {
      if (enterNewAddressRadio.checked && checkoutAddressEl) {
        checkoutAddressEl.disabled = false;
        //xóa địa chỉ cũ trong ô nhập để nhập địa chỉ mới
        const savedText = savedAddressDisplay
          ? savedAddressDisplay.innerText
          : "";
        if (checkoutAddressEl.value === savedText) checkoutAddressEl.value = "";
        checkoutAddressEl.focus();
      }
    });
  }

  const usernameDisplay = document.getElementById("username-display");
  const displayedUsername = document.getElementById("displayed-username");

  const userPopup = document.getElementById("user-popup");
  const closeUserPopup = document.getElementById("close-user-popup");
  const popupUsername = document.getElementById("popup-username");
  const logoutBtn = document.getElementById("logout-btn");

  const filterProductName = document.getElementById("filterProductName");
  const filterProductCategory = document.getElementById(
    "filterProductCategory"
  ); // Bây giờ là thẻ <select>
  const filterPriceMin = document.getElementById("filterPriceMin");
  const filterPriceMax = document.getElementById("filterPriceMax");
  const applyFilterBtn = document.getElementById("applyFilterBtn");
  const clearFilterBtn = document.getElementById("clearFilterBtn");

  // === DOM POPUP CHI TIẾT (MỚI) ===
  const productDetailPopup = document.getElementById("product-detail-popup");
  const closeProductDetailPopup = document.getElementById(
    "close-product-detail-popup"
  );

  // ----- Storage initialization với dữ liệu mẫu -----
  if (localStorage.getItem("isLoggedIn") === null)
    localStorage.setItem("isLoggedIn", "false");

  // ----- Users với dữ liệu mẫu -----
  let users = [];
  const STORAGE_KEY = "userAccounts";

  function loadUsers() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      users = JSON.parse(stored);
    } else {
      // Tạo users mẫu
      users = [
        {
          username: "user1",
          password: "123456",
          email: "user1@example.com",
          phone: "0901234567",
          address: "123 Nguyễn Huệ, Quận 1, TP.HCM",
        },
        {
          username: "nguyenvana",
          password: "password123",
          email: "nguyenvana@gmail.com",
          phone: "0912345678",
          address: "456 Lê Lợi, Quận 3, TP.HCM",
        },
        {
          username: "tranthib",
          password: "123456",
          email: "tranthib@yahoo.com",
          phone: "0923456789",
          address: "789 Hai Bà Trưng, Quận 1, TP.HCM",
        },
        {
          username: "demo",
          password: "demo",
          email: "demo@dmarket.com",
          phone: "0934567890",
          address: "321 Trần Hưng Đạo, Quận 5, TP.HCM",
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    }
  }
  loadUsers();

  // ----- Products với dữ liệu mẫu -----
  let products = [];
  const PRODUCTS_KEY = "products";
  const storedProducts = localStorage.getItem(PRODUCTS_KEY);

  if (storedProducts) {
    try {
      products = JSON.parse(storedProducts);
    } catch (e) {
      products = [];
    }
  }

  // Nếu chưa có products, tạo dữ liệu mẫu
  if (products.length === 0) {
    products = [
      {
        name: "iPhone 15 Pro Max",
        value: 29990000,
        quantity: 15,
        category: "Điện thoại",
        image: "../image/IP15PM.jpg",
        tags: ["điện thoại", "apple"],
        details: { // THÊM DETAILS
          "Màn hình": "6.7 inch, Super Retina XDR",
          "Chip": "Apple A17 Pro",
          "RAM": "8GB",
          "Bộ nhớ trong": "256GB",
          "Camera": "Chính 48MP & Phụ 12MP"
        }
      },
      {
        name: "Samsung Galaxy S24 Ultra",
        value: 27990000,
        quantity: 20,
        category: "Điện thoại",
        image: "../image/S24U.jpg",
        tags: ["điện thoại", "samsung"],
        details: { // THÊM DETAILS
          "Màn hình": "6.8 inch, Dynamic AMOLED 2X",
          "Chip": "Snapdragon 8 Gen 3 for Galaxy",
          "RAM": "12GB",
          "Bộ nhớ trong": "256GB",
          "Camera": "Chính 200MP & Phụ 12MP, 10MP, 50MP"
        }
      },
      {
        name: "MacBook Pro M3 14 inch",
        value: 42990000,
        quantity: 8,
        category: "Laptop",
        image: "../image/MBP14M3.jpg",
        tags: ["laptop", "apple"],
        details: { // THÊM DETAILS
          "Màn hình": "14.2 inch, Liquid Retina XDR",
          "Chip": "Apple M3 Pro",
          "RAM": "18GB",
          "Ổ cứng": "512GB SSD",
          "GPU": "14-core GPU"
        }
      },
      {
        name: "Dell XPS 13",
        value: 32990000,
        quantity: 12,
        category: "Laptop",
        image: "../image/DellXPS13.jpg",
        tags: ["laptop", "dell"],
        details: { // THÊM DETAILS
          "Màn hình": "13.4 inch, FHD+ InfinityEdge",
          "CPU": "Intel Core Ultra 7 155H",
          "RAM": "16GB LPDDR5x",
          "Ổ cứng": "512GB SSD",
          "Đồ họa": "Intel Arc Graphics"
        }
      },
      {
        name: "iPad Pro 12.9 inch M2",
        value: 25990000,
        quantity: 10,
        category: "Máy tính bảng",
        image: "../image/iPadProM2.jpg",
        tags: ["máy tính bảng", "apple"],
        details: { // THÊM DETAILS
          "Màn hình": "12.9 inch, Liquid Retina XDR",
          "Chip": "Apple M2",
          "RAM": "8GB",
          "Bộ nhớ trong": "128GB",
          "Kết nối": "Wi-Fi 6E"
        }
      },
      {
        name: "AirPods Pro 2",
        value: 5990000,
        quantity: 30,
        category: "Phụ kiện",
        image: "../image/AirPodsPro2.jpg",
        tags: ["phụ kiện", "âm thanh", "apple"],
        details: { // THÊM DETAILS
          "Tính năng": "Chống ồn chủ động (ANC)",
          "Chip": "Apple H2",
          "Thời lượng pin": "Tới 6 giờ (tai nghe), 30 giờ (hộp sạc)",
          "Sạc": "MagSafe, USB-C"
        }
      },
      {
        name: "Sony WH-1000XM5",
        value: 8490000,
        quantity: 18,
        category: "Phụ kiện",
        image: "../image/SonyWH1000XM5.jpg",
        tags: ["phụ kiện", "âm thanh", "sony"],
        details: { // THÊM DETAILS
          "Loại": "Tai nghe Over-ear",
          "Tính năng": "Chống ồn chủ động (ANC) hàng đầu",
          "Driver": "30mm",
          "Thời lượng pin": "Tới 30 giờ (bật ANC)"
        }
      },
      {
        name: "Apple Watch Series 9",
        value: 10990000,
        quantity: 25,
        category: "Đồng hồ thông minh",
        image: "../image/AppleWatchS9.jpg",
        tags: ["đồng hồ thông minh", "apple"],
        details: { // THÊM DETAILS
          "Kích cỡ": "45mm",
          "Màn hình": "Always-On Retina",
          "Chip": "Apple S9 SiP",
          "Tính năng": "Double Tap, ECG, SpO2",
          "Chống nước": "50m"
        }
      },
      {
        name: "Samsung Galaxy Watch 6",
        value: 7490000,
        quantity: 22,
        category: "Đồng hồ thông minh",
        image: "../image/SamsungGW6.jpg",
        tags: ["đồng hồ thông minh", "samsung"],
        details: { // THÊM DETAILS
          "Kích cỡ": "44mm",
          "Màn hình": "Super AMOLED",
          "Hệ điều hành": "Wear OS 4",
          "Tính năng": "Đo thành phần cơ thể, ECG, Huyết áp",
          "Chất liệu": "Armor Aluminum"
        }
      },
      {
        name: "Bàn phím cơ Keychron K2",
        value: 2490000,
        quantity: 35,
        category: "Phụ kiện",
        image: "../image/KeychronK2.jpg",
        tags: ["phụ kiện", "keychron"],
        details: { // THÊM DETAILS
          "Layout": "75%",
          "Switch": "Gateron Brown",
          "Kết nối": "Bluetooth 5.1, USB-C",
          "Đèn nền": "RGB",
          "Tương thích": "Mac & Windows"
        }
      },
      {
        name: "Chuột Logitech MX Master 3S",
        value: 2790000,
        quantity: 40,
        category: "Phụ kiện",
        image: "../image/LogitechMXMaster3S.jpg",
        tags: ["phụ kiện", "logitech"],
        details: { // THÊM DETAILS
          "Cảm biến": "Darkfield 8000 DPI",
          "Nút cuộn": "MagSpeed",
          "Kết nối": "Logi Bolt, Bluetooth",
          "Tính năng": "Click yên tĩnh, Sạc nhanh USB-C"
        }
      },
      {
        name: "Màn hình LG UltraGear 27 inch",
        value: 8990000,
        quantity: 14,
        category: "Màn hình",
        image: "../image/LGUltraGear27.jpg",
        tags: ["màn hình", "lg"],
        details: { // THÊM DETAILS
          "Kích thước": "27 inch",
          "Độ phân giải": "QHD (2560 x 1440)",
          "Tấm nền": "Nano IPS",
          "Tần số quét": "165Hz",
          "Phản hồi": "1ms (GtG)"
        }
      },
      {
        name: "Webcam Logitech C920",
        value: 1990000,
        quantity: 28,
        category: "Phụ kiện",
        image: "../image/LogitechC920.jpg",
        tags: ["phụ kiện", "logitech"],
        details: { // THÊM DETAILS
          "Độ phân giải": "Full HD 1080p / 30fps",
          "Góc nhìn": "78°",
          "Tính năng": "Tự động lấy nét, Mic kép",
          "Kết nối": "USB-A"
        }
      },
      {
        name: "SSD Samsung 990 PRO 1TB",
        value: 3490000,
        quantity: 32,
        category: "Linh kiện",
        image: "../image/Samsung990PRO1TB.jpg",
        tags: ["linh kiện", "samsung"],
        details: { // THÊM DETAILS
          "Dung lượng": "1TB",
          "Chuẩn": "NVMe PCIe Gen 4.0",
          "Tốc độ đọc": "~7,450 MB/s",
          "Tốc độ ghi": "~6,900 MB/s",
          "Form Factor": "M.2 2280"
        }
      },
      {
        name: "RAM Corsair Vengeance 32GB",
        value: 4290000,
        quantity: 26,
        category: "Linh kiện",
        image: "../image/CorsairVengeance32GB.jpg",
        tags: ["linh kiện", "corsair"],
        details: { // THÊM DETAILS
          "Dung lượng": "32GB (2 x 16GB)",
          "Loại": "DDR5",
          "Tốc độ": "6000MHz",
          "Đèn": "RGB",
          "Tản nhiệt": "Nhôm"
        }
      },
      {
        name: "Tai nghe Gaming Razer BlackShark V2",
        value: 2890000,
        quantity: 19,
        category: "Phụ kiện",
        image: "../image/RazerBlackSharkV2.jpg",
        tags: ["phụ kiện", "âm thanh", "razer"],
        details: { // THÊM DETAILS
          "Driver": "Razer TriForce Titanium 50mm",
          "Âm thanh": "THX Spatial Audio",
          "Mic": "Razer HyperClear Cardioid",
          "Kết nối": "Jack 3.5mm, USB Sound Card"
        }
      },
      {
        name: "Sạc dự phòng Anker 20000mAh",
        value: 990000,
        quantity: 45,
        category: "Phụ kiện",
        image: "../image/Anker20000mAh.jpg",
        tags: ["phụ kiện", "anker"],
        details: { // THÊM DETAILS
          "Dung lượng": "20,000 mAh",
          "Công suất": "20W",
          "Cổng ra": "1x USB-C, 1x USB-A",
          "Công nghệ": "PowerIQ 3.0, Power Delivery (PD)"
        }
      },
      {
        name: "Ốp lưng iPhone 15 Pro",
        value: 490000,
        quantity: 50,
        category: "Phụ kiện",
        image: "../image/OpLungIP15Pro.jpg",
        tags: ["phụ kiện", "apple"],
        details: { // THÊM DETAILS
          "Chất liệu": "Silicone",
          "Tương thích": "iPhone 15 Pro",
          "Tính năng": "Hỗ trợ MagSafe"
        }
      },
      {
        name: "Cáp sạc USB-C to Lightning",
        value: 390000,
        quantity: 60,
        category: "Phụ kiện",
        image: "../image/CableUSBCtoLightning.jpg",
        tags: ["phụ kiện", "apple"],
        details: { // THÊM DETAILS
          "Loại": "USB-C to Lightning",
          "Độ dài": "1m",
          "Hãng": "Apple",
          "Tính năng": "Sạc nhanh (PD)"
        }
      },
      {
        name: "Router WiFi 6 TP-Link Archer AX73",
        value: 2490000,
        quantity: 16,
        category: "Mạng & Kết nối",
        image: "../image/TPLinkArcherAX73.jpg",
        tags: ["mạng & kết nối", "tp-link"],
        details: { // THÊM DETAILS
          "Chuẩn": "Wi-Fi 6 (802.11ax)",
          "Tốc độ": "AX5400 (5GHz: 4804 Mbps, 2.4GHz: 574 Mbps)",
          "Anten": "6 anten",
          "Tính năng": "OneMesh, HomeShield"
        }
      },
      {
        name: "Loa Bluetooth JBL Flip 6",
        value: 2990000,
        quantity: 24,
        category: "Âm thanh",
        image: "../image/JBLFlip6.jpg",
        tags: ["âm thanh", "jbl"],
        details: { // THÊM DETAILS
          "Công suất": "20W RMS (woofer) + 10W RMS (tweeter)",
          "Chống nước": "IP67",
          "Thời lượng pin": "12 giờ",
          "Tính năng": "PartyBoost"
        }
      },
      {
        name: "Gimbal DJI OM 6",
        value: 3990000,
        quantity: 11,
        category: "Phụ kiện",
        image: "../image/DJIOM6.jpg",
        tags: ["phụ kiện", "dji"],
        details: { // THÊM DETAILS
          "Loại": "Chống rung 3 trục",
          "Tính năng": "ActiveTrack 6.0, Quick Launch",
          "Pin": "6.4 giờ",
          "Trọng lượng": "309g"
        }
      },
      {
        name: "Máy tính bảng Samsung Tab S9",
        value: 18990000,
        quantity: 9,
        category: "Máy tính bảng",
        image: "../image/SamsungTabS9.jpg",
        tags: ["máy tính bảng", "samsung"],
        details: { // THÊM DETAILS
          "Màn hình": "11 inch, Dynamic AMOLED 2X",
          "Chip": "Snapdragon 8 Gen 2 for Galaxy",
          "RAM": "8GB",
          "Bộ nhớ trong": "128GB",
          "Bút": "S Pen đi kèm (chống nước IP68)"
        }
      },
      {
        name: "Ổ cứng di động WD My Passport 2TB",
        value: 1990000,
        quantity: 33,
        category: "Linh kiện",
        image: "../image/WDMyPassport2TB.jpg",
        tags: ["linh kiện", "wd"],
        details: { // THÊM DETAILS
          "Dung lượng": "2TB",
          "Kết nối": "USB 3.2 Gen 1",
          "Loại": "HDD",
          "Bảo mật": "Mã hóa AES 256-bit"
        }
      },
      {
        name: "Xiaomi Redmi Note 13 Pro",
        value: 7990000,
        quantity: 4,
        category: "Điện thoại",
        image: "../image/RedmiNote13Pro.jpg",
        tags: ["điện thoại", "xiaomi"],
        details: { // THÊM DETAILS
          "Màn hình": "6.67 inch, AMOLED, 120Hz",
          "Chip": "Helio G99-Ultra",
          "RAM": "8GB",
          "Bộ nhớ trong": "256GB",
          "Camera": "Chính 200MP"
        }
      },
      {
        name: "Kính cường lực iPhone 15",
        value: 290000,
        quantity: 2,
        category: "Phụ kiện",
        image: "../image/KinhCuongLucIP15.jpg",
        tags: ["phụ kiện", "apple"],
        details: { // THÊM DETAILS
          "Tương thích": "iPhone 15",
          "Độ cứng": "9H",
          "Tính năng": "Chống vân tay, Viền 2.5D"
        }
      },
    ];
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  // ----- Cart -----
  let cart = JSON.parse(localStorage.getItem("cart")) || [];

  // ----- Invoices -----
  let invoices = JSON.parse(localStorage.getItem("invoices")) || [];

  // ----- Pagination & Render Products -----
  let currentPage = 1;
  const itemsPerPage = 12;
  let currentProductList = products;

  // === HÀM MỚI: HIỂN THỊ CHI TIẾT SẢN PHẨM ===
  function showProductDetails(index) {
    const product = currentProductList[index];
    if (!product || !productDetailPopup) return;

    // Lấy các element trong popup
    const imgEl = document.getElementById("popup-product-image");
    const nameEl = document.getElementById("popup-product-name");
    const tagsEl = document.getElementById("popup-product-tags");
    const priceEl = document.getElementById("popup-product-price");
    const specsEl = document.getElementById("popup-product-specs-list");
    const buyBtn = document.getElementById("popup-buy-btn");
    const addCartBtn = document.getElementById("popup-add-to-cart-btn");

    // 1. Điền hình ảnh
    imgEl.src = product.image || "../image/placeholder.png";

    // 2. Điền tên
    nameEl.innerText = product.name;

    // 3. Điền giá
    priceEl.innerHTML = `Giá: <span class="home-product-item__price-current">${formatPrice(
      product.value
    )}đ</span>`;

    // 4. Điền tags
    tagsEl.innerHTML = "";
    if (product.tags && product.tags.length > 0) {
      product.tags.forEach((tag) => {
        const tagBadge = document.createElement("span");
        tagBadge.className = "tag-badge";
        tagBadge.innerText = tag;
        tagsEl.appendChild(tagBadge);
      });
    }

    // 5. Điền thông số kỹ thuật (details)
    specsEl.innerHTML = "";
    if (product.details && Object.keys(product.details).length > 0) {
      for (const [key, value] of Object.entries(product.details)) {
        const li = document.createElement("li");
        li.innerHTML = `<strong>${escapeHtml(key)}:</strong> ${escapeHtml(
          value
        )}`;
        specsEl.appendChild(li);
      }
    } else {
      specsEl.innerHTML = "<li>Không có thông tin chi tiết.</li>";
    }

    // 6. Xử lý nút (vô hiệu hóa nếu hết hàng)
    buyBtn.disabled = product.quantity <= 0;
    addCartBtn.disabled = product.quantity <= 0;

    // 7. Gán sự kiện click cho nút
    buyBtn.onclick = () => {
      buyProduct(index); // Dùng index của currentProductList
      productDetailPopup.style.display = "none"; // Ẩn popup sau khi mua
    };

    addCartBtn.onclick = () => {
      addToCart(product.name, product.value);
      // Không ẩn popup, để người dùng có thể mua tiếp
    };

    // 8. Hiển thị popup
    productDetailPopup.style.display = "flex";
  }

  function renderProducts(list = products) {
    currentProductList = list;
    currentPage = 1;
    renderProductsPage();
  }

  function renderProductsPage() {
    productList.innerHTML = "";

    if (!currentProductList || currentProductList.length === 0) {
      productList.innerHTML = `
        <div style="grid-column: 1/-1; padding: 60px 20px; text-align: center;">
          <i class="fa-solid fa-box-open" style="font-size: 4rem; color: #ddd; margin-bottom: 20px;"></i>
          <h3 style="color: #666; margin-bottom: 10px;">Không có sản phẩm nào</h3>
          <p style="color: #999;">Vui lòng thử tìm kiếm hoặc lọc khác</p>
        </div>
      `;
      // Xóa pagination nếu không có sản phẩm
      let paginationEl = document.getElementById("pagination-container");
      if (paginationEl) paginationEl.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(currentProductList.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageProducts = currentProductList.slice(startIndex, endIndex);

    pageProducts.forEach((product, pageIndex) => {
      const actualIndex = startIndex + pageIndex; // Index chính xác trong currentProductList
      const wrapper = document.createElement("div");
      wrapper.className = "product-card";
      wrapper.style.animation = `productSlideIn 0.4s ease-out ${
        pageIndex * 0.05
      }s both`;
      
      // === CẬP NHẬT: THÊM ONCLICK CHO THẺ SẢN PHẨM ===
      wrapper.onclick = () => showProductDetails(actualIndex);
      // ===============================================

      const imageDiv = document.createElement("div");
      imageDiv.className = "home-product-item__img";
      if (product.image) {
        imageDiv.style.backgroundImage = `url("${product.image}")`;
      } else {
        imageDiv.style.background = "#f2f2f2";
        imageDiv.innerHTML =
          '<i class="fa-solid fa-image" style="font-size: 3rem; color: #ccc; margin-top: 60px;"></i>';
        imageDiv.style.display = "flex";
        imageDiv.style.alignItems = "center";
        imageDiv.style.justifyContent = "center";
      }

      // Badge cho sản phẩm
      const badges = [];
      if (product.quantity <= 0) {
        badges.push(
          '<span class="product-badge badge-out-of-stock">Hết hàng</span>'
        );
      } else if (product.quantity <= 5) {
        badges.push(
          '<span class="product-badge badge-low-stock">Còn ít</span>'
        );
      }

      const badgeContainer =
        badges.length > 0
          ? `<div class="product-badges">${badges.join("")}</div>`
          : "";

      const infoDiv = document.createElement("div");
      infoDiv.className = "info";
      infoDiv.innerHTML = `
        ${badgeContainer}
        <div>
          <h4 class="home-product-item__name" title="${escapeHtml(
            product.name
          )}">${escapeHtml(product.name)}</h4>
          <div class="home-product-item__category">
            <i class="fa-solid fa-tag"></i> ${escapeHtml(
              product.category || "Chưa phân loại"
            )}
          </div>
          <div class="home-product-item__price">
            <span class="home-product-item__price-current">${formatPrice(
              product.value
            )}đ</span>
          </div>
          <div class="home-product-item__action">
            <i class="fa-solid fa-box"></i> Còn lại: 
            <span class="home-product-item__sold ${
              product.quantity <= 5 ? "low-stock" : ""
            }">${product.quantity}</span>
          </div>
        </div>
      `;

      const btnContainer = document.createElement("div");
      btnContainer.className = "product-btn-container";

      const buyBtn = document.createElement("button");
      buyBtn.className = "buy-btn";
      buyBtn.innerHTML = '<i class="fa-solid fa-bolt"></i> Mua ngay';
      buyBtn.disabled = product.quantity <= 0;
      
      // === CẬP NHẬT: Thêm e.stopPropagation() ===
      buyBtn.onclick = (e) => {
        e.stopPropagation(); // Ngăn sự kiện click của thẻ cha (wrapper)
        buyProduct(actualIndex);
      };

      const addCartBtn = document.createElement("button");
      addCartBtn.className = "add-to-cart";
      addCartBtn.innerHTML =
        '<i class="fa-solid fa-cart-plus"></i> Thêm vào giỏ';
      addCartBtn.disabled = product.quantity <= 0;
      
      // === CẬP NHẬT: Thêm e.stopPropagation() ===
      addCartBtn.onclick = (e) => {
        e.stopPropagation(); // Ngăn sự kiện click của thẻ cha (wrapper)
        addToCart(product.name, product.value);
      };
      // =========================================

      btnContainer.appendChild(buyBtn);
      btnContainer.appendChild(addCartBtn);

      wrapper.appendChild(imageDiv);
      wrapper.appendChild(infoDiv);
      wrapper.appendChild(btnContainer);

      productList.appendChild(wrapper);
    });

    // Render pagination
    renderPagination(totalPages);
  }

  function renderPagination(totalPages) {
    let paginationEl = document.getElementById("pagination-container");

    if (!paginationEl) {
      paginationEl = document.createElement("div");
      paginationEl.id = "pagination-container";
      paginationEl.className = "pagination-container";

      const main = document.querySelector("main");
      if (main) {
        main.appendChild(paginationEl);
      }
    }

    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }

    let html = `
      <div class="pagination-info">
        Hiển thị ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(
      currentPage * itemsPerPage,
      currentProductList.length
    )} 
        trong tổng số ${currentProductList.length} sản phẩm
      </div>
      <div class="pagination">
        <button class="pagination-btn" onclick="goToPage(1)" ${
          currentPage === 1 ? "disabled" : ""
        }>
          <i class="fa-solid fa-angles-left"></i>
        </button>
        <button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${
      currentPage === 1 ? "disabled" : ""
    }>
          <i class="fa-solid fa-chevron-left"></i>
        </button>
    `;

    // Page numbers
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
      html += `<button class="pagination-btn" onclick="goToPage(1)">1</button>`;
      if (startPage > 2) {
        html += `<span class="pagination-ellipsis">...</span>`;
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `
        <button class="pagination-btn ${i === currentPage ? "active" : ""}" 
                onclick="goToPage(${i})">
          ${i}
        </button>
      `;
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        html += `<span class="pagination-ellipsis">...</span>`;
      }
      html += `<button class="pagination-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    html += `
        <button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${
      currentPage === totalPages ? "disabled" : ""
    }>
          <i class="fa-solid fa-chevron-right"></i>
        </button>
        <button class="pagination-btn" onclick="goToPage(${totalPages})" ${
      currentPage === totalPages ? "disabled" : ""
    }>
          <i class="fa-solid fa-angles-right"></i>
        </button>
      </div>
    `;

    paginationEl.innerHTML = html;

    // Scroll to top when changing page
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  window.goToPage = function (page) {
    const totalPages = Math.ceil(currentProductList.length / itemsPerPage);
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderProductsPage();
  };

  // === THÊM CSS CHO POPUP MỚI ===
  const productStyles = document.createElement("style");
  productStyles.textContent = `
    @keyframes productSlideIn {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .product-badges {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      flex-direction: column;
      gap: 5px;
      z-index: 10;
    }
    
    .product-badge {
      padding: 4px 10px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    .badge-out-of-stock {
      background: #f44336;
      color: white;
    }
    
    .badge-low-stock {
      background: #ff9800;
      color: white;
    }
    
    .home-product-item__category {
      color: #667eea;
      font-size: 0.85rem;
      margin: 5px 0;
      display: flex;
      align-items: center;
      gap: 5px;
    }
    
    .home-product-item__sold.low-stock {
      color: #ff9800;
      font-weight: 700;
    }
    
    .product-btn-container {
      display: flex;
      gap: 8px;
      padding: 10px;
    }
    
    .product-btn-container button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    
    .product-btn-container button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }
    
    .pagination-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 15px;
      padding: 30px 20px;
      margin: 20px auto;
      max-width: 1400px;
    }
    
    .pagination-info {
      color: #666;
      font-size: 0.95rem;
      font-weight: 500;
    }
    
    .pagination {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      justify-content: center;
    }
    
    .pagination-btn {
      min-width: 40px;
      height: 40px;
      padding: 8px 12px;
      border: 2px solid #e0e0e0;
      background: white;
      color: #667eea;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .pagination-btn:hover:not(:disabled) {
      background: #667eea;
      color: white;
      border-color: #667eea;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }
    
    .pagination-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    
    .pagination-btn.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-color: #667eea;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .pagination-ellipsis {
      color: #999;
      padding: 0 5px;
      font-weight: 600;
    }

    /* CSS CHO POPUP CHI TIẾT SẢN PHẨM */
    .popup-content.large {
      max-width: 900px;
      width: 90%;
      max-height: 90vh;
    }

    .product-detail-layout {
      display: flex;
      gap: 30px;
    }

    .product-detail-image-container {
      flex: 1;
      min-width: 300px;
      background: #f9f9f9;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      overflow: hidden;
      align-self: flex-start;
    }

    .product-detail-image-container img {
      max-width: 100%;
      max-height: 400px;
      height: auto;
      object-fit: contain;
      border-radius: 8px;
    }

    .product-detail-info-container {
      flex: 1.5;
      display: flex;
      flex-direction: column;
    }

    .product-detail-info-container h2 {
      font-size: 2rem;
      color: #333;
      margin-top: 0;
      margin-bottom: 10px;
      line-height: 1.2;
    }

    .product-detail-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 15px;
    }
    
    .tag-badge {
      background: #e0e7ff;
      color: #667eea;
      padding: 5px 12px;
      border-radius: 15px;
      font-size: 0.8rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .product-detail-price {
      font-size: 1.5rem;
      font-weight: 600;
      color: #555;
      margin-bottom: 20px;
    }
    
    .product-detail-price .home-product-item__price-current {
      color: #e91e63;
      font-size: 2.2rem;
      margin-left: 10px;
    }

    .product-detail-specs {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 15px 20px;
      margin-bottom: 25px;
      border-left: 4px solid #667eea;
    }
    
    .product-detail-specs h3 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #667eea;
    }
    
    .product-detail-specs-list {
      list-style: none;
      padding-left: 0;
      margin: 0;
      max-height: 200px;
      overflow-y: auto;
    }
    
    .product-detail-specs-list li {
      padding: 8px 0;
      border-bottom: 1px dashed #e0e0e0;
      font-size: 0.95rem;
      color: #555;
    }
    
    .product-detail-specs-list li:last-child {
      border-bottom: none;
    }
    
    .product-detail-specs-list li strong {
      color: #333;
      min-width: 120px;
      display: inline-block;
    }

    .product-detail-actions {
      display: flex;
      gap: 15px;
      margin-top: auto; /* Đẩy nút xuống cuối */
    }
    
    .product-detail-actions button {
      flex: 1;
      padding: 15px 20px;
      font-size: 1rem;
      gap: 8px;
    }
    
    .product-detail-actions button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
        transform: none !important;
    }
    
    @media (max-width: 768px) {
      .popup-content.large {
        width: 95%;
        max-height: 85vh;
        overflow-y: auto;
      }
      .product-detail-layout {
        flex-direction: column;
      }
      .product-detail-image-container {
        min-width: auto;
        max-height: 300px;
      }
      .product-detail-image-container img {
        max-height: 280px;
      }
      .product-detail-info-container h2 {
        font-size: 1.5rem;
      }
      .product-detail-price .home-product-item__price-current {
        font-size: 1.8rem;
      }
      .product-detail-actions {
        flex-direction: column;
      }
    }
    /* KẾT THÚC CSS POPUP */
    
    @media (max-width: 768px) {
      .pagination-btn {
        min-width: 36px;
        height: 36px;
        padding: 6px 10px;
        font-size: 0.9rem;
      }
      
      .pagination {
        gap: 5px;
      }
      
      .pagination-info {
        font-size: 0.85rem;
        text-align: center;
      }
    }
  `;
  document.head.appendChild(productStyles);

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

      // Tự động thêm tags từ tên và danh mục (bạn có thể mở rộng logic này)
      const newTags = [category.toLowerCase()];
      if (name.toLowerCase().includes("apple")) newTags.push("apple");
      if (name.toLowerCase().includes("samsung")) newTags.push("samsung");
      if (name.toLowerCase().includes("xiaomi")) newTags.push("xiaomi");
      if (name.toLowerCase().includes("dell")) newTags.push("dell");
      // ... thêm các hãng khác ...
      
      // Tự động thêm details (đơn giản, có thể làm phức tạp hơn)
      const newDetails = {
        "Phân loại": category,
      };

      function pushProduct(imageData) {
        if (editingIndex !== null) {
          products[editingIndex] = {
            name,
            value: parsePrice(value),
            quantity: parseInt(quantity || 0),
            category,
            image: imageData || products[editingIndex].image,
            tags: products[editingIndex].tags || newTags, // Giữ tag cũ hoặc cập nhật
            details: products[editingIndex].details || newDetails, // Giữ details cũ
          };
          editingIndex = null;
        } else {
          products.push({
            name,
            value: parsePrice(value),
            quantity: parseInt(quantity || 0),
            category,
            image: imageData || "",
            tags: newTags, // Thêm tags cho sản phẩm mới
            details: newDetails, // Thêm details cho sản phẩm mới
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
    // Lấy giá trị từ thẻ select, đã là chữ thường
    const categoryFilter = (filterProductCategory?.value || "").toLowerCase();
    const minPrice = parseFloat(filterPriceMin?.value) || 0;
    const maxPrice = parseFloat(filterPriceMax?.value) || Infinity;

    const filtered = products.filter((product) => {
      const name = (product.name || "").toLowerCase();
      const cat = (product.category || "").toLowerCase();
      const price = parsePrice(product.value);
      
      // Lấy mảng tags của sản phẩm, đảm bảo là chữ thường
      const productTags = (product.tags || []).map(t => String(t).toLowerCase());

      // Kiểm tra danh mục/hãng:
      // 1. Nếu categoryFilter là rỗng (""), thì luôn khớp
      // 2. Nếu không, kiểm tra xem mảng productTags có chứa categoryFilter không
      const categoryMatch = !categoryFilter || productTags.includes(categoryFilter);

      return (
        name.includes(nameFilter) &&
        categoryMatch && // Áp dụng logic lọc mới
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
      if (filterProductCategory) filterProductCategory.value = ""; // Reset thẻ select
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
    
    // Tìm sản phẩm gốc để kiểm tra số lượng
    const product = products.find(p => p.name === name);
    if (!product) {
      alert("Lỗi: Không tìm thấy sản phẩm.");
      return;
    }
    
    const existing = cart.find((c) => c.name === name);
    
    // Kiểm tra số lượng tồn kho
    const currentCartQty = existing ? existing.quantity : 0;
    if (currentCartQty + 1 > product.quantity) {
      alert(`Xin lỗi, bạn chỉ có thể mua tối đa ${product.quantity} sản phẩm này.`);
      return;
    }

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
    const product = currentProductList[index]; // Lấy từ currentProductList
    if (!product) return;
    if (product.quantity <= 0) {
      alert("Sản phẩm đã hết hàng!");
      return;
    }
    // Tạo object riêng cho checkout với purchaseQuantity
    checkoutList = [
      {
        name: product.name,
        value: product.value,
        category: product.category,
        image: product.image,
        purchaseQuantity: 1, // Số lượng mua (không phải quantity tồn kho)
      },
    ];
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
      const qty = item.purchaseQuantity || 1;
      const itemTotal = parsePrice(item.value) * qty;
      total += itemTotal;
      const d = document.createElement("div");
      d.className = "checkout-item";
      d.innerHTML = `<p><strong>${escapeHtml(
        item.name
      )}</strong> x${qty} - ${formatPrice(itemTotal)}đ</p>`;
      checkoutItemsEl.appendChild(d);
    });

    checkoutTotalEl.textContent = formatPrice(total);
  }

  if (confirmCheckoutBtn) {
    confirmCheckoutBtn.addEventListener("click", () => {
      // Lấy địa chỉ dựa trên lựa chọn radio (dùng địa chỉ lưu hoặc nhập mới)
      let address = "";
      if (useSavedAddressRadio && useSavedAddressRadio.checked) {
        // Dùng địa chỉ hiện tại từ hồ sơ
        const currentUser = localStorage.getItem("currentUser");
        const u = users.find((x) => x.username === currentUser);
        address = u && u.address ? String(u.address).trim() : "";
      } else {
        // Dùng địa chỉ nhập mới
        address = checkoutAddressEl?.value?.trim() || "";
      }

      if (!address) {
        alert("Vui lòng nhập hoặc chọn địa chỉ giao hàng.");
        return;
      }

      const currentUser =
        localStorage.getItem("currentUser") ||
        displayedUsername?.innerText ||
        "Guest";
      const invoice = {
        id: Date.now(),
        date: new Date().toLocaleString("vi-VN"),
        user: currentUser,
        address: address,
        items: checkoutList.map((it) => ({
          name: it.name,
          price: it.value,
          quantity: it.purchaseQuantity || it.quantity || 1, // Ưu tiên purchaseQuantity
        })),
        total: checkoutList.reduce(
          (sum, it) =>
            sum +
            parsePrice(it.value) * (it.purchaseQuantity || it.quantity || 1),
          0
        ),
      };

      // Nếu người dùng chọn lưu địa chỉ thì cập nhật vào hồ sơ
      try {
        if (
          saveAddressCheckbox &&
          saveAddressCheckbox.checked &&
          currentUser &&
          currentUser !== "Guest"
        ) {
          const u = users.find((x) => x.username === currentUser);
          if (u) {
            u.address = address;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
            if (savedAddressDisplay) savedAddressDisplay.innerText = address;
          }
        }
      } catch (e) {
        console.error("Lỗi khi lưu địa chỉ người dùng:", e);
      }
      
      // CẬP NHẬT TỒN KHO
      let isFromCart = cart.length > 0 && checkoutList.length === cart.length;
      
      checkoutList.forEach((it) => {
        const p = products.find((x) => x.name === it.name);
        const purchaseQty = it.purchaseQuantity || it.quantity || 1;
        if (p && p.quantity >= purchaseQty) {
          p.quantity -= purchaseQty; // Trừ đúng số lượng mua
        } else if (p) {
          console.warn(`Không đủ hàng ${p.name}, chỉ trừ ${p.quantity}`);
          p.quantity = 0; // Hết hàng
        }
      });

      invoices.push(invoice);
      localStorage.setItem("invoices", JSON.stringify(invoices));
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      renderProducts(); // Render lại sản phẩm (với số lượng mới)

      alert("🎉 Bạn đã mua thành công sản phẩm!");
      if (checkoutPopup) checkoutPopup.style.display = "none";
      checkoutList = [];

      // Xóa giỏ hàng sau khi thanh toán (nếu mua từ giỏ hàng)
      if (isFromCart) {
         cart = [];
         localStorage.setItem("cart", JSON.stringify(cart));
         renderCart();
      }
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

      // Kiểm tra admin
      if (usernameInput === "admin1" && passwordInput === "admin1") {
        if (loginPopup) loginPopup.style.display = "none";
        if (loginBtn) loginBtn.style.display = "none";
        if (openProductFormBtn) openProductFormBtn.style.display = "block";
        if (openRegister) openRegister.style.display = "none";
        if (usernameDisplay) usernameDisplay.style.display = "flex";
        if (displayedUsername) displayedUsername.innerText = "Admin";
        localStorage.setItem("isAdmin", "true");
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUser", "admin1");
        alert("Chào mừng Admin!");
        renderProducts();
        return;
      }

      // Kiểm tra user thông thường
      const foundUser = users.find(
        (u) => u.username === usernameInput && u.password === passwordInput
      );

      if (foundUser) {
        if (loginPopup) loginPopup.style.display = "none";
        if (loginBtn) loginBtn.style.display = "none";
        if (usernameDisplay) usernameDisplay.style.display = "flex";
        if (displayedUsername) displayedUsername.innerText = usernameInput;
        if (openRegister) openRegister.style.display = "none";
        localStorage.setItem("isLoggedIn", "true");
        localStorage.setItem("currentUser", usernameInput);
        alert("Đăng nhập thành công!");
      } else {
        alert("Sai tên đăng nhập hoặc mật khẩu!");
      }
    };
  }

  // ===== ĐĂNG NHẬP BẰNG URL =====

  // Hàm tạo URL đăng nhập
  window.generateLoginUrl = function (username, password) {
    const encodedUsername = btoa(username); // Base64 encode
    const encodedPassword = btoa(password);
    const loginUrl = `${window.location.origin}${window.location.pathname}?login=${encodedUsername}&key=${encodedPassword}`;
    return loginUrl;
  };

  // Hàm xử lý đăng nhập từ URL
  function handleUrlLogin() {
    const urlParams = new URLSearchParams(window.location.search);
    const loginParam = urlParams.get("login");
    const keyParam = urlParams.get("key");

    if (loginParam && keyParam) {
      try {
        const username = atob(loginParam); // Base64 decode
        const password = atob(keyParam);

        // Xóa parameters khỏi URL để bảo mật
        window.history.replaceState(
          {},
          document.title,
          window.location.pathname
        );

        // Kiểm tra admin
        if (username === "admin1" && password === "admin1") {
          if (loginBtn) loginBtn.style.display = "none";
          if (openProductFormBtn) openProductFormBtn.style.display = "block";
          if (openRegister) openRegister.style.display = "none";
          if (usernameDisplay) usernameDisplay.style.display = "flex";
          if (displayedUsername) displayedUsername.innerText = "Admin";
          localStorage.setItem("isAdmin", "true");
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("currentUser", "admin1");

          showNotification("✅ Đăng nhập Admin thành công qua URL!", "success");
          return;
        }

        // Kiểm tra user thông thường
        const foundUser = users.find(
          (u) => u.username === username && u.password === password
        );

        if (foundUser) {
          if (loginBtn) loginBtn.style.display = "none";
          if (usernameDisplay) usernameDisplay.style.display = "flex";
          if (displayedUsername) displayedUsername.innerText = username;
          if (openRegister) openRegister.style.display = "none";
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("currentUser", username);

          showNotification(
            `✅ Chào mừng ${username} đăng nhập qua URL!`,
            "success"
          );
        } else {
          showNotification("❌ Thông tin đăng nhập URL không hợp lệ!", "error");
        }
      } catch (error) {
        showNotification("❌ URL đăng nhập không hợp lệ!", "error");
        console.error("URL login error:", error);
      }
    }
  }

  // Hàm hiển thị thông báo
  function showNotification(message, type = "info") {
    // Xóa notification cũ nếu có
    const oldNotif = document.querySelector(".custom-notification");
    if (oldNotif) oldNotif.remove();

    const notification = document.createElement("div");
    notification.className = `custom-notification notification-${type}`;
    notification.innerHTML = `
      <div class="notification-content">
        <i class="fa-solid ${
          type === "success"
            ? "fa-check-circle"
            : type === "error"
            ? "fa-exclamation-circle"
            : "fa-info-circle"
        }"></i>
        <span>${message}</span>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">
        <i class="fa-solid fa-times"></i>
      </button>
    `;

    document.body.appendChild(notification);

    // Tự động ẩn sau 5 giây
    setTimeout(() => {
      notification.style.animation = "slideOutRight 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }

  // Thêm CSS cho notification
  const notificationStyles = document.createElement("style");
  notificationStyles.textContent = `
    .custom-notification {
      position: fixed;
      top: 80px;
      right: 20px;
      min-width: 320px;
      max-width: 500px;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 15px;
      animation: slideInRight 0.4s ease-out;
      backdrop-filter: blur(10px);
    }
    
    .notification-success {
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      color: white;
    }
    
    .notification-error {
      background: linear-gradient(135deg, #f44336 0%, #da190b 100%);
      color: white;
    }
    
    .notification-info {
      background: linear-gradient(135deg, #2196f3 0%, #0b7dda 100%);
      color: white;
    }
    
    .notification-content {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
    }
    
    .notification-content i {
      font-size: 1.5rem;
      opacity: 0.9;
    }
    
    .notification-content span {
      font-weight: 500;
      line-height: 1.4;
    }
    
    .notification-close {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s;
      flex-shrink: 0;
    }
    
    .notification-close:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }
    
    @keyframes slideInRight {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    
    @keyframes slideOutRight {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
    
    @media (max-width: 768px) {
      .custom-notification {
        right: 10px;
        left: 10px;
        min-width: auto;
        max-width: calc(100% - 20px);
      }
    }
    
    /* Copy URL Feature */
    .url-login-container {
      margin-top: 20px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 12px;
      border: 2px dashed #667eea;
    }
    
    .url-login-title {
      color: #667eea;
      font-weight: 600;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .url-input-group {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }
    
    .url-input {
      flex: 1;
      padding: 10px 14px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      font-size: 0.9rem;
      font-family: monospace;
      background: white;
    }
    
    .url-copy-btn {
      padding: 10px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .url-copy-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }
    
    .url-info {
      margin-top: 10px;
      font-size: 0.85rem;
      color: #666;
      display: flex;
      align-items: start;
      gap: 6px;
    }
  `;
  document.head.appendChild(notificationStyles);

  // Thêm tính năng copy URL vào popup đăng nhập
  function addUrlLoginFeature() {
    const loginPopupContent = loginPopup?.querySelector(".popup-content");
    if (!loginPopupContent) return;

    // Kiểm tra xem đã có container chưa
    if (loginPopupContent.querySelector(".url-login-container")) return;

    const urlContainer = document.createElement("div");
    urlContainer.className = "url-login-container";
    urlContainer.innerHTML = `
      <div class="url-login-title">
        <i class="fa-solid fa-link"></i>
        Đăng nhập nhanh bằng URL
      </div>
      <div class="url-input-group">
        <input type="text" id="loginUrlInput" class="url-input" readonly placeholder="Nhập thông tin và nhấn Tạo URL">
        <button id="generateUrlBtn" class="url-copy-btn">
          <i class="fa-solid fa-magic"></i>
          Tạo URL
        </button>
        <button id="copyUrlBtn" class="url-copy-btn" style="display: none;">
          <i class="fa-solid fa-copy"></i>
          Copy
        </button>
      </div>
      <div class="url-info">
        <i class="fa-solid fa-info-circle" style="margin-top: 2px;"></i>
        <span>Tạo link đăng nhập tự động để chia sẻ hoặc lưu lại. Link sẽ tự xóa thông tin sau khi đăng nhập.</span>
      </div>
    `;

    loginPopupContent.appendChild(urlContainer);

    // Event listener cho nút tạo URL
    const generateBtn = document.getElementById("generateUrlBtn");
    const copyBtn = document.getElementById("copyUrlBtn");
    const urlInput = document.getElementById("loginUrlInput");

    if (generateBtn && urlInput) {
      generateBtn.addEventListener("click", () => {
        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        if (!username || !password) {
          showNotification(
            "⚠️ Vui lòng nhập tên đăng nhập và mật khẩu!",
            "error"
          );
          return;
        }

        const loginUrl = window.generateLoginUrl(username, password);
        urlInput.value = loginUrl;
        generateBtn.style.display = "none";
        copyBtn.style.display = "flex";

        showNotification("✅ Đã tạo URL đăng nhập!", "success");
      });
    }

    if (copyBtn && urlInput) {
      copyBtn.addEventListener("click", () => {
        urlInput.select();
        document.execCommand("copy");

        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = '<i class="fa-solid fa-check"></i> Đã copy!';

        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);

        showNotification("✅ Đã copy URL vào clipboard!", "success");
      });
    }

    // Reset khi đóng popup
    if (closeLoginPopup) {
      closeLoginPopup.addEventListener("click", () => {
        if (urlInput) urlInput.value = "";
        if (generateBtn) generateBtn.style.display = "flex";
        if (copyBtn) copyBtn.style.display = "none";
      });
    }
  }

  // Gọi hàm xử lý URL login khi trang load
  handleUrlLogin();

  // Thêm feature URL login vào popup sau khi DOM ready
  setTimeout(addUrlLoginFeature, 100);

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

      users.push({ username, password, email: "", phone: "", address: "" });
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
      
      // Kiểm tra tồn kho trước khi mở checkout
      for (const item of cart) {
        const product = products.find(p => p.name === item.name);
        if (!product || item.quantity > product.quantity) {
          alert(`Sản phẩm "${item.name}" không đủ hàng (Chỉ còn ${product.quantity}). Vui lòng điều chỉnh giỏ hàng.`);
          return;
        }
      }
      
      // Chuyển đổi cart items thành format với purchaseQuantity
      checkoutList = cart.map((item) => ({
        name: item.name,
        value: item.value,
        purchaseQuantity: item.quantity, // Số lượng từ giỏ hàng
      }));
      renderCheckoutPopup();
      // Prefill địa chỉ nếu user đã có địa chỉ trong hồ sơ; chọn radio tương ứng
      try {
        const currentUser = localStorage.getItem("currentUser");
        const u = users.find((x) => x.username === currentUser);
        const saved = u && u.address ? u.address : "";
        if (savedAddressDisplay)
          savedAddressDisplay.innerText = saved || "Chưa có địa chỉ";
        if (useSavedAddressRadio && enterNewAddressRadio && checkoutAddressEl) {
          if (saved) {
            useSavedAddressRadio.checked = true;
            enterNewAddressRadio.checked = false;
            checkoutAddressEl.value = saved;
            checkoutAddressEl.disabled = true;
          } else {
            useSavedAddressRadio.checked = false;
            enterNewAddressRadio.checked = true;
            checkoutAddressEl.value = "";
            checkoutAddressEl.disabled = false;
          }
        }
        if (saveAddressCheckbox) saveAddressCheckbox.checked = false;
      } catch (e) {
        console.error("Prefill địa chỉ gặp lỗi:", e);
      }
      if (checkoutPopup) checkoutPopup.style.display = "flex";

      //xử lý bật/tắt ô nhập địa chỉ.
      if (useSavedAddressRadio) {
        useSavedAddressRadio.addEventListener("change", () => {
          if (useSavedAddressRadio.checked && checkoutAddressEl) {
            checkoutAddressEl.disabled = true;
            checkoutAddressEl.value = savedAddressDisplay
              ? savedAddressDisplay.innerText
              : checkoutAddressEl.value;
          }
        });
      }
      if (enterNewAddressRadio) {
        enterNewAddressRadio.addEventListener("change", () => {
          if (enterNewAddressRadio.checked && checkoutAddressEl) {
            checkoutAddressEl.disabled = false;
            const savedText = savedAddressDisplay
              ? savedAddressDisplay.innerText
              : "";
            if (checkoutAddressEl.value === savedText)
              checkoutAddressEl.value = "";
            checkoutAddressEl.focus();
          }
        });
      }
    };
  }

  // ===== CẬP NHẬT: HỒ SƠ NGƯỜI DÙNG MỞ RỘNG =====

  // Render hồ sơ người dùng với các tab
  function renderUserProfile() {
    const currentUser = localStorage.getItem("currentUser");
    if (!currentUser) return;

    const user = users.find((u) => u.username === currentUser);
    const userInvoices = invoices.filter((inv) => inv.user === currentUser);

    if (!userPopup) return;

    const popupContent = userPopup.querySelector(".popup-content");
    if (!popupContent) return;

    popupContent.innerHTML = `
      <span id="close-user-popup-new" class="close">&times;</span>
      <h2 style="color: #667eea; margin-bottom: 20px;">
        <i class="fa-solid fa-circle-user"></i> Hồ sơ người dùng
      </h2>
      
      <!-- Tabs -->
      <div class="profile-tabs" style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 2px solid #e0e0e0;">
        <button class="profile-tab active" data-tab="info">
          <i class="fa-solid fa-user"></i> Thông tin
        </button>
        <button class="profile-tab" data-tab="edit">
          <i class="fa-solid fa-pen"></i> Chỉnh sửa
        </button>
        <button class="profile-tab" data-tab="invoices">
          <i class="fa-solid fa-file-invoice"></i> Hóa đơn
        </button>
        <button class="profile-tab" data-tab="purchases">
          <i class="fa-solid fa-shopping-bag"></i> Mua hàng
        </button>
      </div>
      
      <!-- Tab Content -->
      <div class="profile-content">
        <!-- Tab: Thông tin -->
        <div class="tab-panel active" data-panel="info">
          <div style="background: #f8f9fa; padding: 20px; border-radius: 12px;">
            <p style="margin: 10px 0;"><strong>Tên đăng nhập:</strong> ${escapeHtml(
              currentUser
            )}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> ${escapeHtml(
              user?.email || "Chưa cập nhật"
            )}</p>
            <p style="margin: 10px 0;"><strong>Số điện thoại:</strong> ${escapeHtml(
              user?.phone || "Chưa cập nhật"
            )}</p>
            <p style="margin: 10px 0;"><strong>Địa chỉ:</strong> ${escapeHtml(
              user?.address || "Chưa cập nhật"
            )}</p>
          </div>
        </div>
        
        <!-- Tab: Chỉnh sửa thông tin -->
        <div class="tab-panel" data-panel="edit" style="display: none;">
          <form id="editProfileForm" style="display: flex; flex-direction: column; gap: 15px;">
            <div class="input-group">
              <label>Email:</label>
              <input type="email" id="edit-email" value="${user?.email || ""}" 
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
            </div>
            <div class="input-group">
              <label>Số điện thoại:</label>
              <input type="tel" id="edit-phone" value="${user?.phone || ""}" 
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
            </div>
            <div class="input-group">
              <label>Địa chỉ:</label>
              <textarea id="edit-address" rows="3" 
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">${
                  user?.address || ""
                }</textarea>
            </div>
            <div class="input-group">
              <label>Mật khẩu mới (để trống nếu không đổi):</label>
              <input type="password" id="edit-password" placeholder="Nhập mật khẩu mới" 
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px;">
            </div>
            <button type="submit" class="login-button">
              <i class="fa-solid fa-save"></i> Lưu thay đổi
            </button>
          </form>
        </div>
        
        <!-- Tab: Kiểm tra hóa đơn -->
        <div class="tab-panel" data-panel="invoices" style="display: none;">
          ${
            userInvoices.length === 0
              ? '<p style="text-align: center; color: #999; padding: 20px;">Chưa có hóa đơn nào.</p>'
              : `<div style="max-height: 400px; overflow-y: auto;">
              ${userInvoices
                .map(
                  (inv) => `
                <div class="invoice-card" style="background: #f8f9fa; padding: 15px; border-radius: 10px; margin-bottom: 15px; border-left: 4px solid #667eea;">
                  <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 10px;">
                    <div>
                      <strong style="color: #667eea;">Mã HĐ: #${inv.id}</strong>
                      <p style="margin: 5px 0; font-size: 0.9rem; color: #666;">
                        <i class="fa-solid fa-calendar"></i> ${inv.date}
                      </p>
                    </div>
                    <span style="background: #4caf50; color: white; padding: 4px 10px; border-radius: 12px; font-size: 0.8rem;">
                      Hoàn thành
                    </span>
                  </div>
                  <div style="border-top: 1px dashed #ddd; padding-top: 10px; margin-top: 10px;">
                    ${inv.items
                      .map(
                        (item) => `
                      <div style="display: flex; justify-content: space-between; margin: 5px 0;">
                        <span>${escapeHtml(item.name)} x${
                          item.quantity || 1
                        }</span>
                        <span style="font-weight: 600;">${formatPrice(
                          item.price
                        )}đ</span>
                      </div>
                    `
                      )
                      .join("")}
                  </div>
                  <div style="border-top: 2px solid #667eea; padding-top: 10px; margin-top: 10px; text-align: right;">
                    <strong style="color: #e91e63; font-size: 1.1rem;">
                      Tổng: ${formatPrice(inv.total)}đ
                    </strong>
                  </div>
                </div>
              `
                )
                .join("")}
            </div>`
          }
        </div>
        
        <!-- Tab: Thông tin mua hàng -->
        <div class="tab-panel" data-panel="purchases" style="display: none;">
          ${
            userInvoices.length === 0
              ? '<p style="text-align: center; color: #999; padding: 20px;">Chưa có giao dịch nào.</p>'
              : `<div style="background: #f8f9fa; padding: 20px; border-radius: 12px;">
              <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 20px;">
                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">
                  <i class="fa-solid fa-shopping-cart" style="font-size: 2rem; color: #667eea; margin-bottom: 10px;"></i>
                  <h3 style="margin: 0; color: #667eea;">${
                    userInvoices.length
                  }</h3>
                  <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">Đơn hàng</p>
                </div>
                <div style="background: white; padding: 15px; border-radius: 10px; text-align: center;">
                  <i class="fa-solid fa-dollar-sign" style="font-size: 2rem; color: #4caf50; margin-bottom: 10px;"></i>
                  <h3 style="margin: 0; color: #4caf50;">${formatPrice(
                    userInvoices.reduce((sum, inv) => sum + inv.total, 0)
                  )}đ</h3>
                  <p style="margin: 5px 0; color: #666; font-size: 0.9rem;">Tổng chi tiêu</p>
                </div>
              </div>
              
              <h4 style="color: #667eea; margin: 20px 0 10px 0;">Sản phẩm đã mua</h4>
              <div style="max-height: 250px; overflow-y: auto;">
                ${(() => {
                  const allProducts = {};
                  userInvoices.forEach((inv) => {
                    inv.items.forEach((item) => {
                      if (!allProducts[item.name]) {
                        allProducts[item.name] = { quantity: 0, total: 0 };
                      }
                      allProducts[item.name].quantity += item.quantity || 1;
                      allProducts[item.name].total +=
                        item.price * (item.quantity || 1);
                    });
                  });

                  return Object.entries(allProducts)
                    .map(
                      ([name, data]) => `
                    <div style="display: flex; justify-content: space-between; padding: 10px; background: white; margin-bottom: 8px; border-radius: 8px;">
                      <span><strong>${escapeHtml(
                        name
                      )}</strong> <span style="color: #666;">(x${
                        data.quantity
                      })</span></span>
                      <span style="color: #e91e63; font-weight: 600;">${formatPrice(
                        data.total
                      )}đ</span>
                    </div>
                  `
                    )
                    .join("");
                })()}
              </div>
            </div>`
          }
        </div>
      </div>
      
      <button id="logout-btn-new" class="login-button" style="margin-top: 20px; background: linear-gradient(135deg, #f44336 0%, #e91e63 100%);">
        <i class="fa-solid fa-sign-out-alt"></i> Đăng xuất
      </button>
    `;

    // Thêm CSS cho tabs
    const style = document.createElement("style");
    style.textContent = `
      .profile-tabs {
        overflow-x: auto;
        white-space: nowrap;
      }
      .profile-tab {
        background: transparent;
        border: none;
        padding: 12px 20px;
        cursor: pointer;
        font-weight: 600;
        color: #666;
        transition: all 0.3s;
        border-bottom: 3px solid transparent;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }
      .profile-tab:hover {
        color: #667eea;
      }
      .profile-tab.active {
        color: #667eea;
        border-bottom-color: #667eea;
      }
      .tab-panel {
        animation: fadeIn 0.3s ease-out;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      .invoice-card {
        transition: transform 0.2s;
      }
      .invoice-card:hover {
        transform: translateX(5px);
      }
    `;
    document.head.appendChild(style);

    // Event listeners cho tabs
    const tabs = popupContent.querySelectorAll(".profile-tab");
    const panels = popupContent.querySelectorAll(".tab-panel");

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetPanel = tab.dataset.tab;

        tabs.forEach((t) => t.classList.remove("active"));
        panels.forEach((p) => {
          p.style.display = "none";
          p.classList.remove("active");
        });

        tab.classList.add("active");
        const panel = popupContent.querySelector(
          `[data-panel="${targetPanel}"]`
        );
        if (panel) {
          panel.style.display = "block";
          panel.classList.add("active");
        }
      });
    });

    // Event listener cho form chỉnh sửa
    const editForm = popupContent.querySelector("#editProfileForm");
    if (editForm) {
      editForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const email = document.getElementById("edit-email").value;
        const phone = document.getElementById("edit-phone").value;
        const address = document.getElementById("edit-address").value;
        const newPassword = document.getElementById("edit-password").value;

        const userIndex = users.findIndex((u) => u.username === currentUser);
        if (userIndex !== -1) {
          users[userIndex].email = email;
          users[userIndex].phone = phone;
          users[userIndex].address = address;

          if (newPassword.trim()) {
            users[userIndex].password = newPassword;
          }

          localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
          alert("✅ Cập nhật thông tin thành công!");

          // Chuyển về tab thông tin
          tabs[0].click();
          renderUserProfile();
        }
      });
    }

    // Event listener cho nút đóng mới
    const closeBtn = popupContent.querySelector("#close-user-popup-new");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        userPopup.style.display = "none";
      });
    }

    // Event listener cho nút đăng xuất mới
    const logoutBtnNew = popupContent.querySelector("#logout-btn-new");
    if (logoutBtnNew) {
      logoutBtnNew.addEventListener("click", () => {
        localStorage.removeItem("isLoggedIn");
        localStorage.removeItem("isAdmin");
        localStorage.removeItem("currentUser");
        localStorage.removeItem("cart");
        window.location.reload();
      });
    }
  }

  // ----- User Profile Popup -----
  if (usernameDisplay && userPopup) {
    usernameDisplay.addEventListener("click", () => {
      renderUserProfile();
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
        localStorage.removeItem("currentUser");
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
    
    // THÊM LOGIC ĐÓNG POPUP CHI TIẾT
    if (ev.target === productDetailPopup) {
      productDetailPopup.style.display = "none";
    }
  });
  
  // THÊM LOGIC CHO NÚT ĐÓNG POPUP CHI TIẾT
  if (closeProductDetailPopup) {
    closeProductDetailPopup.onclick = () => {
      productDetailPopup.style.display = "none";
    };
  }

  // ----- Return to User button -----
  const returnToUserBtn = document.getElementById("returnToUserBtn");
  if (returnToUserBtn) {
    returnToUserBtn.addEventListener("click", () => {
      const adminElement = document.querySelector("admin");
      if (adminElement) adminElement.style.display = "none";
      const userElement = document.querySelector("user");
      if (userElement) userElement.style.display = "block";
    });
  }

  // ----- Initial Render -----
  renderProducts();
  renderCart();

  // ----- Expose global functions -----
  window.addToCart = addToCart;
  window.buyProduct = buyProduct;

  // Khôi phục trạng thái đăng nhập
  function restoreLoginState() {
     const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
     const currentUser = localStorage.getItem("currentUser");
     const isAdmin = localStorage.getItem("isAdmin") === "true";
     
     if(isLoggedIn && currentUser) {
        if(loginBtn) loginBtn.style.display = "none";
        if(openRegister) openRegister.style.display = "none";
        if(usernameDisplay) usernameDisplay.style.display = "flex";
        if(displayedUsername) displayedUsername.innerText = currentUser;
        
        if (isAdmin) {
             if(openProductFormBtn) openProductFormBtn.style.display = "block";
        }
     }
  }
  
  restoreLoginState();
});