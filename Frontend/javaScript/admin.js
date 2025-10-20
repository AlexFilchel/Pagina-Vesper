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

      if (newProduct.type === 'vape') {
        // ✅ Construir el objeto completo del producto
        const producto = {
          nombre: newProduct.name,
          marca: newProduct.brand,
          descripcion: newProduct.description,
          precio: newProduct.price,
          stock: newProduct.stock,
          pitadas: newProduct.puffs,
          modos: newProduct.modes,
          sabores: newProduct.flavors
            .filter(f => typeof f.name === 'string' && f.name.trim().length > 0)
            .map(f => ({
              nombre: f.name.trim(),
              stock: Number.isFinite(f.stock) ? f.stock : 0
            }))
        };

        // ✅ Crear el FormData correctamente
        const formData = new FormData();
        formData.append(
          "producto",
          new Blob([JSON.stringify(producto)], { type: "application/json" })
        );

        // Adjuntar imágenes (opcional)
        const fileInput = dom.addProductForm.querySelector('#vapeImages');
        if (fileInput && fileInput.files.length > 0) {
          for (const file of fileInput.files) formData.append("files", file);
        }

        // Enviar al backend
        const created = await client.request("/admin/vapes", {
          method: "POST",
          body: formData,
          authenticated: true
        });

        const mapped = mapVapeResponse(created, newProduct);
        upsertProduct(mapped);
      } else {
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

      if (originalType === 'vape') {
        // ✅ También usamos FormData al editar
        const producto = {
          nombre: editedProduct.name,
          marca: editedProduct.brand,
          descripcion: editedProduct.description,
          precio: editedProduct.price,
          stock: editedProduct.stock,
          pitadas: editedProduct.puffs,
          modos: editedProduct.modes,
          sabores: editedProduct.flavors
            .filter(f => typeof f.name === 'string' && f.name.trim().length > 0)
            .map(f => ({
              nombre: f.name.trim(),
              stock: Number.isFinite(f.stock) ? f.stock : 0
            }))
        };

        const formData = new FormData();
        formData.append(
          "producto",
          new Blob([JSON.stringify(producto)], { type: "application/json" })
        );

        const fileInput = dom.editProductForm.querySelector('input[type="file"]');
        if (fileInput && fileInput.files.length > 0) {
          for (const file of fileInput.files) formData.append("files", file);
        }

        const updated = await client.request(`/admin/vapes/${productId}`, {
          method: "PUT",
          body: formData,
          authenticated: true
        });

        const mapped = mapVapeResponse(updated, editedProduct);
        upsertProduct(mapped);
      } else {
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
          if (flavorName) flavorName.value = flavor.name || '';
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

function collectProductData(form) {
  const type = form.productType.value;
  if (type === 'vape') {
    const flavorSelect = form.querySelector('select[name="vapeFlavorCount"]');
    const flavorCount = Number(flavorSelect?.value || 0);
    const flavors = [];
    for (let i = 1; i <= flavorCount; i += 1) {
      const nameField = form.querySelector(`[name="flavorName${i}"]`);
      const stockField = form.querySelector(`[name="flavorStock${i}"]`);
      flavors.push({
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
    price: Number(form.price?.value || 0)
  };
}

function parseNumberValue(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function ensureApiClient(timeoutMs = 10000) {
  if (apiClient) return apiClient;
  if (window.apiClient) {
    apiClient = window.apiClient;
    return apiClient;
  }

  const start = Date.now();
  return new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (window.apiClient) {
        clearInterval(interval);
        apiClient = window.apiClient;
        resolve(apiClient);
      } else if (Date.now() - start >= timeoutMs) {
        clearInterval(interval);
        reject(new Error('Cliente de API no disponible.'));
      }
    }, 100);
  });
}

async function loadProductsFromApi() {
  if (dom.productsTableBody) {
    const loadingRow = document.createElement('tr');
    const loadingCell = document.createElement('td');
    loadingCell.colSpan = 6;
    loadingCell.textContent = 'Cargando productos...';
    loadingRow.appendChild(loadingCell);
    dom.productsTableBody.innerHTML = '';
    dom.productsTableBody.appendChild(loadingRow);
  }

  const client = await ensureApiClient();
  const [perfumesResponse, vapesResponse] = await Promise.all([
    client.fetchPerfumes(),
    client.fetchVapes()
  ]);

  const perfumeList = Array.isArray(perfumesResponse)
    ? perfumesResponse.map((item) => mapPerfumeResponse(item))
    : [];
  const vapeList = Array.isArray(vapesResponse)
    ? vapesResponse.map((item) => mapVapeResponse(item))
    : [];

  products = [...perfumeList, ...vapeList];
  renderProductsTable();
  populateProductOptions();
  renderPromotionsTable();
  refreshFeaturedSelectOptions();
}

async function loadFeaturedProducts() {
  if (!dom.featuredTableBody) return;

  try {
    const client = await ensureApiClient();
    if (!client || typeof client.fetchFeaturedAdmin !== 'function') {
      throw new Error('Cliente de API no disponible.');
    }

    const response = await client.fetchFeaturedAdmin();
    featuredProducts = Array.isArray(response) ? response : [];
    renderFeaturedProducts();
  } catch (error) {
    console.error('Error al cargar los productos destacados:', error);
    featuredProducts = [];
    renderFeaturedProducts('No se pudieron cargar los productos destacados.');
  }
}

function renderFeaturedProducts(errorMessage) {
  if (!dom.featuredTableBody) return;

  dom.featuredTableBody.innerHTML = '';
  const total = featuredProducts.length;
  if (dom.featuredCounter) {
    dom.featuredCounter.textContent = `${total}/8 destacados`;
  }

  if (errorMessage) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = errorMessage;
    row.appendChild(cell);
    dom.featuredTableBody.appendChild(row);
    refreshFeaturedSelectOptions();
    return;
  }

  if (total === 0) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 5;
    cell.textContent = 'Aún no hay productos destacados.';
    row.appendChild(cell);
    dom.featuredTableBody.appendChild(row);
    refreshFeaturedSelectOptions();
    return;
  }

  featuredProducts.forEach((item) => {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = item?.nombre ?? '';
    row.appendChild(nameCell);

    const brandCell = document.createElement('td');
    brandCell.textContent = item?.marca ?? '';
    row.appendChild(brandCell);

    const priceCell = document.createElement('td');
    priceCell.textContent = currencyFormatter.format(item?.precio ?? 0);
    row.appendChild(priceCell);

    const typeCell = document.createElement('td');
    typeCell.textContent = formatProductType(String(item?.tipo ?? '').toLowerCase());
    row.appendChild(typeCell);

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('column-actions');
    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn-remove';
    deleteButton.dataset.featuredId = String(item?.id ?? '');
    deleteButton.textContent = 'Eliminar';
    actionsCell.appendChild(deleteButton);
    row.appendChild(actionsCell);

    dom.featuredTableBody.appendChild(row);
  });

  refreshFeaturedSelectOptions();
}

function refreshFeaturedSelectOptions() {
  if (!dom.featuredSelect) return;

  const currentValue = dom.featuredSelect.value;
  dom.featuredSelect.innerHTML = '';

  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = 'Seleccioná un producto disponible';
  dom.featuredSelect.appendChild(placeholder);

  const destacadosIds = new Set(
    featuredProducts.map((item) => String(item?.productoId ?? item?.id ?? ''))
  );

  const available = products
    .filter((product) => !destacadosIds.has(String(product.id)))
    .sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));

  available.forEach((product) => {
    const option = document.createElement('option');
    option.value = String(product.id);
    const typeLabel = formatProductType(product.type);
    let detail = '';
    if (product.type === 'vape' && Number.isFinite(product.puffs)) {
      detail = `${product.puffs} puffs`;
    } else if (Number.isFinite(product.volume)) {
      detail = `${product.volume} ml`;
    }
    const detailText = detail ? ` • ${detail}` : '';
    option.textContent = `${product.brand} – ${product.name}${detailText} (${typeLabel})`;
    dom.featuredSelect.appendChild(option);
  });

  if (available.some((product) => String(product.id) === currentValue)) {
    dom.featuredSelect.value = currentValue;
  }
}

async function handleAddFeaturedProduct() {
  if (!dom.featuredSelect || !dom.addFeaturedButton) return;

  const selectedValue = dom.featuredSelect.value;
  const productoId = Number.parseInt(selectedValue, 10);
  if (!Number.isFinite(productoId)) {
    dom.featuredSelect.focus();
    return;
  }

  dom.addFeaturedButton.disabled = true;

  try {
    const client = await ensureApiClient();
    if (!client || typeof client.addFeaturedProduct !== 'function') {
      throw new Error('Cliente de API no disponible.');
    }

    await client.addFeaturedProduct(productoId);
    showToast('Producto agregado a destacados.');
    await loadFeaturedProducts();
  } catch (error) {
    console.error('Error al agregar producto destacado:', error);
    const message = error?.message || 'No se pudo agregar el producto a destacados.';
    showToast(message);
  } finally {
    dom.addFeaturedButton.disabled = false;
    dom.featuredSelect.value = '';
  }
}

async function removeFeaturedProduct(destacadoId) {
  try {
    const client = await ensureApiClient();
    if (!client || typeof client.removeFeaturedProduct !== 'function') {
      throw new Error('Cliente de API no disponible.');
    }

    await client.removeFeaturedProduct(destacadoId);
    showToast('Producto destacado eliminado.');
    await loadFeaturedProducts();
  } catch (error) {
    console.error('Error al eliminar producto destacado:', error);
    const message = error?.message || 'No se pudo eliminar el producto destacado.';
    showToast(message);
  }
}

function mapPerfumeResponse(perfume, fallback = {}) {
  const mlValue = parseNumberValue(perfume?.ml) ?? parseNumberValue(perfume?.volumen) ?? parseNumberValue(fallback.volume);
  return {
    id: perfume?.id ?? fallback.id ?? String(Date.now()),
    type: fallback.type ?? (perfume?.decant ? 'decant' : 'perfume'),
    name: perfume?.nombre ?? fallback.name ?? '',
    brand: perfume?.marca ?? fallback.brand ?? '',
    description: perfume?.descripcion ?? fallback.description ?? '',
    volume: mlValue ?? fallback.volume ?? '',
    gender: perfume?.genero ?? fallback.gender ?? '',
    stock: parseNumberValue(perfume?.stock) ?? fallback.stock ?? 0,
    notes: perfume?.notasPrincipales ?? fallback.notes ?? '',
    family: perfume?.fragancia ?? fallback.family ?? '',
    piramide: {
      salida: perfume?.salida ?? fallback.piramide?.salida ?? '',
      corazon: perfume?.corazon ?? fallback.piramide?.corazon ?? '',
      fondo: perfume?.fondo ?? fallback.piramide?.fondo ?? ''
    },
    inspired: perfume?.inspiracion ?? fallback.inspired ?? '',
    price: parseNumberValue(perfume?.precio) ?? fallback.price ?? 0,
    imagesCount: fallback.imagesCount ?? 0
  };
}

function mapVapeResponse(vape, fallback = {}) {
  const rawFlavors = Array.isArray(vape?.sabores)
    ? vape.sabores
    : (vape?.sabores ? Array.from(vape.sabores) : []);

  const formattedFlavors = rawFlavors.length
    ? rawFlavors.map((flavor) => ({
        name: flavor?.nombre ?? flavor?.name ?? '',
        stock: parseNumberValue(flavor?.stock)
      }))
    : (fallback.flavors || []);

  const computedStock = formattedFlavors.reduce((acc, flavor) => {
    const stockValue = parseNumberValue(flavor?.stock);
    return acc + (Number.isFinite(stockValue) ? stockValue : 0);
  }, 0);

  return {
    id: vape?.id ?? fallback.id ?? String(Date.now()),
    type: 'vape',
    name: vape?.nombre ?? fallback.name ?? '',
    brand: vape?.marca ?? fallback.brand ?? '',
    description: vape?.descripcion ?? fallback.description ?? '',
    puffs: parseNumberValue(vape?.pitadas) ?? fallback.puffs ?? 0,
    modes: vape?.modos ?? fallback.modes ?? '',
    flavors: formattedFlavors,
    price: parseNumberValue(vape?.precio) ?? fallback.price ?? 0,
    stock: parseNumberValue(vape?.stock) ?? computedStock ?? fallback.stock ?? 0
  };
}

function upsertProduct(product) {
  if (!product || product.id == null) return;
  const index = products.findIndex(
    (item) => String(item.id) === String(product.id) && item.type === product.type
  );
  if (index !== -1) {
    products[index] = { ...products[index], ...product };
  } else {
    products.push(product);
  }
}

function removeProductFromState(productId, type) {
  const index = products.findIndex(
    (item) => String(item.id) === String(productId) && (!type || item.type === type)
  );
  if (index !== -1) {
    products.splice(index, 1);
  }
}

function toPerfumeRequest(product) {
  const volumeNumber = parseNumberValue(product.volume);
  return {
    nombre: product.name,
    precio: product.price,
    descripcion: product.description,
    marca: product.brand,
    stock: product.stock,
    volumen: volumeNumber != null ? String(volumeNumber) : (product.volume ?? null),
    genero: product.gender,
    notasPrincipales: product.notes,
    salida: product.piramide?.salida,
    corazon: product.piramide?.corazon,
    fondo: product.piramide?.fondo,
    inspiracion: product.inspired,
    decant: product.type === 'decant',
    fragancia: product.family,
    ml: volumeNumber
  };
}

function toVapeRequest(product) {
  const sabores = Array.isArray(product.flavors)
    ? product.flavors
        .filter((flavor) => typeof flavor.name === 'string' && flavor.name.trim().length > 0)
        .map((flavor) => ({
          nombre: flavor.name.trim(),
          stock: Number.isFinite(flavor.stock) ? flavor.stock : 0
        }))
    : [];

  return {
    nombre: product.name,
    precio: product.price,
    descripcion: product.description,
    marca: product.brand,
    stock: product.stock,
    pitadas: product.puffs,
    modos: product.modes,
    sabores
  };
}

function renderProductsTable() {
  if (!dom.productsTableBody) return;
  dom.productsTableBody.innerHTML = '';

  if (!products.length) {
    const emptyRow = document.createElement('tr');
    const emptyCell = document.createElement('td');
    emptyCell.colSpan = 6;
    emptyCell.textContent = 'No hay productos cargados aún.';
    emptyRow.appendChild(emptyCell);
    dom.productsTableBody.appendChild(emptyRow);
    return;
  }

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
    priceCell.textContent = currencyFormatter.format(parseNumberValue(product.price) ?? 0);
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
    editButton.dataset.productType = product.type; 
    editButton.textContent = 'Modificar';


    const deleteButton = document.createElement('button');
    deleteButton.type = 'button';
    deleteButton.className = 'btn btn--danger js-delete-product';
    deleteButton.dataset.productId = String(product.id);
    deleteButton.dataset.productType = product.type;
    deleteButton.textContent = 'Eliminar';

    actionsWrapper.append(editButton, deleteButton);
    actionsCell.appendChild(actionsWrapper);
    row.appendChild(actionsCell);

    dom.productsTableBody.appendChild(row);
  });

  dom.productsTableBody.querySelectorAll('.js-edit-product').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = button.dataset.productId;
      const productType = button.dataset.productType;
      openProductModal(productId, productType);
    });
  });

  dom.productsTableBody.querySelectorAll('.js-delete-product').forEach((button) => {
    button.addEventListener('click', async () => {
      const productId = button.dataset.productId;
      const productType = button.dataset.productType;
      const product = products.find((item) => String(item.id) === String(productId) && item.type === productType);
      if (!product) return;

      const shouldDelete = window.confirm(`¿Eliminar "${product.name}" de forma permanente?`);
      if (!shouldDelete) return;

      try {
        const client = await ensureApiClient();
        if (!client) throw new Error('Cliente de API no disponible.');

        if (product.type === 'vape') {
          await client.deleteVape(product.id);
        } else {
          await client.deletePerfume(product.id);
        }

        removeProductFromState(product.id, product.type);
        renderProductsTable();
        populateProductOptions();
        renderPromotionsTable();
        showToast('Producto eliminado correctamente.');
      } catch (error) {
        console.error('Error al eliminar el producto:', error);
        showToast('No se pudo eliminar el producto.');
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
    editButton.className = 'btn btn--ghost js-edit-product';
    editButton.dataset.productId = String(product.id);
    editButton.dataset.productType = product.type; 
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
  refreshFeaturedSelectOptions();
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

function openProductModal(productId, productType) {
  const product = products.find(
    (item) => String(item.id) === String(productId) && item.type === productType
  ); // 🔹 ahora busca por id + tipo

  if (!product) return;
  if (!editProductHelpers) {
    editProductHelpers = setupProductForm(dom.editProductForm);
  }
  editProductHelpers?.fill(product);
  dom.editProductForm.dataset.productId = product.id;
  dom.editProductForm.dataset.productType = product.type;

  const typeSelect = dom.editProductForm?.querySelector('select[name="productType"]');
  if (typeSelect) {
    typeSelect.value = product.type;
    typeSelect.disabled = true;
  }
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
