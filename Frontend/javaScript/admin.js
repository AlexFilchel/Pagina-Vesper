const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});
const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

let products = [];
const promotions = [];
let sales = [];
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
  featuredCounter: document.getElementById('featuredCounter'),
  salesTableBody: document.getElementById('salesTableBody')
};

let addProductHelpers;
let editProductHelpers;
let featuredProducts = [];

document.addEventListener('DOMContentLoaded', async () => {
  setupAccordions();

  // ============================
  // 🔒 SECURITY GUARD
  // ============================
  try {
    const isAuth = await checkAdminAuth();
    if (!isAuth) {
      return;
    }

    // Reveal UI
    const guardStyle = document.getElementById('admin-auth-guard');
    if (guardStyle) guardStyle.remove();
    document.body.style.opacity = '1';
    document.body.style.visibility = 'visible';
    document.body.style.pointerEvents = 'auto';

  } catch (error) {
    console.error('Security check failed:', error);
    window.location.href = 'index.html';
    return;
  }

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
    await loadSalesFromApi();
  } catch (error) {
    console.error('Error inicializando la API del administrador:', error);
    showToast('No se pudieron cargar los productos del catálogo.');
    renderProductsTable();
    renderFeaturedProducts('No se pudo obtener la lista de destacados.');
    renderSalesTable('No se pudo obtener el listado de ventas.');
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

  dom.salesTableBody?.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    if (!target.classList.contains('order-status-select')) return;
    handleSaleStatusChange(target);
  });


  async function checkAdminAuth() {
    // 1. Wait for Auth0 Client
    const client = await waitForGlobalAuth0();
    if (!client) return false;

    // 2. Check Authentication
    const isAuthenticated = await client.isAuthenticated();
    if (!isAuthenticated) {
      console.warn('User not authenticated. Redirecting...');
      await client.loginWithRedirect({
        authorizationParams: {
          redirect_uri: window.location.origin
        }
      });
      return false;
    }

    // 3. Optional: Check Admin Role (Requires backend support or Token Claims)
    // For now, we assume any authenticated user who can access /admin/* endpoints is an admin.
    // If the backend returns 403 on API key calls, the UI handles it gracefully.
    // Ideally, check: const user = await client.getUser(); if (user.role !== 'admin') ...

    return true;
  }

  async function waitForGlobalAuth0(timeoutMs = 10000) {
    if (window.auth0Client) return window.auth0Client;

    return new Promise((resolve) => {
      const start = Date.now();
      const interval = setInterval(() => {
        if (window.auth0Client) {
          clearInterval(interval);
          resolve(window.auth0Client);
        } else if (Date.now() - start > timeoutMs) {
          clearInterval(interval);
          resolve(null);
        }
      }, 100);
    });
  }

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

async function ensureApiClient() {
  if (window.apiClient) return window.apiClient;

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (window.apiClient) {
        clearInterval(interval);
        resolve(window.apiClient);
      } else if (Date.now() - start > 10000) {
        clearInterval(interval);
        reject(new Error('API Client initialized timeout'));
      }
    }, 100);
  });
}

async function loadSalesFromApi() {
  if (!dom.salesTableBody) return;
  try {
    const client = await ensureApiClient();
    if (!client) throw new Error('Cliente de API no disponible.');
    const data = await client.request('/admin/ventas', { authenticated: true });
    sales = Array.isArray(data) ? data : [];
    renderSalesTable();
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    sales = [];
    renderSalesTable('No se pudieron cargar las ventas.');
  }
}

function renderSalesTable(message) {
  if (!dom.salesTableBody) return;
  dom.salesTableBody.innerHTML = '';

  if (message) {
    dom.salesTableBody.append(createEmptySalesRow(message));
    return;
  }

  if (!sales.length) {
    dom.salesTableBody.append(createEmptySalesRow('Todavía no hay ventas registradas.'));
    return;
  }

  sales.forEach((venta) => {
    const row = document.createElement('tr');

    const idCell = document.createElement('td');
    idCell.textContent = venta.id ?? '-';

    const dateCell = document.createElement('td');
    dateCell.textContent = formatSaleDate(venta.fecha);

    const productsCell = document.createElement('td');
    productsCell.append(createProductsList(venta.detalles));

    const totalCell = document.createElement('td');
    totalCell.textContent = typeof venta.total === 'number'
      ? currencyFormatter.format(venta.total)
      : '-';

    const statusCell = document.createElement('td');
    const statusSelect = createStatusSelect(venta);
    statusCell.append(statusSelect);

    const customerCell = document.createElement('td');
    customerCell.append(createCustomerList(venta));

    row.append(idCell, dateCell, productsCell, totalCell, statusCell, customerCell);
    dom.salesTableBody.append(row);
  });
}

function createEmptySalesRow(message) {
  const row = document.createElement('tr');
  const cell = document.createElement('td');
  cell.colSpan = 6;
  cell.innerHTML = `
    <div class="empty-state">
      <span class="material-symbols-outlined" aria-hidden="true">receipt_long</span>
      <p>${message}</p>
    </div>
  `;
  row.append(cell);
  return row;
}

function formatSaleDate(rawDate) {
  if (!rawDate) return '-';
  const parsed = new Date(rawDate);
  if (Number.isNaN(parsed.getTime())) {
    return String(rawDate);
  }
  return dateFormatter.format(parsed);
}

function createProductsList(detalles) {
  const list = document.createElement('ul');
  list.className = 'sales-products';
  if (!Array.isArray(detalles) || detalles.length === 0) {
    const item = document.createElement('li');
    item.textContent = 'Sin detalle de productos.';
    list.append(item);
    return list;
  }

  detalles.forEach((detalle) => {
    const item = document.createElement('li');
    const quantity = detalle.cantidad ? `x${detalle.cantidad}` : '';
    const subtotal = typeof detalle.subtotal === 'number'
      ? ` · ${currencyFormatter.format(detalle.subtotal)}`
      : '';
    item.textContent = `${detalle.nombreProducto ?? 'Producto'} ${quantity}${subtotal}`.trim();
    list.append(item);
  });
  return list;
}

function createCustomerList(venta) {
  const list = document.createElement('ul');
  list.className = 'sales-customer';

  const customerName = [venta.nombreCliente, venta.apellidoCliente]
    .filter(Boolean)
    .join(' ')
    .trim();
  const email = venta.usuarioEmail || venta.emailCliente || venta.email || '-';
  const address = venta.direccionCliente || venta.direccion || venta.address || '-';
  const phone = venta.telefonoCliente || venta.telefono || venta.phone || '-';

  list.append(
    createCustomerItem('Nombre', customerName || 'No informado'),
    createCustomerItem('Correo', email),
    createCustomerItem('Dirección', address),
    createCustomerItem('Teléfono', phone)
  );

  return list;
}

function createCustomerItem(label, value) {
  const item = document.createElement('li');
  const strong = document.createElement('strong');
  strong.textContent = `${label}: `;
  const span = document.createElement('span');
  span.textContent = value;
  item.append(strong, span);
  return item;
}

function createStatusSelect(venta) {
  const select = document.createElement('select');
  select.className = 'order-status-select';
  const normalizedStatus = normalizeSaleStatus(venta.estado);
  select.dataset.saleId = venta.id ?? '';
  select.dataset.currentStatus = normalizedStatus;

  [
    { value: 'PENDIENTE', label: 'Pendiente' },
    { value: 'ENVIADO', label: 'Enviado' },
    { value: 'RECIBIDO', label: 'Recibido' }
  ].forEach((optionData) => {
    const option = document.createElement('option');
    option.value = optionData.value;
    option.textContent = optionData.label;
    select.append(option);
  });

  select.value = normalizedStatus;
  applyStatusSelectStyle(select, normalizedStatus);
  return select;
}

function normalizeSaleStatus(rawStatus) {
  const status = String(rawStatus || '').toUpperCase();
  if (status === 'ENVIADO') return 'ENVIADO';
  if (status === 'RECIBIDO' || status === 'COMPLETADA') return 'RECIBIDO';
  return 'PENDIENTE';
}

function applyStatusSelectStyle(select, status) {
  select.classList.remove('is-pending', 'is-shipped', 'is-received');
  if (status === 'ENVIADO') {
    select.classList.add('is-shipped');
  } else if (status === 'RECIBIDO') {
    select.classList.add('is-received');
  } else {
    select.classList.add('is-pending');
  }
}

async function handleSaleStatusChange(select) {
  const saleId = Number.parseInt(select.dataset.saleId, 10);
  if (!Number.isFinite(saleId)) return;
  const previousStatus = select.dataset.currentStatus || 'PENDIENTE';
  const newStatus = select.value;
  applyStatusSelectStyle(select, newStatus);

  try {
    const client = await ensureApiClient();
    if (!client) throw new Error('Cliente de API no disponible.');
    await client.request(`/admin/ventas/${saleId}/estado`, {
      method: 'PUT',
      body: { estado: newStatus },
      authenticated: true
    });
    select.dataset.currentStatus = newStatus;
    const sale = sales.find((item) => Number(item.id) === saleId);
    if (sale) {
      sale.estado = newStatus;
    }
    showToast('Estado de la venta actualizado.');
  } catch (error) {
    console.error('Error al actualizar el estado de la venta:', error);
    showToast('No se pudo actualizar el estado de la venta.');
    select.value = previousStatus;
    applyStatusSelectStyle(select, previousStatus);
  }
}


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
    setFlavors: () => { },
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
