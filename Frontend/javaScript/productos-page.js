(function () {
  'use strict';

  const TYPE_LABELS = {
    perfume: 'Perfume',
    decant: 'Decant',
    vape: 'Vape'
  };

  const FALLBACK_IMAGE = 'img/logo_vesper.jpg';
  const TRANSFER_DISCOUNT = 0.85;
  const PRICE_STEP = 1000;

  const collator = new Intl.Collator('es', { sensitivity: 'base' });

  function onReady(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  onReady(initProductosPage);

  function initProductosPage() {
    const grid = document.getElementById('productos-lista');
    if (!grid) return;

    const elements = {
      grid,
      status: document.getElementById('productos-status'),
      filterTipo: document.getElementById('filter-tipo'),
      filterGenero: document.getElementById('filter-genero'),
      filterMarca: document.getElementById('filter-marca'),
      priceRange: document.getElementById('filter-price'),
      priceMinLabel: document.getElementById('filter-price-min'),
      priceMaxLabel: document.getElementById('filter-price-max'),
      clearButton: document.querySelector('.filtros-limpiar')
    };

    const state = {
      products: [],
      filtered: [],
      priceRange: { min: 0, max: 0 },
      searchTerm: '',
      searchNormalized: '',
      brandOptionsByType: {},
      genderOptions: []
    };

    const selected = {
      tipo: new Set(),
      genero: new Set(),
      marca: new Set(),
      maxPrice: null
    };

    const checkboxes = {
      tipo: [],
      genero: [],
      marca: []
    };

    updateStatus('Cargando productos...');
    loadCatalog()
      .then((catalog) => {
        state.products = normalizeCatalog(catalog);
        computeMetadata(state);
        applyInitialFiltersFromQuery(state, selected);
        renderTypeFilter(state, elements, selected, checkboxes);
        renderGeneroFilter(state, elements, selected, checkboxes);
        updateBrandOptions(state, selected);
        renderBrandFilter(state, elements, selected, checkboxes);
        configurePriceFilter(state, selected, elements, checkboxes);
        configureClearButton(state, selected, elements, checkboxes);
        applyFilters(state, selected, elements, checkboxes);
      })
      .catch((error) => {
        console.error('No se pudieron cargar los productos del catálogo', error);
        updateStatus('No se pudo cargar el catálogo de productos.', true);
      });
  }

  function loadCatalog() {
    const cached = window.__VESPER_CATALOG__;
    if (cached && Array.isArray(cached.perfumes) && Array.isArray(cached.vapes)) {
      return Promise.resolve({
        perfumes: cached.perfumes,
        vapes: cached.vapes
      });
    }

    if (!window.apiClient || typeof window.apiClient.fetchAllProducts !== 'function') {
      return Promise.reject(new Error('Cliente de API no disponible'));
    }

    return window.apiClient.fetchAllProducts().then((data) => {
      const normalized = {
        perfumes: Array.isArray(data?.perfumes) ? data.perfumes : [],
        vapes: Array.isArray(data?.vapes) ? data.vapes : []
      };
      window.__VESPER_CATALOG__ = normalized;
      return normalized;
    });
  }

  function normalizeCatalog(catalog) {
    const products = [];

    (Array.isArray(catalog.perfumes) ? catalog.perfumes : []).forEach((perfume) => {
      const normalized = normalizePerfume(perfume);
      if (normalized) {
        products.push(normalized);
      }
    });

    (Array.isArray(catalog.vapes) ? catalog.vapes : []).forEach((vape) => {
      const normalized = normalizeVape(vape);
      if (normalized) {
        products.push(normalized);
      }
    });

    return products;
  }

  function normalizePerfume(perfume) {
    if (!perfume) return null;

    const price = Number.parseFloat(perfume.precio) || 0;
    const tipo = perfume.decant ? 'decant' : 'perfume';
    const genero = typeof perfume.genero === 'string' ? perfume.genero.trim() : '';
    const marca = typeof perfume.marca === 'string' ? perfume.marca.trim() : '';
    const ml = perfume.ml != null ? Number(perfume.ml) : null;
    const volumen = typeof perfume.volumen === 'string' ? perfume.volumen.trim() : '';
    const imagenes = Array.isArray(perfume.imagenes) ? perfume.imagenes : [];
    const imagen = imagenes[0]?.url || FALLBACK_IMAGE;
    const subtitle = ml ? `${ml} ml` : volumen;

    return {
      uid: `${tipo}-${perfume.id}`,
      id: perfume.id,
      tipo,
      nombre: perfume.nombre || 'Producto',
      marca,
      genero,
      precio: price,
      precioTransferencia: Math.round(price * TRANSFER_DISCOUNT * 100) / 100,
      imagen,
      imagenes,
      ml,
      volumen,
      descripcion: perfume.descripcion || '',
      notas: perfume.notasPrincipales || '',
      stock: perfume.stock ?? null,
      pitadas: null,
      modos: null,
      sabores: [],
      subtitle,
      searchable: buildSearchableText([
        perfume.nombre,
        marca,
        genero,
        volumen,
        perfume.notasPrincipales,
        perfume.descripcion
      ])
    };
  }

  function normalizeVape(vape) {
    if (!vape) return null;

    const price = Number.parseFloat(vape.precio) || 0;
    const marca = typeof vape.marca === 'string' ? vape.marca.trim() : '';
    const sabores = Array.isArray(vape.sabores)
      ? vape.sabores.map((sabor) => (sabor?.nombre || '').trim()).filter(Boolean)
      : [];
    const imagenes = Array.isArray(vape.imagenes) ? vape.imagenes : [];
    const imagen = imagenes[0]?.url || FALLBACK_IMAGE;
    const pitadas = vape.pitadas != null ? Number(vape.pitadas) : null;
    const subtitle = pitadas ? `${pitadas} puffs` : '';

    return {
      uid: `vape-${vape.id}`,
      id: vape.id,
      tipo: 'vape',
      nombre: vape.nombre || 'Producto',
      marca,
      genero: '',
      precio: price,
      precioTransferencia: Math.round(price * TRANSFER_DISCOUNT * 100) / 100,
      imagen,
      imagenes,
      ml: null,
      volumen: '',
      descripcion: vape.descripcion || '',
      notas: '',
      stock: vape.stock ?? null,
      pitadas,
      modos: vape.modos || '',
      sabores,
      subtitle,
      searchable: buildSearchableText([
        vape.nombre,
        marca,
        sabores.join(' '),
        vape.descripcion
      ])
    };
  }

  function buildSearchableText(parts) {
    return parts
      .filter((part) => typeof part === 'string' && part.trim())
      .map((part) => part.trim().toLowerCase())
      .join(' ');
  }

  function computeMetadata(state) {
    const prices = state.products.map((product) => product.precio);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    state.priceRange = {
      min: minPrice,
      max: maxPrice
    };

    const genders = new Set();
    const brandMap = {};

    state.products.forEach((product) => {
      if (product.genero) {
        genders.add(product.genero.trim());
      }
      const type = product.tipo;
      if (!brandMap[type]) {
        brandMap[type] = new Set();
      }
      if (product.marca) {
        brandMap[type].add(product.marca.trim());
      }
    });

    state.genderOptions = Array.from(genders).sort(collator.compare);
    state.brandOptionsByType = Object.fromEntries(
      Object.entries(brandMap).map(([type, set]) => [
        type,
        Array.from(set).sort(collator.compare)
      ])
    );
  }

  function applyInitialFiltersFromQuery(state, selected) {
    const params = new URLSearchParams(window.location.search);

    const tipos = collectParamValues(params, 'tipo');
    tipos.forEach((tipo) => {
      if (TYPE_LABELS[tipo]) {
        selected.tipo.add(tipo);
      }
    });

    const generos = collectParamValues(params, 'genero');
    generos.forEach((genero) => selected.genero.add(genero));

    const marcas = collectParamValues(params, 'marca');
    marcas.forEach((marca) => selected.marca.add(marca));

    const precioMax = params.get('precioMax');
    if (precioMax != null) {
      const parsed = Number.parseFloat(precioMax);
      if (Number.isFinite(parsed) && parsed > 0) {
        selected.maxPrice = parsed;
      }
    }

    const search = params.get('q') || params.get('search') || '';
    if (search) {
      state.searchTerm = search.trim();
      state.searchNormalized = state.searchTerm.toLowerCase();
    }
  }

  function collectParamValues(params, key) {
    const values = params.getAll(key);
    const single = params.get(key);
    if (single) {
      values.push(single);
    }
    return values
      .flatMap((value) => value.split(','))
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  function renderTypeFilter(state, elements, selected, checkboxes) {
    if (!elements.filterTipo) return;
    elements.filterTipo.innerHTML = '';
    const types = Array.from(new Set(state.products.map((product) => product.tipo))).sort(collator.compare);

    checkboxes.tipo = types.map((type) => {
      const id = `filter-tipo-${type}`;
      const item = document.createElement('li');
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = TYPE_LABELS[type] || type;

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.value = type;
      input.checked = selected.tipo.has(type);

      input.addEventListener('change', () => {
        if (input.checked) {
          selected.tipo.add(type);
        } else {
          selected.tipo.delete(type);
        }
        updateBrandOptions(state, selected);
        renderBrandFilter(state, elements, selected, checkboxes);
        applyFilters(state, selected, elements, checkboxes);
      });

      label.prepend(input);
      item.append(label);
      elements.filterTipo.append(item);
      return input;
    });
  }

  function renderGeneroFilter(state, elements, selected, checkboxes) {
    if (!elements.filterGenero) return;
    elements.filterGenero.innerHTML = '';

    checkboxes.genero = state.genderOptions.map((genero) => {
      const id = `filter-genero-${slugify(genero)}`;
      const item = document.createElement('li');
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = genero;

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.value = genero.toLowerCase();
      input.checked = selected.genero.has(input.value);

      input.addEventListener('change', () => {
        if (input.checked) {
          selected.genero.add(input.value);
        } else {
          selected.genero.delete(input.value);
        }
        applyFilters(state, selected, elements, checkboxes);
      });

      label.prepend(input);
      item.append(label);
      elements.filterGenero.append(item);
      return input;
    });
  }

  function updateBrandOptions(state, selected) {
    const availableTypes = selectedTiposOrAll(state, selected);
    const brandSet = new Set();
    const brandLowerSet = new Set();
    availableTypes.forEach((type) => {
      const brands = state.brandOptionsByType[type];
      if (Array.isArray(brands)) {
        brands.forEach((brand) => {
          brandSet.add(brand);
          brandLowerSet.add(brand.toLowerCase());
        });
      }
    });

    selected.marca.forEach((brand) => {
      if (!brandLowerSet.has(brand)) {
        selected.marca.delete(brand);
      }
    });

    state.availableBrands = Array.from(brandSet).sort(collator.compare);
  }

  function selectedTiposOrAll(state, selected) {
    const allTypes = Object.keys(state.brandOptionsByType);
    if (!allTypes.length) {
      return Array.from(new Set(state.products.map((product) => product.tipo)));
    }
    return selected.tipo.size ? Array.from(selected.tipo) : allTypes;
  }

  function renderBrandFilter(state, elements, selected, checkboxes) {
    if (!elements.filterMarca) return;
    elements.filterMarca.innerHTML = '';

    const brands = state.availableBrands || [];
    if (!brands.length) {
      const emptyItem = document.createElement('li');
      emptyItem.textContent = 'Seleccioná un tipo para ver marcas disponibles';
      emptyItem.className = 'filter-list__empty';
      elements.filterMarca.append(emptyItem);
      checkboxes.marca = [];
      return;
    }

    checkboxes.marca = brands.map((brand) => {
      const id = `filter-marca-${slugify(brand)}`;
      const item = document.createElement('li');
      const label = document.createElement('label');
      label.setAttribute('for', id);
      label.textContent = brand;

      const input = document.createElement('input');
      input.type = 'checkbox';
      input.id = id;
      input.value = brand.toLowerCase();
      input.checked = selected.marca.has(input.value);

      input.addEventListener('change', () => {
        if (input.checked) {
          selected.marca.add(input.value);
        } else {
          selected.marca.delete(input.value);
        }
        applyFilters(state, selected, elements, checkboxes);
      });

      label.prepend(input);
      item.append(label);
      elements.filterMarca.append(item);
      return input;
    });
  }

  function configurePriceFilter(state, selected, elements, checkboxes) {
    if (!elements.priceRange) return;

    const maxPrice = Math.ceil((selected.maxPrice ?? state.priceRange.max) / PRICE_STEP) * PRICE_STEP || PRICE_STEP;
    const minPrice = Math.floor(state.priceRange.min / PRICE_STEP) * PRICE_STEP;

    elements.priceRange.min = String(minPrice);
    elements.priceRange.max = String(maxPrice);

    const initialMax = selected.maxPrice != null ? selected.maxPrice : maxPrice;
    selected.maxPrice = initialMax;
    elements.priceRange.value = String(initialMax);

    updatePriceLabels(elements, minPrice, initialMax);

    elements.priceRange.addEventListener('input', () => {
      const value = Number.parseFloat(elements.priceRange.value);
      if (Number.isFinite(value)) {
        selected.maxPrice = value;
        updatePriceLabels(elements, minPrice, value);
        applyFilters(state, selected, elements, checkboxes);
      }
    });
  }

  function updatePriceLabels(elements, min, max) {
    if (elements.priceMinLabel) {
      elements.priceMinLabel.textContent = formatPrice(min);
    }
    if (elements.priceMaxLabel) {
      elements.priceMaxLabel.textContent = formatPrice(max);
    }
  }

  function configureClearButton(state, selected, elements, checkboxes) {
    if (!elements.clearButton) return;
    elements.clearButton.addEventListener('click', () => {
      selected.tipo.clear();
      selected.genero.clear();
      selected.marca.clear();
      selected.maxPrice = state.priceRange.max;
      if (elements.priceRange) {
        elements.priceRange.value = String(selected.maxPrice);
        updatePriceLabels(elements, Number(elements.priceRange.min), selected.maxPrice);
      }
      syncCheckboxes(selected, checkboxes);
      updateBrandOptions(state, selected);
      renderBrandFilter(state, elements, selected, checkboxes);
      applyFilters(state, selected, elements, checkboxes);
    });
  }

  function syncCheckboxes(selected, checkboxes) {
    checkboxes.tipo.forEach((input) => {
      input.checked = selected.tipo.has(input.value);
    });
    checkboxes.genero.forEach((input) => {
      input.checked = selected.genero.has(input.value);
    });
    checkboxes.marca.forEach((input) => {
      input.checked = selected.marca.has(input.value);
    });
  }

  function applyFilters(state, selected, elements, checkboxes) {
    const maxPrice = selected.maxPrice != null ? selected.maxPrice : state.priceRange.max;
    const hasSearch = Boolean(state.searchNormalized);

    const filtered = state.products.filter((product) => {
      if (selected.tipo.size && !selected.tipo.has(product.tipo)) return false;
      if (selected.genero.size) {
        const genero = product.genero ? product.genero.toLowerCase() : '';
        if (!selected.genero.has(genero)) return false;
      }
      if (selected.marca.size) {
        const marca = product.marca ? product.marca.toLowerCase() : '';
        if (!selected.marca.has(marca)) return false;
      }
      if (product.precio > maxPrice) return false;
      if (hasSearch && !product.searchable.includes(state.searchNormalized)) return false;
      return true;
    });

    state.filtered = filtered;
    renderProducts(state, elements, filtered);
  }

  function renderProducts(state, elements, products) {
    if (!elements.grid) return;
    elements.grid.innerHTML = '';

    if (!products.length) {
      updateStatus('No encontramos productos con los filtros seleccionados.');
      return;
    }

    const fragment = document.createDocumentFragment();

    products.forEach((product, index) => {
      const card = createProductCard(product);
      if (!card) return;

      card.dataset.price = String(product.precio);
      card.dataset.name = product.nombre;
      card.dataset.productType = product.tipo;
      card.dataset.productBrand = product.marca || '';
      card.dataset.originalIndex = String(index);

      const titleEl = card.querySelector('.product-card__title');
      if (titleEl) {
        highlightMatch(titleEl, product.nombre, state.searchTerm);
      }

      const brandEl = card.querySelector('.product-card__brand');
      if (brandEl) {
        highlightMatch(brandEl, product.marca || '', state.searchTerm);
      }

      fragment.appendChild(card);
    });

    elements.grid.appendChild(fragment);

    const label = state.searchTerm
      ? `Mostrando ${products.length} producto${products.length === 1 ? '' : 's'} para "${state.searchTerm}"`
      : `Mostrando ${products.length} producto${products.length === 1 ? '' : 's'}`;
    updateStatus(label);
  }

  function createProductCard(product) {
    const templateFn = window.VesperTemplates?.createProductCard;
    const info = {
      id: product.id,
      tipo: product.tipo.toUpperCase(),
      nombre: product.nombre,
      marca: product.marca,
      precio: product.precio,
      precioTransferencia: product.precioTransferencia,
      imagenes: product.imagenes,
      ml: product.ml,
      volumen: product.volumen,
      genero: product.genero
    };

    const card = templateFn ? templateFn(info) : buildFallbackCard(product);
    if (!card) return null;

    const button = card.querySelector('[data-action="add-to-cart"]');
    if (button) {
      button.dataset.productId = product.uid;
      button.dataset.productName = product.subtitle
        ? `${product.nombre} ${product.subtitle}`.trim()
        : product.nombre;
      button.dataset.productPrice = String(product.precio);
      button.dataset.productType = TYPE_LABELS[product.tipo] || product.tipo;
      button.dataset.productSubtitle = product.subtitle || TYPE_LABELS[product.tipo] || '';
      button.dataset.productImage = product.imagen;
    }

    return card;
  }

  function buildFallbackCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.productId = product.uid;

    const media = document.createElement('div');
    media.className = 'product-card__media';
    const img = document.createElement('img');
    img.src = product.imagen;
    img.alt = `${product.nombre} ${product.marca || ''}`.trim();
    img.loading = 'lazy';
    media.appendChild(img);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'product-card__add btn btn--primary';
    button.dataset.action = 'add-to-cart';
    button.textContent = 'Agregar al carrito';
    media.appendChild(button);

    const body = document.createElement('div');
    body.className = 'product-card__body';

    if (product.marca) {
      const brand = document.createElement('p');
      brand.className = 'product-card__brand';
      brand.textContent = product.marca;
      body.appendChild(brand);
    }

    const title = document.createElement('h3');
    title.className = 'product-card__title';
    title.textContent = product.nombre;
    body.appendChild(title);

    if (product.subtitle) {
      const subtitle = document.createElement('p');
      subtitle.className = 'product-card__subtitle';
      subtitle.textContent = product.subtitle;
      body.appendChild(subtitle);
    }

    const pricing = document.createElement('div');
    pricing.className = 'product-card__pricing';

    const priceEl = document.createElement('span');
    priceEl.className = 'product-card__price';
    priceEl.textContent = formatPrice(product.precio);
    pricing.appendChild(priceEl);

    const transferEl = document.createElement('span');
    transferEl.className = 'product-card__transfer';
    transferEl.textContent = `Transferencia ${formatPrice(product.precioTransferencia)}`;
    pricing.appendChild(transferEl);

    body.appendChild(pricing);
    card.appendChild(media);
    card.appendChild(body);
    return card;
  }

  function highlightMatch(element, text, query) {
    if (!element) return;
    if (!query) {
      element.textContent = text;
      return;
    }

    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.trim().toLowerCase();
    const index = normalizedText.indexOf(normalizedQuery);

    if (index === -1) {
      element.textContent = text;
      return;
    }

    const before = text.slice(0, index);
    const match = text.slice(index, index + normalizedQuery.length);
    const after = text.slice(index + normalizedQuery.length);

    element.textContent = '';
    if (before) {
      element.append(document.createTextNode(before));
    }
    const mark = document.createElement('mark');
    mark.textContent = match;
    element.append(mark);
    if (after) {
      element.append(document.createTextNode(after));
    }
  }

  function updateStatus(message, isError = false) {
    const statusElement = document.getElementById('productos-status');
    if (!statusElement) return;
    if (!message) {
      statusElement.hidden = true;
      statusElement.textContent = '';
      statusElement.classList.remove('is-error');
      return;
    }
    statusElement.hidden = false;
    statusElement.textContent = message;
    statusElement.classList.toggle('is-error', Boolean(isError));
  }

  function formatPrice(value) {
    if (window.Vesper?.utils?.formatPrice) {
      return window.Vesper.utils.formatPrice(value);
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(value);
  }

  function slugify(value) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

})();
