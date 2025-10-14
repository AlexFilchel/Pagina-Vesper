const currencyFormatter = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 0
});

const dom = {
  grid: document.getElementById('productos-lista'),
  sortDropdown: document.querySelector('.sort-dropdown'),
  sortButton: document.querySelector('.sort-button'),
  sortLabel: document.querySelector('.sort-button__label'),
  sortOptions: document.querySelectorAll('.sort-options [data-sort]'),
  filtersToggle: document.querySelector('.filters-toggle'),
  filtersClose: document.querySelector('.filters-close'),
  filtersPanel: document.getElementById('filters-panel'),
  filtersOverlay: document.getElementById('filters-overlay'),
  clearFiltersButton: document.querySelector('.filtros-limpiar'),
  brandFilterList: document.getElementById('filtro-marcas'),
  filtersContainer: document.querySelector('.filtros')
};

let products = [];
let filteredProducts = [];
let activeSort = null;

const filters = {
  type: new Set(),
  gender: new Set(),
  brand: new Set()
};

document.addEventListener('DOMContentLoaded', () => {
  setupSortDropdown();
  setupFiltersPanel();
  loadProducts();
});

async function loadProducts() {
  if (!dom.grid) return;
  renderLoadingState();

  try {
    const response = await fetch('/api/public/perfumes', {
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const data = await response.json();
    products = Array.isArray(data) ? data.map(mapProduct) : [];
    filteredProducts = [...products];
    populateBrandFilter(products);
    applyFilters();
  } catch (error) {
    console.error('Error cargando el catálogo:', error);
    renderErrorState('No pudimos cargar los productos. Intentá nuevamente en unos minutos.');
  }
}

function mapProduct(perfume) {
  return {
    id: perfume.id,
    name: perfume.nombre || perfume.name || 'Producto sin nombre',
    brand: perfume.marca || 'Vesper',
    description: perfume.descripcion || '',
    gender: perfume.genero || '',
    notes: perfume.notasPrincipales || '',
    family: perfume.fragancia || '',
    volume: perfume.volumen || (perfume.ml ? `${perfume.ml} ml` : ''),
    price: Number(perfume.precio ?? 0),
    type: perfume.decant ? 'decant' : 'perfume',
    decant: Boolean(perfume.decant),
    image: perfume.imagen || perfume.imagenUrl || null
  };
}

function renderLoadingState() {
  if (!dom.grid) return;
  dom.grid.innerHTML = '';
  for (let i = 0; i < 6; i += 1) {
    const skeleton = document.createElement('article');
    skeleton.className = 'product-card product-card--skeleton';
    skeleton.innerHTML = `
      <div class="product-card__image"></div>
      <div class="product-card__info">
        <span class="product-card__skeleton-line"></span>
        <span class="product-card__skeleton-line"></span>
        <span class="product-card__skeleton-line"></span>
      </div>
    `;
    dom.grid.appendChild(skeleton);
  }
}

function renderErrorState(message) {
  if (!dom.grid) return;
  dom.grid.innerHTML = '';
  const error = document.createElement('div');
  error.className = 'productos-grid__message productos-grid__message--error';
  error.innerHTML = `
    <p>${message}</p>
    <button type="button" class="btn btn--primary productos-grid__retry">Reintentar</button>
  `;
  dom.grid.appendChild(error);
  const retry = error.querySelector('.productos-grid__retry');
  retry?.addEventListener('click', loadProducts);
}

function renderEmptyState(message) {
  if (!dom.grid) return;
  dom.grid.innerHTML = '';
  const empty = document.createElement('div');
  empty.className = 'productos-grid__message';
  empty.innerHTML = `<p>${message}</p>`;
  dom.grid.appendChild(empty);
}

function renderProducts() {
  if (!dom.grid) return;
  dom.grid.innerHTML = '';

  if (!filteredProducts.length) {
    renderEmptyState('No encontramos productos con los filtros seleccionados.');
    return;
  }

  filteredProducts.forEach((product) => {
    const card = document.createElement('article');
    card.className = 'product-card';
    const imageUrl = product.image || 'img/categoria_perfumes_1.avif';
    const typeLabel = product.decant ? 'Decant' : 'Perfume';

    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'product-card__image';

    const img = document.createElement('img');
    img.src = imageUrl;
    img.alt = `Imagen ilustrativa de ${product.name}`;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      img.classList.add('is-placeholder');
    });

    const tag = document.createElement('span');
    tag.className = 'product-card__tag';
    tag.textContent = typeLabel;

    imageWrapper.appendChild(img);
    imageWrapper.appendChild(tag);

    const info = document.createElement('div');
    info.className = 'product-card__info';

    const title = document.createElement('h3');
    title.textContent = product.name;
    info.appendChild(title);

    const brand = document.createElement('p');
    brand.className = 'product-card__brand';
    brand.textContent = product.brand;
    info.appendChild(brand);

    const price = document.createElement('p');
    price.className = 'product-card__price';
    price.textContent = currencyFormatter.format(product.price);
    info.appendChild(price);

    if (product.volume) {
      const volume = document.createElement('p');
      volume.className = 'product-card__meta';
      volume.textContent = product.volume;
      info.appendChild(volume);
    }

    if (product.notes) {
      const notes = document.createElement('p');
      notes.className = 'product-card__notes';
      notes.textContent = `Notas: ${product.notes}`;
      info.appendChild(notes);
    }

    const cta = document.createElement('button');
    cta.type = 'button';
    cta.className = 'btn btn--ghost product-card__cta';
    cta.textContent = 'Ver detalles';
    info.appendChild(cta);

    card.appendChild(imageWrapper);
    card.appendChild(info);
    dom.grid.appendChild(card);
  });
}

function setupSortDropdown() {
  if (!dom.sortDropdown || !dom.sortButton) return;

  dom.sortButton.addEventListener('click', () => {
    const willOpen = !dom.sortDropdown.classList.contains('is-open');
    dom.sortDropdown.classList.toggle('is-open', willOpen);
    dom.sortButton.setAttribute('aria-expanded', String(willOpen));
  });

  dom.sortOptions.forEach((option) => {
    option.addEventListener('click', () => {
      activeSort = option.dataset.sort || null;
      dom.sortOptions.forEach((btn) => btn.classList.toggle('is-active', btn === option));
      if (dom.sortLabel) {
        dom.sortLabel.textContent = option.textContent.trim();
      }
      dom.sortDropdown.classList.remove('is-open');
      dom.sortButton.setAttribute('aria-expanded', 'false');
      applyFilters();
    });
  });

  document.addEventListener('click', (event) => {
    if (!dom.sortDropdown.contains(event.target) && dom.sortDropdown.classList.contains('is-open')) {
      dom.sortDropdown.classList.remove('is-open');
      dom.sortButton.setAttribute('aria-expanded', 'false');
    }
  });
}

function setupFiltersPanel() {
  if (!dom.filtersPanel) return;

  dom.filtersToggle?.addEventListener('click', () => openFilters());
  dom.filtersClose?.addEventListener('click', () => closeFilters());
  dom.filtersOverlay?.addEventListener('click', () => closeFilters());
  dom.clearFiltersButton?.addEventListener('click', resetFilters);

  dom.filtersPanel.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement) || target.type !== 'checkbox') return;
    updateFiltersFromCheckbox(target);
    applyFilters();
  });
}

function openFilters() {
  if (!dom.filtersPanel || !dom.filtersOverlay) return;
  dom.filtersPanel.classList.add('is-open');
  dom.filtersOverlay.classList.add('is-visible');
  document.body.classList.add('filters-open');
}

function closeFilters() {
  if (!dom.filtersPanel || !dom.filtersOverlay) return;
  dom.filtersPanel.classList.remove('is-open');
  dom.filtersOverlay.classList.remove('is-visible');
  document.body.classList.remove('filters-open');
}

function resetFilters() {
  Object.values(filters).forEach((set) => set.clear());
  dom.filtersPanel?.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = false;
  });
  applyFilters();
}

function updateFiltersFromCheckbox(checkbox) {
  const value = checkbox.value;
  const checked = checkbox.checked;
  const filterGroup = checkbox.closest('.filtro');
  if (!filterGroup) return;

  const title = filterGroup.querySelector('h4')?.textContent || '';
  if (title.includes('Tipo')) {
    const typeValue = normalizeTypeFilter(value);
    if (!typeValue) return;
    toggleFilterValue(filters.type, typeValue, checked);
  } else if (title.includes('Género')) {
    toggleFilterValue(filters.gender, value, checked);
  } else if (title.includes('Marca')) {
    toggleFilterValue(filters.brand, value, checked);
  }
}

function toggleFilterValue(set, value, shouldAdd) {
  if (shouldAdd) {
    set.add(value);
  } else {
    set.delete(value);
  }
}

function normalizeTypeFilter(value) {
  const normalized = value.toLowerCase();
  if (normalized.includes('vape')) return 'vape';
  if (normalized.includes('decant') || normalized.includes('toilette')) return 'decant';
  if (normalized.includes('perfume')) return 'perfume';
  return null;
}

function applyFilters() {
  filteredProducts = products.filter((product) => {
    const matchType = !filters.type.size || filters.type.has(product.type);
    const matchGender = !filters.gender.size || filters.gender.has(product.gender);
    const matchBrand = !filters.brand.size || filters.brand.has(product.brand);
    return matchType && matchGender && matchBrand;
  });

  applySort();
  renderProducts();
}

function applySort() {
  if (!activeSort) return;
  const [field, direction] = activeSort.split('-');

  filteredProducts.sort((a, b) => {
    if (field === 'price') {
      return direction === 'asc' ? a.price - b.price : b.price - a.price;
    }
    if (field === 'name') {
      return direction === 'asc'
        ? a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
        : b.name.localeCompare(a.name, 'es', { sensitivity: 'base' });
    }
    return 0;
  });
}

function populateBrandFilter(items) {
  if (!dom.brandFilterList) return;
  const brands = Array.from(new Set(items.map((item) => item.brand).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  dom.brandFilterList.innerHTML = '';
  brands.forEach((brand) => {
    const id = `brand-${brand.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`;
    const li = document.createElement('li');
    li.innerHTML = `
      <label for="${id}">
        <input type="checkbox" id="${id}" value="${brand}"> ${brand}
      </label>
    `;
    dom.brandFilterList.appendChild(li);
  });
}

// Exponer método para refrescar catálogo desde otras vistas si fuera necesario
window.refreshCatalog = loadProducts;
