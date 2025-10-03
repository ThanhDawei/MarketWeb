
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
          document.getElementById("displayed-username").innerText =
            usernameInput;
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
          let card = `
        <div class="product-card">
          <img src="${product.image}" alt="${product.name}">
          <h3>${product.name}</h3>
          <p>Màu: ${product.color}</p>
          <p>Số lượng: ${product.quantity}</p>
          <button onclick="deleteProduct(${index})">Xóa</button>
        </div>
      `;
          productList.innerHTML += card;
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
        let color = document.getElementById("color").value;
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
            document.getElementById("product-form-popup").style.display =
              "none"; 
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
      document.getElementById("close-product-form-popup").onclick =
        function () {
          document.getElementById("product-form-popup").style.display = "none";
        };