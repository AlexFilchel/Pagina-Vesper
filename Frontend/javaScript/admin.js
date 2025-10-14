const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

let products = [];
let promotions = [];

const flavorCache = new Map();

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

document.addEventListener('DOMContentLoaded', () => {
  setupAccordions();
  addProductHelpers = setupProductForm(dom.addProductForm);
  editProductHelpers = setupProductForm(dom.editProductForm);
  setupPromotionForm(dom.addPromotionForm);
  setupPromotionForm(dom.editPromotionForm);
  populateProductOptions();
  enhanceSearchableSelect(dom.promotionProductSelect);
  enhanceSearchableSelect(dom.editPromotionProductSelect);

  renderProductsTable();
  renderPromotionsTable();
  setTodayAsDefault(dom.addPromotionForm?.querySelector('#promotionStart'));
  setupModalTriggers();

  initializeAdmin();

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

    const newProduct = collectProductData(dom.addProductForm);

    try {
      const savedProduct = await createProduct(newProduct);
      if (!savedProduct) {
        throw new Error('El producto no pudo guardarse en la base de datos.');
      }
      products.push(savedProduct);
      renderProductsTable();
      populateProductOptions();
      dom.addProductForm.reset();
      addProductHelpers?.reset?.();
      showToast('Producto agregado correctamente.');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'No se pudo guardar el producto.');
    }
  });

  dom.editProductForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!dom.editProductForm.checkValidity()) {
      dom.editProductForm.reportValidity();
      return;
    }
    if (!validateProductForm(dom.editProductForm)) {
      return;
    }

    const editedProduct = collectProductData(dom.editProductForm);
    const productId = dom.editProductForm.dataset.productId;
    const index = products.findIndex((item) => String(item.id) === String(productId));
    if (index === -1) {
      showToast('No se encontró el producto seleccionado.');
      return;
    }
    if (products[index].type !== editedProduct.type) {
      showToast('No es posible cambiar el tipo del producto.');
      return;
    }

    try {
      const updatedProduct = await updateProduct(productId, editedProduct);
      products[index] = updatedProduct;
      renderProductsTable();
      populateProductOptions();
      closeModal(dom.productModal);
      showToast('Producto actualizado correctamente.');
    } catch (error) {
      console.error(error);
      showToast(error?.message || 'No se pudo actualizar el producto.');
    }
  });

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
      const flavorIdAttribute = flavor.id ? ` data-flavor-id="${flavor.id}"` : '';
      row.innerHTML = `
        <div class="form-field">
          <label for="${prefix}FlavorName${i}">Nombre del Sabor ${i}</label>
          <input type="text" id="${prefix}FlavorName${i}" name="flavorName${i}" value="${flavor.name || ''}"${flavorIdAttribute} required>
        </div>
        <div class="form-field">
          <label for="${prefix}FlavorStock${i}">Stock del Sabor ${i}</label>
          <input type="number" id="${prefix}FlavorStock${i}" name="flavorStock${i}" min="0" value="${flavor.stock ?? ''}" required>
        </div>
      `;
      flavorsContainer.appendChild(row);
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
          renderFlavorInputs(flavors.length, flavors);
        }
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

function collectProductData(form) {
  const type = form.productType.value;
  if (type === 'vape') {
    const flavorSelect = form.querySelector('select[name="vapeFlavorCount"]');
    const flavorCount = Number(flavorSelect?.value || 0);
    const flavors = [];
    for (let i = 1; i <= flavorCount; i += 1) {
      const nameField = form.querySelector(`[name="flavorName${i}"]`);
      const stockField = form.querySelector(`[name="flavorStock${i}"]`);
      const flavorId = nameField?.dataset.flavorId ? Number(nameField.dataset.flavorId) : null;
      flavors.push({
        id: Number.isFinite(flavorId) ? flavorId : null,
        name: nameField?.value || '',
        stock: Number(stockField?.value || 0)
      });
    }
    const totalStock = flavors.reduce((acc, flavor) => acc + (Number.isFinite(flavor.stock) ? flavor.stock : 0), 0);
    return {
      type,
      name: form.vapeName?.value || '',
      brand: form.vapeBrand?.value || '',
      description: form.vapeDescription?.value || '',
      puffs: Number(form.vapePuffs?.value || 0),
      modes: form.vapeModes?.value || '',
      flavors,
      price: Number(form.vapePrice?.value || 0),
      stock: totalStock
    };
  }

  return {
    type,
    name: form.name?.value || '',
    brand: form.brand?.value || '',
    description: form.description?.value || '',
    volume: Number(form.volume?.value || 0),
    gender: form.gender?.value || '',
    stock: Number(form.stock?.value || 0),
    notes: form.notes?.value || '',
    family: form.family?.value || '',
    piramide: {
      salida: form.piramideSalida?.value || '',
      corazon: form.piramideCorazon?.value || '',
      fondo: form.piramideFondo?.value || ''
    },
    inspired: form.inspired?.value || '',
    price: Number(form.price?.value || 0),
    decant: type === 'decant'
  };
}

async function initializeAdmin() {
  if (!window.apiClient) {
    console.warn('⚠️ Cliente API no disponible.');
    return;
  }

  try {
    const [flavors, perfumes, vapes] = await Promise.all([
      window.apiClient.fetchFlavors().catch(() => []),
      window.apiClient.fetchPerfumes(),
      window.apiClient.fetchVapes()
    ]);

    updateFlavorCache(Array.isArray(flavors) ? flavors : []);

    const perfumeProducts = Array.isArray(perfumes)
      ? perfumes.map((item) => mapPerfumeResponseToProduct(item)).filter(Boolean)
      : [];
    const vapeProducts = Array.isArray(vapes)
      ? vapes.map((item) => mapVapeResponseToProduct(item)).filter(Boolean)
      : [];

    products = [...perfumeProducts, ...vapeProducts];
    renderProductsTable();
    populateProductOptions();
    renderPromotionsTable();
  } catch (error) {
    console.error('❌ Error cargando productos desde la API', error);
    showToast('No se pudieron cargar los productos desde el servidor.');
  }
}

function updateFlavorCache(flavors) {
  flavorCache.clear();
  flavors.forEach((flavor) => {
    const normalized = normalizeFlavorName(flavor?.nombre);
    if (normalized && typeof flavor.id !== 'undefined') {
      flavorCache.set(normalized, { id: flavor.id, name: flavor.nombre });
    }
  });
}

function normalizeFlavorName(name) {
  return typeof name === 'string' ? name.trim().toLowerCase() : '';
}

function mapPerfumeResponseToProduct(perfume) {
  if (!perfume) return null;
  return {
    id: perfume.id ?? null,
    type: perfume.decant ? 'decant' : 'perfume',
    name: perfume.nombre || '',
    brand: perfume.marca || '',
    description: perfume.descripcion || '',
    volume: typeof perfume.ml === 'number' ? perfume.ml : 0,
    gender: perfume.genero || '',
    stock: typeof perfume.stock === 'number' ? perfume.stock : 0,
    notes: perfume.notasPrincipales || '',
    family: perfume.fragancia || '',
    piramide: {
      salida: perfume.salida || '',
      corazon: perfume.corazon || '',
      fondo: perfume.fondo || ''
    },
    inspired: perfume.inspiracion || '',
    price: typeof perfume.precio === 'number' ? perfume.precio : 0,
    decant: Boolean(perfume.decant)
  };
}

function mapVapeResponseToProduct(vape, fallback = {}) {
  if (!vape) return null;
  const flavorNames = Array.isArray(vape.sabores)
    ? vape.sabores
    : (vape.sabores ? Array.from(vape.sabores) : []);
  let flavors = mapFlavorNamesToProductFlavors(flavorNames, fallback.flavors || []);
  if (!flavors.length && Array.isArray(fallback.flavors)) {
    flavors = fallback.flavors;
  }
  return {
    id: vape.id ?? fallback.id ?? null,
    type: 'vape',
    name: vape.nombre || fallback.name || '',
    brand: vape.marca || fallback.brand || '',
    description: vape.descripcion || fallback.description || '',
    puffs: typeof vape.pitadas === 'number' ? vape.pitadas : fallback.puffs ?? null,
    modes: vape.modos || fallback.modes || '',
    flavors,
    price: typeof vape.precio === 'number' ? vape.precio : fallback.price ?? 0,
    stock: typeof vape.stock === 'number' ? vape.stock : (fallback.stock ?? 0)
  };
}

function mapFlavorNamesToProductFlavors(names, fallbackFlavors = []) {
  if (!Array.isArray(names)) {
    return fallbackFlavors.map((flavor) => ({
      id: flavor.id ?? null,
      name: flavor.name || '',
      stock: flavor.stock ?? null
    }));
  }

  return names.map((name) => {
    const normalized = normalizeFlavorName(name);
    const cached = normalized ? flavorCache.get(normalized) : null;
    const fallback = fallbackFlavors.find(
      (flavor) => normalizeFlavorName(flavor.name) === normalized
    );
    return {
      id: cached?.id ?? fallback?.id ?? null,
      name: name || fallback?.name || '',
      stock: fallback?.stock ?? null
    };
  });
}

function toPerfumeRequest(product) {
  return {
    nombre: product.name,
    precio: product.price,
    descripcion: product.description,
    marca: product.brand,
    stock: product.stock,
    volumen: product.volume ? `${product.volume}` : null,
    genero: product.gender,
    notasPrincipales: product.notes,
    salida: product.piramide?.salida,
    corazon: product.piramide?.corazon,
    fondo: product.piramide?.fondo,
    inspiracion: product.inspired,
    decant: Boolean(product.decant),
    fragancia: product.family,
    ml: Number.isFinite(product.volume) ? Number(product.volume) : null
  };
}

function toVapeRequest(product, flavorIds) {
  return {
    nombre: product.name,
    precio: product.price,
    descripcion: product.description,
    marca: product.brand,
    stock: product.stock,
    pitadas: product.puffs,
    modos: product.modes,
    saboresIds: Array.isArray(flavorIds) && flavorIds.length ? flavorIds : []
  };
}

async function createProduct(productData) {
  if (!window.apiClient) {
    throw new Error('Cliente API no disponible.');
  }

  if (productData.type === 'vape') {
    const flavorIds = await resolveFlavorIds(productData.flavors);
    const response = await window.apiClient.createVape(toVapeRequest(productData, flavorIds));
    const mapped = mapVapeResponseToProduct(response, productData);
    if (!mapped) {
      throw new Error('No se pudo crear el vape.');
    }
    return mapped;
  }

  const response = await window.apiClient.createPerfume(toPerfumeRequest(productData));
  const mapped = mapPerfumeResponseToProduct(response);
  if (!mapped) {
    throw new Error('No se pudo crear el perfume.');
  }
  return mapped;
}

async function updateProduct(id, productData) {
  if (!window.apiClient) {
    throw new Error('Cliente API no disponible.');
  }

  if (productData.type === 'vape') {
    const flavorIds = await resolveFlavorIds(productData.flavors);
    const response = await window.apiClient.updateVape(id, toVapeRequest(productData, flavorIds));
    const mapped = mapVapeResponseToProduct(response, { ...productData, id: Number(id) });
    if (!mapped) {
      throw new Error('No se pudo actualizar el vape.');
    }
    return mapped;
  }

  const response = await window.apiClient.updatePerfume(id, toPerfumeRequest(productData));
  const mapped = mapPerfumeResponseToProduct(response);
  if (!mapped) {
    throw new Error('No se pudo actualizar el perfume.');
  }
  return mapped;
}

async function deleteProduct(product) {
  if (!window.apiClient) {
    throw new Error('Cliente API no disponible.');
  }

  if (product.type === 'vape') {
    await window.apiClient.deleteVape(product.id);
  } else {
    await window.apiClient.deletePerfume(product.id);
  }
}

async function resolveFlavorIds(flavors = []) {
  if (!Array.isArray(flavors) || !flavors.length) {
    return [];
  }

  if (!window.apiClient) {
    throw new Error('Cliente API no disponible.');
  }

  const ids = [];

  for (const flavor of flavors) {
    const normalized = normalizeFlavorName(flavor?.name);
    if (!normalized) {
      continue;
    }

    let cached = Number.isFinite(flavor?.id) ? { id: flavor.id, name: flavor.name } : flavorCache.get(normalized);

    if (!cached) {
      try {
        const created = await window.apiClient.createFlavor({ nombre: flavor.name });
        if (created?.id) {
          cached = { id: created.id, name: created.nombre || flavor.name };
          flavorCache.set(normalized, cached);
        }
      } catch (error) {
        console.error(`❌ No se pudo registrar el sabor "${flavor.name}"`, error);
        continue;
      }
    }

    if (cached?.id) {
      ids.push(cached.id);
      flavor.id = cached.id;
    }
  }

  return [...new Set(ids)];
}

function renderProductsTable() {
  if (!dom.productsTableBody) return;
  dom.productsTableBody.innerHTML = '';
  products.forEach((product) => {
    const row = document.createElement('tr');
    const nameCell = document.createElement('td');
    nameCell.textContent = product.name ?? '';
    row.appendChild(nameCell);

    const brandCell = document.createElement('td');
    brandCell.textContent = product.brand ?? '';
    row.appendChild(brandCell);

    const typeCell = document.createElement('td');
    typeCell.textContent = formatProductType(product.type);
    row.appendChild(typeCell);

    const priceCell = document.createElement('td');
    priceCell.textContent = currencyFormatter.format(product.price || 0);
    row.appendChild(priceCell);

    const stockCell = document.createElement('td');
    stockCell.textContent = String(product.stock ?? 0);
    row.appendChild(stockCell);

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('column-actions');
    const actionsWrapper = document.createElement('div');
    actionsWrapper.classList.add('table-actions');

    const editButton = document.createElement('button');
    editButton.type = 'button';
    editButton.className = 'btn btn--ghost js-edit-product';
    editButton.dataset.productId = String(product.id);
    editButton.textContent = 'Modificar';

    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn--danger js-delete-product';
    deleteButton.dataset.productId = String(product.id);
    deleteButton.textContent = 'Eliminar';

    actionsWrapper.append(editButton, deleteButton);
    actionsCell.appendChild(actionsWrapper);
    row.appendChild(actionsCell);

    dom.productsTableBody.appendChild(row);
  });

  dom.productsTableBody.querySelectorAll('.js-edit-product').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = button.dataset.productId;
      openProductModal(productId);
    });
  });

  dom.productsTableBody.querySelectorAll('.js-delete-product').forEach((button) => {
    button.addEventListener('click', async () => {
      const productId = button.dataset.productId;
      const product = products.find((item) => String(item.id) === String(productId));
      if (!product) return;
      const shouldDelete = window.confirm(`¿Eliminar "${product.name}" de forma permanente?`);
      if (!shouldDelete) {
        return;
      }
      try {
        await deleteProduct(product);
        const index = products.findIndex((item) => String(item.id) === String(productId));
        if (index !== -1) {
          products.splice(index, 1);
        }
        renderProductsTable();
        populateProductOptions();
        showToast('Producto eliminado correctamente.');
      } catch (error) {
        console.error(error);
        showToast(error?.message || 'No se pudo eliminar el producto.');
      }
    });
  });
}

function formatProductType(type) {
  if (type === 'perfume') return 'Perfume';
  if (type === 'decant') return 'Decant';
  if (type === 'vape') return 'Vape';
  return type;
}

function renderPromotionsTable() {
  if (!dom.promotionsTableBody) return;
  dom.promotionsTableBody.innerHTML = '';
  promotions.forEach((promotion) => {
    const product = products.find((item) => String(item.id) === String(promotion.productId));
    const statusClass = promotion.active ? 'status-badge is-active' : 'status-badge is-inactive';
    const statusLabel = promotion.active ? 'ACTIVA' : 'INACTIVA';
    const row = document.createElement('tr');
    const productCell = document.createElement('td');
    productCell.textContent = product?.name ?? 'Producto eliminado';
    row.appendChild(productCell);

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = promotion.description ?? '';
    row.appendChild(descriptionCell);

    const discountCell = document.createElement('td');
    discountCell.textContent = `${promotion.discount}%`;
    row.appendChild(discountCell);

    const startCell = document.createElement('td');
    startCell.textContent = promotion.startDate ?? '';
    row.appendChild(startCell);

    const endCell = document.createElement('td');
    endCell.textContent = promotion.endDate ?? '';
    row.appendChild(endCell);

    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    statusBadge.className = statusClass;
    statusBadge.textContent = statusLabel;
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
      const promotion = promotions.find((item) => String(item.id) === String(promotionId));
      if (!promotion) return;
      promotion.active = !promotion.active;
      renderPromotionsTable();
      showToast(`Promoción ${promotion.active ? 'activada' : 'desactivada'} (simulación).`);
    });
  });

  dom.promotionsTableBody.querySelectorAll('.js-delete-promotion').forEach((button) => {
    button.addEventListener('click', () => {
      const promotionId = button.dataset.promotionId;
      const promotion = promotions.find((item) => String(item.id) === String(promotionId));
      if (!promotion) return;
      const shouldDelete = window.confirm('¿Eliminar esta promoción?');
      if (shouldDelete) {
        const index = promotions.findIndex((item) => String(item.id) === String(promotionId));
        if (index !== -1) {
          promotions.splice(index, 1);
          renderPromotionsTable();
          showToast('Promoción eliminada (simulación).');
        }
      }
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
    products.forEach((product) => {
      const option = document.createElement('option');
      option.value = product.id;
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

function collectPromotionData(form) {
  return {
    productId: form.promotionProduct.value,
    description: form.promotionDescription.value,
    discount: Number(form.promotionDiscount.value || 0),
    startDate: form.promotionStart.value,
    endDate: form.promotionEnd.value,
    active: form.promotionActive.checked
  };
}

function openProductModal(productId) {
  const product = products.find((item) => String(item.id) === String(productId));
  if (!product) return;
  if (!editProductHelpers) {
    editProductHelpers = setupProductForm(dom.editProductForm);
  }
  editProductHelpers?.fill(product);
  dom.editProductForm.dataset.productId = product.id;
  openModal(dom.productModal);
}

function openPromotionModal(promotionId) {
  const promotion = promotions.find((item) => String(item.id) === String(promotionId));
  if (!promotion) return;
  populateProductOptions();
  const productSelect = dom.editPromotionForm?.querySelector('#editPromotionProduct');
  const descriptionField = dom.editPromotionForm?.querySelector('#editPromotionDescription');
  const discountField = dom.editPromotionForm?.querySelector('#editPromotionDiscount');
  const startField = dom.editPromotionForm?.querySelector('#editPromotionStart');
  const endField = dom.editPromotionForm?.querySelector('#editPromotionEnd');
  const activeField = dom.editPromotionForm?.querySelector('#editPromotionActive');
  if (productSelect) productSelect.value = promotion.productId;
  if (descriptionField) descriptionField.value = promotion.description;
  if (discountField) discountField.value = promotion.discount;
  if (startField) startField.value = promotion.startDate;
  if (endField) endField.value = promotion.endDate;
  if (activeField) activeField.checked = promotion.active;
  dom.editPromotionForm.dataset.promotionId = promotion.id;
  openModal(dom.promotionModal);
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
