const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

const API_BASE_URL = '/api';

const state = {
  perfumes: [],
  vapes: [],
  promotions: [],
  flavors: []
};

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
  adminModals: document.querySelectorAll('.admin-modal')
};

let addProductHelpers;
let editProductHelpers;

const textSanitizer = document.createElement('textarea');

document.addEventListener('DOMContentLoaded', () => {
  setupAccordions();
  addProductHelpers = setupProductForm(dom.addProductForm);
  editProductHelpers = setupProductForm(dom.editProductForm);
  setupPromotionForm(dom.addPromotionForm);
  setupPromotionForm(dom.editPromotionForm);
  setTodayAsDefault(dom.addPromotionForm?.querySelector('#promotionStart'));
  enhanceSearchableSelect(dom.promotionProductSelect);
  enhanceSearchableSelect(dom.editPromotionProductSelect);
  setupModalTriggers();

  dom.addProductForm?.addEventListener('submit', handleAddProductSubmit);
  dom.editProductForm?.addEventListener('submit', handleEditProductSubmit);
  dom.addPromotionForm?.addEventListener('submit', handleAddPromotionSubmit);
  dom.editPromotionForm?.addEventListener('submit', handleEditPromotionSubmit);

  initializeData();
});

async function initializeData() {
  try {
    await loadFlavors();
    await Promise.all([
      refreshPerfumes(),
      refreshVapes(),
      refreshPromotions()
    ]);
    renderProductsTable();
    populateProductOptions();
    renderPromotionsTable();
  } catch (error) {
    handleError(error, 'No se pudieron cargar los datos iniciales.');
  }
}

async function loadFlavors() {
  try {
    const response = await apiRequest('/public/sabores', { auth: false });
    if (Array.isArray(response)) {
      state.flavors = response.map(mapFlavor).filter((flavor) => flavor.id && flavor.name);
    }
  } catch (error) {
    console.warn('No se pudieron obtener los sabores disponibles.', error);
    state.flavors = [];
  }
}

async function refreshPerfumes() {
  try {
    const response = await apiRequest('/admin/perfumes');
    if (Array.isArray(response)) {
      state.perfumes = response.map(mapPerfumeResponse);
    }
  } catch (error) {
    handleError(error, 'No se pudieron cargar los perfumes.');
  }
}

async function refreshVapes() {
  try {
    const response = await apiRequest('/admin/vapes');
    if (Array.isArray(response)) {
      state.vapes = response.map(mapVapeResponse);
    }
  } catch (error) {
    handleError(error, 'No se pudieron cargar los vapes.');
  }
}

async function refreshPromotions() {
  try {
    const response = await apiRequest('/admin/promociones');
    if (Array.isArray(response)) {
      state.promotions = response.map(mapPromotionResponse);
    }
  } catch (error) {
    handleError(error, 'No se pudieron cargar las promociones.');
  }
}

function getAllProducts() {
  return [...state.perfumes, ...state.vapes];
}

function findProductById(id) {
  return getAllProducts().find((product) => String(product.id) === String(id));
}

function findPromotionById(id) {
  return state.promotions.find((promotion) => String(promotion.id) === String(id));
}

async function handleAddProductSubmit(event) {
  event.preventDefault();
  if (!dom.addProductForm) return;

  if (!dom.addProductForm.checkValidity()) {
    dom.addProductForm.reportValidity();
    return;
  }

  if (!validateProductForm(dom.addProductForm)) {
    return;
  }

  const values = collectProductFormValues(dom.addProductForm);
  const { resource, payload } = buildProductPayload(values);
  setFormSubmitting(dom.addProductForm, true);

  try {
    if (resource === 'vape') {
      const flavorIds = await ensureFlavorIds(values.flavors);
      payload.saboresIds = flavorIds;
      await apiRequest('/admin/vapes', { method: 'POST', body: payload });
      await refreshVapes();
    } else {
      await apiRequest('/admin/perfumes', { method: 'POST', body: payload });
      await refreshPerfumes();
    }

    dom.addProductForm.reset();
    addProductHelpers?.reset?.();
    renderProductsTable();
    populateProductOptions();
    showToast('Producto agregado correctamente.', { variant: 'success' });
  } catch (error) {
    handleError(error, 'No se pudo agregar el producto.');
  } finally {
    setFormSubmitting(dom.addProductForm, false);
  }
}

async function handleEditProductSubmit(event) {
  event.preventDefault();
  if (!dom.editProductForm) return;

  if (!dom.editProductForm.checkValidity()) {
    dom.editProductForm.reportValidity();
    return;
  }

  if (!validateProductForm(dom.editProductForm)) {
    return;
  }

  const productId = dom.editProductForm.dataset.productId;
  const resource = dom.editProductForm.dataset.productResource;
  if (!productId || !resource) {
    handleError(new Error('No se pudo determinar el producto a actualizar.'), 'Datos incompletos para actualizar el producto.');
    return;
  }

  const values = collectProductFormValues(dom.editProductForm);
  const { payload } = buildProductPayload(values);
  setFormSubmitting(dom.editProductForm, true);

  try {
    if (resource === 'vape') {
      const flavorIds = await ensureFlavorIds(values.flavors);
      payload.saboresIds = flavorIds;
      await apiRequest(`/admin/vapes/${productId}`, { method: 'PUT', body: payload });
      await refreshVapes();
    } else {
      await apiRequest(`/admin/perfumes/${productId}`, { method: 'PUT', body: payload });
      await refreshPerfumes();
    }

    closeModal(dom.productModal);
    renderProductsTable();
    populateProductOptions();
    showToast('Producto actualizado correctamente.', { variant: 'success' });
  } catch (error) {
    handleError(error, 'No se pudo actualizar el producto.');
  } finally {
    setFormSubmitting(dom.editProductForm, false);
  }
}

async function handleAddPromotionSubmit(event) {
  event.preventDefault();
  if (!dom.addPromotionForm) return;

  if (!dom.addPromotionForm.checkValidity()) {
    dom.addPromotionForm.reportValidity();
    return;
  }

  if (!validatePromotionDates(dom.addPromotionForm)) {
    return;
  }

  const payload = collectPromotionData(dom.addPromotionForm);
  setFormSubmitting(dom.addPromotionForm, true);

  try {
    await apiRequest('/admin/promociones', { method: 'POST', body: payload });
    await refreshPromotions();
    dom.addPromotionForm.reset();
    setTodayAsDefault(dom.addPromotionForm.querySelector('#promotionStart'));
    renderPromotionsTable();
    showToast('Promoción agregada correctamente.', { variant: 'success' });
  } catch (error) {
    handleError(error, 'No se pudo agregar la promoción.');
  } finally {
    setFormSubmitting(dom.addPromotionForm, false);
  }
}

async function handleEditPromotionSubmit(event) {
  event.preventDefault();
  if (!dom.editPromotionForm) return;

  if (!dom.editPromotionForm.checkValidity()) {
    dom.editPromotionForm.reportValidity();
    return;
  }

  if (!validatePromotionDates(dom.editPromotionForm)) {
    return;
  }

  const promotionId = dom.editPromotionForm.dataset.promotionId;
  if (!promotionId) {
    handleError(new Error('Promoción no encontrada'), 'Datos incompletos para actualizar la promoción.');
    return;
  }

  const payload = collectPromotionData(dom.editPromotionForm);
  setFormSubmitting(dom.editPromotionForm, true);

  try {
    await apiRequest(`/admin/promociones/${promotionId}`, { method: 'PUT', body: payload });
    await refreshPromotions();
    closeModal(dom.promotionModal);
    renderPromotionsTable();
    showToast('Promoción actualizada correctamente.', { variant: 'success' });
  } catch (error) {
    handleError(error, 'No se pudo actualizar la promoción.');
  } finally {
    setFormSubmitting(dom.editPromotionForm, false);
  }
}

async function handleDeleteProduct(resource, id) {
  const product = findProductById(id);
  if (!product) return;

  const confirmed = window.confirm(`¿Eliminar "${product.name}" de forma permanente?`);
  if (!confirmed) return;

  try {
    const endpoint = resource === 'vape' ? `/admin/vapes/${id}` : `/admin/perfumes/${id}`;
    await apiRequest(endpoint, { method: 'DELETE' });
    if (resource === 'vape') {
      await refreshVapes();
    } else {
      await refreshPerfumes();
    }
    renderProductsTable();
    populateProductOptions();
    showToast('Producto eliminado correctamente.', { variant: 'success' });
  } catch (error) {
    handleError(error, 'No se pudo eliminar el producto.');
  }
}

async function handleDeletePromotion(id) {
  const promotion = findPromotionById(id);
  if (!promotion) return;
  const confirmed = window.confirm('¿Eliminar esta promoción?');
  if (!confirmed) return;

  try {
    await apiRequest(`/admin/promociones/${id}`, { method: 'DELETE' });
    await refreshPromotions();
    renderPromotionsTable();
    showToast('Promoción eliminada correctamente.', { variant: 'success' });
  } catch (error) {
    handleError(error, 'No se pudo eliminar la promoción.');
  }
}

async function togglePromotionActive(id, active) {
  const promotion = findPromotionById(id);
  if (!promotion) return;

  const payload = {
    productoId: promotion.productId,
    descripcion: promotion.description,
    descuento: promotion.discount,
    fechaInicio: promotion.startDate,
    fechaFin: promotion.endDate,
    activo: active
  };

  try {
    await apiRequest(`/admin/promociones/${id}`, { method: 'PUT', body: payload });
    await refreshPromotions();
    renderPromotionsTable();
    showToast(`Promoción ${active ? 'activada' : 'desactivada'}.`, { variant: 'success' });
  } catch (error) {
    handleError(error, 'No se pudo cambiar el estado de la promoción.');
  }
}

function renderProductsTable() {
  if (!dom.productsTableBody) return;
  const products = getAllProducts();
  dom.productsTableBody.innerHTML = '';

  if (!products.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 6;
    cell.className = 'table-empty';
    cell.textContent = 'Todavía no cargaste productos.';
    row.appendChild(cell);
    dom.productsTableBody.appendChild(row);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = product.name || '—';
    row.appendChild(nameCell);

    const brandCell = document.createElement('td');
    brandCell.textContent = product.brand || '—';
    row.appendChild(brandCell);

    const typeCell = document.createElement('td');
    typeCell.textContent = formatProductType(product.type);
    row.appendChild(typeCell);

    const priceCell = document.createElement('td');
    priceCell.textContent = Number.isFinite(product.price) ? currencyFormatter.format(product.price) : '—';
    row.appendChild(priceCell);

    const stockCell = document.createElement('td');
    stockCell.textContent = Number.isFinite(product.stock) ? product.stock : '—';
    row.appendChild(stockCell);

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('column-actions');
    const actionsWrapper = document.createElement('div');
    actionsWrapper.classList.add('table-actions');

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn btn--ghost js-edit-product';
    editButton.dataset.productId = String(product.id);
    editButton.dataset.productResource = product.resource;
    editButton.textContent = 'Modificar';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn--danger js-delete-product';
    deleteButton.dataset.productId = String(product.id);
    deleteButton.dataset.productResource = product.resource;
    deleteButton.textContent = 'Eliminar';

    actionsWrapper.append(editButton, deleteButton);
    actionsCell.appendChild(actionsWrapper);
    row.appendChild(actionsCell);

    dom.productsTableBody.appendChild(row);
  });

  dom.productsTableBody.querySelectorAll('.js-edit-product').forEach((button) => {
    button.addEventListener('click', () => {
      const { productId, productResource } = button.dataset;
      openProductModal(productId, productResource);
    });
  });

  dom.productsTableBody.querySelectorAll('.js-delete-product').forEach((button) => {
    button.addEventListener('click', () => {
      const { productId, productResource } = button.dataset;
      if (!productId || !productResource) return;
      handleDeleteProduct(productResource, productId);
    });
  });
}

function renderPromotionsTable() {
  if (!dom.promotionsTableBody) return;
  dom.promotionsTableBody.innerHTML = '';

  if (!state.promotions.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 7;
    cell.className = 'table-empty';
    cell.textContent = 'No hay promociones activas.';
    row.appendChild(cell);
    dom.promotionsTableBody.appendChild(row);
    return;
  }

  state.promotions.forEach((promotion) => {
    const row = document.createElement('tr');
    const productCell = document.createElement('td');
    const linkedProduct = findProductById(promotion.productId);
    productCell.textContent = promotion.productName || linkedProduct?.name || 'Producto no disponible';
    row.appendChild(productCell);

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = promotion.description || '—';
    row.appendChild(descriptionCell);

    const discountCell = document.createElement('td');
    discountCell.textContent = `${promotion.discount ?? 0}%`;
    row.appendChild(discountCell);

    const startCell = document.createElement('td');
    startCell.textContent = promotion.startDate || '—';
    row.appendChild(startCell);

    const endCell = document.createElement('td');
    endCell.textContent = promotion.endDate || '—';
    row.appendChild(endCell);

    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = promotion.active ? 'status-badge is-active' : 'status-badge is-inactive';
    statusBadge.textContent = promotion.active ? 'ACTIVA' : 'INACTIVA';
    statusCell.appendChild(statusBadge);
    row.appendChild(statusCell);

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('column-actions');
    const actionsWrapper = document.createElement('div');
    actionsWrapper.classList.add('table-actions');

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn btn--ghost js-edit-promotion';
    editButton.dataset.promotionId = String(promotion.id);
    editButton.textContent = 'Modificar';

    const toggleButton = document.createElement('button');
    toggleButton.type = 'button';
    toggleButton.className = 'btn btn--warning js-toggle-promotion';
    toggleButton.dataset.promotionId = String(promotion.id);
    toggleButton.textContent = promotion.active ? 'Desactivar' : 'Activar';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn--danger js-delete-promotion';
    deleteButton.dataset.promotionId = String(promotion.id);
    deleteButton.textContent = 'Eliminar';

    actionsWrapper.append(editButton, toggleButton, deleteButton);
    actionsCell.appendChild(actionsWrapper);
    row.appendChild(actionsCell);

    dom.promotionsTableBody.appendChild(row);
  });

  dom.promotionsTableBody.querySelectorAll('.js-edit-promotion').forEach((button) => {
    button.addEventListener('click', () => {
      openPromotionModal(button.dataset.promotionId);
    });
  });

  dom.promotionsTableBody.querySelectorAll('.js-toggle-promotion').forEach((button) => {
    button.addEventListener('click', () => {
      const promotionId = button.dataset.promotionId;
      const promotion = findPromotionById(promotionId);
      if (!promotion) return;
      togglePromotionActive(promotionId, !promotion.active);
    });
  });

  dom.promotionsTableBody.querySelectorAll('.js-delete-promotion').forEach((button) => {
    button.addEventListener('click', () => {
      handleDeletePromotion(button.dataset.promotionId);
    });
  });
}

function populateProductOptions() {
  const selects = [dom.promotionProductSelect, dom.editPromotionProductSelect];
  selects.forEach((select) => {
    if (!select) return;
    const currentValue = select.value;
    const placeholderOption = select.querySelector('option[disabled]');
    const placeholderText = placeholderOption?.textContent || 'Seleccioná un producto';
    select.innerHTML = '';
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.textContent = placeholderText;
    placeholder.selected = !currentValue;
    select.appendChild(placeholder);

    state.perfumes.forEach((product) => {
      const option = document.createElement('option');
      option.value = String(product.id);
      option.textContent = `${product.name} · ${formatProductType(product.type)}`;
      select.appendChild(option);
    });

    if (currentValue) {
      select.value = currentValue;
      if (!select.value) {
        placeholder.selected = true;
      }
    }
  });
}

function openProductModal(productId, resource) {
  const product = findProductById(productId);
  if (!product) return;

  if (!editProductHelpers) {
    editProductHelpers = setupProductForm(dom.editProductForm);
  }

  editProductHelpers?.fill(product);
  if (dom.editProductForm) {
    dom.editProductForm.dataset.productId = product.id;
    dom.editProductForm.dataset.productResource = resource || product.resource;
  }
  openModal(dom.productModal);
}

function openPromotionModal(promotionId) {
  const promotion = findPromotionById(promotionId);
  if (!promotion || !dom.editPromotionForm) return;

  populateProductOptions();
  const productSelect = dom.editPromotionForm.querySelector('#editPromotionProduct');
  const descriptionField = dom.editPromotionForm.querySelector('#editPromotionDescription');
  const discountField = dom.editPromotionForm.querySelector('#editPromotionDiscount');
  const startField = dom.editPromotionForm.querySelector('#editPromotionStart');
  const endField = dom.editPromotionForm.querySelector('#editPromotionEnd');
  const activeField = dom.editPromotionForm.querySelector('#editPromotionActive');

  if (productSelect) productSelect.value = promotion.productId ? String(promotion.productId) : '';
  if (descriptionField) descriptionField.value = promotion.description || '';
  if (discountField) discountField.value = promotion.discount ?? '';
  if (startField) startField.value = promotion.startDate || '';
  if (endField) endField.value = promotion.endDate || '';
  if (activeField) activeField.checked = Boolean(promotion.active);

  dom.editPromotionForm.dataset.promotionId = promotion.id;
  openModal(dom.promotionModal);
}

async function ensureFlavorIds(flavors) {
  if (!Array.isArray(flavors)) return [];
  const ids = [];
  const missing = [];

  flavors.forEach((flavor) => {
    if (!flavor?.name) return;
    if (flavor.id) {
      ids.push(flavor.id);
      return;
    }
    const existing = state.flavors.find((item) => item.name.toLowerCase() === flavor.name.toLowerCase());
    if (existing) {
      ids.push(existing.id);
    } else {
      missing.push(flavor.name);
    }
  });

  if (missing.length) {
    const creations = await Promise.allSettled(missing.map((name) => createFlavor(name)));
    creations.forEach((result) => {
      if (result.status === 'fulfilled' && result.value) {
        const mapped = mapFlavor(result.value);
        if (mapped.id && mapped.name) {
          state.flavors.push(mapped);
          ids.push(mapped.id);
        }
      }
    });
  }

  return Array.from(new Set(ids.filter((id) => Number.isFinite(Number(id))))).map((id) => Number(id));
}

async function createFlavor(name) {
  const payload = { nombre: name };
  return apiRequest('/admin/sabores', { method: 'POST', body: payload });
}

function collectProductFormValues(form) {
  const type = form.productType.value;
  if (type === 'vape') {
    const flavorSelect = form.querySelector('select[name="vapeFlavorCount"]');
    const flavorCount = Number(flavorSelect?.value || 0);
    const flavors = [];

    for (let i = 1; i <= flavorCount; i += 1) {
      const nameField = form.querySelector(`[name="flavorName${i}"]`);
      const stockField = form.querySelector(`[name="flavorStock${i}"]`);
      if (!nameField) continue;
      flavors.push({
        id: nameField.dataset.flavorId ? Number(nameField.dataset.flavorId) : null,
        name: sanitizeText(nameField.value),
        stock: sanitizeNumber(stockField?.value)
      });
    }

    const totalStock = flavors.reduce((acc, flavor) => acc + (Number.isFinite(flavor.stock) ? flavor.stock : 0), 0);

    return {
      resource: 'vape',
      type,
      name: sanitizeText(form.vapeName?.value),
      brand: sanitizeText(form.vapeBrand?.value),
      description: sanitizeText(form.vapeDescription?.value),
      puffs: sanitizeNumber(form.vapePuffs?.value),
      modes: sanitizeText(form.vapeModes?.value),
      flavors,
      price: sanitizeNumber(form.vapePrice?.value),
      stock: totalStock
    };
  }

  return {
    resource: 'perfume',
    type,
    name: sanitizeText(form.name?.value),
    brand: sanitizeText(form.brand?.value),
    description: sanitizeText(form.description?.value),
    volume: sanitizeText(form.volume?.value),
    gender: sanitizeText(form.gender?.value),
    stock: sanitizeNumber(form.stock?.value),
    notes: sanitizeText(form.notes?.value),
    family: sanitizeText(form.family?.value),
    piramide: {
      salida: sanitizeText(form.piramideSalida?.value),
      corazon: sanitizeText(form.piramideCorazon?.value),
      fondo: sanitizeText(form.piramideFondo?.value)
    },
    inspired: sanitizeText(form.inspired?.value),
    price: sanitizeNumber(form.price?.value),
    decant: type === 'decant',
    ml: sanitizeNumber(form.volume?.value)
  };
}

function buildProductPayload(values) {
  if (values.resource === 'vape') {
    return {
      resource: 'vape',
      payload: {
        nombre: values.name,
        marca: values.brand || null,
        descripcion: values.description || null,
        precio: values.price,
        stock: values.stock,
        pitadas: values.puffs || null,
        modos: values.modes || null,
        saboresIds: []
      }
    };
  }

  return {
    resource: 'perfume',
    payload: {
      nombre: values.name,
      marca: values.brand || null,
      descripcion: values.description || null,
      precio: values.price,
      stock: values.stock,
      volumen: values.volume || null,
      genero: values.gender || null,
      notasPrincipales: values.notes || null,
      salida: values.piramide?.salida || null,
      corazon: values.piramide?.corazon || null,
      fondo: values.piramide?.fondo || null,
      inspiracion: values.inspired || null,
      decant: values.decant,
      fragancia: values.family || null,
      ml: values.ml || null
    }
  };
}

function collectPromotionData(form) {
  return {
    productoId: Number(form.promotionProduct.value),
    descripcion: sanitizeText(form.promotionDescription.value),
    descuento: sanitizeNumber(form.promotionDiscount.value),
    fechaInicio: form.promotionStart.value,
    fechaFin: form.promotionEnd.value,
    activo: form.promotionActive.checked
  };
}

function sanitizeText(value) {
  textSanitizer.value = value ?? '';
  return textSanitizer.value.replace(/[<>]/g, '').trim();
}

function sanitizeNumber(value) {
  const parsed = Number(String(value ?? '').replace(/,/g, '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function apiRequest(path, { method = 'GET', body, headers = {}, auth = true } = {}) {
  const url = path.startsWith('http') ? path : `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const requestHeaders = new Headers({ Accept: 'application/json', ...headers });
  const options = { method, headers: requestHeaders };

  if (body !== undefined && body !== null) {
    requestHeaders.set('Content-Type', 'application/json');
    options.body = JSON.stringify(body);
  }

  if (auth) {
    try {
      const token = await getAuthToken();
      if (token) {
        requestHeaders.set('Authorization', `Bearer ${token}`);
      }
    } catch (error) {
      console.error('No se pudo obtener el token de autenticación.', error);
      throw error;
    }
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    let errorMessage = `Error ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData?.error) errorMessage = errorData.error;
      if (errorData?.message) errorMessage = errorData.message;
      if (errorData?.detalle) errorMessage = errorData.detalle;
    } catch (error) {
      // Ignorar errores al parsear la respuesta
    }
    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    console.warn('No se pudo parsear la respuesta JSON.', error);
    return null;
  }
}

async function getAuthToken() {
  if (typeof window.getAccessToken === 'function') {
    return window.getAccessToken();
  }
  if (window.auth0ClientPromise) {
    const client = await window.auth0ClientPromise;
    if (client?.getTokenSilently) {
      return client.getTokenSilently();
    }
  }
  throw new Error('Auth0 no está disponible.');
}

function mapPerfumeResponse(perfume) {
  return {
    id: perfume.id,
    resource: 'perfume',
    type: perfume.decant ? 'decant' : 'perfume',
    name: perfume.nombre || perfume.name || '—',
    brand: perfume.marca || '—',
    description: perfume.descripcion || '',
    volume: perfume.volumen || '',
    gender: perfume.genero || '',
    stock: Number(perfume.stock ?? 0),
    notes: perfume.notasPrincipales || '',
    family: perfume.fragancia || '',
    piramide: {
      salida: perfume.salida || '',
      corazon: perfume.corazon || '',
      fondo: perfume.fondo || ''
    },
    inspired: perfume.inspiracion || '',
    price: Number(perfume.precio ?? 0),
    decant: Boolean(perfume.decant),
    ml: Number(perfume.ml ?? perfume.volumen ?? 0)
  };
}

function mapVapeResponse(vape) {
  const flavors = Array.isArray(vape.sabores) || vape.sabores instanceof Set
    ? Array.from(vape.sabores).map((name) => {
        const normalized = typeof name === 'string' ? name : String(name ?? '').trim();
        const existing = state.flavors.find((flavor) => flavor.name.toLowerCase() === normalized.toLowerCase());
        return {
          id: existing?.id ?? null,
          name: normalized,
          stock: null
        };
      })
    : [];

  return {
    id: vape.id,
    resource: 'vape',
    type: 'vape',
    name: vape.nombre || vape.name || '—',
    brand: vape.marca || '—',
    description: vape.descripcion || '',
    puffs: Number(vape.pitadas ?? 0),
    modes: vape.modos || '',
    flavors,
    price: Number(vape.precio ?? 0),
    stock: Number(vape.stock ?? 0)
  };
}

function mapPromotionResponse(promotion) {
  const productData = promotion.producto || promotion.product || {};
  const productId = promotion.productoId ?? promotion.productId ?? productData.id ?? null;
  const discount = promotion.descuento ?? promotion.discount ?? 0;
  return {
    id: promotion.id,
    productId: productId ? Number(productId) : null,
    productName: productData.nombre || promotion.productoNombre || promotion.productName || '',
    description: promotion.descripcion ?? promotion.description ?? '',
    discount: Number(discount),
    startDate: promotion.fechaInicio || promotion.startDate || '',
    endDate: promotion.fechaFin || promotion.endDate || '',
    active: promotion.activo ?? promotion.estado ?? promotion.active ?? false
  };
}

function mapFlavor(flavor) {
  return {
    id: Number(flavor.id),
    name: sanitizeText(flavor.nombre || flavor.name || '')
  };
}

function formatProductType(type) {
  if (type === 'perfume') return 'Perfume';
  if (type === 'decant') return 'Decant';
  if (type === 'vape') return 'Vape';
  return type || '';
}

function setFormSubmitting(form, isSubmitting) {
  if (!form) return;
  const buttons = form.querySelectorAll('button[type="submit"], button:not([type])');
  buttons.forEach((button) => {
    button.disabled = isSubmitting;
    button.classList.toggle('is-loading', isSubmitting);
  });
}

function handleError(error, fallbackMessage) {
  console.error(fallbackMessage, error);
  showToast(fallbackMessage || 'Ocurrió un error inesperado.', { variant: 'error' });
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
  const vapeFields = form.querySelector('[data-product-group="vape"]');
  const flavorSelect = form.querySelector('select[name="vapeFlavorCount"]');
  const flavorsContainer = form.querySelector('.dynamic-flavors');
  const fileInput = form.querySelector('input[type="file"]');
  const prefix = form.id ? `${form.id}-` : `form-${Math.random().toString(16).slice(2)}-`;
  form.dataset.flavorPrefix = prefix;

  const toggleGroup = (group, enable) => {
    if (!group) return;
    group.hidden = !enable;
    group.querySelectorAll('input, textarea, select').forEach((field) => {
      field.disabled = !enable;
    });
  };

  const renderFlavorInputs = (count, flavorData = []) => {
    if (!flavorsContainer) return;
    flavorsContainer.innerHTML = '';
    if (count <= 0) return;

    for (let i = 1; i <= count; i += 1) {
      const row = document.createElement('div');
      row.className = 'dynamic-flavor-row';
      const flavor = flavorData[i - 1] || {};
      row.innerHTML = `
        <div class="form-field">
          <label for="${prefix}FlavorName${i}">Nombre del Sabor ${i}</label>
          <input type="text" id="${prefix}FlavorName${i}" name="flavorName${i}" value="${flavor.name || ''}" required>
        </div>
        <div class="form-field">
          <label for="${prefix}FlavorStock${i}">Stock del Sabor ${i}</label>
          <input type="number" id="${prefix}FlavorStock${i}" name="flavorStock${i}" min="0" value="${flavor.stock ?? ''}" required>
        </div>
      `;
      flavorsContainer.appendChild(row);
      const nameField = row.querySelector(`#${prefix}FlavorName${i}`);
      if (nameField) {
        if (flavor.id) {
          nameField.dataset.flavorId = String(flavor.id);
        } else {
          delete nameField.dataset.flavorId;
        }
      }
    }
  };

  const updateProductFields = () => {
    const value = typeSelect.value;
    const isFragrance = value === 'perfume' || value === 'decant';
    toggleGroup(fragranceFields, isFragrance);
    toggleGroup(vapeFields, value === 'vape');
    if (value !== 'vape' && flavorSelect) {
      flavorSelect.value = '0';
      if (flavorsContainer) flavorsContainer.innerHTML = '';
    }
  };

  typeSelect?.addEventListener('change', () => {
    updateProductFields();
  });

  flavorSelect?.addEventListener('change', () => {
    const count = Number(flavorSelect.value) || 0;
    renderFlavorInputs(count);
  });

  fileInput?.addEventListener('change', () => {
    validateImageInput(fileInput);
  });

  updateProductFields();

  return {
    reset() {
      toggleGroup(fragranceFields, false);
      toggleGroup(vapeFields, false);
      if (flavorSelect) {
        flavorSelect.value = '0';
      }
      if (flavorsContainer) {
        flavorsContainer.innerHTML = '';
      }
    },
    fill(product) {
      typeSelect.value = product.type;
      typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      if (product.type === 'vape') {
        const vapeName = form.querySelector('input[name="vapeName"]');
        const vapeBrand = form.querySelector('input[name="vapeBrand"]');
        const vapeDescription = form.querySelector('textarea[name="vapeDescription"]');
        const vapePuffs = form.querySelector('input[name="vapePuffs"]');
        const vapeModes = form.querySelector('input[name="vapeModes"]');
        const vapePrice = form.querySelector('input[name="vapePrice"]');
        if (vapeName) vapeName.value = product.name || '';
        if (vapeBrand) vapeBrand.value = product.brand || '';
        if (vapeDescription) vapeDescription.value = product.description || '';
        if (vapePuffs) vapePuffs.value = product.puffs ?? '';
        if (vapeModes) vapeModes.value = product.modes || '';
        if (vapePrice) vapePrice.value = product.price ?? '';
        const flavors = product.flavors || [];
        if (flavorSelect) {
          flavorSelect.value = String(flavors.length);
          flavorSelect.dispatchEvent(new Event('change', { bubbles: true }));
        }
        flavors.forEach((flavor, index) => {
          const flavorName = form.querySelector(`#${prefix}FlavorName${index + 1}`);
          const flavorStock = form.querySelector(`#${prefix}FlavorStock${index + 1}`);
          if (flavorName) {
            flavorName.value = flavor.name || '';
            if (flavor.id) {
              flavorName.dataset.flavorId = String(flavor.id);
            } else {
              delete flavorName.dataset.flavorId;
            }
          }
          if (flavorStock) flavorStock.value = flavor.stock ?? '';
        });
      } else {
        const nameField = form.querySelector('input[name="name"]');
        const brandField = form.querySelector('input[name="brand"]');
        const descriptionField = form.querySelector('textarea[name="description"]');
        const volumeField = form.querySelector('input[name="volume"]');
        const genderField = form.querySelector('select[name="gender"]');
        const stockField = form.querySelector('input[name="stock"]');
        const notesField = form.querySelector('input[name="notes"]');
        const familyField = form.querySelector('input[name="family"]');
        const salidaField = form.querySelector('input[name="piramideSalida"]');
        const corazonField = form.querySelector('input[name="piramideCorazon"]');
        const fondoField = form.querySelector('input[name="piramideFondo"]');
        const inspiredField = form.querySelector('input[name="inspired"]');
        const priceField = form.querySelector('input[name="price"]');
        if (nameField) nameField.value = product.name || '';
        if (brandField) brandField.value = product.brand || '';
        if (descriptionField) descriptionField.value = product.description || '';
        if (volumeField) volumeField.value = product.volume ?? '';
        if (genderField) genderField.value = product.gender || '';
        if (stockField) stockField.value = product.stock ?? '';
        if (notesField) notesField.value = product.notes || '';
        if (familyField) familyField.value = product.family || '';
        if (salidaField) salidaField.value = product.piramide?.salida || '';
        if (corazonField) corazonField.value = product.piramide?.corazon || '';
        if (fondoField) fondoField.value = product.piramide?.fondo || '';
        if (inspiredField) inspiredField.value = product.inspired || '';
        if (priceField) priceField.value = product.price ?? '';
      }
    }
  };
}

function validateImageInput(input) {
  if (!input || input.disabled) return true;
  const { files } = input;
  if (!files) return true;
  const hasFiles = files.length > 0;
  if (!hasFiles || files.length > 5) {
    input.setCustomValidity('Seleccioná entre 1 y 5 imágenes.');
    input.reportValidity();
    return false;
  }
  input.setCustomValidity('');
  return true;
}

function validateProductForm(form) {
  if (!form) return false;
  const type = form.productType.value;
  if (type === 'perfume' || type === 'decant') {
    const fileInput = form.querySelector('input[type="file"]');
    if (!validateImageInput(fileInput)) {
      return false;
    }
  }
  if (type === 'vape') {
    const flavorSelect = form.querySelector('select[name="vapeFlavorCount"]');
    if (flavorSelect) {
      const count = Number(flavorSelect.value);
      if (!count) {
        flavorSelect.setCustomValidity('Seleccioná cuántos sabores tendrá el producto.');
        flavorSelect.reportValidity();
        return false;
      }
      flavorSelect.setCustomValidity('');
    }
  }
  return true;
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

function showToast(message, { variant = 'info' } = {}) {
  const container = document.querySelector('.cart-toast-layer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast--${variant}`;
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
    .admin-toast--success {
      background: rgba(16, 185, 129, 0.95);
    }
    .admin-toast--error {
      background: rgba(239, 68, 68, 0.95);
    }
    .admin-toast--info {
      background: rgba(0, 74, 173, 0.95);
    }
  `;
  document.head.appendChild(style);
})();
