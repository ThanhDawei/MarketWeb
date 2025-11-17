// === KHAI BÁO BIẾN TOÀN CỤC VÀ KHÓA LOCALSTORAGE ===
const PRODUCTS_KEY = "products"; // Sản phẩm trên kệ (Inventory)
const PRODUCT_DEFINITIONS_KEY = "productDefinitions"; // Định nghĩa sản phẩm (Catalog)
const STORAGE_KEY = "userAccounts";
const INVOICES_KEY = "invoices";
const IMPORT_RECEIPTS_KEY = "importReceipts";

// Tải dữ liệu từ LocalStorage
let products = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
let productDefinitions =
  JSON.parse(localStorage.getItem(PRODUCT_DEFINITIONS_KEY)) || [];
let users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let invoices = JSON.parse(localStorage.getItem(INVOICES_KEY)) || [];
let importReceipts =
  JSON.parse(localStorage.getItem(IMPORT_RECEIPTS_KEY)) || [];

// Biến trạng thái cho Popup
window.editingProductIndex = -1;
window.isAddingDefinition = false; // Cờ mới: true khi "Thêm định nghĩa"

document.addEventListener("DOMContentLoaded", () => {
  // === THÊM CSS CHO TRẠNG THÁI HÓA ĐƠN ===
  const adminStyles = document.createElement("style");
  adminStyles.textContent = `
    /* ... (Giữ nguyên CSS) ... */
    .invoice-status-select { padding: 6px 10px; border: 1px solid #ccc; border-radius: 6px; font-weight: 600; outline: none; -webkit-appearance: none; -moz-appearance: none; appearance: none; background-position: right 10px center; background-repeat: no-repeat; background-size: 12px; background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="%23666"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>'); padding-right: 30px; }
    .status-new { background-color: #e0f2fe; color: #0c4a6e; border-color: #7dd3fc; }
    .status-processing { background-color: #fef9c3; color: #713f12; border-color: #fde047; }
    .status-delivered { background-color: #dcfce7; color: #14532d; border-color: #86efac; }
    .status-delivering { background-color: #fcecdcff; color: #533a14ff; border-color: #efb986ff; }
    .status-canceled { background-color: #fee2e2; color: #7f1d1d; border-color: #fca5a5; }

    /* (MỚI) CSS CHO SẢN PHẨM BỊ ẨN */
    .product-row-hidden { 
      opacity: 0.6; 
      background-color: #fcfcfc; 
    }
    .product-row-hidden td { 
      color: #777; 
    }
    .product-row-hidden .product-img-mini {
      filter: grayscale(80%);
    }

    /* (MỚI) CSS CHO BỘ LỌC */
    .filter-controls { 
      display: flex; 
      gap: 10px; 
      margin-bottom: 20px; 
      flex-wrap: wrap; 
      align-items: center;
      padding: 15px;
      background-color: #f9f9f9;
      border-radius: 8px;
    }
    .filter-controls input[type="text"],
    .filter-controls input[type="date"],
    .filter-controls select {
      padding: 8px; 
      border: 1px solid #ccc; 
      border-radius: 4px; 
    }
    .filter-controls label {
      font-weight: 600;
      font-size: 14px;
      margin-right: -5px;
    }
    .filter-controls .btn-filter {
      padding: 8px 12px;
      background-color: #667eea;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }
    .filter-controls .btn-reset {
      padding: 8px 12px;
      background-color: #718096;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 600;
    }
  `;
  document.head.appendChild(adminStyles);
  // ======================================
  // DOM Elements
  const manageUserBtn = document.getElementById("manageUserBtn");
  const manageProductBtn = document.getElementById("manageProductBtn");
  const manageInvoiceBtn = document.getElementById("manageInvoiceBtn");
  const addInfoBtn = document.getElementById("addInfoBtn");
  const manageStockBtn = document.getElementById("manageStockBtn");
  const manageProfitBtn = document.getElementById("manageProfitBtn");
  const profitContent = document.getElementById("profitContent");
  const userContent = document.getElementById("userContent");
  const productContent = document.getElementById("productContent");
  const invoiceContent = document.getElementById("invoiceContent");
  const addInfoContent = document.getElementById("addInfoContent");
  const stockContent = document.getElementById("stockContent");
  const stockTableBody = document.getElementById("stockTableBody");

  // === HÀM TIỆN ÍCH CƠ BẢN (GIỮ NGUYÊN) ===
  function formatPrice(value) {
    return parseInt(value || 0).toLocaleString("vi-VN");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getStatusClass(status) {
    switch (status) {
      case "Mới đặt":
        return "status-new";
      case "Đang xử lý":
        return "status-processing";
      case "Đang vận chuyển":
        return "status-delivering";
      case "Đã giao":
        return "status-delivered";
      case "Đã hủy":
        return "status-canceled";
      default:
        return "";
    }
  }

  function getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  const placeholderImg = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#f2f2f2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="28">No Image</text></svg>'
  )}`;

  // === (HÀM MỚI) HỖ TRỢ PHÂN TÍCH NGÀY THÁNG VIỆT NAM ===
  function parseVNDate(dateString) {
    if (!dateString) return null;
    try {
      const datePart = dateString.split(",")[0].trim(); // "17/11/2025"
      const parts = datePart.split("/"); // ["17", "11", "2025"]
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Tháng trong JS bắt đầu từ 0
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
          const dateObj = new Date(year, month, day);
          if (
            dateObj.getFullYear() === year &&
            dateObj.getMonth() === month &&
            dateObj.getDate() === day
          ) {
            return dateObj;
          }
        }
      }
      return null;
    } catch (e) {
      console.error("Lỗi phân tích ngày:", dateString, e);
      return null;
    }
  }
  // ========================================================

  // (KHỐI DỮ LIỆU MẪU - TỪ FILE CỦA BẠN)
  if (!localStorage.getItem("productDefinitions")) {
    localStorage.setItem(
      "productDefinitions",
      JSON.stringify([
        {
          name: "Laptop Dell XPS 13 9340",
          category: "Laptop",
          description:
            "Laptop cao cấp siêu mỏng nhẹ với màn hình InfinityEdge, hiệu năng mạnh mẽ cho công việc và giải trí.",
          specs:
            "CPU: Intel Core Ultra 7, RAM: 32GB LPDDR5x, Ổ cứng: 1TB SSD NVMe, Màn hình: 13.4 inch 3K+",
          image: "../image/DellXPS13.jpg",
        },
        {
          name: "Apple Watch Series 9 45mm",
          category: "Đồng hồ thông minh",
          description:
            "Đồng hồ thông minh thế hệ mới nhất từ Apple với chip S9 SiP, hỗ trợ Double Tap, màn hình sáng hơn và tích hợp Siri trên thiết bị.",
          specs:
            "Chip: S9 SiP, Kích thước: 45mm, Chống nước: 50m, Tính năng: Double Tap, Cảm biến: Oxy trong máu, ECG",
          image: "../image/AppleWatchS9.jpg",
        },
        {
          name: "RAM Corsair Vengeance RGB 32GB (2x16GB) DDR5",
          category: "Linh kiện PC",
          description:
            "Kit RAM DDR5 hiệu năng cao với đèn LED RGB, tối ưu cho các hệ thống PC gaming và workstation hiện đại.",
          specs:
            "Dung lượng: 32GB (2x16GB), Loại: DDR5, Tốc độ: 6000MHz, LED: RGB",
          image: "../image/CorsairVengeance32GB.jpg",
        },
        {
          name: "iPad Pro 12.9 inch M2 256GB",
          category: "Máy tính bảng",
          description:
            "Máy tính bảng mạnh mẽ nhất của Apple với chip M2, màn hình Liquid Retina XDR và hỗ trợ Apple Pencil 2.",
          specs:
            "Chip: Apple M2, Kích thước: 12.9 inch, Màn hình: Liquid Retina XDR, Dung lượng: 256GB, Màu: Xám không gian",
          image: "../image/iPadProM2.jpg",
        },
        {
          name: "Apple AirPods Pro 2 (USB-C)",
          category: "Tai nghe",
          description:
            "Tai nghe không dây chống ồn chủ động (ANC) cao cấp, chất âm vượt trội và hộp sạc USB-C.",
          specs:
            "Chip: H2, Chống ồn: Chủ động (ANC), Hộp sạc: USB-C, Tính năng: Âm thanh không gian",
          image: "../image/AirPodsPro2.jpg",
        },
        {
          name: "Sạc dự phòng Anker 20000mAh",
          category: "Phụ kiện",
          description:
            "Sạc dự phòng dung lượng cao 20.000mAh, tích hợp cáp USB-C và màn hình hiển thị phần trăm pin.",
          specs:
            "Dung lượng: 20000mAh, Công suất: 22.5W, Cổng ra: USB-C (tích hợp), USB-A",
          image: "../image/Anker20000mAh.jpg",
        },
        {
          name: "Cáp Belkin USB-C to Lightning",
          category: "Phụ kiện",
          description:
            "Cáp sạc và truyền dữ liệu bện dù siêu bền, hỗ trợ sạc nhanh cho iPhone.",
          specs:
            "Đầu vào: USB-C, Đầu ra: Lightning, Chiều dài: 1m, Chất liệu: Bện dù, Màu: Đen",
          image: "../image/CableUSBCtoLightning.jpg",
        },
        {
          name: "Gimbal DJI Osmo Mobile 6",
          category: "Phụ kiện",
          description:
            "Gimbal chống rung 3 trục cho điện thoại thông minh, thiết kế nhỏ gọn, dễ sử dụng với nhiều tính năng quay phim sáng tạo.",
          specs:
            "Chống rung: 3 trục, Kết nối: Bluetooth 5.1, Tính năng: ActiveTrack 6.0, Tải trọng: 170-290g",
          image: "../image/DJIOM6.jpg",
        },
        {
          name: "iPhone 15 Pro Max 256GB",
          category: "Điện thoại",
          description:
            "iPhone cao cấp nhất với khung viền Titan, chip A17 Pro, hệ thống camera Pro mạnh mẽ và cổng sạc USB-C.",
          specs:
            "Chip: A17 Pro, Màn hình: 6.7 inch ProMotion, Camera: 48MP, Zoom quang: 5x, Chất liệu: Titan tự nhiên",
          image: "../image/IP15PM.jpg",
        },
        {
          name: "Ổ cứng WD My Passport 2TB",
          category: "Phụ kiện lưu trữ",
          description:
            "Ổ cứng di động nhỏ gọn, độ bền cao, phù hợp sao lưu dữ liệu và mang theo khi di chuyển.",
          specs:
            "Dung lượng: 2TB, Chuẩn kết nối: USB 3.2 Gen 1, Tương thích: Windows/macOS",
          image: "../image/WDMyPassport2TB.jpg",
        },
        {
          name: "Router TP-Link Archer AX73",
          category: "Thiết bị mạng",
          description:
            "Router WiFi 6 tốc độ cao, băng thông mạnh mẽ, phù hợp cho gia đình hoặc văn phòng.",
          specs:
            "WiFi: WiFi 6 AX5400, Băng tần: 2.4GHz & 5GHz, Cổng LAN: 4x Gigabit LAN, Anten: 6",
          image: "../image/TPLinkArcherAX73.jpg",
        },
        {
          name: "Tai nghe Sony WH-1000XM5",
          category: "Tai nghe",
          description:
            "Tai nghe chống ồn chủ động hàng đầu, chất âm cao cấp và thời lượng pin ấn tượng.",
          specs:
            "Driver: 30mm, Chống ồn ANC, Pin: 30 giờ, Sạc nhanh: 3 phút cho 3 giờ dùng",
          image: "../image/SonyWH1000XM5.jpg",
        },
        {
          name: "Samsung Galaxy Tab S9",
          category: "Máy tính bảng",
          description:
            "Tablet cao cấp màn hình AMOLED sắc nét, hỗ trợ S-Pen và hiệu năng mạnh mẽ.",
          specs:
            "Màn hình: 11 inch Dynamic AMOLED 2X, CPU: Snapdragon 8 Gen 2, RAM: 8GB, Bộ nhớ: 128GB",
          image: "../image/SamsungTabS9.jpg",
        },
        {
          name: "Samsung Galaxy Watch 6",
          category: "Đồng hồ thông minh",
          description:
            "Smartwatch hiện đại với màn hình lớn, nhiều tính năng theo dõi sức khỏe và luyện tập.",
          specs:
            "Màn hình: Super AMOLED, Kích thước: 40/44mm, Tính năng: Theo dõi nhịp tim, SpO2, ECG",
          image: "../image/SamsungGW6.jpg",
        },
        {
          name: "SSD Samsung 990 PRO 1TB",
          category: "Linh kiện máy tính",
          description:
            "SSD NVMe cao cấp với tốc độ đọc ghi cực nhanh, thích hợp cho game thủ và dân đồ họa.",
          specs:
            "Dung lượng: 1TB, Chuẩn: NVMe PCIe 4.0, Đọc: 7450 MB/s, Ghi: 6900 MB/s",
          image: "../image/Samsung990PRO1TB.jpg",
        },
        {
          name: "Ốp lưng iPhone 15 Pro",
          category: "Phụ kiện điện thoại",
          description:
            "Ốp lưng bảo vệ thiết kế sang trọng, chống sốc tốt cho iPhone 15 Pro.",
          specs:
            "Dành cho: iPhone 15 Pro, Chất liệu: TPU/PC, Tính năng: Chống sốc, chống trượt",
          image: "../image/OpLungIP15Pro.jpg",
        },
        {
          name: "MacBook Air M3",
          category: "Laptop",
          description:
            "Laptop siêu mỏng nhẹ với chip Apple M3 mạnh mẽ, thời lượng pin dài và màn hình Liquid Retina sắc nét.",
          specs:
            "CPU: Apple M3, RAM: 8GB, SSD: 256GB, Màn hình: 13.6 inch Liquid Retina",
          image: "../image/MacM3.jpg",
        },
        {
          name: "MacBook Pro 14 M3",
          category: "Laptop",
          description:
            "Laptop hiệu năng cao với chip Apple M3, màn hình Liquid Retina XDR và thời lượng pin vượt trội.",
          specs:
            "CPU: Apple M3, RAM: 8GB, SSD: 512GB, Màn hình: 14.2 inch Liquid Retina XDR",
          image: "../image/MBP14M3.jpg",
        },
        {
          name: "Chuột Logitech MX Master 3S",
          category: "Phụ kiện máy tính",
          description:
            "Chuột cao cấp cho dân văn phòng và sáng tạo nội dung, độ chính xác cao, cuộn siêu nhanh và hỗ trợ đa thiết bị.",
          specs:
            "Cảm biến: 8000 DPI, Kết nối: Bluetooth/Logi Bolt, Pin: 70 ngày, Tính năng: Silent Click, MagSpeed Scroll",
          image: "../image/LogitechMXMaster3S.jpg",
        },
      ])
    );
  }
  // ========================================================

  // === (HÀM MỚI) TÍNH TOÁN TỒN KHO THỰC TẾ (ĐÃ SỬA LỖI) ===
  function calculateInventory() {
    // ... (Giữ nguyên hàm calculateInventory đã sửa lỗi) ...
    const inventory = {};
    importReceipts.forEach((receipt) => {
      if (receipt.status === "Hoàn thành") {
        receipt.items.forEach((item) => {
          const key = item.productName.trim().toLowerCase();
          const quantity = parseInt(item.quantity || 0);
          if (!inventory[key]) {
            inventory[key] = { imported: 0, sold: 0, stock: 0 };
          }
          inventory[key].imported += quantity;
        });
      }
    });
    invoices.forEach((invoice) => {
      if (invoice.status !== "Đã hủy") {
        invoice.items.forEach((item) => {
          const key = item.name.trim().toLowerCase();
          const quantity = parseInt(item.quantity || 0);
          if (!inventory[key]) {
            inventory[key] = { imported: 0, sold: 0, stock: 0 };
          }
          inventory[key].sold += quantity;
        });
      }
    });
    Object.keys(inventory).forEach((key) => {
      inventory[key].stock = inventory[key].imported - inventory[key].sold;
    });
    return inventory;
  }

  // === (CẬP NHẬT) ĐỒNG BỘ TỒN KHO LÊN KỆ (Thêm logic Ẩn/Hiện) ===
  function syncInventoryToShelf() {
    const inventory = calculateInventory();
    const oldProducts = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
    let newProductsArray = [];

    // Duyệt qua tất cả CÁC ĐỊNH NGHĨA SẢN PHẨM
    productDefinitions.forEach((def) => {
      const key = def.name.trim().toLowerCase();
      const stockInfo = inventory[key] || { stock: 0 };
      const onShelfQuantity = stockInfo.stock;

      const oldProduct = oldProducts.find(
        (p) => p.name.trim().toLowerCase() === key
      );

      const latestImportPrice = parseInt(findLatestImportPrice(def.name) || 0);
      let sellingPrice;

      if (oldProduct && oldProduct.profitMargin > 0 && latestImportPrice > 0) {
        sellingPrice = calculateSellingPrice(
          latestImportPrice,
          oldProduct.profitMargin
        );
      } else {
        sellingPrice = latestImportPrice;
      }

      newProductsArray.push({
        name: def.name,
        category: def.category,
        description: def.description,
        specs: def.specs,
        image: def.image || (oldProduct ? oldProduct.image : placeholderImg),
        value: sellingPrice,
        quantity: onShelfQuantity,

        // === LOGIC CẬP NHẬT ===
        isManuallyHidden: def.isManuallyHidden || false, // (1. Thêm dòng này)
        isHidden: onShelfQuantity <= 0 || def.isManuallyHidden === true, // (2. Sửa dòng này)
        // =======================

        profitMargin: oldProduct ? oldProduct.profitMargin : 0,
      });
    });

    // Cập nhật biến toàn cục và lưu
    products = newProductsArray;
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  }

  // === Tải lại dữ liệu và Đồng bộ ngay khi tải trang ===
  function reloadDataAndSync() {
    users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    invoices = JSON.parse(localStorage.getItem(INVOICES_KEY)) || [];
    importReceipts =
      JSON.parse(localStorage.getItem(IMPORT_RECEIPTS_KEY)) || [];
    productDefinitions =
      JSON.parse(localStorage.getItem(PRODUCT_DEFINITIONS_KEY)) || [];

    // Đồng bộ tồn kho lên kệ (Quan trọng nhất)
    syncInventoryToShelf();
  }
  // ========================================================

  // === CÁC HÀM TIỆN ÍCH CŨ (GIỮ NGUYÊN) ===
  function isProductInUse(productName) {
    const lowerCaseName = productName.trim().toLowerCase();
    const inInvoice = invoices.some((invoice) =>
      invoice.items.some(
        (item) => item.name.trim().toLowerCase() === lowerCaseName
      )
    );
    if (inInvoice) return true;
    const inReceipt = importReceipts.some((receipt) =>
      receipt.items.some(
        (item) => item.productName.trim().toLowerCase() === lowerCaseName
      )
    );
    if (inReceipt) return true;
    return false;
  }
  function hideAllContent() {
    if (userContent) userContent.style.display = "none";
    if (productContent) productContent.style.display = "none";
    if (invoiceContent) invoiceContent.style.display = "none";
    if (addInfoContent) addInfoContent.style.display = "none";
    if (stockContent) stockContent.style.display = "none";
    if (profitContent) profitContent.style.display = "none";
  }
  function calculateUserStats() {
    const stats = {};
    users.forEach((user) => {
      if (user && user.username) {
        stats[user.username.trim().toLowerCase()] = {
          orderCount: 0,
          totalRevenue: 0,
          ...user,
        };
      }
    });
    invoices.forEach((invoice) => {
      if (invoice && invoice.user) {
        const usernameKey = invoice.user.trim().toLowerCase();
        if (stats[usernameKey]) {
          stats[usernameKey].orderCount += 1;
          stats[usernameKey].totalRevenue += invoice.total;
        }
      }
    });
    return Object.values(stats);
  }
  function calculateStockBreakdown(productName) {
    const key = productName.trim().toLowerCase();
    let imported = 0;
    let sold = 0;
    let onShelf = 0;
    importReceipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        if (item.productName.trim().toLowerCase() === key) {
          imported += parseInt(item.quantity || 0);
        }
      });
    });
    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        if (item.name.trim().toLowerCase() === key) {
          sold += parseInt(item.quantity || 0);
        }
      });
    });
    const productOnShelf = products.find(
      (p) => p.name.trim().toLowerCase() === key
    );
    if (productOnShelf) {
      onShelf = parseInt(productOnShelf.quantity || 0);
    }
    const available = onShelf;
    return { imported, sold, onShelf, available };
  }
  function getUniqueCategories() {
    const categories = new Set();
    productDefinitions.forEach((p) => categories.add(p.category));
    const filteredCategories = Array.from(categories)
      .filter((c) => c && c.trim() !== "")
      .sort();
    return [...new Set(filteredCategories)];
  }
  function getPriceRanges() {
    const prices = products.map((p) => p.value);
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
    const ranges = [];
    if (maxPrice > 0) {
      ranges.push({ label: "Dưới 100.000đ", min: 0, max: 100000 });
      if (maxPrice > 100000)
        ranges.push({ label: "100.000đ - 500.000đ", min: 100000, max: 500000 });
      if (maxPrice > 500000)
        ranges.push({
          label: "500.000đ - 1.000.000đ",
          min: 500000,
          max: 1000000,
        });
      if (maxPrice > 1000000)
        ranges.push({ label: "Trên 1.000.000đ", min: 1000000, max: Infinity });
    }
    return ranges.map((range) => ({
      label: range.label,
      value: `${range.min}-${range.max === Infinity ? "" : range.max}`,
    }));
  }
  function findLatestImportPrice(productName) {
    if (!productName) return "";
    const lowerCaseName = productName.trim().toLowerCase();
    for (let i = importReceipts.length - 1; i >= 0; i--) {
      const receipt = importReceipts[i];
      if (
        receipt &&
        receipt.status === "Hoàn thành" &&
        Array.isArray(receipt.items)
      ) {
        for (let j = 0; j < receipt.items.length; j++) {
          const item = receipt.items[j];
          if (
            item &&
            item.productName &&
            item.productName.trim().toLowerCase() === lowerCaseName
          ) {
            return typeof item.price !== "undefined" ? item.price : "";
          }
        }
      }
    }
    return "";
  }
  function calculateSellingPrice(importPrice, profitMargin) {
    return Math.round(importPrice * (1 + profitMargin / 100));
  }
  // ========================================================

  // === (CỤM HÀM MỚI) BỘ LỌC QUẢN LÝ LỢI NHUẬN ===
  function renderProfitTable(filteredProducts) {
    const tableBody = document.getElementById("profitTableBody");
    if (!tableBody) return;
    let html = "";
    let stt = 1;
    filteredProducts.forEach((product) => {
      const index = products.findIndex((p) => p.name === product.name);
      if (index === -1) return;
      if (product.isHidden) return;
      const importPriceNum = parseInt(product.importPrice) || 0;
      const newPrice =
        importPriceNum > 0
          ? calculateSellingPrice(
              importPriceNum,
              parseFloat(product.savedProfitMargin)
            )
          : product.value;
      const profitColor =
        parseFloat(product.currentProfitMargin) >= 0 ? "#38a169" : "#e53e3e";
      html += `
        <tr>
          <td>${stt++}</td>
          <td>${escapeHtml(product.name)}</td>
          <td>${
            product.importPrice !== "Chưa có"
              ? formatPrice(product.importPrice) + "đ"
              : product.importPrice
          }</td>
          <td><strong>${formatPrice(product.value)}đ</strong></td>
          <td style="font-weight: 600; color: ${profitColor};">
            ${product.currentProfitMargin}%
          </td>
          <td>
            <input 
              type="number" 
              id="profit-${index}" 
              value="${product.savedProfitMargin}"
              step="0.1"
              min="0"
              max="1000"
              onchange="updateNewPrice(${index})"
              style="width: 80px; padding: 5px; border: 1px solid #ccc; border-radius: 4px; text-align: center;"
              ${importPriceNum <= 0 ? "disabled" : ""}
            /> %
          </td>
          <td>
            <strong id="newPrice-${index}" style="color: #667eea; font-size: 16px;">
              ${formatPrice(newPrice)}đ
            </strong>
          </td>
          <td>
            <button onclick="applyProfitMargin(${index})" class="btn-edit" ${
        importPriceNum <= 0 ? "disabled" : ""
      }>
              <i class="fa-solid fa-check"></i> Áp dụng
            </button>
          </td>
        </tr>
      `;
    });
    if (!html) {
      html = `<tr><td colspan="8" class="empty-state">Không tìm thấy sản phẩm phù hợp.</td></tr>`;
    }
    tableBody.innerHTML = html;
  }
  window.filterProfit = function () {
    const query = document
      .getElementById("profitSearchInput")
      .value.toLowerCase()
      .trim();
    const shelfProducts = products.map((product) => {
      const importPrice = findLatestImportPrice(product.name);
      const currentPrice = product.value;
      let currentProfitMargin = 0;
      if (importPrice && importPrice !== "") {
        const importPriceNum = parseInt(importPrice, 10);
        if (importPriceNum > 0) {
          currentProfitMargin = (
            ((currentPrice - importPriceNum) / importPriceNum) *
            100
          ).toFixed(2);
        }
      }
      const savedMargin = product.profitMargin || currentProfitMargin;
      return {
        ...product,
        importPrice: importPrice || "Chưa có",
        currentProfitMargin: currentProfitMargin,
        savedProfitMargin: savedMargin,
      };
    });
    const filtered = shelfProducts.filter(
      (p) => p.name.toLowerCase().includes(query) && !p.isHidden
    );
    renderProfitTable(filtered);
  };
  function renderProfitManagement() {
    reloadDataAndSync();
    hideAllContent();
    if (!profitContent) return;
    profitContent.style.display = "block";
    const shelfProducts = products.map((product) => {
      const importPrice = findLatestImportPrice(product.name);
      const currentPrice = product.value;
      let currentProfitMargin = 0;
      if (importPrice && importPrice !== "") {
        const importPriceNum = parseInt(importPrice, 10);
        if (importPriceNum > 0) {
          currentProfitMargin = (
            ((currentPrice - importPriceNum) / importPriceNum) *
            100
          ).toFixed(2);
        }
      }
      const savedMargin = product.profitMargin || currentProfitMargin;
      return {
        ...product,
        importPrice: importPrice || "Chưa có",
        currentProfitMargin: currentProfitMargin,
        savedProfitMargin: savedMargin,
      };
    });
    let html = `
    <div class="management-header">
      <h2><i class="fa-solid fa-chart-line"></i> Quản lý Lợi nhuận</h2>
      <div style="display: flex; align-items: center; gap: 10px;">
        <button onclick="applyProfitToAll()" class="btn-add">
          <i class="fa-solid fa-percent"></i> Áp dụng % chung
        </button>
        <button onclick="refreshProfitManagement()" class="btn-refresh">
          <i class="fa-solid fa-rotate"></i> Làm mới
        </button>
      </div>
    </div>
    
    <div class="filter-controls">
      <label for="profitSearchInput">🔍 Tìm theo Tên SP:</label>
      <input 
        type="text" 
        id="profitSearchInput" 
        onkeyup="window.filterProfit()" 
        placeholder="Nhập tên sản phẩm..."
        style="width: 300px;"
      />
    </div>
    
    <div class="stats-container" style="margin-bottom: 20px;">
        <div class="stat-card">
            <i class="fa-solid fa-box stat-icon"></i>
            <div>
            <h3>${
              products.filter((p) => !p.isHidden).length
            }</h3> <p>Sản phẩm trên kệ</p>
            </div>
        </div>
    </div>
    
    <div class="table-container">
      <table class="admin-table">
        <thead>
          <tr>
            <th>STT</th>
            <th>Tên sản phẩm</th>
            <th>Giá nhập</th>
            <th>Giá bán hiện tại</th>
            <th>% Lợi nhuận hiện tại</th>
            <th>Điều chỉnh % Lợi nhuận</th>
            <th>Giá bán mới</th>
            <th>Thao tác</th>
          </tr>
        </thead>
        <tbody id="profitTableBody">
        </tbody>
      </table>
    </div>
  `;
    profitContent.innerHTML = html;
    const initialFilteredProducts = shelfProducts.filter((p) => !p.isHidden);
    renderProfitTable(initialFilteredProducts);
  }
  window.updateNewPrice = function (index) {
    const product = products[index];
    if (!product) return;
    const profitInput = document.getElementById(`profit-${index}`);
    const newPriceDisplay = document.getElementById(`newPrice-${index}`);
    if (!profitInput || !newPriceDisplay) return;
    const importPrice = parseInt(findLatestImportPrice(product.name) || 0);
    if (importPrice <= 0) {
      alert("Sản phẩm chưa có giá nhập. Không thể tính toán tự động!");
      profitInput.value = 0;
      return;
    }
    const profitMargin = parseFloat(profitInput.value) || 0;
    const newPrice = calculateSellingPrice(importPrice, profitMargin);
    newPriceDisplay.textContent = formatPrice(newPrice) + "đ";
  };
  window.applyProfitMargin = function (index) {
    const product = products[index];
    if (!product) return;
    const profitInput = document.getElementById(`profit-${index}`);
    if (!profitInput) return;
    const importPrice = parseInt(findLatestImportPrice(product.name) || 0);
    if (importPrice <= 0) {
      alert(
        "⚠️ Sản phẩm chưa có giá nhập. Không thể áp dụng % lợi nhuận tự động!"
      );
      return;
    }
    const profitMargin = parseFloat(profitInput.value) || 0;
    if (profitMargin < 0) {
      alert("⚠️ % Lợi nhuận không thể âm!");
      return;
    }
    if (
      !confirm(
        `Áp dụng lợi nhuận ${profitMargin}% cho sản phẩm "${
          product.name
        }"?\n\nGiá nhập: ${formatPrice(
          importPrice
        )}đ\nGiá bán mới: ${formatPrice(
          calculateSellingPrice(importPrice, profitMargin)
        )}đ`
      )
    ) {
      return;
    }
    const newPrice = calculateSellingPrice(importPrice, profitMargin);
    products[index].value = newPrice;
    products[index].profitMargin = profitMargin;
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    renderProfitManagement();
    alert(
      `✅ Đã cập nhật giá bán cho "${product.name}"!\nGiá mới: ${formatPrice(
        newPrice
      )}đ`
    );
  };
  window.applyProfitToAll = function () {
    const margin = prompt("Nhập % lợi nhuận chung cho TẤT CẢ sản phẩm:", "20");
    if (margin === null) return;
    const profitMargin = parseFloat(margin);
    if (isNaN(profitMargin) || profitMargin < 0) {
      alert("⚠️ % Lợi nhuận không hợp lệ!");
      return;
    }
    if (
      !confirm(
        `Áp dụng lợi nhuận ${profitMargin}% cho TẤT CẢ ${
          products.filter((p) => !p.isHidden).length
        } sản phẩm đang hiển thị?\n\nCẢNH BÁO: Hành động này sẽ thay đổi giá bán của tất cả sản phẩm có giá nhập!`
      )
    ) {
      return;
    }
    let updatedCount = 0;
    let skippedCount = 0;
    products.forEach((product, index) => {
      const importPrice = parseInt(findLatestImportPrice(product.name) || 0);
      if (importPrice > 0) {
        const newPrice = calculateSellingPrice(importPrice, profitMargin);
        products[index].value = newPrice;
        products[index].profitMargin = profitMargin;
        updatedCount++;
      } else {
        skippedCount++;
      }
    });
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    renderProfitManagement();
    alert(
      `✅ Hoàn tất!\n\n- Đã cập nhật: ${updatedCount} sản phẩm\n- Bỏ qua (chưa có giá nhập): ${skippedCount} sản phẩm`
    );
  };
  window.refreshProfitManagement = function () {
    reloadDataAndSync();
    renderProfitManagement();
  };
  // ========================================================

  // === QUẢN LÝ KHO (GIỮ NGUYÊN) ===
  window.renderStockManagement = function (nameQuery = "", categoryQuery = "") {
    reloadDataAndSync();
    hideAllContent();
    if (!stockContent) return;
    stockContent.style.display = "block";
    const inventory = calculateInventory();
    const uniqueCategories = getUniqueCategories();
    const allStockItems = Object.keys(inventory).map((key) => {
      const def = productDefinitions.find(
        (d) => d.name.trim().toLowerCase() === key
      );
      return {
        productName: def ? def.name : key,
        category: def ? def.category : "Chưa phân loại",
        quantity: inventory[key].stock,
      };
    });
    const lowerCaseNameQuery = nameQuery.trim().toLowerCase();
    const filteredStock = allStockItems.filter((item) => {
      const matchesName =
        lowerCaseNameQuery === "" ||
        item.productName.trim().toLowerCase().includes(lowerCaseNameQuery);
      const matchesCategory =
        categoryQuery === "" || item.category === categoryQuery;
      return matchesName && matchesCategory;
    });
    const categoryOptions = uniqueCategories
      .map(
        (cat) =>
          `<option value="${escapeHtml(cat)}" ${
            cat === categoryQuery ? "selected" : ""
          }>${escapeHtml(cat)}</option>`
      )
      .join("");
    function renderStockTable(filteredStock) {
      const tbody = document.getElementById("stockTableBody");
      if (!tbody) return;
      let html = "";
      let idCounter = 1;
      filteredStock
        .sort((a, b) => b.quantity - a.quantity)
        .forEach((item) => {
          const isLowStock = item.quantity > 0 && item.quantity <= 20;
          const isOutOfStock = item.quantity <= 0;
          let badgeClass = "badge-success";
          if (isLowStock) badgeClass = "badge-warning";
          if (isOutOfStock) badgeClass = "badge-danger";
          html += `
          <tr>
            <td>${idCounter++}</td>
            <td>${escapeHtml(item.productName)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td><span class="badge ${badgeClass}">${item.quantity}</span></td>
            <td><button class="btn-view" onclick="viewStockDetail('${escapeHtml(
              item.productName
            )}')"><i class="fa-solid fa-eye"></i> Xem chi tiết</button></td>
          </tr>`;
        });
      if (!html) {
        html = `<tr><td colspan="5" class="empty-state">Kho hàng trống hoặc không tìm thấy kết quả.</td></tr>`;
      }
      tbody.innerHTML = html;
    }
    window.filterStock = function () {
      const nameInput = document.getElementById("stockSearchInput").value;
      const categorySelect = document.getElementById(
        "stockCategorySelect"
      ).value;
      const inventory = calculateInventory();
      const allStockItems = Object.keys(inventory).map((key) => {
        const def = productDefinitions.find(
          (d) => d.name.trim().toLowerCase() === key
        );
        return {
          productName: def ? def.name : key,
          category: def ? def.category : "Chưa phân loại",
          quantity: inventory[key].stock,
        };
      });
      const lowerCaseNameQuery = nameInput.trim().toLowerCase();
      const filteredStock = allStockItems.filter((item) => {
        const matchesName =
          lowerCaseNameQuery === "" ||
          item.productName.trim().toLowerCase().includes(lowerCaseNameQuery);
        const matchesCategory =
          categorySelect === "" || item.category === categorySelect;
        return matchesName && matchesCategory;
      });
      renderStockTable(filteredStock);
    };
    let html = `
        <div class="management-header">
        <h2><i class="fa-solid fa-warehouse"></i> Quản lý tồn kho (Tổng nhập - Tổng bán)</h2>
        <div style="display: flex; align-items: center; gap: 10px;">
            <button onclick="window.renderStockManagement()" class="btn-refresh">
                <i class="fa-solid fa-rotate"></i> Làm mới
            </button>
        </div>
    </div>
        
        <div class="filter-controls" style="display: flex; gap: 10px; margin-bottom: 20px;">
            <input type="text" id="stockSearchInput" onkeyup="window.filterStock()" 
                placeholder="🔍 Tìm kiếm theo tên sản phẩm..." value="${escapeHtml(
                  nameQuery
                )}" 
                style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 300px;">
                
            <select id="stockCategorySelect" onchange="window.filterStock()" 
                style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 200px;">
                <option value="">-- Tất cả Danh mục --</option>
                ${categoryOptions}
            </select>
        </div>
        
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>STT</th>
                        <th>Tên sản phẩm</th>
                        <th>Danh mục</th>
                        <th>Số lượng tồn (Thực tế)</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody id="stockTableBody">
                </tbody>
            </table>
        </div>
    `;
    stockContent.innerHTML = html;
    renderStockTable(filteredStock);
  };
  window.viewStockDetail = function (productName) {
    const breakdown = calculateStockBreakdown(productName);
    const def = productDefinitions.find(
      (d) => d.name.trim().toLowerCase() === productName.trim().toLowerCase()
    );
    const message = `
┌────────────────────────────
   CHI TIẾT TỒN KHO
└────────────────────────────┘
Sản phẩm: ${productName}
Danh mục: ${def ? def.category : "N/A"}
┌────────────────────────────
BẢNG KÊ NHẬP/XUẤT & TỒN
└────────────────────────────┘
Tổng nhập (từ tất cả Phiếu nhập): ${breakdown.imported}
Tổng bán (từ tất cả Hóa đơn):     ${breakdown.sold}
────────────────────────────
TỒN KHO TRÊN KỆ: ${breakdown.onShelf}
(Số lượng này đã được đồng bộ = Tổng nhập hoàn thành - Tổng bán)
${
  breakdown.onShelf <= 0
    ? "⚠️ HẾT HÀNG"
    : breakdown.onShelf <= 20
    ? "⚠️ CẢNH BÁO: Tồn kho thấp!"
    : "✅ Tồn kho ổn định"
}
    `;
    alert(message);
  };
  // ========================================================

  // === QUẢN LÝ NGƯỜI DÙNG (GIỮ NGUYÊN) ===
  function renderUserManagement(usernameQuery = "", phoneQuery = "") {
    reloadDataAndSync();
    hideAllContent();
    if (!userContent) return;
    userContent.style.display = "block";
    const userStats = calculateUserStats();
    const lowerUsernameQuery = usernameQuery.trim().toLowerCase();
    const lowerPhoneQuery = phoneQuery.trim().toLowerCase();
    const filteredUserStats = userStats.filter((user) => {
      const username = (user.username || "").trim().toLowerCase();
      const phone = (user.phone || "").trim().toLowerCase();
      const matchesUsername =
        lowerUsernameQuery === "" || username.includes(lowerUsernameQuery);
      const matchesPhone =
        lowerPhoneQuery === "" || phone.includes(lowerPhoneQuery);
      return matchesUsername && matchesPhone;
    });
    let html = `
      <div class="management-header">
        <h2><i class="fa-solid fa-users"></i> Quản lý Người dùng</h2>
        <button onclick="refreshUsers()" class="btn-refresh">
          <i class="fa-solid fa-rotate"></i> Làm mới
        </button>
      </div>
      <div class="filter-controls" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
        <input type="text" id="userSearchInput" placeholder="🔍 Tìm theo Tên đăng nhập..." value="${escapeHtml(
          usernameQuery
        )}" 
            style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 250px;">
        <input type="text" id="userPhoneInput" placeholder="📞 Tìm theo SĐT..." value="${escapeHtml(
          phoneQuery
        )}" 
            style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 200px;">
        <button onclick="window.filterUsers()" class="btn-add" style="background-color: #667eea;">
            <i class="fa-solid fa-search"></i> Tìm
        </button>
        <button onclick="window.resetUserFilter()" class="btn-delete" style="background-color: #718096;">
            <i class="fa-solid fa-times"></i> Reset
        </button>
      </div>
      <div class="table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Tên đăng nhập</th>
              <th>SĐT</th>
              <th>Địa chỉ</th>
              <th>Số đơn hàng</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
    `;
    filteredUserStats.forEach((user, filteredIndex) => {
      const sName =
        user && user.username ? user.username.trim().toLowerCase() : null;
      const originalUserIndex = users.findIndex((u) => {
        const uName = u && u.username ? u.username.trim().toLowerCase() : null;
        return uName && sName && uName === sName;
      });
      if (originalUserIndex === -1) return;
      html += `
        <tr>
          <td>${filteredIndex + 1}</td> <td>${escapeHtml(
        user.username || "N/A"
      )} 
  ${
    user.locked
      ? '<span style="color:#e53e3e; font-weight:bold;">(Đã khóa)</span>'
      : ""
  }
</td>
          <td>${escapeHtml(user.phone || "N/A")}</td>
          <td>${escapeHtml(user.address || "Chưa cập nhật")}</td>
          <td><span class="badge badge-success">${
            user.orderCount || 0
          }</span></td>
          <td>
            <button onclick="viewUserDetail(${originalUserIndex})" class="btn-view" style="margin-right: 5px;">
              <i class="fa-solid fa-eye"></i> Xem
            </button>
            <button onclick="resetUserPassword(${originalUserIndex})" class="btn-add" style="background-color: #f6ad55; margin-right: 5px;">
              <i class="fa-solid fa-key"></i> Reset Mật khẩu
            </button>
            <button onclick="toggleUserLock(${originalUserIndex})" class="btn-lock" 
              style="background-color: ${user.locked ? "#48bb78" : "#718096"};">
                <i class="fa-solid ${
                  user.locked ? "fa-lock-open" : "fa-lock"
                }"></i> ${user.locked ? "Mở" : "Khóa"}
            </button>
          </td>
        </tr>
      `;
    });
    if (filteredUserStats.length === 0) {
      html += `<tr><td colspan="6" class="empty-state">Không tìm thấy người dùng phù hợp.</td></tr>`;
    }
    html += `
          </tbody>
        </table>
      </div>
      <div class="stats-container">
        </div>
    `;
    userContent.innerHTML = html;
  }
  window.filterUsers = function () {
    const usernameQuery = document.getElementById("userSearchInput").value;
    const phoneQuery = document.getElementById("userPhoneInput").value;
    renderUserManagement(usernameQuery, phoneQuery);
  };
  window.resetUserFilter = function () {
    renderUserManagement("", "");
  };
  window.refreshUsers = function () {
    reloadDataAndSync();
    renderUserManagement();
  };
  window.viewUserDetail = function (index) {
    const userFromUsers = users[index];
    if (!userFromUsers) {
      alert("Không tìm thấy thông tin người dùng!");
      return;
    }
    const userStats = calculateUserStats();
    const userFromUsersName =
      userFromUsers && userFromUsers.username
        ? userFromUsers.username.trim().toLowerCase()
        : null;
    if (!userFromUsersName) {
      alert("Lỗi: Người dùng này không có tên đăng nhập hợp lệ.");
      return;
    }
    const user = userStats.find((stat) => {
      const statName =
        stat && stat.username ? stat.username.trim().toLowerCase() : null;
      return statName && statName === userFromUsersName;
    });
    if (!user) {
      alert("Không tìm thấy thông tin thống kê cho người dùng này!");
      return;
    }
    showAdminUserDetailModal(user);
  };
  window.closeAdminUserDetailModal = function () {
    const modal = document.getElementById("adminUserDetailModal");
    if (modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  };
  window.showAdminUserDetailModal = function (user) {
    closeAdminUserDetailModal();
    const modalHtml = `
      <div class="admin-user-detail-modal-overlay" id="adminUserDetailModal">
        <div class="admin-user-detail-modal-content">
          <div class="admin-user-detail-header">
            <h2><i class="fa-solid fa-user"></i> Chi tiết người dùng</h2>
            <span class="admin-close-modal">&times;</span>
          </div>
          <div class="admin-user-detail-section">
            <h3>Thông tin tài khoản</h3>
            <p><strong>Tên đăng nhập:</strong> <span>${escapeHtml(
              user.username || "N/A"
            )}</span></p>
            <p><strong>Mật khẩu:</strong> <span class="value-password">${escapeHtml(
              user.password || "N/A"
            )}</span></p>
          </div>
          <div class="admin-user-detail-section">
            <h3>Thông tin liên hệ</h3>
            <p><strong>Số điện thoại:</strong> <span class="${
              user.phone ? "" : "value-na"
            }">${escapeHtml(user.phone || "Chưa cập nhật")}</span></p>
            <p><strong>Địa chỉ:</strong> <span class="${
              user.address ? "" : "value-na"
            }">${escapeHtml(user.address || "Chưa cập nhật")}</span></p>
          </div>
          <div class="admin-user-detail-section">
            <h3>Thống kê</h3>
            <p><strong>Số đơn hàng:</strong> <span>${
              user.orderCount || 0
            }</span></p>
            <p><strong>Tổng doanh thu:</strong> <span style="font-weight: 600; color: #38a169;">${formatPrice(
              user.totalRevenue || 0
            )}đ</span></p>
          </div>
          <div class="admin-user-detail-modal-actions">
            <button class="admin-btn-close-modal">Đóng</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    const modal = document.getElementById("adminUserDetailModal");
    const closeModalBtn = modal.querySelector(".admin-close-modal");
    const closeBtn = modal.querySelector(".admin-btn-close-modal");
    closeModalBtn.onclick = closeAdminUserDetailModal;
    closeBtn.onclick = closeAdminUserDetailModal;
    modal.onclick = function (e) {
      if (e.target === modal) {
        closeAdminUserDetailModal();
      }
    };
    setTimeout(() => {
      modal.classList.add("show");
    }, 10);
  };
  window.resetUserPassword = function (index) {
    const userToReset = users[index];
    if (!userToReset) return;
    if (
      !confirm(
        `Bạn có chắc muốn reset mật khẩu của người dùng "${userToReset.username}" về "123456"?`
      )
    )
      return;
    users[index].password = "123456";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    renderUserManagement();
    alert(
      `✅ Đã reset mật khẩu cho người dùng "${userToReset.username}". Mật khẩu mới là "123456"!`
    );
  };
  window.toggleUserLock = function (index) {
    const user = users[index];
    if (!user) return;
    user.locked = !user.locked;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    renderUserManagement();
    if (user.locked) {
      alert(`🔒 Người dùng "${user.username}" đã bị khóa.`);
    } else {
      alert(`🔓 Người dùng "${user.username}" đã được mở khóa.`);
    }
  };
  window.deleteUser = function (index) {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;
    users.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    renderUserManagement();
    alert("Đã xóa người dùng!");
  };
  // ========================================================

  // === (CẬP NHẬT) QUẢN LÝ SẢN PHẨM (Sửa thành Ẩn/Hiện) ===
  function renderProductManagement(
    nameQuery = "",
    categoryQuery = "",
    priceRangeQuery = ""
  ) {
    reloadDataAndSync(); // Đảm bảo `products` là mới nhất
    hideAllContent();
    if (!productContent) return;
    productContent.style.display = "block";

    const uniqueCategories = getUniqueCategories();
    const priceRanges = getPriceRanges();

    const lowerCaseNameQuery = nameQuery.trim().toLowerCase();
    let minPrice = 0;
    let maxPrice = Infinity;

    if (priceRangeQuery) {
      const parts = priceRangeQuery.split("-");
      minPrice = parseInt(parts[0]) || 0;
      maxPrice = parts[1] ? parseInt(parts[1]) : Infinity;
    }

    const filteredProducts = products.filter((p) => {
      const matchesName =
        lowerCaseNameQuery === "" ||
        p.name.trim().toLowerCase().includes(lowerCaseNameQuery);
      const matchesCategory =
        categoryQuery === "" || p.category === categoryQuery;
      const matchesPrice = p.value >= minPrice && p.value <= maxPrice;

      // (CẬP NHẬT) BỎ LỌC isHidden, hiển thị tất cả
      return matchesName && matchesCategory && matchesPrice;
    });

    // --- CẬP NHẬT renderProductTable (Dùng khi lọc) ---
    function renderProductTable(filteredProducts) {
      const tbody = document.querySelector("#productContent table tbody");
      if (!tbody) return;

      let html = "";
      filteredProducts.forEach((product, index) => {
        const originalIndex = products.findIndex(
          (p) => p.name === product.name
        );
        if (originalIndex === -1) return; // Đề phòng lỗi

        let profit = 0;
        const sellingPrice = product.value;
        const importPriceStr = findLatestImportPrice(product.name);

        if (importPriceStr !== "") {
          const importPrice = parseInt(importPriceStr, 10);
          if (importPrice > 0) profit = sellingPrice - importPrice;
        }

        let qtyDisplay = product.quantity;
        if (product.quantity > 0 && product.quantity <= 20) {
          qtyDisplay = `<span style="color: #e53e3e; font-weight: 600; display: block;">${product.quantity}</span>
                                <span style="color: #e53e3e; font-size: 11px;">(Sắp hết)</span>`;
        }

        // (CẬP NHẬT) Thêm class nếu bị ẩn
        const rowClass = product.isHidden ? "product-row-hidden" : "";

        // (CẬP NHẬT) Logic cho nút Ẩn/Hiện
        const isManuallyHidden = product.isManuallyHidden;
        const toggleBtnIcon = isManuallyHidden ? "fa-eye" : "fa-eye-slash";
        const toggleBtnText = isManuallyHidden ? "Hiện" : "Ẩn";
        const toggleBtnBgColor = isManuallyHidden ? "#48bb78" : "#f56565"; // Xanh lá / Đỏ

        html += `
            <tr class="${rowClass}">
              <td>${index + 1}</td>
              <td>
                <div class="product-img-mini" style="background-image: url('${
                  product.image || ""
                }')"></div>
              </td>
              <td>
                ${escapeHtml(product.name)}
                ${
                  product.isHidden
                    ? '<span style="color: #e53e3e; font-size: 12px; display: block;">(Đang ẩn)</span>'
                    : ""
                }
              </td>
              <td>${formatPrice(product.value)}đ</td>
              <td style="font-weight: 600; color: ${
                profit < 0 ? "#e53e3e" : "#38a169"
              };">
                ${formatPrice(profit)}đ
              </td>
              <td>${qtyDisplay}</td>
              <td>${escapeHtml(product.category)}</td>
              <td>
                <button onclick="viewProductDetail(${originalIndex})" class="btn-view" style="margin-right: 5px;">
                    <i class="fa-solid fa-eye"></i> Xem
                </button>
                <button onclick="editProduct(${originalIndex})" class="btn-edit" style="margin-right: 5px;">
                    <i class="fa-solid fa-pen"></i> Sửa
                </button>
                
                <button onclick="toggleProductVisibility(${originalIndex})" class="btn-lock" style="background-color: ${toggleBtnBgColor};">
                    <i class="fa-solid ${toggleBtnIcon}"></i> ${toggleBtnText}
                </button>
              </td>
            </tr>`;
      });

      if (!html)
        html = `<tr><td colspan="8" class="empty-state">Không có sản phẩm nào trên kệ.</td></tr>`;
      tbody.innerHTML = html;
    }

    // --- GIAO DIỆN BỘ LỌC (GIỮ NGUYÊN) ---
    const categoryOptions = uniqueCategories
      .map(
        (cat) =>
          `<option value="${escapeHtml(cat)}" ${
            cat === categoryQuery ? "selected" : ""
          }>${escapeHtml(cat)}</option>`
      )
      .join("");
    const priceOptions = priceRanges
      .map(
        (range) =>
          `<option value="${range.value}" ${
            range.value === priceRangeQuery ? "selected" : ""
          }>${range.label}</option>`
      )
      .join("");

    // Hàm global để lọc (CẬP NHẬT: Bỏ lọc isHidden)
    window.filterProducts = function () {
      const nameInput = document.getElementById("productSearchInput").value;
      const categorySelect = document.getElementById(
        "productCategorySelect"
      ).value;
      const priceSelect = document.getElementById("productPriceSelect").value;

      const lowerCaseNameQuery = nameInput.trim().toLowerCase();
      let minPrice = 0,
        maxPrice = Infinity;
      if (priceSelect) {
        const parts = priceSelect.split("-");
        minPrice = parseInt(parts[0]) || 0;
        maxPrice = parts[1] ? parseInt(parts[1]) : Infinity;
      }

      const filtered = products.filter((p) => {
        const matchesName =
          lowerCaseNameQuery === "" ||
          p.name.trim().toLowerCase().includes(lowerCaseNameQuery);
        const matchesCategory =
          categorySelect === "" || p.category === categorySelect;
        const matchesPrice = p.value >= minPrice && p.value <= maxPrice;

        return matchesName && matchesCategory && matchesPrice;
      });

      renderProductTable(filtered);
    };

    // --- HTML CHÍNH CỦA TAB ---
    let html = `
      <div class="management-header">
        <h2><i class="fa-solid fa-box"></i> Quản lý Sản phẩm (Trên kệ)</h2>
        <div style="display: flex; align-items: center; gap: 10px;">
            <button onclick="addNewProductDefinition()" class="btn-add">
                <i class="fa-solid fa-plus"></i> Thêm Định Nghĩa SP
            </button>
            <button onclick="refreshProducts()" class="btn-refresh">
                <i class="fa-solid fa-rotate"></i> Làm mới
            </button>
        </div>
      </div>
      
      <div class="filter-controls" style="display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;">
        <input type="text" id="productSearchInput" onkeyup="window.filterProducts()" 
            placeholder="🔍 Tìm kiếm theo tên sản phẩm..." value="${escapeHtml(
              nameQuery
            )}" 
            style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 300px;">
        <select id="productCategorySelect" onchange="window.filterProducts()" 
            style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 200px;">
            <option value="">-- Tất cả Danh mục --</option>
            ${categoryOptions}
        </select>
        <select id="productPriceSelect" onchange="window.filterProducts()" 
            style="padding: 8px; border: 1px solid #ccc; border-radius: 4px; width: 200px;">
            <option value="">-- Tất cả Khoảng giá --</option>
            ${priceOptions}
        </select>
      </div>
      
      <div class="table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Hình ảnh</th>
              <th>Tên sản phẩm</th>
              <th>Giá bán</th>
              <th>Lợi nhuận (Ước tính)</th>
              <th>Số lượng (Trên kệ)</th>
              <th>Danh mục</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
          </tbody>
        </table>
      </div>
      <div class="stats-container">
        </div>
    `;

    productContent.innerHTML = html;
    renderProductTable(filteredProducts);
  }

  window.refreshProducts = function () {
    reloadDataAndSync();
    renderProductManagement();
  };
  // ========================================================

  // =======================================================================
  // === CỤM CODE THÊM/SỬA ĐỊNH NGHĨA SẢN PHẨM (ĐÃ SỬA LỖI) ===
  // =======================================================================
  function renderImportCategoryField(currentCategory = "") {
    if (typeof getUniqueCategories !== "function") {
      console.error("Lỗi: Hàm getUniqueCategories() không tồn tại.");
      return "<div>Lỗi tải danh mục</div>";
    }
    const categories = getUniqueCategories();
    let categoryOptions = categories
      .map((cat) => {
        const selected = cat === currentCategory ? "selected" : "";
        return `<option value="${escapeHtml(cat)}" ${selected}>${escapeHtml(
          cat
        )}</option>`;
      })
      .join("");
    const isCustom = currentCategory && !categories.includes(currentCategory);
    categoryOptions =
      `<option value="">-- Chọn danh mục --</option><option value="Khác">-- Nhập danh mục mới --</option>` +
      categoryOptions;
    return `
        <div id="importCategoryWrapper" style="margin-bottom: 15px;">
            <label style="display: block; margin-bottom: 5px; font-weight: 600;">Danh mục:</label>
            <select id="importCategorySelect" onchange="window.checkImportCategoryInput()" required
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none; margin-bottom: 5px;">
                ${categoryOptions}
            </select>
            <input type="text" id="importCategoryInput" value="${
              isCustom ? escapeHtml(currentCategory) : ""
            }"
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none; margin-top: 5px; display: ${
                  isCustom ? "block" : "none"
                };"
                placeholder="Nhập danh mục mới...">
            <input type="hidden" id="importCategory" value="${escapeHtml(
              currentCategory
            )}" required>
        </div>
    `;
  }
  window.checkImportCategoryInput = function () {
    try {
      const select = document.getElementById("importCategorySelect");
      const input = document.getElementById("importCategoryInput");
      const hidden = document.getElementById("importCategory");
      if (select && input && hidden) {
        if (select.value === "Khác") {
          input.style.display = "block";
          input.required = true;
          input.value = "";
          hidden.value = "";
          input.oninput = () => (hidden.value = input.value.trim());
        } else if (select.value === "") {
          input.style.display = "none";
          input.required = false;
          input.value = "";
          hidden.value = "";
        } else {
          input.style.display = "none";
          input.required = false;
          input.value = select.value;
          hidden.value = select.value;
        }
      }
    } catch (err) {
      console.error("Lỗi trong checkImportCategoryInput:", err);
    }
  };
  window.addNewProductDefinition = function () {
    try {
      const popup = document.getElementById("product-form-popup");
      if (!popup) {
        alert("Lỗi: Không tìm thấy #product-form-popup");
        return;
      }
      window.editingProductIndex = -1;
      window.isAddingDefinition = true;
      popup.querySelector("h2").textContent = "Thêm Định Nghĩa Sản Phẩm Mới";
      const nameFieldContainer = document.getElementById("name").parentElement;
      nameFieldContainer.innerHTML = `
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tên sản phẩm:</label>
        <input type="text" id="name" required 
               style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;"
               placeholder="Nhập tên sản phẩm mới...">
    `;
      document.getElementById("name").required = true;
      const existingWrapper = document.getElementById("importCategoryWrapper");
      if (!existingWrapper) {
        const categoryHTML = renderImportCategoryField("");
        const nameElement = document.getElementById("name");
        nameElement.parentElement.insertAdjacentHTML("afterend", categoryHTML);
      }
      const valueEl = document.getElementById("value");
      const qtyEl = document.getElementById("quantity");
      if (valueEl) {
        valueEl.parentElement.style.display = "none";
        valueEl.required = false;
      }
      if (qtyEl) {
        qtyEl.parentElement.style.display = "none";
        qtyEl.required = false;
      }
      const valueNote = document.getElementById("valueReadOnlyNote");
      if (valueNote) valueNote.style.display = "none";
      const qtyNote = document.getElementById("quantityAvailableNote");
      if (qtyNote) qtyNote.style.display = "none";
      document.getElementById("description").disabled = false;
      document.getElementById("specs").disabled = false;
      document.getElementById("description").value = "";
      document.getElementById("specs").value = "";
      document.getElementById("image").value = "";
      popup.style.display = "flex";
      window.checkImportCategoryInput();
    } catch (err) {
      console.error("Lỗi khi mở popup addNewProductDefinition:", err);
      alert("Đã xảy ra lỗi khi mở popup. Vui lòng kiểm tra Console.");
    }
  };
  window.addProductDefinition = async function (event) {
    try {
      event.preventDefault();
      if (typeof getBase64 !== "function") {
        alert("Lỗi: Hàm getBase64() bị thiếu.");
        return;
      }
      if (typeof placeholderImg === "undefined") {
        alert("Lỗi: Biến placeholderImg bị thiếu.");
        return;
      }
      const name = document.getElementById("name").value.trim();
      const category = document.getElementById("importCategory").value.trim();
      const description = document.getElementById("description").value.trim();
      const specs = document.getElementById("specs").value.trim();
      const imageFile = document.getElementById("image").files[0];
      const popup = document.getElementById("product-form-popup");
      if (!name || !category) {
        alert("⚠️ Vui lòng điền Tên sản phẩm và Danh mục!");
        return;
      }
      if (!Array.isArray(productDefinitions)) {
        alert(
          "Lỗi nghiêm trọng: Biến 'productDefinitions' không phải là mảng. Đang khởi tạo lại..."
        );
        console.error(
          "Biến 'productDefinitions' không phải là mảng:",
          productDefinitions
        );
        productDefinitions = [];
      }
      const existingDef = productDefinitions.find(
        (d) => d.name.trim().toLowerCase() === name.toLowerCase()
      );
      if (existingDef) {
        alert(`❌ Lỗi: Đã tồn tại định nghĩa sản phẩm với tên "${name}".`);
        return;
      }
      let imageBase64 = placeholderImg;
      if (imageFile) {
        try {
          imageBase64 = await getBase64(imageFile);
        } catch (err) {
          console.error("Lỗi chuyển ảnh sang base64:", err);
          imageBase64 = placeholderImg;
        }
      }
      const newDefinition = {
        name,
        category,
        description,
        specs,
        image: imageBase64,
        isManuallyHidden: false, // (MỚI) Khởi tạo
      };
      productDefinitions.push(newDefinition);
      localStorage.setItem(
        PRODUCT_DEFINITIONS_KEY,
        JSON.stringify(productDefinitions)
      );
      if (typeof resetProductPopup === "function") {
        resetProductPopup();
      } else {
        popup.style.display = "none";
      }
      alert(
        "✅ Thêm định nghĩa sản phẩm thành công!\n\nBây giờ bạn có thể nhập hàng cho sản phẩm này trong 'Phiếu nhập hàng'."
      );
    } catch (err) {
      console.error("Lỗi khi lưu định nghĩa sản phẩm:", err);
      alert(
        "❌ Đã xảy ra lỗi nghiêm trọng khi lưu. Vui lòng kiểm tra Console.\n" +
          err.message
      );
    }
  };
  window.editProduct = function (index) {
    const product = products[index];
    if (!product) return;
    const popup = document.getElementById("product-form-popup");
    if (!popup) return;
    window.editingProductIndex = index;
    window.isAddingDefinition = false;
    popup.querySelector("h2").textContent = "Sửa Thông Tin Sản Phẩm";
    const nameFieldContainer = document.getElementById("name").parentElement;
    nameFieldContainer.innerHTML = `
        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tên sản phẩm:</label>
        <input type="text" id="name" value="${escapeHtml(
          product.name
        )}" disabled 
               style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none; background-color: #f4f4f4;">
    `;
    const categoryWrapper = document.getElementById("importCategoryWrapper");
    if (categoryWrapper) categoryWrapper.style.display = "none";
    document.getElementById("value").parentElement.style.display = "block";
    document.getElementById("quantity").parentElement.style.display = "block";
    document.getElementById("value").value = product.value;
    document.getElementById("quantity").value = product.quantity;
    document.getElementById("value").disabled = true;
    document.getElementById("quantity").disabled = true;
    document.getElementById("name").required = false; // Bỏ required khi sửa
    document.getElementById("value").required = false;
    document.getElementById("quantity").required = false;
    const valueNote = document.getElementById("valueReadOnlyNote");
    if (valueNote) valueNote.style.display = "block";
    const qtyNote = document.getElementById("quantityAvailableNote");
    if (qtyNote) {
      qtyNote.style.display = "block";
      qtyNote.textContent =
        "Số lượng được quản lý tự động (Tổng nhập - Tổng bán).";
    }
    document.getElementById("description").disabled = false;
    document.getElementById("specs").disabled = false;
    document.getElementById("description").value = product.description || "";
    document.getElementById("specs").value = product.specs || "";
    document.getElementById("image").value = "";
    popup.style.display = "flex";
  };
  window.editProductDefinition = async function (event) {
    try {
      event.preventDefault();
      const description = document.getElementById("description").value.trim();
      const specs = document.getElementById("specs").value.trim();
      const imageFile = document.getElementById("image").files[0];
      const popup = document.getElementById("product-form-popup");
      const product = products[window.editingProductIndex];
      if (!product) {
        alert("❌ Lỗi: Không tìm thấy sản phẩm để sửa!");
        return;
      }
      let newImageBase64 = product.image;
      if (imageFile) {
        if (typeof getBase64 !== "function") {
          alert("Lỗi: Hàm getBase64() bị thiếu.");
          return;
        }
        try {
          newImageBase64 = await getBase64(imageFile);
        } catch (error) {
          alert("⚠️ Lỗi xử lý hình ảnh. Vui lòng thử lại.");
          return;
        }
      }
      product.description = description;
      product.specs = specs;
      product.image = newImageBase64;
      localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
      if (!Array.isArray(productDefinitions)) {
        console.error("Biến 'productDefinitions' không phải là mảng.");
      } else {
        const def = productDefinitions.find(
          (d) =>
            d.name.trim().toLowerCase() === product.name.trim().toLowerCase()
        );
        if (def) {
          def.description = description;
          def.specs = specs;
          def.image = newImageBase64;
          localStorage.setItem(
            PRODUCT_DEFINITIONS_KEY,
            JSON.stringify(productDefinitions)
          );
        }
      }
      window.editingProductIndex = -1;
      if (typeof resetProductPopup === "function") {
        resetProductPopup();
      } else {
        popup.style.display = "none";
      }
      renderProductManagement();
      alert("✅ Cập nhật thông tin sản phẩm thành công!");
    } catch (err) {
      console.error("Lỗi khi sửa sản phẩm:", err);
      alert(
        "❌ Đã xảy ra lỗi nghiêm trọng khi sửa. Vui lòng kiểm tra Console.\n" +
          err.message
      );
    }
  };

  // === (HÀM MỚI) ĐỂ ẨN/HIỆN SẢN PHẨM THỦ CÔNG ===
  window.toggleProductVisibility = function (productIndex) {
    const product = products[productIndex];
    if (!product) {
      alert("Lỗi: Không tìm thấy sản phẩm!");
      return;
    }

    // Tìm định nghĩa gốc của sản phẩm
    const def = productDefinitions.find(
      (d) => d.name.trim().toLowerCase() === product.name.trim().toLowerCase()
    );

    if (!def) {
      alert("Lỗi: Không tìm thấy định nghĩa gốc của sản phẩm!");
      return;
    }

    // Bật/Tắt trạng thái ẩn thủ công
    def.isManuallyHidden = !def.isManuallyHidden;

    // Lưu lại thay đổi vào productDefinitions (dữ liệu gốc)
    localStorage.setItem(
      PRODUCT_DEFINITIONS_KEY,
      JSON.stringify(productDefinitions)
    );

    // Đồng bộ lại kho và kệ
    syncInventoryToShelf();

    // Render lại bảng
    renderProductManagement();

    if (def.isManuallyHidden) {
      alert(`Đã ẩn sản phẩm "${product.name}" khỏi kệ.`);
    } else {
      alert(`Đã hiển thị lại sản phẩm "${product.name}" trên kệ.`);
    }
  };

  // === (LOẠI BỎ) Hàm deleteProduct cũ ===
  // window.deleteProduct = function(index) { ... }

  window.viewProductDetail = function (index) {
    const product = products[index];
    if (!product) {
      alert("Không tìm thấy thông tin sản phẩm!");
      return;
    }
    showAdminProductDetailModal(product);
  };
  window.closeAdminProductDetailModal = function () {
    const modal = document.getElementById("adminProductDetailModal");
    if (modal) {
      modal.classList.remove("show");
      setTimeout(() => {
        modal.remove();
      }, 300);
    }
  };
  window.showAdminProductDetailModal = function (product) {
    closeAdminProductDetailModal();
    const importPriceStr = findLatestImportPrice(product.name);
    const importPrice = importPriceStr ? parseInt(importPriceStr, 10) : 0;
    const sellingPrice = product.value;
    let profit = 0;
    let profitMargin = 0;
    if (importPrice > 0) {
      profit = sellingPrice - importPrice;
      profitMargin = ((profit / importPrice) * 100).toFixed(1);
    }
    const profitColor = profit >= 0 ? "#38a169" : "#e53e3e";
    const specsHtml = (product.specs || "")
      .split(",")
      .map((spec) => spec.trim())
      .filter((spec) => spec)
      .map((spec) => {
        const parts = spec.split(":");
        const key = parts[0] ? parts[0].trim() : "";
        const value = parts[1] ? parts[1].trim() : "";
        return `<li><strong>${escapeHtml(key)}:</strong> <span>${escapeHtml(
          value
        )}</span></li>`;
      })
      .join("");
    const modalHtml = `
      <div class="admin-product-detail-modal-overlay" id="adminProductDetailModal">
        <div class="admin-product-detail-modal-content">
          <div class="admin-product-detail-header">
            <h2><i class="fa-solid fa-circle-info"></i> Chi tiết sản phẩm</h2>
            <span class="admin-close-modal">&times;</span>
          </div>
          <div class="admin-product-detail-body">
            <div class="admin-product-detail-image" style="background-image: url('${
              product.image || placeholderImg
            }');"></div>
            <div class="admin-product-detail-info">
              <h3>${escapeHtml(product.name)}</h3>
              <div class="admin-product-detail-section">
                <h4><i class="fa-solid fa-money-bill-wave"></i> Giá & Kho</h4>
                <p><strong>Giá bán:</strong> <span class="price-current">${formatPrice(
                  sellingPrice
                )}đ</span></p>
                <p><strong>Giá nhập gần nhất:</strong> <span>${
                  importPrice > 0 ? formatPrice(importPrice) + "đ" : "N/A"
                }</span></p>
                <p><strong>Lợi nhuận (ước tính):</strong> <span style="font-weight: 600; color: ${profitColor};">${formatPrice(
      profit
    )}đ ${profitMargin > 0 ? `(${profitMargin}%)` : ""}</span></p>
                <p><strong>Số lượng trên kệ:</strong> <span>${
                  product.quantity
                }</span></p>
                <p><strong>Danh mục:</strong> <span>${escapeHtml(
                  product.category
                )}</span></p>
              </div>
              <div class="admin-product-detail-section">
                <h4><i class="fa-solid fa-align-left"></i> Mô tả</h4>
                <p class="description">${escapeHtml(
                  product.description || "Chưa có mô tả."
                )}</p>
              </div>
              ${
                specsHtml
                  ? `
              <div class="admin-product-detail-section">
                <h4><i class="fa-solid fa-microchip"></i> Thông số kỹ thuật</h4>
                <ul class="admin-specs-list">${specsHtml}</ul>
              </div>
              `
                  : ""
              }
            </div>
          </div>
          <div class="admin-product-detail-modal-actions">
            <button class="admin-btn-close-modal">Đóng</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    const modal = document.getElementById("adminProductDetailModal");
    const closeModalBtn = modal.querySelector(".admin-close-modal");
    const closeBtn = modal.querySelector(".admin-btn-close-modal");
    closeModalBtn.onclick = closeAdminProductDetailModal;
    closeBtn.onclick = closeAdminProductDetailModal;
    modal.onclick = function (e) {
      if (e.target === modal) {
        closeAdminProductDetailModal();
      }
    };
    setTimeout(() => {
      modal.classList.add("show");
    }, 10);
  };
  // =======================================================================
  // === CỤM CODE THÊM/SỬA ĐỊNH NGHĨA SẢN PHẨM (KẾT THÚC) ===
  // =======================================================================

  // === GẮN SỰ KIỆN ĐÓNG POPUP SẢN PHẨM (ĐÃ CẬP NHẬT) ===
  const closePopupBtn = document.getElementById("close-product-form-popup");
  const productPopup = document.getElementById("product-form-popup");

  function resetProductPopup() {
    if (!productPopup) return;
    productPopup.style.display = "none";
    window.editingProductIndex = -1;
    window.isAddingDefinition = false;
    const nameFieldContainer = document.getElementById("name").parentElement;
    nameFieldContainer.innerHTML = `
      <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tên sản phẩm:</label>
      <input
        type="text"
        id="name"
        placeholder="Nhập tên sản phẩm..."
        style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;"
        required
      />
  `;
    const categoryWrappers = document.querySelectorAll(
      "#importCategoryWrapper"
    );
    categoryWrappers.forEach((wrapper) => wrapper.remove());
    document.getElementById("value").parentElement.style.display = "block";
    document.getElementById("quantity").parentElement.style.display = "block";
    document.getElementById("value").disabled = false;
    document.getElementById("quantity").disabled = false;
    document.getElementById("name").required = true;
    document.getElementById("value").required = true;
    document.getElementById("quantity").required = true;
    document.getElementById("description").disabled = false;
    document.getElementById("specs").disabled = false;
    document.getElementById("value").value = "";
    document.getElementById("quantity").value = "";
    document.getElementById("description").value = "";
    document.getElementById("specs").value = "";
    document.getElementById("image").value = "";
    const valueNote = document.getElementById("valueReadOnlyNote");
    if (valueNote) valueNote.style.display = "none";
    const qtyNote = document.getElementById("quantityAvailableNote");
    if (qtyNote) qtyNote.style.display = "none";
  }

  if (closePopupBtn) {
    closePopupBtn.addEventListener("click", resetProductPopup);
  }
  if (productPopup) {
    productPopup.addEventListener("click", (e) => {
      if (e.target === productPopup) {
        resetProductPopup();
      }
    });
  }
  // ========================================================

  // === (CỤM HÀM MỚI) BỘ LỌC PHIẾU NHẬP HÀNG ===
  function renderImportReceiptTable(filteredReceipts) {
    const tableBody = document.getElementById("importReceiptsTableBody");
    if (!tableBody) return;
    let html = "";
    filteredReceipts
      .sort((a, b) => b.id - a.id)
      .forEach((receipt) => {
        html += `
          <tr>
            <td>#PN${receipt.id}</td>
            <td>${receipt.date}</td>
            <td>${escapeHtml(receipt.importedBy)}</td>
            <td>
                ${
                  receipt.status === "Hoàn thành"
                    ? '<span style="color: green; font-weight: 600;">Hoàn thành</span>'
                    : '<span style="color: orange; font-weight: 600;">Chưa hoàn thành</span>'
                }
            </td>
            <td>
              <button onclick="viewImportReceipt('${
                receipt.id
              }')" class="btn-view">
                <i class="fa-solid fa-eye"></i> Chi tiết
              </button>
              ${
                receipt.status === "Chưa hoàn thành"
                  ? `
              <button onclick="editImportReceipt('${receipt.id}')" class="btn-edit">
                <i class="fa-solid fa-pen"></i> Sửa
              </button>
              <button onclick="deleteImportReceipt('${receipt.id}')" class="btn-delete">
                <i class="fa-solid fa-trash"></i> Xóa
              </button>
              <button onclick="finalizeReceiptStatus('${receipt.id}')" class="btn-done">
                <i class="fa-solid fa-check"></i> Hoàn thành
              </button>
              `
                  : ""
              }
            </td>
          </tr>
        `;
      });
    if (!html) {
      html = `<tr><td colspan="5" class="empty-state">Không tìm thấy phiếu nhập phù hợp.</td></tr>`;
    }
    tableBody.innerHTML = html;
  }
  window.filterImportReceipts = function () {
    const importerQuery = document
      .getElementById("importerSearchInput")
      .value.toLowerCase()
      .trim();
    const startDateVal = document.getElementById("importStartDate").value;
    const endDateVal = document.getElementById("importEndDate").value;
    const startDate = startDateVal
      ? new Date(startDateVal + "T00:00:00")
      : null;
    const endDate = endDateVal ? new Date(endDateVal + "T23:59:59") : null;
    const filtered = importReceipts.filter((receipt) => {
      const matchesImporter = receipt.importedBy
        .toLowerCase()
        .includes(importerQuery);
      const receiptDate = parseVNDate(receipt.date);
      if (!receiptDate) return false;
      const matchesDate =
        (!startDate || receiptDate >= startDate) &&
        (!endDate || receiptDate <= endDate);
      return matchesImporter && matchesDate;
    });
    renderImportReceiptTable(filtered);
  };
  window.resetImportFilter = function () {
    document.getElementById("importerSearchInput").value = "";
    document.getElementById("importStartDate").value = "";
    document.getElementById("importEndDate").value = "";
    renderImportReceiptTable(importReceipts);
  };
  function renderAddInfo() {
    reloadDataAndSync();
    hideAllContent();
    if (!addInfoContent) return;
    addInfoContent.style.display = "block";
    let html = `
      <div class="management-header">
        <h2><i class="fa-solid fa-clipboard-list"></i> Phiếu nhập hàng</h2>
        <div>
          <button onclick="createAndShowNewReceiptForm()" class="btn-add">
            <i class="fa-solid fa-plus"></i> Tạo phiếu nhập
          </button>
          <button onclick="refreshImportReceipts()" class="btn-refresh">
            <i class="fa-solid fa-rotate"></i> Làm mới
          </button>
        </div>
      </div>
      
      <div class="filter-controls">
        <label for="importerSearchInput">Người nhập:</label>
        <input 
          type="text" 
          id="importerSearchInput" 
          placeholder="Tìm theo người nhập..."
        />
        <label for="importStartDate">Từ ngày:</label>
        <input type="date" id="importStartDate" />
        <label for="importEndDate">Đến ngày:</label>
        <input type="date" id="importEndDate" />
        <button onclick="window.filterImportReceipts()" class="btn-filter">
          <i class="fa-solid fa-search"></i> Lọc
        </button>
        <button onclick="window.resetImportFilter()" class="btn-reset">
          <i class="fa-solid fa-times"></i> Reset
        </button>
      </div>

      <div class="table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Mã phiếu</th>
              <th>Ngày nhập</th>
              <th>Người nhập</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="importReceiptsTableBody">
          </tbody>
        </table>
      </div>
      
      <div class="stats-container">
      </div>
    `;
    addInfoContent.innerHTML = html;
    renderImportReceiptTable(importReceipts);
  }
  window.refreshImportReceipts = function () {
    reloadDataAndSync();
    renderAddInfo();
  };
  window.createAndShowNewReceiptForm = function () {
    const newReceipt = {
      id: Date.now().toString(),
      date: new Date().toLocaleString("vi-VN"),
      importedBy: "Admin",
      status: "Chưa hoàn thành",
      items: [],
    };
    importReceipts.push(newReceipt);
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));
    renderAddInfo();
    showImportProductForm(newReceipt.id);
  };
  window.showImportProductForm = function (receiptId) {
    const currentReceipt = importReceipts.find((r) => r.id === receiptId);
    if (!currentReceipt) return alert("Lỗi: Không tìm thấy phiếu nhập!");
    if (currentReceipt.status === "Hoàn thành") {
      alert("Không thể sửa phiếu nhập đã Hoàn thành.");
      return;
    }
    const existingModal = document.getElementById("importProductModal");
    if (existingModal) existingModal.remove();
    let productOptions =
      '<option value="">-- Chọn định nghĩa sản phẩm --</option>';
    productDefinitions
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((def) => {
        productOptions += `<option value="${escapeHtml(def.name)}">${escapeHtml(
          def.name
        )}</option>`;
      });
    const importFormHtml = `
        <div class="import-product-form-container" style="padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px; background-color: #f9f9f9;">
            <h3 style="color: #667eea; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                <i class="fa-solid fa-square-plus"></i> Thêm mặt hàng vào Phiếu
            </h3>
            <form id="importReceiptForm" onsubmit="submitImportItem(event,'${receiptId}')">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tên sản phẩm:</label>
                        <select id="importProductName" required onchange="window.updateImportPriceInput()"
    style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;">
    ${productOptions}
</select>
                    </div>
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Số lượng:</label>
                        <input type="number" id="importQuantity" required min="1"
                            style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;"
                            placeholder="Nhập số lượng...">
                    </div>
                    <div style="grid-column: span 2;">
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Đơn giá nhập:</label>
                        <input type="number" id="importPrice" required min="0"
                            style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;"
                            placeholder="Nhập đơn giá nhập...">
                    </div>
                </div>
                <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
                    <button type="submit"
                        style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                        <i class="fa-solid fa-plus"></i> Thêm mặt hàng
                    </button>
                </div>
            </form>
        </div>
    `;
    let itemsHtml = "";
    let totalItems = 0;
    let totalValue = 0;
    currentReceipt.items.forEach((item, index) => {
      const itemPrice = (item.quantity || 0) * (item.price || 0);
      totalItems += parseInt(item.quantity || 0);
      totalValue += itemPrice;
      itemsHtml += `
            <tr>
              <td>${escapeHtml(item.productName)}</td>
              <td>${item.quantity}</td>
              <td>${formatPrice(item.price)}đ</td>
              <td><strong>${formatPrice(itemPrice)}đ</strong></td>
              <td>
                <button onclick="deleteItemInReceipt('${receiptId}', ${index})" class="btn-delete-item">
                    <i class="fa-solid fa-trash"></i>
                </button>
              </td>
            </tr>
        `;
    });
    let html = `
      <div class="productImport-modal-overlay" id="importProductModal" onclick="closeModal(event, '${receiptId}')">
        <div class="modal-box" onclick="event.stopPropagation()" style="max-width: 900px;">
             ${importFormHtml}
             <h3 style="margin-top: 30px; margin-bottom: 10px;"><i class="fa-solid fa-list-check"></i> Danh sách mặt hàng đã nhập (${
               currentReceipt.items.length
             } loại)</h3>
            <h3>Mã phiếu: #PN${receiptId}</h3>
            <div class="table-container">
              <table class="admin-table">
                <thead>
                  <tr>
                    <th>Tên sản phẩm</th>
                    <th>Số lượng</th>
                    <th>Giá nhập</th>
                    <th>Thành tiền</th>
                    <th>Thao tác</th> 
                  </tr>
                </thead>
                <tbody id="importItemsTableBody">
                  ${
                    itemsHtml ||
                    '<tr><td colspan="5" class="empty-state">Chưa có mặt hàng nào.</td></tr>'
                  }
                </tbody>
                <tfoot>
                    <tr>
                        <td colspan="2"><strong>TỔNG CỘNG</strong></td>
                        <td>${totalItems} SP</td>
                        <td><strong>${formatPrice(totalValue)}đ</strong></td>
                        <td></td>
                    </tr>
                </tfoot>
              </table>
            </div>
             <div style="margin-top: 20px; text-align: right;">
                    <button onclick="finishReceiptEditing('${receiptId}')" class="btn-done">
                       <i class="fa-solid fa-save"></i> Lưu & Đóng
                    </button>
             </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
  };
  window.closeModal = function (event, receiptId) {
    const modal = document.getElementById("importProductModal");
    const isClosingEvent =
      !event ||
      (event.target.id === "importProductModal" &&
        !event.target.closest(".modal-box"));
    if (isClosingEvent) {
      if (receiptId) {
        const index = importReceipts.findIndex((r) => r.id === receiptId);
        if (index !== -1) {
          const currentReceipt = importReceipts[index];
          if (
            currentReceipt.status === "Chưa hoàn thành" &&
            currentReceipt.items.length === 0
          ) {
            importReceipts.splice(index, 1);
            localStorage.setItem(
              IMPORT_RECEIPTS_KEY,
              JSON.stringify(importReceipts)
            );
            renderAddInfo();
          }
        }
      }
      if (modal) modal.remove();
    }
  };
  window.submitImportItem = function (event, receiptId) {
    event.preventDefault();
    const productName = document
      .getElementById("importProductName")
      .value.trim();
    const quantity = parseInt(document.getElementById("importQuantity").value);
    const price = parseInt(document.getElementById("importPrice").value);
    const selectedProductDef = productDefinitions.find(
      (d) => d.name === productName
    );
    const category = selectedProductDef
      ? selectedProductDef.category
      : "Chưa phân loại";
    if (
      !productName ||
      productName === "" ||
      isNaN(quantity) ||
      quantity <= 0 ||
      isNaN(price) ||
      price < 0
    ) {
      alert(
        "Vui lòng chọn sản phẩm và điền đầy đủ thông tin hợp lệ (SL > 0, Đơn giá >= 0)!"
      );
      return;
    }
    const currentReceipt = importReceipts.find((r) => r.id === receiptId);
    if (!currentReceipt) return;
    const newItem = {
      productName: productName,
      quantity: quantity,
      price: price,
      category: category,
    };
    currentReceipt.items.push(newItem);
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));
    showImportProductForm(receiptId);
  };
  window.deleteItemInReceipt = function (receiptId, itemIndex) {
    const confirmDelete = confirm(
      "Bạn có chắc chắn muốn xóa mặt hàng này khỏi phiếu nhập không?"
    );
    if (confirmDelete) {
      const currentReceipt = importReceipts.find((r) => r.id === receiptId);
      if (!currentReceipt || currentReceipt.status === "Hoàn thành") return;
      currentReceipt.items.splice(itemIndex, 1);
      localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));
      showImportProductForm(receiptId);
      alert("✅ Đã xóa mặt hàng thành công.");
    }
  };
  window.finishReceiptEditing = function (receiptId) {
    const currentReceipt = importReceipts.find((r) => r.id === receiptId);
    if (!currentReceipt) return;
    if (currentReceipt.items.length === 0) {
      alert(
        "Phiếu nhập rỗng. Phiếu này sẽ bị xóa nếu bạn đóng. Vui lòng thêm ít nhất 1 mặt hàng."
      );
      return;
    }
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));
    closeModal(null, receiptId);
    renderAddInfo();
    alert(`✅ Đã lưu phiếu nhập #${receiptId}. (Trạng thái: Chưa hoàn thành)`);
  };
  window.finalizeReceiptStatus = function (receiptId) {
    const currentReceipt = importReceipts.find((r) => r.id === receiptId);
    if (!currentReceipt) return;
    if (currentReceipt.status === "Hoàn thành") return;
    if (currentReceipt.items.length === 0) {
      alert("❌ Phiếu nhập rỗng không thể hoàn thành!");
      return;
    }
    currentReceipt.status = "Hoàn thành";
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));
    syncInventoryToShelf();
    renderAddInfo();
    alert(
      `✅ Phiếu nhập hàng #${receiptId} đã Hoàn thành.\nĐã cập nhật tồn kho.`
    );
  };
  window.editImportReceipt = function (receiptId) {
    const currentReceipt = importReceipts.find((r) => r.id === receiptId);
    if (!currentReceipt || currentReceipt.status !== "Chưa hoàn thành") {
      alert("Lỗi: Phiếu này đã Hoàn thành và không thể chỉnh sửa.");
      return;
    }
    showImportProductForm(receiptId);
  };
  window.viewImportReceipt = function (id) {
    showViewImportReceiptModal(id);
  };
  window.showViewImportReceiptModal = function (id) {
    const receipt = importReceipts.find((r) => r.id === id);
    if (!receipt) return alert("Không tìm thấy phiếu nhập!");
    let itemsHtml = "";
    let totalReceiptPrice = 0;
    receipt.items.forEach((item) => {
      const itemPrice = item.quantity * item.price;
      totalReceiptPrice += itemPrice;
      itemsHtml += `
            <tr>
              <td>${escapeHtml(item.productName)}</td>
              <td>${item.quantity}</td>
              <td>${formatPrice(item.price)}đ</td>
              <td><strong>${formatPrice(itemPrice)}đ</strong></td>
            </tr>
        `;
    });
    const html = `
      <div class="productImport-modal-overlay" id="viewImportReceiptModal" onclick="closeViewReceiptModal(event)">
        <div class="modal-box" onclick="event.stopPropagation()">
          <h2 style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
              CHI TIẾT PHIẾU NHẬP - #PN${receipt.id}
              <span onclick="closeViewReceiptModal()" style="cursor: pointer; font-size: 28px; color: #999;">&times;</span>
          </h2>
          <div style="margin-bottom: 15px; font-size: 14px; border: 1px solid #ccc; padding: 10px; border-radius: 8px;">
              <p><strong>Ngày nhập:</strong> ${receipt.date}</p>
              <p><strong>Người nhập:</strong> ${escapeHtml(
                receipt.importedBy
              )}</p>
              <p><strong>Trạng thái:</strong> <span style="font-weight: 600; color: ${
                receipt.status === "Hoàn thành" ? "green" : "orange"
              };">${receipt.status}</span></p>
          </div>
          <table class="admin-table">
            <thead> <tr> <th>Tên sản phẩm</th> <th>Số lượng</th> <th>Giá nhập</th> <th>Thành tiền</th> </tr> </thead>
            <tbody> ${itemsHtml} </tbody>
          </table>
          <div style="margin-top: 20px; text-align: right; font-size: 18px;">
              <strong>TỔNG GIÁ TRỊ PHIẾU:</strong> <span style="color: #764ba2; font-weight: 700;">${formatPrice(
                totalReceiptPrice
              )}đ</span>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML("beforeend", html);
  };
  window.closeViewReceiptModal = function (event) {
    if (
      !event ||
      (event.target.id === "viewImportReceiptModal" &&
        !event.target.closest(".modal-box"))
    ) {
      const modal = document.getElementById("viewImportReceiptModal");
      if (modal) modal.remove();
    }
  };
  (function () {
    // === KHÓA LOCALSTORAGE ===
    const INVOICES_KEY = "invoices";
    const IMPORT_RECEIPTS_KEY = "importReceipts";
    const PRODUCTS_KEY = "products"; // Dùng để xóa dữ liệu cũ

    // === DỮ LIỆU PHIẾU NHẬP MẪU (GIỮ NGUYÊN) ===
    const mockReceipts = [
      {
        id: "1700000001",
        date: "15/11/2025, 09:00:00", // (Ngày này không quan trọng)
        importedBy: "Admin",
        status: "Hoàn thành",
        items: [
          // (Chứa tất cả 19 sản phẩm...)
          {
            productName: "Laptop Dell XPS 13 9340",
            quantity: 30,
            price: 30000000,
            category: "Laptop",
          },
          {
            productName: "Apple Watch Series 9 45mm",
            quantity: 50,
            price: 9000000,
            category: "Đồng hồ thông minh",
          },
          {
            productName: "RAM Corsair Vengeance RGB 32GB (2x16GB) DDR5",
            quantity: 40,
            price: 4000000,
            category: "Linh kiện PC",
          },
          {
            productName: "iPad Pro 12.9 inch M2 256GB",
            quantity: 20,
            price: 25000000,
            category: "Máy tính bảng",
          },
          {
            productName: "Apple AirPods Pro 2 (USB-C)",
            quantity: 60,
            price: 5000000,
            category: "Tai nghe",
          },
          {
            productName: "Sạc dự phòng Anker 20000mAh",
            quantity: 100,
            price: 800000,
            category: "Phụ kiện",
          },
          {
            productName: "Cáp Belkin USB-C to Lightning",
            quantity: 150,
            price: 300000,
            category: "Phụ kiện",
          },
          {
            productName: "Gimbal DJI Osmo Mobile 6",
            quantity: 30,
            price: 3000000,
            category: "Phụ kiện",
          },
          {
            productName: "iPhone 15 Pro Max 256GB",
            quantity: 40,
            price: 28000000,
            category: "Điện thoại",
          },
          {
            productName: "Ổ cứng WD My Passport 2TB",
            quantity: 50,
            price: 1500000,
            category: "Phụ kiện lưu trữ",
          },
          {
            productName: "Router TP-Link Archer AX73",
            quantity: 30,
            price: 2000000,
            category: "Thiết bị mạng",
          },
          {
            productName: "Tai nghe Sony WH-1000XM5",
            quantity: 25,
            price: 7000000,
            category: "Tai nghe",
          },
          {
            productName: "Samsung Galaxy Tab S9",
            quantity: 20,
            price: 18000000,
            category: "Máy tính bảng",
          },
          {
            productName: "Samsung Galaxy Watch 6",
            quantity: 50,
            price: 5500000,
            category: "Đồng hồ thông minh",
          },
          {
            productName: "SSD Samsung 990 PRO 1TB",
            quantity: 30,
            price: 3500000,
            category: "Linh kiện máy tính",
          },
          {
            productName: "Ốp lưng iPhone 15 Pro",
            quantity: 200,
            price: 250000,
            category: "Phụ kiện điện thoại",
          },
          {
            productName: "MacBook Air M3",
            quantity: 25,
            price: 27000000,
            category: "Laptop",
          },
          {
            productName: "MacBook Pro 14 M3",
            quantity: 15,
            price: 38000000,
            category: "Laptop",
          },
          {
            productName: "Chuột Logitech MX Master 3S",
            quantity: 70,
            price: 2000000,
            category: "Phụ kiện máy tính",
          },
        ],
      },
      {
        id: "1700000002",
        date: "15/11/2025, 09:00:00", // (Ngày này không quan trọng)
        importedBy: "Admin",
        status: "Chưa hoàn thành",
        items: [
          {
            productName: "MacBook Pro 14 M3",
            quantity: 15,
            price: 38000000,
            category: "Laptop",
          },
          {
            productName: "Chuột Logitech MX Master 3S",
            quantity: 70,
            price: 2000000,
            category: "Phụ kiện máy tính",
          },
        ],
      },
      {
        id: "1700000003",
        date: "15/11/2025, 09:00:00", // (Ngày này không quan trọng)
        importedBy: "Admin",
        status: "Chưa hoàn thành",
        items: [
          {
            productName: "MacBook Air M3",
            quantity: 25,
            price: 27000000,
            category: "Laptop",
          },
          {
            productName: "MacBook Pro 14 M3",
            quantity: 15,
            price: 38000000,
            category: "Laptop",
          },
        ],
      },
      {
        id: "1700000003",
        date: "15/11/2025, 09:00:00", // (Ngày này không quan trọng)
        importedBy: "Admin",
        status: "Chưa hoàn thành",
        items: [
          {
            productName: "iPhone 15 Pro Max 256GB",
            quantity: 40,
            price: 28000000,
            category: "Điện thoại",
          },
          {
            productName: "Ổ cứng WD My Passport 2TB",
            quantity: 50,
            price: 1500000,
            category: "Phụ kiện lưu trữ",
          },
        ],
      },
      {
        id: "1700000003",
        date: "15/11/2025, 09:00:00", // (Ngày này không quan trọng)
        importedBy: "Admin",
        status: "Chưa hoàn thành",
        items: [
          {
            productName: "SSD Samsung 990 PRO 1TB",
            quantity: 30,
            price: 3500000,
            category: "Linh kiện máy tính",
          },
          {
            productName: "Ốp lưng iPhone 15 Pro",
            quantity: 200,
            price: 250000,
            category: "Phụ kiện điện thoại",
          },
        ],
      },
    ];

    // === DỮ LIỆU HÓA ĐƠN MỚI (2020 - 2024) ===
    const mockInvoices = [
      {
        id: 1584246600, // 2020
        date: "15/03/2020, 10:30:00",
        user: "khachhangA",
        items: [
          {
            name: "Cáp Belkin USB-C to Lightning",
            quantity: 2,
            price: 360000,
          },
          {
            name: "Sạc dự phòng Anker 20000mAh",
            quantity: 1,
            price: 960000,
          },
        ],
        total: 1680000,
        status: "Đã giao",
      },
      {
        id: 1621519200, // 2021
        date: "20/05/2021, 14:00:00",
        user: "khachhangB",
        items: [
          { name: "Gimbal DJI Osmo Mobile 6", quantity: 1, price: 3600000 },
        ],
        total: 3600000,
        status: "Đã giao",
      },
      {
        id: 1640970000, // 2022
        date: "01/01/2022, 12:00:00",
        user: "khachhangA",
        items: [
          {
            name: "RAM Corsair Vengeance RGB 32GB (2x16GB) DDR5",
            quantity: 1,
            price: 4800000,
          },
          { name: "SSD Samsung 990 PRO 1TB", quantity: 1, price: 4200000 },
        ],
        total: 9000000,
        status: "Đã giao",
      },
      {
        id: 1694308500, // 2023
        date: "10/09/2023, 09:15:00",
        user: "nguoidungC",
        items: [
          { name: "Laptop Dell XPS 13 9340", quantity: 1, price: 36000000 },
        ],
        total: 36000000,
        status: "Đã giao",
      },
      {
        id: 1703533500, // 2023
        date: "25/12/2023, 19:45:00",
        user: "khachhangB",
        items: [
          {
            name: "Apple Watch Series 9 45mm",
            quantity: 1,
            price: 10800000,
          },
          {
            name: "Apple AirPods Pro 2 (USB-C)",
            quantity: 1,
            price: 6000000,
          },
        ],
        total: 16800000,
        status: "Đã giao",
      },
      {
        id: 1707107400, // 2024
        date: "05/02/2024, 11:30:00",
        user: "khachhangA",
        items: [
          { name: "iPhone 15 Pro Max 256GB", quantity: 1, price: 33600000 },
          { name: "Ốp lưng iPhone 15 Pro", quantity: 2, price: 300000 },
        ],
        total: 34200000,
        status: "Đang vận chuyển",
      },
      {
        id: 1721206800, // 2024
        date: "17/07/2024, 16:00:00",
        user: "nguoidungC",
        items: [
          { name: "MacBook Air M3", quantity: 1, price: 32400000 },
          {
            name: "Chuột Logitech MX Master 3S",
            quantity: 1,
            price: 2400000,
          },
        ],
        total: 34800000,
        status: "Đã hủy",
      },
    ];

    // === NẠP DỮ LIỆU VÀO LOCALSTORAGE ===
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(mockReceipts));
    localStorage.setItem(INVOICES_KEY, JSON.stringify(mockInvoices));

    console.log(
      "Đã nạp dữ liệu mẫu MỚI (Users, Receipts, Invoices 2020-2024)."
    );
  })();
  window.deleteImportReceipt = function (id) {
    const receipt = importReceipts.find((r) => r.id === id);
    if (!receipt) return;
    let confirmMsg =
      "Bạn có chắc muốn xóa phiếu nhập này? Hành động này không thể hoàn tác.";
    if (receipt.status === "Hoàn thành") {
      confirmMsg =
        "⚠️ CẢNH BÁO: Bạn đang xóa một phiếu đã HOÀN THÀNH.\nViệc này sẽ cập nhật lại tồn kho (giảm số lượng đã nhập).\n\nBạn có chắc chắn muốn xóa?";
    }
    if (!confirm(confirmMsg)) return;
    importReceipts = importReceipts.filter((r) => r.id !== id);
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));
    syncInventoryToShelf();
    renderAddInfo();
    alert("Đã xóa phiếu nhập!");
  };
  // ========================================================

  // === (CỤM HÀM MỚI) BỘ LỌC QUẢN LÝ HÓA ĐƠN ===
  // === (CỤM HÀM MỚI) BỘ LỌC QUẢN LÝ HÓA ĐƠN ===
  function renderInvoiceTable(filteredInvoices) {
    const tableBody = document.getElementById("invoicesTableBody");
    if (!tableBody) return;

    let html = "";
    filteredInvoices
      .sort((a, b) => b.id - a.id)
      .forEach((invoice) => {
        const itemsStr = invoice.items.map((it) => it.name).join(", ");
        const status = invoice.status || "Mới đặt";
        const statusClass = getStatusClass(status);

        // Kiểm tra điều kiện để Disable nút Xóa
        const isCanceled = status === "Đã hủy";
        // Nếu chưa hủy thì nút bị mờ (opacity 0.5) và không bấm được (cursor: not-allowed)
        const deleteBtnStyle = isCanceled
          ? ""
          : "opacity: 0.5; cursor: not-allowed; background-color: #718096;";
        const deleteTitle = isCanceled
          ? "Xóa vĩnh viễn hóa đơn này"
          : "Chỉ có thể xóa khi trạng thái là 'Đã hủy'";

        html += `
          <tr>
            <td>#${invoice.id}</td>
            <td>${invoice.date}</td>
            <td>${escapeHtml(invoice.user)}</td>
            <td title="${escapeHtml(itemsStr)}">${escapeHtml(
          itemsStr.length > 50 ? itemsStr.substring(0, 50) + "..." : itemsStr
        )}</td>
            <td>${formatPrice(invoice.total)}đ</td>
            <td>
              <span class="invoice-status-select ${statusClass}" style="border: none;">
                ${status}
              </span>
            </td>
            <td>
              <button onclick="showViewInvoiceModal(${
                invoice.id
              })" class="btn-view" style="margin-right: 5px;">
                <i class="fa-solid fa-eye"></i> Xem / Cập nhật
              </button>
              
              <button 
                onclick="${isCanceled ? `deleteInvoice(${invoice.id})` : ""}" 
                class="btn-delete" 
                style="${deleteBtnStyle}"
                title="${deleteTitle}"
                ${!isCanceled ? "disabled" : ""}
              >
                <i class="fa-solid fa-trash"></i> Hủy HĐ
              </button>
            </td>
          </tr>
        `;
      });

    if (!html) {
      html = `<tr><td colspan="7" class="empty-state">Không tìm thấy hóa đơn phù hợp.</td></tr>`;
    }
    tableBody.innerHTML = html;
  }
  window.deleteInvoice = function (id) {
    const index = invoices.findIndex((inv) => inv.id === id);
    if (index === -1) return;

    const invoice = invoices[index];

    // === RÀNG BUỘC: CHỈ ĐƯỢC XÓA KHI TRẠNG THÁI LÀ "ĐÃ HỦY" ===
    if (invoice.status !== "Đã hủy") {
      alert(
        "⚠️ CẢNH BÁO: Bạn chỉ có thể xóa vĩnh viễn hóa đơn khi trạng thái là 'Đã hủy'.\n\nVui lòng chuyển trạng thái sang 'Đã hủy' trước!"
      );
      return;
    }

    if (
      !confirm(
        `Bạn có chắc chắn muốn XÓA VĨNH VIỄN hóa đơn #${id} không?\n\nHành động này không thể hoàn tác!`
      )
    ) {
      return;
    }

    // Thực hiện xóa
    invoices.splice(index, 1);
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));

    // Đồng bộ lại tồn kho (Dù hóa đơn đã hủy không ảnh hưởng tồn kho, nhưng cần chạy để đảm bảo nhất quán)
    syncInventoryToShelf();

    // Render lại bảng
    renderInvoiceManagement();

    // Nếu đang mở modal xem chi tiết của chính hóa đơn này thì đóng lại
    const modal = document.getElementById("viewInvoiceModal");
    if (modal) modal.remove();

    alert("✅ Đã xóa vĩnh viễn hóa đơn khỏi hệ thống!");
  };
  window.filterInvoices = function () {
    const customerQuery = document
      .getElementById("customerSearchInput")
      .value.toLowerCase()
      .trim();
    const startDateVal = document.getElementById("invoiceStartDate").value;
    const endDateVal = document.getElementById("invoiceEndDate").value;
    const startDate = startDateVal
      ? new Date(startDateVal + "T00:00:00")
      : null;
    const endDate = endDateVal ? new Date(endDateVal + "T23:59:59") : null;
    const filtered = invoices.filter((invoice) => {
      const matchesCustomer = invoice.user
        .toLowerCase()
        .includes(customerQuery);
      const invoiceDate = parseVNDate(invoice.date);
      if (!invoiceDate) return false;
      const matchesDate =
        (!startDate || invoiceDate >= startDate) &&
        (!endDate || invoiceDate <= endDate);
      return matchesCustomer && matchesDate;
    });
    renderInvoiceTable(filtered);
  };
  window.resetInvoiceFilter = function () {
    document.getElementById("customerSearchInput").value = "";
    document.getElementById("invoiceStartDate").value = "";
    document.getElementById("invoiceEndDate").value = "";
    renderInvoiceTable(invoices);
  };
  function renderInvoiceManagement() {
    reloadDataAndSync();
    hideAllContent();
    if (!invoiceContent) return;
    invoiceContent.style.display = "block";
    let html = `
      <div class="management-header">
        <h2><i class="fa-solid fa-file-invoice"></i> Quản lý Hóa đơn</h2>
        <button onclick="refreshInvoices()" class="btn-refresh">
          <i class="fa-solid fa-rotate"></i> Làm mới
        </button>
      </div>
      
      <div class="filter-controls">
        <label for="customerSearchInput">Khách hàng:</label>
        <input 
          type="text" 
          id="customerSearchInput" 
          placeholder="Tìm theo tên khách hàng..."
        />
        <label for="invoiceStartDate">Từ ngày:</label>
        <input type="date" id="invoiceStartDate" />
        <label for="invoiceEndDate">Đến ngày:</label>
        <input type="date" id="invoiceEndDate" />
        <button onclick="window.filterInvoices()" class="btn-filter">
          <i class="fa-solid fa-search"></i> Lọc
        </button>
        <button onclick="window.resetInvoiceFilter()" class="btn-reset">
          <i class="fa-solid fa-times"></i> Reset
        </button>
      </div>

      <div class="table-container">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Mã HĐ</th>
              <th>Ngày</th>
              <th>Khách hàng</th>
              <th>Sản phẩm</th>
              <th>Tổng tiền</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody id="invoicesTableBody">
          </tbody>
        </table>
      </div>
      <div class="stats-container">
      </div>
    `;
    invoiceContent.innerHTML = html;
    renderInvoiceTable(invoices);
  }
  window.updateInvoiceStatus = function (id, newStatus, selectElement) {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) return;
    const oldStatus = invoice.status || "Mới đặt";
    if (
      (oldStatus === "Đã giao" || oldStatus === "Đã hủy") &&
      oldStatus !== newStatus
    ) {
      alert(
        "Đơn hàng đã ở trạng thái cuối cùng (Đã giao/Đã hủy) và không thể thay đổi."
      );
      if (selectElement) selectElement.value = oldStatus;
      return;
    }
    invoice.status = newStatus;
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    syncInventoryToShelf();
    renderInvoiceManagement();
    if (productContent && productContent.style.display !== "none") {
      renderProductManagement();
    }
  };
  window.refreshInvoices = function () {
    reloadDataAndSync();
    renderInvoiceManagement();
  };
  window.showViewInvoiceModal = function (id) {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) return alert("Không tìm thấy hóa đơn!");

    window.closeViewInvoiceModal();

    const currentStatus = invoice.status || "Mới đặt";

    // Định nghĩa cấp độ trạng thái
    const statusLevels = {
      "Mới đặt": 0,
      "Đang xử lý": 1,
      "Đang vận chuyển": 2,
      "Đã giao": 3,
      "Đã hủy": 4, // Đặt là 4 để không thể chuyển từ Hủy về các trạng thái trước
    };

    const currentLevel = statusLevels[currentStatus];
    const isTerminalState =
      currentStatus === "Đã giao" || currentStatus === "Đã hủy";

    const allStatuses = [
      "Mới đặt",
      "Đang xử lý",
      "Đang vận chuyển",
      "Đã giao",
      "Đã hủy",
    ];

    // Tạo options và vô hiệu hóa các trạng thái ngược chiều
    const statusOptions = allStatuses
      .map((s) => {
        const level = statusLevels[s];
        let isDisabled = false;
        let note = "";

        // LOGIC RÀNG BUỘC:
        if (s === currentStatus) {
          // Trạng thái hiện tại: Luôn active
          isDisabled = false;
        } else if (isTerminalState) {
          // Nếu đơn đã xong/hủy -> Khóa tất cả các lựa chọn khác
          isDisabled = true;
        } else {
          // Nếu chưa xong:
          if (s === "Đã hủy") {
            // Luôn cho phép hủy nếu chưa giao xong
            isDisabled = false;
          } else if (level < currentLevel) {
            // Cấm quay đầu (Level đích nhỏ hơn Level hiện tại)
            isDisabled = true;
            note = " (Không thể quay lại)";
          }
        }

        return `<option value="${s}" ${s === currentStatus ? "selected" : ""} ${
          isDisabled ? "disabled" : ""
        }>
                        ${s}${note}
                    </option>`;
      })
      .join("");

    // --- (Phần dưới giữ nguyên như code trước) ---
    let itemsHtml = "";
    invoice.items.forEach((item) => {
      const itemPrice = item.quantity * item.price;
      itemsHtml += `
            <tr>
                <td>${escapeHtml(item.name)}</td>
                <td>${item.quantity}</td>
                <td>${formatPrice(item.price)}đ</td>
                <td><strong>${formatPrice(itemPrice)}đ</strong></td>
            </tr>
        `;
    });

    const modalHtml = `
      <div class="invoice-detail-modal-overlay" id="viewInvoiceModal" onclick="closeViewInvoiceModal(event)">
        <div class="modal-box" onclick="event.stopPropagation()" style="max-width: 700px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; border-bottom: 2px solid #eee; padding-bottom: 10px;">
             <h2 style="color: #667eea; margin: 0;"><i class="fa-solid fa-file-invoice"></i> Chi tiết Hóa đơn #${
               invoice.id
             }</h2>
             <span onclick="closeViewInvoiceModal()" style="cursor: pointer; font-size: 24px; color: #999;">&times;</span>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
             <div>
                <p><strong>Ngày đặt:</strong> ${invoice.date}</p>
                <p><strong>Khách hàng:</strong> ${escapeHtml(invoice.user)}</p>
             </div>
             <div style="text-align: right;">
                <p><strong>Tổng tiền:</strong> <span style="font-size: 18px; color: #e53e3e; font-weight: bold;">${formatPrice(
                  invoice.total
                )}đ</span></p>
             </div>
          </div>

          <div style="background-color: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #e0e0e0;">
             <label style="font-weight: 600; display: block; margin-bottom: 8px;">Cập nhật Trạng thái (Chỉ chuyển tiếp):</label>
             <div style="display: flex; gap: 10px;">
                 <select id="modalInvoiceStatus" class="invoice-status-select ${getStatusClass(
                   currentStatus
                 )}" 
                    style="flex: 1; padding: 8px; border-radius: 4px; border: 1px solid #ccc;">
                    ${statusOptions}
                 </select>
                 <button onclick="updateInvoiceStatusFromModal(${
                   invoice.id
                 })" class="btn-edit" ${
      isTerminalState
        ? 'disabled style="opacity: 0.5; cursor: not-allowed;"'
        : ""
    }>
                    <i class="fa-solid fa-save"></i> Lưu trạng thái
                 </button>
             </div>
             ${
               isTerminalState
                 ? '<p style="font-size: 12px; color: #e53e3e; margin-top: 5px;">* Đơn hàng đã hoàn tất/hủy, không thể thay đổi trạng thái.</p>'
                 : ""
             }
          </div>

          <h3 style="font-size: 16px; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px;">Danh sách sản phẩm</h3>
          <div class="table-container" style="max-height: 300px; overflow-y: auto;">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Sản phẩm</th>
                        <th>SL</th>
                        <th>Đơn giá</th>
                        <th>Thành tiền</th>
                    </tr>
                </thead>
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
          </div>

          <div style="margin-top: 20px; text-align: right;">
             <button onclick="closeViewInvoiceModal()" class="btn-delete" style="background-color: #718096;">Đóng</button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // (Thêm CSS nếu chưa có - giữ nguyên như cũ)
    const styleCheck = document.getElementById("invoice-modal-style");
    if (!styleCheck) {
      const style = document.createElement("style");
      style.id = "invoice-modal-style";
      style.innerHTML = `
            .invoice-detail-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0, 0, 0, 0.5); z-index: 1000;
                display: flex; justify-content: center; align-items: center;
            }
        `;
      document.head.appendChild(style);
    }
  };
  // 2. Hàm xử lý cập nhật trạng thái từ Modal
  window.updateInvoiceStatusFromModal = function (id) {
    const selectEl = document.getElementById("modalInvoiceStatus");
    if (!selectEl) return;

    const newStatus = selectEl.value;
    const invoice = invoices.find((inv) => inv.id === id);

    if (!invoice) return;

    const oldStatus = invoice.status || "Mới đặt";

    // Logic chặn thay đổi nếu đã "Đã giao" hoặc "Đã hủy" (nếu muốn)
    if (
      (oldStatus === "Đã giao" || oldStatus === "Đã hủy") &&
      oldStatus !== newStatus
    ) {
      if (
        !confirm(
          "Đơn hàng này đã kết thúc (" +
            oldStatus +
            "). Bạn có chắc chắn muốn thay đổi lại trạng thái không? Việc này sẽ ảnh hưởng đến thống kê tồn kho."
        )
      ) {
        selectEl.value = oldStatus; // Reset lại select
        return;
      }
    }

    // Cập nhật dữ liệu
    invoice.status = newStatus;
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));

    // Đồng bộ tồn kho (quan trọng vì trạng thái hủy/giao ảnh hưởng số lượng bán)
    syncInventoryToShelf();

    // Render lại bảng ở dưới nền
    renderInvoiceManagement();

    // Cập nhật màu sắc của select box ngay trong popup để phản hồi trực quan
    selectEl.className = `invoice-status-select ${getStatusClass(newStatus)}`;

    alert(`✅ Đã cập nhật trạng thái đơn hàng #${id} thành: ${newStatus}`);
  };
  window.updateImportPriceInput = function () {
    const productNameSelect = document.getElementById("importProductName");
    const priceInput = document.getElementById("importPrice");

    if (!productNameSelect || !priceInput) return;

    const productName = productNameSelect.value;

    // Sử dụng hàm findLatestImportPrice đã có sẵn trong code của bạn
    const latestPrice = findLatestImportPrice(productName);

    if (latestPrice && latestPrice !== "") {
      priceInput.value = latestPrice;

      // (Tùy chọn) Hiệu ứng nháy màu để báo hiệu giá đã được tự động điền
      priceInput.style.transition = "background-color 0.3s";
      priceInput.style.backgroundColor = "#d1fae5"; // Màu xanh nhạt
      setTimeout(() => {
        priceInput.style.backgroundColor = "white"; // Trả về màu trắng
      }, 800);
    } else {
      // Nếu sản phẩm mới tinh chưa từng nhập, để trống hoặc đặt về 0
      priceInput.value = "";
    }
  };

  // 3. Hàm đóng Modal
  window.closeViewInvoiceModal = function (event) {
    // Nếu click vào overlay (vùng tối) hoặc nút đóng
    if (
      !event ||
      event.target.id === "viewInvoiceModal" ||
      !event.target.closest(".modal-box")
    ) {
      const modal = document.getElementById("viewInvoiceModal");
      if (modal) modal.remove();
    }
  };
  // ========================================================

  // === GẮN SỰ KIỆN CHO CÁC NÚT ĐIỀU HƯỚNG (GIỮ NGUYÊN) ===
  if (manageUserBtn) {
    manageUserBtn.addEventListener("click", renderUserManagement);
  }
  if (manageProductBtn) {
    manageProductBtn.addEventListener("click", () => renderProductManagement());
  }
  if (manageInvoiceBtn) {
    manageInvoiceBtn.addEventListener("click", renderInvoiceManagement);
  }
  if (addInfoBtn) {
    addInfoBtn.addEventListener("click", renderAddInfo);
  }
  if (manageStockBtn) {
    manageStockBtn.addEventListener("click", () => renderStockManagement());
  }
  if (manageProfitBtn) {
    manageProfitBtn.addEventListener("click", renderProfitManagement);
  }
  // ========================================================

  // === GẮN SỰ KIỆN CHO FORM SẢN PHẨM (GIỮ NGUYÊN) ===
  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.addEventListener("submit", function (event) {
      if (window.isAddingDefinition) {
        window.addProductDefinition(event);
      } else if (window.editingProductIndex > -1) {
        window.editProductDefinition(event);
      }
    });
  }
  // ========================================================

  // === KHỞI TẠO TRANG (GIỮ NGUYÊN) ===
  if (localStorage.getItem("isAdmin") === "true") {
    reloadDataAndSync(); // Tải và đồng bộ dữ liệu ngay từ đầu
    renderUserManagement(); // Hiển thị tab mặc định
  } else {
    if (window.location.pathname.includes("admin")) {
      window.location.replace("../index.html");
    }
  }
});
