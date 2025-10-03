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

  /* ===========================
     🔹 Datos de productos demo
  =========================== */
  const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  });

  const formatCurrency = (value) => currencyFormatter.format(value);

  const demoProducts = [
    {
      id: "vesper-aurora",
      name: "Aurora Nocturna",
      subtitle: "Fragancia femenina",
      price: 38500,
      originalPrice: 42900,
      image: "img/categoria_perfumes_1.avif"
    },
    {
      id: "vesper-orion",
      name: "Orion Intense",
      subtitle: "Perfume masculino",
      price: 41200,
      originalPrice: 45200,
      image: "img/categoria_perfumes_2.avif"
    },
    {
      id: "vesper-summit",
      name: "Summit Vapor",
      subtitle: "Vape sabor frutos rojos",
      price: 21500,
      originalPrice: 0,
      image: "img/categoria_vapes_1.avif"
    },
    {
      id: "vesper-lumen",
      name: "Lumen Deluxe",
      subtitle: "Decant 15ml",
      price: 13200,
      originalPrice: 14900,
      image: "img/categoria_perfumes_1.avif"
    },
    {
      id: "vesper-zenith",
      name: "Zenith Oud",
      subtitle: "Fragancia unisex",
      price: 47800,
      originalPrice: 51200,
      image: "img/categoria_perfumes_2.avif"
    },
    {
      id: "vesper-wave",
      name: "Wave Citrus",
      subtitle: "Vape edición limitada",
      price: 22800,
      originalPrice: 0,
      image: "img/categoria_vapes_1.avif"
    }
  ];

  const productListContainer = document.getElementById("product-list");
  const productsGrid = document.getElementById("productos-lista");

  const createProductCard = (product) => {
    const card = document.createElement("article");
    card.className = "product";

    const originalPrice = product.originalPrice && product.originalPrice > product.price
      ? `<p class="discount">${formatCurrency(product.originalPrice)}</p>`
      : "";

    card.innerHTML = `
      <img src="${product.image}" alt="${product.name}">
      <h3>${product.name}</h3>
      <p class="product-subtitle">${product.subtitle}</p>
      ${originalPrice}
      <p class="price">${formatCurrency(product.price)}</p>
      <button type="button" class="btn btn--primary product__add" data-add-to-cart
        data-product-id="${product.id}"
        data-product-name="${product.name}"
        data-product-subtitle="${product.subtitle}"
        data-product-price="${product.price}"
        data-product-original-price="${product.originalPrice ?? 0}"
        data-product-image="${product.image}">
        Agregar al carrito
      </button>
    `;

    return card;
  };

  if (productListContainer && productListContainer.children.length === 0) {
    demoProducts.slice(0, 4).forEach((product) => {
      productListContainer.appendChild(createProductCard(product));
    });
  }

  if (productsGrid && productsGrid.children.length === 0) {
    demoProducts.forEach((product) => {
      productsGrid.appendChild(createProductCard(product));
    });
  }

  /* ===========================
     🔹 Carrito de compras
  =========================== */
  const cartModal = document.getElementById("cart-modal");
  const cartTrigger = document.getElementById("link-carrito");
  const cartBadge = cartTrigger?.querySelector(".cart-badge");
  const cartItemsContainer = cartModal?.querySelector("[data-cart-items]");
  const cartContent = cartModal?.querySelector("[data-cart-content]");
  const emptyState = cartModal?.querySelector("[data-cart-empty]");
  const shippingSection = cartModal?.querySelector("[data-shipping-section]");
  const summarySection = cartModal?.querySelector("[data-summary-section]");
  const shippingForm = cartModal?.querySelector("[data-shipping-form]");
  const shippingResult = cartModal?.querySelector("[data-shipping-result]");
  const summaryCount = cartModal?.querySelector("[data-summary-count]");
  const summarySubtotal = cartModal?.querySelector("[data-summary-subtotal]");
  const summaryTotal = cartModal?.querySelector("[data-summary-total]");
  const summaryNote = cartModal?.querySelector("[data-summary-note]");
  const toastContainer = document.querySelector(".cart-toast-container");

  const cartState = {
    items: [],
    shippingCost: null,
    shippingPostalCode: null
  };

  let lastFocusedElement = null;

  const getCartQuantity = () => cartState.items.reduce((acc, item) => acc + item.quantity, 0);

  const updateCartBadge = () => {
    const totalQuantity = getCartQuantity();
    if (cartBadge) {
      cartBadge.textContent = String(totalQuantity);
    }
    if (cartTrigger) {
      if (totalQuantity > 0) {
        cartTrigger.setAttribute(
          "aria-label",
          `Abrir carrito (${totalQuantity} producto${totalQuantity === 1 ? "" : "s"})`
        );
      } else {
        cartTrigger.setAttribute("aria-label", "Abrir carrito");
      }
    }
  };

  const renderCartItems = () => {
    if (!cartItemsContainer) return;
    cartItemsContainer.innerHTML = "";

    cartState.items.forEach((item) => {
      const element = document.createElement("article");
      element.className = "cart-item";
      element.dataset.id = item.id;

      const originalPrice = item.originalPrice && item.originalPrice > item.price
        ? `<span class="cart-item__original">${formatCurrency(item.originalPrice)}</span>`
        : "";

      element.innerHTML = `
        <button class="cart-item__remove" type="button" data-action="remove" aria-label="Eliminar ${item.name}">🗑️</button>
        <div class="cart-item__media">
          <img src="${item.image}" alt="${item.name}">
        </div>
        <div class="cart-item__details">
          <h4 class="cart-item__title">${item.name}</h4>
          <p class="cart-item__subtitle">${item.subtitle ?? ""}</p>
          <div class="cart-item__prices">
            ${originalPrice}
            <span class="cart-item__price">${formatCurrency(item.price)}</span>
          </div>
          <div class="cart-item__controls">
            <div class="cart-item__quantity">
              <button type="button" data-action="decrease" aria-label="Restar uno">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-action="increase" aria-label="Sumar uno">+</button>
            </div>
            <span class="cart-item__total">${formatCurrency(item.quantity * item.price)}</span>
          </div>
        </div>
      `;

      cartItemsContainer.appendChild(element);
    });
  };

  const resetShippingState = () => {
    cartState.shippingCost = null;
    cartState.shippingPostalCode = null;
    if (shippingForm) {
      shippingForm.reset();
    }
    if (shippingResult) {
      shippingResult.textContent = "Calculá tu envío para conocer el costo.";
      shippingResult.classList.remove("shipping-result--error");
    }
  };

  const updateSummary = () => {
    if (!summaryCount || !summarySubtotal || !summaryTotal) return;
    const totalQuantity = getCartQuantity();
    const subtotal = cartState.items.reduce((acc, item) => acc + item.price * item.quantity, 0);

    summaryCount.textContent = `${totalQuantity} producto${totalQuantity === 1 ? "" : "s"}`;
    summarySubtotal.textContent = formatCurrency(subtotal);

    let total = subtotal;

    if (cartState.shippingCost != null) {
      total += cartState.shippingCost;
      if (summaryNote) {
        if (cartState.shippingCost === 0) {
          summaryNote.textContent = cartState.shippingPostalCode
            ? `Envío gratis para ${cartState.shippingPostalCode.toUpperCase()}.`
            : "Envío gratis.";
        } else {
          summaryNote.textContent = cartState.shippingPostalCode
            ? `Incluye envío estimado a ${cartState.shippingPostalCode.toUpperCase()}.`
            : "Incluye envío estimado.";
        }
      }
    } else if (summaryNote) {
      summaryNote.textContent = "Calculá el envío para ver el total final.";
    }

    summaryTotal.textContent = formatCurrency(total);
  };

  const updateCartUI = () => {
    const hasItems = cartState.items.length > 0;

    if (emptyState) {
      emptyState.hidden = hasItems;
    }
    if (cartContent) {
      cartContent.hidden = !hasItems;
    }
    if (shippingSection) {
      shippingSection.hidden = !hasItems;
    }
    if (summarySection) {
      summarySection.hidden = !hasItems;
    }

    if (hasItems) {
      renderCartItems();
      updateSummary();
    } else {
      if (cartItemsContainer) {
        cartItemsContainer.innerHTML = "";
      }
      resetShippingState();
    }
  };

  const openCart = () => {
    if (!cartModal) return;
    updateCartUI();
    cartModal.classList.add("is-open");
    cartModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("cart-open");
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = cartModal.querySelector(".cart-modal__panel");
    if (panel instanceof HTMLElement) {
      panel.focus();
    }
    if (cartTrigger) {
      cartTrigger.setAttribute("aria-expanded", "true");
    }
  };

  const closeCart = () => {
    if (!cartModal) return;
    cartModal.classList.remove("is-open");
    cartModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("cart-open");
    if (cartTrigger) {
      cartTrigger.setAttribute("aria-expanded", "false");
    }
    if (lastFocusedElement) {
      lastFocusedElement.focus();
    }
  };

  const showCartToast = (item) => {
    if (!toastContainer) return;
    const toast = document.createElement("div");
    toast.className = "cart-toast";

    const title = document.createElement("p");
    title.className = "cart-toast__title";
    title.textContent = `Agregaste ${item.name}`;

    const price = document.createElement("span");
    price.className = "cart-toast__price";
    price.textContent = formatCurrency(item.price);

    toast.appendChild(title);
    toast.appendChild(price);

    if (toastContainer.childElementCount >= 3) {
      toastContainer.removeChild(toastContainer.firstElementChild);
    }

    toastContainer.appendChild(toast);

    requestAnimationFrame(() => {
      toast.classList.add("is-visible");
    });

    setTimeout(() => {
      toast.classList.remove("is-visible");
      setTimeout(() => {
        toast.remove();
      }, 250);
    }, 3200);
  };

  const estimateShipping = (postalCode) => {
    const cleaned = postalCode.replace(/\s+/g, "");
    if (cleaned.length < 4) {
      return null;
    }

    let cost = 2400;
    const prefix = cleaned[0];

    if (prefix === "1") {
      cost = 0;
    } else if (prefix === "2" || prefix === "3") {
      cost = 1800;
    } else if (prefix === "4" || prefix === "5") {
      cost = 2100;
    }

    const message = cost === 0
      ? `Envío gratis para ${cleaned.toUpperCase()}.`
      : `Envío estimado a ${cleaned.toUpperCase()}: ${formatCurrency(cost)}.`;

    return { cost, message };
  };

  const addProductToCart = (product) => {
    const existing = cartState.items.find((item) => item.id === product.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cartState.items.push({
        ...product,
        quantity: 1
      });
    }
    updateCartBadge();
    updateCartUI();
    showCartToast(product);
  };

  cartTrigger?.addEventListener("click", (event) => {
    event.preventDefault();
    openCart();
  });

  cartModal?.addEventListener("click", (event) => {
    const closeTarget = event.target instanceof HTMLElement ? event.target.closest("[data-cart-close]") : null;
    if (closeTarget) {
      event.preventDefault();
      closeCart();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && cartModal?.classList.contains("is-open")) {
      closeCart();
    }
  });

  cartItemsContainer?.addEventListener("click", (event) => {
    const button = event.target instanceof HTMLElement ? event.target.closest("button[data-action]") : null;
    if (!button) return;
    const action = button.dataset.action;
    const itemElement = button.closest(".cart-item");
    if (!itemElement) return;
    const { id } = itemElement.dataset;
    if (!id) return;

    const item = cartState.items.find((entry) => entry.id === id);
    if (!item) return;

    if (action === "increase") {
      item.quantity += 1;
    } else if (action === "decrease") {
      if (item.quantity > 1) {
        item.quantity -= 1;
      } else {
        cartState.items = cartState.items.filter((entry) => entry.id !== id);
      }
    } else if (action === "remove") {
      cartState.items = cartState.items.filter((entry) => entry.id !== id);
    }

    updateCartBadge();
    updateCartUI();
  });

  shippingForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!shippingResult) return;

    const input = shippingForm.querySelector("input[name='postalCode']");
    const postalCode = input?.value.trim() ?? "";

    const estimation = estimateShipping(postalCode);
    if (!estimation) {
      shippingResult.textContent = "Ingresá un código postal válido.";
      shippingResult.classList.add("shipping-result--error");
      cartState.shippingCost = null;
      cartState.shippingPostalCode = null;
      updateSummary();
      return;
    }

    shippingResult.textContent = estimation.message;
    shippingResult.classList.remove("shipping-result--error");
    cartState.shippingCost = estimation.cost;
    cartState.shippingPostalCode = postalCode;
    updateSummary();
  });

  document.addEventListener("click", (event) => {
    const trigger = event.target instanceof HTMLElement ? event.target.closest("[data-add-to-cart]") : null;
    if (!trigger) return;
    event.preventDefault();

    const { productId, productName, productSubtitle, productPrice, productOriginalPrice, productImage } = trigger.dataset;
    if (!productId || !productName || !productPrice) return;

    const product = {
      id: productId,
      name: productName,
      subtitle: productSubtitle ?? "",
      price: Number(productPrice),
      originalPrice: Number(productOriginalPrice ?? 0),
      image: productImage ?? "img/categoria_perfumes_1.avif"
    };

    addProductToCart(product);
  });

  updateCartBadge();

});
