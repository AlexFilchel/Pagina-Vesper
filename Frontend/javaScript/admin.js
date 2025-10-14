const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

const API_BASE_URL = '/api';
const ADMIN_API = `${API_BASE_URL}/admin`;
const PUBLIC_API = `${API_BASE_URL}/public`;
const nameCollator = new Intl.Collator('es', { sensitivity: 'base' });
const catalogueChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('vesper-catalogue') : null;
const flavorCatalog = new Map();

let products = [];

let promotions = [];

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
  initializeAdminPanel();

  dom.addProductForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!dom.addProductForm.checkValidity()) {
      dom.addProductForm.reportValidity();
      return;
    }
    if (!validateProductForm(dom.addProductForm)) {
      return;
    }

    const productData = collectProductData(dom.addProductForm);
    if (!productData) {
      return;
    }

    try {
      const createdProduct = await createProduct(productData);
      upsertProduct(createdProduct);
      populateProductOptions();
      dom.addProductForm.reset();
      addProductHelpers?.reset?.();
      showToast('Producto agregado correctamente.');
      broadcastCatalogueUpdate();
    } catch (error) {
      handleActionError(error, 'No pudimos agregar el producto.');
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

    const productId = dom.editProductForm.dataset.productId;
    const originalType = dom.editProductForm.dataset.originalType;
    const productData = collectProductData(dom.editProductForm);
    if (!productData) {
      return;
    }

    if (originalType && productData.type !== originalType) {
      showToast('No es posible cambiar el tipo del producto desde esta pantalla.', { variant: 'error' });
      dom.editProductForm.productType.value = originalType;
      dom.editProductForm.productType.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    try {
      const updatedProduct = await updateProduct(productId, productData);
      upsertProduct(updatedProduct);
      populateProductOptions();
      closeModal(dom.productModal);
      showToast('Producto actualizado correctamente.');
      broadcastCatalogueUpdate();
    } catch (error) {
      handleActionError(error, 'No pudimos actualizar el producto.');
    }
  });

  dom.addPromotionForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!dom.addPromotionForm.checkValidity()) {
      dom.addPromotionForm.reportValidity();
      return;
    }
    if (!validatePromotionDates(dom.addPromotionForm)) {
      return;
    }

    const promotionPayload = collectPromotionData(dom.addPromotionForm);

    try {
      const createdPromotion = await createPromotion(promotionPayload);
      upsertPromotion(createdPromotion);
      dom.addPromotionForm.reset();
      setTodayAsDefault(dom.addPromotionForm.querySelector('#promotionStart'));
      showToast('Promoción agregada correctamente.');
    } catch (error) {
      handleActionError(error, 'No pudimos agregar la promoción.');
    }
  });

  dom.editPromotionForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!dom.editPromotionForm.checkValidity()) {
      dom.editPromotionForm.reportValidity();
      return;
    }
    if (!validatePromotionDates(dom.editPromotionForm)) {
      return;
    }

    const promotionPayload = collectPromotionData(dom.editPromotionForm);
    const promotionId = dom.editPromotionForm.dataset.promotionId;

    try {
      const updatedPromotion = await updatePromotion(promotionId, promotionPayload);
      upsertPromotion(updatedPromotion);
      closeModal(dom.promotionModal);
      showToast('Promoción actualizada correctamente.');
    } catch (error) {
      handleActionError(error, 'No pudimos actualizar la promoción.');
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
        const vapeStock = form.querySelector('input[name="vapeStock"]');
        if (vapeName) vapeName.value = product.name || '';
        if (vapeBrand) vapeBrand.value = product.brand || '';
        if (vapeDescription) vapeDescription.value = product.description || '';
        if (vapePuffs) vapePuffs.value = product.puffs ?? '';
        if (vapeModes) vapeModes.value = product.modes || '';
        if (vapePrice) vapePrice.value = product.price ?? '';
        if (vapeStock) vapeStock.value = product.stock ?? '';
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
  if (!form) return null;
  const type = form.productType?.value;
  if (!type) {
    showToast('Seleccioná un tipo de producto.', { variant: 'error' });
    return null;
  }

  if (type === 'vape') {
    const flavorSelect = form.querySelector('select[name="vapeFlavorCount"]');
    const flavorCount = Number.parseInt(flavorSelect?.value ?? '0', 10) || 0;
    const flavors = [];
    for (let i = 1; i <= flavorCount; i += 1) {
      const nameField = form.querySelector(`[name="flavorName${i}"]`);
      const stockField = form.querySelector(`[name="flavorStock${i}"]`);
      const flavorName = cleanText(nameField?.value);
      const flavorStock = toInteger(stockField?.value) ?? 0;
      flavors.push({ name: flavorName, stock: flavorStock });
    }

    const totalStock = toInteger(form.vapeStock?.value) ?? 0;

    return {
      type: 'vape',
      request: {
        nombre: cleanText(form.vapeName?.value),
        marca: cleanText(form.vapeBrand?.value),
        descripcion: cleanText(form.vapeDescription?.value),
        precio: toNumber(form.vapePrice?.value) ?? 0,
        stock: totalStock,
        pitadas: toInteger(form.vapePuffs?.value),
        modos: cleanText(form.vapeModes?.value)
      },
      flavors,
      stock: totalStock
    };
  }

  const volumeValue = toNumber(form.volume?.value);

  return {
    type,
    request: {
      nombre: cleanText(form.name?.value),
      marca: cleanText(form.brand?.value),
      descripcion: cleanText(form.description?.value),
      precio: toNumber(form.price?.value) ?? 0,
      stock: toInteger(form.stock?.value) ?? 0,
      volumen: volumeValue != null ? `${volumeValue} ml` : cleanText(form.volume?.value),
      ml: volumeValue,
      genero: cleanText(form.gender?.value),
      notasPrincipales: cleanText(form.notes?.value),
      salida: cleanText(form.piramideSalida?.value),
      corazon: cleanText(form.piramideCorazon?.value),
      fondo: cleanText(form.piramideFondo?.value),
      inspiracion: cleanText(form.inspired?.value),
      fragancia: cleanText(form.family?.value),
      decant: type === 'decant'
    }
  };
}

function renderProductsTable() {
  if (!dom.productsTableBody) return;
  dom.productsTableBody.innerHTML = '';
  if (!products.length) {
    renderEmptyStateRow(dom.productsTableBody, 'Todavía no cargaste productos.', 6);
    return;
  }

  products.forEach((product) => {
    const row = document.createElement('tr');
    row.dataset.productId = String(product.id);
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
    const priceValue = Number.isFinite(product.price) ? product.price : 0;
    priceCell.textContent = currencyFormatter.format(priceValue);
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
        products = products.filter((item) => String(item.id) !== String(productId));
        renderProductsTable();
        populateProductOptions();
        showToast('Producto eliminado correctamente.');
        broadcastCatalogueUpdate();
      } catch (error) {
        handleActionError(error, 'No pudimos eliminar el producto.');
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
  if (!promotions.length) {
    renderEmptyStateRow(dom.promotionsTableBody, 'Aún no creaste promociones.', 7);
    return;
  }

  promotions.forEach((promotion) => {
    const statusClass = promotion.active ? 'status-badge is-active' : 'status-badge is-inactive';
    const statusLabel = promotion.active ? 'ACTIVA' : 'INACTIVA';
    const row = document.createElement('tr');
    row.dataset.promotionId = String(promotion.id);

    const productCell = document.createElement('td');
    productCell.textContent = promotion.productName || 'Producto eliminado';
    row.appendChild(productCell);

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = promotion.description ?? '';
    row.appendChild(descriptionCell);

    const discountCell = document.createElement('td');
    const discountValue = Number.isFinite(promotion.discount) ? promotion.discount : 0;
    discountCell.textContent = `${discountValue}%`;
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
    button.addEventListener('click', async () => {
      const promotionId = button.dataset.promotionId;
      const promotion = promotions.find((item) => String(item.id) === String(promotionId));
      if (!promotion) return;

      try {
        const updatedPromotion = await togglePromotion(promotion);
        upsertPromotion(updatedPromotion);
        showToast(`Promoción ${updatedPromotion.active ? 'activada' : 'desactivada'} correctamente.`);
      } catch (error) {
        handleActionError(error, 'No pudimos actualizar el estado de la promoción.');
      }
    });
  });

  dom.promotionsTableBody.querySelectorAll('.js-delete-promotion').forEach((button) => {
    button.addEventListener('click', async () => {
      const promotionId = button.dataset.promotionId;
      const promotion = promotions.find((item) => String(item.id) === String(promotionId));
      if (!promotion) return;
      const shouldDelete = window.confirm('¿Eliminar esta promoción?');
      if (!shouldDelete) {
        return;
      }

      try {
        await deletePromotion(promotion);
        promotions = promotions.filter((item) => String(item.id) !== String(promotionId));
        renderPromotionsTable();
        showToast('Promoción eliminada correctamente.');
      } catch (error) {
        handleActionError(error, 'No pudimos eliminar la promoción.');
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
  if (!form) return null;
  return {
    productoId: toInteger(form.promotionProduct?.value),
    descripcion: cleanText(form.promotionDescription?.value),
    descuento: toNumber(form.promotionDiscount?.value) ?? 0,
    fechaInicio: form.promotionStart?.value || null,
    fechaFin: form.promotionEnd?.value || null,
    activo: Boolean(form.promotionActive?.checked)
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
  dom.editProductForm.dataset.originalType = product.type;
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

async function initializeAdminPanel() {
  try {
    await waitForAuth0Ready();
    const isAuthenticated = await ensureAuthenticated();
    if (!isAuthenticated) {
      showToast('Necesitás iniciar sesión para acceder al panel administrativo.', {
        variant: 'error',
        duration: 4500
      });
      return;
    }

    await refreshFlavors();
    await refreshProducts();
    await refreshPromotions();
  } catch (error) {
    handleActionError(error, 'No pudimos cargar la información inicial.');
  }
}

async function waitForAuth0Ready() {
  if (typeof window.getAuth0Client === 'function') {
    return window.getAuth0Client();
  }

  return new Promise((resolve, reject) => {
    const onReady = (event) => {
      cleanup();
      resolve(event.detail?.client);
    };
    const onError = (event) => {
      cleanup();
      reject(event.detail?.error || new Error('No se pudo inicializar Auth0'));
    };
    const cleanup = () => {
      window.removeEventListener('auth0-ready', onReady);
      window.removeEventListener('auth0-error', onError);
    };

    window.addEventListener('auth0-ready', onReady, { once: true });
    window.addEventListener('auth0-error', onError, { once: true });
  });
}

async function ensureAuthenticated() {
  try {
    const client = await waitForAuth0Ready();
    if (!client) {
      return false;
    }
    return client.isAuthenticated();
  } catch (error) {
    console.error('No se pudo verificar la sesión de Auth0', error);
    return false;
  }
}

async function getAccessToken() {
  if (typeof window.getAuth0Token !== 'function') {
    throw new Error('Auth0 no está disponible');
  }
  return window.getAuth0Token();
}

async function refreshProducts() {
  try {
    const [perfumesResponse, vapesResponse] = await Promise.all([
      apiRequest(`${ADMIN_API}/perfumes`, { requiresAuth: true }),
      apiRequest(`${ADMIN_API}/vapes`, { requiresAuth: true })
    ]);

    const normalized = [];

    if (Array.isArray(perfumesResponse)) {
      perfumesResponse.forEach((perfume) => {
        const normalizedPerfume = normalizePerfume(perfume);
        if (normalizedPerfume) {
          normalized.push(normalizedPerfume);
        }
      });
    }

    if (Array.isArray(vapesResponse)) {
      vapesResponse.forEach((vape) => {
        const normalizedVape = normalizeVape(vape);
        if (normalizedVape) {
          normalized.push(normalizedVape);
        }
      });
    }

    products = normalized.sort((a, b) => nameCollator.compare(a.name || '', b.name || ''));
    renderProductsTable();
    populateProductOptions();
  } catch (error) {
    handleActionError(error, 'No pudimos obtener los productos.');
  }
}

async function refreshPromotions() {
  try {
    const response = await apiRequest(`${ADMIN_API}/promociones`, { requiresAuth: true });
    if (Array.isArray(response)) {
      promotions = response
        .map((promotion) => normalizePromotion(promotion))
        .filter(Boolean)
        .sort((a, b) => {
          const dateComparison = (a.startDate || '').localeCompare(b.startDate || '');
          if (dateComparison !== 0) {
            return dateComparison;
          }
          return nameCollator.compare(a.productName || '', b.productName || '');
        });
    } else {
      promotions = [];
    }
    renderPromotionsTable();
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      promotions = [];
      renderPromotionsTable();
      return;
    }
    handleActionError(error, 'No pudimos obtener las promociones.');
  }
}

async function refreshFlavors() {
  try {
    const response = await apiRequest(`${PUBLIC_API}/sabores`);
    flavorCatalog.clear();
    if (Array.isArray(response)) {
      response.forEach((flavor) => {
        if (flavor?.nombre && flavor?.id != null) {
          flavorCatalog.set(flavor.nombre.toLowerCase(), {
            id: flavor.id,
            nombre: flavor.nombre
          });
        }
      });
    }
  } catch (error) {
    console.warn('No se pudieron cargar los sabores disponibles', error);
  }
}

function upsertProduct(product) {
  if (!product) return;
  const index = products.findIndex((item) => String(item.id) === String(product.id));
  if (index !== -1) {
    products[index] = product;
  } else {
    products.push(product);
  }
  products.sort((a, b) => nameCollator.compare(a.name || '', b.name || ''));
  renderProductsTable();
}

function upsertPromotion(promotion) {
  if (!promotion) return;
  const index = promotions.findIndex((item) => String(item.id) === String(promotion.id));
  if (index !== -1) {
    promotions[index] = promotion;
  } else {
    promotions.push(promotion);
  }
  promotions.sort((a, b) => {
    const dateComparison = (a.startDate || '').localeCompare(b.startDate || '');
    if (dateComparison !== 0) {
      return dateComparison;
    }
    return nameCollator.compare(a.productName || '', b.productName || '');
  });
  renderPromotionsTable();
}

function normalizePerfume(perfume) {
  if (!perfume) return null;
  const mlValue = toNumber(perfume.ml ?? perfume.ML);
  const volumeLabel = perfume.volumen || (mlValue != null ? `${mlValue} ml` : '');

  return {
    id: perfume.id,
    type: perfume.decant ? 'decant' : 'perfume',
    name: cleanText(perfume.nombre) || 'Sin nombre',
    brand: cleanText(perfume.marca),
    description: perfume.descripcion ?? '',
    volume: mlValue,
    volumeLabel,
    gender: cleanText(perfume.genero),
    notes: cleanText(perfume.notasPrincipales),
    family: cleanText(perfume.fragancia),
    piramide: {
      salida: cleanText(perfume.salida),
      corazon: cleanText(perfume.corazon),
      fondo: cleanText(perfume.fondo)
    },
    inspired: cleanText(perfume.inspiracion),
    price: toNumber(perfume.precio) ?? 0,
    stock: toInteger(perfume.stock) ?? 0,
    apiResource: 'perfumes'
  };
}

function normalizeVape(vape) {
  if (!vape) return null;
  const flavors = [];
  if (Array.isArray(vape.sabores) || (typeof vape.sabores === 'object' && vape.sabores !== null)) {
    const flavorList = Array.isArray(vape.sabores) ? vape.sabores : Array.from(vape.sabores);
    flavorList.forEach((flavor) => {
      const flavorName = typeof flavor === 'string' ? flavor : flavor?.nombre;
      if (!flavorName) return;
      const catalogEntry = flavorCatalog.get(flavorName.toLowerCase());
      flavors.push({
        name: flavorName,
        id: catalogEntry?.id ?? null,
        stock: null
      });
    });
  }

  return {
    id: vape.id,
    type: 'vape',
    name: cleanText(vape.nombre) || 'Sin nombre',
    brand: cleanText(vape.marca),
    description: vape.descripcion ?? '',
    puffs: toInteger(vape.pitadas),
    modes: cleanText(vape.modos),
    flavors,
    price: toNumber(vape.precio) ?? 0,
    stock: toInteger(vape.stock) ?? 0,
    apiResource: 'vapes'
  };
}

function normalizePromotion(promotion) {
  if (!promotion) return null;
  const product = promotion.producto || promotion.product;
  const productId = product?.id ?? promotion.productId ?? promotion.productoId ?? null;
  const productName = product?.nombre || promotion.productName || '';

  return {
    id: promotion.id,
    productId,
    productName,
    description: promotion.descripcion ?? promotion.description ?? '',
    discount: toNumber(promotion.descuento ?? promotion.discount) ?? 0,
    startDate: promotion.fechaInicio ?? promotion.startDate ?? '',
    endDate: promotion.fechaFin ?? promotion.endDate ?? '',
    active: Boolean(promotion.activo ?? promotion.active)
  };
}

async function createProduct(productData) {
  if (!productData) return null;

  if (productData.type === 'vape') {
    const flavorIds = await ensureFlavorIds(productData.flavors);
    const payload = {
      ...productData.request,
      saboresIds: flavorIds
    };
    const response = await apiRequest(`${ADMIN_API}/vapes`, {
      method: 'POST',
      body: payload,
      requiresAuth: true
    });
    return normalizeVape(response);
  }

  const payload = {
    ...productData.request,
    decant: productData.request.decant ?? false
  };

  const response = await apiRequest(`${ADMIN_API}/perfumes`, {
    method: 'POST',
    body: payload,
    requiresAuth: true
  });
  return normalizePerfume(response);
}

async function updateProduct(productId, productData) {
  if (!productId || !productData) return null;

  if (productData.type === 'vape') {
    const flavorIds = await ensureFlavorIds(productData.flavors);
    const payload = {
      ...productData.request,
      saboresIds: flavorIds
    };
    const response = await apiRequest(`${ADMIN_API}/vapes/${productId}`, {
      method: 'PUT',
      body: payload,
      requiresAuth: true
    });
    return normalizeVape(response);
  }

  const payload = {
    ...productData.request,
    decant: productData.request.decant ?? false
  };

  const response = await apiRequest(`${ADMIN_API}/perfumes/${productId}`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true
  });
  return normalizePerfume(response);
}

async function deleteProduct(product) {
  if (!product) return;
  const resource = product.type === 'vape' ? 'vapes' : 'perfumes';
  await apiRequest(`${ADMIN_API}/${resource}/${product.id}`, {
    method: 'DELETE',
    requiresAuth: true
  });
}

async function createPromotion(payload) {
  if (!payload) return null;
  const response = await apiRequest(`${ADMIN_API}/promociones`, {
    method: 'POST',
    body: payload,
    requiresAuth: true
  });
  return normalizePromotion(response);
}

async function updatePromotion(promotionId, payload) {
  if (!promotionId || !payload) return null;
  const response = await apiRequest(`${ADMIN_API}/promociones/${promotionId}`, {
    method: 'PUT',
    body: payload,
    requiresAuth: true
  });
  return normalizePromotion(response);
}

async function togglePromotion(promotion) {
  const payload = {
    productoId: promotion.productId,
    descripcion: promotion.description,
    descuento: promotion.discount,
    fechaInicio: promotion.startDate,
    fechaFin: promotion.endDate,
    activo: !promotion.active
  };
  return updatePromotion(promotion.id, payload);
}

async function deletePromotion(promotion) {
  if (!promotion) return;
  await apiRequest(`${ADMIN_API}/promociones/${promotion.id}`, {
    method: 'DELETE',
    requiresAuth: true
  });
}

async function ensureFlavorIds(flavors = []) {
  const ids = [];
  for (const flavor of flavors) {
    const name = cleanText(flavor?.name);
    if (!name) continue;
    const key = name.toLowerCase();
    if (flavorCatalog.has(key)) {
      ids.push(flavorCatalog.get(key).id);
      continue;
    }

    try {
      const response = await apiRequest(`${ADMIN_API}/sabores`, {
        method: 'POST',
        body: { nombre: name },
        requiresAuth: true
      });
      if (response?.id != null && response?.nombre) {
        flavorCatalog.set(response.nombre.toLowerCase(), {
          id: response.id,
          nombre: response.nombre
        });
        ids.push(response.id);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error(`No se pudo crear el sabor "${name}".`);
    }
  }
  return ids;
}

function broadcastCatalogueUpdate() {
  if (!catalogueChannel) return;
  try {
    catalogueChannel.postMessage({ type: 'catalogue-updated', timestamp: Date.now() });
  } catch (error) {
    console.warn('No se pudo notificar la actualización del catálogo', error);
  }
}

function handleActionError(error, fallbackMessage) {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      showToast('No tenés permisos para realizar esta acción.', { variant: 'error', duration: 4200 });
      return;
    }
    const message = error.message || fallbackMessage;
    showToast(message, { variant: 'error' });
    return;
  }

  console.error(fallbackMessage, error);
  showToast(fallbackMessage, { variant: 'error' });
}

async function apiRequest(url, { method = 'GET', body, requiresAuth = false } = {}) {
  const headers = { Accept: 'application/json' };
  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  if (requiresAuth) {
    const token = await getAccessToken();
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(url, { method, headers, body: payload });
  const contentType = response.headers.get('content-type') || '';
  let data = null;

  if (response.status !== 204) {
    if (contentType.includes('application/json')) {
      data = await response.json().catch(() => null);
    } else {
      data = await response.text();
    }
  }

  if (!response.ok) {
    const message = typeof data === 'object' && data !== null
      ? data.message || data.error || (Array.isArray(data.errors) ? data.errors[0] : null)
      : null;
    throw new ApiError(message || `Error ${response.status}`, {
      status: response.status,
      body: data
    });
  }

  return data;
}

class ApiError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function renderEmptyStateRow(target, message, columns = 6) {
  const row = document.createElement('tr');
  row.className = 'empty-state-row';
  const cell = document.createElement('td');
  cell.colSpan = columns;
  const wrapper = document.createElement('div');
  wrapper.className = 'empty-state';
  const icon = document.createElement('span');
  icon.className = 'material-symbols-outlined';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = 'inventory_2';
  const text = document.createElement('p');
  text.textContent = message;
  wrapper.append(icon, text);
  cell.appendChild(wrapper);
  row.appendChild(cell);
  target.appendChild(row);
}

function cleanText(value) {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').replace(/\s+/g, ' ').trim();
}

function toNumber(value) {
  if (value == null || value === '') return null;
  const normalized = String(value).replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function toInteger(value) {
  if (value == null || value === '') return null;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function showToast(message, options = {}) {
  const container = document.querySelector('.cart-toast-layer');
  if (!container) return;
  const { variant = 'success', duration = 3200 } = options;
  const toast = document.createElement('div');
  toast.className = `admin-toast admin-toast--${variant}`;
  toast.textContent = message;
  container.appendChild(toast);
  requestAnimationFrame(() => {
    toast.classList.add('is-visible');
  });
  setTimeout(() => {
    toast.classList.remove('is-visible');
    setTimeout(() => toast.remove(), 250);
  }, duration);
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
      color: #fff;
      padding: 14px 22px;
      border-radius: 14px;
      box-shadow: 0 18px 40px -20px rgba(15, 23, 42, 0.45);
      opacity: 0;
      transform: translateY(12px);
      transition: opacity 0.25s ease, transform 0.25s ease;
      z-index: 5000;
      background: rgba(0, 74, 173, 0.92);
    }
    .admin-toast--success {
      background: rgba(16, 185, 129, 0.95);
    }
    .admin-toast--error {
      background: rgba(220, 53, 69, 0.95);
    }
    .admin-toast--info {
      background: rgba(59, 130, 246, 0.95);
    }
    .admin-toast.is-visible {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);
})();
