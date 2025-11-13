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

  // DOM Elements
  const manageUserBtn = document.getElementById("manageUserBtn");
  const manageProductBtn = document.getElementById("manageProductBtn");
  const manageInvoiceBtn = document.getElementById("manageInvoiceBtn");
  const addInfoBtn = document.getElementById("addInfoBtn");
  const manageStockBtn = document.getElementById("manageStockBtn");

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

  function hideAllContent() {
    if (userContent) userContent.style.display = "none";
    if (productContent) productContent.style.display = "none";
    if (invoiceContent) invoiceContent.style.display = "none";
    if (addInfoContent) addInfoContent.style.display = "none";
    if (stockContent) stockContent.style.display = "none";
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

    // 1. Tính tổng số lượng nhập vào
    importReceipts.forEach((receipt) => {
      if (receipt.productName.trim().toLowerCase() === key) {
        imported += parseInt(receipt.quantity || 0);
      }
    });

    // 2. Tính tổng số lượng đã bán
    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        if (item.name.trim().toLowerCase() === key) {
          sold += parseInt(item.quantity || 0);
        }
      });
    });

    // 3. Tính tổng số lượng đã đưa lên kệ
    products.forEach((product) => {
      if (product.name.trim().toLowerCase() === key) {
        onShelf += parseInt(product.quantity || 0);
      }
    });

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
    for (let i = importReceipts.length - 1; i >= 0; i--) {
      const r = importReceipts[i];
      if (
        r &&
        r.productName &&
        r.productName.trim().toLowerCase() === productName.trim().toLowerCase()
      ) {
        return typeof r.price !== "undefined" ? r.price : "";
      }
    }
    return "";
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
    importReceipts.forEach((receipt) => {
      const key = receipt.productName.trim().toLowerCase();
      const category = receipt.category || "Chưa phân loại";

      if (!stock[key]) {
        stock[key] = {
          productName: receipt.productName,
          category: category,
          quantity: 0,
        };
      }
      stock[key].quantity += parseInt(receipt.quantity || 0);
      stock[key].category = category;
    });

    // 2. Trừ số lượng đã bán (từ Hóa đơn)
    invoices.forEach((invoice) => {
      invoice.items.forEach((item) => {
        const key = item.name.trim().toLowerCase();
        if (stock[key]) {
          stock[key].quantity -= parseInt(item.quantity || 0);
        }
      });
    });

    // 3. Trừ đi số lượng đã được thêm lên kệ (products list)
    products.forEach((product) => {
      const key = product.name.trim().toLowerCase();
      if (stock[key]) {
        stock[key].quantity -= parseInt(product.quantity || 0);
      }
    });

    return Object.values(stock);
  }

  /**
   * Trả về danh sách sản phẩm có tồn kho khả dụng để đưa lên kệ.
   * @returns {Array<{productName: string, category: string, quantity: number}>}
   */
  function getAvailableStockProducts() {
    const allStock = calculateStock();
    // Lấy tồn kho thực tế khả dụng (đã trừ cả số lượng trên kệ)
    const availableStock = allStock.filter((item) => item.quantity > 0);

    // Ngoài ra, cần loại trừ các sản phẩm đã có trên kệ (products)
    const productsOnShelf = new Set(
      products.map((p) => p.name.trim().toLowerCase())
    );

    return availableStock.filter(
      (item) => !productsOnShelf.has(item.productName.trim().toLowerCase())
    );
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
          <td>${escapeHtml(user.username || "N/A")}</td>
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
            <button onclick="deleteUser(${index})" class="btn-delete">
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

  window.deleteUser = function (index) {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;
    users.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    renderUserManagement();
    alert("Đã xóa người dùng!");
  };
  window.refreshUsers = function () {
    users = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    renderUserManagement();
  };

  window.editUser = function (index) {
    const user = users[index];
    if (!user) return;

    const newUsername = prompt("Nhập tên đăng nhập mới:", user.username);
    if (!newUsername) return;

    const newPassword = prompt("Nhập mật khẩu mới:", user.password);
    if (!newPassword) return;

    users[index] = { username: newUsername, password: newPassword };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    renderUserManagement();
    alert("Cập nhật thành công!");
  };

  window.deleteUser = function (index) {
    if (!confirm("Bạn có chắc muốn xóa người dùng này?")) return;
    users.splice(index, 1);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
    renderUserManagement();
    alert("Đã xóa người dùng!");
  };

  // === QUẢN LÝ SẢN PHẨM (CẬP NHẬT: THÊM TÍNH NĂNG TÌM KIẾM NÂNG CAO) ===
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
    function renderProductTable(filteredProducts) {
      const tbody = document.querySelector("#productContent table tbody");
      if (!tbody) return;

      let html = "";
      filteredProducts.forEach((product, index) => {
        const originalIndex = products.findIndex(
          (p) => p.name === product.name
        );
        html += `
        <tr>
          <td>${originalIndex + 1}</td>
          <td>
            <div class="product-img-mini" style="background-image: url('${
              product.image || ""
            }')"></div>
          </td>
          <td>${escapeHtml(product.name)}</td>
          <td>${formatPrice(product.value)}đ</td>
          <td>${product.quantity}</td>
          <td>${escapeHtml(product.category)}</td>
          <td>
            <button onclick="editProduct(${originalIndex})" class="btn-edit"><i class="fa-solid fa-pen"></i> Sửa</button>
            <button onclick="deleteProduct(${originalIndex})" class="btn-delete"><i class="fa-solid fa-trash"></i> Xóa</button>
          </td>
        </tr>`;
      });

      if (!html)
        html = `<tr><td colspan="7" class="empty-state">Không có sản phẩm phù hợp.</td></tr>`;

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

      renderProductTable(filteredProducts);
    };

    let html = `
      <div class="management-header">
        <h2><i class="fa-solid fa-box"></i> Quản lý Sản phẩm</h2>
        <div style="display: flex; align-items: center; gap: 10px;">
            <button onclick="addNewProduct()" class="btn-add">
                <i class="fa-solid fa-plus"></i> Thêm sản phẩm (Từ kho)
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
              <th>Giá</th>
              <th>Số lượng (Trên kệ)</th>
              <th>Danh mục</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredProducts.forEach((product, index) => {
      // Tìm lại index gốc để dùng cho thao tác Sửa/Xóa chính xác
      const originalIndex = products.findIndex((p) => p.name === product.name);

      html += `
        <tr>
          <td>${originalIndex + 1}</td>
          <td>
            <div class="product-img-mini" style="background-image: url('${
              product.image || ""
            }')"></div>
          </td>
          <td>${escapeHtml(product.name)}</td>
          <td>${formatPrice(product.value)}đ</td>
          <td>${product.quantity}</td>
          <td>${escapeHtml(product.category)}</td>
          <td>
            <button onclick="editProduct(${originalIndex})" class="btn-edit">
              <i class="fa-solid fa-pen"></i> Sửa
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

  // === CẬP NHẬT window.addNewProduct (THAY THẾ INPUT NAME BẰNG SELECT, BỎ CATEGORY) ===
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

    // 1. TÌM VÀ THAY THẾ TRƯỜNG NAME CŨ (input text) bằng SELECT
    let nameElement = document.getElementById("name");

    if (nameElement) {
      // Nếu chưa là SELECT, thì thay thế
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

    // Cập nhật nội dung cho select
    if (nameElement && nameElement.tagName === "SELECT") {
      nameElement.innerHTML =
        `<option value="">-- Chọn sản phẩm trong kho --</option>` +
        productSelectHtml;
      nameElement.disabled = false; // Bật lại nếu nó bị disabled từ chế độ edit trước

      // -- cập nhật giá nhập khi chọn sản phẩm --
      const valueInput = document.getElementById("value");
      function updateValueFromSelect() {
        const selected = nameElement.value;
        const price = selected ? findLatestImportPrice(selected) : "";
        if (valueInput) valueInput.value = price !== "" ? price : "";
      }
      // gán event change (loại trừ việc gán nhiều lần)
      nameElement.removeEventListener("change", updateValueFromSelect);
      nameElement.addEventListener("change", updateValueFromSelect);

      // nếu đã có lựa chọn mặc định (ví dụ đã set) thì cập nhật ngay
      updateValueFromSelect();
    }

    if (popup) {
      document.getElementById("value").value = "";
      document.getElementById("quantity").value = "";

      // **XÓA TRƯỜNG CATEGORY ĐƯỢC CHÈN (nếu có)**
      document.getElementById("category-wrapper")?.remove();
      // Đảm bảo input id="category" không tồn tại
      const categoryInput = document.getElementById("category");
      if (categoryInput && categoryInput.type !== "hidden")
        categoryInput.remove();

      const imageInput = document.getElementById("image");
      if (imageInput) imageInput.value = "";

      window.editingProductIndex = -1;
      // Đặt lại title
      popup.querySelector("h2").textContent = "Thêm sản phẩm lên kệ (Từ kho)";
      popup.style.display = "flex";
    }
  };

  // === CẬP NHẬT window.editProduct (DÙNG SELECT NAME VÀ KHÓA, BỎ CATEGORY) ===
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
      // Đảm bảo sản phẩm đang sửa có trong danh sách chọn (dù hết hàng)
      const isEditing = stockProducts.some(
        (p) => p.productName === product.name
      );

      let currentOptions = productSelectHtml;
      if (!isEditing) {
        // Nếu sản phẩm đang sửa không còn hàng trong kho, thêm nó vào danh sách chọn (đã chọn)
        currentOptions =
          `<option value="${escapeHtml(product.name)}" selected>${escapeHtml(
            product.name
          )} (Trên kệ)</option>` + currentOptions;
      }

      nameElement.innerHTML = currentOptions;
      nameElement.value = product.name; // Set current value
      nameElement.disabled = true; // KHÓA TÊN SẢN PHẨM KHI CHỈNH SỬA

      // Cập nhật giá nhập hiển thị (nếu có phiếu nhập)
      const valueInput = document.getElementById("value");
      const latestPrice = findLatestImportPrice(product.name);
      if (valueInput)
        valueInput.value = latestPrice !== "" ? latestPrice : product.value;
    }

    if (popup) {
      document.getElementById("name").value = product.name;
      document.getElementById("value").value = product.value;
      document.getElementById("quantity").value = product.quantity;

      // **XÓA TRƯỜNG CATEGORY ĐƯỢC CHÈN (nếu có)**
      document.getElementById("category-wrapper")?.remove();
      // Đảm bảo input id="category" không tồn tại
      const categoryInput = document.getElementById("category");
      if (categoryInput && categoryInput.type !== "hidden")
        categoryInput.remove();

      const imageInput = document.getElementById("image");
      if (imageInput) imageInput.value = ""; // Xóa input file để người dùng chọn file mới

      window.editingProductIndex = index;
      popup.style.display = "flex";

      // Đặt lại title
      popup.querySelector("h2").textContent = "Sửa sản phẩm trên kệ";
    }
  };

  window.deleteProduct = function (index) {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    products.splice(index, 1);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    renderProductManagement();
    renderStockManagement(); // Cập nhật lại kho sau khi xóa sản phẩm trên kệ
    alert("Đã xóa sản phẩm!");
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

  // === HÀM THÊM SẢN PHẨM MỚI (CẬP NHẬT LOGIC TỪ KHO) ===
  window.addProduct = async function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim(); // Lấy từ SELECT
    const value = parseInt(document.getElementById("value").value);
    const quantity = parseInt(document.getElementById("quantity").value);
    // LẤY DANH MỤC TỪ DỮ LIỆU KHO/PHIẾU NHẬP
    const category = findProductCategory(name);

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

    // Nếu không có bản ghi kho cho sản phẩm
    if (!stockItem) {
      alert(
        `❌ Lỗi Kho: Sản phẩm "${name}" chưa có trong kho. Vui lòng tạo phiếu nhập trước khi đưa lên kệ.`
      );
      if (typeof event.stopImmediatePropagation === "function")
        event.stopImmediatePropagation();
      return;
    }

    const availableStock = parseInt(stockItem.quantity || 0, 10);

    // Kiểm tra tồn kho khả dụng (đã trừ số lượng trên kệ)
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

    const newProduct = { name, value, quantity, category, image: imageBase64 };
    products.push(newProduct);

    // Lưu và render, bắt lỗi khi lưu localStorage
    try {
      saveAndRenderProducts(popup, stockContent);
      alert("✅ Thêm sản phẩm thành công!");
    } catch (err) {
      console.error("Lỗi khi lưu sản phẩm:", err);
      alert("❌ Lỗi khi lưu sản phẩm. Kiểm tra console.");
    }
  };
  // === HÀM SỬA SẢN PHẨM (CẬP NHẬT LOGIC) ===
  window.editProductSubmit = async function (event) {
    event.preventDefault();
    // Ngăn các listener khác xử lý cùng event
    if (typeof event.stopImmediatePropagation === "function")
      event.stopImmediatePropagation();

    const name = document.getElementById("name").value.trim();
    const value = parseInt(document.getElementById("value").value);
    const quantity = parseInt(document.getElementById("quantity").value);

    const imageFile = document.getElementById("image").files[0];
    const popup = document.getElementById("product-form-popup");
    const stockContent = document.getElementById("stockContent");

    // LẤY SẢN PHẨM ĐANG SỬA
    const product = products[window.editingProductIndex];
    if (!product) {
      alert("❌ Không tìm thấy sản phẩm!");
      return;
    }

    // LẤY DANH MỤC CŨ (Sản phẩm trên kệ không cho sửa danh mục)
    const category = product.category;

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
      return;
    }

    const oldQuantity = product.quantity;
    const quantityDelta = quantity - oldQuantity;

    // --- KIỂM TRA TỒN KHO KHI TĂNG SỐ LƯỢNG ---
    if (quantityDelta > 0) {
      const currentStock = calculateStock();
      const stockItem = currentStock.find(
        (item) =>
          item.productName.trim().toLowerCase() ===
          product.name.trim().toLowerCase()
      );

      // Nếu không tìm thấy bản ghi kho, không thể tăng
      if (!stockItem) {
        alert(
          `❌ Lỗi Kho: Sản phẩm "${product.name}" không có bản ghi trong kho. Không thể tăng số lượng.`
        );
        return;
      }

      const availableStock = parseInt(stockItem.quantity || 0, 10);

      if (availableStock <= 0) {
        alert(
          `❌ Không đủ hàng trong kho để tăng số lượng.\n\nKho hiện chỉ còn ${availableStock} khả dụng.`
        );
        return;
      }

      if (quantityDelta > availableStock) {
        alert(
          `❌ Không đủ hàng trong kho để tăng số lượng.\n\nKho chỉ còn ${availableStock} khả dụng.`
        );
        return;
      }
    }

    // --- KIỂM TRA TRÙNG TÊN KHI SỬA (Giữ lại check này cho an toàn) ---
    const duplicate = products.find(
      (p, i) =>
        i !== window.editingProductIndex &&
        p.name.trim().toLowerCase() === name.toLowerCase()
    );

    if (duplicate) {
      alert("⚠️ Lỗi: Tên sản phẩm đã tồn tại. Vui lòng chọn tên khác.");
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
    product.name = name;
    product.value = value;
    product.quantity = quantity;
    product.category = category; // Sử dụng category cũ
    product.image = newImageBase64; // Cập nhật bằng Base64

    // --- LƯU VÀ CẬP NHẬT GIAO DIỆN ---
    window.editingProductIndex = -1;
    saveAndRenderProducts(popup, stockContent);
    alert("✅ Cập nhật sản phẩm thành công!");
  };

  // === PHIẾU NHẬP HÀNG (CẬP NHẬT FORM VÀ LOGIC DANH MỤC) ===
  function renderAddInfo() {
    hideAllContent();
    if (!addInfoContent) return;
    addInfoContent.style.display = "block";

    let html = `
      <div class="management-header">
        <h2><i class="fa-solid fa-clipboard-list"></i> Phiếu nhập hàng</h2>
        <div>
          <button onclick="showImportReceiptForm()" class="btn-add">
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
              <th>Tên sản phẩm</th>
              <th>Số lượng</th>
              <th>Đơn giá</th>
              <th>Thành tiền</th>
              <th>Người nhập</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
    `;

    importReceipts.forEach((receipt) => {
      const totalPrice = receipt.quantity * receipt.price;
      html += `
        <tr>
          <td>#${receipt.id}</td>
          <td>${receipt.date}</td>
          <td>${escapeHtml(receipt.productName)}</td>
          <td>${receipt.quantity}</td>
          <td>${formatPrice(receipt.price)}đ</td>
          <td><strong>${formatPrice(totalPrice)}đ</strong></td>
          <td>${escapeHtml(receipt.importedBy)}</td>
          <td>
            <button onclick="viewImportReceipt('${
              receipt.id
            }')" class="btn-view">
              <i class="fa-solid fa-eye"></i> Xem
            </button>
            <button onclick="deleteImportReceipt('${
              receipt.id
            }')" class="btn-delete">
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
            <h3>${importReceipts.reduce((sum, r) => sum + r.quantity, 0)}</h3>
            <p>Tổng số lượng nhập</p>
          </div>
        </div>
        <div class="stat-card">
          <i class="fa-solid fa-money-bill-trend-up stat-icon"></i>
          <div>
            <h3>${formatPrice(
              importReceipts.reduce((sum, r) => sum + r.quantity * r.price, 0)
            )}đ</h3>
            <p>Tổng giá trị nhập</p>
          </div>
        </div>
      </div>
    `;

    addInfoContent.innerHTML = html;
  }

  window.showImportReceiptForm = function () {
    const categoryHtml = renderImportCategoryField(); // Thêm trường Danh mục mới

    const html = `
      <div class="admin-modal-overlay" id="importReceiptModal" onclick="closeImportReceiptModal(event)">
        <div class="admin-modal-content" onclick="event.stopPropagation()">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="color: #667eea; margin: 0;">
              <i class="fa-solid fa-clipboard-list"></i> Tạo phiếu nhập hàng
            </h2>
            <span onclick="closeImportReceiptModal()" style="cursor: pointer; font-size: 28px; color: #999;">&times;</span>
          </div>
          
          <form id="importReceiptForm" onsubmit="submitImportReceipt(event)">
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: 600;">Tên sản phẩm:</label>
              <input type="text" id="importProductName" required 
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;"
                placeholder="Nhập tên sản phẩm...">
            </div>
            
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: 600;">Số lượng:</label>
              <input type="number" id="importQuantity" required min="1"
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;"
                placeholder="Nhập số lượng...">
            </div>
            
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: 600;">Đơn giá:</label>
              <input type="number" id="importPrice" required min="0"
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;"
                placeholder="Nhập đơn giá...">
            </div>
            
            ${categoryHtml} <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: 600;">Ghi chú:</label>
              <textarea id="importNote" rows="3"
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;"
                placeholder="Ghi chú thêm (tùy chọn)..."></textarea>
            </div>
            
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
              <button type="button" onclick="closeImportReceiptModal()" 
                style="padding: 10px 20px; background: #e0e0e0; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                Hủy
              </button>
              <button type="submit"
                style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">
                <i class="fa-solid fa-save"></i> Tạo phiếu
              </button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML("beforeend", html);

    // Thiết lập giá trị ban đầu cho select
    window.checkImportCategoryInput();
  };

  window.closeImportReceiptModal = function (event) {
    if (!event || event.target.id === "importReceiptModal" || !event.target) {
      const modal = document.getElementById("importReceiptModal");
      if (modal) modal.remove();
    }
  };

  window.submitImportReceipt = function (event) {
    event.preventDefault();

    const productName = document
      .getElementById("importProductName")
      .value.trim();
    const quantity = parseInt(document.getElementById("importQuantity").value);
    const price = parseInt(document.getElementById("importPrice").value);
    // LẤY GIÁ TRỊ DANH MỤC TỪ INPUT ẨN
    const category = document.getElementById("importCategory").value.trim();
    const note = document.getElementById("importNote").value.trim();

    if (!productName || !category) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    if (quantity <= 0) {
      alert("Số lượng phải lớn hơn 0!");
      return;
    }

    if (price <= 0) {
      alert("Đơn giá phải lớn hơn 0!");
      return;
    }

    // Tạo phiếu nhập
    const receipt = {
      id: Date.now().toString(),
      date: new Date().toLocaleString("vi-VN"),
      productName: productName,
      quantity: quantity,
      price: price,
      category: category,
      note: note,
      importedBy: "Admin",
    };

    importReceipts.push(receipt);
    localStorage.setItem(IMPORT_RECEIPTS_KEY, JSON.stringify(importReceipts));

    alert(
      "✅ Đã tạo phiếu nhập hàng thành công! Sản phẩm đã được ghi nhận vào kho."
    );
    closeImportReceiptModal();
    renderAddInfo();

    // Cập nhật lại danh sách kho nếu đang ở tab đó
    if (stockContent && stockContent.style.display !== "none") {
      renderStockManagement();
    }
  };

  window.viewImportReceipt = function (id) {
    const receipt = importReceipts.find((r) => r.id === id);
    if (!receipt) return;

    const totalPrice = receipt.quantity * receipt.price;
    const message = `
┌────────────────────────────
   PHIẾU NHẬP HÀNG
└────────────────────────────┘

Mã phiếu: #${receipt.id}
Ngày nhập: ${receipt.date}

┌────────────────────────────
THÔNG TIN SẢN PHẨM
└────────────────────────────┘

Tên SP: ${receipt.productName}
Danh mục: ${receipt.category}
Số lượng: ${receipt.quantity}
Đơn giá: ${formatPrice(receipt.price)}đ

────────────────────────────

Thành tiền: ${formatPrice(totalPrice)}đ

────────────────────────────
Người nhập: ${receipt.importedBy}
${receipt.note ? "\nGhi chú: " + receipt.note : ""}
────────────────────────────
    `;

    alert(message);
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
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
    `;

    invoices.forEach((invoice) => {
      const itemsStr = invoice.items.map((it) => it.name).join(", ");
      html += `
        <tr>
          <td>#${invoice.id}</td>
          <td>${invoice.date}</td>
          <td>${escapeHtml(invoice.user)}</td>
          <td>${escapeHtml(itemsStr)}</td>
          <td>${formatPrice(invoice.total)}đ</td>
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
            <h3>${formatPrice(
              invoices.reduce((sum, inv) => sum + inv.total, 0)
            )}đ</h3>
            <p>Tổng doanh thu</p>
          </div>
        </div>
      </div>
    `;

    invoiceContent.innerHTML = html;
  }

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

  // === GẮN SỰ KIỆN ĐÓNG POPUP SẢN PHẨM (CẬP NHẬT LOGIC DỌN DẸP DOM NAME) ===
  const closePopupBtn = document.getElementById("close-product-form-popup");
  const productPopup = document.getElementById("product-form-popup");

  if (closePopupBtn && productPopup) {
    closePopupBtn.addEventListener("click", () => {
      productPopup.style.display = "none";
      window.editingProductIndex = -1;

      // LOGIC DỌN DẸP DOM: HOÀN TÁC THAY ĐỔI VỀ TRƯỜNG NAME
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
