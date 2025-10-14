(() => {
  const API_PUBLIC_PERFUMES = '/api/public/perfumes';
  const currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0
  });
  const brandCollator = new Intl.Collator('es', { sensitivity: 'base' });
  const catalogueChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('vesper-catalogue') : null;

  const dom = {
    grid: document.getElementById('productos-lista'),
    brandList: document.getElementById('filtro-marcas'),
    filtersPanel: document.getElementById('filters-panel')
  };

  const state = {
    products: [],
    filtered: [],
    filters: {
      brands: new Set()
    }
  };

  let fetchController = null;
  let initialized = false;

  function init() {
    if (initialized) return;
    initialized = true;
    if (!dom.grid) return;

    setupBrandFilterListener();
    loadProducts();

    if (catalogueChannel) {
      catalogueChannel.addEventListener('message', (event) => {
        if (event?.data?.type === 'catalogue-updated') {
          loadProducts({ silent: true });
        }
      });
    }
  }

  document.addEventListener('DOMContentLoaded', init);
  if (document.readyState !== 'loading') {
    init();
  }

  async function loadProducts(options = {}) {
    const { silent = false } = options;
    if (!dom.grid) return;

    if (fetchController) {
      fetchController.abort();
    }
    fetchController = new AbortController();

    if (!silent) {
      showLoadingMessage();
    }

    try {
      const response = await fetch(API_PUBLIC_PERFUMES, {
        headers: { Accept: 'application/json' },
        signal: fetchController.signal
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}`);
      }

      const data = await response.json();
      const products = Array.isArray(data)
        ? data.map((item) => normalizeProduct(item)).filter(Boolean)
        : [];

      state.products = products;
      populateBrandFilter(products);
      applyFilters();
    } catch (error) {
      if (error.name === 'AbortError') {
        return;
      }
      console.error('No se pudieron cargar los productos', error);
      showErrorMessage('No pudimos cargar los productos. Actualizá la página o intentá más tarde.');
    }
  }

  function applyFilters() {
    let filtered = [...state.products];

    if (state.filters.brands.size) {
      filtered = filtered.filter((product) => {
        if (!product.brandKey) return false;
        return state.filters.brands.has(product.brandKey);
      });
    }

    state.filtered = filtered;
    renderProducts(filtered);
  }

  function renderProducts(products) {
    if (!dom.grid) return;
    dom.grid.innerHTML = '';

    if (!products.length) {
      showEmptyMessage(state.filters.brands.size ? 'No hay productos que coincidan con los filtros seleccionados.' : 'Todavía no hay productos disponibles.');
      return;
    }

    const fragment = document.createDocumentFragment();
    products.forEach((product) => {
      fragment.appendChild(createProductCard(product));
    });
    dom.grid.appendChild(fragment);
  }

  function createProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.productId = String(product.id);
    card.dataset.price = String(product.price ?? 0);
    card.dataset.productName = product.name || '';
    card.dataset.brand = product.brand || '';
    card.dataset.type = product.type;
    card.dataset.gender = product.gender || '';

    const figure = document.createElement('figure');
    figure.className = 'product-card__image';

    if (product.image) {
      const img = document.createElement('img');
      img.src = product.image;
      img.alt = product.brand ? `${product.name} - ${product.brand}` : product.name;
      img.loading = 'lazy';
      figure.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'product-card__placeholder';
      placeholder.textContent = product.name?.charAt(0)?.toUpperCase() || 'P';
      figure.appendChild(placeholder);
    }

    const content = document.createElement('div');
    content.className = 'product-card__content';

    const title = document.createElement('h3');
    title.className = 'product-card__title';
    title.textContent = product.name;
    content.appendChild(title);

    if (product.brand) {
      const brand = document.createElement('p');
      brand.className = 'product-card__brand';
      brand.textContent = product.brand;
      content.appendChild(brand);
    }

    const metaItems = [product.typeLabel, product.volumeLabel, product.gender].filter(Boolean);
    if (metaItems.length) {
      const meta = document.createElement('p');
      meta.className = 'product-card__meta';
      meta.textContent = metaItems.join(' • ');
      content.appendChild(meta);
    }

    const priceRow = document.createElement('div');
    priceRow.className = 'product-card__price-row';
    const price = document.createElement('span');
    price.className = 'product-card__price';
    price.textContent = currencyFormatter.format(product.price ?? 0);
    price.dataset.price = String(product.price ?? 0);
    priceRow.appendChild(price);

    if (product.stock != null) {
      const stock = document.createElement('span');
      stock.className = 'product-card__stock';
      stock.textContent = `Stock: ${product.stock}`;
      priceRow.appendChild(stock);
    }

    content.appendChild(priceRow);

    if (product.description) {
      const description = document.createElement('p');
      description.className = 'product-card__description';
      description.textContent = product.description;
      description.hidden = true;
      content.appendChild(description);

      const toggleButton = document.createElement('button');
      toggleButton.type = 'button';
      toggleButton.className = 'product-card__cta';
      toggleButton.textContent = 'Ver detalles';
      toggleButton.addEventListener('click', () => {
        const willShow = description.hidden;
        description.hidden = !willShow;
        toggleButton.textContent = willShow ? 'Ocultar detalles' : 'Ver detalles';
      });
      content.appendChild(toggleButton);
    }

    card.append(figure, content);
    return card;
  }

  function showLoadingMessage() {
    setGridMessage('Cargando productos...', 'loading');
  }

  function showEmptyMessage(message) {
    setGridMessage(message, 'empty');
  }

  function showErrorMessage(message) {
    setGridMessage(message, 'error');
  }

  function setGridMessage(message, variant) {
    if (!dom.grid) return;
    dom.grid.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.className = `productos-grid__message productos-grid__message--${variant}`;
    wrapper.setAttribute('role', variant === 'error' ? 'alert' : 'status');

    if (variant === 'loading') {
      const spinner = document.createElement('span');
      spinner.className = 'productos-grid__spinner';
      spinner.setAttribute('aria-hidden', 'true');
      wrapper.appendChild(spinner);
    }

    const text = document.createElement('p');
    text.textContent = message;
    wrapper.appendChild(text);
    dom.grid.appendChild(wrapper);
  }

  function populateBrandFilter(products) {
    if (!dom.brandList) return;
    const uniqueBrands = Array.from(
      new Set(products.map((product) => product.brand).filter(Boolean))
    );

    const availableKeys = new Set(uniqueBrands.map((brand) => brand.toLowerCase()));
    Array.from(state.filters.brands).forEach((key) => {
      if (!availableKeys.has(key)) {
        state.filters.brands.delete(key);
      }
    });

    uniqueBrands.sort((a, b) => brandCollator.compare(a, b));
    dom.brandList.innerHTML = '';

    uniqueBrands.forEach((brand) => {
      const li = document.createElement('li');
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = brand;
      input.checked = state.filters.brands.has(brand.toLowerCase());
      label.appendChild(input);
      label.append(` ${brand}`);
      li.appendChild(label);
      dom.brandList.appendChild(li);
    });
  }

  function setupBrandFilterListener() {
    if (!dom.brandList) return;
    dom.brandList.addEventListener('change', (event) => {
      const target = event.target;
      if (target instanceof HTMLInputElement && target.type === 'checkbox') {
        handleBrandFilterChange(target);
      }
    });
  }

  function handleBrandFilterChange(input) {
    const key = cleanText(input.value).toLowerCase();
    if (!key) return;
    if (input.checked) {
      state.filters.brands.add(key);
    } else {
      state.filters.brands.delete(key);
    }
    applyFilters();
  }

  function normalizeProduct(item) {
    if (!item) return null;
    const name = cleanText(item.nombre) || 'Producto sin nombre';
    const brand = cleanText(item.marca);
    const gender = cleanText(item.genero);
    const type = item.decant ? 'decant' : 'perfume';
    const volumeLabel = item.volumen || (item.ml ? `${item.ml} ml` : '');
    const price = typeof item.precio === 'number' ? item.precio : toNumber(item.precio) || 0;

    return {
      id: item.id,
      name,
      brand,
      brandKey: brand.toLowerCase(),
      gender,
      genderKey: gender.toLowerCase(),
      type,
      typeLabel: type === 'decant' ? 'Decant' : 'Perfume',
      volumeLabel,
      price,
      stock: typeof item.stock === 'number' ? item.stock : toNumber(item.stock),
      description: item.descripcion ?? '',
      image: item.imagen?.url ?? item.imagenUrl ?? null
    };
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
})();
