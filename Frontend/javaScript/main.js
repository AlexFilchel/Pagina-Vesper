document.addEventListener("DOMContentLoaded", () => {
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

  // Auto-slide cada 5 segundos
  setInterval(() => {
    let next = (index + 1) % items.length;
    showSlide(next);
  }, 5000);

  // Click en los puntitos
  indicators.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      showSlide(i);
    });
  });

// Dropdown "Mi cuenta"
const accountDropdown = document.querySelector(".site-header__action--has-dropdown");
const accountBtn = accountDropdown.querySelector(".site-header__action-btn");

accountBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  accountDropdown.classList.toggle("is-open");
});

// Cierra el dropdown si hago clic fuera
document.addEventListener("click", (e) => {
  if (!accountDropdown.contains(e.target)) {
    accountDropdown.classList.remove("is-open");
  }
});
});

document.addEventListener("DOMContentLoaded", () => {
  const modalLogin = document.getElementById("modal-login");
  const modalRegister = document.getElementById("modal-register");

  // Botones
  document.getElementById("btn-login").addEventListener("click", (e) => {
    e.preventDefault();
    modalLogin.classList.add("active");
  });

  document.getElementById("btn-register").addEventListener("click", (e) => {
    e.preventDefault();
    modalRegister.classList.add("active");
  });

  // Cerrar modal
  document.querySelectorAll(".modal-close").forEach(btn => {
    btn.addEventListener("click", () => {
      document.getElementById(btn.dataset.close).classList.remove("active");
    });
  });

  // Cerrar clickeando en overlay
  document.querySelectorAll(".modal").forEach(modal => {
    modal.addEventListener("click", (e) => {
      if (e.target.classList.contains("modal-overlay")) {
        modal.classList.remove("active");
      }
    });
  });

  // Switch entre modales
  document.getElementById("switch-to-register").addEventListener("click", (e) => {
    e.preventDefault();
    modalLogin.classList.remove("active");
    modalRegister.classList.add("active");
  });

  document.getElementById("switch-to-login").addEventListener("click", (e) => {
    e.preventDefault();
    modalRegister.classList.remove("active");
    modalLogin.classList.add("active");
  });
});
