const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

let products = [];
const promotions = [];
let apiClient = null;

const dom = {
  accordionHeaders: document.querySelectorAll('.accordion-header'),
  addProductForm: document.getElementById('addProductForm'),
  editProductForm: document.getElementById('editProductForm'),
  productsTableBody: document.getElementById('productsTableBody'),
  addPromotionForm: document.getElementById('addPromotionForm'),
  editPromotionForm: document.getElementById('editPromotionForm'),
  promotionsTableBody: document.getElementById('promotionsTableBody'),
  productModal: document.getElementById('productModal'),
  promotionModal: document.getElementById('promotionModal'),
  promotionProductSelect: document.getElementById('promotionProduct'),
  editPromotionProductSelect: document.getElementById('editPromotionProduct'),
  adminModals: document.querySelectorAll('.admin-modal'),
  featuredTableBody: document.getElementById('featuredProductsBody'),
  featuredSelect: document.getElementById('featuredProductSelect'),
  addFeaturedButton: document.getElementById('addFeaturedButton'),
  featuredCounter: document.getElementById('featuredCounter')
};

let addProductHelpers;
let editProductHelpers;
let featuredProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupAccordions();
  addProductHelpers = setupProductForm(dom.addProductForm);
  editProductHelpers = setupProductForm(dom.editProductForm);
  setupPromotionForm(dom.addPromotionForm);
  setupPromotionForm(dom.editPromotionForm);
  populateProductOptions();
  enhanceSearchableSelect(dom.promotionProductSelect);
  enhanceSearchableSelect(dom.editPromotionProductSelect);

  setTodayAsDefault(dom.addPromotionForm?.querySelector('#promotionStart'));
  setupModalTriggers();

  try {
    await ensureApiClient();
    await loadProductsFromApi();
    await loadFeaturedProducts();
  } catch (error) {
    console.error('Error inicializando la API del administrador:', error);
    showToast('No se pudieron cargar los productos del catálogo.');
    renderProductsTable();
    renderFeaturedProducts('No se pudo obtener la lista de destacados.');
  }

  renderPromotionsTable();

  dom.addFeaturedButton?.addEventListener('click', handleAddFeaturedProduct);

  dom.featuredTableBody?.addEventListener('click', (event) => {
    const target = event.target.closest('.btn-remove[data-featured-id]');
    if (!target) return;
    const destacadoId = Number.parseInt(target.dataset.featuredId, 10);
    if (!Number.isFinite(destacadoId)) return;
    removeFeaturedProduct(destacadoId);
  });

  // ============================
  // 📦 CREAR PRODUCTO
  // ============================
  dom.addProductForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!dom.addProductForm.checkValidity()) {
      dom.addProductForm.reportValidity();
      return;
    }

    const type = dom.addProductForm.productType.value;
    if (type === '') {
      dom.addProductForm.productType.focus();
      return;
    }

    if (!validateProductForm(dom.addProductForm)) {
      return;
    }

    try {
      const client = await ensureApiClient();
      if (!client) throw new Error('Cliente de API no disponible.');

      const newProduct = collectProductData(dom.addProductForm);

      {
        const producto = toPerfumeRequest(newProduct);

        const formData = new FormData();
        formData.append(
          "producto",
          new Blob([JSON.stringify(producto)], { type: "application/json" })
        );

        const fileInput = dom.addProductForm.querySelector('#productImages');
        if (fileInput && fileInput.files.length > 0) {
          for (const file of fileInput.files) {
            formData.append("files", file);
          }
        }

        const created = await client.request("/admin/perfumes", {
          method: "POST",
          body: formData,
          authenticated: true
        });

        const mapped = mapPerfumeResponse(created, newProduct);
        upsertProduct(mapped);
      }

      renderProductsTable();
      renderPromotionsTable();
      populateProductOptions();
      dom.addProductForm.reset();
      addProductHelpers?.reset?.();
      showToast('Producto agregado correctamente.');
    } catch (error) {
      console.error('Error al crear el producto:', error);
      showToast('No se pudo agregar el producto.');
    }
  });

  // ============================
  // 🧩 EDITAR PRODUCTO
  // ============================
  dom.editProductForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!dom.editProductForm.checkValidity()) {
      dom.editProductForm.reportValidity();
      return;
    }
    if (!validateProductForm(dom.editProductForm)) return;

    const productId = dom.editProductForm.dataset.productId;
    const originalType = dom.editProductForm.dataset.productType || dom.editProductForm.productType?.value;
    if (!productId || !originalType) {
      console.error('No se pudo determinar el producto a editar.');
      return;
    }

    try {
      const client = await ensureApiClient();
      if (!client) throw new Error('Cliente de API no disponible.');

      const editedProduct = collectProductData(dom.editProductForm);
      editedProduct.type = originalType;

      {
        const updated = await client.updatePerfume(productId, toPerfumeRequest(editedProduct));
        const mapped = mapPerfumeResponse(updated, editedProduct);
        upsertProduct(mapped);
      }

      renderProductsTable();
      renderPromotionsTable();
      populateProductOptions();
      dom.editProductForm.reset();
      editProductHelpers?.reset?.();
      delete dom.editProductForm.dataset.productId;
      delete dom.editProductForm.dataset.productType;
      closeModal(dom.productModal);
      showToast('Producto actualizado correctamente.');
    } catch (error) {
      console.error('Error al actualizar el producto:', error);
      showToast('No se pudo actualizar el producto.');
    }
  });

  // ============================
  // 🎟️ PROMOCIONES
  // ============================
  dom.addPromotionForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!dom.addPromotionForm.checkValidity()) {
      dom.addPromotionForm.reportValidity();
      return;
    }
    if (!validatePromotionDates(dom.addPromotionForm)) {
      return;
    }

    const promotion = collectPromotionData(dom.addPromotionForm);
    promotion.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now();
    promotions.push(promotion);
    renderPromotionsTable();
    dom.addPromotionForm.reset();
    setTodayAsDefault(dom.addPromotionForm.querySelector('#promotionStart'));
    showToast('Promoción agregada (simulación).');
  });

  dom.editPromotionForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!dom.editPromotionForm.checkValidity()) {
      dom.editPromotionForm.reportValidity();
      return;
    }
    if (!validatePromotionDates(dom.editPromotionForm)) {
      return;
    }

    const promotion = collectPromotionData(dom.editPromotionForm);
    const promotionId = dom.editPromotionForm.dataset.promotionId;
    const index = promotions.findIndex((item) => String(item.id) === String(promotionId));
    if (index !== -1) {
      promotion.id = promotions[index].id;
      promotions[index] = promotion;
      renderPromotionsTable();
      closeModal(dom.promotionModal);
      showToast('Promoción actualizada (simulación).');
    }
  });
});


function setupAccordions() {
  dom.accordionHeaders.forEach((header) => {
    header.addEventListener('click', () => {
      const item = header.closest('.accordion-item');
      const content = item.querySelector('.accordion-content');
      const isOpen = item.classList.contains('is-open');

      closeAllAccordions();

      if (!isOpen) {
        item.classList.add('is-open');
        content.hidden = false;
        header.setAttribute('aria-expanded', 'true');
      }
    });
  });
}

function closeAllAccordions() {
  dom.accordionHeaders.forEach((header) => {
    const item = header.closest('.accordion-item');
    const content = item.querySelector('.accordion-content');
    item.classList.remove('is-open');
    header.setAttribute('aria-expanded', 'false');
    content.hidden = true;
  });
}

function setupProductForm(form) {
  if (!form) return null;
  const typeSelect = form.querySelector('select[name="productType"]');
  const fragranceFields = form.querySelector('[data-product-group="fragrance"]');
  const fileInput = form.querySelector('input[type="file"]');

  const toggleGroup = (group, enable) => {
    if (!group) return;
    group.hidden = !enable;
    group.querySelectorAll('input, textarea, select').forEach((field) => {
      field.disabled = !enable;
    });
  };

  const updateFieldGroups = (value) => {
    const isFragrance = value === 'perfume' || value === 'decant';
    toggleGroup(fragranceFields, isFragrance);
  };

  const handleProductTypeChange = () => {
    const value = typeSelect?.value || '';
    updateFieldGroups(value);
  };

  typeSelect?.addEventListener('change', handleProductTypeChange);
  handleProductTypeChange();

  fileInput?.addEventListener('change', (event) => handleFileSelection(event, form));

  return {
    getFlavors: () => [],
    setFlavors: () => {},
    reset: () => {
      form.reset();
      handleProductTypeChange();
      if (fileInput) fileInput.value = '';
    }
  };
}

function setupPromotionForm(form) {
  if (!form) return;
  const startInput = form.querySelector('input[name="promotionStart"]');
  const endInput = form.querySelector('input[name="promotionEnd"]');
  startInput?.addEventListener('change', () => {
    if (!endInput) return;
    endInput.min = startInput.value;
    if (endInput.value && endInput.value < startInput.value) {
      endInput.value = startInput.value;
    }
  });
}

function validatePromotionDates(form) {
  const start = form.promotionStart.value;
  const end = form.promotionEnd.value;
  if (start && end && end < start) {
    form.promotionEnd.setCustomValidity('La fecha de fin no puede ser anterior al inicio.');
    form.promotionEnd.reportValidity();
    return false;
  }
  form.promotionEnd.setCustomValidity('');
  return true;
}

function setTodayAsDefault(input) {
  if (!input) return;
  const today = new Date().toISOString().split('T')[0];
  input.value = today;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function setupModalTriggers() {
  dom.adminModals.forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target.matches('[data-close-modal]') || event.target === modal) {
        closeModal(modal);
      }
    });
  });
}

function openModal(modal) {
  if (!modal) return;
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');
}

function closeModal(modal) {
  if (!modal) return;
  modal.classList.remove('is-open');
  modal.setAttribute('aria-hidden', 'true');
  if (modal === dom.productModal) {
    const typeSelect = dom.editProductForm?.querySelector('select[name="productType"]');
    if (typeSelect) {
      typeSelect.disabled = false;
    }
    delete dom.editProductForm.dataset.productId;
    delete dom.editProductForm.dataset.productType;
  }
}

function enhanceSearchableSelect(select) {
  if (!select || select.dataset.searchableEnhanced) return;
  select.dataset.searchableEnhanced = 'true';
  const wrapper = document.createElement('div');
  wrapper.className = 'searchable-select';
  const searchInput = document.createElement('input');
  searchInput.type = 'search';
  searchInput.className = 'searchable-select__input';
  searchInput.placeholder = 'Buscar producto...';
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(searchInput);
  wrapper.appendChild(select);

  const getOptions = () => Array.from(select.options).filter((option) => !option.disabled);

  searchInput.addEventListener('input', () => {
    const term = searchInput.value.trim().toLowerCase();
    getOptions().forEach((option) => {
      const matches = option.textContent.toLowerCase().includes(term);
      option.hidden = !matches;
    });
  });
}

function showToast(message) {
  const container = document.querySelector('.cart-toast-layer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'admin-toast';
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('is-visible');
  }, 50);
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

(function initToastStyles() {
  const styleId = 'admin-toast-style';
  if (document.getElementById(styleId)) return;
  const style = document.createElement('style');
  style.id = styleId;
  style.textContent = `
    .admin-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: rgba(0, 74, 173, 0.95);
      color: #fff;
      padding: 14px 22px;
      border-radius: 14px;
      box-shadow: 0 18px 40px -20px rgba(15, 23, 42, 0.45);
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      z-index: 5000;
    }
    .admin-toast.is-visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
})();
