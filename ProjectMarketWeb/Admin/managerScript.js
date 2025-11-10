document.addEventListener("DOMContentLoaded", () => {
  const PRODUCTS_KEY = "products";
  const STORAGE_KEY = "userAccounts";
  const INVOICES_KEY = "invoices";
  const IMPORT_RECEIPTS_KEY = "importReceipts";

  let products = JSON.parse(localStorage.getItem(PRODUCTS_KEY)) || [];
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

  // === HÀM TÍNH TOÁN TỒN KHO TỪ PHIẾU NHẬP VÀ HÓA ĐƠN ===
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

  // === QUẢN LÝ KHO ===
  window.renderStockManagement = function () {
    hideAllContent();
    if (!stockContent) return;
    stockContent.style.display = "block";

    if (!stockTableBody) return;

    const allStock = calculateStock();
    let html = "";
    let idCounter = 1;

    allStock.forEach((item) => {
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

    stockTableBody.innerHTML =
      html ||
      `<tr><td colspan="5" class="empty-state">Kho hàng trống.</td></tr>`;
  };

  window.viewStockDetail = function (productName) {
    const stockItem = calculateStock().find(
      (item) => item.productName === productName
    );

    if (!stockItem) {
      alert("Không tìm thấy thông tin sản phẩm!");
      return;
    }

    const message = `
┌────────────────────────────┐
   CHI TIẾT TỒN KHO
└────────────────────────────┘

Sản phẩm: ${stockItem.productName}
Danh mục: ${stockItem.category}
Số lượng: ${stockItem.quantity}

${
  stockItem.quantity <= 10 ? "⚠️ CẢNH BÁO: Tồn kho thấp!" : "✅ Tồn kho ổn định"
}
    `;

    alert(message);
  };

  // === QUẢN LÝ NGƯỜI DÙNG ===
  function renderUserManagement() {
    hideAllContent();
    if (!userContent) return;
    userContent.style.display = "block";

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
              <th>Mật khẩu</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
    `;

    users.forEach((user, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(user.username)}</td>
          <td>••••••••</td>
          <td>
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
      </div>
    `;

    userContent.innerHTML = html;
  }

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

  // === QUẢN LÝ SẢN PHẨM ===
  function renderProductManagement() {
    hideAllContent();
    if (!productContent) return;
    productContent.style.display = "block";

    let html = `
      <div class="management-header">
        <h2><i class="fa-solid fa-box"></i> Quản lý Sản phẩm</h2>
        <div>
          <button onclick="addNewProduct()" class="btn-add">
            <i class="fa-solid fa-plus"></i> Thêm sản phẩm
          </button>
          <button onclick="refreshProducts()" class="btn-refresh">
            <i class="fa-solid fa-rotate"></i> Làm mới
          </button>
        </div>
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

    products.forEach((product, index) => {
      html += `
        <tr>
          <td>${index + 1}</td>
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
            <button onclick="editProduct(${index})" class="btn-edit">
              <i class="fa-solid fa-pen"></i> Sửa
            </button>
            <button onclick="deleteProduct(${index})" class="btn-delete">
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

  window.addNewProduct = function () {
    const popup = document.getElementById("product-form-popup");
    if (popup) {
      document.getElementById("name").value = "";
      document.getElementById("value").value = "";
      document.getElementById("quantity").value = "";
      document.getElementById("category").value = "";
      const imageInput = document.getElementById("image");
      if (imageInput) imageInput.value = "";

      window.editingProductIndex = -1;
      popup.style.display = "flex";
    }
  };

  window.editProduct = function (index) {
    const product = products[index];
    if (!product) return;

    const popup = document.getElementById("product-form-popup");
    if (popup) {
      document.getElementById("name").value = product.name;
      document.getElementById("value").value = product.value;
      document.getElementById("quantity").value = product.quantity;
      document.getElementById("category").value = product.category;

      window.editingProductIndex = index;
      popup.style.display = "flex";
    }
  };

  window.deleteProduct = function (index) {
    if (!confirm("Bạn có chắc muốn xóa sản phẩm này?")) return;
    products.splice(index, 1);
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    renderProductManagement();
    alert("Đã xóa sản phẩm!");
  };

  // === HÀM LƯU SẢN PHẨM (THÊM/SỬA) VỚI RÀNG BUỘC KHO HÀNG ===
  window.saveProduct = function (event) {
    event.preventDefault();

    const name = document.getElementById("name").value.trim();
    const value = parseInt(document.getElementById("value").value);
    const quantity = parseInt(document.getElementById("quantity").value);
    const category = document.getElementById("category").value.trim();
    const imageFile = document.getElementById("image").files[0];
    const popup = document.getElementById("product-form-popup");

    // Validate input
    if (!name || !value || !quantity || !category) {
      alert("Vui lòng điền đầy đủ thông tin!");
      return;
    }

    if (value <= 0) {
      alert("Giá sản phẩm phải lớn hơn 0!");
      return;
    }

    if (quantity <= 0) {
      alert("Số lượng phải lớn hơn 0!");
      return;
    }

    let isEditMode = window.editingProductIndex !== -1;
    let oldQuantity = isEditMode
      ? products[window.editingProductIndex].quantity
      : 0;

    // Lấy tồn kho thực tế (đã trừ đi số lượng đang trên kệ)
    const currentStock = calculateStock();
    const stockItem = currentStock.find(
      (item) => item.productName.trim().toLowerCase() === name.toLowerCase()
    );
    const availableStock = stockItem ? stockItem.quantity : 0;

    // --- RÀNG BUỘC: THÊM SẢN PHẨM MỚI ---
    if (!isEditMode) {
      // 1. Kiểm tra tồn kho
      if (availableStock <= 0) {
        alert(
          `Lỗi: Không thể thêm sản phẩm "${name}" vì không có tồn kho (hiện tại: ${availableStock}). Vui lòng nhập hàng trước.`
        );
        return;
      }

      // 2. Kiểm tra số lượng thêm
      if (quantity > availableStock) {
        alert(
          `Lỗi: Số lượng thêm (${quantity}) vượt quá số lượng tồn kho khả dụng (${availableStock}).`
        );
        return;
      }

      // 3. Kiểm tra trùng tên
      const existingProduct = products.find(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );
      if (existingProduct) {
        alert(
          "Lỗi: Tên sản phẩm đã tồn tại trên kệ. Vui lòng sử dụng chức năng Sửa hoặc thêm sản phẩm khác."
        );
        return;
      }
    }

    // --- RÀNG BUỘC: SỬA SẢN PHẨM HIỆN CÓ ---
    else {
      // Tổng số lượng thay đổi
      const quantityDelta = quantity - oldQuantity;

      // Nếu số lượng mới lớn hơn số lượng cũ (tức là cần thêm hàng lên kệ)
      if (quantityDelta > 0) {
        // Cập nhật lại tồn kho khả dụng khi sửa
        const currentStockForEdit = calculateStock();
        const stockItemForEdit = currentStockForEdit.find(
          (item) => item.productName.trim().toLowerCase() === name.toLowerCase()
        );
        const availableStockForEdit = stockItemForEdit
          ? stockItemForEdit.quantity
          : 0;

        if (quantityDelta > availableStockForEdit) {
          alert(
            `Lỗi: Không đủ hàng trong kho để tăng số lượng. Bạn cần thêm ${quantityDelta} sản phẩm nhưng kho chỉ còn ${availableStockForEdit} hàng chưa lên kệ.`
          );
          return;
        }
      }

      // Kiểm tra trùng tên khi sửa (trừ chính sản phẩm đang sửa)
      const existingProduct = products.find(
        (p, i) =>
          i !== window.editingProductIndex &&
          p.name.toLowerCase() === name.toLowerCase()
      );
      if (existingProduct) {
        alert("Lỗi: Tên sản phẩm đã tồn tại.");
        return;
      }
    }

    let imageUrl = "";
    if (imageFile) {
      imageUrl = URL.createObjectURL(imageFile);
    }

    if (isEditMode) {
      const product = products[window.editingProductIndex];
      product.name = name;
      product.value = value;
      product.quantity = quantity;
      product.category = category;
      if (imageUrl) product.image = imageUrl;

      alert("✅ Cập nhật sản phẩm thành công!");
      window.editingProductIndex = -1;
    } else {
      const placeholderImg = `data:image/svg+xml;utf8,${encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="100%" height="100%" fill="#f2f2f2"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#999" font-size="28">No Image</text></svg>'
      )}`;

      products.push({
        name: name,
        value: value,
        quantity: quantity,
        category: category,
        image: imageUrl || placeholderImg,
      });

      alert("✅ Thêm sản phẩm thành công!");
    }

    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
    if (popup) popup.style.display = "none";
    renderProductManagement();

    // Cập nhật lại kho nếu đang hiển thị
    if (stockContent && stockContent.style.display !== "none") {
      renderStockManagement();
    }
  };

  // === PHIẾU NHẬP HÀNG ===
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
            
            <div style="margin-bottom: 15px;">
              <label style="display: block; margin-bottom: 5px; font-weight: 600;">Danh mục:</label>
              <input type="text" id="importCategory" required
                style="width: 100%; padding: 10px; border: 2px solid #e0e0e0; border-radius: 8px; outline: none;"
                placeholder="Nhập danh mục...">
            </div>
            
            <div style="margin-bottom: 15px;">
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
┌────────────────────────────┐
   PHIẾU NHẬP HÀNG
└────────────────────────────┘

Mã phiếu: #${receipt.id}
Ngày nhập: ${receipt.date}

┌────────────────────────────┐
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

  // === QUẢN LÝ HÓA ĐƠN ===
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
┌────────────────────────────┐
   HÓA ĐƠN BÁN HÀNG
└────────────────────────────┘

Mã HĐ: #${id}
Ngày: ${invoice.date}
Khách hàng: ${invoice.user}

┌────────────────────────────┐
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

  // === GẮN SỰ KIỆN CHO CÁC NÚT ĐIỀU HƯỚNG ===
  if (manageUserBtn) {
    manageUserBtn.addEventListener("click", renderUserManagement);
  }

  if (manageProductBtn) {
    manageProductBtn.addEventListener("click", renderProductManagement);
  }

  if (manageInvoiceBtn) {
    manageInvoiceBtn.addEventListener("click", renderInvoiceManagement);
  }

  if (addInfoBtn) {
    addInfoBtn.addEventListener("click", renderAddInfo);
  }

  if (manageStockBtn) {
    manageStockBtn.addEventListener("click", renderStockManagement);
  }

  // === GẮN SỰ KIỆN CHO FORM SẢN PHẨM ===
  const productForm = document.getElementById("productForm");
  if (productForm) {
    productForm.addEventListener("submit", window.saveProduct);
  }

  // === GẮN SỰ KIỆN ĐÓNG POPUP SẢN PHẨM ===
  const closePopupBtn = document.getElementById("close-product-form-popup");
  const productPopup = document.getElementById("product-form-popup");

  if (closePopupBtn && productPopup) {
    closePopupBtn.addEventListener("click", () => {
      productPopup.style.display = "none";
      window.editingProductIndex = -1;
    });
  }

  // Đóng popup khi click bên ngoài
  if (productPopup) {
    productPopup.addEventListener("click", (e) => {
      if (e.target === productPopup) {
        productPopup.style.display = "none";
        window.editingProductIndex = -1;
      }
    });
  }

  // === KHỞI TẠO TRANG ===
  if (localStorage.getItem("isAdmin") === "true") {
    renderProductManagement();
  } else {
    // Nếu không phải admin, chuyển về trang login
    if (window.location.pathname.includes("admin")) {
      alert("Bạn cần đăng nhập với quyền Admin!");
      window.location.href = "../index.html";
    }
  }
});
