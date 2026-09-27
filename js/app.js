(() => {
  const SHIPPING_FEE = 550;
  const FREE_SHIPPING_THRESHOLD = 5000;
  const COD_FEE = 330;
  const CART_KEY = "tshirt-store-cart";

  const $ = (sel) => document.querySelector(sel);
  const yen = (n) => "¥" + n.toLocaleString("ja-JP");

  // ---------- カートの保存 ----------
  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch {
      return [];
    }
  }
  function saveCart() {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // ストレージが使えない環境ではメモリ上のみで保持
    }
  }
  let cart = loadCart();

  // ---------- Tシャツ画像（SVG） ----------
  function shirtSvg(product) {
    const dark = isDark(product.color);
    const ink = dark ? "#ffffff" : "#222222";
    const printMark = {
      LOGO: `<text x="100" y="95" text-anchor="middle" font-size="16" font-weight="700" fill="${ink}" font-family="sans-serif">T-SHIRT</text>`,
      SUN: `<circle cx="100" cy="100" r="22" fill="#e8743b"/><rect x="70" y="104" width="60" height="16" fill="${product.color}"/><line x1="70" y1="104" x2="130" y2="104" stroke="#8a3b12" stroke-width="3"/>`,
      OPEN: `<text x="100" y="98" text-anchor="middle" font-size="20" font-weight="800" fill="#ffffff" font-family="sans-serif">OPEN</text><text x="100" y="116" text-anchor="middle" font-size="9" fill="#ffffff" font-family="sans-serif">SINCE 2026</text>`
    }[product.print] || "";
    return `
      <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${product.name}">
        <path d="M60 30 L80 22 Q100 38 120 22 L140 30 L175 55 L158 80 L142 70 L142 178 L58 178 L58 70 L42 80 L25 55 Z"
          fill="${product.color}" stroke="#00000022" stroke-width="2" stroke-linejoin="round"/>
        ${printMark}
      </svg>`;
  }
  function isDark(hex) {
    const n = parseInt(hex.slice(1), 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return 0.299 * r + 0.587 * g + 0.114 * b < 128;
  }

  // ---------- 商品一覧 ----------
  function renderProducts(category = "all") {
    const list = category === "all" ? PRODUCTS : PRODUCTS.filter((p) => p.category === category);
    $("#productGrid").innerHTML = list.map((p) => `
      <article class="product-card" data-id="${p.id}" tabindex="0">
        <div class="product-image">${shirtSvg(p)}</div>
        <div class="product-body">
          <span class="tag tag-${p.category}">${CATEGORY_LABELS[p.category]}</span>
          <h3>${p.name}</h3>
          <p class="price">${yen(p.price)} <small>(税込)</small></p>
        </div>
      </article>`).join("");
  }

  $("#filters").addEventListener("click", (e) => {
    const btn = e.target.closest(".filter");
    if (!btn) return;
    document.querySelectorAll(".filter").forEach((b) => b.classList.toggle("active", b === btn));
    renderProducts(btn.dataset.category);
  });

  $("#productGrid").addEventListener("click", (e) => {
    const card = e.target.closest(".product-card");
    if (card) openProduct(card.dataset.id);
  });
  $("#productGrid").addEventListener("keydown", (e) => {
    const card = e.target.closest(".product-card");
    if (card && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      openProduct(card.dataset.id);
    }
  });

  // ---------- 商品詳細 ----------
  let currentProduct = null;
  let selectedSize = null;

  function openProduct(id) {
    currentProduct = PRODUCTS.find((p) => p.id === id);
    selectedSize = null;
    $("#modalImage").innerHTML = shirtSvg(currentProduct);
    $("#modalTitle").textContent = currentProduct.name;
    $("#modalPrice").textContent = yen(currentProduct.price) + "（税込）";
    $("#modalDesc").textContent = currentProduct.description;
    $("#qtyInput").value = 1;
    $("#sizeOptions").innerHTML = currentProduct.sizes
      .map((s) => `<button type="button" class="size" data-size="${s}">${s}</button>`).join("");
    show("#productModal");
  }

  $("#sizeOptions").addEventListener("click", (e) => {
    const btn = e.target.closest(".size");
    if (!btn) return;
    selectedSize = btn.dataset.size;
    document.querySelectorAll(".size").forEach((b) => b.classList.toggle("active", b === btn));
  });

  $("#addToCart").addEventListener("click", () => {
    if (!selectedSize) {
      toast("サイズを選択してください");
      return;
    }
    const qty = Math.min(10, Math.max(1, parseInt($("#qtyInput").value, 10) || 1));
    const existing = cart.find((i) => i.id === currentProduct.id && i.size === selectedSize);
    if (existing) existing.qty = Math.min(10, existing.qty + qty);
    else cart.push({ id: currentProduct.id, size: selectedSize, qty });
    saveCart();
    updateCart();
    hide("#productModal");
    toast("カートに追加しました");
  });

  // ---------- カート ----------
  function totals() {
    const subtotal = cart.reduce((sum, i) => sum + productOf(i).price * i.qty, 0);
    const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
    return { subtotal, shipping, total: subtotal + shipping };
  }
  function productOf(item) {
    return PRODUCTS.find((p) => p.id === item.id);
  }

  function updateCart() {
    cart = cart.filter((i) => productOf(i));
    const count = cart.reduce((n, i) => n + i.qty, 0);
    $("#cartCount").textContent = count;

    $("#cartItems").innerHTML = cart.length === 0
      ? `<p class="empty">カートに商品が入っていません</p>`
      : cart.map((item, idx) => {
          const p = productOf(item);
          return `
            <div class="cart-item">
              <div class="cart-thumb">${shirtSvg(p)}</div>
              <div class="cart-info">
                <p class="cart-name">${p.name}</p>
                <p class="cart-meta">サイズ：${item.size} / ${yen(p.price)}</p>
                <div class="qty-control">
                  <button data-action="dec" data-idx="${idx}" aria-label="減らす">−</button>
                  <span>${item.qty}</span>
                  <button data-action="inc" data-idx="${idx}" aria-label="増やす">＋</button>
                  <button class="remove" data-action="remove" data-idx="${idx}">削除</button>
                </div>
              </div>
            </div>`;
        }).join("");

    const t = totals();
    $("#subtotal").textContent = yen(t.subtotal);
    $("#shipping").textContent = t.shipping === 0 && t.subtotal > 0 ? "無料" : yen(t.shipping);
    $("#total").textContent = yen(t.total);
    $("#checkoutBtn").disabled = cart.length === 0;
  }

  $("#cartItems").addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const item = cart[+btn.dataset.idx];
    if (btn.dataset.action === "inc") item.qty = Math.min(10, item.qty + 1);
    if (btn.dataset.action === "dec") item.qty -= 1;
    if (btn.dataset.action === "remove" || item.qty <= 0) cart.splice(+btn.dataset.idx, 1);
    saveCart();
    updateCart();
  });

  $("#cartOpen").addEventListener("click", () => show("#cartDrawer"));
  document.querySelectorAll("[data-close-cart]").forEach((el) =>
    el.addEventListener("click", () => hide("#cartDrawer")));

  // ---------- 注文 ----------
  function checkoutTotal() {
    const payment = $("#checkoutForm").payment.value;
    return totals().total + (payment === "cod" ? COD_FEE : 0);
  }

  $("#checkoutBtn").addEventListener("click", () => {
    hide("#cartDrawer");
    $("#checkoutForm").hidden = false;
    $("#orderComplete").hidden = true;
    $("#checkoutTotal").textContent = yen(checkoutTotal());
    show("#checkoutModal");
  });

  $("#checkoutForm").payment.addEventListener("change", () => {
    $("#checkoutTotal").textContent = yen(checkoutTotal());
  });

  $("#checkoutForm").addEventListener("submit", (e) => {
    e.preventDefault();
    // TODO: 決済サービス（Stripe など）や注文受付API と接続する
    const orderNo = "T" + Date.now().toString().slice(-8);
    $("#orderNumber").textContent = orderNo;
    $("#checkoutForm").hidden = true;
    $("#orderComplete").hidden = false;
    e.target.reset();
    cart = [];
    saveCart();
    updateCart();
  });

  // ---------- モーダル共通 ----------
  function show(sel) {
    $(sel).hidden = false;
    document.body.classList.add("no-scroll");
  }
  function hide(sel) {
    $(sel).hidden = true;
    if (document.querySelectorAll(".modal:not([hidden]), .drawer:not([hidden])").length === 0) {
      document.body.classList.remove("no-scroll");
    }
  }
  document.querySelectorAll(".modal").forEach((modal) => {
    modal.addEventListener("click", (e) => {
      if (e.target.closest("[data-close]")) hide("#" + modal.id);
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    ["#productModal", "#checkoutModal", "#cartDrawer"].forEach(hide);
  });

  let toastTimer;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2000);
  }

  $("#year").textContent = new Date().getFullYear();
  renderProducts();
  updateCart();
})();
