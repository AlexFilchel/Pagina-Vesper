document.addEventListener("DOMContentLoaded", () => {
  /* ===========================
     🔹 Carrusel Hero
  =========================== */
  const items = document.querySelectorAll(".hero .carousel-item");
  const indicators = document.querySelectorAll(".hero .carousel-indicators span");
  let index = 0;

  function showSlide(i) {
    items.forEach((item, idx) => {
      item.classList.toggle("active", idx === i);
      indicators[idx].classList.toggle("active", idx === i);
    });
    index = i;
  }

  if (items.length && indicators.length) {
    setInterval(() => {
      let next = (index + 1) % items.length;
      showSlide(next);
    }, 5000);

    indicators.forEach((dot, i) => {
      dot.addEventListener("click", () => {
        showSlide(i);
      });
    });
  }

  /* ===========================
     🔹 Modales (Login / Register)
  =========================== */
  const modalLogin = document.getElementById("modal-login");
  const modalRegister = document.getElementById("modal-register");

  const btnLogin = document.getElementById("btn-login");
  const btnRegister = document.getElementById("btn-register");

  if (btnLogin && modalLogin) {
    btnLogin.addEventListener("click", (e) => {
      e.preventDefault();
      modalLogin.classList.add("active");
    });
  }

  if (btnRegister && modalRegister) {
    btnRegister.addEventListener("click", (e) => {
      e.preventDefault();
      modalRegister.classList.add("active");
    });
  }

  // Cerrar modal con [x]
  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.close).classList.remove("active");
    });
  });

  // Cerrar modal al clickear overlay
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) {
        modal.classList.remove("active");
      }
    });
  });

  // Switch entre modales
  const switchToRegister = document.getElementById("switch-to-register");
  const switchToLogin = document.getElementById("switch-to-login");

  if (switchToRegister) {
    switchToRegister.addEventListener("click", (e) => {
      e.preventDefault();
      modalLogin.classList.remove("active");
      modalRegister.classList.add("active");
    });
  }

  if (switchToLogin) {
    switchToLogin.addEventListener("click", (e) => {
      e.preventDefault();
      modalRegister.classList.remove("active");
      modalLogin.classList.add("active");
    });
  }

  /* ===========================
     🔹 Mostrar / Ocultar Contraseña
  =========================== */
  document.querySelectorAll(".toggle-password").forEach(btn => {
    btn.addEventListener("click", () => {
      const target = document.getElementById(btn.dataset.target);
      const icon = btn.querySelector("i");

      if (target.type === "password") {
        target.type = "text";
        icon.classList.replace("fa-eye", "fa-eye-slash");
      } else {
        target.type = "password";
        icon.classList.replace("fa-eye-slash", "fa-eye");
      }
    });
  });

  /* ===========================
     🔹 Interacciones Mobile (menú & buscador)
  =========================== */
  const siteHeader = document.querySelector(".site-header");
  const menuToggle = document.querySelector(".menu-toggle");
  const mainNav = document.querySelector(".site-header__bottom");
  const searchToggle = document.querySelector(".search-toggle");
  const desktopSearchForm = document.querySelector(".site-header__search");
  const desktopSearchButton = desktopSearchForm?.querySelector("button");
  const mobileSearchOverlay = document.querySelector(".mobile-search-overlay");
  const mobileSearchInput = mobileSearchOverlay?.querySelector("input");
  const overlaySearchButton = mobileSearchOverlay?.querySelector("button");
  const accountDropdown = document.querySelector(".site-header__action--has-dropdown");
  const accountBtn = accountDropdown?.querySelector(".site-header__action-btn");
  const searchIconMaterial = searchToggle ? searchToggle.querySelector(".material-symbols-outlined") : null;
  const searchIconFontAwesome = searchToggle ? searchToggle.querySelector(".fa-solid") : null;

  if (overlaySearchButton && desktopSearchButton && desktopSearchButton.innerHTML.trim()) {
    overlaySearchButton.innerHTML = desktopSearchButton.innerHTML;
  }

  if (mobileSearchOverlay) {
    mobileSearchOverlay.setAttribute("aria-hidden", "true");
  }

  if (searchToggle) {
    searchToggle.setAttribute("aria-expanded", "false");
    searchToggle.setAttribute("aria-label", "Abrir buscador");
  }

  function setSearchIcon(isOpen) {
    if (searchIconMaterial) {
      searchIconMaterial.textContent = isOpen ? "close" : "search";
    }
    if (searchIconFontAwesome) {
      searchIconFontAwesome.classList.toggle("fa-magnifying-glass", !isOpen);
      searchIconFontAwesome.classList.toggle("fa-xmark", isOpen);
    }
  }

  function updateSearchOverlayPosition() {
    if (!mobileSearchOverlay) return;
    const headerRect = siteHeader?.getBoundingClientRect();
    if (headerRect) {
      mobileSearchOverlay.style.setProperty("--mobile-search-top", `${Math.max(headerRect.bottom, 0)}px`);
    }
  }

  function updateAccountMenuPosition() {
    if (!accountDropdown) return;
    const headerRect = siteHeader?.getBoundingClientRect();
    if (headerRect) {
      accountDropdown.style.setProperty("--mobile-account-top", `${Math.max(headerRect.bottom, 0)}px`);
    }
  }

  function openSearch() {
    if (mobileSearchOverlay) {
      updateSearchOverlayPosition();
      mobileSearchOverlay.classList.add("is-visible");
      mobileSearchOverlay.setAttribute("aria-hidden", "false");
    }
    siteHeader?.classList.add("is-search-open");
    setSearchIcon(true);
    if (searchToggle) {
      searchToggle.setAttribute("aria-expanded", "true");
      searchToggle.setAttribute("aria-label", "Cerrar buscador");
    }
    window.requestAnimationFrame(() => {
      mobileSearchInput?.focus();
    });
  }

  function closeSearch() {
    if (mobileSearchOverlay) {
      mobileSearchOverlay.classList.remove("is-visible");
      mobileSearchOverlay.setAttribute("aria-hidden", "true");
    }
    siteHeader?.classList.remove("is-search-open");
    setSearchIcon(false);
    if (searchToggle) {
      searchToggle.setAttribute("aria-expanded", "false");
      searchToggle.setAttribute("aria-label", "Abrir buscador");
    }
    if (mobileSearchInput) {
      mobileSearchInput.value = "";
    }
  }

  function closeMenu() {
    if (!mainNav) return;
    mainNav.classList.remove("is-open");
    siteHeader?.classList.remove("is-menu-open");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
    }

    document.querySelectorAll(".main-nav__item--has-dropdown").forEach(item => {
      item.classList.remove("is-open");
    });
  }

  function closeAccountDropdown() {
    if (!accountDropdown) return;
    accountDropdown.classList.remove("is-open");
  }

  const handleResize = () => {
    if (window.innerWidth >= 768) {
      closeSearch();
      closeMenu();
      closeAccountDropdown();
    } else {
      if (mobileSearchOverlay?.classList.contains("is-visible")) {
        updateSearchOverlayPosition();
      }
      if (accountDropdown?.classList.contains("is-open")) {
        updateAccountMenuPosition();
      }
    }
  };

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const willOpen = !mainNav.classList.contains("is-open");
      if (willOpen) {
        closeSearch();
        closeAccountDropdown();
      }
      mainNav.classList.toggle("is-open", willOpen);
      siteHeader?.classList.toggle("is-menu-open", willOpen);
      menuToggle.setAttribute("aria-expanded", String(willOpen));
    });
  }

  /* ===========================
     🔹 Submenús en mobile (acordeón)
  =========================== */
  const navItems = document.querySelectorAll(".main-nav__item--has-dropdown");

  navItems.forEach(item => {
    const link = item.querySelector(".main-nav__link");
    if (!link) return;

    link.addEventListener("click", (e) => {
      if (window.innerWidth < 768) {
        e.preventDefault();
        item.classList.toggle("is-open");
      }
    });
  });

  if (searchToggle) {
    searchToggle.addEventListener("click", (event) => {
      event.preventDefault();
      if (window.innerWidth >= 768) return;

      const isOverlayVisible = mobileSearchOverlay?.classList.contains("is-visible") ?? siteHeader?.classList.contains("is-search-open");
      const willOpen = !isOverlayVisible;

      if (willOpen) {
        closeMenu();
        closeAccountDropdown();
        openSearch();
      } else {
        closeSearch();
      }
    });
  }

  if (accountBtn && accountDropdown) {
    accountBtn.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      const willOpen = !accountDropdown.classList.contains("is-open");
      if (willOpen) {
        closeMenu();
        closeSearch();
        updateAccountMenuPosition();
      }
      accountDropdown.classList.toggle("is-open", willOpen);
    });
  }

  if (accountDropdown) {
    accountDropdown.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        closeAccountDropdown();
      });
    });
  }

  document.addEventListener("click", (event) => {
    if (accountDropdown && !accountDropdown.contains(event.target)) {
      closeAccountDropdown();
    }

    if (mobileSearchOverlay?.classList.contains("is-visible")) {
      const clickedInsideSearch = mobileSearchOverlay.contains(event.target);
      const clickedToggle = searchToggle?.contains(event.target) ?? false;
      if (!clickedInsideSearch && !clickedToggle) {
        closeSearch();
      }
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSearch();
      closeAccountDropdown();
      if (window.innerWidth < 768) {
        closeMenu();
      }
    }
  });

  window.addEventListener("scroll", () => {
    if (window.innerWidth >= 768) return;

    if (mobileSearchOverlay?.classList.contains("is-visible")) {
      updateSearchOverlayPosition();
    }
    if (accountDropdown?.classList.contains("is-open")) {
      updateAccountMenuPosition();
    }
  }, { passive: true });

  window.addEventListener("resize", handleResize);
  handleResize();

  /* ===========================
     🔹 Catálogo base
  =========================== */
  const productCatalog = [
    {
      id: "aurora-intense",
      name: "Aurora Intense",
      subtitle: "Eau de Parfum 100 ml",
      price: 48900,
      originalPrice: 54900,
      image: "img/perfume_carrusel_1.avif"
    },
    {
      id: "midnight-vape",
      name: "Midnight Clouds",
      subtitle: "Vape recargable 8K puffs",
      price: 32900,
      originalPrice: 0,
      image: "img/vape_carrusel_1.avif"
    },
    {
      id: "vesper-aurum",
      name: "Vesper Aurum",
      subtitle: "Decant exclusivo 10 ml",
      price: 12900,
      originalPrice: 14900,
      image: "img/perfumer_carrusel_2.avif"
    },
    {
      id: "blue-ember",
      name: "Blue Ember",
      subtitle: "Perfume masculino 90 ml",
      price: 45900,
      originalPrice: 0,
      image: "img/perfume_carrusel_1.avif"
    },
    {
      id: "rose-nebula",
      name: "Rose Nebula",
      subtitle: "Eau de parfum 60 ml",
      price: 37900,
      originalPrice: 41900,
      image: "img/categoria_perfumes_2.avif"
    },
    {
      id: "citrus-glow",
      name: "Citrus Glow",
      subtitle: "Decant cítrico 10 ml",
      price: 9900,
      originalPrice: 0,
      image: "img/categoria_perfumes_1.avif"
    }
  ];

  const productsById = new Map(productCatalog.map(product => [product.id, product]));

  const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const formatPrice = (value) => currencyFormatter.format(value);

  const productList = document.getElementById("product-list");
  const productsGrid = document.getElementById("productos-lista");

  function buildProductCard(product) {
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    const originalMarkup = hasDiscount ? `<span class="discount">${formatPrice(product.originalPrice)}</span>` : "";

    return `
      <article class="product" data-product-id="${product.id}">
        <img src="${product.image}" alt="${product.name}">
        <h3>${product.name}</h3>
        <p class="product-subtitle">${product.subtitle}</p>
        <div class="product-pricing">
          ${originalMarkup}
          <span class="price">${formatPrice(product.price)}</span>
        </div>
        <button type="button" class="btn btn--primary product__add" data-action="add-to-cart" data-product-id="${product.id}">
          Agregar al carrito
        </button>
      </article>
    `;
  }

  function renderProductCollections() {
    if (productList) {
      const featuredMarkup = productCatalog.slice(0, 4).map(buildProductCard).join("");
      productList.innerHTML = featuredMarkup;
    }

    if (productsGrid) {
      productsGrid.innerHTML = productCatalog.map(buildProductCard).join("");
    }
  }

  renderProductCollections();

  /* ===========================
     🔹 Carrito modal
  =========================== */
  const FREE_SHIPPING_THRESHOLD = 50000;
  const cartModal = document.getElementById("cart-modal");
  const cartPanel = cartModal?.querySelector(".cart-modal__panel");
  const cartOverlay = cartModal?.querySelector(".cart-modal__overlay");
  const cartCloseBtn = cartModal?.querySelector(".cart-modal__close");
  const cartItemsContainer = cartModal?.querySelector("#cart-items");
  const cartEmptyState = cartModal?.querySelector("#cart-empty-state");
  const shippingSection = cartModal?.querySelector("#shipping-section");
  const shippingForm = cartModal?.querySelector("#shipping-form");
  const shippingInput = cartModal?.querySelector("#shipping-zip");
  const shippingResult = cartModal?.querySelector("#shipping-result");
  const summarySection = cartModal?.querySelector("#summary-section");
  const summaryCount = cartModal?.querySelector("#summary-count");
  const summarySubtotal = cartModal?.querySelector("#summary-subtotal");
  const summaryTotal = cartModal?.querySelector("#summary-total");
  const summaryShippingNote = cartModal?.querySelector("#summary-shipping-note");
  const summaryPrimary = cartModal?.querySelector(".summary-actions__primary");
  const summarySecondary = cartModal?.querySelector(".summary-actions__secondary");
  const emptyCta = cartModal?.querySelector(".cart-empty-state__cta");
  const cartTrigger = document.getElementById("link-carrito");
  const cartCountBadge = document.getElementById("cart-count");
  const toastLayer = document.querySelector(".cart-toast-layer");

  const cartState = {
    items: [],
    shippingInfo: null
  };

  if (cartPanel) {
    cartPanel.setAttribute("tabindex", "-1");
  }

  if (cartTrigger) {
    cartTrigger.setAttribute("aria-expanded", "false");
  }

  function getSubtotal() {
    return cartState.items.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }

  function updateCartCount() {
    const totalItems = cartState.items.reduce((acc, item) => acc + item.quantity, 0);
    if (cartCountBadge) {
      cartCountBadge.textContent = String(totalItems);
    }
    if (cartTrigger) {
      const label = totalItems === 1 ? "Abrir carrito (1 producto)" : `Abrir carrito (${totalItems} productos)`;
      cartTrigger.setAttribute("aria-label", label);
    }
  }

  function buildCartItemsMarkup() {
    return cartState.items.map(item => {
      const hasDiscount = item.originalPrice && item.originalPrice > item.price;
      const originalMarkup = hasDiscount ? `<span class="cart-item__price-original">${formatPrice(item.originalPrice)}</span>` : "";
      return `
        <article class="cart-item" data-id="${item.id}">
          <button type="button" class="cart-item__remove" data-id="${item.id}" aria-label="Eliminar ${item.name}">🗑️</button>
          <div class="cart-item__media">
            <img src="${item.image}" alt="${item.name}">
          </div>
          <div class="cart-item__info">
            <h4>${item.name}</h4>
            <p class="cart-item__subtitle">${item.subtitle}</p>
            <div class="cart-item__prices">
              ${originalMarkup}
              <span class="cart-item__price">${formatPrice(item.price)}</span>
            </div>
            <div class="cart-item__footer">
              <div class="cart-item__quantity" aria-label="Modificar cantidad">
                <button type="button" class="cart-item__qty-btn" data-action="decrease" data-id="${item.id}" aria-label="Disminuir cantidad de ${item.name}">-</button>
                <span class="cart-item__qty-value" aria-live="polite">${item.quantity}</span>
                <button type="button" class="cart-item__qty-btn" data-action="increase" data-id="${item.id}" aria-label="Aumentar cantidad de ${item.name}">+</button>
              </div>
              <div class="cart-item__total">${formatPrice(item.price * item.quantity)}</div>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function updateSummary() {
    if (!cartModal) return;

    const totalItems = cartState.items.reduce((acc, item) => acc + item.quantity, 0);
    const subtotal = getSubtotal();

    if (summaryCount) {
      summaryCount.textContent = totalItems === 1 ? "1 producto" : `${totalItems} productos`;
    }

    if (summarySubtotal) {
      summarySubtotal.textContent = formatPrice(subtotal);
    }

    let shippingCost = 0;

    if (cartState.shippingInfo) {
      const baseCost = cartState.shippingInfo.baseCost;
      shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : baseCost;

      if (shippingResult) {
        shippingResult.textContent = shippingCost === 0
          ? `¡Envío gratis a CP ${cartState.shippingInfo.zip}!`
          : `Envío estimado a CP ${cartState.shippingInfo.zip}: ${formatPrice(shippingCost)}.`;
      }

      if (summaryShippingNote) {
        summaryShippingNote.textContent = shippingCost === 0
          ? "Incluye envío gratis"
          : `Incluye envío de ${formatPrice(shippingCost)}`;
      }
    } else if (shippingResult) {
      shippingResult.textContent = cartState.items.length
        ? "Ingresá tu código postal para conocer el envío estimado."
        : "";
      if (summaryShippingNote) {
        summaryShippingNote.textContent = "Envío a calcular";
      }
    }

    if (summaryTotal) {
      summaryTotal.textContent = formatPrice(subtotal + shippingCost);
    }
  }

  function renderCart() {
    if (!cartModal) return;

    const hasItems = cartState.items.length > 0;

    if (cartEmptyState) {
      cartEmptyState.classList.toggle("is-visible", !hasItems);
    }

    if (cartItemsContainer) {
      cartItemsContainer.innerHTML = hasItems ? buildCartItemsMarkup() : "";
    }

    shippingSection?.classList.toggle("is-visible", hasItems);
    summarySection?.classList.toggle("is-visible", hasItems);

    if (!hasItems) {
      cartState.shippingInfo = null;
    }

    updateCartCount();
    updateSummary();
  }

  function openCart() {
    if (!cartModal) return;
    cartModal.classList.add("is-open");
    cartModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("is-cart-open");
    cartTrigger?.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => {
      cartPanel?.focus();
    });
  }

  function closeCart() {
    if (!cartModal) return;
    cartModal.classList.remove("is-open");
    cartModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("is-cart-open");
    cartTrigger?.setAttribute("aria-expanded", "false");
  }

  function addToCart(product) {
    const existing = cartState.items.find(item => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cartState.items.push({
        id: product.id,
        name: product.name,
        subtitle: product.subtitle,
        price: product.price,
        originalPrice: product.originalPrice,
        image: product.image,
        quantity: 1
      });
    }

    renderCart();
    showCartToast(product);
  }

  function removeFromCart(productId) {
    cartState.items = cartState.items.filter(item => item.id !== productId);
    if (cartState.items.length === 0) {
      cartState.shippingInfo = null;
    }
    renderCart();
  }

  function changeQuantity(productId, delta) {
    const target = cartState.items.find(item => item.id === productId);
    if (!target) return;

    target.quantity += delta;

    if (target.quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    renderCart();
  }

  function calculateShippingBase(zipDigits) {
    const firstDigit = parseInt(zipDigits[0] ?? "0", 10);
    if (Number.isNaN(firstDigit)) {
      return 3200;
    }
    if (firstDigit >= 7) return 3600;
    if (firstDigit >= 4) return 3300;
    return 2900;
  }

  function handleShipping(event) {
    event.preventDefault();
    if (!shippingInput) return;

    if (cartState.items.length === 0) {
      if (shippingResult) {
        shippingResult.textContent = "Agrega productos para calcular el envío.";
      }
      return;
    }

    const rawValue = shippingInput.value.trim();
    const digits = rawValue.replace(/\D/g, "");

    if (digits.length < 4 || digits.length > 5) {
      if (shippingResult) {
        shippingResult.textContent = "Ingresá un código postal válido.";
      }
      return;
    }

    const baseCost = calculateShippingBase(digits);
    cartState.shippingInfo = {
      zip: digits,
      baseCost
    };

    updateSummary();
  }

  function showCartToast(product) {
    if (!toastLayer) return;

    while (toastLayer.children.length >= 3) {
      toastLayer.removeChild(toastLayer.firstElementChild);
    }

    const toast = document.createElement("div");
    toast.className = "cart-toast";
    toast.innerHTML = `<strong>${product.name}</strong><span>${formatPrice(product.price)}</span>`;

    if (cartTrigger) {
      const rect = cartTrigger.getBoundingClientRect();
      const scrollTop = window.scrollY || window.pageYOffset;
      const top = Math.max(rect.top + scrollTop - 10, 20);
      const right = Math.max(window.innerWidth - rect.right + 12, 12);
      toastLayer.style.setProperty("--toast-top", `${top}px`);
      toastLayer.style.setProperty("--toast-right", `${right}px`);
    }

    toastLayer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => {
        toast.remove();
      }, 300);
    }, 3200);
  }

  renderCart();

  if (cartTrigger) {
    cartTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      openCart();
    });
  }

  cartOverlay?.addEventListener("click", closeCart);
  cartCloseBtn?.addEventListener("click", closeCart);
  emptyCta?.addEventListener("click", closeCart);
  summarySecondary?.addEventListener("click", closeCart);

  summaryPrimary?.addEventListener("click", () => {
    if (!cartState.items.length) return;
    closeCart();
  });

  shippingForm?.addEventListener("submit", handleShipping);

  cartItemsContainer?.addEventListener("click", (event) => {
    const target = event.target;
    const removeButton = target.closest?.(".cart-item__remove");
    if (removeButton) {
      removeFromCart(removeButton.dataset.id);
      return;
    }

    const qtyButton = target.closest?.(".cart-item__qty-btn");
    if (qtyButton) {
      const action = qtyButton.dataset.action;
      if (action === "increase") {
        changeQuantity(qtyButton.dataset.id, 1);
      } else if (action === "decrease") {
        changeQuantity(qtyButton.dataset.id, -1);
      }
    }
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target.closest?.("[data-action='add-to-cart']");
    if (!trigger) return;

    const productId = trigger.dataset.productId;
    const product = productId ? productsById.get(productId) : null;
    if (product) {
      addToCart(product);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && cartModal?.classList.contains("is-open")) {
      closeCart();
    }
  });

/* ===========================
   🔹 Sombra dinámica del header
=========================== */
const header = document.querySelector(".site-header");
const navBottom = document.querySelector(".site-header__bottom");

if (header && navBottom) {
  // Solo en desktop
  if (window.innerWidth >= 768) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 🔹 Categorías visibles → sombra en .site-header__bottom
            navBottom.classList.add("has-shadow");
            header.classList.remove("has-shadow");
          } else {
            // 🔹 Categorías NO visibles → sombra en .site-header
            navBottom.classList.remove("has-shadow");
            header.classList.add("has-shadow");
          }
        });
      },
      { threshold: 0.01 }
    );

    observer.observe(navBottom);
  }
}

});
