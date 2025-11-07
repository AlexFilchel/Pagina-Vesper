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
  const accountButton = document.getElementById("account-button");
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

  const handleResize = () => {
    if (window.innerWidth >= 768) {
      closeSearch();
      closeMenu();
    } else {
      if (mobileSearchOverlay?.classList.contains("is-visible")) {
        updateSearchOverlayPosition();
      }
    }
  };

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const willOpen = !mainNav.classList.contains("is-open");
      if (willOpen) {
        closeSearch();
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
        openSearch();
      } else {
        closeSearch();
      }
    });
  }

  document.addEventListener("click", (event) => {
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
  }, { passive: true });

  /* ===========================
     🔹 Modal de perfil de usuario
  =========================== */
  const profileModal = document.getElementById("profile-modal");
  const profileDialog = profileModal?.querySelector(".profile-modal__dialog");
  const profileForm = document.getElementById("profile-form");
  const profileLoading = document.getElementById("profile-loading");
  const profileFeedback = document.getElementById("profile-feedback");
  const profileSubmitBtn = document.getElementById("profile-submit");
  const profileLogoutBtn = document.getElementById("profile-logout");
  const profileFields = {
    username: document.getElementById("profile-username"),
    firstName: document.getElementById("profile-first-name"),
    lastName: document.getElementById("profile-last-name"),
    email: document.getElementById("profile-email"),
    dni: document.getElementById("profile-dni"),
    phone: document.getElementById("profile-phone")
  };

  const profileState = {
    isOpen: false,
    isLoading: false,
    data: null,
    lastFocusedElement: null,
    feedbackTimeout: null,
    loadingPromise: null
  };

  const focusableSelector = "a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex='-1'])";

  if (profileLoading) {
    profileLoading.hidden = true;
  }

  function clearProfileFeedback() {
    if (!profileFeedback) return;
    if (profileState.feedbackTimeout) {
      window.clearTimeout(profileState.feedbackTimeout);
      profileState.feedbackTimeout = null;
    }
    profileFeedback.textContent = "";
    profileFeedback.className = "profile-modal__feedback";
    profileFeedback.hidden = true;
  }

  function setProfileFeedback(message, type = "info") {
    if (!profileFeedback) return;
    if (profileState.feedbackTimeout) {
      window.clearTimeout(profileState.feedbackTimeout);
      profileState.feedbackTimeout = null;
    }

    profileFeedback.hidden = false;
    profileFeedback.textContent = message;
    profileFeedback.className = "profile-modal__feedback";
    if (type === "error") {
      profileFeedback.classList.add("profile-modal__feedback--error");
    } else if (type === "success") {
      profileFeedback.classList.add("profile-modal__feedback--success");
      profileState.feedbackTimeout = window.setTimeout(() => {
        clearProfileFeedback();
      }, 4000);
    }
  }

  function toggleEditableFieldsDisabled(disabled) {
    Object.values(profileFields).forEach((field) => {
      if (!field) return;
      if (field.dataset.static === "true") return;
      field.disabled = disabled;
    });
  }

  function setProfileLoading(isLoading, options = {}) {
    const { disableLogout = false } = options;
    if (!profileModal) return;
    profileModal.classList.toggle("is-loading", isLoading);
    if (profileForm) {
      profileForm.classList.toggle("is-disabled", isLoading);
      if (isLoading) {
        profileForm.setAttribute("aria-busy", "true");
      } else {
        profileForm.removeAttribute("aria-busy");
      }
    }
    toggleEditableFieldsDisabled(isLoading);
    if (profileSubmitBtn) {
      profileSubmitBtn.disabled = isLoading;
    }
    if (profileLogoutBtn) {
      profileLogoutBtn.disabled = disableLogout && isLoading;
    }
    if (profileLoading) {
      profileLoading.hidden = !isLoading;
    }
  }

  function resetProfileValidation() {
    Object.values(profileFields).forEach((field) => {
      field?.classList.remove("is-invalid");
    });
  }

  function fillProfileForm(data = {}) {
    if (!profileForm) return;
    const mapping = {
      username: data.username || data.userName || "",
      firstName: data.nombre || data.firstName || "",
      lastName: data.apellido || data.lastName || "",
      email: data.email || "",
      dni: data.dni || data.documento || "",
      phone: data.telefono || data.phone || ""
    };

    Object.entries(mapping).forEach(([key, value]) => {
      const field = profileFields[key];
      if (!field) return;
      field.value = value != null ? String(value) : "";
    });
  }

  function handleProfileFocusTrap(event) {
    if (!profileState.isOpen || event.key !== "Tab" || !profileDialog) return;
    const focusable = Array.from(profileDialog.querySelectorAll(focusableSelector))
      .filter((el) => !(el instanceof HTMLElement && el.hasAttribute("hidden")) && !el.closest("[hidden]") && el.offsetParent !== null);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus({ preventScroll: true });
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus({ preventScroll: true });
    }
  }

  function handleProfileKeydown(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeProfileModal();
      return;
    }
    handleProfileFocusTrap(event);
  }

  async function fetchProfileData(force = false) {
    if (!profileModal) return null;
    if (profileState.isLoading && profileState.loadingPromise) {
      return profileState.loadingPromise;
    }
    if (!force && profileState.data) {
      fillProfileForm(profileState.data);
      return profileState.data;
    }

    if (!window.apiClient || typeof window.apiClient.getUserProfile !== "function") {
      setProfileFeedback("No se pudo cargar la información del perfil.", "error");
      return null;
    }

    profileState.isLoading = true;
    setProfileLoading(true);
    clearProfileFeedback();
    resetProfileValidation();

    const loading = window.apiClient.getUserProfile()
      .then((data) => {
        profileState.data = data || null;
        if (data) {
          fillProfileForm(data);
        } else {
          setProfileFeedback("No se encontraron datos de perfil para mostrar.", "error");
        }
        return data;
      })
      .catch((error) => {
        console.error("❌ Error cargando perfil:", error);
        const message = error?.message || "No se pudo cargar tu perfil.";
        setProfileFeedback(message, "error");
        throw error;
      })
      .finally(() => {
        profileState.isLoading = false;
        profileState.loadingPromise = null;
        setProfileLoading(false);
      });

    profileState.loadingPromise = loading;
    return loading;
  }

  function openProfileModal() {
    if (!profileModal || profileState.isOpen) return;
    closeMenu();
    closeSearch();
    profileState.lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    profileState.isOpen = true;
    profileModal.classList.add("is-visible");
    profileModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    if (accountButton) {
      accountButton.setAttribute("aria-expanded", "true");
    }
    clearProfileFeedback();
    resetProfileValidation();
    window.requestAnimationFrame(() => {
      profileDialog?.focus({ preventScroll: true });
    });
    document.addEventListener("keydown", handleProfileKeydown);
    fetchProfileData(true).catch(() => {
      /* handled in fetchProfileData */
    });
  }

  function closeProfileModal() {
    if (!profileModal || !profileState.isOpen) return;
    profileState.isOpen = false;
    profileModal.classList.remove("is-visible");
    profileModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (accountButton) {
      accountButton.setAttribute("aria-expanded", "false");
    }
    document.removeEventListener("keydown", handleProfileKeydown);
    clearProfileFeedback();
    window.requestAnimationFrame(() => {
      profileState.lastFocusedElement?.focus?.({ preventScroll: true });
      profileState.lastFocusedElement = null;
    });
  }

  if (profileModal) {
    profileModal.querySelectorAll("[data-profile-close]").forEach((element) => {
      element.addEventListener("click", (event) => {
        event.preventDefault();
        closeProfileModal();
      });
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!profileForm) return;
      resetProfileValidation();
      const { valid, message } = validateProfileForm();
      if (!valid) {
        setProfileFeedback(message, "error");
        return;
      }

      if (!window.apiClient || typeof window.apiClient.updateUserProfile !== "function") {
        setProfileFeedback("Servicio de actualización de perfil no disponible.", "error");
        return;
      }

      const payload = {
        username: profileFields.username?.value?.trim() || undefined,
        nombre: profileFields.firstName?.value?.trim() || "",
        apellido: profileFields.lastName?.value?.trim() || "",
        email: profileFields.email?.value?.trim() || "",
        dni: profileFields.dni?.value?.trim() || "",
        telefono: profileFields.phone?.value?.trim() || ""
      };

      try {
        profileState.isLoading = true;
        setProfileLoading(true, { disableLogout: true });
        await window.apiClient.updateUserProfile(payload);
        profileState.data = { ...(profileState.data ?? {}), ...payload };
        setProfileFeedback("Tus datos se actualizaron correctamente.", "success");
      } catch (error) {
        console.error("❌ Error actualizando perfil:", error);
        const messageError = error?.message || "No se pudo actualizar tu perfil.";
        setProfileFeedback(messageError, "error");
      } finally {
        profileState.isLoading = false;
        setProfileLoading(false);
      }
    });

    profileForm.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        input.classList.remove("is-invalid");
        if (profileFeedback && profileFeedback.classList.contains("profile-modal__feedback--error")) {
          clearProfileFeedback();
        }
      });
    });
  }

  function validateProfileForm() {
    const requiredFields = [
      { field: profileFields.firstName, name: "Nombre" },
      { field: profileFields.lastName, name: "Apellido" },
      { field: profileFields.dni, name: "DNI" },
      { field: profileFields.phone, name: "Teléfono" }
    ];

    let message = "";

    requiredFields.forEach(({ field, name }) => {
      if (!field) return;
      if (!field.value.trim()) {
        field.classList.add("is-invalid");
        if (!message) {
          message = `El campo ${name} es obligatorio.`;
        }
      }
    });

    const dniValue = profileFields.dni?.value?.trim() ?? "";
    if (dniValue) {
      const numericDni = dniValue.replace(/[^0-9]/g, "");
      if (numericDni.length < 6) {
        profileFields.dni?.classList.add("is-invalid");
        message = message || "Ingresá un DNI válido (mínimo 6 números).";
      }
    }

    const phoneValue = profileFields.phone?.value?.trim() ?? "";
    if (phoneValue) {
      const numericPhone = phoneValue.replace(/[^0-9]/g, "");
      if (numericPhone.length < 6) {
        profileFields.phone?.classList.add("is-invalid");
        message = message || "Ingresá un teléfono válido.";
      }
    }

    return { valid: message === "", message: message || "" };
  }

  if (profileLogoutBtn) {
    profileLogoutBtn.addEventListener("click", (event) => {
      event.preventDefault();
      closeProfileModal();
      const client = window.auth0Client;
      if (client && typeof client.logout === "function") {
        client.logout({
          logoutParams: { returnTo: window.location.origin + "/Frontend/index.html" }
        });
      } else {
        window.location.href = window.location.origin + "/Frontend/index.html";
      }
    });
  }

  if (profileModal) {
    profileModal.setAttribute("aria-hidden", "true");
  }

  window.profileModalController = {
    open: openProfileModal,
    close: closeProfileModal,
    refresh: (force = true) => fetchProfileData(force)
  };

  window.addEventListener("resize", handleResize);
  handleResize();

  setupHeaderSearch();
  setupMenuFilters();

  const currencyFormatter = new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  const formatPrice = (value) => currencyFormatter.format(value);

  const TRANSFER_DISCOUNT_RATE = 0.15;
  const CART_STORAGE_KEY = "vesper.cart.v1";
  const FALLBACK_IMAGE_URL = "img/logo_vesper.jpg";

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

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function highlightElement(element, text, query) {
    if (!element) return;
    element.textContent = "";

    const safeText = typeof text === "string" ? text : "";
    const normalizedQuery = typeof query === "string" ? query.trim() : "";

    if (!normalizedQuery) {
      element.textContent = safeText;
      return;
    }

    try {
      const regex = new RegExp(escapeRegExp(normalizedQuery), "gi");
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(safeText)) !== null) {
        if (match.index > lastIndex) {
          element.appendChild(document.createTextNode(safeText.slice(lastIndex, match.index)));
        }
        const mark = document.createElement("mark");
        mark.textContent = match[0];
        element.appendChild(mark);
        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < safeText.length) {
        element.appendChild(document.createTextNode(safeText.slice(lastIndex)));
      }

      if (!element.childNodes.length) {
        element.textContent = safeText;
      }
    } catch (error) {
      console.warn("No se pudo resaltar el texto de búsqueda:", error);
      element.textContent = safeText;
    }
  }

  function calculateTransferPrice(value) {
    if (!Number.isFinite(value)) return value;
    const discounted = value * (1 - TRANSFER_DISCOUNT_RATE);
    return Math.round(discounted * 100) / 100;
  }

  const catalogCache = {
    promise: null,
    data: null
  };

  async function fetchCatalogData(force = false) {
    if (!force && catalogCache.data) {
      return catalogCache.data;
    }

    if (!catalogCache.promise || force) {
      const loadData = async () => {
        try {
          const perfumesPromise = window.apiClient?.fetchPerfumes?.()
            ?? fetch('http://localhost:8080/api/public/perfumes').then((res) => res.json());
          const vapesPromise = window.apiClient?.fetchVapes?.()
            ?? fetch('http://localhost:8080/api/public/vapes').then((res) => res.json());

          const [perfumes, vapes] = await Promise.all([perfumesPromise, vapesPromise]);
          const data = {
            perfumes: Array.isArray(perfumes) ? perfumes : [],
            vapes: Array.isArray(vapes) ? vapes : []
          };
          catalogCache.data = data;
          return data;
        } catch (error) {
          catalogCache.data = { perfumes: [], vapes: [] };
          throw error;
        } finally {
          catalogCache.promise = null;
        }
      };

      catalogCache.promise = loadData();
    }

    if (catalogCache.data && !force) {
      return catalogCache.data;
    }

    if (catalogCache.promise) {
      return catalogCache.promise;
    }

    return { perfumes: [], vapes: [] };
  }

  populateHeaderBrands();

  function getPrimaryImage(imagenes) {
    const pickFromValue = (value) => {
      if (typeof value === "string" && value.trim().length > 0) {
        return value.trim();
      }
      if (value && typeof value === "object") {
        const candidates = [
          value.url,
          value.imageUrl,
          value.imagenUrl,
          value.secureUrl,
          value.secure_url,
          value.link
        ];
        for (const candidate of candidates) {
          if (typeof candidate === "string" && candidate.trim().length > 0) {
            return candidate.trim();
          }
        }
        const nested = value.imagen ?? value.image ?? value.source;
        if (nested && nested !== value) {
          const nestedPick = pickFromValue(nested);
          if (nestedPick) {
            return nestedPick;
          }
        }
      }
      return null;
    };

    if (Array.isArray(imagenes)) {
      for (const item of imagenes) {
        const picked = pickFromValue(item);
        if (picked) {
          return picked;
        }
      }
      return FALLBACK_IMAGE_URL;
    }

    const single = pickFromValue(imagenes);
    return single ?? FALLBACK_IMAGE_URL;
  }

  function normalizePerfume(perfume) {
    const rawPrice = Number.parseFloat(perfume?.precio);
    const price = Number.isFinite(rawPrice) ? rawPrice : 0;
    const mlValue = Number.parseFloat(perfume?.ml);
    const type = perfume?.decant ? "decant" : "perfume";
    const genero = typeof perfume?.genero === "string" ? perfume.genero.toUpperCase() : "";
    const brand = typeof perfume?.marca === "string" ? perfume.marca.trim() : "";
    const name = typeof perfume?.nombre === "string" ? perfume.nombre.trim() : "";

    const haystack = [
      name,
      brand,
      perfume?.notasPrincipales ?? "",
      perfume?.descripcion ?? "",
      perfume?.inspiracion ?? "",
      perfume?.fragancia ?? ""
    ].join(" ").toLowerCase();

    return {
      key: `${type}-${perfume?.id ?? window.crypto?.randomUUID?.() ?? Date.now()}`,
      productId: perfume?.id ?? null,
      type,
      name,
      brand,
      description: perfume?.descripcion ?? "",
      genero,
      ml: Number.isFinite(mlValue) ? mlValue : null,
      decant: Boolean(perfume?.decant),
      notasPrincipales: perfume?.notasPrincipales ?? "",
      price,
      originalPrice: price,
      discountPrice: calculateTransferPrice(price),
      stock: Number.isFinite(perfume?.stock) ? perfume.stock : 0,
      image: getPrimaryImage(perfume?.imagenes),
      searchText: haystack,
      raw: perfume
    };
  }

  function normalizeVape(vape) {
    const rawPrice = Number.parseFloat(vape?.precio);
    const price = Number.isFinite(rawPrice) ? rawPrice : 0;
    const brand = typeof vape?.marca === "string" ? vape.marca.trim() : "";
    const name = typeof vape?.nombre === "string" ? vape.nombre.trim() : "";
    const sabores = Array.isArray(vape?.sabores) ? vape.sabores : [];
    const saboresTexto = sabores
      .map((sabor) => sabor?.nombre ?? sabor?.name ?? "")
      .join(" ");

    const haystack = [
      name,
      brand,
      vape?.descripcion ?? "",
      saboresTexto,
      vape?.modos ?? ""
    ].join(" ").toLowerCase();

    return {
      key: `vape-${vape?.id ?? window.crypto?.randomUUID?.() ?? Date.now()}`,
      productId: vape?.id ?? null,
      type: "vape",
      name,
      brand,
      description: vape?.descripcion ?? "",
      pitadas: Number.isFinite(vape?.pitadas) ? vape.pitadas : null,
      modos: vape?.modos ?? "",
      price,
      originalPrice: price,
      discountPrice: calculateTransferPrice(price),
      stock: Number.isFinite(vape?.stock) ? vape.stock : 0,
      image: getPrimaryImage(vape?.imagenes),
      sabores,
      searchText: haystack,
      raw: vape
    };
  }

  function normalizeFeaturedProduct(destacado) {
    const rawPrice = Number.parseFloat(destacado?.precio);
    const price = Number.isFinite(rawPrice) ? rawPrice : 0;
    const discountRaw = Number.parseFloat(destacado?.precioTransferencia);
    const discountPrice = Number.isFinite(discountRaw)
      ? discountRaw
      : calculateTransferPrice(price);

    const type = typeof destacado?.tipo === "string"
      ? destacado.tipo.toLowerCase()
      : "producto";
    const brand = typeof destacado?.marca === "string" ? destacado.marca.trim() : "";
    const name = typeof destacado?.nombre === "string" ? destacado.nombre.trim() : "";

    const imageSource = destacado?.imagenes ?? destacado?.producto?.imagenes ?? destacado?.productoImagenes ?? null;

    return {
      key: `destacado-${destacado?.id ?? window.crypto?.randomUUID?.() ?? Date.now()}`,
      destacadoId: destacado?.id ?? null,
      productId: destacado?.productoId ?? null,
      type,
      name,
      brand,
      description: destacado?.descripcion ?? "",
      genero: typeof destacado?.genero === "string" ? destacado.genero.toUpperCase() : "",
      ml: Number.isFinite(destacado?.ml) ? destacado.ml : null,
      pitadas: Number.isFinite(destacado?.pitadas) ? destacado.pitadas : null,
      price,
      originalPrice: price,
      discountPrice,
      stock: Number.isFinite(destacado?.stock) ? destacado.stock : 0,
      image: getPrimaryImage(imageSource),
      raw: destacado
    };
  }

  function buildProductCardElement(product, options = {}) {
    const {
      searchTerm = "",
      badge,
      showMeta = true
    } = options;

    const cartId = String(product?.key ?? `${product?.type ?? "producto"}-${product?.productId ?? Date.now()}`);
    const subtitleParts = [];
    if (Number.isFinite(product?.ml)) {
      subtitleParts.push(`${product.ml} ml`);
    }
    if (Number.isFinite(product?.pitadas)) {
      subtitleParts.push(`${product.pitadas} puffs`);
    }
    if (product?.genero) {
      const generoLabel = product.genero.charAt(0) + product.genero.slice(1).toLowerCase();
      subtitleParts.push(generoLabel);
    }
    const subtitleText = subtitleParts.join(" • ");

    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = cartId;
    card.dataset.productName = product?.name ?? "";
    card.dataset.productPrice = String(product?.price ?? 0);
    card.dataset.productOriginalPrice = String(product?.originalPrice ?? product?.price ?? 0);
    card.dataset.productType = product?.type ?? "producto";
    card.dataset.productImage = product?.image ?? FALLBACK_IMAGE_URL;
    if (subtitleText) {
      card.dataset.productSubtitle = subtitleText;
    }

    const figure = document.createElement("figure");
    figure.className = "product-card__figure";
    const image = document.createElement("img");
    image.src = product?.image ?? FALLBACK_IMAGE_URL;
    image.alt = `${product?.name ?? "Producto"} ${product?.brand ? `de ${product.brand}` : ""}`.trim();
    figure.appendChild(image);
    card.appendChild(figure);

    if (badge) {
      const badgeElement = document.createElement("span");
      badgeElement.className = "product-card__badge";
      badgeElement.textContent = badge;
      card.appendChild(badgeElement);
    } else if (product?.decant) {
      const badgeElement = document.createElement("span");
      badgeElement.className = "product-card__badge";
      badgeElement.textContent = "Decant";
      card.appendChild(badgeElement);
    }

    const body = document.createElement("div");
    body.className = "product-card__body";

    if (product?.brand) {
      const brand = document.createElement("p");
      brand.className = "product-card__brand";
      brand.textContent = product.brand;
      body.appendChild(brand);
    }

    const title = document.createElement("h3");
    title.className = "product-card__title";
    highlightElement(title, product?.name ?? "", searchTerm);
    body.appendChild(title);

    if (subtitleText) {
      const subtitle = document.createElement("p");
      subtitle.className = "product-card__subtitle";
      highlightElement(subtitle, subtitleText, searchTerm);
      body.appendChild(subtitle);
    }

    const prices = document.createElement("div");
    prices.className = "product-card__prices";
    const priceElement = document.createElement("span");
    priceElement.className = "product-card__price";
    priceElement.textContent = formatPrice(product?.price ?? 0);
    prices.appendChild(priceElement);

    const discountElement = document.createElement("span");
    discountElement.className = "product-card__discount";
    discountElement.innerHTML = `<span>15% OFF transferencia</span>`;
    prices.appendChild(discountElement);
    body.appendChild(prices);

    if (showMeta) {
      const meta = document.createElement("p");
      meta.className = "product-card__meta";
      const typeLabel = formatProductLabel(product?.type ?? "producto");
      const metaPieces = [typeLabel];
      if (Number.isFinite(product?.stock)) {
        metaPieces.push(`${product.stock} en stock`);
      }
      meta.textContent = metaPieces.join(" • ");
      body.appendChild(meta);
    }

    const actions = document.createElement("div");
    actions.className = "product-card__actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn--primary";
    button.dataset.action = "add-to-cart";
    button.dataset.productId = cartId;
    button.dataset.productName = product?.name ?? "";
    button.dataset.productPrice = String(product?.price ?? 0);
    button.dataset.productOriginalPrice = String(product?.price ?? 0);
    if (Number.isFinite(product?.discountPrice)) {
      button.dataset.productDiscount = String(product.discountPrice);
    }
    button.dataset.productType = product?.type ?? "producto";
    button.dataset.productSubtitle = subtitleText;
    button.dataset.productImage = product?.image ?? FALLBACK_IMAGE_URL;
    button.textContent = "Agregar al carrito";
    actions.appendChild(button);

    body.appendChild(actions);
    card.appendChild(body);

    return card;
  }

  function formatProductLabel(type) {
    switch ((type || "").toLowerCase()) {
      case "perfume":
        return "Perfume";
      case "decant":
        return "Decant";
      case "vape":
        return "Vape";
      default:
        return "Producto";
    }
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

  if (cartModal) {
    cartModal.classList.remove("is-open");
    cartModal.setAttribute("aria-hidden", "true");
  }

  const cartState = {
    items: [],
    shippingInfo: null
  };

  function loadCartFromStorage() {
    try {
      const stored = window.localStorage.getItem(CART_STORAGE_KEY);
      if (!stored) {
        return;
      }

      const parsed = JSON.parse(stored);
      if (!parsed || !Array.isArray(parsed.items)) {
        return;
      }

      cartState.items = parsed.items
        .map((item) => ({
          id: item?.id ?? slugify(item?.name ?? Date.now()),
          name: item?.name ?? "Producto",
          subtitle: item?.subtitle ?? "",
          price: Number.parseFloat(item?.price) || 0,
          originalPrice: Number.parseFloat(item?.originalPrice ?? item?.price) || 0,
          image: item?.image ?? FALLBACK_IMAGE_URL,
          type: item?.type ?? "Producto",
          quantity: Number.isFinite(item?.quantity) && item.quantity > 0 ? item.quantity : 1
        }));

      cartState.shippingInfo = parsed.shippingInfo ?? null;
    } catch (error) {
      console.warn("No se pudo cargar el carrito desde almacenamiento local:", error);
      cartState.items = [];
      cartState.shippingInfo = null;
    }
  }

  function persistCart() {
    try {
      const payload = {
        items: cartState.items.map((item) => ({
          id: item.id,
          name: item.name,
          subtitle: item.subtitle,
          price: item.price,
          originalPrice: item.originalPrice,
          image: item.image,
          type: item.type,
          quantity: item.quantity
        })),
        shippingInfo: cartState.shippingInfo
      };

      window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("No se pudo guardar el carrito:", error);
    }
  }

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
    persistCart();
    showCartToast(product);
  }

  function removeFromCart(productId) {
    cartState.items = cartState.items.filter(item => item.id !== productId);
    if (cartState.items.length === 0) {
      cartState.shippingInfo = null;
    }
    renderCart();
    persistCart();
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
    persistCart();
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
    persistCart();
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

  loadCartFromStorage();
  renderCart();

  if (cartTrigger) {
    cartTrigger.addEventListener("click", (event) => {
      event.preventDefault();
      openCart();
    });
  }

  cartOverlay?.addEventListener("click", closeCart);
  cartCloseBtn?.addEventListener("click", closeCart);
  emptyCta?.addEventListener("click", () => {
    window.location.href = "productos.html";
  });

  summarySecondary?.addEventListener("click", () => {
    window.location.href = "productos.html";
  });

  summaryPrimary?.addEventListener("click", () => {
    if (!cartState.items.length) return;
    persistCart();
    window.location.href = "checkout-entrega.html";
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
     🔹 Ordenamiento de productos
  =========================== */
  const productsContainer = document.getElementById("productos-lista");
  const sortDropdown = document.querySelector(".sort-dropdown");
  const sortButton = sortDropdown?.querySelector(".sort-button");
  const sortLabel = sortButton?.querySelector(".sort-button__label");
  const sortOptions = sortDropdown ? Array.from(sortDropdown.querySelectorAll(".sort-options button")) : [];
  const nameCollator = new Intl.Collator("es", { sensitivity: "base", numeric: true });

  function ensureOriginalOrder(items) {
    items.forEach((item, index) => {
      if (!item.dataset.originalIndex) {
        item.dataset.originalIndex = String(index);
      }
    });
  }

  function getProductPrice(element) {
    if (!element) return 0;

    const datasetKeys = ["price", "productPrice", "precio"];
    for (const key of datasetKeys) {
      const datasetValue = element.dataset?.[key];
      if (datasetValue != null && datasetValue !== "") {
        const parsed = Number.parseFloat(datasetValue);
        if (Number.isFinite(parsed)) {
          return parsed;
        }
      }
    }

    const priceElement = element.querySelector?.("[data-price], .price, .product-price, .product__price");
    if (priceElement) {
      const priceValue = priceElement.getAttribute?.("data-price") ?? priceElement.textContent ?? "";
      const parsed = parsePriceValue(priceValue);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return 0;
  }

  function getProductName(element) {
    if (!element) return "";

    const datasetKeys = ["name", "productName", "titulo", "productTitle"];
    for (const key of datasetKeys) {
      const datasetValue = element.dataset?.[key];
      if (typeof datasetValue === "string" && datasetValue.trim()) {
        return datasetValue.trim();
      }
    }

    const nameElement = element.querySelector?.("[data-product-name], .product-name, .product__title, h3, h2");
    if (nameElement) {
      const text = nameElement.textContent?.trim();
      if (text) {
        return text;
      }
    }

    const ariaLabel = element.getAttribute?.("aria-label");
    return ariaLabel ? ariaLabel.trim() : "";
  }

  function updateSortSelection(optionValue) {
    sortOptions.forEach((option) => {
      const isActive = option.dataset.sort === optionValue;
      option.classList.toggle("is-active", isActive);
      option.setAttribute("aria-selected", String(isActive));
    });
  }

  function sortProducts(criteria) {
    if (!productsContainer) return;

    const items = Array.from(productsContainer.children).filter((child) => child.nodeType === Node.ELEMENT_NODE);
    if (!items.length) return;

    ensureOriginalOrder(items);

    const sortedItems = items.slice().sort((a, b) => {
      const priceA = getProductPrice(a);
      const priceB = getProductPrice(b);
      const nameA = getProductName(a);
      const nameB = getProductName(b);
      const originalA = Number.parseInt(a.dataset.originalIndex ?? "0", 10);
      const originalB = Number.parseInt(b.dataset.originalIndex ?? "0", 10);

      switch (criteria) {
        case "price-asc":
          if (priceA !== priceB) {
            return priceA - priceB;
          }
          break;
        case "price-desc":
          if (priceA !== priceB) {
            return priceB - priceA;
          }
          break;
        case "name-asc": {
          const comparison = nameCollator.compare(nameA, nameB);
          if (comparison !== 0) {
            return comparison;
          }
          break;
        }
        case "name-desc": {
          const comparison = nameCollator.compare(nameB, nameA);
          if (comparison !== 0) {
            return comparison;
          }
          break;
        }
        default:
          break;
      }

      return originalA - originalB;
    });

    sortedItems.forEach((item) => {
      productsContainer.appendChild(item);
    });
  }

  function closeSortDropdown() {
    if (!sortDropdown || !sortButton) return;
    sortDropdown.classList.remove("is-open");
    sortButton.setAttribute("aria-expanded", "false");
  }

  function openSortDropdown() {
    if (!sortDropdown || !sortButton) return;
    sortDropdown.classList.add("is-open");
    sortButton.setAttribute("aria-expanded", "true");
  }

  if (sortButton && sortOptions.length) {
    sortOptions.forEach((option) => {
      option.setAttribute("aria-selected", "false");
      option.addEventListener("click", () => {
        const { sort } = option.dataset;
        if (!sort) return;

        updateSortSelection(sort);
        sortProducts(sort);
        if (sortLabel) {
          sortLabel.textContent = option.textContent?.trim() ? `Ordenar: ${option.textContent.trim()}` : "Ordenar";
        }
        closeSortDropdown();
      });
    });

    sortButton.addEventListener("click", () => {
      if (sortDropdown?.classList.contains("is-open")) {
        closeSortDropdown();
      } else {
        openSortDropdown();
      }
    });

    document.addEventListener("click", (event) => {
      if (!sortDropdown?.classList.contains("is-open")) return;
      const target = event.target;
      if (!sortDropdown.contains(target)) {
        closeSortDropdown();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && sortDropdown?.classList.contains("is-open")) {
        closeSortDropdown();
      }
    });
  }

  /* ===========================
     🔹 Filtros en modo mobile
  =========================== */
  const filtersPanel = document.getElementById("filters-panel");
  const filtersToggleButton = document.querySelector(".filters-toggle");
  const filtersCloseButton = filtersPanel?.querySelector(".filters-close");
  const filtersOverlay = document.getElementById("filters-overlay");
  const filtersMediaQuery = window.matchMedia("(max-width: 768px)");

  function setFiltersVisibility(isVisible) {
    if (!filtersPanel) return;
    filtersPanel.classList.toggle("is-open", isVisible);
    filtersPanel.setAttribute("aria-hidden", String(!isVisible));
    document.body.classList.toggle("filters-open", isVisible);

    if (filtersToggleButton) {
      filtersToggleButton.setAttribute("aria-expanded", String(isVisible));
    }

    if (filtersOverlay) {
      filtersOverlay.classList.toggle("is-visible", isVisible);
      filtersOverlay.setAttribute("aria-hidden", String(!isVisible));
    }
  }

  function openFilters() {
    setFiltersVisibility(true);
  }

  function closeFilters() {
    setFiltersVisibility(false);
  }

  function handleFiltersMediaChange(event) {
    if (!filtersPanel) return;
    if (event.matches) {
      // Mobile view
      filtersPanel.setAttribute("aria-hidden", "true");
      filtersPanel.classList.remove("is-open");
    } else {
      // Desktop view
      filtersPanel.setAttribute("aria-hidden", "false");
      filtersPanel.classList.remove("is-open");
      document.body.classList.remove("filters-open");
      filtersToggleButton?.setAttribute("aria-expanded", "false");
      if (filtersOverlay) {
        filtersOverlay.classList.remove("is-visible");
        filtersOverlay.setAttribute("aria-hidden", "true");
      }
    }
  }

  if (filtersPanel) {
    filtersPanel.setAttribute("aria-hidden", filtersMediaQuery.matches ? "true" : "false");
  }

  filtersToggleButton?.addEventListener("click", () => {
    if (filtersPanel?.classList.contains("is-open")) {
      closeFilters();
    } else {
      openFilters();
    }
  });

  filtersCloseButton?.addEventListener("click", closeFilters);
  filtersOverlay?.addEventListener("click", closeFilters);

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && filtersPanel?.classList.contains("is-open")) {
      closeFilters();
    }
  });

  filtersMediaQuery.addEventListener("change", handleFiltersMediaChange);
  handleFiltersMediaChange(filtersMediaQuery);

  /* ===========================
     🔹 Carrusel de beneficios (mobile)
  =========================== */
  const benefitsSection = document.querySelector(".benefits");
  const benefitsTrack = benefitsSection?.querySelector(".container");
  const benefitsIndicator = benefitsSection?.querySelector(".benefits__scroll-indicator");

  if (benefitsTrack && benefitsIndicator) {
    const mobileBenefitsQuery = window.matchMedia("(max-width: 768px)");

    const ensureStartPosition = () => {
      if (mobileBenefitsQuery.matches) {
        benefitsTrack.scrollLeft = 0;
      }
    };

    const toggleIndicator = () => {
      if (!mobileBenefitsQuery.matches) {
        benefitsIndicator.classList.add("is-hidden");
        return;
      }

      const { scrollLeft, scrollWidth, clientWidth } = benefitsTrack;
      const maxScroll = scrollWidth - clientWidth;
      const canScroll = maxScroll > 2;

      if (!canScroll) {
        benefitsIndicator.classList.add("is-hidden");
        return;
      }

      const isAtEnd = scrollLeft >= maxScroll - 2;
      benefitsIndicator.classList.toggle("is-hidden", isAtEnd);
    };

    const handleScroll = () => {
      window.requestAnimationFrame(toggleIndicator);
    };

    const handleResize = () => {
      window.requestAnimationFrame(toggleIndicator);
    };

    benefitsTrack.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize);

    const handleMediaChange = (event) => {
      const matches = typeof event.matches === "boolean" ? event.matches : mobileBenefitsQuery.matches;
      if (matches) {
        ensureStartPosition();
      }
      toggleIndicator();
    };

    if (typeof mobileBenefitsQuery.addEventListener === "function") {
      mobileBenefitsQuery.addEventListener("change", handleMediaChange);
    } else if (typeof mobileBenefitsQuery.addListener === "function") {
      mobileBenefitsQuery.addListener(handleMediaChange);
    }

    window.addEventListener("load", () => {
      ensureStartPosition();
      toggleIndicator();
    });

    ensureStartPosition();
    toggleIndicator();
  }

/* ===========================
   🔹 Sombra dinámica del header
=========================== */
  const header = document.querySelector(".site-header");
  const navBottom = document.querySelector(".site-header__bottom");

  if (header && navBottom) {
    if (window.innerWidth >= 768) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              navBottom.classList.add("has-shadow");
              header.classList.remove("has-shadow");
            } else {
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

  function setupHeaderSearch() {
    const forms = [];
    if (desktopSearchForm) {
      forms.push(desktopSearchForm);
    }
    const mobileForm = mobileSearchOverlay?.querySelector("form");
    if (mobileForm) {
      forms.push(mobileForm);
    }

    forms.forEach((form) => {
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const input = form.querySelector("input[type='search'], input[type='text']");
        const query = input?.value?.trim();
        if (!query) {
          return;
        }
        closeSearch();
        const url = new URL("productos.html", window.location.origin);
        url.searchParams.set("q", query);
        window.location.href = url.toString();
      });
    });
  }

  function setSearchInputsValue(value) {
    const safeValue = value ?? "";
    const desktopInput = desktopSearchForm?.querySelector("input[type='search']");
    if (desktopInput) {
      desktopInput.value = safeValue;
    }
    const mobileInput = mobileSearchOverlay?.querySelector("input[type='search'], input[type='text']");
    if (mobileInput) {
      mobileInput.value = safeValue;
    }
  }

  function setupMenuFilters() {
    const buildProductsUrl = (linkElement) => {
      const baseHref = linkElement.getAttribute("href") || "productos.html";
      let targetUrl;
      try {
        targetUrl = new URL(baseHref, window.location.href);
      } catch (error) {
        targetUrl = new URL("productos.html", window.location.href);
      }
      targetUrl.search = "";
      targetUrl.hash = "";

      const { filterType, filterGenero, filterBrand, filterTag } = linkElement.dataset;
      if (filterType) {
        targetUrl.searchParams.append("type", filterType);
      }
      if (filterGenero) {
        targetUrl.searchParams.append("genero", filterGenero);
      }
      if (filterBrand) {
        targetUrl.searchParams.append("brand", filterBrand);
      }
      if (filterTag) {
        targetUrl.searchParams.append("tag", filterTag);
      }

      return targetUrl;
    };

    const links = document.querySelectorAll(".menu-filter-link");
    links.forEach((link) => {
      if (link.dataset.filterHandlerAttached === "true") {
        return;
      }

      const targetUrl = buildProductsUrl(link);
      link.href = targetUrl.toString();

      link.addEventListener("click", (event) => {
        event.preventDefault();
        closeMenu();
        const destination = buildProductsUrl(link);
        window.location.href = destination.toString();
      });

      link.dataset.filterHandlerAttached = "true";
    });
  }

  async function populateHeaderBrands() {
    const perfumeList = document.querySelector('[data-brand-list="perfumes"]');
    const vapeList = document.querySelector('[data-brand-list="vapes"]');
    if (!perfumeList && !vapeList) {
      return;
    }

    try {
      const data = await fetchCatalogData();
      const perfumeBrands = new Map();
      data.perfumes.forEach((perfume) => {
        const brand = typeof perfume?.marca === "string" ? perfume.marca.trim() : "";
        if (brand) {
          const key = brand.toLowerCase();
          if (!perfumeBrands.has(key)) {
            perfumeBrands.set(key, brand);
          }
        }
      });

      const vapeBrands = new Map();
      data.vapes.forEach((vape) => {
        const brand = typeof vape?.marca === "string" ? vape.marca.trim() : "";
        if (brand) {
          const key = brand.toLowerCase();
          if (!vapeBrands.has(key)) {
            vapeBrands.set(key, brand);
          }
        }
      });

      const renderBrandList = (container, brandMap, type) => {
        if (!container) return;
        container.innerHTML = "";
        const entries = Array.from(brandMap.entries()).sort(([, a], [, b]) => a.localeCompare(b, "es", { sensitivity: "base" }));
        entries.forEach(([key, label]) => {
          const listItem = document.createElement("li");
          const link = document.createElement("a");
          link.href = "productos.html";
          link.className = "menu-filter-link";
          link.dataset.filterType = type;
          link.dataset.filterBrand = key;
          link.dataset.filterBrandLabel = label;
          link.textContent = label;
          listItem.appendChild(link);
          container.appendChild(listItem);
        });
      };

      renderBrandList(perfumeList, perfumeBrands, "perfume");
      renderBrandList(vapeList, vapeBrands, "vape");

      setupMenuFilters();
    } catch (error) {
      console.error("No se pudieron cargar las marcas del menú:", error);
    }
  }

  async function renderFeaturedProductsSection(container) {
    container.innerHTML = "";
    container.setAttribute("aria-busy", "true");
    try {
      if (!window.apiClient || typeof window.apiClient.fetchFeaturedPublic !== "function") {
        throw new Error("Cliente de API no disponible");
      }

      const response = await window.apiClient.fetchFeaturedPublic();
      const destacados = Array.isArray(response)
        ? response.slice(0, 8).map(normalizeFeaturedProduct)
        : [];

      if (!destacados.length) {
        const empty = document.createElement("p");
        empty.textContent = "Aún no hay productos destacados disponibles.";
        container.appendChild(empty);
        return;
      }

      destacados.forEach((item) => {
        const card = buildProductCardElement(item, {
          badge: "Destacado",
          showMeta: false
        });
        container.appendChild(card);
      });
    } catch (error) {
      console.error("Error al cargar los destacados:", error);
      const message = document.createElement("p");
      message.textContent = "No se pudieron cargar los productos destacados.";
      container.appendChild(message);
    } finally {
      container.setAttribute("aria-busy", "false");
    }
  }

  function setupProductsScrollArea(scrollArea) {
    if (!scrollArea || scrollArea.dataset.scrollBehaviorAttached === "true") {
      return;
    }

    scrollArea.dataset.scrollBehaviorAttached = "true";

    const getScrollMetrics = () => {
      const { scrollTop, scrollHeight, clientHeight } = scrollArea;
      const maxScroll = Math.max(0, scrollHeight - clientHeight);
      return {
        scrollTop,
        scrollHeight,
        clientHeight,
        maxScroll,
        atTop: scrollTop <= 0,
        atBottom: scrollTop >= maxScroll - 1
      };
    };

    const clampScrollTop = (value, metrics) => {
      const context = metrics ?? getScrollMetrics();
      return Math.min(context.maxScroll, Math.max(0, value));
    };

    const handleWheel = (event) => {
      if (!event || event.defaultPrevented || typeof event.deltaY !== "number") {
        return;
      }

      const { deltaY } = event;
      const metrics = getScrollMetrics();
      if (metrics.maxScroll <= 0) {
        return;
      }
      if ((deltaY < 0 && metrics.atTop) || (deltaY > 0 && metrics.atBottom)) {
        return;
      }

      event.preventDefault();
      scrollArea.scrollTop = clampScrollTop(metrics.scrollTop + deltaY, metrics);
    };

    let touchStartY = 0;

    const handleTouchStart = (event) => {
      if (!event.touches || event.touches.length !== 1) {
        return;
      }
      touchStartY = event.touches[0].clientY;
    };

    const handleTouchMove = (event) => {
      if (!event.touches || event.touches.length !== 1) {
        return;
      }

      const currentY = event.touches[0].clientY;
      const delta = touchStartY - currentY;
      const metrics = getScrollMetrics();
      if (metrics.maxScroll <= 0) {
        touchStartY = currentY;
        return;
      }

      if ((delta < 0 && metrics.atTop) || (delta > 0 && metrics.atBottom)) {
        touchStartY = currentY;
        return;
      }

      event.preventDefault();
      scrollArea.scrollTop = clampScrollTop(metrics.scrollTop + delta, metrics);
      touchStartY = currentY;
    };

    const handleKeydown = (event) => {
      if (!event || event.defaultPrevented) {
        return;
      }

      const target = event.target;
      if (target) {
        const tagName = target.tagName ? target.tagName.toLowerCase() : "";
        const isEditable = target.isContentEditable;
        if (isEditable || tagName === "input" || tagName === "textarea" || tagName === "select" || tagName === "button") {
          return;
        }
      }

      const actionableKeys = [
        "ArrowDown",
        "ArrowUp",
        "PageDown",
        "PageUp",
        "Home",
        "End",
        "Space"
      ];

      if (!actionableKeys.includes(event.key)) {
        return;
      }

      const metrics = getScrollMetrics();
      if (metrics.maxScroll <= 0) {
        return;
      }
      let delta = 0;

      switch (event.key) {
        case "ArrowDown":
          delta = 40;
          break;
        case "ArrowUp":
          delta = -40;
          break;
        case "PageDown":
          delta = metrics.clientHeight;
          break;
        case "PageUp":
          delta = -metrics.clientHeight;
          break;
        case "Home":
          delta = -metrics.scrollTop;
          break;
        case "End":
          delta = metrics.scrollHeight - metrics.clientHeight - metrics.scrollTop;
          break;
        case "Space":
          delta = event.shiftKey ? -metrics.clientHeight : metrics.clientHeight;
          break;
        default:
          break;
      }

      if (delta === 0) {
        return;
      }

      if ((delta < 0 && metrics.atTop) || (delta > 0 && metrics.atBottom)) {
        return;
      }

      event.preventDefault();
      scrollArea.scrollTop = clampScrollTop(metrics.scrollTop + delta, metrics);
    };

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: false });
    window.addEventListener("keydown", handleKeydown, { passive: false });
  }

  function initializeProductsPage() {
    const productsContainer = document.getElementById("productos-lista");
    if (!productsContainer) {
      return;
    }

    const scrollArea = document.querySelector('.productos');
    setupProductsScrollArea(scrollArea);

    const typeInputs = document.querySelectorAll('input[name="filter-type"]');
    const genderInputs = document.querySelectorAll('input[name="filter-gender"]');
    const clearButton = document.querySelector('.filtros-limpiar');
    const priceRangeInput = document.getElementById('filter-price');
    const priceLabel = document.getElementById('filter-price-value');

    const defaultMaxPrice = priceRangeInput ? Number.parseFloat(priceRangeInput.value || priceRangeInput.max) : null;

    const state = {
      items: [],
      filtered: []
    };

    const filters = {
      types: new Set(),
      genders: new Set(),
      brands: new Set(),
      maxPrice: Number.isFinite(defaultMaxPrice) ? defaultMaxPrice : null,
      search: ''
    };

    const showMessage = (message) => {
      productsContainer.innerHTML = '';
      const paragraph = document.createElement('p');
      paragraph.className = 'productos-empty';
      paragraph.textContent = message;
      productsContainer.appendChild(paragraph);
    };

    const updatePriceLabel = (value) => {
      if (priceLabel) {
        priceLabel.textContent = formatPrice(Number(value) || 0);
      }
    };

    const updateUrlParams = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('type');
      url.searchParams.delete('genero');
      url.searchParams.delete('brand');
      url.searchParams.delete('maxPrice');
      url.searchParams.delete('q');

      filters.types.forEach((type) => url.searchParams.append('type', type));
      filters.genders.forEach((gender) => url.searchParams.append('genero', gender));
      filters.brands.forEach((brand) => url.searchParams.append('brand', brand));

      if (Number.isFinite(filters.maxPrice) && priceRangeInput) {
        url.searchParams.set('maxPrice', filters.maxPrice);
      }

      if (filters.search) {
        url.searchParams.set('q', filters.search);
      }

      window.history.replaceState({}, '', url);
    };

    const updateBrandGroupVisibility = () => {
      const perfumeGroup = document.querySelector('[data-brand-group="perfume"]');
      const vapeGroup = document.querySelector('[data-brand-group="vape"]');
      const showPerfume = !filters.types.size || filters.types.has('perfume') || filters.types.has('decant');
      const showVape = !filters.types.size || filters.types.has('vape');
      perfumeGroup?.classList.toggle('is-hidden', !showPerfume);
      vapeGroup?.classList.toggle('is-hidden', !showVape);
    };

    const renderProducts = (products, searchTerm) => {
      productsContainer.innerHTML = '';
      if (!products.length) {
        showMessage('No encontramos productos con los filtros seleccionados.');
        return;
      }

      products.forEach((product) => {
        const card = buildProductCardElement(product, {
          searchTerm,
          showMeta: true
        });
        productsContainer.appendChild(card);
      });
    };

    const renderBrandGroup = (container, brandMap, type) => {
      if (!container) return;
      container.innerHTML = '';
      const entries = Array.from(brandMap.entries()).sort(([, a], [, b]) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
      entries.forEach(([key, label]) => {
        const listItem = document.createElement('li');
        const labelElement = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = key;
        input.checked = filters.brands.has(key);
        input.dataset.brandType = type;
        input.addEventListener('change', () => {
          if (input.checked) {
            filters.brands.add(key);
          } else {
            filters.brands.delete(key);
          }
          applyFilters();
        });
        labelElement.appendChild(input);
        labelElement.appendChild(document.createTextNode(label));
        listItem.appendChild(labelElement);
        container.appendChild(listItem);
      });
    };

    const updateBrandFilters = (items) => {
      const perfumeGroup = document.querySelector('[data-brand-group="perfume"] ul');
      const vapeGroup = document.querySelector('[data-brand-group="vape"] ul');
      const perfumeBrands = new Map();
      const vapeBrands = new Map();

      items.forEach((item) => {
        const brandLabel = item.brand;
        if (!brandLabel) return;
        const key = brandLabel.toLowerCase();
        if (item.type === 'vape') {
          if (!vapeBrands.has(key)) {
            vapeBrands.set(key, brandLabel);
          }
        } else {
          if (!perfumeBrands.has(key)) {
            perfumeBrands.set(key, brandLabel);
          }
        }
      });

      renderBrandGroup(perfumeGroup, perfumeBrands, 'perfume');
      renderBrandGroup(vapeGroup, vapeBrands, 'vape');
      updateBrandGroupVisibility();
    };

    const applyFilters = () => {
      let filtered = state.items.slice();

      if (filters.types.size) {
        filtered = filtered.filter((item) => filters.types.has(item.type));
      }

      if (filters.genders.size) {
        filtered = filtered.filter((item) => {
          if (!item.genero) return false;
          return filters.genders.has(item.genero);
        });
      }

      if (filters.brands.size) {
        filtered = filtered.filter((item) => {
          const brandKey = item.brand?.toLowerCase() ?? '';
          return filters.brands.has(brandKey);
        });
      }

      if (Number.isFinite(filters.maxPrice)) {
        filtered = filtered.filter((item) => (item.price ?? 0) <= filters.maxPrice);
      }

      if (filters.search) {
        const query = filters.search.toLowerCase();
        filtered = filtered.filter((item) => item.searchText.includes(query));
      }

      state.filtered = filtered;
      renderProducts(filtered, filters.search);
      updateBrandGroupVisibility();
      updateUrlParams();
    };

    const applyFiltersFromQuery = () => {
      const params = new URLSearchParams(window.location.search);
      filters.types.clear();
      filters.genders.clear();
      filters.brands.clear();

      params.getAll('type').forEach((type) => {
        if (type) {
          filters.types.add(type.toLowerCase());
        }
      });

      params.getAll('genero').forEach((gender) => {
        if (gender) {
          filters.genders.add(gender.toUpperCase());
        }
      });

      params.getAll('brand').forEach((brand) => {
        if (brand) {
          filters.brands.add(brand.toLowerCase());
        }
      });

      const searchQuery = params.get('q');
      if (searchQuery) {
        filters.search = searchQuery.trim();
        setSearchInputsValue(filters.search);
      }

      const maxPriceParam = Number.parseFloat(params.get('maxPrice'));
      if (Number.isFinite(maxPriceParam) && priceRangeInput) {
        filters.maxPrice = maxPriceParam;
        priceRangeInput.value = String(maxPriceParam);
        updatePriceLabel(maxPriceParam);
      } else if (priceRangeInput) {
        filters.maxPrice = Number.parseFloat(priceRangeInput.value) || defaultMaxPrice;
        updatePriceLabel(priceRangeInput.value);
      }

      typeInputs.forEach((input) => {
        input.checked = filters.types.has(input.value.toLowerCase());
      });

      genderInputs.forEach((input) => {
        input.checked = filters.genders.has(input.value.toUpperCase());
      });
    };

    productsContainer.innerHTML = '';
    const loading = document.createElement('p');
    loading.textContent = 'Cargando productos...';
    productsContainer.appendChild(loading);
    productsContainer.setAttribute('aria-busy', 'true');

    fetchCatalogData()
      .then((data) => {
        const perfumes = data.perfumes.map(normalizePerfume);
        const vapes = data.vapes.map(normalizeVape);
        state.items = [...perfumes, ...vapes];
        applyFiltersFromQuery();
        updateBrandFilters(state.items);
        applyFilters();
      })
      .catch((error) => {
        console.error('Error al cargar el catálogo:', error);
        showMessage('No se pudieron cargar los productos. Intentalo nuevamente.');
      })
      .finally(() => {
        productsContainer.removeAttribute('aria-busy');
      });

    typeInputs.forEach((input) => {
      input.addEventListener('change', () => {
        const value = input.value.toLowerCase();
        if (input.checked) {
          filters.types.add(value);
        } else {
          filters.types.delete(value);
        }
        updateBrandGroupVisibility();
        applyFilters();
      });
    });

    genderInputs.forEach((input) => {
      input.addEventListener('change', () => {
        const value = input.value.toUpperCase();
        if (input.checked) {
          filters.genders.add(value);
        } else {
          filters.genders.delete(value);
        }
        applyFilters();
      });
    });

    if (priceRangeInput) {
      priceRangeInput.addEventListener('input', () => {
        const value = Number.parseFloat(priceRangeInput.value);
        filters.maxPrice = Number.isFinite(value) ? value : defaultMaxPrice;
        updatePriceLabel(filters.maxPrice);
        applyFilters();
      });
    }

    clearButton?.addEventListener('click', () => {
      filters.types.clear();
      filters.genders.clear();
      filters.brands.clear();
      filters.maxPrice = defaultMaxPrice;
      filters.search = '';
      typeInputs.forEach((input) => { input.checked = false; });
      genderInputs.forEach((input) => { input.checked = false; });
      if (priceRangeInput && Number.isFinite(defaultMaxPrice)) {
        priceRangeInput.value = String(defaultMaxPrice);
        updatePriceLabel(defaultMaxPrice);
      }
      setSearchInputsValue('');
      updateBrandFilters(state.items);
      applyFilters();
    });
  }

  const featuredGrid = document.getElementById("featured-products-grid");
  if (featuredGrid) {
    renderFeaturedProductsSection(featuredGrid);
  }

  initializeProductsPage();
});
