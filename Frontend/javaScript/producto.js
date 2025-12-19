(function () {
  "use strict";

  const SELECTED_PRODUCT_STORAGE_KEY = "vesper:selected-product";
  const API_BASE_URL = "/api";
  const PUBLIC_PATH = `${API_BASE_URL}/public`;
  const FREE_SHIPPING_THRESHOLD = 50000;
  const MAX_QUANTITY = 10;
  const utils = window.VesperProductUtils || {};
  const FALLBACK_IMAGE_URL = utils.FALLBACK_IMAGE_URL || "img/logo_vesper.jpg";
  const formatPrice = typeof utils.formatPrice === "function"
    ? utils.formatPrice
    : (value) => new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(value) || 0);
  const calculateTransferPrice = typeof utils.calculateTransferPrice === "function"
    ? utils.calculateTransferPrice
    : (value) => {
      if (!Number.isFinite(value)) return value;
      const discounted = value * 0.85;
      return Math.round(discounted * 100) / 100;
    };
  const toAbsoluteUrl = typeof utils.toAbsoluteUrl === "function"
    ? utils.toAbsoluteUrl
    : (url) => {
      if (typeof url !== "string" || !url.trim()) return FALLBACK_IMAGE_URL;
      const normalized = url.trim();
      if (/^https?:/i.test(normalized)) return normalized;
      return normalized.startsWith("/") ? normalized.slice(1) : normalized;
    };
  const buildProductDetailPayload = typeof utils.buildProductDetailPayload === "function"
    ? utils.buildProductDetailPayload
    : null;

  document.addEventListener("DOMContentLoaded", () => {
    const elements = collectElements();
    const storedProduct = getStoredProduct();
    const params = new URLSearchParams(window.location.search);
    const typeHint = params.get("type") || storedProduct?.type || storedProduct?.raw?.tipoProducto || "";
    const idParam = params.get("id") || storedProduct?.id || storedProduct?.raw?.id || "";
    const keyParam = params.get("key") || storedProduct?.key || "";

    loadProductDetail({ typeHint, idParam, keyParam, storedProduct, elements })
      .catch((error) => {
        console.error("No se pudo cargar el detalle del producto", error);
        renderErrorState(elements);
      });
  });

  function collectElements() {
    return {
      galleryMain: document.getElementById("product-main-image"),
      galleryThumbnails: document.getElementById("product-thumbnails"),
      brand: document.getElementById("product-brand"),
      typeBadge: document.getElementById("product-type-badge"),
      discountBadge: document.getElementById("product-discount-badge"),
      name: document.getElementById("product-name"),
      subtitle: document.getElementById("product-subtitle"),
      price: document.getElementById("product-price"),
      originalPrice: document.getElementById("product-original-price"),
      transferPrice: document.getElementById("product-transfer-price"),
      stock: document.getElementById("product-stock"),
      summary: document.getElementById("product-summary"),
      inspiration: document.getElementById("product-inspiration"),
      quantityInput: document.getElementById("product-quantity"),
      quantityDecrease: document.querySelector("[data-qty-action='decrease']"),
      quantityIncrease: document.querySelector("[data-qty-action='increase']"),
      addToCart: document.getElementById("product-add-to-cart"),
      highlights: document.getElementById("product-highlights"),
      description: document.getElementById("product-description"),
      featureConcentration: document.getElementById("feature-concentration"),
      featureDuration: document.getElementById("feature-duration"),
      featureProjection: document.getElementById("feature-projection"),
      featureSeason: document.getElementById("feature-season"),
      featureOccasion: document.getElementById("feature-occasion"),
      pyramidTop: document.getElementById("pyramid-top"),
      pyramidHeart: document.getElementById("pyramid-heart"),
      pyramidBase: document.getElementById("pyramid-base"),
      shippingForm: document.getElementById("product-shipping-form"),
      shippingZip: document.getElementById("product-shipping-zip"),
      shippingResult: document.getElementById("product-shipping-result"),
      relatedGrid: document.getElementById("related-products-grid"),
      breadcrumbCategory: document.getElementById("breadcrumb-category"),
      breadcrumbProduct: document.getElementById("breadcrumb-product")
    };
  }

  function getStoredProduct() {
    try {
      const raw = sessionStorage.getItem(SELECTED_PRODUCT_STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.warn("No se pudo leer el producto almacenado", error);
      return null;
    }
  }

  function saveStoredProduct(payload) {
    if (!payload) return;
    try {
      sessionStorage.setItem(SELECTED_PRODUCT_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn("No se pudo guardar el producto seleccionado", error);
    }
  }

  async function loadProductDetail({ typeHint, idParam, keyParam, storedProduct, elements }) {
    const normalizedType = normalizeType(typeHint, storedProduct?.decant || storedProduct?.raw?.decant);
    let fetched = null;

    if (idParam) {
      fetched = await fetchProductById(normalizedType, idParam).catch(() => null);
    }

    if (!fetched && storedProduct?.raw) {
      fetched = storedProduct.raw;
    }

    if (!fetched && storedProduct) {
      fetched = storedProduct;
    }

    if (!fetched) {
      renderErrorState(elements);
      return;
    }

    const detail = normalizeDetail({
      raw: fetched,
      stored: storedProduct,
      typeHint: normalizedType,
      idHint: idParam,
      keyHint: keyParam
    });

    if (!detail) {
      renderErrorState(elements);
      return;
    }

    renderDetail(elements, detail);
    setupQuantityControls(elements, detail);
    setupShippingForm(elements, detail);
    await renderRelatedProducts(elements.relatedGrid, detail);

    const payload = buildPersistentPayload(detail);
    if (payload) {
      saveStoredProduct(payload);
    }
  }

  function normalizeType(value, isDecant) {
    const safe = (value || "").toString().toLowerCase();
    if (safe.includes("decant") || isDecant) return "decant";
    if (safe.includes("perf")) return "perfume";
    return safe || (isDecant ? "decant" : "perfume");
  }

  async function fetchProductById(type, id) {
    if (!id) return null;
    const client = window.apiClient;
    try {
      if (client?.fetchPerfume) {
        return await client.fetchPerfume(id);
      }
      return await fetchJson(`${PUBLIC_PATH}/perfumes/${id}`);
    } catch (error) {
      console.warn("Error al obtener el producto", error);
      return null;
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Error ${response.status} al consultar ${url}`);
    }
    return response.json();
  }

  function extractImages(source) {
    if (!source) return [];
    const images = [];
    const appendImage = (value) => {
      if (!value) return;
      if (typeof value === "string" && value.trim()) {
        images.push(toAbsoluteUrl(value.trim()));
        return;
      }
      if (typeof value === "object") {
        const candidates = [value.url, value.imageUrl, value.imagenUrl, value.secureUrl, value.secure_url, value.link];
        const picked = candidates.find((candidate) => typeof candidate === "string" && candidate.trim());
        if (picked) {
          images.push(toAbsoluteUrl(picked.trim()));
        }
      }
    };

    if (Array.isArray(source)) {
      source.forEach(appendImage);
    } else {
      appendImage(source);
    }

    return images.length ? images : [FALLBACK_IMAGE_URL];
  }

  function tokenize(value) {
    if (!value) return [];
    return value
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[^a-z\s]/g, " ")
      .split(/\s+/)
      .filter(token => token.length >= 3);
  }

  function normalizeDetail({ raw, stored, typeHint, idHint, keyHint }) {
    if (!raw && !stored) return null;
    const base = raw || stored;
    const type = normalizeType(typeHint || base?.tipoProducto || base?.type, raw?.decant ?? stored?.decant);
    const brand = (base?.marca || stored?.brand || "").trim();
    const name = (base?.nombre || stored?.name || "").trim();
    const id = String(base?.id ?? stored?.id ?? idHint ?? keyHint ?? name).trim();
    const key = stored?.key || `${type}-${id}`;
    const images = extractImages(base?.imagenes ?? base?.imagenesUrl ?? stored?.imagenes ?? stored?.raw?.imagenes);
    const priceValue = Number.parseFloat(base?.precio ?? stored?.price ?? 0) || 0;
    const originalCandidate = Number.parseFloat(base?.precioAnterior ?? stored?.originalPrice ?? priceValue);
    const originalPrice = Number.isFinite(originalCandidate) && originalCandidate > priceValue ? originalCandidate : priceValue;
    const transferCandidate = Number.parseFloat(base?.precioTransferencia ?? stored?.discountPrice ?? 0);
    const transferPrice = Number.isFinite(transferCandidate) && transferCandidate > 0
      ? transferCandidate
      : calculateTransferPrice(priceValue);
    const discountPercent = originalPrice > priceValue
      ? Math.round(((originalPrice - priceValue) / originalPrice) * 100)
      : 0;
    const genero = (base?.genero || stored?.genero || "").toString();
    const ml = Number.isFinite(base?.ml) ? base.ml : Number.isFinite(stored?.ml) ? stored.ml : null;
    const pitadas = Number.isFinite(base?.pitadas) ? base.pitadas : Number.isFinite(stored?.pitadas) ? stored.pitadas : null;
    const notasPrincipales = base?.notasPrincipales || stored?.notasPrincipales || "";
    const salida = base?.salida || stored?.salida || "";
    const corazon = base?.corazon || stored?.corazon || "";
    const fondo = base?.fondo || stored?.fondo || "";
    const fragancia = base?.fragancia || stored?.fragancia || "";
    const inspiracion = base?.inspiracion || stored?.inspiracion || "";
    const descripcion = (base?.descripcion || stored?.description || "").trim();
    const stock = Number.isFinite(base?.stock) ? base.stock : Number.isFinite(stored?.stock) ? stored.stock : null;
    const sabores = Array.isArray(base?.sabores) ? base.sabores.map((s) => s?.nombre || s?.name || "").filter(Boolean) : [];

    const subtitleParts = [];
    if (ml) subtitleParts.push(`${ml} ml`);
    if (pitadas) subtitleParts.push(`${pitadas} puffs`);
    if (genero) subtitleParts.push(capitalize(genero.toLowerCase()));
    const subtitle = subtitleParts.join(" • ");

    const summary = buildSummary(descripcion || notasPrincipales || fragancia || "");
    const noteTokens = new Set([
      ...tokenize(notasPrincipales),
      ...tokenize(salida),
      ...tokenize(corazon),
      ...tokenize(fondo),
      ...tokenize(fragancia)
    ]);

    const features = buildFeatures({
      type,
      ml,
      pitadas,
      base,
      stored,
      genero,
      sabores
    });

    const highlights = buildHighlights({
      type,
      genero,
      ml,
      pitadas,
      notasPrincipales,
      transferPrice,
      price: priceValue,
      sabores
    });

    return {
      id,
      key,
      type,
      typeLabel: formatTypeLabel(type),
      brand,
      name,
      images,
      mainImage: images[0] || FALLBACK_IMAGE_URL,
      price: priceValue,
      originalPrice,
      transferPrice,
      discountPercent,
      genero,
      ml,
      pitadas,
      notasPrincipales,
      salida,
      corazon,
      fondo,
      fragancia,
      inspiracion,
      descripcion,
      summary,
      subtitle,
      features,
      highlights,
      stock,
      sabores,
      noteTokens,
      raw: base
    };
  }

  function formatTypeLabel(type) {
    switch ((type || "").toLowerCase()) {
      case "decant":
        return "Decant";
      case "perfume":
      default:
        return "Perfume";
    }
  }

  function capitalize(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function buildSummary(text) {
    if (!text) return "";
    const clean = text.replace(/\s+/g, " ").trim();
    if (clean.length <= 160) return clean;
    const sentenceEnd = clean.indexOf(".", 140);
    if (sentenceEnd > -1) {
      return clean.slice(0, sentenceEnd + 1);
    }
    return `${clean.slice(0, 180)}…`;
  }

  function buildFeatures({ ml, base, stored, genero }) {
    const volume = base?.volumen || stored?.volumen || (ml ? `${ml} ml` : "No especificado");
    const duration = base?.duracion || stored?.duracion || "No especificado";
    const projection = base?.proyeccion || stored?.proyeccion || "No especificado";
    const season = base?.temporada || stored?.temporada || "No especificado";
    const occasion = base?.ocasion || stored?.ocasion || (genero ? `Ideal para publico ${capitalize(genero.toLowerCase())}` : "No especificado");

    return {
      concentration: volume || "No especificado",
      duration: duration || "No especificado",
      projection: projection || "No especificado",
      season,
      occasion
    };
  }

  function buildHighlights({ genero, ml, notasPrincipales, transferPrice, price }) {
    const highlights = [];
    if (genero) highlights.push(`Pensado para publico ${capitalize(genero.toLowerCase())}`);
    if (ml) highlights.push(`${ml} ml disponibles`);
    if (notasPrincipales) highlights.push(`Notas principales: ${notasPrincipales}`);
    if (transferPrice && transferPrice < price) highlights.push(`15% OFF pagando por transferencia`);
    if (!highlights.length) {
      highlights.push("Garantia de originalidad Vesper");
      highlights.push("Envios a todo el pais");
    }
    return highlights;
  }

  function renderDetail(elements, detail) {
    if (!elements || !detail) return;
    document.title = `${detail.name} - ${detail.brand || "Vesper"}`;
    updateBreadcrumb(elements, detail);
    renderGallery(elements, detail);
    renderInfo(elements, detail);
    renderDescription(elements, detail);
    renderPyramid(elements, detail);
    renderHighlights(elements, detail.highlights);
  }

  function updateBreadcrumb(elements, detail) {
    if (!elements?.breadcrumbCategory || !elements?.breadcrumbProduct) return;
    const categoryLabel = detail.type === "decant"
      ? "Decants"
      : "Perfumes";
    elements.breadcrumbCategory.textContent = categoryLabel;
    elements.breadcrumbProduct.textContent = detail.name;
  }

  function renderGallery(elements, detail) {
    if (!elements.galleryMain) return;
    const mainImage = detail.mainImage || FALLBACK_IMAGE_URL;
    elements.galleryMain.src = mainImage;
    elements.galleryMain.alt = `${detail.name} de ${detail.brand}`.trim();

    if (!elements.galleryThumbnails) return;
    elements.galleryThumbnails.innerHTML = "";

    const uniqueImages = Array.from(new Set(detail.images));
    uniqueImages.forEach((src, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "product-gallery__thumbnail";
      button.setAttribute("aria-label", `Ver imagen ${index + 1}`);
      if (index === 0) {
        button.classList.add("is-active");
      }
      const img = document.createElement("img");
      img.src = src;
      img.alt = `${detail.name} vista ${index + 1}`;
      button.appendChild(img);
      button.addEventListener("click", () => {
        elements.galleryMain.src = src;
        elements.galleryMain.alt = `${detail.name} - vista ${index + 1}`;
        Array.from(elements.galleryThumbnails.children).forEach(child => child.classList.remove("is-active"));
        button.classList.add("is-active");
        updateAddToCartImage(elements, src);
      });
      elements.galleryThumbnails.appendChild(button);
    });

    if (!uniqueImages.length) {
      const placeholder = document.createElement("span");
      placeholder.textContent = "No hay imágenes adicionales disponibles";
      elements.galleryThumbnails.appendChild(placeholder);
    }
  }

  function updateAddToCartImage(elements, imageUrl) {
    if (!elements?.addToCart) return;
    elements.addToCart.dataset.productImage = imageUrl;
  }

  function renderInfo(elements, detail) {
    if (!elements) return;
    if (elements.brand) elements.brand.textContent = detail.brand || "";
    if (elements.typeBadge) elements.typeBadge.textContent = detail.typeLabel || "";

    if (elements.discountBadge) {
      if (detail.discountPercent > 0) {
        elements.discountBadge.textContent = `${detail.discountPercent}% OFF`;
        elements.discountBadge.hidden = false;
      } else {
        elements.discountBadge.hidden = true;
      }
    }

    if (elements.name) elements.name.textContent = detail.name || "Producto";
    if (elements.subtitle) elements.subtitle.textContent = detail.subtitle || detail.fragancia || "";
    if (elements.price) elements.price.textContent = formatPrice(detail.price);

    if (elements.originalPrice) {
      if (detail.originalPrice > detail.price) {
        elements.originalPrice.textContent = formatPrice(detail.originalPrice);
        elements.originalPrice.hidden = false;
      } else {
        elements.originalPrice.hidden = true;
      }
    }

    if (elements.transferPrice) {
      elements.transferPrice.textContent = detail.transferPrice && detail.transferPrice < detail.price
        ? `Transferencia o efectivo: ${formatPrice(detail.transferPrice)}`
        : "";
    }

    if (elements.stock) {
      if (Number.isFinite(detail.stock)) {
        if (detail.stock <= 0) {
          elements.stock.textContent = "Sin stock disponible";
          elements.stock.classList.add("is-warning");
        } else if (detail.stock < 5) {
          elements.stock.textContent = `¡Últimas ${detail.stock} unidades!`;
          elements.stock.classList.add("is-warning");
        } else {
          elements.stock.textContent = `Stock disponible (${detail.stock} unidades)`;
          elements.stock.classList.remove("is-warning");
        }
      } else {
        elements.stock.textContent = "Stock disponible";
      }
    }

    if (elements.summary) elements.summary.textContent = detail.summary || detail.notasPrincipales || "";
    if (elements.inspiration) {
      if (detail.inspiracion) {
        elements.inspiration.textContent = `Inspirado en: ${detail.inspiracion}`;
        elements.inspiration.hidden = false;
      } else {
        elements.inspiration.hidden = true;
      }
    }

    setupAddToCartButton(elements, detail);
  }

  function setupAddToCartButton(elements, detail) {
    const button = elements.addToCart;
    if (!button) return;
    const quantity = clampQuantity(Number.parseInt(elements.quantityInput?.value || "1", 10));
    button.dataset.productId = detail.key;
    button.dataset.productName = detail.name;
    button.dataset.productPrice = String(detail.price);
    button.dataset.productOriginalPrice = String(detail.originalPrice);
    button.dataset.productType = detail.type;
    button.dataset.productSubtitle = detail.subtitle || detail.fragancia || "";
    button.dataset.productImage = detail.mainImage || FALLBACK_IMAGE_URL;
    button.dataset.productQuantity = String(quantity);
    button.dataset.productDetailId = String(detail.id);
    button.dataset.productDetailType = detail.type;
    button.disabled = Number.isFinite(detail.stock) ? detail.stock <= 0 : false;
    updateAddToCartLabel(button, detail.price, quantity);

    const payload = buildPersistentPayload(detail);
    if (payload && button) {
      button.dataset.productDetail = JSON.stringify(payload);
    }
  }

  function updateAddToCartLabel(button, price, quantity) {
    if (!button) return;
    const total = price * quantity;
    button.textContent = `Agregar al carrito – ${formatPrice(total)}`;
  }

  function renderDescription(elements, detail) {
    if (elements.description) {
      elements.description.textContent = detail.descripcion || detail.summary || "Descripción no disponible.";
    }

    if (elements.featureConcentration) elements.featureConcentration.textContent = detail.features.concentration || "No especificado";
    if (elements.featureDuration) elements.featureDuration.textContent = detail.features.duration || "No especificado";
    if (elements.featureProjection) elements.featureProjection.textContent = detail.features.projection || "No especificado";
    if (elements.featureSeason) elements.featureSeason.textContent = detail.features.season || "No especificado";
    if (elements.featureOccasion) elements.featureOccasion.textContent = detail.features.occasion || "No especificado";
  }

  function renderPyramid(elements, detail) {
    if (elements.pyramidTop) elements.pyramidTop.textContent = detail.salida || "No disponible";
    if (elements.pyramidHeart) elements.pyramidHeart.textContent = detail.corazon || "No disponible";
    if (elements.pyramidBase) elements.pyramidBase.textContent = detail.fondo || "No disponible";
  }

  function renderHighlights(elements, highlights) {
    if (!elements.highlights) return;
    elements.highlights.innerHTML = "";
    highlights.forEach((highlight) => {
      const item = document.createElement("li");
      item.textContent = highlight;
      elements.highlights.appendChild(item);
    });
  }

  function setupQuantityControls(elements, detail) {
    if (!elements.quantityInput || !elements.addToCart) return;
    const input = elements.quantityInput;
    const button = elements.addToCart;

    const syncQuantity = (value) => {
      const quantity = clampQuantity(value);
      input.value = String(quantity);
      button.dataset.productQuantity = String(quantity);
      updateAddToCartLabel(button, detail.price, quantity);
    };

    elements.quantityDecrease?.addEventListener("click", () => {
      const current = Number.parseInt(input.value || "1", 10) - 1;
      syncQuantity(current);
    });

    elements.quantityIncrease?.addEventListener("click", () => {
      const current = Number.parseInt(input.value || "1", 10) + 1;
      syncQuantity(current);
    });

    input.addEventListener("input", () => {
      syncQuantity(Number.parseInt(input.value || "1", 10));
    });

    input.addEventListener("blur", () => {
      syncQuantity(Number.parseInt(input.value || "1", 10));
    });

    syncQuantity(Number.parseInt(input.value || "1", 10));
  }

  function clampQuantity(value) {
    if (!Number.isFinite(value)) return 1;
    if (value < 1) return 1;
    if (value > MAX_QUANTITY) return MAX_QUANTITY;
    return value;
  }

  function setupShippingForm(elements, detail) {
    if (!elements.shippingForm || !elements.shippingZip) return;
    elements.shippingForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const rawValue = elements.shippingZip.value.trim();
      const digits = rawValue.replace(/\D/g, "");
      if (digits.length < 4 || digits.length > 5) {
        renderShippingResult(elements.shippingResult, "Ingresá un código postal válido.", false);
        return;
      }
      const quantity = clampQuantity(Number.parseInt(elements.quantityInput?.value || "1", 10));
      const total = detail.price * quantity;
      const baseCost = calculateShippingBase(digits);
      if (total >= FREE_SHIPPING_THRESHOLD) {
        renderShippingResult(elements.shippingResult, `¡Envío gratis a CP ${digits}!`, true);
      } else {
        renderShippingResult(
          elements.shippingResult,
          `Envío estimado a CP ${digits}: ${formatPrice(baseCost)}.`,
          false
        );
      }
    });
  }

  function calculateShippingBase(zipDigits) {
    const firstDigit = parseInt(zipDigits[0] ?? "0", 10);
    if (Number.isNaN(firstDigit)) return 3200;
    if (firstDigit >= 7) return 3600;
    if (firstDigit >= 4) return 3300;
    return 2900;
  }

  function renderShippingResult(target, message, isPositive) {
    if (!target) return;
    target.textContent = message;
    target.style.color = isPositive ? "#0f9d58" : "#004aad";
  }

  function renderErrorState(elements) {
    if (elements.name) elements.name.textContent = "Producto no disponible";
    if (elements.summary) elements.summary.textContent = "No pudimos encontrar la información de este producto.";
    if (elements.description) elements.description.textContent = "Intentá regresar al catálogo para elegir otra opción.";
    if (elements.addToCart) {
      elements.addToCart.disabled = true;
      elements.addToCart.textContent = "Producto no disponible";
    }
  }

  function buildPersistentPayload(detail) {
    if (!detail) return null;
    if (buildProductDetailPayload) {
      const payloadSource = {
        key: detail.key,
        productId: detail.id,
        type: detail.type,
        name: detail.name,
        brand: detail.brand,
        price: detail.price,
        originalPrice: detail.originalPrice,
        discountPrice: detail.transferPrice,
        description: detail.descripcion,
        genero: detail.genero,
        notasPrincipales: detail.notasPrincipales,
        raw: detail.raw
      };
      return buildProductDetailPayload(payloadSource);
    }

    return {
      id: detail.id,
      key: detail.key,
      type: detail.type,
      name: detail.name,
      brand: detail.brand,
      price: detail.price,
      originalPrice: detail.originalPrice,
      discountPrice: detail.transferPrice,
      genero: detail.genero,
      notasPrincipales: detail.notasPrincipales,
      salida: detail.salida,
      corazon: detail.corazon,
      fondo: detail.fondo,
      fragancia: detail.fragancia,
      inspiracion: detail.inspiracion,
      ml: detail.ml,
      pitadas: detail.pitadas,
      stock: detail.stock,
      imagenes: detail.images,
      raw: detail.raw
    };
  }

  /* ==========================
     Productos relacionados
  ========================== */

  const catalogState = {
    promise: null,
    data: null
  };

  async function fetchCatalog() {
    if (catalogState.data) {
      return catalogState.data;
    }
    if (catalogState.promise) {
      return catalogState.promise;
    }
    const load = async () => {
      try {
        const client = window.apiClient;
        const perfumesPromise = client?.fetchPerfumes ? client.fetchPerfumes() : fetchJson(`${PUBLIC_PATH}/perfumes`);
        const perfumes = await perfumesPromise;
        catalogState.data = {
          perfumes: Array.isArray(perfumes) ? perfumes : []
        };
        return catalogState.data;
      } finally {
        catalogState.promise = null;
      }
    };
    catalogState.promise = load();
    return catalogState.promise;
  }

  function normalizePerfume(perfume) {
    if (!perfume) return null;
    const type = perfume?.decant ? "decant" : "perfume";
    const images = extractImages(perfume?.imagenes);
    const price = Number.parseFloat(perfume?.precio) || 0;
    const ml = Number.isFinite(perfume?.ml) ? perfume.ml : null;
    const genero = (perfume?.genero || "").toString();
    const subtitleParts = [];
    if (ml) subtitleParts.push(`${ml} ml`);
    if (genero) subtitleParts.push(capitalize(genero.toLowerCase()));
    const subtitle = subtitleParts.join(" • ");
    const noteTokens = new Set([
      ...tokenize(perfume?.notasPrincipales),
      ...tokenize(perfume?.salida),
      ...tokenize(perfume?.corazon),
      ...tokenize(perfume?.fondo),
      ...tokenize(perfume?.fragancia)
    ]);

    return {
      key: `${type}-${perfume?.id ?? window.crypto?.randomUUID?.() ?? Date.now()}`,
      productId: perfume?.id ?? null,
      type,
      name: perfume?.nombre ?? "",
      brand: perfume?.marca ?? "",
      price,
      originalPrice: price,
      discountPrice: calculateTransferPrice(price),
      image: images[0] || FALLBACK_IMAGE_URL,
      genero,
      ml,
      notasPrincipales: perfume?.notasPrincipales ?? "",
      subtitle,
      raw: perfume,
      tokens: noteTokens
    };
  }

  function computeSimilarity(detail, candidate) {
    if (!detail || !candidate) return 0;
    let score = 0;
    if (detail.brand && candidate.brand && detail.brand.toLowerCase() === candidate.brand.toLowerCase()) {
      score += 3;
    }
    if (candidate.tokens) {
      const intersection = intersectCount(detail.noteTokens, candidate.tokens);
      score += intersection * 1.5;
      if (detail.type === "decant" && candidate.type === "decant") {
        score += 1;
      }
    }
    score += Math.max(0, 1 - Math.abs(detail.price - candidate.price) / 20000);
    return score;
  }

  function intersectCount(setA, setB) {
    if (!setA || !setB) return 0;
    let count = 0;
    setA.forEach((value) => {
      if (setB.has(value)) count += 1;
    });
    return count;
  }

  async function renderRelatedProducts(container, detail) {
    if (!container || !detail) return;
    container.innerHTML = "";
    container.setAttribute("aria-busy", "true");

    try {
      const catalog = await fetchCatalog();
      const poolRaw = catalog.perfumes;
      const normalized = poolRaw
        .map(normalizePerfume)
        .filter(Boolean)
        .filter(item => String(item.productId ?? item.key) !== String(detail.id));

      const scored = normalized
        .map(item => ({ item, score: computeSimilarity(detail, item) }))
        .sort((a, b) => b.score - a.score || (b.item.price - a.item.price));

      const top = (scored.length ? scored : normalized.map(item => ({ item, score: 0 }))).slice(0, 4);

      if (!top.length) {
        const empty = document.createElement("p");
        empty.textContent = "No encontramos productos relacionados en este momento.";
        container.appendChild(empty);
        return;
      }

      top.forEach(({ item }) => {
        const card = buildRelatedCard(item);
        container.appendChild(card);
      });
    } catch (error) {
      console.warn("No se pudieron cargar los relacionados", error);
      const fallback = document.createElement("p");
      fallback.textContent = "No pudimos cargar productos relacionados.";
      container.appendChild(fallback);
    } finally {
      container.setAttribute("aria-busy", "false");
    }
  }

  function buildRelatedCard(product) {
    const card = document.createElement("article");
    card.className = "product-card";
    card.dataset.productId = product.key;
    card.dataset.productName = product.name || "";
    card.dataset.productPrice = String(product.price || 0);
    card.dataset.productOriginalPrice = String(product.originalPrice || product.price || 0);
    card.dataset.productType = product.type || "producto";
    card.dataset.productImage = product.image || FALLBACK_IMAGE_URL;
    card.dataset.productDetailType = product.type || "producto";
    if (product.productId != null) {
      card.dataset.productDetailId = String(product.productId);
    }
    if (product.subtitle) {
      card.dataset.productSubtitle = product.subtitle;
    }

    const payloadSource = {
      key: product.key,
      productId: product.productId,
      type: product.type,
      name: product.name,
      brand: product.brand,
      price: product.price,
      originalPrice: product.originalPrice,
      discountPrice: product.discountPrice,
      description: product.raw?.descripcion,
      genero: product.raw?.genero,
      notasPrincipales: product.raw?.notasPrincipales,
      raw: product.raw
    };
    const payload = buildProductDetailPayload ? buildProductDetailPayload(payloadSource) : payloadSource;
    try {
      card.dataset.productDetail = JSON.stringify(payload);
    } catch (error) {
      console.warn("No se pudo serializar el detalle relacionado", error);
    }

    const figure = document.createElement("figure");
    figure.className = "product-card__figure";
    const image = document.createElement("img");
    image.src = product.image || FALLBACK_IMAGE_URL;
    image.alt = `${product.name} ${product.brand ? `de ${product.brand}` : ""}`.trim();
    figure.appendChild(image);
    card.appendChild(figure);

    if (product.type === "decant") {
      const badge = document.createElement("span");
      badge.className = "product-card__badge";
      badge.textContent = "Decant";
      card.appendChild(badge);
    }

    const body = document.createElement("div");
    body.className = "product-card__body";
    if (product.brand) {
      const brand = document.createElement("p");
      brand.className = "product-card__brand";
      brand.textContent = product.brand;
      body.appendChild(brand);
    }
    const title = document.createElement("h3");
    title.className = "product-card__title";
    title.textContent = product.name || "Producto";
    body.appendChild(title);
    if (product.subtitle) {
      const subtitle = document.createElement("p");
      subtitle.className = "product-card__subtitle";
      subtitle.textContent = product.subtitle;
      body.appendChild(subtitle);
    }

    const prices = document.createElement("div");
    prices.className = "product-card__prices";
    const priceElement = document.createElement("span");
    priceElement.className = "product-card__price";
    priceElement.textContent = formatPrice(product.price || 0);
    prices.appendChild(priceElement);
    body.appendChild(prices);

    const actions = document.createElement("div");
    actions.className = "product-card__actions";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn--primary";
    button.dataset.action = "add-to-cart";
    button.dataset.productId = product.key;
    button.dataset.productName = product.name || "";
    button.dataset.productPrice = String(product.price || 0);
    button.dataset.productOriginalPrice = String(product.originalPrice || product.price || 0);
    button.dataset.productType = product.type || "producto";
    button.dataset.productSubtitle = product.subtitle || "";
    button.dataset.productImage = product.image || FALLBACK_IMAGE_URL;
    button.dataset.productQuantity = "1";
    button.textContent = "Agregar al carrito";
    actions.appendChild(button);
    body.appendChild(actions);
    card.appendChild(body);

    return card;
  }

})();
