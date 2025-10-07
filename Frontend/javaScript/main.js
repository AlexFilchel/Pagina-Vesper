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

  const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const formatPrice = (value) => currencyFormatter.format(value);

  function parsePriceValue(value) {
    if (typeof value === "number") return value;
    if (typeof value !== "string") return 0;

    const cleaned = value
      .trim()
      .replace(/[^\d.,-]/g, "")
      .replace(/\./g, "")
      .replace(/,/g, ".");

    const numeric = Number.parseFloat(cleaned);
    return Number.isFinite(numeric) ? numeric : 0;
  }

  function mergeDatasetData(...datasets) {
    return datasets.reduce((acc, data) => {
      if (!data) return acc;
      Object.entries(data).forEach(([key, value]) => {
        if (value == null || value === "" || acc[key]) return;
        acc[key] = value;
      });
      return acc;
    }, {});
  }

  function slugify(value) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function extractProductData(trigger) {
    if (!trigger) return null;

    const context = trigger.closest?.("[data-product-id], [data-product-name], [data-product]");
    const datasets = [trigger.dataset, context?.dataset];
    const data = mergeDatasetData(...datasets);

    const rawName = data.productName || data.name || trigger.getAttribute("aria-label") || null;
    const name = typeof rawName === "string" ? rawName.trim() : rawName;
    if (!name) {
      console.warn("No se pudo determinar el nombre del producto para el carrito.");
      return null;
    }

    const idBase = data.productId || data.id || slugify(name);
    let price = parsePriceValue(data.productPrice || data.price || trigger.getAttribute("data-price") || "");
    if (!price && context && typeof context.querySelector === "function") {
      const priceElement =
        context.querySelector("[data-product-price]") ||
        context.querySelector(".price, .product-price, .product__price");
      const priceText = priceElement?.textContent ?? "";
      price = parsePriceValue(priceText);
    }

    const originalPrice = parsePriceValue(data.productOriginalPrice || data.originalPrice || "");
    const subtitle = (data.productSubtitle || data.subtitle || context?.querySelector?.(".product-subtitle")?.textContent || "").trim();
    const image = data.productImage || data.image || context?.querySelector?.("img")?.getAttribute?.("src") || "";
    const rawType = data.productType || data.type || data.category || context?.dataset?.productType || "";
    const type = typeof rawType === "string" && rawType.trim() ? rawType.trim() : "Producto";

    return {
      id: idBase,
      name,
      subtitle,
      price,
      originalPrice,
      image,
      type
    };
  }

  /* ===========================
     🔹 Ordenamiento de productos
  =========================== */
  const productosLista = document.getElementById("productos-lista");
  const sortDropdown = document.querySelector(".sort-dropdown");
  const sortTrigger = sortDropdown?.querySelector(".sort-dropdown__trigger");
  const sortMenu = sortDropdown?.querySelector(".sort-dropdown__menu");
  const sortLabel = sortTrigger?.querySelector(".sort-dropdown__label");
  const sortOptions = sortDropdown ? Array.from(sortDropdown.querySelectorAll(".sort-dropdown__option")) : [];
  const nameCollator = new Intl.Collator("es", { sensitivity: "base", ignorePunctuation: true });
  let activeSort = sortDropdown?.dataset?.activeSort || "";
  let isSortingProducts = false;

  function closeSortMenu() {
    if (!sortDropdown) return;
    sortDropdown.classList.remove("is-open");
    sortTrigger?.setAttribute("aria-expanded", "false");
  }

  function toggleSortMenu() {
    if (!sortDropdown) return;
    const willOpen = !sortDropdown.classList.contains("is-open");
    sortDropdown.classList.toggle("is-open", willOpen);
    sortTrigger?.setAttribute("aria-expanded", willOpen ? "true" : "false");
  }

  function getProductCards() {
    if (!productosLista) return [];
    return Array.from(productosLista.children).filter(child => child.classList?.contains("product"));
  }

  function getProductPrice(card) {
    if (!card) return 0;
    const datasetPrice = card.dataset?.productPrice || card.dataset?.price || card.getAttribute?.("data-product-price") || "";
    if (datasetPrice) {
      return parsePriceValue(datasetPrice);
    }

    const priceElement = card.querySelector?.("[data-product-price], .price, .product-price, .product__price");
    return priceElement ? parsePriceValue(priceElement.textContent || "") : 0;
  }

  function getProductName(card) {
    if (!card) return "";
    const datasetName = card.dataset?.productName || card.dataset?.name || card.getAttribute?.("data-product-name");
    if (datasetName) {
      return datasetName.trim();
    }

    const nameElement = card.querySelector?.(".product-title, .product__title, h3, h2, .product-name");
    return nameElement?.textContent?.trim() ?? "";
  }

  const sortComparators = {
    "price-asc": (a, b) => getProductPrice(a) - getProductPrice(b),
    "price-desc": (a, b) => getProductPrice(b) - getProductPrice(a),
    "name-asc": (a, b) => nameCollator.compare(getProductName(a), getProductName(b)),
    "name-desc": (a, b) => nameCollator.compare(getProductName(b), getProductName(a))
  };

  function updateSortOptions(criteria, { updateActiveOption = true } = {}) {
    if (!sortOptions.length) return;
    sortOptions.forEach(option => {
      const isActive = option.dataset.sort === criteria;
      option.classList.toggle("is-active", isActive);
      option.setAttribute("aria-selected", isActive ? "true" : "false");
      if (isActive && updateActiveOption) {
        sortLabel && (sortLabel.textContent = option.textContent.trim());
      }
    });
    if (!criteria && sortLabel) {
      sortLabel.textContent = "Ordenar";
    }
  }

  function applyProductSort(criteria, { updateActiveOption = true } = {}) {
    if (!productosLista || !criteria || !sortComparators[criteria]) {
      return;
    }

    const cards = getProductCards();
    if (!cards.length) {
      activeSort = criteria;
      updateSortOptions(criteria, { updateActiveOption });
      return;
    }

    isSortingProducts = true;
    const sortedCards = cards.slice().sort(sortComparators[criteria]);
    sortedCards.forEach(card => {
      productosLista.appendChild(card);
    });
    isSortingProducts = false;

    activeSort = criteria;
    sortDropdown?.setAttribute("data-active-sort", criteria);
    updateSortOptions(criteria, { updateActiveOption });
  }

  if (sortTrigger && sortMenu) {
    sortTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      toggleSortMenu();
    });

    document.addEventListener("click", (event) => {
      if (!sortDropdown?.contains(event.target)) {
        closeSortMenu();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeSortMenu();
      }
    });

    sortOptions.forEach(option => {
      option.addEventListener("click", () => {
        const criteria = option.dataset.sort;
        applyProductSort(criteria);
        closeSortMenu();
      });
    });

    updateSortOptions(activeSort, { updateActiveOption: true });
  }

  if (productosLista && sortOptions.length) {
    const observer = new MutationObserver(() => {
      if (isSortingProducts || !activeSort) return;
      applyProductSort(activeSort, { updateActiveOption: false });
    });

    observer.observe(productosLista, { childList: true });
  }

  /* ===========================
     🔹 Filtros responsive
  =========================== */
  const filtersPanel = document.getElementById("filtros-panel");
  const filtersOverlay = document.getElementById("filtros-overlay");
  const filtersToggle = document.querySelector(".filters-toggle");
  const filtersClose = document.querySelector(".filtros-close");
  const mobileFiltersMedia = window.matchMedia("(max-width: 768px)");
  let filtersAreOpen = false;

  function updateFiltersAria() {
    if (!filtersPanel) return;
    const isMobile = mobileFiltersMedia.matches;
    const isHidden = !(filtersAreOpen && isMobile);
    filtersPanel.setAttribute("aria-hidden", isHidden ? "true" : "false");
    if (filtersOverlay) {
      filtersOverlay.setAttribute("aria-hidden", isHidden ? "true" : "false");
    }
  }

  function openFilters() {
    if (!filtersPanel || !mobileFiltersMedia.matches) return;
    filtersAreOpen = true;
    filtersPanel.classList.add("is-open");
    filtersToggle?.setAttribute("aria-expanded", "true");
    filtersOverlay?.classList.add("is-visible");
    document.body.classList.add("filters-modal-open");
    updateFiltersAria();
    requestAnimationFrame(() => {
      filtersPanel.focus({ preventScroll: true });
    });
  }

  function closeFilters({ restoreFocus = false } = {}) {
    if (!filtersPanel) return;
    filtersAreOpen = false;
    filtersPanel.classList.remove("is-open");
    filtersToggle?.setAttribute("aria-expanded", "false");
    filtersOverlay?.classList.remove("is-visible");
    document.body.classList.remove("filters-modal-open");
    updateFiltersAria();
    if (restoreFocus && filtersToggle) {
      filtersToggle.focus();
    }
  }

  function resetFiltersLayout() {
    if (!filtersPanel) return;

    if (!mobileFiltersMedia.matches) {
      filtersAreOpen = false;
      filtersPanel.classList.remove("is-open");
      filtersPanel.setAttribute("aria-hidden", "false");
      filtersOverlay?.classList.remove("is-visible");
      filtersOverlay?.setAttribute("aria-hidden", "true");
      filtersToggle?.setAttribute("aria-expanded", "false");
      document.body.classList.remove("filters-modal-open");
    } else {
      updateFiltersAria();
    }
  }

  filtersToggle?.addEventListener("click", () => {
    if (filtersAreOpen) {
      closeFilters();
    } else {
      openFilters();
    }
  });

  filtersClose?.addEventListener("click", () => closeFilters({ restoreFocus: true }));
  filtersOverlay?.addEventListener("click", () => closeFilters({ restoreFocus: true }));

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && filtersAreOpen && mobileFiltersMedia.matches) {
      closeFilters({ restoreFocus: true });
    }
  });

  if (typeof mobileFiltersMedia.addEventListener === "function") {
    mobileFiltersMedia.addEventListener("change", resetFiltersLayout);
  } else if (typeof mobileFiltersMedia.addListener === "function") {
    mobileFiltersMedia.addListener(resetFiltersLayout);
  }
  resetFiltersLayout();

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
        image: product.image || "",
        type: product.type || "Producto",
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

    const isMobileToast = window.matchMedia("(max-width: 720px)").matches;
    toastLayer.classList.toggle("cart-toast-layer--mobile", isMobileToast);

    if (!isMobileToast && cartTrigger) {
      const rect = cartTrigger.getBoundingClientRect();
      const scrollTop = window.scrollY || window.pageYOffset;
      const top = Math.max(rect.top + scrollTop - 10, 20);
      const right = Math.max(window.innerWidth - rect.right + 12, 12);
      toastLayer.style.setProperty("--toast-top", `${top}px`);
      toastLayer.style.setProperty("--toast-right", `${right}px`);
    } else {
      toastLayer.style.removeProperty("--toast-top");
      toastLayer.style.removeProperty("--toast-right");
    }

    const toast = document.createElement("div");
    toast.className = "cart-toast";

    const typeLabel = product.type ? product.type.charAt(0).toUpperCase() + product.type.slice(1) : "Producto";
    toast.innerHTML = `
      <p class="cart-toast__label">Agregaste ${typeLabel}</p>
      <strong>${product.name}</strong>
      <span>${formatPrice(product.price)}</span>
    `;

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

    const product = extractProductData(trigger);
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
