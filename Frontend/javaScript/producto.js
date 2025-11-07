(function() {
  'use strict';

  const API_BASE_URL = 'http://localhost:8080/api/public';
  const FALLBACK_IMAGE_URL = 'img/logo_vesper.jpg';
  const TRANSFER_DISCOUNT_RATE = 0.15;
  const MIN_QUANTITY = 1;
  const MAX_QUANTITY = 10;

  const initialPath = window.location.pathname;
  const basePath = initialPath.slice(0, initialPath.lastIndexOf('/') + 1) || '/';
  const catalogCache = {
    perfumes: null,
    vapes: null,
    perfumesPromise: null,
    vapesPromise: null
  };

  document.addEventListener('DOMContentLoaded', () => {
    absolutizeInternalLinks();
    initializeProductPage();
  });

  function absolutizeInternalLinks() {
    const anchors = document.querySelectorAll('a[href]');
    anchors.forEach(anchor => {
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
        return;
      }
      if (/^https?:/i.test(href)) {
        return;
      }
      try {
        const absolute = new URL(href, window.location.origin + basePath);
        anchor.setAttribute('href', absolute.pathname + absolute.search + absolute.hash);
      } catch (error) {
        console.warn('No se pudo normalizar el enlace', href, error);
      }
    });
  }

  async function initializeProductPage() {
    const detailSection = document.querySelector('[data-product-detail]');
    const relatedGrid = document.querySelector('[data-related-grid]');
    if (!detailSection) {
      return;
    }

    setLoadingState(detailSection, true);
    if (relatedGrid) {
      relatedGrid.setAttribute('aria-busy', 'true');
    }

    try {
      const reference = parseProductReference();
      if (!reference.id && !reference.key && !reference.name) {
        throw new Error('No se encontró la referencia del producto.');
      }

      const productResponse = await fetchProductData(reference);
      const normalized = normalizeProductDetail(productResponse.data, productResponse.type, reference);
      renderProductDetail(normalized);

      updateBreadcrumb(normalized);
      updateDocumentMetadata(normalized);

      await renderRelatedProducts(normalized);
    } catch (error) {
      console.error('No se pudo cargar el producto:', error);
      showProductError('No encontramos la información de este producto. Volvé al catálogo para seguir explorando.');
    } finally {
      setLoadingState(detailSection, false);
      if (relatedGrid) {
        relatedGrid.removeAttribute('aria-busy');
      }
    }
  }

  function parseProductReference() {
    const url = new URL(window.location.href);
    const ref = {
      id: sanitizeId(url.searchParams.get('id')),
      type: normalizeType(url.searchParams.get('type') || url.searchParams.get('tipo')),
      slug: sanitizeSlug(url.searchParams.get('slug') || url.searchParams.get('nombre')),
      key: sanitizeSlug(url.searchParams.get('key')),
      name: url.searchParams.get('name') ? url.searchParams.get('name').trim() : ''
    };

    if (!ref.id) {
      const pathMatch = window.location.pathname.match(/producto(?:\.html)?\/?([^/?#]+)/i);
      if (pathMatch && pathMatch[1]) {
        const parts = pathMatch[1].split('-');
        const possibleId = sanitizeId(parts[0]);
        if (possibleId) {
          ref.id = possibleId;
          parts.shift();
        }
        if (!ref.slug && parts.length) {
          ref.slug = sanitizeSlug(parts.join('-'));
        }
      }
    }

    return ref;
  }

  function sanitizeId(value) {
    if (!value) return null;
    const trimmed = String(value).trim();
    return /^\d+$/.test(trimmed) ? trimmed : null;
  }

  function normalizeType(value) {
    if (!value) return '';
    const normalized = String(value).trim().toLowerCase();
    if (['perfume', 'vape', 'decant'].includes(normalized)) {
      return normalized;
    }
    return '';
  }

  function sanitizeSlug(value) {
    if (!value) return '';
    return value
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-]+/g, '-');
  }

  async function fetchProductData(reference) {
    const fetchOrder = [];
    if (reference.type === 'vape') {
      fetchOrder.push('vape');
    } else if (reference.type === 'perfume' || reference.type === 'decant') {
      fetchOrder.push('perfume');
    } else {
      fetchOrder.push('perfume', 'vape');
    }

    let lastError = null;
    for (const type of fetchOrder) {
      if (!reference.id) break;
      try {
        if (type === 'vape') {
          const data = await fetchVape(reference.id);
          return { data, type: 'vape' };
        }
        const data = await fetchPerfume(reference.id);
        return { data, type: reference.type === 'decant' ? 'decant' : 'perfume' };
      } catch (error) {
        lastError = error;
      }
    }

    if (reference.id && lastError) {
      console.warn('Reintentando búsqueda del producto por catálogos locales.');
    }

    const catalogs = await Promise.all([fetchPerfumesList(), fetchVapesList()]);
    const perfumeCatalog = catalogs[0];
    const vapeCatalog = catalogs[1];

    if (reference.id) {
      const perfumeMatch = perfumeCatalog.find(item => String(item.id) === reference.id);
      if (perfumeMatch) {
        return { data: perfumeMatch, type: perfumeMatch.decant ? 'decant' : 'perfume' };
      }
      const vapeMatch = vapeCatalog.find(item => String(item.id) === reference.id);
      if (vapeMatch) {
        return { data: vapeMatch, type: 'vape' };
      }
    }

    if (reference.key) {
      const perfumeMatch = perfumeCatalog.find(item => sanitizeSlug(`${item.id}-${item.nombre}`) === reference.key || sanitizeSlug(item.nombre) === reference.key);
      if (perfumeMatch) {
        return { data: perfumeMatch, type: perfumeMatch.decant ? 'decant' : 'perfume' };
      }
      const vapeMatch = vapeCatalog.find(item => sanitizeSlug(`${item.id}-${item.nombre}`) === reference.key || sanitizeSlug(item.nombre) === reference.key);
      if (vapeMatch) {
        return { data: vapeMatch, type: 'vape' };
      }
    }

    if (reference.slug || reference.name) {
      const normalizedName = reference.slug || sanitizeSlug(reference.name);
      if (normalizedName) {
        const perfumeMatch = perfumeCatalog.find(item => sanitizeSlug(item.nombre) === normalizedName);
        if (perfumeMatch) {
          return { data: perfumeMatch, type: perfumeMatch.decant ? 'decant' : 'perfume' };
        }
        const vapeMatch = vapeCatalog.find(item => sanitizeSlug(item.nombre) === normalizedName);
        if (vapeMatch) {
          return { data: vapeMatch, type: 'vape' };
        }
      }
    }

    throw lastError || new Error('Producto no encontrado');
  }

  async function fetchPerfume(id) {
    if (window.apiClient?.fetchPerfume) {
      return window.apiClient.fetchPerfume(id);
    }
    return requestJson(`${API_BASE_URL}/perfumes/${id}`);
  }

  async function fetchVape(id) {
    if (window.apiClient?.fetchVape) {
      return window.apiClient.fetchVape(id);
    }
    return requestJson(`${API_BASE_URL}/vapes/${id}`);
  }

  async function fetchPerfumesList() {
    if (catalogCache.perfumes) {
      return catalogCache.perfumes;
    }
    if (catalogCache.perfumesPromise) {
      return catalogCache.perfumesPromise;
    }
    const loader = window.apiClient?.fetchPerfumes
      ? window.apiClient.fetchPerfumes()
      : requestJson(`${API_BASE_URL}/perfumes`);
    catalogCache.perfumesPromise = loader
      .then(data => {
        catalogCache.perfumes = Array.isArray(data) ? data : [];
        catalogCache.perfumesPromise = null;
        return catalogCache.perfumes;
      })
      .catch(error => {
        catalogCache.perfumesPromise = null;
        throw error;
      });
    return catalogCache.perfumesPromise;
  }

  async function fetchVapesList() {
    if (catalogCache.vapes) {
      return catalogCache.vapes;
    }
    if (catalogCache.vapesPromise) {
      return catalogCache.vapesPromise;
    }
    const loader = window.apiClient?.fetchVapes
      ? window.apiClient.fetchVapes()
      : requestJson(`${API_BASE_URL}/vapes`);
    catalogCache.vapesPromise = loader
      .then(data => {
        catalogCache.vapes = Array.isArray(data) ? data : [];
        catalogCache.vapesPromise = null;
        return catalogCache.vapes;
      })
      .catch(error => {
        catalogCache.vapesPromise = null;
        throw error;
      });
    return catalogCache.vapesPromise;
  }

  async function requestJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error ${response.status} al consultar ${url}`);
    }
    return response.json();
  }

  function normalizeProductDetail(data, inferredType, reference) {
    const typeFromDto = normalizeType(data?.tipoProducto);
    let type = inferredType || typeFromDto || 'producto';
    if (type === 'perfume' && data?.decant) {
      type = 'decant';
    }

    const price = Number.isFinite(data?.precio) ? Number(data.precio) : parseFloat(data?.precio) || 0;
    const previousPrice = Number.isFinite(data?.precioAnterior)
      ? Number(data.precioAnterior)
      : parseFloat(data?.precioAnterior);
    const stock = Number.isFinite(data?.stock) ? Number(data.stock) : 0;

    const images = Array.isArray(data?.imagenes)
      ? data.imagenes
          .map(item => toAbsoluteUrl(item?.url))
          .filter(Boolean)
      : [];

    if (!images.length) {
      images.push(toAbsoluteUrl(FALLBACK_IMAGE_URL));
    }

    const primaryImage = images[0] || toAbsoluteUrl(FALLBACK_IMAGE_URL);
    const galleryImages = images.slice(1, 6);

    const subtitle = buildSubtitle(data, type);
    const discountData = calculateDiscount(price, previousPrice);
    const transferPrice = calculateTransferPrice(price);
    const pyramid = buildPyramid(data);
    const features = buildFeatureList(data, type);
    const flavors = extractFlavorList(data);

    return {
      id: data?.id ? String(data.id) : reference.id || '',
      key: reference.key || sanitizeSlug(`${data?.id ?? ''}-${data?.nombre ?? ''}`),
      type,
      brand: data?.marca || '',
      name: data?.nombre || 'Producto',
      description: data?.descripcion || '',
      price,
      previousPrice: discountData.previousPrice,
      discountPercentage: discountData.percentage,
      transferPrice,
      stock,
      primaryImage,
      galleryImages,
      pyramid,
      features,
      flavors,
      subtitle,
      genero: data?.genero || '',
      notasPrincipales: data?.notasPrincipales || '',
      raw: data
    };
  }

  function toAbsoluteUrl(path) {
    if (!path) return '';
    try {
      return new URL(path, window.location.origin + basePath).href;
    } catch (error) {
      return path;
    }
  }

  function buildSubtitle(data, type) {
    const pieces = [];
    if (type === 'vape') {
      if (Number.isFinite(data?.pitadas)) {
        pieces.push(`${data.pitadas} puffs`);
      }
      if (data?.modos) {
        pieces.push(data.modos);
      }
      if (Array.isArray(data?.sabores) && data.sabores.length) {
        pieces.push(`${data.sabores.length} sabores`);
      }
      return pieces.join(' • ');
    }

    if (Number.isFinite(data?.ml)) {
      pieces.push(`${data.ml} ml`);
    } else if (data?.volumen) {
      pieces.push(data.volumen);
    }

    if (data?.genero) {
      pieces.push(capitalize(data.genero));
    }

    if (data?.fragancia) {
      pieces.push(data.fragancia);
    }

    return pieces.join(' • ');
  }

  function calculateDiscount(price, previousPrice) {
    if (Number.isFinite(previousPrice) && previousPrice > price && price > 0) {
      const percentage = Math.round((1 - price / previousPrice) * 100);
      return { percentage, previousPrice };
    }
    const percentage = Math.round(TRANSFER_DISCOUNT_RATE * 100);
    return { percentage, previousPrice: null };
  }

  function calculateTransferPrice(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }
    const discounted = value * (1 - TRANSFER_DISCOUNT_RATE);
    return Math.round(discounted * 100) / 100;
  }

  function buildPyramid(data) {
    return {
      salida: data?.salida || data?.notasPrincipales || '',
      corazon: data?.corazon || '',
      fondo: data?.fondo || ''
    };
  }

  function buildFeatureList(data, type) {
    if (type === 'vape') {
      return [
        { label: 'Concentración', value: data?.modos ? `Modos ${data.modos}` : 'Intensidad equilibrada' },
        { label: 'Duración', value: Number.isFinite(data?.pitadas) ? `${data.pitadas} puffs aproximados` : 'Hasta 6000 puffs' },
        { label: 'Proyección', value: 'Vapor abundante y denso' },
        { label: 'Temporada', value: 'Uso en cualquier estación' },
        { label: 'Ocasión', value: 'Momentos sociales o relajados' }
      ];
    }

    const concentration = inferConcentration(data);
    const longevity = inferLongevity(concentration);
    const projection = inferProjection(concentration);
    const season = inferSeason(data);
    const occasion = inferOccasion(data);

    return [
      { label: 'Concentración', value: concentration },
      { label: 'Duración', value: longevity },
      { label: 'Proyección', value: projection },
      { label: 'Temporada', value: season },
      { label: 'Ocasión', value: occasion }
    ];
  }

  function inferConcentration(perfume) {
    const haystack = [perfume?.fragancia, perfume?.nombre, perfume?.descripcion]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (haystack.includes('extrait')) return 'Extrait de Parfum';
    if (haystack.includes('parfum')) return 'Eau de Parfum';
    if (haystack.includes('toilette')) return 'Eau de Toilette';
    if (haystack.includes('cologne')) return 'Eau de Cologne';
    if (perfume?.volumen) return perfume.volumen;
    return 'No especificado';
  }

  function inferLongevity(concentration) {
    const value = concentration.toLowerCase();
    if (value.includes('extrait')) return 'Muy alta (8-12 hs)';
    if (value.includes('parfum')) return 'Alta (6-8 hs)';
    if (value.includes('toilette')) return 'Media (4-6 hs)';
    if (value.includes('cologne')) return 'Ligera (2-4 hs)';
    return 'Variable según piel (4-6 hs)';
  }

  function inferProjection(concentration) {
    const value = concentration.toLowerCase();
    if (value.includes('extrait')) return 'Intensa y envolvente';
    if (value.includes('parfum')) return 'Amplia y persistente';
    if (value.includes('toilette')) return 'Moderada y equilibrada';
    if (value.includes('cologne')) return 'Suave y cercana';
    return 'Moderada';
  }

  function inferSeason(perfume) {
    const notes = [perfume?.notasPrincipales, perfume?.salida, perfume?.corazon, perfume?.fondo]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (notes.match(/cítrico|citrico|marino|herbal|verde/)) {
      return 'Primavera / Verano';
    }
    if (notes.match(/ámbar|ambar|madera|cuero|especia/)) {
      return 'Otoño / Invierno';
    }
    if (notes.match(/floral|rosa|jazmín|jasmin/)) {
      return 'Primavera';
    }
    return 'Todo el año';
  }

  function inferOccasion(perfume) {
    const text = [perfume?.descripcion, perfume?.fragancia]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (text.includes('noche') || text.includes('night')) {
      return 'Eventos nocturnos';
    }
    if (text.includes('oficina') || text.includes('día') || text.includes('dia')) {
      return 'Uso diario';
    }
    return 'Ocasiones versátiles';
  }

  function extractFlavorList(data) {
    if (!Array.isArray(data?.sabores) || !data.sabores.length) {
      if (data?.sabores instanceof Set && data.sabores.size > 0) {
        return Array.from(data.sabores).map(item => item?.nombre || item?.name).filter(Boolean);
      }
      return [];
    }
    return data.sabores
      .map(item => item?.nombre || item?.name)
      .filter(Boolean);
  }

  function renderProductDetail(product) {
    const page = document.getElementById('product-page');
    const brand = document.querySelector('[data-product-brand]');
    const typeLabel = document.querySelector('[data-product-type]');
    const discountBadge = document.querySelector('[data-product-discount]');
    const title = document.querySelector('[data-product-title]');
    const subtitle = document.querySelector('[data-product-subtitle]');
    const priceElement = document.querySelector('[data-product-price]');
    const oldPriceElement = document.querySelector('[data-product-old-price]');
    const transferText = document.querySelector('[data-product-transfer]');
    const stockElement = document.querySelector('[data-product-stock]');
    const descriptionElement = document.querySelector('[data-description-text]');
    const featuresContainer = document.querySelector('[data-features]');
    const featuresList = document.querySelector('[data-features-list]');
    const pyramidTop = document.querySelector('[data-pyramid-top]');
    const pyramidHeart = document.querySelector('[data-pyramid-heart]');
    const pyramidBase = document.querySelector('[data-pyramid-base]');
    const flavorsSection = document.querySelector('[data-product-flavors]');
    const flavorsList = document.querySelector('[data-flavors-list]');
    const addButton = document.querySelector('.product-detail__add');
    const galleryMain = document.querySelector('[data-main-image] img');
    const thumbnailContainer = document.querySelector('[data-thumbnails]');

    if (page) {
      page.dataset.productLoaded = 'true';
    }

    if (brand) {
      brand.textContent = product.brand || 'Vesper';
    }

    if (typeLabel) {
      typeLabel.textContent = formatProductType(product.type);
    }

    if (discountBadge) {
      if (product.discountPercentage > 0) {
        discountBadge.textContent = `${product.discountPercentage}% OFF`;
        discountBadge.hidden = false;
      } else {
        discountBadge.hidden = true;
      }
    }

    if (title) {
      title.textContent = product.name;
    }

    if (subtitle) {
      subtitle.textContent = product.subtitle;
      subtitle.hidden = !product.subtitle;
    }

    if (priceElement) {
      priceElement.textContent = formatPrice(product.price);
    }

    if (oldPriceElement) {
      if (product.previousPrice && product.previousPrice > product.price) {
        oldPriceElement.textContent = formatPrice(product.previousPrice);
        oldPriceElement.hidden = false;
      } else {
        oldPriceElement.hidden = true;
      }
    }

    if (transferText) {
      transferText.textContent = `Pagando por transferencia: ${formatPrice(product.transferPrice)} (${Math.round(TRANSFER_DISCOUNT_RATE * 100)}% OFF)`;
    }

    if (stockElement) {
      if (product.stock > 0) {
        stockElement.textContent = `Stock disponible: ${product.stock} unidades`;
      } else {
        stockElement.textContent = 'Sin stock momentáneamente';
      }
    }

    if (descriptionElement) {
      descriptionElement.textContent = product.description || 'Este producto todavía no cuenta con una descripción detallada.';
    }

    if (featuresContainer && featuresList) {
      featuresList.innerHTML = '';
      product.features.forEach(feature => {
        const dt = document.createElement('dt');
        dt.textContent = feature.label;
        const dd = document.createElement('dd');
        dd.textContent = feature.value || 'No especificado';
        featuresList.appendChild(dt);
        featuresList.appendChild(dd);
      });
    }

    if (pyramidTop) {
      pyramidTop.textContent = product.pyramid.salida || 'No disponible';
    }
    if (pyramidHeart) {
      pyramidHeart.textContent = product.pyramid.corazon || 'No disponible';
    }
    if (pyramidBase) {
      pyramidBase.textContent = product.pyramid.fondo || 'No disponible';
    }

    if (flavorsSection && flavorsList) {
      flavorsList.innerHTML = '';
      if (product.flavors.length) {
        product.flavors.slice(0, 6).forEach(flavor => {
          const li = document.createElement('li');
          li.textContent = flavor;
          flavorsList.appendChild(li);
        });
        flavorsSection.hidden = false;
      } else {
        flavorsSection.hidden = true;
      }
    }

    if (galleryMain) {
      galleryMain.src = product.primaryImage;
      galleryMain.alt = `Imagen principal de ${product.name}`;
    }

    if (thumbnailContainer) {
      thumbnailContainer.innerHTML = '';
      const images = [product.primaryImage, ...product.galleryImages];
      images.slice(0, 5).forEach((src, index) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'product-detail__thumbnail';
        button.dataset.imageIndex = String(index);
        button.setAttribute('aria-label', `Ver imagen ${index + 1} de ${product.name}`);

        const img = document.createElement('img');
        img.src = src;
        img.alt = `Miniatura ${index + 1}`;
        button.appendChild(img);

        if (index === 0) {
          button.classList.add('is-active');
        }

        button.addEventListener('click', () => {
          updateMainImage(images, index);
        });

        thumbnailContainer.appendChild(button);
      });
    }

    setupQuantitySelector(addButton, product);
  }

  function updateMainImage(images, selectedIndex) {
    const galleryMain = document.querySelector('[data-main-image] img');
    const thumbnails = document.querySelectorAll('.product-detail__thumbnail');
    if (!galleryMain || !images[selectedIndex]) return;

    galleryMain.src = images[selectedIndex];
    thumbnails.forEach((thumbnail, index) => {
      thumbnail.classList.toggle('is-active', index === selectedIndex);
    });
  }

  function setupQuantitySelector(addButton, product) {
    const selector = document.querySelector('[data-quantity-selector]');
    if (!selector || !addButton) return;

    const decreaseBtn = selector.querySelector('[data-qty-decrease]');
    const increaseBtn = selector.querySelector('[data-qty-increase]');
    const input = selector.querySelector('[data-qty-input]');

    const updateButtonLabel = () => {
      const quantity = clampQuantity(Number.parseInt(input.value, 10));
      addButton.dataset.productQuantity = String(quantity);
      const total = product.price * quantity;
      addButton.textContent = `Agregar al carrito – ${formatPrice(total)}`;
      addButton.disabled = product.stock === 0;
    };

    const changeQuantity = delta => {
      const current = clampQuantity(Number.parseInt(input.value, 10));
      const next = clampQuantity(current + delta);
      input.value = String(next);
      updateButtonLabel();
    };

    input.addEventListener('input', () => {
      input.value = String(clampQuantity(Number.parseInt(input.value, 10)));
      updateButtonLabel();
    });

    decreaseBtn?.addEventListener('click', () => changeQuantity(-1));
    increaseBtn?.addEventListener('click', () => changeQuantity(1));

    if (product.stock === 0) {
      input.value = '0';
      addButton.disabled = true;
      addButton.textContent = 'Sin stock';
    } else {
      input.value = '1';
      addButton.disabled = false;
      updateButtonLabel();
    }

    addButton.dataset.productId = product.key || `producto-${product.id}`;
    addButton.dataset.productName = product.name;
    addButton.dataset.productPrice = String(product.price);
    addButton.dataset.productOriginalPrice = String(product.previousPrice || product.price);
    addButton.dataset.productType = product.type;
    addButton.dataset.productImage = product.primaryImage;
    addButton.dataset.productSubtitle = product.subtitle || '';
    addButton.dataset.catalogId = product.id;
    addButton.dataset.catalogType = product.type;
    addButton.dataset.catalogKey = product.key;
    addButton.dataset.productSlug = sanitizeSlug(product.name);
  }

  function clampQuantity(value) {
    if (!Number.isFinite(value)) return MIN_QUANTITY;
    return Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, value));
  }

  function renderRelatedProducts(product) {
    const grid = document.querySelector('[data-related-grid]');
    if (!grid) return;
    grid.innerHTML = '';

    return fetchRelatedProducts(product)
      .then(related => {
        if (!related.length) {
          const message = document.createElement('p');
          message.className = 'related-products__empty';
          message.textContent = 'No encontramos productos similares por el momento.';
          grid.appendChild(message);
          return;
        }

        related.forEach(item => {
          const card = buildRelatedProductCard(item);
          grid.appendChild(card);
        });
      })
      .catch(error => {
        console.error('No se pudieron cargar los productos relacionados:', error);
        const message = document.createElement('p');
        message.className = 'related-products__empty';
        message.textContent = 'No pudimos cargar productos relacionados. Intentalo más tarde.';
        grid.appendChild(message);
      });
  }

  async function fetchRelatedProducts(product) {
    const catalogs = product.type === 'vape'
      ? [[], await fetchVapesList()]
      : [await fetchPerfumesList(), await fetchVapesList()];

    const perfumeCatalog = catalogs[0];
    const vapeCatalog = catalogs[1];

    const normalizedPerfumes = perfumeCatalog
      .filter(item => String(item.id) !== product.id)
      .map(normalizePerfumeSummary);

    const normalizedVapes = vapeCatalog
      .filter(item => String(item.id) !== product.id)
      .map(normalizeVapeSummary);

    let candidates = [];
    if (product.type === 'vape') {
      candidates = normalizedVapes;
    } else if (product.type === 'decant') {
      candidates = normalizedPerfumes.filter(item => item.type === 'decant');
    } else {
      candidates = normalizedPerfumes.filter(item => item.type === 'perfume');
    }

    if (candidates.length < 4 && product.type !== 'vape') {
      const extra = normalizedPerfumes.filter(item => item.type !== product.type);
      candidates = candidates.concat(extra);
    }

    const scored = candidates
      .map(candidate => ({ candidate, score: computeSimilarityScore(product, candidate) }))
      .sort((a, b) => b.score - a.score);

    const top = scored.slice(0, 4).map(item => item.candidate);
    if (top.length < 4) {
      const fallback = [...normalizedPerfumes, ...normalizedVapes]
        .filter(item => item.id !== product.id && !top.some(existing => existing.id === item.id))
        .slice(0, 4 - top.length);
      return [...top, ...fallback];
    }

    return top;
  }

  function normalizePerfumeSummary(perfume) {
    const type = perfume?.decant ? 'decant' : 'perfume';
    return {
      id: perfume?.id ? String(perfume.id) : '',
      key: sanitizeSlug(`${perfume?.id ?? ''}-${perfume?.nombre ?? ''}`),
      type,
      brand: perfume?.marca || '',
      name: perfume?.nombre || 'Perfume',
      genero: (perfume?.genero || '').toUpperCase(),
      ml: Number.isFinite(perfume?.ml) ? perfume.ml : null,
      price: Number.isFinite(perfume?.precio) ? Number(perfume.precio) : parseFloat(perfume?.precio) || 0,
      stock: Number.isFinite(perfume?.stock) ? Number(perfume.stock) : 0,
      image: pickPrimaryImage(perfume?.imagenes),
      notas: [perfume?.notasPrincipales, perfume?.salida, perfume?.corazon, perfume?.fondo]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
    };
  }

  function normalizeVapeSummary(vape) {
    const sabores = extractFlavorList(vape);
    return {
      id: vape?.id ? String(vape.id) : '',
      key: sanitizeSlug(`${vape?.id ?? ''}-${vape?.nombre ?? ''}`),
      type: 'vape',
      brand: vape?.marca || '',
      name: vape?.nombre || 'Vape',
      price: Number.isFinite(vape?.precio) ? Number(vape.precio) : parseFloat(vape?.precio) || 0,
      stock: Number.isFinite(vape?.stock) ? Number(vape.stock) : 0,
      pitadas: Number.isFinite(vape?.pitadas) ? vape.pitadas : null,
      image: pickPrimaryImage(vape?.imagenes),
      saboresTexto: sabores.join(' ').toLowerCase()
    };
  }

  function pickPrimaryImage(images) {
    if (!Array.isArray(images)) {
      if (images && images.url) {
        return toAbsoluteUrl(images.url);
      }
      return toAbsoluteUrl(FALLBACK_IMAGE_URL);
    }
    for (const image of images) {
      if (image?.url) {
        return toAbsoluteUrl(image.url);
      }
    }
    return toAbsoluteUrl(FALLBACK_IMAGE_URL);
  }

  function computeSimilarityScore(reference, candidate) {
    let score = 0;

    if (reference.brand && candidate.brand && reference.brand.toLowerCase() === candidate.brand.toLowerCase()) {
      score += 5;
    }

    if (reference.type === 'vape' && candidate.type === 'vape') {
      if (reference.flavors.length && candidate.saboresTexto) {
        const referenceTokens = reference.flavors.map(flavor => flavor.toLowerCase());
        const matches = referenceTokens.filter(token => candidate.saboresTexto.includes(token));
        score += matches.length * 2;
      }
      if (candidate.pitadas && reference.raw?.pitadas) {
        const difference = Math.abs(candidate.pitadas - reference.raw.pitadas);
        score += Math.max(0, 6 - difference / 500);
      }
    } else {
      if (reference.genero && candidate.genero && reference.genero === candidate.genero) {
        score += 3;
      }
      if (reference.notasPrincipales && candidate.notas) {
        const referenceTokens = tokenize(reference.notasPrincipales);
        const matches = referenceTokens.filter(token => candidate.notas.includes(token));
        score += matches.length * 1.5;
      }
      if (reference.type === candidate.type) {
        score += 2;
      }
    }

    score += Math.min(candidate.stock || 0, 10) * 0.1;
    return score;
  }

  function tokenize(text) {
    return text
      .toLowerCase()
      .split(/[^a-záéíóúñ]+/)
      .filter(token => token.length > 3);
  }

  function buildRelatedProductCard(product) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.productId = product.key || `producto-${product.id}`;
    card.dataset.productName = product.name;
    card.dataset.productPrice = String(product.price);
    card.dataset.productType = product.type;
    card.dataset.productImage = product.image;
    card.dataset.catalogId = product.id;
    card.dataset.catalogType = product.type;
    card.dataset.catalogKey = product.key;
    card.dataset.productSlug = sanitizeSlug(product.name);
    card.tabIndex = 0;
    card.setAttribute('role', 'link');
    card.setAttribute('aria-label', `Ver detalles de ${product.name}`);

    const figure = document.createElement('figure');
    figure.className = 'product-card__figure';
    const img = document.createElement('img');
    img.src = product.image;
    img.alt = `${product.name} de ${product.brand}`;
    figure.appendChild(img);
    card.appendChild(figure);

    if (product.type === 'decant') {
      const badge = document.createElement('span');
      badge.className = 'product-card__badge';
      badge.textContent = 'Decant';
      card.appendChild(badge);
    }

    const body = document.createElement('div');
    body.className = 'product-card__body';

    if (product.brand) {
      const brand = document.createElement('p');
      brand.className = 'product-card__brand';
      brand.textContent = product.brand;
      body.appendChild(brand);
    }

    const title = document.createElement('h3');
    title.className = 'product-card__title';
    title.textContent = product.name;
    body.appendChild(title);

    const subtitle = document.createElement('p');
    subtitle.className = 'product-card__subtitle';
    if (product.type === 'vape') {
      const parts = [];
      if (product.pitadas) {
        parts.push(`${product.pitadas} puffs`);
      }
      subtitle.textContent = parts.join(' • ');
    } else if (product.ml) {
      subtitle.textContent = `${product.ml} ml`;
    }
    if (!subtitle.textContent) {
      subtitle.textContent = 'Descubrí todos los detalles';
    }
    card.dataset.productSubtitle = subtitle.textContent;
    body.appendChild(subtitle);

    const prices = document.createElement('div');
    prices.className = 'product-card__prices';
    const priceElement = document.createElement('span');
    priceElement.className = 'product-card__price';
    priceElement.textContent = formatPrice(product.price);
    prices.appendChild(priceElement);

    const discount = document.createElement('span');
    discount.className = 'product-card__discount';
    discount.innerHTML = `<span>${Math.round(TRANSFER_DISCOUNT_RATE * 100)}% OFF transferencia</span>`;
    prices.appendChild(discount);
    body.appendChild(prices);

    const actions = document.createElement('div');
    actions.className = 'product-card__actions';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn--primary';
    button.dataset.action = 'add-to-cart';
    button.dataset.productId = product.key || `producto-${product.id}`;
    button.dataset.productName = product.name;
    button.dataset.productPrice = String(product.price);
    button.dataset.productOriginalPrice = String(product.price);
    button.dataset.productType = product.type;
    button.dataset.productImage = product.image;
    button.dataset.productQuantity = '1';
    button.dataset.productSubtitle = subtitle.textContent;
    button.dataset.catalogId = product.id;
    button.dataset.catalogType = product.type;
    button.dataset.catalogKey = product.key;
    button.dataset.productSlug = sanitizeSlug(product.name);
    button.textContent = 'Agregar al carrito';
    actions.appendChild(button);
    body.appendChild(actions);

    card.appendChild(body);
    return card;
  }

  function updateBreadcrumb(product) {
    const breadcrumbCurrent = document.getElementById('breadcrumb-current');
    if (breadcrumbCurrent) {
      breadcrumbCurrent.textContent = product.name;
    }
  }

  function updateDocumentMetadata(product) {
    document.title = `${product.name} – Vesper`;
    const descriptionMeta = document.querySelector('meta[name="description"]');
    if (descriptionMeta) {
      descriptionMeta.setAttribute('content', product.description || `Descubrí ${product.name} de ${product.brand} en Vesper.`);
    }
  }

  function setLoadingState(element, isLoading) {
    if (!element) return;
    element.classList.toggle('is-loading', isLoading);
    element.setAttribute('aria-busy', String(isLoading));
  }

  function showProductError(message) {
    const container = document.querySelector('[data-product-detail]');
    if (!container) return;
    container.innerHTML = '';
    const error = document.createElement('div');
    error.className = 'product-detail__error';
    const title = document.createElement('h2');
    title.textContent = 'Ups, algo salió mal';
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    const backLink = document.createElement('a');
    backLink.className = 'btn btn--primary';
    backLink.href = 'productos.html';
    backLink.textContent = 'Volver al catálogo';
    error.appendChild(title);
    error.appendChild(paragraph);
    error.appendChild(backLink);
    container.appendChild(error);
  }

  function formatProductType(type) {
    switch ((type || '').toLowerCase()) {
      case 'perfume':
        return 'Perfume';
      case 'decant':
        return 'Decant';
      case 'vape':
        return 'Vape';
      default:
        return 'Producto';
    }
  }

  function formatPrice(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '$0';
    }
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0
    }).format(number);
  }

  function capitalize(value) {
    if (!value) return '';
    const normalized = value.toString().toLowerCase();
    return normalized.charAt(0).toUpperCase() + normalized.slice(1);
  }

  const shippingForm = document.querySelector('[data-shipping-form]');
  if (shippingForm) {
    shippingForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleShipping(event);
    });
  }

  function handleShipping(event) {
    const form = event.currentTarget;
    const input = form.querySelector('input[name="zip"]');
    const result = document.querySelector('[data-shipping-result]');
    if (!input || !result) return;

    const rawValue = input.value.trim();
    if (!/^\d{4,5}$/.test(rawValue)) {
      result.textContent = 'Ingresá un código postal válido (4 o 5 dígitos).';
      return;
    }

    const base = calculateShippingBase(rawValue);
    const deliveryDays = 2 + (parseInt(rawValue.slice(-1), 10) % 4);
    result.textContent = `Envío estimado: ${formatPrice(base)}. Entrega en ${deliveryDays} a ${deliveryDays + 1} días hábiles.`;
  }

  function calculateShippingBase(zip) {
    const firstDigit = parseInt(zip.charAt(0), 10);
    if (Number.isNaN(firstDigit)) {
      return 3200;
    }
    if (firstDigit >= 7) return 3600;
    if (firstDigit >= 4) return 3300;
    return 2900;
  }
})();
