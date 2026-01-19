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

/* ==========================================================================
   HELPER FUNCTIONS (Added to fix ReferenceErrors)
   ========================================================================== */

function populateProductOptions() {
  const options = products.map(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.brand} - ${p.name} ($${currencyFormatter.format(p.price).replace(/\s/g, '')})`;
    return option;
  });

  [dom.promotionProductSelect, dom.editPromotionProductSelect].forEach(select => {
    if (!select) return;
    const defaultOption = select.querySelector('option[disabled]');
    select.innerHTML = '';
    if (defaultOption) select.appendChild(defaultOption);
    options.forEach(opt => select.appendChild(opt.cloneNode(true)));
  });
}

async function loadProductsFromApi() {
  try {
    const client = await ensureApiClient();
    if (!client) return;

    // Intenta cargar desde endpoint público si el de admin no retorna todo, 
    // pero idealmente deberíamos tener un endpoint de admin.
    // Usamos el que sugiere el contexto:
    const data = await client.request('/public/perfumes');
    const rawProducts = Array.isArray(data) ? data : [];

    products = rawProducts.map(p => mapPerfumeResponse(p));

    renderProductsTable();
    populateProductOptions();
    // Actualizar select de destacados también si es necesario
    renderFeaturedProducts();
  } catch (error) {
    console.error('Error loading products:', error);
    showToast('Error cargando productos.');
  }
}

async function loadFeaturedProducts() {
  try {
    const client = await ensureApiClient();
    if (!client) return;
    const data = await client.fetchFeaturedAdmin();
    featuredProducts = Array.isArray(data) ? data : [];
    renderFeaturedProducts();
  } catch (error) {
    console.error('Error loading featured:', error);
  }
}

function renderProductsTable() {
  if (!dom.productsTableBody) return;
  dom.productsTableBody.innerHTML = products.map(p => `
        <tr>
            <td>${p.name}</td>
            <td>${p.brand}</td>
            <td>${p.type === 'decant' ? 'Decant' : 'Perfume'}</td>
            <td>${currencyFormatter.format(p.price)}</td>
            <td>${p.stock}</td>
            <td class="column-actions">
                <button type="button" class="btn-icon" onclick="handleEditProductRequest('${p.id}')" title="Editar">✏️</button>
                <button type="button" class="btn-icon" onclick="handleDeleteProductRequest('${p.id}')" title="Eliminar">🗑️</button>
            </td>
        </tr>
    `).join('');
}

// Global handlers needed for onclick attributes in innerHTML
window.handleEditProductRequest = (id) => {
  const product = products.find(p => String(p.id) === String(id));
  if (product) openEditModal(product);
};

window.handleDeleteProductRequest = async (id) => {
  if (!confirm('¿Estás seguro de eliminar este producto?')) return;
  try {
    const client = await ensureApiClient();
    if (client && client.deletePerfume) {
      await client.deletePerfume(id);
    } else {
      // Fallback generic request if deletePerfume not exposed directly
      await client.request(`/admin/perfumes/${id}`, { method: 'DELETE', authenticated: true });
    }

    products = products.filter(p => String(p.id) !== String(id));
    renderProductsTable();
    populateProductOptions();
    showToast('Producto eliminado.');
  } catch (err) {
    console.error(err);
    showToast('Error al eliminar.');
  }
};

function openEditModal(product) {
  if (!product) return;
  const form = dom.editProductForm;
  form.dataset.productId = product.id;
  form.dataset.productType = product.type;

  // Populate simple fields
  const setVal = (name, val) => {
    const input = form.querySelector(`[name="${name}"]`);
    if (input) input.value = val;
  };

  setVal('productType', product.type);

  // Trigger change manually to show/hide fields
  const typeSelect = form.querySelector('[name="productType"]');
  if (typeSelect) typeSelect.dispatchEvent(new Event('change'));

  setVal('name', product.name);
  setVal('brand', product.brand);
  setVal('description', product.description);
  setVal('volume', product.volume);
  setVal('gender', product.gender);
  setVal('stock', product.stock);
  setVal('notes', product.notes);
  setVal('family', product.family);
  setVal('price', product.price);
  setVal('inspired', product.inspired || '');

  if (product.piramide) {
    setVal('piramideSalida', product.piramide.salida || '');
    setVal('piramideCorazon', product.piramide.corazon || '');
    setVal('piramideFondo', product.piramide.fondo || '');
  }

  openModal(dom.productModal);
}

function renderFeaturedProducts(errorMessage) {
  if (!dom.featuredTableBody) return;
  if (errorMessage) {
    dom.featuredTableBody.innerHTML = `<tr><td colspan="5">${errorMessage}</td></tr>`;
    return;
  }

  dom.featuredTableBody.innerHTML = featuredProducts.map(p => `
        <tr>
            <td>${p.nombre || p.name}</td>
            <td>${p.marca || p.brand}</td>
            <td>${currencyFormatter.format(p.precio || p.price || 0)}</td>
            <td>${p.decant ? 'Decant' : 'Perfume'}</td>
            <td>
                <button type="button" class="btn-remove btn-icon" data-featured-id="${p.id}">❌</button>
            </td>
        </tr>
    `).join('');

  if (dom.featuredCounter) {
    dom.featuredCounter.textContent = `${featuredProducts.length}/8 destacados`;
  }

  // Update select options
  const select = dom.featuredSelect;
  if (select) {
    const currentIds = new Set(featuredProducts.map(fp => String(fp.id)));
    const available = products.filter(p => !currentIds.has(String(p.id)));

    const defaultOption = select.querySelector('option[disabled]');
    select.innerHTML = '';
    if (defaultOption) select.appendChild(defaultOption);

    available.forEach(p => {
      const option = document.createElement('option');
      option.value = p.id;
      option.textContent = `${p.brand} - ${p.name}`;
      select.appendChild(option);
    });
  }
}

async function handleAddFeaturedProduct() {
  const select = dom.featuredSelect;
  const productId = select.value;
  if (!productId) return;

  try {
    const client = await ensureApiClient();
    await client.addFeaturedProduct(productId);
    await loadFeaturedProducts();
    showToast('Producto destacado agregado.');
  } catch (error) {
    console.error(error);
    showToast('No se pudo destacar el producto.');
  }
}

async function removeFeaturedProduct(id) {
  try {
    const client = await ensureApiClient();
    await client.removeFeaturedProduct(id);
    await loadFeaturedProducts();
    showToast('Producto destacado removido.');
  } catch (error) {
    console.error(error);
    showToast('No se pudo quitar de destacados.');
  }
}

function renderPromotionsTable() {
  if (!dom.promotionsTableBody) return;
  dom.promotionsTableBody.innerHTML = promotions.map(p => {
    // Find product name if possible
    const prod = products.find(prod => String(prod.id) === String(p.productId));
    const prodName = prod ? `${prod.brand} - ${prod.name}` : `ID: ${p.productId}`;

    return `
        <tr>
             <td>${prodName}</td>
             <td>${p.description}</td>
             <td>${p.discount}%</td>
             <td>${p.start}</td>
             <td>${p.end}</td>
             <td>${p.active ? 'Activo' : 'Inactivo'}</td>
             <td class="column-actions">
                <button class="btn-icon" disabled title="No implementado">✏️</button>
                <button class="btn-icon" disabled title="No implementado">🗑️</button>
             </td>
        </tr>
    `}).join('');
}

function handleFileSelection(event, form) {
  // Placeholder
}

function validateProductForm(form) {
  return form.checkValidity();
}

function collectProductData(form) {
  const formData = new FormData(form);
  const fileInput = form.querySelector('input[type="file"]');

  return {
    productType: formData.get('productType'),
    name: formData.get('name'),
    brand: formData.get('brand'),
    description: formData.get('description'),
    volume: formData.get('volume'),
    gender: formData.get('gender'),
    stock: formData.get('stock'),
    notes: formData.get('notes'),
    family: formData.get('family'),
    piramideSalida: formData.get('piramideSalida'),
    piramideCorazon: formData.get('piramideCorazon'),
    piramideFondo: formData.get('piramideFondo'),
    inspired: formData.get('inspired'),
    price: formData.get('price'),
    images: fileInput ? fileInput.files : null
  };
}

function toPerfumeRequest(data) {
  return {
    nombre: data.name,
    marca: data.brand,
    descripcion: data.description,
    precio: parseFloat(data.price),
    stock: parseInt(data.stock),
    ml: parseFloat(data.volume),
    genero: data.gender,
    notas: data.notes,
    familia: data.family,
    piramideSalida: data.piramideSalida,
    piramideCorazon: data.piramideCorazon,
    piramideFondo: data.piramideFondo,
    inspiracion: data.inspired,
    decant: data.productType === 'decant'
  };
}

function mapPerfumeResponse(apiProduct, localOverride = {}) {
  return {
    id: apiProduct.id,
    name: apiProduct.nombre,
    brand: apiProduct.marca,
    description: apiProduct.descripcion,
    price: Number(apiProduct.precio),
    stock: Number(apiProduct.stock),
    type: apiProduct.decant ? 'decant' : 'perfume',
    volume: apiProduct.ml,
    gender: apiProduct.genero,
    notes: apiProduct.notas,
    family: apiProduct.familia,
    piramide: {
      salida: apiProduct.piramideSalida,
      corazon: apiProduct.piramideCorazon,
      fondo: apiProduct.piramideFondo
    },
    images: apiProduct.imagenes || [],
    inspired: apiProduct.inspiracion,
    ...localOverride
  };
}

function upsertProduct(product) {
  const index = products.findIndex(p => String(p.id) === String(product.id));
  if (index >= 0) {
    products[index] = product;
  } else {
    products.push(product);
  }
}

function collectPromotionData(form) {
  const formData = new FormData(form);
  return {
    productId: formData.get('promotionProduct'),
    description: formData.get('promotionDescription'),
    discount: formData.get('promotionDiscount'),
    start: formData.get('promotionStart'),
    end: formData.get('promotionEnd'),
    active: formData.get('promotionActive') === 'on'
  };
}
