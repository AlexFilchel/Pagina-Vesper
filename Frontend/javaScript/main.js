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

});
