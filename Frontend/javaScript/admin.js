const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

const products = [
  {
    id: 1,
    type: 'perfume',
    name: 'Aventus',
    brand: 'Creed',
    description: 'Fragancia icónica con notas frescas y amaderadas pensada para destacar en cada ocasión.',
    volume: 100,
    gender: 'Masculino',
    notes: 'Piña, grosella negra, bergamota',
    family: 'Chipre Frutal',
    piramide: {
      salida: 'Piña, grosella negra, bergamota',
      corazon: 'Jazmín, rosa, abedul',
      fondo: 'Musgo de roble, vainilla, ámbar gris'
    },
    inspired: 'Éxito y liderazgo',
    imagesCount: 3,
    stock: 8,
    price: 320000
  },
  {
    id: 2,
    type: 'decant',
    name: 'Good Girl Decant',
    brand: 'Carolina Herrera',
    description: 'Decant 10 ml de uno de los perfumes más vendidos: dulce, floral y sofisticado.',
    volume: 10,
    gender: 'Femenino',
    notes: 'Café, almendra, jazmín',
    family: 'Oriental Floral',
    piramide: {
      salida: 'Café, almendra, limón',
      corazon: 'Jazmín sambac, nardos',
      fondo: 'Cacao, vainilla, tonka'
    },
    inspired: 'Good Girl',
    imagesCount: 2,
    stock: 22,
    price: 14500
  },
  {
    id: 3,
    type: 'vape',
    name: 'Nebula 5K',
    brand: 'Nebula Labs',
    description: 'Vape recargable con modos inteligentes y batería de larga duración.',
    puffs: 5000,
    modes: 'Smart, Boost, Eco',
    flavors: [
      { name: 'Frutilla Ice', stock: 12 },
      { name: 'Menta Polar', stock: 18 },
      { name: 'Mango Tropical', stock: 15 }
    ],
    price: 58000,
    stock: 45
  }
];

const promotions = [
  {
    id: 1,
    productId: 1,
    description: '10% off en Aventus hasta agotar stock.',
    discount: 10,
    startDate: '2024-04-01',
    endDate: '2024-04-30',
    active: true
  },
  {
    id: 2,
    productId: 3,
    description: 'Bundle de lanzamiento Nebula 5K con envío gratis.',
    discount: 15,
    startDate: '2024-05-15',
    endDate: '2024-06-30',
    active: false
  }
];

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

  dom.addProductForm?.addEventListener('submit', (event) => {
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
    newProduct.id = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now();
    products.push(newProduct);

    renderProductsTable();
    populateProductOptions();
    dom.addProductForm.reset();
    addProductHelpers?.reset?.();
    showToast('Producto agregado correctamente (simulación).');
  });

  dom.editProductForm?.addEventListener('submit', (event) => {
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
    if (index !== -1) {
      editedProduct.id = products[index].id;
      products[index] = editedProduct;
      renderProductsTable();
      populateProductOptions();
      closeModal(dom.productModal);
      showToast('Producto actualizado (simulación).');
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

function renderProductsTable() {
  if (!dom.productsTableBody) return;
  dom.productsTableBody.innerHTML = '';
  products.forEach((product) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${product.name}</td>
      <td>${product.brand}</td>
      <td>${formatProductType(product.type)}</td>
      <td>${currencyFormatter.format(product.price || 0)}</td>
      <td>${product.stock ?? 0}</td>
      <td class="column-actions">
        <div class="table-actions">
          <button type="button" class="btn btn--ghost js-edit-product" data-product-id="${product.id}">Modificar</button>
          <button type="button" class="btn btn--danger js-delete-product" data-product-id="${product.id}">Eliminar</button>
        </div>
      </td>
    `;
    dom.productsTableBody.appendChild(row);
  });

  dom.productsTableBody.querySelectorAll('.js-edit-product').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = button.dataset.productId;
      openProductModal(productId);
    });
  });

  dom.productsTableBody.querySelectorAll('.js-delete-product').forEach((button) => {
    button.addEventListener('click', () => {
      const productId = button.dataset.productId;
      const product = products.find((item) => String(item.id) === String(productId));
      if (!product) return;
      const shouldDelete = window.confirm(`¿Eliminar "${product.name}" de forma permanente?`);
      if (shouldDelete) {
        const index = products.findIndex((item) => String(item.id) === String(productId));
        if (index !== -1) {
          products.splice(index, 1);
          renderProductsTable();
          populateProductOptions();
          showToast('Producto eliminado (simulación).');
        }
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
    row.innerHTML = `
      <td>${product?.name || 'Producto eliminado'}</td>
      <td>${promotion.description}</td>
      <td>${promotion.discount}%</td>
      <td>${promotion.startDate}</td>
      <td>${promotion.endDate}</td>
      <td><span class="${statusClass}">${statusLabel}</span></td>
      <td class="column-actions">
        <div class="table-actions">
          <button type="button" class="btn btn--ghost js-edit-promotion" data-promotion-id="${promotion.id}">Modificar</button>
          <button type="button" class="btn btn--warning js-toggle-promotion" data-promotion-id="${promotion.id}">${promotion.active ? 'Desactivar' : 'Activar'}</button>
          <button type="button" class="btn btn--danger js-delete-promotion" data-promotion-id="${promotion.id}">Eliminar</button>
        </div>
      </td>
    `;
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
