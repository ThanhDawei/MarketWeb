const PRODUCTS_KEY = "products";
let products = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
document.addEventListener("DOMContentLoaded", () => {
  const STORAGE_KEY = "userAccounts";
  const INVOICES_KEY = "invoices";
  const IMPORT_RECEIPTS_KEY = "importReceipts";

  let users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  let invoices = JSON.parse(localStorage.getItem(INVOICES_KEY)) || [];
  let importReceipts =
    JSON.parse(localStorage.getItem(IMPORT_RECEIPTS_KEY)) || [];

  // === THÊM CSS CHO TRẠNG THÁI HÓA ĐƠN ===
  const adminStyles = document.createElement("style");
  adminStyles.textContent = `
    .invoice-status-select {
      padding: 6px 10px;
      border: 1px solid #ccc;
      border-radius: 6px;
      font-weight: 600;
      outline: none;
      -webkit-appearance: none;
      -moz-appearance: none;
      appearance: none;
      background-position: right 10px center;
      background-repeat: no-repeat;
      background-size: 12px;
      background-image: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="%23666"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>');
      padding-right: 30px; /* Thêm không gian cho mũi tên */
    }
    .status-new {
      background-color: #e0f2fe; /* blue-100 */
      color: #0c4a6e; /* blue-800 */
      border-color: #7dd3fc; /* blue-300 */
    }
    .status-processing {
      background-color: #fef9c3; /* yellow-100 */
      color: #713f12; /* yellow-800 */
      border-color: #fde047; /* yellow-300 */
    }
    .status-delivered {
      background-color: #dcfce7; /* green-100 */
      color: #14532d; /* green-800 */
      border-color: #86efac; /* green-300 */
    }
    .status-delivering {
      background-color: #fcecdcff; /* brown-100 */
      color: #533a14ff; /* brown-800 */
      border-color: #efb986ff; /* brown-300 */
    }
    .status-canceled {
      background-color: #fee2e2; /* red-100 */
      color: #7f1d1d; /* red-800 */
      border-color: #fca5a5; /* red-300 */
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

  window.editingProductIndex = -1;

  // Helper Functions
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

  /**
   * (HÀM MỚI) Kiểm tra xem sản phẩm đã từng được mua hay chưa.
   * @param {string} productName Tên sản phẩm cần kiểm tra.
   * @returns {boolean} True nếu đã từng được mua, false nếu chưa.
   */
  function hasProductBeenPurchased(productName) {
    const lowerCaseName = productName.trim().toLowerCase();
    // 'invoices' là biến toàn cục đã được tải
    return invoices.some((invoice) =>
      invoice.items.some(
        (item) => item.name.trim().toLowerCase() === lowerCaseName
      )
    );
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
    // Khởi tạo thống kê cho tất cả người dùng
    users.forEach((user) => {
      // Dùng username làm key
      stats[user.username.trim().toLowerCase()] = {
        orderCount: 0,
        totalRevenue: 0,
        ...user, // Copy các thuộc tính khác (như address, phone)
      };
    });

    // Tính toán số lượng hóa đơn
    invoices.forEach((invoice) => {
      const usernameKey = invoice.user.trim().toLowerCase(); // Giả định invoice.user là username
      if (stats[usernameKey]) {
        stats[usernameKey].orderCount += 1;
        stats[usernameKey].totalRevenue += invoice.total;
      }
    });

    return Object.values(stats);
  }

  // === TÍNH NĂNG MỚI: HÀM TÍNH TOÁN CHI TIẾT NHẬP/XUẤT/KỆ ===
  /**
   * Tính toán chi tiết nhập/xuất/kệ cho một sản phẩm cụ thể.
   * @param {string} productName Tên sản phẩm.
   * @returns {{imported: number, sold: number, onShelf: number, available: number}} Chi tiết.
   */
  function calculateStockBreakdown(productName) {
    const key = productName.trim().toLowerCase();
    let imported = 0;
    let sold = 0;
    let onShelf = 0;

    // 1. Tính tổng số lượng nhập vào (ĐÃ SỬA)
    importReceipts.forEach((receipt) => {
      // LẶP QUA TỪNG MẶT HÀNG TRONG PHIẾU NHẬP
      receipt.items.forEach((item) => {
        // So sánh tên sản phẩm của mặt hàng với tên cần tìm
        if (item.productName.trim().toLowerCase() === key) {
          imported += parseInt(item.quantity || 0);
        }
      });
    });

    // 2. Tính tổng số lượng đã bán (Giữ nguyên, giả định invoices.items vẫn là mảng 1 cấp)
    if (typeof invoices !== "undefined") {
      invoices.forEach((invoice) => {
        invoice.items.forEach((item) => {
          if (item.name.trim().toLowerCase() === key) {
            sold += parseInt(item.quantity || 0);
          }
        });
      });
    }

    // 3. Tính tổng số lượng đã đưa lên kệ (Giữ nguyên)
    if (typeof products !== "undefined") {
      products.forEach((product) => {
        if (product.name.trim().toLowerCase() === key) {
          onShelf += parseInt(product.quantity || 0);
        }
      });
    }

    // Tồn kho khả dụng (theo logic của calculateStock: Nhập - Bán - Trên Kệ)
    const available = imported - sold - onShelf;

    return { imported, sold, onShelf, available };
  }
  // ===================================================================

  // === HÀM LẤY DANH MỤC ĐỘC NHẤT (Dùng chung cho Phiếu nhập và Bộ lọc) ===
  function getUniqueCategories() {
    const categories = new Set();
    products.forEach((p) => categories.add(p.category));
    importReceipts.forEach((r) => categories.add(r.category));

    // Loại bỏ các giá trị null/undefined/empty string và sắp xếp
    const filteredCategories = Array.from(categories)
      .filter((c) => c && c.trim() !== "")
      .sort();

    return [...new Set(filteredCategories)];
  }

  // === HÀM LẤY CÁC KHOẢNG GIÁ ĐỘC NHẤT (Dùng cho Bộ lọc) ===
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

    // Chuyển đổi các khoảng giá thành format string "min-max"
    return ranges.map((range) => ({
      label: range.label,
      value: `${range.min}-${range.max === Infinity ? "" : range.max}`,
    }));
  }

  function findLatestImportPrice(productName) {
    if (!productName) return "";

    const lowerCaseName = productName.trim().toLowerCase();

    // Duyệt ngược từ phiếu nhập mới nhất
    for (let i = importReceipts.length - 1; i >= 0; i--) {
      const receipt = importReceipts[i];

      // Kiểm tra receipt và items có tồn tại
      if (!receipt || !Array.isArray(receipt.items)) continue;

      // TÌM TRONG MẢNG ITEMS của phiếu nhập
      for (let j = 0; j < receipt.items.length; j++) {
        const item = receipt.items[j];

        // So sánh tên sản phẩm
        if (
          item &&
          item.productName &&
          item.productName.trim().toLowerCase() === lowerCaseName
        ) {
          // Trả về giá của mặt hàng này
          return typeof item.price !== "undefined" ? item.price : "";
        }
      }
    }

    return ""; // Không tìm thấy
  }
  // === HÀM TẠO VÀ CÀI ĐẶT TRƯỜNG DANH MỤC CHO PHIẾU NHẬP (MỚI) ===
  function renderImportCategoryField(currentCategory = "") {
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

  // === HÀM XỬ LÝ SỰ KIỆN CHỌN DANH MỤC PHIẾU NHẬP (MỚI) ===
  window.checkImportCategoryInput = function () {
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
  };

  // === HÀM CHUYỂN FILE ẢNH SANG BASE64 ĐỂ LƯU VĨNH VIỄN ===
  function getBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  }

  // Placeholder image an toàn (dùng khi không có file)
  const placeholderImg = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#f2f2f2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="28">No Image</text></svg>'
  )}`;
  // === HÀM TÍNH TOÁN TỒN KHO TỪ PHIẾU NHẬP VÀ HÓA ĐƠN (GIỮ NGUYÊN) ===
  /**
   * Tính toán tồn kho thực tế bằng cách tổng hợp phiếu nhập và trừ đi hóa đơn bán hàng.
   * @returns {Array<{productName: string, category: string, quantity: number}>} Danh sách tồn kho.
   */
  function calculateStock() {
    let stock = {};

    // 1. Tính tổng số lượng nhập vào (từ Phiếu nhập hàng)
    // Cần LẶP QUA MẢNG ITEMS của mỗi phiếu nhập
    importReceipts.forEach((receipt) => {
      receipt.items.forEach((item) => {
        const key = item.productName.trim().toLowerCase();
        const category = item.category || "Chưa phân loại";
        const quantityAdded = parseInt(item.quantity || 0);

        if (!stock[key]) {
          stock[key] = {
            productName: item.productName,
            category: category,
            quantity: 0,
          };
        }
        // Cộng dồn số lượng của mặt hàng hiện tại
        stock[key].quantity += quantityAdded;

        // Cập nhật danh mục (sử dụng danh mục từ item, không phải từ receipt)
        stock[key].category = category;
      });
    });

    // 2. Trừ số lượng đã bán (từ Hóa đơn)
    // Giả định: Cấu trúc invoices.items.item.name và item.quantity là đúng
    if (typeof invoices !== "undefined") {
      // Kiểm tra biến invoices có tồn tại không
      invoices.forEach((invoice) => {
        invoice.items.forEach((item) => {
          const key = item.name.trim().toLowerCase();
          if (stock[key]) {
            stock[key].quantity -= parseInt(item.quantity || 0);
          }
        });
      });
    }

    // 3. Trừ đi số lượng đã được thêm lên kệ (products list)
    // Giả định: Cấu trúc products.product.name và product.quantity là đúng
    if (typeof products !== "undefined") {
      // Kiểm tra biến products có tồn tại không
      products.forEach((product) => {
        const key = product.name.trim().toLowerCase();
        if (stock[key]) {
          stock[key].quantity -= parseInt(product.quantity || 0);
        }
      });
    }

    return Object.values(stock);
  }
  function getAvailableStockProducts() {
    const stock = calculateStock();
    // Chỉ lấy sản phẩm có quantity > 0
    return stock.filter((item) => item.quantity > 0);
  }
  // === HÀM LẤY DANH MỤC CỦA SẢN PHẨM TỪ KHO/PHIẾU NHẬP (MỚI) ===
  function findProductCategory(productName) {
    // Tìm danh mục từ bản ghi tồn kho
    const stockItem = calculateStock().find(
      (item) =>
        item.productName.trim().toLowerCase() ===
        productName.trim().toLowerCase()
    );
    if (
      stockItem &&
      stockItem.category &&
      stockItem.category !== "Chưa phân loại"
    )
      return stockItem.category;

    // Tìm danh mục từ bất kỳ phiếu nhập nào
    const receipt = importReceipts.find(
      (r) =>
        r.productName.trim().toLowerCase() === productName.trim().toLowerCase()
    );
    return receipt ? receipt.category : "Chưa phân loại";
  }
  function calculateSellingPrice(importPrice, profitMargin) {
    return Math.round(importPrice * (1 + profitMargin / 100));
  }
  function renderProfitManagement() {
    hideAllContent();
    if (!profitContent) return;
    profitContent.style.display = "block";

    // Lấy danh sách sản phẩm trên kệ
    const shelfProducts = products.map((product) => {
      const importPrice = findLatestImportPrice(product.name);
      const currentPrice = product.value;

      // Tính % lợi nhuận hiện tại
      let currentProfitMargin = 0;
      if (importPrice && importPrice !== "") {
        const importPriceNum = parseInt(importPrice, 10);
        currentProfitMargin = (
          ((currentPrice - importPriceNum) / importPriceNum) *
          100
        ).toFixed(2);
      }

      // Lấy % lợi nhuận đã lưu (nếu có)
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
    
    <div class="stats-container" style="margin-bottom: 20px;">
      <div class="stat-card">
        <i class="fa-solid fa-box stat-icon"></i>
        <div>
          <h3>${products.length}</h3>
          <p>Sản phẩm trên kệ</p>
        </div>
      </div>
      <div class="stat-card">
        <i class="fa-solid fa-money-bill-trend-up stat-icon"></i>
        <div>
          <h3>${formatPrice(
            products.reduce((sum, p) => {
              const importPrice = parseInt(findLatestImportPrice(p.name) || 0);
              return sum + (p.value - importPrice) * p.quantity;
            }, 0)
          )}đ</h3>
          <p>Tổng lợi nhuận dự kiến</p>
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
        <tbody>
  `;

    shelfProducts.forEach((product, index) => {
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
        <td>${index + 1}</td>
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
          /> %
        </td>
        <td>
          <strong id="newPrice-${index}" style="color: #667eea; font-size: 16px;">
            ${formatPrice(newPrice)}đ
          </strong>
        </td>
        <td>
          <button onclick="applyProfitMargin(${index})" class="btn-edit">
            <i class="fa-solid fa-check"></i> Áp dụng
          </button>
        </td>
      </tr>
    `;
    });

    html += `
        </tbody>
      </table>
    </div>
    
    <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
      <strong>📌 Lưu ý:</strong>
      <ul style="margin: 10px 0 0 20px;">
        <li>% Lợi nhuận được tính dựa trên giá nhập gần nhất</li>
        <li>Sản phẩm chưa có giá nhập sẽ không thể điều chỉnh tự động</li>
        <li>Giá bán mới = Giá nhập × (1 + % Lợi nhuận / 100)</li>
        <li>Thay đổi % lợi nhuận sẽ cập nhật giá bán trên kệ ngay lập tức</li>
      </ul>
    </div>
  `;

    profitContent.innerHTML = html;
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

    // Cập nhật giá và % lợi nhuận
    products[index].value = newPrice;
    products[index].profitMargin = profitMargin;

    // Lưu vào localStorage
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

    // Render lại
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
        `Áp dụng lợi nhuận ${profitMargin}% cho TẤT CẢ ${products.length} sản phẩm?\n\nCẢNH BÁO: Hành động này sẽ thay đổi giá bán của tất cả sản phẩm có giá nhập!`
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

    // Lưu vào localStorage
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

    // Render lại
    renderProfitManagement();

    alert(
      `✅ Hoàn tất!\n\n- Đã cập nhật: ${updatedCount} sản phẩm\n- Bỏ qua (chưa có giá nhập): ${skippedCount} sản phẩm`
    );
  };
  window.refreshProfitManagement = function () {
    products = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
    renderProfitManagement();
  };
  // === QUẢN LÝ KHO (CẬP NHẬT: THÊM TÍNH NĂNG TÌM KIẾM NÂNG CAO) ===
  /**
   * Render giao diện Quản lý tồn kho.
   * @param {string} nameQuery Chuỗi tìm kiếm tên sản phẩm.
   * @param {string} categoryQuery Chuỗi tìm kiếm danh mục.
   */
  window.renderStockManagement = function (nameQuery = "", categoryQuery = "") {
    hideAllContent();
    if (!stockContent) return;
    stockContent.style.display = "block";

    const allStock = calculateStock();
    const uniqueCategories = getUniqueCategories();

    // --- LOGIC LỌC DỮ LIỆU TỒN KHO ---
    const lowerCaseNameQuery = nameQuery.trim().toLowerCase();
    const filteredStock = allStock.filter((item) => {
      const matchesName =
        lowerCaseNameQuery === "" ||
        item.productName.trim().toLowerCase().includes(lowerCaseNameQuery);
      const matchesCategory =
        categoryQuery === "" || item.category === categoryQuery;
      return matchesName && matchesCategory;
    });

    // --- GIAO DIỆN BỘ LỌC ---
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
          if (item.quantity > 0) {
            const isLowStock = item.quantity <= 10;
            html += `
          <tr>
            <td>${idCounter++}</td>
            <td>${escapeHtml(item.productName)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td><span class="badge ${
              isLowStock ? "badge-warning" : "badge-success"
            }">${item.quantity}</span></td>
            <td><button class="btn-view" onclick="viewStockDetail('${escapeHtml(
              item.productName
            )}')"><i class="fa-solid fa-eye"></i> Xem</button></td>
          </tr>`;
          }
        });

      if (!html) {
        html = `<tr><td colspan="5" class="empty-state">Kho hàng trống hoặc không tìm thấy kết quả.</td></tr>`;
      }

      tbody.innerHTML = html;
    }
    // Hàm global để kích hoạt việc lọc tồn kho
    window.filterStock = function () {
      const nameInput = document.getElementById("stockSearchInput").value;
      const categorySelect = document.getElementById(
        "stockCategorySelect"
      ).value;

      const allStock = calculateStock();
      const lowerCaseNameQuery = nameInput.trim().toLowerCase();

      const filteredStock = allStock.filter((item) => {
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
            <h2><i class="fa-solid fa-warehouse"></i> Quản lý tồn kho</h2>
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
                        <th>Số lượng tồn (Khả dụng)</th>
                        <th>Thao tác</th>
                    </tr>
                </thead>
                <tbody id="stockTableBody">
    `;

    let idCounter = 1;

    filteredStock
      .sort((a, b) => b.quantity - a.quantity)
      .forEach((item) => {
        // Chỉ hiển thị sản phẩm có tồn kho lớn hơn 0
        if (item.quantity > 0) {
          const isLowStock = item.quantity <= 10;
          html += `
                <tr>
                    <td>${idCounter++}</td>
                    <td>${escapeHtml(item.productName)}</td>
                    <td>${escapeHtml(item.category)}</td>
                    <td>
                        <span class="badge ${
                          isLowStock ? "badge-warning" : "badge-success"
                        }">
                            ${item.quantity}
                        </span>
                    </td>
                    <td>
                        <button class="btn-view" onclick="viewStockDetail('${escapeHtml(
                          item.productName
                        )}')">
                            <i class="fa-solid fa-eye"></i> Xem
                        </button>
                    </td>
                </tr>
            `;
        }
      });

    html += `
                </tbody>
            </table>
        </div>
    `;

    stockContent.innerHTML = html;

    if (
      !document.getElementById("stockTableBody") ||
      document.getElementById("stockTableBody").children.length === 0
    ) {
      document.getElementById(
        "stockTableBody"
      ).innerHTML = `<tr><td colspan="5" class="empty-state">Kho hàng trống hoặc không tìm thấy kết quả.</td></tr>`;
    }
  };

  // === CẬP NHẬT window.viewStockDetail ĐỂ HIỂN THỊ CHI TIẾT TỒN KHO ===
  window.viewStockDetail = function (productName) {
    const stockItem = calculateStock().find(
      (item) => item.productName === productName
    );

    if (!stockItem) {
      alert("Không tìm thấy thông tin sản phẩm!");
      return;
    }

    // === TÍNH NĂNG MỚI: Chi tiết tồn kho (Sử dụng hàm mới) ===
    const breakdown = calculateStockBreakdown(productName);
    // ======================================

    const message = `
┌────────────────────────────
   CHI TIẾT TỒN KHO
└────────────────────────────┘

Sản phẩm: ${stockItem.productName}
Danh mục: ${stockItem.category}

┌────────────────────────────
BẢNG KÊ NHẬP/XUẤT & TỒN
└────────────────────────────┘
Tổng nhập (từ Phiếu nhập): ${breakdown.imported}
Tổng bán (từ Hóa đơn):     ${breakdown.sold}
Đã đưa lên kệ:             ${breakdown.onShelf}
────────────────────────────
TỒN KHO KHẢ DỤNG: ${stockItem.quantity}
(Tổng nhập - Tổng bán - Trên kệ)

${
  stockItem.quantity <= 10 ? "⚠️ CẢNH BÁO: Tồn kho thấp!" : "✅ Tồn kho ổn định"
}
    `;

    alert(message);
  };
  // ===================================================================

  // === QUẢN LÝ NGƯỜI DÙNG (GIỮ NGUYÊN) ===
  function renderUserManagement() {
    hideAllContent();
    if (!userContent) return;
    userContent.style.display = "block";

    const userStats = calculateUserStats();

    let html = `
      <div class="management-header">
        <h2><i class="fa-solid fa-users"></i> Quản lý Người dùng</h2>
        <button onclick="refreshUsers()" class="btn-refresh">
          <i class="fa-solid fa-rotate"></i> Làm mới
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

    userStats.forEach((user, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(user.username || "N/A")} 
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
            <button onclick="viewUserDetail(${index})" class="btn-view" style="margin-right: 5px;">
              <i class="fa-solid fa-eye"></i> Xem
            </button>
            <button onclick="resetUserPassword(${index})" class="btn-add" style="background-color: #f6ad55; margin-right: 5px;">
              <i class="fa-solid fa-key"></i> Reset Mật khẩu
            </button>
            <button onclick="editUser(${index})" class="btn-edit">
              <i class="fa-solid fa-pen"></i> Sửa
            </button>
            <button onclick="toggleUserLock(${index})" class="btn-lock" 
              style="background-color: #718096;">
                <i class="fa-solid fa-lock"></i> Khóa
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <div class="stats-container">
        <div class="stat-card">
          <i class="fa-solid fa-users stat-icon"></i>
          <div>
            <h3>${users.length}</h3>
            <p>Tổng người dùng</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-file-invoice stat-icon"></i>
          <div>
            <h3>${invoices.length}</h3>
            <p>Tổng hóa đơn</p>
          </div>
        </div>
      </div>
    `;

    userContent.innerHTML = html;
  }

  window.refreshUsers = function () {
    // Cập nhật lại 3 biến data chính
    users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    invoices = JSON.parse(localStorage.getItem(INVOICES_KEY)) || [];
    renderUserManagement();
  };

  window.viewUserDetail = function (index) {
    const userStats = calculateUserStats();
    const user = userStats[index]; // Lấy từ mảng đã thống kê

    if (!user) {
      alert("Không tìm thấy thông tin người dùng!");
      return;
    }

    const message = `
┌────────────────────────────
   CHI TIẾT NGƯỜI DÙNG
└────────────────────────────┘

Tên đăng nhập: ${user.username || "N/A"}
Mật khẩu: ${user.password || "N/A"}
Số điện thoại: ${user.phone || "Chưa cập nhật"}
Địa chỉ: ${user.address || "Chưa cập nhật"}

┌────────────────────────────
THỐNG KÊ
└────────────────────────────┘

Số đơn hàng: ${user.orderCount || 0}
Tổng doanh thu: ${formatPrice(user.totalRevenue || 0)}đ
    `;

    alert(message);
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

    // Cập nhật mật khẩu mặc định
    users[index].password = "123456";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    renderUserManagement();
    alert(
      `✅ Đã reset mật khẩu cho người dùng "${userToReset.username}". Mật khẩu mới là "123456"!`
    );
  };

  // Cập nhật: Thêm các trường SĐT/Địa chỉ vào cửa sổ Sửa
  window.editUser = function (index) {
    const user = users[index];
    if (!user) return;

    const newUsername = prompt("Nhập tên đăng nhập mới:", user.username);
    if (!newUsername) return;

    const newPassword = prompt("Nhập mật khẩu mới:", user.password);
    if (!newPassword) return;

    const newPhone = prompt("Nhập số điện thoại:", user.phone || "");
    const newAddress = prompt("Nhập địa chỉ giao hàng:", user.address || "");

    users[index] = {
      username: newUsername,
      password: newPassword,
      phone: newPhone || "",
      address: newAddress || "",
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    renderUserManagement();
    alert("Cập nhật thành công!");
  };

  window.toggleUserLock = function (index) {
    const user = users[index];
    if (!user) return;

    user.locked = !user.locked; // Đảo trạng thái khóa
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

  // === QUẢN LÝ SẢN PHẨM (GIỮ NGUYÊN) ===
  /**
   * Render giao diện Quản lý Sản phẩm.
   * @param {string} nameQuery Chuỗi tìm kiếm tên sản phẩm.
   * @param {string} categoryQuery Chuỗi tìm kiếm danh mục.
   * @param {string} priceRangeQuery Khoảng giá ('min-max').
   */
  function renderProductManagement(
    nameQuery = "",
    categoryQuery = "",
    priceRangeQuery = ""
  ) {
    hideAllContent();
    if (!productContent) return;
    productContent.style.display = "block";

    const uniqueCategories = getUniqueCategories();
    const priceRanges = getPriceRanges();

    // --- LOGIC LỌC DỮ LIỆU SẢN PHẨM ---
    const lowerCaseNameQuery = nameQuery.trim().toLowerCase();
    let minPrice = 0;
    let maxPrice = Infinity;

    if (priceRangeQuery) {
      const parts = priceRangeQuery.split("-");
      minPrice = parseInt(parts[0]) || 0;
      maxPrice = parts[1] ? parseInt(parts[1]) : Infinity;
    }

    // === CẬP NHẬT renderProductTable (Dùng khi lọc) ===
    function renderProductTable(filteredProducts) {
      const tbody = document.querySelector("#productContent table tbody");
      if (!tbody) return;

      let html = "";
      filteredProducts.forEach((product) => {
        const originalIndex = products.findIndex(
          (p) => p.name === product.name
        );
        const isHidden = product.isHidden || false; // THÊM MỚI

        // --- LOGIC TÍNH LỢI NHUẬN (CHO BỘ LỌC) ---
        let profit = 0;
        const sellingPrice = product.value;
        const importPriceStr = findLatestImportPrice(product.name);

        if (importPriceStr !== "") {
          const importPrice = parseInt(importPriceStr, 10);
          profit = sellingPrice - importPrice;
        } else {
          profit = sellingPrice * 0.05; // 5% giá bán
        }
        // ----------------------------------------

        html += `
        <tr ${
          isHidden ? 'style="opacity: 0.7; background-color: #fafafa;"' : ""
        }>
          <td>${originalIndex + 1}</td>
          <td>
            <div class="product-img-mini" style="background-image: url('${
              product.image || ""
            }')"></div>
          </td>
          <td>
            ${escapeHtml(product.name)}
            ${
              isHidden
                ? '<span style="color: #e53e3e; font-weight: 600; display: block; font-size: 12px;">(Đã ẩn)</span>'
                : ""
            }
          </td>
          <td>${formatPrice(product.value)}đ</td>
          
          <td style="font-weight: 600; color: ${
            profit < 0 ? "#e53e3e" : "#38a169"
          };">
            ${formatPrice(profit)}đ
          </td>
          
          <td>${product.quantity}</td>
          <td>${escapeHtml(product.category)}</td>
          <td>
            <button onclick="editProduct(${originalIndex})" class="btn-edit" style="margin-right: 5px;">
                <i class="fa-solid fa-pen"></i> Sửa
            </button>
            
            <button onclick="toggleProductVisibility(${originalIndex})" 
                    style="background-color: ${
                      isHidden ? "#48bb78" : "#e53e3e"
                    }; color: white; margin-right: 5px; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">
              <i class="fa-solid ${isHidden ? "fa-eye" : "fa-eye-slash"}"></i> 
              ${isHidden ? "Hiện" : "Ẩn"}
            </button>
            
            <button onclick="deleteProduct(${originalIndex})" class="btn-delete">
                <i class="fa-solid fa-trash"></i> Xóa
            </button>
          </td>
        </tr>`;
      });

      if (!html)
        html = `<tr><td colspan="8" class="empty-state">Không có sản phẩm phù hợp.</td></tr>`;

      tbody.innerHTML = html;
    }

    const filteredProducts = products.filter((p) => {
      const matchesName =
        lowerCaseNameQuery === "" ||
        p.name.trim().toLowerCase().includes(lowerCaseNameQuery);
      const matchesCategory =
        categoryQuery === "" || p.category === categoryQuery;
      const matchesPrice = p.value >= minPrice && p.value <= maxPrice;

      return matchesName && matchesCategory && matchesPrice;
    });

    // --- GIAO DIỆN BỘ LỌC ---
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

    // Hàm global để kích hoạt việc lọc sản phẩm
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

      const filteredProducts = products.filter((p) => {
        const matchesName =
          lowerCaseNameQuery === "" ||
          p.name.trim().toLowerCase().includes(lowerCaseNameQuery);
        const matchesCategory =
          categorySelect === "" || p.category === categorySelect;
        const matchesPrice = p.value >= minPrice && p.value <= maxPrice;
        return matchesName && matchesCategory && matchesPrice;
      });

      // Gọi hàm render đã được cập nhật
      renderProductTable(filteredProducts);
    };

    let html = `
      <div class="management-header">
        <h2><i class="fa-solid fa-box"></i> Quản lý Sản phẩm</h2>
        <div style="display: flex; align-items: center; gap: 10px;">
            <button onclick="addNewProduct()" class="btn-add">
                <i class="fa-solid fa-plus"></i> Thêm sản phẩm
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
              <th>Số lượng (Trên kệ)</th>
              <th>Danh mục</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
    `;

    // === CẬP NHẬT VÒNG LẶP RENDER BAN ĐẦU ===
    filteredProducts.forEach((product) => {
      // Tìm lại index gốc để dùng cho thao tác Sửa/Xóa chính xác
      const originalIndex = products.findIndex((p) => p.name === product.name);
      const isHidden = product.isHidden || false; // THÊM MỚI
      html += `
        <tr ${
          isHidden ? 'style="opacity: 0.7; background-color: #fafafa;"' : ""
        }>
          <td>${originalIndex + 1}</td>
          <td>
            <div class="product-img-mini" style="background-image: url('${
              product.image || ""
            }')"></div>
          </td>
          <td>
            ${escapeHtml(product.name)}
            ${
              isHidden
                ? '<span style="color: #e53e3e; font-weight: 600; display: block; font-size: 12px;">(Đã ẩn)</span>'
                : ""
            }
          </td>
          

          <td>${product.quantity}</td>
          <td>${escapeHtml(product.category)}</td>
          <td>
            <button onclick="editProduct(${originalIndex})" class="btn-edit" style="margin-right: 5px;">
              <i class="fa-solid fa-pen"></i> Sửa
            </button>
            
            <button onclick="toggleProductVisibility(${originalIndex})" 
                    style="background-color: ${
                      isHidden ? "#48bb78" : "#e53e3e"
                    }; color: white; margin-right: 5px; padding: 5px 10px; border: none; border-radius: 4px; cursor: pointer;">
              <i class="fa-solid ${isHidden ? "fa-eye" : "fa-eye-slash"}"></i> 
              ${isHidden ? "Hiện" : "Ẩn"}
            </button>

            <button onclick="deleteProduct(${originalIndex})" class="btn-delete">
              <i class="fa-solid fa-trash"></i> Xóa
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <div class="stats-container">
        <div class="stat-card">
          <i class="fa-solid fa-box stat-icon"></i>
          <div>
            <h3>${products.length}</h3>
            <p>Tổng sản phẩm</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-warehouse stat-icon"></i>
          <div>
            <h3>${products.reduce((sum, p) => sum + p.quantity, 0)}</h3>
            <p>Tổng số lượng trên kệ</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-dollar-sign stat-icon"></i>
          <div>
            <h3>${formatPrice(
              products.reduce((sum, p) => sum + p.value * p.quantity, 0)
            )}đ</h3>
            <p>Tổng giá trị trên kệ</p>
          </div>
        </div>
      </div>
    `;

    productContent.innerHTML = html;
  }

  window.refreshProducts = function () {
    products = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
    renderProductManagement();
  };

  // === CẬP NHẬT window.addNewProduct (ĐỂ DỌN DẸP VÀ MỞ KHÓA CÁC TRƯỜNG) ===
  window.addNewProduct = function () {
    const popup = document.getElementById("product-form-popup");
    const stockProducts = getAvailableStockProducts();
    const productSelectHtml = stockProducts
      .map(
        (p) =>
          `<option value="${escapeHtml(p.productName)}">${escapeHtml(
            p.productName
          )} (Kho: ${p.quantity})</option>`
      )
      .join("");

    let nameElement = document.getElementById("name");

    if (nameElement) {
      if (nameElement.tagName !== "SELECT") {
        const selectElement = document.createElement("select");
        selectElement.id = "name";
        selectElement.required = true;
        selectElement.style.cssText =
          "width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;";
        nameElement.replaceWith(selectElement);
        nameElement = selectElement;
      }
    }

    if (nameElement && nameElement.tagName === "SELECT") {
      nameElement.innerHTML =
        `<option value="">-- Chọn sản phẩm trong kho --</option>` +
        productSelectHtml;
      nameElement.disabled = false;

      const valueInput = document.getElementById("value");
      function updateValueFromSelect() {
        const selected = nameElement.value;
        const price = selected ? findLatestImportPrice(selected) : "";
        if (valueInput) valueInput.value = price !== "" ? price : "";
      }
      nameElement.removeEventListener("change", updateValueFromSelect);
      nameElement.addEventListener("change", updateValueFromSelect);
      updateValueFromSelect();
    }

    if (popup) {
      // === MỞ KHÓA CÁC TRƯỜNG KHI THÊM MỚI ===
      document.getElementById("description").disabled = false;
      document.getElementById("specs").disabled = false;
      // ========================================

      // === DỌN DẸP FORM ===
      document.getElementById("description").value = "";
      document.getElementById("specs").value = "";
      // ====================

      document.getElementById("category-wrapper")?.remove();
      const categoryInput = document.getElementById("category");
      if (categoryInput && categoryInput.type !== "hidden")
        categoryInput.remove();

      const imageInput = document.getElementById("image");
      if (imageInput) imageInput.value = "";

      window.editingProductIndex = -1;
      popup.querySelector("h2").textContent = "Thêm sản phẩm lên kệ (Từ kho)";
      popup.style.display = "flex";
    }
  };

  // === CẬP NHẬT window.editProduct (KHÓA GIÁ/SỐ LƯỢNG, THÊM MÔ TẢ/THÔNG SỐ) ===
  window.editProduct = function (index) {
    const product = products[index];
    if (!product) return;

    const popup = document.getElementById("product-form-popup");
    const stockProducts = getAvailableStockProducts();

    const productSelectHtml = stockProducts
      .map(
        (p) =>
          `<option value="${escapeHtml(p.productName)}">${escapeHtml(
            p.productName
          )} (Kho: ${p.quantity})</option>`
      )
      .join("");

    // TÌM VÀ THAY THẾ TRƯỜNG NAME CŨ (input text) bằng SELECT
    let nameElement = document.getElementById("name");

    if (nameElement) {
      if (nameElement.tagName !== "SELECT") {
        const selectElement = document.createElement("select");
        selectElement.id = "name";
        selectElement.required = true;
        selectElement.style.cssText =
          "width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;";

        nameElement.replaceWith(selectElement);
        nameElement = selectElement;
      }
    } else {
      return;
    }

    if (nameElement && nameElement.tagName === "SELECT") {
      const isEditing = stockProducts.some(
        (p) => p.productName === product.name
      );

      let currentOptions = productSelectHtml;
      if (!isEditing) {
        currentOptions =
          `<option value="${escapeHtml(product.name)}" selected>${escapeHtml(
            product.name
          )} (Trên kệ)</option>` + currentOptions;
      }

      nameElement.innerHTML = currentOptions;
      nameElement.value = product.name;
      nameElement.disabled = true; // KHÓA TÊN SẢN PHẨM KHI CHỈNH SỬA
    }

    if (popup) {
      const valueInput = document.getElementById("value");
      const quantityInput = document.getElementById("quantity");

      // ĐIỀN DỮ LIỆU CŨ VÀO FORM
      document.getElementById("name").value = product.name;
      valueInput.value = product.value;
      quantityInput.value = product.quantity;

      // ĐIỀN DỮ LIỆU MỚI (MÔ TẢ/THÔNG SỐ)
      document.getElementById("description").value = product.description || "";
      document.getElementById("specs").value = product.specs || "";
      document.getElementById("description").disabled = false; // Đảm bảo mở
      document.getElementById("specs").disabled = false; // Đảm bảo mở

      // === YÊU CẦU: KHÓA SỐ LƯỢNG VÀ GIÁ KHI SỬA ===
      valueInput.disabled = true;
      quantityInput.disabled = true;
      // ===============================================

      const imageInput = document.getElementById("image");
      if (imageInput) imageInput.value = "";

      window.editingProductIndex = index;
      popup.style.display = "flex";
      popup.querySelector("h2").textContent = "Sửa sản phẩm trên kệ";
    }
  };

  // === CẬP NHẬT window.deleteProduct (THEO YÊU CẦU MỚI) ===
  window.deleteProduct = function (index) {
    const product = products[index];
    if (!product) return;

    // Kiểm tra xem sản phẩm đã được mua chưa
    const isPurchased = hasProductBeenPurchased(product.name);

    if (isPurchased) {
      // Đã mua: Chỉ cho phép ẨN
      if (
        confirm(
          `Sản phẩm "${product.name}" ĐÃ được đặt hàng.\nBạn không thể XÓA, chỉ có thể ẨN sản phẩm này.\n\nBạn có muốn ẨN sản phẩm này không?`
        )
      ) {
        products[index].isHidden = true; // Set to hidden
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        renderProductManagement();
        alert(`Đã ẩn sản phẩm "${product.name}".`);
      }
    } else {
      // Chưa mua: Cho phép XÓA VĨNH VIỄN
      if (
        confirm(
          `Sản phẩm "${product.name}" CHƯA được bán.\nBạn có chắc muốn XÓA VĨNH VIỄN sản phẩm này?`
        )
      ) {
        products.splice(index, 1);
        localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        renderProductManagement();
        renderStockManagement(); // Cập nhật lại kho
        alert("Đã xóa vĩnh viễn sản phẩm!");
      }
    }
  };

  // === HÀM MỚI: ẨN/HIỆN SẢN PHẨM ===
  window.toggleProductVisibility = function (index) {
    const product = products[index];
    if (!product) {
      alert("Lỗi: Không tìm thấy sản phẩm!");
      return;
    }

    // Đảo ngược trạng thái
    product.isHidden = !product.isHidden;

    // Lưu lại
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

    // Render lại
    renderProductManagement();

    alert(
      product.isHidden
        ? `✅ Đã ẩn sản phẩm "${product.name}".`
        : `✅ Đã hiển thị lại sản phẩm "${product.name}".`
    );
  };

  // === HÀM LƯU VÀ RENDER (DÙNG CHUNG) ===
  function saveAndRenderProducts(popup, stockContent) {
    const PRODUCTS_KEY = "products";

    // BƯỚC 1: LƯU VÀO LOCAL STORAGE
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

    // BƯỚC 2: CẬP NHẬT BIẾN TOÀN CỤC SAU KHI LƯU
    products = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];

    // BƯỚC 3: CẬP NHẬT GIAO DIỆN
    if (popup) popup.style.display = "none";
    renderProductManagement();

    if (stockContent && stockContent.style.display !== "none") {
      renderStockManagement();
    }
  }

  // === HÀM THÊM SẢN PHẨM MỚI (CẬP NHẬT VỚI MÔ TẢ/THÔNG SỐ) ===
  window.addProduct = async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim(); // Lấy từ SELECT
    const value = parseInt(document.getElementById("value").value);
    const quantity = parseInt(document.getElementById("quantity").value);
    const category = findProductCategory(name);

    // LẤY TRƯỜNG MỚI
    const description = document.getElementById("description").value.trim();
    const specs = document.getElementById("specs").value.trim();

    const imageFile = document.getElementById("image").files[0];
    const popup = document.getElementById("product-form-popup");
    const stockContent = document.getElementById("stockContent");

    // --- VALIDATE CƠ BẢN ---
    if (
      !name ||
      isNaN(value) ||
      isNaN(quantity) ||
      value <= 0 ||
      quantity <= 0
    ) {
      alert(
        "⚠️ Vui lòng điền đầy đủ thông tin và đảm bảo Giá/Số lượng hợp lệ (> 0)!"
      );
      if (typeof event.stopImmediatePropagation === "function")
        event.stopImmediatePropagation();
      return;
    }

    // --- KIỂM TRA TRÙNG TÊN ---
    const existingProduct = products.find(
      (p) => p.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (existingProduct) {
      alert(
        `❌ Lỗi: Trên kệ đã có sản phẩm "${existingProduct.name}".\n\nVui lòng:\n- Dùng chức năng "Sửa" để cập nhật\n- Hoặc chọn tên khác`
      );
      if (typeof event.stopImmediatePropagation === "function")
        event.stopImmediatePropagation();
      return;
    }

    // --- KIỂM TRA TỒN KHO ---
    const currentStock = calculateStock();
    const stockItem = currentStock.find(
      (item) => item.productName.trim().toLowerCase() === name.toLowerCase()
    );

    if (!stockItem) {
      alert(
        `❌ Lỗi Kho: Sản phẩm "${name}" chưa có trong kho. Vui lòng tạo phiếu nhập trước khi đưa lên kệ.`
      );
      if (typeof event.stopImmediatePropagation === "function")
        event.stopImmediatePropagation();
      return;
    }

    const availableStock = parseInt(stockItem.quantity || 0, 10);

    if (availableStock <= 0) {
      alert(
        `❌ Lỗi Tồn Kho: Sản phẩm "${name}" hiện đang hết kho (0). Vui lòng nhập thêm.`
      );
      if (typeof event.stopImmediatePropagation === "function")
        event.stopImmediatePropagation();
      return;
    }

    if (quantity > availableStock) {
      alert(
        `❌ Lỗi Tồn Kho: Yêu cầu (${quantity}) vượt quá tồn kho khả dụng (${availableStock}).`
      );
      if (typeof event.stopImmediatePropagation === "function")
        event.stopImmediatePropagation();
      return;
    }

    // --- TẠO SẢN PHẨM MỚI ---
    let imageBase64 = placeholderImg;
    if (imageFile) {
      try {
        imageBase64 = await getBase64(imageFile);
      } catch (err) {
        console.error("Lỗi chuyển ảnh sang base64:", err);
        imageBase64 = placeholderImg;
      }
    }

    const newProduct = {
      name,
      value,
      quantity,
      category,
      image: imageBase64,
      isHidden: false,
      description: description || "", // Lưu trường mới
      specs: specs || "", // Lưu trường mới
    };
    products.push(newProduct);

    // Lưu và render
    try {
      saveAndRenderProducts(popup, stockContent);
      alert("✅ Thêm sản phẩm thành công!");
    } catch (err) {
      console.error("Lỗi khi lưu sản phẩm:", err);
      alert("❌ Lỗi khi lưu sản phẩm. Kiểm tra console.");
    }
  };
  // === HÀM SỬA SẢN PHẨM (CẬP NHẬT LOGIC: CHỈ LƯU MÔ TẢ/THÔNG SỐ/ẢNH) ===
  window.editProductSubmit = async function (event) {
    event.preventDefault();
    if (typeof event.stopImmediatePropagation === "function")
      event.stopImmediatePropagation();

    // LẤY TRƯỜNG MỚI ĐỂ LƯU
    const description = document.getElementById("description").value.trim();
    const specs = document.getElementById("specs").value.trim();
    const imageFile = document.getElementById("image").files[0];

    const popup = document.getElementById("product-form-popup");
    const stockContent = document.getElementById("stockContent");

    // LẤY SẢN PHẨM ĐANG SỬA
    const product = products[window.editingProductIndex];
    if (!product) {
      alert("❌ Không tìm thấy sản phẩm!");
      return;
    }

    // --- CHUYỂN ẢNH SANG BASE64 (nếu có file mới) ---
    let newImageBase64 = product.image; // Giữ lại ảnh cũ nếu không chọn file mới
    if (imageFile) {
      try {
        newImageBase64 = await getBase64(imageFile);
      } catch (error) {
        console.error("Lỗi khi chuyển đổi ảnh sang Base64:", error);
        alert("⚠️ Lỗi xử lý hình ảnh. Vui lòng thử lại.");
        return;
      }
    }

    // --- CẬP NHẬT SẢN PHẨM ---
    // Giữ nguyên các trường bị khóa
    product.name = product.name;
    product.value = product.value;
    product.quantity = product.quantity;
    product.category = product.category;

    // Cập nhật các trường được phép sửa
    product.image = newImageBase64; // Cập nhật ảnh
    product.description = description; // Cập nhật mô tả
    product.specs = specs; // Cập nhật thông số

    // --- LƯU VÀ CẬP NHẬT GIAO DIỆN ---
    window.editingProductIndex = -1;
    saveAndRenderProducts(popup, stockContent);
    alert("✅ Cập nhật sản phẩm thành công!");
  };

  // === PHIẾU NHẬP HÀNG (GIỮ NGUYÊN) ===
  function renderAddInfo() {
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
          <tbody>
    `;

    importReceipts.forEach((receipt) => {
      html += `
        <tr>
          <td>#PN${receipt.id}</td>
          <td>${receipt.date}</td>
          <td>${escapeHtml(receipt.importedBy)}</td>
          <td>
              ${receipt.status === "Hoàn thành"
          ? '<span style="color: green; font-weight: 600;">Hoàn thành</span>'
          : '<span style="color: orange; font-weight: 600;">Chưa hoàn thành</span>'
        }
          </td>
          <td>
            <button onclick="viewImportReceipt('${receipt.id}')" class="btn-view">
              <i class="fa-solid fa-eye"></i> Chi tiết phiếu
            </button>
            ${
        // Nút Sửa và Hoàn thành ngoài danh sách chỉ hiển thị nếu trạng thái là "Chưa hoàn thành"
        receipt.status === "Chưa hoàn thành"
          ? `
            <button onclick="editImportReceipt('${receipt.id}')" class="btn-edit">
              <i class="fa-solid fa-pen"></i> Sửa
            </button>
            <button onclick="finalizeReceiptStatus('${receipt.id}')" class="btn-done">
              <i class="fa-solid fa-check"></i> Hoàn thành
            </button>
            `
          : ""
        }
            <button onclick="deleteImportReceipt('${receipt.id}')" class="btn-delete">
              <i class="fa-solid fa-trash"></i> Xóa
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      
      <div class="stats-container">
        <div class="stat-card">
          <i class="fa-solid fa-clipboard-list stat-icon"></i>
          <div>
            <h3>${importReceipts.length}</h3>
            <p>Tổng phiếu nhập</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-boxes-stacked stat-icon"></i>
          <div>
            <h3>${importReceipts.reduce((sum, receipt) => {
      const totalItemsQuantity = receipt.items.reduce(
        (itemSum, item) => itemSum + item.quantity,
        0
      );
      return sum + totalItemsQuantity;
    }, 0)}</h3>
            <p>Tổng số lượng nhập</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-money-bill-trend-up stat-icon"></i>
          <div>
            <h3>${formatPrice(
      importReceipts.reduce((sum, receipt) => {
        const totalItemsPrice = receipt.items.reduce(
          (itemSum, item) => itemSum + item.quantity * item.price,
          0
        );
        return sum + totalItemsPrice;
      }, 0)
    )}đ</h3>
            <p>Tổng giá trị nhập</p>
          </div>
        </div>
      </div>
    `;

    addInfoContent.innerHTML = html;
  }

  // --- HÀM 2: TẠO VÀ HIỂN THỊ PHIẾU NHẬP MỚI ---
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

    currentReceiptId = newReceipt.id;

    showImportProductForm(currentReceiptId);
  };

  // --- HÀM 3: XỬ LÝ KHI CHỌN SẢN PHẨM TRONG SELECT ---
  window.fillProductDetails = function (selectElement) {
    const selectedProductName = selectElement.value;
    const priceInput = document.getElementById("importPrice");

    if (selectedProductName) {
      const product = products.find(p => p.name === selectedProductName);
      if (product) {
        priceInput.value = product.value;
      }
    } else {
      priceInput.value = '';
    }
  };

  // --- HÀM 4: HIỂN THỊ MODAL CHÍNH ---
  window.showImportProductForm = function (receiptId) {
    const currentReceipt = importReceipts.find((r) => r.id === receiptId);
    if (!currentReceipt) return alert("Lỗi: Không tìm thấy phiếu nhập!");

    // Không cho phép sửa nếu đã Hoàn thành
    if (currentReceipt.status === "Hoàn thành") {
      alert("Không thể sửa phiếu nhập đã Hoàn thành.");
      return;
    }

    const existingModal = document.getElementById("importProductModal");
    if (existingModal) existingModal.remove();

    // 1. TẠO HTML CHO SELECT TÊN SẢN PHẨM
    let productOptions = '<option value="">-- Chọn sản phẩm --</option>';
    if (typeof products !== 'undefined' && products.length > 0) {
      products.forEach(product => {
        productOptions += `<option value="${escapeHtml(product.name)}">${escapeHtml(product.name)}</option>`;
      });
    }

    // --- TẠO HTML CHO FORM NHẬP CHI TIẾT ---
    const importFormHtml = `
        <div class="import-product-form-container" style="padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-bottom: 20px; background-color: #f9f9f9;">
            <h3 style="color: #667eea; margin-top: 0; border-bottom: 2px solid #667eea; padding-bottom: 10px;">
                <i class="fa-solid fa-square-plus"></i> Thêm mặt hàng vào Phiếu
            </h3>
            <form id="importReceiptForm" onsubmit="submitImportItem(event,'${receiptId}')">
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px;">
                    <div>
                        <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tên sản phẩm:</label>
                        <select id="importProductName" required 
                            onchange="fillProductDetails(this)"
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
                            placeholder="Tự động điền / Nhập đơn giá...">
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

    // 2. TẠO HTML CHO BẢNG DANH SÁCH MẶT HÀNG
    let itemsHtml = "";
    let totalItems = 0;
    let totalValue = 0;
    const hasItems = currentReceipt.items.length > 0;
    const buttonDisabled = hasItems ? '' : 'disabled style="opacity: 0.5; cursor: not-allowed;"';

    currentReceipt.items.forEach((item, index) => {
      const itemPrice = item.quantity * item.price;
      totalItems += item.quantity;
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
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                 <h2 style="margin: 0;">Quản lý Phiếu nhập hàng </h2>
                 <button onclick="closeModal(null, '${receiptId}')" class="btn-refresh" style="background-color: transparent; color: #333; border: none; font-size: 24px;">&times;</button>
            </div>

            ${importFormHtml}
            
            <h3 style="margin-top: 30px; margin-bottom: 10px;"><i class="fa-solid fa-list-check"></i> Danh sách mặt hàng đã nhập (${currentReceipt.items.length} loại)</h3>
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
                  ${itemsHtml}
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
                    <button onclick="finishReceiptEditing('${receiptId}')" class="btn-done" ${buttonDisabled}>
                       <i class="fa-solid fa-save"></i> Xác nhận phiếu
                    </button>
             </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);
  };

  // --- HÀM 5: ĐÓNG MODAL (CÓ LOGIC XÓA PHIẾU RỖNG) ---
  window.closeModal = function (event, receiptId) {
    const modal = document.getElementById("importProductModal");

    const isClosingEvent = !event || event.target.id === "importProductModal" || !event.target.closest('.modal-box');

    if (isClosingEvent) {
      if (receiptId) {
        const index = importReceipts.findIndex(r => r.id === receiptId);
        if (index !== -1) {
          const currentReceipt = importReceipts[index];

          // CHỈ XÓA nếu phiếu ở trạng thái "Chưa hoàn thành" VÀ không có mặt hàng
          if (currentReceipt.status === "Chưa hoàn thành" && currentReceipt.items.length === 0) {
            importReceipts.splice(index, 1);
            localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));
            renderAddInfo();
          }
        }
      }
      if (modal) modal.remove();
    }
  };

  // --- HÀM 6: THÊM MẶT HÀNG VÀO PHIẾU ---
  window.submitImportItem = function (event, receiptId) {
    event.preventDefault();

    const productName = document.getElementById("importProductName").value.trim();
    const quantity = parseInt(document.getElementById("importQuantity").value);
    const price = parseInt(document.getElementById("importPrice").value);

    const selectedProduct = products.find(p => p.name === productName);
    const category = selectedProduct ? selectedProduct.category : "Chưa phân loại";

    if (!productName || productName === "" || quantity <= 0 || price <= 0) {
      alert("Vui lòng chọn sản phẩm và điền đầy đủ thông tin hợp lệ (SL, Đơn giá > 0)!");
      return;
    }

    const currentReceipt = importReceipts.find((r) => r.id === receiptId);
    if (!currentReceipt) {
      alert("Lỗi: Không tìm thấy phiếu nhập để thêm mặt hàng!");
      return;
    }

    const newItem = {
      productName: productName,
      quantity: quantity,
      price: price,
      category: category,
    };
    currentReceipt.items.push(newItem);

    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));

    showImportProductForm(receiptId);

    setTimeout(() => {
      document.getElementById("importProductName").value = '';
      document.getElementById("importQuantity").value = '';
      document.getElementById("importPrice").value = '';
    }, 50);

    alert("✅ Đã thêm mặt hàng thành công!");
  };

  // --- HÀM 7: XÓA MẶT HÀNG KHỎI PHIẾU NHẬP ---
  window.deleteItemInReceipt = function (receiptId, itemIndex) {
    const confirmDelete = confirm("Bạn có chắc chắn muốn xóa mặt hàng này khỏi phiếu nhập không?");
    if (confirmDelete) {
      const currentReceipt = importReceipts.find((r) => r.id === receiptId);

      if (!currentReceipt) {
        alert("Lỗi: Không tìm thấy phiếu nhập!");
        return;
      }

      if (currentReceipt.status === "Hoàn thành") {
        alert("Không thể xóa mặt hàng khỏi phiếu đã Hoàn thành.");
        return;
      }

      currentReceipt.items.splice(itemIndex, 1);

      localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));

      showImportProductForm(receiptId);

      alert("✅ Đã xóa mặt hàng thành công.");
    }
  };

  // --- HÀM 8: HOÀN TẤT PHIẾU TRONG MODAL (CHỈ LƯU VÀ ĐÓNG) ---
  window.finishReceiptEditing = function (receiptId) {
    const currentReceipt = importReceipts.find((r) => r.id === receiptId);

    if (!currentReceipt) {
      alert("Lỗi: Không tìm thấy phiếu nhập!");
      return;
    }

    if (currentReceipt.items.length === 0) {
      alert("❌ Phiếu nhập phải có ít nhất một sản phẩm mới được lưu!");
      return;
    }

    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));

    closeModal();
    renderAddInfo();

    alert(`✅ Đã lưu tất cả mặt hàng cho phiếu nhập #${receiptId}. Phiếu hiện đang ở trạng thái CHƯA HOÀN THÀNH.`);
  };

  // --- HÀM 9: HOÀN THÀNH PHIẾU (CHUYỂN TRẠNG THÁI NGOÀI DANH SÁCH) ---
  window.finalizeReceiptStatus = function (receiptId) {
    const currentReceipt = importReceipts.find((r) => r.id === receiptId);

    if (!currentReceipt) {
      alert("Lỗi: Không tìm thấy phiếu nhập!");
      return;
    }

    if (currentReceipt.status === "Hoàn thành") {
      alert("Phiếu đã ở trạng thái Hoàn thành.");
      return;
    }

    if (currentReceipt.items.length === 0) {
      alert("❌ Phiếu nhập rỗng không thể hoàn thành!");
      return;
    }

    currentReceipt.status = "Hoàn thành";
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));

    renderAddInfo();

    alert(`✅ Phiếu nhập hàng #${receiptId} đã được chính thức Hoàn thành.`);
  };

  // --- HÀM 10: CHỈNH SỬA PHIẾU (CHỈ DÀNH CHO PHIẾU CHƯA HOÀN THÀNH) ---
  window.editImportReceipt = function (receiptId) {
    const currentReceipt = importReceipts.find((r) => r.id === receiptId);

    if (!currentReceipt || currentReceipt.status !== "Chưa hoàn thành") {
      alert("Lỗi: Phiếu này đã Hoàn thành và không thể chỉnh sửa.");
      return;
    }
    showImportProductForm(receiptId);
  };


  // --- HÀM 11: HIỂN THỊ CHI TIẾT PHIẾU (VIEW ONLY) ---
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
              <p><strong>Trạng thái:</strong> <span style="font-weight: 600; color: ${receipt.status === "Hoàn thành" ? "green" : "orange"
      };">${receipt.status}</span></p>
          </div>

          <table class="admin-table">
            <thead>
              <tr>
                <th>Tên sản phẩm</th>
                <th>Số lượng</th>
                <th>Giá nhập</th>
                <th>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
                ${itemsHtml}
            </tbody>
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

  // 3. Tạo hàm đóng Modal
  window.closeViewReceiptModal = function (event) {
    if (
      !event ||
      event.target.id === "viewImportReceiptModal" ||
      !event.target
    ) {
      const modal = document.getElementById("viewImportReceiptModal");
      if (modal) modal.remove();
    }
  };

  // 4. Cập nhật nút trong renderAddInfo để gọi hàm mới này
  // Thay thế hàm viewImportReceipt cũ bằng hàm sau:
  window.viewImportReceipt = function (id) {
    showViewImportReceiptModal(id);
  };

  window.editImportReceipt = function (id) {
    const receipt = importReceipts.find((r) => r.id === id);

    if (!receipt) {
      alert("Không tìm thấy phiếu nhập!");
      return;
    }

    // 1. Cập nhật ID phiếu đang được thao tác (nếu bạn dùng biến currentReceiptId)
    window.currentReceiptId = id;

    // 2. Mở Modal hiển thị danh sách mặt hàng để sửa
    showImportProductForm(id);
  };

  window.editItemInReceipt = function (receiptId, itemIndex) {
    const receipt = importReceipts.find((r) => r.id === receiptId);
    if (!receipt || !receipt.items[itemIndex]) {
      alert("Lỗi: Không tìm thấy mặt hàng để sửa!");
      return;
    }

    const itemToEdit = receipt.items[itemIndex];

    // Sử dụng PROMPT để đơn giản hóa việc chỉnh sửa (có thể thay bằng Modal nhỏ)
    const newProductName = prompt("Sửa Tên sản phẩm:", itemToEdit.productName);
    if (newProductName === null) return;

    const newQuantity = parseInt(prompt("Sửa Số lượng:", itemToEdit.quantity));
    if (isNaN(newQuantity) || newQuantity <= 0)
      return alert("Số lượng không hợp lệ!");

    const newPrice = parseFloat(prompt("Sửa Đơn giá:", itemToEdit.price));
    if (isNaN(newPrice) || newPrice <= 0) return alert("Đơn giá không hợp lệ!");

    const newCategory = prompt("Sửa Danh mục:", itemToEdit.category);
    if (newCategory === null) return;

    // Cập nhật thông tin
    itemToEdit.productName = newProductName.trim();
    itemToEdit.quantity = newQuantity;
    itemToEdit.price = newPrice;
    itemToEdit.category = newCategory.trim();

    // 1. Lưu lại vào localStorage
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));

    // 2. Tái tạo lại nội dung bảng trong Modal đang mở (giống như trong submitImportItem)
    const tableBody = document.getElementById("importItemsTableBody");
    if (tableBody) {
      // Gọi lại showImportProductForm để làm mới toàn bộ nội dung trong modal
      // Cách nhanh hơn: đóng modal cũ và mở lại modal mới (hoặc viết lại logic render riêng)
      // Cách hiệu quả: Cập nhật thủ công (đã làm trong submitImportItem)

      // Vì đây là sửa, ta sẽ đóng và mở lại modal để cập nhật toàn bộ nội dung
      closeModal(); // Đóng modal cũ (importProductModal)
      showImportProductForm(receiptId); // Mở lại modal mới
    }

    alert("✅ Đã cập nhật mặt hàng thành công!");
  };

  window.deleteItemInReceipt = function (receiptId, itemIndex) {
    if (!confirm("Bạn có chắc chắn muốn xóa mặt hàng này khỏi phiếu nhập?"))
      return;

    const receipt = importReceipts.find((r) => r.id === receiptId);
    if (!receipt || !receipt.items[itemIndex]) {
      alert("Lỗi: Không tìm thấy mặt hàng để xóa!");
      return;
    }

    // Xóa mặt hàng khỏi mảng items bằng index
    receipt.items.splice(itemIndex, 1);

    // Lưu lại vào localStorage
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));

    // Cập nhật giao diện Modal
    closeModal();
    showImportProductForm(receiptId);

    alert("Đã xóa mặt hàng thành công!");
  };

  window.markImportReceiptDone = function (id) {
    const receipt = importReceipts.find((r) => r.id === id);
    if (!receipt) return alert("Không tìm thấy phiếu nhập!");

    if (
      confirm(
        "Xác nhận hoàn thành phiếu nhập này? Sau khi hoàn thành sẽ không thể chỉnh sửa."
      )
    ) {
      receipt.status = "Hoàn thành"; // ✅ đổi lại đây
      localStorage.setItem("importReceipts", JSON.stringify(importReceipts));
      renderAddInfo();
      alert("✅ Phiếu nhập đã được đánh dấu hoàn thành!");
    }
  };

  window.deleteImportReceipt = function (id) {
    if (
      !confirm(
        "Bạn có chắc muốn xóa phiếu nhập này? Việc này sẽ giảm số lượng tồn kho khả dụng."
      )
    )
      return;

    importReceipts = importReceipts.filter((r) => r.id !== id);
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));
    renderAddInfo();

    // Cập nhật lại kho sau khi xóa
    if (stockContent && stockContent.style.display !== "none") {
      renderStockManagement();
    }
    alert("Đã xóa phiếu nhập!");
  };

  window.refreshImportReceipts = function () {
    importReceipts =
      JSON.parse(localStorage.getItem(IMPORT_RECEIPTS_KEY)) || [];
    renderAddInfo();
  };

  // === QUẢN LÝ HÓA ĐƠN (GIỮ NGUYÊN) ===
  function renderInvoiceManagement() {
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
          <tbody>
    `;

    // Sắp xếp hóa đơn, cái mới nhất lên đầu
    invoices.sort((a, b) => b.id - a.id);

    invoices.forEach((invoice) => {
      const itemsStr = invoice.items.map((it) => it.name).join(", ");
      const status = invoice.status || "Mới đặt"; // Mặc định cho hóa đơn cũ
      const statusClass = getStatusClass(status);

      // <-- THÊM MỚI: Kiểm tra xem đây có phải trạng thái cuối cùng không
      const isFinalStatus = status === "Đã giao" || status === "Đã hủy";

      const allStatuses = [
        "Mới đặt",
        "Đang xử lý",
        "Đang vận chuyển",
        "Đã giao",
        "Đã hủy",
      ];
      const statusOptions = allStatuses
        .map(
          (s) =>
            `<option value="${s}" ${
              s === status ? "selected" : ""
            }>${s}</option>`
        )
        .join("");

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
            <select 
              class="invoice-status-select ${statusClass}" 
              onchange="window.updateInvoiceStatus(${
                invoice.id
              }, this.value, this)"
            >
              ${statusOptions}
            </select>
          </td>

          <td>
            <button onclick="viewInvoice(${invoice.id})" class="btn-view">
              <i class="fa-solid fa-eye"></i> Xem
            </button>
            <button onclick="deleteInvoice(${invoice.id})" class="btn-delete">
              <i class="fa-solid fa-trash"></i> Xóa
            </button>
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
      <div class="stats-container">
        <div class="stat-card">
          <i class="fa-solid fa-file-invoice stat-icon"></i>
          <div>
            <h3>${invoices.length}</h3>
            <p>Tổng hóa đơn</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-money-bill stat-icon"></i>
          <div>
            <h4>${formatPrice(
              invoices.reduce((sum, inv) => sum + inv.total, 0)
            )}đ</h4>
            <p>Tổng doanh thu</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-box-open stat-icon"></i>
          <div>
            <h3>${
              invoices.filter(
                (inv) =>
                  (inv.status || "Mới đặt") === "Mới đặt" ||
                  (inv.status || "Mới đặt") === "Đang xử lý"
              ).length
            }</h3>
            <p>Đơn hàng mới</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-ban stat-icon"></i>
          <div>
            <h3>${invoices.filter((inv) => inv.status === "Đã hủy").length}</h3>
            <p>Đơn hàng đã hủy</p>
          </div>
        </div>
      </div>
    `;

    invoiceContent.innerHTML = html;
  }

  // === HÀM CẬP NHẬT TRẠNG THÁI HÓA ĐƠN (MỚI) ===
  window.updateInvoiceStatus = function (id, newStatus, selectElement) {
    const invoice = invoices.find((inv) => inv.id === id);

    if (!invoice) {
      alert("Lỗi: Không tìm thấy hóa đơn!");
      return;
    }

    const oldStatus = invoice.status || "Mới đặt";

    // <-- THÊM MỚI: Ràng buộc không cho phép thay đổi trạng thái cuối cùng
    if (oldStatus === "Đã giao" || oldStatus === "Đã hủy") {
      alert(
        "Đơn hàng đã ở trạng thái cuối cùng (Đã giao/Đã hủy) và không thể thay đổi."
      );
      // Đảm bảo dropdown trả về giá trị cũ
      if (selectElement) {
        selectElement.value = oldStatus;
      }
      return; // Dừng hàm ngay lập tức
    }
    // KẾT THÚC THÊM MỚI

    // Logic hoàn kho (CHỈ KHI ADMIN CHUYỂN TỪ TRẠNG THÁI KHÁC -> ĐÃ HỦY)
    // Và logic trừ kho (CHỈ KHI ADMIN CHUYỂN TỪ ĐÃ HỦY -> TRẠNG THÁI KHÁC)

    // 1. Nếu chuyển sang "Đã hủy" (từ trạng thái không phải "Đã hủy")
    if (newStatus === "Đã hủy" && oldStatus !== "Đã hủy") {
      if (
        confirm(
          "Việc hủy đơn hàng này sẽ hoàn trả sản phẩm về kho. Bạn có chắc chắn?"
        )
      ) {
        try {
          invoice.items.forEach((item) => {
            const product = products.find((p) => p.name === item.name);
            if (product) {
              product.quantity += item.quantity;
            }
            // (Như lưu ý cũ: logic này đang hoàn trả về "sản phẩm trên kệ")
          });
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        } catch (e) {
          alert("Có lỗi xảy ra khi hoàn kho. Trạng thái chưa được thay đổi.");
          selectElement.value = oldStatus; // Trả lại giá trị cũ
          return;
        }
      } else {
        selectElement.value = oldStatus; // Người dùng hủy, trả lại giá trị cũ
        return;
      }
    }

    // 2. Nếu chuyển từ "Đã hủy" sang trạng thái khác
    if (oldStatus === "Đã hủy" && newStatus !== "Đã hủy") {
      if (
        confirm(
          "Khôi phục đơn hàng này sẽ trừ lại số lượng sản phẩm từ kho (kệ). Bạn có chắc chắn?"
        )
      ) {
        try {
          // Kiểm tra kho trước khi trừ
          for (const item of invoice.items) {
            const product = products.find((p) => p.name === item.name);
            if (!product || product.quantity < item.quantity) {
              alert(
                `Không đủ hàng cho sản phẩm "${item.name}". Kho (kệ) còn ${
                  product ? product.quantity : 0
                }.`
              );
              selectElement.value = oldStatus; // Trả lại giá trị cũ
              return; // Dừng
            }
          }

          // Nếu đủ hàng, tiến hành trừ kho
          invoice.items.forEach((item) => {
            const product = products.find((p) => p.name === item.name);
            if (product) {
              product.quantity -= item.quantity;
            }
          });
          localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
        } catch (e) {
          alert("Có lỗi xảy ra khi trừ kho. Trạng thái chưa được thay đổi.");
          selectElement.value = oldStatus; // Trả lại giátrị cũ
          return;
        }
      } else {
        selectElement.value = oldStatus; // Người dùng hủy, trả lại giá trị cũ
        return;
      }
    }

    // Cập nhật trạng thái hóa đơn
    invoice.status = newStatus;
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));

    // Cập nhật giao diện (màu sắc) cho dropdown
    if (selectElement) {
      selectElement.className = "invoice-status-select"; // Reset
      selectElement.classList.add(getStatusClass(newStatus));
    }

    // Cập nhật lại số liệu thống kê nếu cần
    renderInvoiceManagement();
  };

  window.refreshInvoices = function () {
    invoices = JSON.parse(localStorage.getItem(INVOICES_KEY)) || [];
    renderInvoiceManagement();
  };

  window.viewInvoice = function (id) {
    const invoice = invoices.find((inv) => inv.id === id);
    if (!invoice) return;

    const itemsStr = invoice.items
      .map(
        (it) =>
          `- ${it.name} x${it.quantity}: ${formatPrice(
            it.price * it.quantity
          )}đ`
      )
      .join("\n");

    const message = `
┌────────────────────────────
   HÓA ĐƠN BÁN HÀNG
└────────────────────────────┘

Mã HĐ: #${id}
Ngày: ${invoice.date}
Khách hàng: ${invoice.user}

┌────────────────────────────
CHI TIẾT SẢN PHẨM
└────────────────────────────┘

${itemsStr}

────────────────────────────
Tổng tiền: ${formatPrice(invoice.total)}đ
────────────────────────────
    `;

    alert(message);
  };

  window.deleteInvoice = function (id) {
    if (!confirm("Bạn có chắc muốn xóa hóa đơn này?")) return;
    invoices = invoices.filter((inv) => inv.id !== id);
    localStorage.setItem(INVOICES_KEY, JSON.stringify(invoices));
    renderInvoiceManagement();
    alert("Đã xóa hóa đơn!");
  };

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

  // === GẮN SỰ KIỆN CHO FORM SẢN PHẨM (GIỮ NGUYÊN) ===
  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.addEventListener("submit", function (event) {
      if (window.editingProductIndex === -1) {
        window.addProduct(event);
      } else {
        window.editProductSubmit(event);
      }
    });
  }

  // === GẮN SỰ KIỆN ĐÓNG POPUP SẢN PHẨM (ĐÃ THAY THẾ) ===
  const closePopupBtn = document.getElementById("close-product-form-popup");
  const productPopup = document.getElementById("product-form-popup");

  if (closePopupBtn && productPopup) {
    closePopupBtn.addEventListener("click", () => {
      productPopup.style.display = "none";
      window.editingProductIndex = -1;

      // === YÊU CẦU MỚI: MỞ KHÓA TẤT CẢ CÁC TRƯỜNG KHI ĐÓNG ===
      document.getElementById("value").disabled = false;
      document.getElementById("quantity").disabled = false;
      document.getElementById("description").disabled = false;
      document.getElementById("specs").disabled = false;

      // Dọn dẹp luôn các trường mới
      document.getElementById("description").value = "";
      document.getElementById("specs").value = "";
      // ====================================================

      // LOGIC DỌN DẸP DOM: HOÀN TÁC TRƯỜNG NAME
      const nameElement = document.getElementById("name");
      if (nameElement && nameElement.tagName === "SELECT") {
        // Tạo lại input text gốc
        const originalInput = document.createElement("input");
        originalInput.type = "text";
        originalInput.id = "name";
        originalInput.required = true;
        originalInput.style.cssText =
          "width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;";
        originalInput.placeholder = "Nhập tên sản phẩm...";

        nameElement.replaceWith(originalInput);
      }

      // Đảm bảo nút Lưu được bật lại nếu đang ở chế độ sửa
      const submitBtn = document
        .getElementById("productForm")
        .querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = false;
    });
  }

  // Đóng popup khi click bên ngoài
  if (productPopup) {
    productPopup.addEventListener("click", (e) => {
      if (e.target === productPopup) {
        // Thực hiện logic đóng popup
        const closeBtn = document.getElementById("close-product-form-popup");
        if (closeBtn) closeBtn.click();
      }
    });
  }

  // === KHỞI TẠO TRANG (GIỮ NGUYÊN) ===
  if (localStorage.getItem("isAdmin") === "true") {
    // Không gọi renderProductManagement() hoặc renderStockManagement() ở đây
    // vì chúng sẽ được gọi khi người dùng click vào các tab.
  } else {
    // Nếu không phải admin, chuyển về trang login
    if (window.location.pathname.includes("admin")) {
      alert("Bạn cần đăng nhập với quyền Admin!");
      window.location.href = "../index.html";
    }
  }
});
