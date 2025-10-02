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
     🔹 Dropdown "Mi cuenta"
  =========================== */
  const accountDropdown = document.querySelector(".site-header__action--has-dropdown");
  if (accountDropdown) {
    const accountBtn = accountDropdown.querySelector(".site-header__action-btn");

    accountBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      accountDropdown.classList.toggle("is-open");
    });

    document.addEventListener("click", (e) => {
      if (!accountDropdown.contains(e.target)) {
        accountDropdown.classList.remove("is-open");
      }
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
  const searchForm = document.querySelector(".site-header__search");
  const searchIcon = searchToggle ? searchToggle.querySelector("i") : null;

  if (searchToggle) {
    searchToggle.setAttribute("aria-expanded", "false");
    searchToggle.setAttribute("aria-label", "Abrir buscador");
  }

  const setSearchIcon = (isOpen) => {
    if (!searchIcon) return;
    if (isOpen) {
      searchIcon.classList.remove("fa-magnifying-glass");
      searchIcon.classList.add("fa-xmark");
    } else {
      searchIcon.classList.remove("fa-xmark");
      searchIcon.classList.add("fa-magnifying-glass");
    }
  };

  const closeSearch = () => {
    if (!siteHeader) return;
    if (siteHeader.classList.contains("is-search-open")) {
      siteHeader.classList.remove("is-search-open");
      setSearchIcon(false);
      if (searchToggle) {
        searchToggle.setAttribute("aria-expanded", "false");
        searchToggle.setAttribute("aria-label", "Abrir buscador");
      }
    }
  };

  const closeMenu = () => {
    if (!mainNav) return;
    mainNav.classList.remove("is-open");
    siteHeader?.classList.remove("is-menu-open");
    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
    }
  };

  const handleResize = () => {
    if (window.innerWidth >= 768) {
      closeSearch();
      closeMenu();
      if (searchToggle) {
        searchToggle.setAttribute("aria-expanded", "false");
        searchToggle.setAttribute("aria-label", "Abrir buscador");
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

  if (searchToggle && searchForm && siteHeader) {
    searchToggle.addEventListener("click", (event) => {
      event.preventDefault();
      if (window.innerWidth >= 768) return;

      const willOpen = !siteHeader.classList.contains("is-search-open");
      if (willOpen) {
        closeMenu();
      }
      siteHeader.classList.toggle("is-search-open", willOpen);
      setSearchIcon(willOpen);
      searchToggle.setAttribute("aria-expanded", String(willOpen));
      searchToggle.setAttribute("aria-label", willOpen ? "Cerrar buscador" : "Abrir buscador");

      if (willOpen) {
        window.requestAnimationFrame(() => {
          const input = searchForm.querySelector("input");
          input?.focus();
        });
      }
    });
  }

  window.addEventListener("resize", handleResize);
  handleResize();
});
