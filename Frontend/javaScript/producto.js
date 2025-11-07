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
    const details = buildDetailList(data, type);
    const flavors = extractFlavorList(data);
    const description = buildDescriptionCopy({
      rawDescription: data?.descripcion,
      type,
      name: data?.nombre,
      brand: data?.marca,
      pyramid,
      details,
      flavors
    });

    return {
      id: data?.id ? String(data.id) : reference.id || '',
      key: reference.key || sanitizeSlug(`${data?.id ?? ''}-${data?.nombre ?? ''}`),
      type,
      brand: data?.marca || '',
      name: data?.nombre || 'Producto',
      description,
      originalDescription: data?.descripcion || '',
      price,
      previousPrice: discountData.previousPrice,
      discountPercentage: discountData.percentage,
      transferPrice,
      stock,
      primaryImage,
      galleryImages,
      pyramid,
      details,
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
    if (type === 'vape') {
      if (Number.isFinite(data?.pitadas)) {
        return `${data.pitadas} pitadas`;
      }
      const puffText = formatPuffCount(data?.pitadas);
      return puffText;
    }

    if (type === 'perfume' || type === 'decant') {
      if (Number.isFinite(data?.ml)) {
        const value = Number(data.ml);
        return `${value % 1 === 0 ? value : value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ml`;
      }
      if (data?.volumen) {
        return sanitizeSnippet(data.volumen);
      }
    }

    return '';
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

  function buildDetailList(data, type) {
    if (type === 'vape') {
      return [
        { label: 'Cantidad de pitadas', value: formatPuffCount(data?.pitadas) },
        { label: 'Modos disponibles', value: formatModeCount(data?.modos) }
      ];
    }

    return [
      { label: 'Mililitros', value: formatMilliliters(data) },
      { label: 'Notas principales', value: sanitizeSnippet(data?.notasPrincipales) },
      { label: 'Familia olfativa', value: sanitizeSnippet(data?.familiaOlfativa || data?.familia || '') },
      { label: 'Inspiración', value: sanitizeSnippet(data?.inspiracion) }
    ];
  }

  function formatPuffCount(value) {
    if (value == null) return '';
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      return `${numeric} pitadas`;
    }
    const text = sanitizeSnippet(value);
    if (!text) return '';
    if (/puff/i.test(text)) {
      return text.replace(/puffs?/gi, 'pitadas');
    }
    if (!/pitad/i.test(text)) {
      return `${text} pitadas`;
    }
    return text;
  }

  function formatModeCount(value) {
    if (value == null) return '';
    const numeric = Number(value);
    if (Number.isFinite(numeric)) {
      const suffix = numeric === 1 ? 'modo' : 'modos';
      return `${numeric} ${suffix}`;
    }
    const text = sanitizeSnippet(value);
    return text ? text : '';
  }

  function formatMilliliters(perfume) {
    if (perfume == null) return '';
    if (Number.isFinite(perfume?.ml)) {
      const value = Number(perfume.ml);
      return `${value % 1 === 0 ? value : value.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ml`;
    }
    if (perfume?.volumen) {
      return sanitizeSnippet(perfume.volumen);
    }
    return '';
  }

  function buildDescriptionCopy({ rawDescription, type, name, brand, pyramid, details, flavors }) {
    const segments = [];
    const baseDescription = sanitizeSnippet(rawDescription);
    const cleanedName = sanitizeSnippet(name);
    const productName = cleanedName || 'este producto';
    const productBrand = sanitizeSnippet(brand);

    if (baseDescription) {
      segments.push(baseDescription);
    }

    if (type === 'vape') {
      if (!baseDescription) {
        const brandText = productBrand ? ` de ${productBrand}` : '';
        segments.push(`Descubrí ${productName}${brandText}, un vape listo para disfrutar desde el primer momento.`);
      }

      const puffDetail = sanitizeDetailValue(getDetailValue(details, 'Cantidad de pitadas'));
      if (puffDetail) {
        segments.push(`Disfrutá de ${puffDetail} sin recargas.`);
      }

      const modesDetail = sanitizeDetailValue(getDetailValue(details, 'Modos disponibles'));
      if (modesDetail) {
        segments.push(`Personalizá cada calada con ${modesDetail}.`);
      }

    } else {
      if (!baseDescription) {
        const descriptor = type === 'decant' ? 'decant inspirado en la fragancia original' : 'fragancia';
        const brandText = productBrand ? ` de ${productBrand}` : '';
        segments.push(`Descubrí ${productName}${brandText}, ${descriptor} creada para realzar cada ocasión.`);
      }

      const mlDetail = sanitizeDetailValue(getDetailValue(details, 'Mililitros'));
      if (mlDetail) {
        segments.push(`Presentación de ${mlDetail}.`);
      }

      const mainNotes = sanitizeDetailValue(getDetailValue(details, 'Notas principales'));
      if (mainNotes) {
        segments.push(`Notas principales: ${mainNotes}.`);
      }

      const family = sanitizeDetailValue(getDetailValue(details, 'Familia olfativa'));
      if (family) {
        segments.push(`Familia olfativa: ${family}.`);
      }

      const pyramidSentence = buildPyramidSentence(pyramid);
      if (pyramidSentence) {
        segments.push(pyramidSentence);
      }

      const inspiration = sanitizeDetailValue(getDetailValue(details, 'Inspiración'));
      if (inspiration) {
        if (/inspirad[oa]/i.test(inspiration)) {
          segments.push(`${inspiration}.`);
        } else {
          segments.push(`Inspirado en ${inspiration}.`);
        }
      }
    }

    const description = segments.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
    return description || 'Estamos preparando una descripción detallada para este producto.';
  }

  function buildPyramidSentence(pyramid) {
    if (!pyramid) return '';
    const fragments = [];
    const salida = sanitizeNotes(pyramid?.salida);
    const corazon = sanitizeNotes(pyramid?.corazon);
    const fondo = sanitizeNotes(pyramid?.fondo);

    if (salida) {
      fragments.push(`notas de salida ${salida}`);
    }
    if (corazon) {
      fragments.push(`notas de corazón ${corazon}`);
    }
    if (fondo) {
      fragments.push(`notas de fondo ${fondo}`);
    }

    if (!fragments.length) {
      return '';
    }

    return `Su pirámide olfativa combina ${formatList(fragments)}.`;
  }

  function getDetailValue(details, label) {
    if (!Array.isArray(details)) return '';
    const found = details.find(detail => detail.label === label);
    return found?.value || '';
  }

  function sanitizeSnippet(value) {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim().replace(/\s+([.,;:])/g, '$1');
  }

  function sanitizeNotes(value) {
    const text = sanitizeSnippet(value);
    return text.replace(/[.;,]+$/g, '').trim();
  }

  function formatList(items) {
    if (!Array.isArray(items) || !items.length) {
      return '';
    }

    const cleaned = items
      .map(item => sanitizeSnippet(item))
      .filter(Boolean);

    if (!cleaned.length) {
      return '';
    }

    if (cleaned.length === 1) {
      return cleaned[0];
    }

    if (cleaned.length === 2) {
      return `${cleaned[0]} y ${cleaned[1]}`;
    }

    return `${cleaned.slice(0, -1).join(', ')} y ${cleaned[cleaned.length - 1]}`;
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
    const descriptionCard = document.querySelector('[data-description-card]');
    const detailsCard = document.querySelector('[data-details-card]');
    const detailsTitle = document.querySelector('[data-details-title]');
    const detailsList = document.querySelector('[data-details-list]');
    const pyramidTop = document.querySelector('[data-pyramid-top]');
    const pyramidHeart = document.querySelector('[data-pyramid-heart]');
    const pyramidBase = document.querySelector('[data-pyramid-base]');
    const pyramidCard = document.querySelector('[data-pyramid]');
    const addButton = document.querySelector('.product-detail__add');
    const galleryMain = document.querySelector('[data-main-image] img');
    const thumbnailContainer = document.querySelector('[data-thumbnails]');

    if (page) {
      page.dataset.productLoaded = 'true';
      page.dataset.productType = product.type;
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

    populateDescriptionCard(product, descriptionCard);

    if (detailsCard && detailsList) {
      if (detailsTitle) {
        if (product.type === 'vape') {
          detailsTitle.textContent = 'Detalles del vape';
        } else if (product.type === 'decant') {
          detailsTitle.textContent = 'Ficha del decant';
        } else {
          detailsTitle.textContent = 'Ficha del perfume';
        }
      }

      detailsList.innerHTML = '';
      const details = Array.isArray(product.details) ? product.details : [];
      details.forEach(detail => {
        const dt = document.createElement('dt');
        dt.textContent = detail.label;
        const dd = document.createElement('dd');
        dd.textContent = detail.value ? detail.value : 'No disponible';
        detailsList.appendChild(dt);
        detailsList.appendChild(dd);
      });

      detailsCard.hidden = !details.length;
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

    if (pyramidCard) {
      pyramidCard.hidden = product.type === 'vape';
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

  function populateDescriptionCard(product, descriptionCard) {
    if (!descriptionCard) {
      return;
    }

    const descriptionElement = descriptionCard.querySelector('[data-description-text]');
    if (!descriptionElement) {
      return;
    }

    const baseDescription = getPrimaryDescriptionText(product);
    descriptionElement.textContent = baseDescription || 'Estamos preparando una descripción detallada para este producto.';

    let extraWrapper = descriptionCard.querySelector('[data-description-extra]');
    if (!extraWrapper) {
      extraWrapper = document.createElement('div');
      extraWrapper.dataset.descriptionExtra = 'true';
      extraWrapper.className = 'product-description__extra';
      descriptionCard.appendChild(extraWrapper);
    }

    extraWrapper.innerHTML = '';

    if (product.type === 'vape') {
      const detailItems = [
        { label: 'Cantidad de pitadas', value: sanitizeDetailValue(getDetailValue(product.details, 'Cantidad de pitadas')) },
        { label: 'Modos disponibles', value: sanitizeDetailValue(getDetailValue(product.details, 'Modos disponibles')) }
      ].filter(item => item.value);

      appendDefinitionList(extraWrapper, 'Detalles del vape', detailItems);

      if (product.flavors.length) {
        appendFlavorList(extraWrapper, product.flavors);
      }
    } else {
      const detailItems = [
        { label: 'Mililitros', value: sanitizeDetailValue(getDetailValue(product.details, 'Mililitros')) },
        { label: 'Notas principales', value: sanitizeDetailValue(getDetailValue(product.details, 'Notas principales')) },
        { label: 'Familia olfativa', value: sanitizeDetailValue(getDetailValue(product.details, 'Familia olfativa')) },
        { label: 'Inspiración', value: sanitizeDetailValue(getDetailValue(product.details, 'Inspiración')) }
      ].filter(item => item.value);

      appendDefinitionList(extraWrapper, product.type === 'decant' ? 'Detalles del decant' : 'Detalles de la fragancia', detailItems);
      appendPyramidSummary(extraWrapper, product.pyramid);
    }

    if (!extraWrapper.children.length) {
      extraWrapper.remove();
    }
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

  function getPrimaryDescriptionText(product) {
    const original = sanitizeSnippet(product.originalDescription);
    if (original) {
      return original;
    }

    if (product.type === 'vape') {
      const segments = [];
      const productName = sanitizeSnippet(product.name) || 'este vape';
      const brand = sanitizeSnippet(product.brand);
      const intro = brand ? `${productName} de ${brand}` : productName;
      segments.push(`Descubrí ${intro}, un vape listo para disfrutar desde el primer momento.`);

      const puffDetail = sanitizeDetailValue(getDetailValue(product.details, 'Cantidad de pitadas'));
      if (puffDetail) {
        segments.push(`Disfrutá de ${puffDetail} sin recargas.`);
      }

      const modesDetail = sanitizeDetailValue(getDetailValue(product.details, 'Modos disponibles'));
      if (modesDetail) {
        segments.push(`Personalizá cada calada con ${modesDetail}.`);
      }

      return segments.join(' ');
    }

    const segments = [];
    const productName = sanitizeSnippet(product.name) || 'esta fragancia';
    const brand = sanitizeSnippet(product.brand);
    const descriptor = product.type === 'decant' ? 'decant inspirado en la fragancia original' : 'fragancia';
    const intro = brand ? `${productName} de ${brand}` : productName;
    segments.push(`Descubrí ${intro}, ${descriptor} creada para realzar cada ocasión.`);

    const mlDetail = sanitizeDetailValue(getDetailValue(product.details, 'Mililitros'));
    if (mlDetail) {
      segments.push(`Presentación de ${mlDetail}.`);
    }

    const notesDetail = sanitizeDetailValue(getDetailValue(product.details, 'Notas principales'));
    if (notesDetail) {
      segments.push(`Notas principales: ${notesDetail}.`);
    }

    const familyDetail = sanitizeDetailValue(getDetailValue(product.details, 'Familia olfativa'));
    if (familyDetail) {
      segments.push(`Familia olfativa: ${familyDetail}.`);
    }

    const pyramidSentence = buildPyramidSentence(product.pyramid);
    if (pyramidSentence) {
      segments.push(pyramidSentence);
    }

    const inspirationDetail = sanitizeDetailValue(getDetailValue(product.details, 'Inspiración'));
    if (inspirationDetail) {
      if (/inspirad[oa]/i.test(inspirationDetail)) {
        segments.push(`${inspirationDetail}.`);
      } else {
        segments.push(`Inspirado en ${inspirationDetail}.`);
      }
    }

    return segments.join(' ');
  }

  function appendDefinitionList(container, title, items) {
    if (!container || !Array.isArray(items) || !items.length) {
      return;
    }

    const block = document.createElement('section');
    block.className = 'product-description__info';

    if (title) {
      const heading = document.createElement('h4');
      heading.textContent = title;
      block.appendChild(heading);
    }

    const list = document.createElement('dl');
    list.className = 'product-description__dl';

    items.forEach(item => {
      const dt = document.createElement('dt');
      dt.textContent = item.label;
      const dd = document.createElement('dd');
      dd.textContent = item.value || 'No disponible';
      list.appendChild(dt);
      list.appendChild(dd);
    });

    block.appendChild(list);
    container.appendChild(block);
  }

  function appendFlavorList(container, flavors) {
    const validFlavors = Array.isArray(flavors) ? flavors.filter(Boolean) : [];
    if (!container || !validFlavors.length) {
      return;
    }

    const block = document.createElement('section');
    block.className = 'product-description__flavors-inline';

    const heading = document.createElement('h4');
    heading.textContent = 'Sabores destacados';
    block.appendChild(heading);

    const list = document.createElement('ul');
    validFlavors.slice(0, 8).forEach(flavor => {
      const item = document.createElement('li');
      item.textContent = sanitizeSnippet(flavor) || flavor;
      list.appendChild(item);
    });

    block.appendChild(list);
    container.appendChild(block);
  }

  function sanitizeDetailValue(value) {
    const cleaned = sanitizeSnippet(value);
    if (!cleaned) {
      return '';
    }
    if (cleaned.toLowerCase() === 'no disponible') {
      return '';
    }
    return cleaned;
  }

  function appendPyramidSummary(container, pyramid) {
    if (!container || !pyramid) {
      return;
    }

    const notes = [
      { label: 'Notas de salida', value: sanitizeDetailValue(pyramid.salida) },
      { label: 'Notas de corazón', value: sanitizeDetailValue(pyramid.corazon) },
      { label: 'Notas de fondo', value: sanitizeDetailValue(pyramid.fondo) }
    ].filter(item => item.value);

    if (!notes.length) {
      return;
    }

    const block = document.createElement('section');
    block.className = 'product-description__pyramid-summary';

    const heading = document.createElement('h4');
    heading.textContent = 'Pirámide olfativa';
    block.appendChild(heading);

    const list = document.createElement('ul');
    notes.forEach(note => {
      const item = document.createElement('li');
      item.innerHTML = `<strong>${note.label}:</strong> ${note.value}`;
      list.appendChild(item);
    });

    block.appendChild(list);
    container.appendChild(block);
  }

  function isSameBrand(brandA, brandB) {
    if (!brandA || !brandB) {
      return false;
    }
    return brandA.trim().toLowerCase() === brandB.trim().toLowerCase();
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

    const sameBrandCandidates = candidates.filter(item => isSameBrand(product.brand, item.brand));
    if (!sameBrandCandidates.length) {
      return [];
    }

    return sameBrandCandidates
      .map(candidate => ({ candidate, score: computeSimilarityScore(product, candidate) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 4)
      .map(item => item.candidate);
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
      const puffSubtitle = formatPuffCount(product.pitadas);
      subtitle.textContent = puffSubtitle;
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
      const metaContent =
        sanitizeSnippet(product.originalDescription) ||
        sanitizeSnippet(product.description) ||
        sanitizeSnippet(getPrimaryDescriptionText(product)) ||
        `Descubrí ${product.name} de ${product.brand} en Vesper.`;
      descriptionMeta.setAttribute('content', metaContent);
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
