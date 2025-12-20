(function () {
  const API_BASE_URL = window.__VESPER_API_BASE__ || '';
  const USER_ID_STORAGE_KEY = 'vesper.usuarioId';
  const USER_READY_EVENT = 'vesper:user-ready';
  function getUserId() {
    return window.localStorage.getItem(USER_ID_STORAGE_KEY);
  }

  const state = {
    metodoEntrega: null,
    domicilios: [],
    domicilioSeleccionado: null,
    metodoPago: null,
    shippingCost: 0,
    userId: null,
    isAuthenticated: false,
    addressError: '',
  };

  const CART_STORAGE_KEY = 'vesper.cart.v1';

  const cartService = {
    getCartItems: function () {
      try {
        const storedCart = window.localStorage.getItem(CART_STORAGE_KEY);
        const cartObject = storedCart ? JSON.parse(storedCart) : null;
        return cartObject && cartObject.items ? cartObject.items : [];
      } catch (error) {
        console.error('Error al obtener los items del carrito:', error);
        return [];
      }
    },
  };

  const cartState = {
    items: cartService.getCartItems(),
    defaultShipping: 3200,
    transferDiscountRate: 0.25,
  };

  const selectors = {
    steps: document.querySelectorAll('.step'),
    progressSteps: document.querySelectorAll('[data-progress-step]'),
    deliveryCards: document.querySelectorAll('[data-delivery]'),
    addressList: document.querySelector('[data-address-list]'),
    addressEmptyState: document.querySelector('[data-empty-address]'),
    confirmAddressButton: document.querySelector('[data-action="confirm-address"]'),
    addressForm: document.querySelector('.address-form'),
    addressSubmitButton: document.querySelector('.address-form button[type="submit"]'),
    formFeedback: document.querySelector('.form-feedback'),
    loadingIndicator: document.querySelector('[data-loading]'),
    alerts: document.querySelector('[data-alerts]'),
    selectedDelivery: document.querySelector('[data-selected-delivery]'),
    goToPaymentButton: document.querySelector('[data-action="go-to-payment"]'),
    backToAddressButton: document.querySelector('[data-action="back-to-address"]'),
    backToSummaryButton: document.querySelector('[data-action="back-to-summary"]'),
    confirmOrderButton: document.querySelector('[data-action="confirm-order"]'),
    paymentCards: document.querySelectorAll('[data-payment]'),
    paymentFeedback: document.querySelector('.payment-feedback'),
    summaryItems: document.querySelector('[data-summary-items]'),
    summarySubtotal: document.querySelector('[data-summary-subtotal]'),
    summaryShipping: document.querySelector('[data-summary-shipping]'),
    summaryDiscount: document.querySelector('[data-summary-discount]'),
    summaryDiscountRow: document.querySelector('[data-summary-discount-row]'),
    summaryTotal: document.querySelector('[data-summary-total]'),
  };

  const STEP_PROGRESS_MAP = {
    method: 'method',
    'address-list': 'method',
    'address-form': 'method',
    'delivery-summary': 'summary',
    payment: 'payment',
  };

  const PROGRESS_INDEX = {
    method: 0,
    summary: 1,
    payment: 2,
  };

  const currencyFormatter = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  });

  function pushAlert(message, type = 'info') {
    if (!selectors.alerts) return;
    const alert = document.createElement('div');
    alert.className = `alert ${type === 'error' ? 'alert--error' : ''}`;
    const icon = document.createElement('span');
    icon.className = 'material-symbols-outlined';
    icon.textContent = type === 'error' ? 'error' : 'info';
    const text = document.createElement('span');
    text.textContent = message;
    alert.append(icon, text);
    selectors.alerts.append(alert);
    setTimeout(() => {
      alert.classList.add('hidden');
      setTimeout(() => alert.remove(), 300);
    }, 6000);
  }

  function toggleLoading(show) {
    if (!selectors.loadingIndicator) return;
    selectors.loadingIndicator.classList.toggle('hidden', !show);
  }

  function showStep(stepName) {
    selectors.steps.forEach((section) => {
      section.classList.toggle('hidden', section.dataset.step !== stepName);
    });
    updateProgress(stepName);
  }

  function updateProgress(stepName) {
    const key = STEP_PROGRESS_MAP[stepName] || 'method';
    const currentIndex = PROGRESS_INDEX[key] ?? 0;
    selectors.progressSteps.forEach((step) => {
      const stepKey = step.dataset.progressStep;
      const stepIndex = PROGRESS_INDEX[stepKey] ?? 0;
      step.classList.toggle('is-active', stepIndex <= currentIndex);
    });
  }

  function updateDeliveryCards(selectedType) {
    selectors.deliveryCards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.delivery === selectedType);
    });
  }

  function formatAddress(domicilio) {
    const piso = domicilio.piso ? ` Piso ${domicilio.piso}` : '';
    const departamento = domicilio.departamento ? ` Dpto ${domicilio.departamento}` : '';
    const torre = domicilio.torre ? ` Torre ${domicilio.torre}` : '';
    const observaciones = domicilio.observaciones ? `\nObservaciones: ${domicilio.observaciones}` : '';
    return `${domicilio.calle} ${domicilio.numero}${piso}${departamento}${torre}\n${domicilio.entreCalles}\n${domicilio.localidad}, ${domicilio.provincia} (${domicilio.codigoPostal})${observaciones}`;
  }

  function updateUserState(userId) {
    state.userId = userId ? String(userId) : null;
    state.isAuthenticated = Boolean(state.userId);
    updateAuthDependentUi();
  }

  function updateAuthDependentUi() {
    const requiresAuth = [selectors.addressSubmitButton];
    requiresAuth.forEach((element) => {
      if (!element) return;
      const shouldDisable = !state.isAuthenticated;
      if (shouldDisable) {
        element.disabled = true;
        element.setAttribute('aria-disabled', 'true');
      } else {
        element.disabled = false;
        element.removeAttribute('disabled');
        element.removeAttribute('aria-disabled');
      }
    });
  }

  function handleAuthReady(userId) {
    const effectiveUserId = userId ?? getUserId();
    if (!effectiveUserId) return;
    updateUserState(effectiveUserId);
    if (state.metodoEntrega === 'domicilio') {
      fetchDomicilios(state.domicilioSeleccionado?.id);
    }
  }

  let authClientPromise = null;

  function waitForAuthClient(timeoutMs = 10000) {
    if (window.auth0Client) return Promise.resolve(window.auth0Client);
    if (authClientPromise) return authClientPromise;
    authClientPromise = new Promise((resolve, reject) => {
      const start = Date.now();
      const checkClient = () => {
        if (window.auth0Client) {
          resolve(window.auth0Client);
          authClientPromise = null;
          return;
        }
        if (Date.now() - start >= timeoutMs) {
          reject(new Error('Auth0 no está disponible.'));
          authClientPromise = null;
          return;
        }
        setTimeout(checkClient, 100);
      };
      checkClient();
    });
    return authClientPromise;
  }

  function redirectToLogin(authClient) {
    if (authClient && typeof authClient.loginWithRedirect === 'function') {
      authClient.loginWithRedirect({
        authorizationParams: {
          redirect_uri: window.location.origin,
        },
      });
    } else {
      window.location.assign('/');
    }
  }

  async function ensureAuthenticatedSession() {
    const authClient = await waitForAuthClient().catch((error) => {
      console.error('No se pudo obtener el cliente de Auth0:', error);
      return null;
    });

    if (!authClient) {
      throw new Error('No pudimos iniciar la autenticación. Intentá nuevamente.');
    }

    let isAuthenticated = false;
    try {
      isAuthenticated = await authClient.isAuthenticated();
    } catch (error) {
      console.error('No se pudo verificar el estado de autenticación:', error);
    }

    if (!isAuthenticated) {
      redirectToLogin(authClient);
      throw new Error('Necesitás iniciar sesión para continuar.');
    }

    try {
      const token = await authClient.getTokenSilently();
      state.isAuthenticated = true;
      updateAuthDependentUi();
      return { authClient, token };
    } catch (error) {
      console.error('Error al obtener el token de acceso:', error);
      redirectToLogin(authClient);
      throw new Error('Necesitás iniciar sesión para continuar.');
    }
  }

  async function fetchDomicilios(preferSelectedId) {
    toggleLoading(true);
    try {
      const { authClient, token } = await ensureAuthenticatedSession();
      const response = await fetch(`${API_BASE_URL}/api/user/domicilios`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || response.status === 403) {
        redirectToLogin(authClient);
        state.addressError = 'No pudimos cargar los domicilios.';
        state.domicilios = [];
        state.domicilioSeleccionado = null;
        renderAddressList();
        return;
      }

      if (!response.ok) {
        throw new Error('No pudimos cargar los domicilios.');
      }

      const data = await response.json();
      data.sort((a, b) => a.id - b.id);
      const previousId = preferSelectedId ?? state.domicilioSeleccionado?.id ?? null;
      state.domicilios = data;
      state.addressError = '';
      state.domicilioSeleccionado = previousId
        ? state.domicilios.find((item) => item.id === previousId) || null
        : null;
      if (!state.domicilioSeleccionado && state.domicilios.length) {
        state.domicilioSeleccionado = state.domicilios[0];
      }
      renderAddressList();
    } catch (error) {
      console.error(error);
      state.addressError = error.message || 'No pudimos cargar los domicilios.';
      state.domicilios = [];
      state.domicilioSeleccionado = null;
      renderAddressList();
      pushAlert(error.message || 'Ocurrió un error al obtener los domicilios.', 'error');
      if (error.message && error.message.includes('Necesitás iniciar sesión')) {
        state.isAuthenticated = false;
        updateAuthDependentUi();
      }
    } finally {
      toggleLoading(false);
    }
  }

  function renderAddressList() {
    if (!selectors.addressList) return;

    const emptyState = selectors.addressEmptyState;
    selectors.addressList.innerHTML = '';

    if (state.addressError) {
      const message = document.createElement('p');
      message.className = 'address-message address-message--error';
      message.textContent = state.addressError;
      selectors.addressList.append(message);
      if (selectors.confirmAddressButton) selectors.confirmAddressButton.disabled = true;
      if (emptyState) emptyState.classList.add('hidden');
      return;
    }

    if (!state.domicilios.length) {
      const message = document.createElement('p');
      message.className = 'address-message';
      message.textContent = 'No tenés domicilios guardados todavía';
      selectors.addressList.append(message);
      if (selectors.confirmAddressButton) selectors.confirmAddressButton.disabled = true;
      if (emptyState) emptyState.classList.add('hidden');
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    state.domicilios.forEach((domicilio) => {
      const card = document.createElement('article');
      card.className = 'address-card';
      card.dataset.addressId = String(domicilio.id);
      if (state.domicilioSeleccionado?.id === domicilio.id) {
        card.classList.add('is-selected');
      }

      // ===== HEADER =====
      const header = document.createElement('div');
      header.className = 'address-card__header';

      const info = document.createElement('div');
      info.className = 'address-card__info';

      const title = document.createElement('h3');
      title.textContent = `${domicilio.nombre || ''} ${domicilio.apellido || ''}`.trim();

      const addressLine = document.createElement('p');
      addressLine.textContent = `${domicilio.calle || ''} ${domicilio.numero || ''}`.trim();

      const detailLine = document.createElement('p');
      detailLine.textContent = `${domicilio.localidad || ''}, ${domicilio.provincia || ''} (${domicilio.codigoPostal || ''})`;

      const contacts = document.createElement('p');
      contacts.textContent = `Tel: ${domicilio.telefono || '-'} · DNI: ${domicilio.dni || '-'}`;

      info.append(title, addressLine, detailLine, contacts);
      header.append(info);

      // ===== ACTIONS =====
      const actions = document.createElement('div');
      actions.className = 'address-card__actions';

      const selectBtn = document.createElement('button');
      selectBtn.type = 'button';
      selectBtn.className = 'btn btn-primary';
      selectBtn.textContent = state.domicilioSeleccionado?.id === domicilio.id
        ? 'Dirección seleccionada'
        : 'Continuar con esta dirección';
      selectBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        selectAddress(domicilio.id);
      });

      actions.append(selectBtn);
      header.append(actions);

      // ===== BODY (ahora seguro) =====
      const body = document.createElement('div');
      body.className = 'address-card__body';

      const entreCallesP = document.createElement('p');
      entreCallesP.textContent = `Entre calles: ${domicilio.entreCalles || '-'}`;
      body.appendChild(entreCallesP);

      if (domicilio.observaciones) {
        const observacionesP = document.createElement('p');
        observacionesP.textContent = `Observaciones: ${domicilio.observaciones}`;
        body.appendChild(observacionesP);
      }

      // ===== FINALIZAR CARD =====
      card.append(header, body);
      card.addEventListener('click', () => selectAddress(domicilio.id));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          selectAddress(domicilio.id);
        }
      });
      card.tabIndex = 0;

      selectors.addressList.append(card);
    });

    if (selectors.confirmAddressButton) {
      selectors.confirmAddressButton.disabled = !state.domicilioSeleccionado;
    }
  }


  function selectAddress(id) {
    const domicilio = state.domicilios.find((item) => item.id === id);
    if (!domicilio) return;
    state.domicilioSeleccionado = domicilio;
    renderAddressList();
  }

  function renderSelectedDelivery() {
    if (!selectors.selectedDelivery) return;
    selectors.selectedDelivery.innerHTML = '';

    const card = document.createElement('article');
    card.className = 'selected-delivery__card';

    const header = document.createElement('div');
    header.className = 'selected-delivery__header';
    const heading = document.createElement('h3');
    const actions = document.createElement('div');

    if (state.metodoEntrega === 'domicilio' && state.domicilioSeleccionado) {
      heading.textContent = 'Domicilio seleccionado';
      const changeBtn = document.createElement('button');
      changeBtn.type = 'button';
      changeBtn.className = 'btn btn-ghost';
      changeBtn.dataset.action = 'change-address';
      changeBtn.textContent = 'Cambiar';
      actions.append(changeBtn);

      const body = document.createElement('div');
      body.className = 'selected-delivery__body';
      body.innerHTML = formatAddress(state.domicilioSeleccionado)
        .split('\n')
        .map((line) => `<p>${line}</p>`)
        .join('');

      header.append(heading, actions);
      card.append(header, body);
    } else {
      heading.textContent = 'Retiro en punto de entrega';
      const changeBtn = document.createElement('button');
      changeBtn.type = 'button';
      changeBtn.className = 'btn btn-ghost';
      changeBtn.dataset.action = 'change-method';
      changeBtn.textContent = 'Cambiar';
      actions.append(changeBtn);

      const body = document.createElement('div');
      body.className = 'selected-delivery__body';
      body.innerHTML = '<p>Una vez confirmada la compra te mostraremos los puntos habilitados para que retires tu pedido. Te avisaremos por mail cuando esté listo.</p>';

      header.append(heading, actions);
      card.append(header, body);
    }

    selectors.selectedDelivery.append(card);
  }

  function renderSummaryItems() {
    if (!selectors.summaryItems) return;
    selectors.summaryItems.innerHTML = '';
    if (!cartState.items || cartState.items.length === 0) {
      const emptyMessage = document.createElement('p');
      emptyMessage.className = 'summary-empty-message';
      emptyMessage.textContent = 'Tu carrito está vacío.';
      selectors.summaryItems.append(emptyMessage);
      return;
    }
    cartState.items.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'summary-item';
      const info = document.createElement('div');
      info.className = 'summary-item__info';
      const title = document.createElement('span');
      title.className = 'summary-item__title';
      title.textContent = item.name;
      const meta = document.createElement('span');
      meta.className = 'summary-item__meta';
      meta.textContent = `Cantidad: ${item.qty}`;
      info.append(title, meta);

      const price = document.createElement('span');
      price.className = 'summary-item__price';
      price.textContent = currencyFormatter.format(item.price * item.qty);

      row.append(info, price);
      selectors.summaryItems.append(row);
    });
  }

  async function loadAndRenderCart() {
    const cartItems = cartService.getCartItems();
    if (cartItems.length === 0) {
      cartState.items = [];
      renderSummaryItems();
      updateSummary();
      return;
    }

    try {
      const productPromises = cartItems.map(item => {
        // 1. Extraemos el ID numérico del string "slug-id"
        const numericId = item.id.split('-').pop();
        // Guardamos el ID numérico para usarlo después
        item.numericId = Number(numericId); // Creamos una propiedad temporal
        return window.apiClient.fetchProduct(item.numericId);
      });
      const products = await Promise.all(productPromises);

      cartState.items = cartItems.map(item => {
        // 2. Buscamos el producto usando el ID numérico
        const product = products.find(p => p.id == item.numericId);
        return {
          ...item,
          // 3. ¡AQUÍ ESTÁ EL ARREGLO!
          // Mapeamos 'quantity' (del localStorage) a 'qty' (que usa el script)
          // y nos aseguramos de que sea un número.
          qty: Number(item.quantity) || 0,
          // 3. Sobrescribimos el 'id' con el ID numérico
          id: item.numericId,
          name: product ? product.nombre : 'Producto no encontrado',
          price: product ? product.precio : 0,
        };
      });
    } catch (error) {
      console.error('Error al cargar los productos del carrito:', error);
      cartState.items = [];
      pushAlert('No se pudieron cargar los productos del carrito.', 'error');
    }

    renderSummaryItems();
    updateSummary();
  }

  function updateSummary() {
    const subtotal = cartState.items.reduce((total, item) => total + item.price * item.qty, 0);
    const shipping = state.metodoEntrega === 'domicilio' ? state.shippingCost || cartState.defaultShipping : 0;
    const discount = state.metodoPago === 'transferencia'
      ? Math.round((subtotal + shipping) * cartState.transferDiscountRate)
      : 0;
    const total = Math.max(subtotal + shipping - discount, 0);

    if (selectors.summarySubtotal) selectors.summarySubtotal.textContent = currencyFormatter.format(subtotal);
    if (selectors.summaryShipping) selectors.summaryShipping.textContent = shipping === 0 ? 'Gratis' : currencyFormatter.format(shipping);
    if (selectors.summaryDiscount) selectors.summaryDiscount.textContent = discount > 0 ? `-${currencyFormatter.format(discount)}` : '-$0';
    if (selectors.summaryTotal) selectors.summaryTotal.textContent = currencyFormatter.format(total);
    if (selectors.summaryDiscountRow) selectors.summaryDiscountRow.style.display = discount > 0 ? 'flex' : 'none';
  }

  async function handleFormSubmit(event) {
    event.preventDefault();
    if (!selectors.addressForm || !selectors.formFeedback) return;
    if (!selectors.addressForm.reportValidity()) {
      setFormFeedback('Revisá los campos marcados en rojo.', 'error');
      return;
    }

    const form = selectors.addressForm;
    const valueOrEmpty = (name) => (form.elements[name]?.value || '').trim();
    const payload = {
      calle: valueOrEmpty('calle'),
      numero: valueOrEmpty('numero'),
      piso: valueOrEmpty('piso'),
      departamento: valueOrEmpty('departamento'),
      torre: valueOrEmpty('torre'),
      entreCalles: valueOrEmpty('entreCalles'),
      provincia: valueOrEmpty('provincia'),
      localidad: valueOrEmpty('localidad'),
      codigoPostal: valueOrEmpty('codigoPostal'),
      observaciones: valueOrEmpty('observaciones'),
    };
    setFormFeedback('Guardando dirección...', 'info');
    toggleLoading(true);

    try {
      const { authClient, token } = await ensureAuthenticatedSession();
      const response = await fetch(`${API_BASE_URL}/api/user/domicilios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 401 || response.status === 403) {
        redirectToLogin(authClient);
        throw new Error('Necesitás iniciar sesión para continuar.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorBody = null;
        try {
          errorBody = errorText ? JSON.parse(errorText) : null;
        } catch (parseError) {
          // ignoramos el error de parseo para quedarnos con el texto plano
        }
        console.error('Error al guardar el domicilio:', response.status, errorText);
        const detailValues = errorBody?.details && typeof errorBody.details === 'object'
          ? Object.values(errorBody.details).flatMap((value) => {
            if (Array.isArray(value)) return value;
            if (value && typeof value === 'object') return Object.values(value);
            return value ? [String(value)] : [];
          })
          : [];
        const message = detailValues.length
          ? detailValues.join(' \u2022 ')
          : errorBody?.message || errorBody?.error || 'No pudimos guardar el domicilio.';
        throw new Error(message);
      }

      const created = await response.json();
      selectors.addressForm.reset();
      setFormFeedback('Dirección guardada con éxito.', 'success');
      pushAlert('Dirección guardada correctamente.', 'info');
      await fetchDomicilios(created.id);
      showStep('address-list');
    } catch (error) {
      console.error('Fallo al guardar el domicilio:', error);
      setFormFeedback(error.message || 'Ocurrió un error al guardar el domicilio.', 'error');
      pushAlert(error.message || 'Ocurrió un error al guardar el domicilio.', 'error');
      if (error.message && error.message.includes('Necesitás iniciar sesión')) {
        state.isAuthenticated = false;
        updateAuthDependentUi();
      }
    } finally {
      toggleLoading(false);
    }
  }

  function setFormFeedback(message, status) {
    if (!selectors.formFeedback) return;
    selectors.formFeedback.textContent = message;
    selectors.formFeedback.classList.remove('is-success', 'is-error');
    if (status === 'success') selectors.formFeedback.classList.add('is-success');
    if (status === 'error') selectors.formFeedback.classList.add('is-error');
  }

  function setPaymentFeedback(message, status) {
    if (!selectors.paymentFeedback) return;
    selectors.paymentFeedback.textContent = message;
    selectors.paymentFeedback.classList.remove('is-success', 'is-error');
    if (status === 'success') selectors.paymentFeedback.classList.add('is-success');
    if (status === 'error') selectors.paymentFeedback.classList.add('is-error');
  }

  function safeJson(response) {
    return response.text().then((text) => {
      if (!text) return null;
      try {
        return JSON.parse(text);
      } catch (error) {
        return null;
      }
    });
  }

  function handleDeliverySelection(type) {
    state.metodoEntrega = type;
    state.shippingCost = type === 'domicilio' ? cartState.defaultShipping : 0;
    state.domicilioSeleccionado = type === 'domicilio' ? state.domicilioSeleccionado : null;
    updateDeliveryCards(type);
    updateSummary();

    if (type === 'domicilio') {
      showStep('address-list');
      fetchDomicilios();
    } else {
      showStep('delivery-summary');
      renderSelectedDelivery();
    }
  }

  function handlePaymentSelection(type) {
    state.metodoPago = type;
    selectors.paymentCards.forEach((card) => {
      card.classList.toggle('is-active', card.dataset.payment === type);
    });
    if (selectors.confirmOrderButton) selectors.confirmOrderButton.disabled = false;
    updateSummary();
    const messages = {
      tarjeta: 'Podrás cargar los datos de tu tarjeta en el próximo paso.',
      transferencia: 'Te mostraremos los datos bancarios para acceder al 25% de descuento.',
    };
    setPaymentFeedback(messages[type] || '', 'info');
  }

  async function handleConfirmOrder() {
    const activeCard = document.querySelector('.payment-card.is-active');

    if (!activeCard) {
      setPaymentFeedback('Elegí un medio de pago para continuar.', 'error');
      return;
    }

    const paymentMethod = activeCard.dataset.payment;
    if (paymentMethod === 'mercado_pago') {
      state.metodoPago = 'MP';
    } else if (paymentMethod === 'uala') {
      state.metodoPago = 'UALA';
    } else {
      setPaymentFeedback('Medio de pago no válido.', 'error');
      return;
    }

    const data = {
      detalles: cartState.items.map(item => ({
        productoId: Number(item.id),
        cantidad: Number(item.qty),
      })),
      metodo: state.metodoPago,
    };

    toggleLoading(true);
    setPaymentFeedback('Generando link de pago...', 'info');

    try {
      const response = await window.apiClient.crearOrden(data);
      if (response && response.initPoint) {
        setPaymentFeedback('¡Perfecto! Te enviaremos a la pasarela de pago para finalizar.', 'success');
        pushAlert('Medio de pago confirmado. Continuá para finalizar tu compra.', 'info');
        window.location.href = response.initPoint;
      } else {
        throw new Error('No se pudo obtener el link de pago.');
      }
    } catch (error) {
      console.error('Error al crear la orden:', error);
      setPaymentFeedback(error.message || 'No se pudo crear la orden. Intentá de nuevo.', 'error');
      pushAlert(error.message || 'No se pudo crear la orden.', 'error');
    } finally {
      toggleLoading(false);
    }
  }

  function attachEvents() {
    selectors.deliveryCards.forEach((card) => {
      card.addEventListener('click', () => handleDeliverySelection(card.dataset.delivery));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleDeliverySelection(card.dataset.delivery);
        }
      });
    });

    document.querySelectorAll('[data-action="go-back-method"]').forEach((button) => {
      button.addEventListener('click', () => {
        showStep('method');
        updateDeliveryCards(null);
        state.metodoEntrega = null;
        state.domicilioSeleccionado = null;
        updateSummary();
      });
    });

    document.querySelectorAll('[data-action="add-address"]').forEach((button) => {
      button.addEventListener('click', () => {
        showStep('address-form');
        setFormFeedback('', 'info');
      });
    });

    const cancelButton = document.querySelector('[data-action="cancel-address"]');
    if (cancelButton) {
      cancelButton.addEventListener('click', () => {
        selectors.addressForm?.reset();
        setFormFeedback('', 'info');
        showStep('address-list');
      });
    }

    if (selectors.addressForm) {
      selectors.addressForm.addEventListener('submit', handleFormSubmit);
    }

    if (selectors.confirmAddressButton) {
      selectors.confirmAddressButton.addEventListener('click', () => {
        if (!state.domicilioSeleccionado) {
          pushAlert('Seleccioná un domicilio para continuar.', 'error');
          return;
        }
        renderSelectedDelivery();
        updateSummary();
        showStep('delivery-summary');
      });
    }

    if (selectors.selectedDelivery) {
      selectors.selectedDelivery.addEventListener('click', (event) => {
        const changeAddress = event.target.closest('[data-action="change-address"]');
        const changeMethod = event.target.closest('[data-action="change-method"]');
        if (changeAddress) {
          showStep('address-list');
        } else if (changeMethod) {
          showStep('method');
          updateDeliveryCards(null);
          state.metodoEntrega = null;
          updateSummary();
        }
      });
    }

    if (selectors.backToAddressButton) {
      selectors.backToAddressButton.addEventListener('click', () => {
        if (state.metodoEntrega === 'domicilio') {
          showStep('address-list');
        } else {
          showStep('method');
          updateDeliveryCards(null);
        }
      });
    }

    if (selectors.goToPaymentButton) {
      selectors.goToPaymentButton.addEventListener('click', () => {
        if (state.metodoEntrega === 'domicilio' && !state.domicilioSeleccionado) {
          pushAlert('Seleccioná un domicilio para continuar.', 'error');
          showStep('address-list');
          return;
        }
        showStep('payment');
        updateSummary();
      });
    }

    if (selectors.backToSummaryButton) {
      selectors.backToSummaryButton.addEventListener('click', () => {
        showStep('delivery-summary');
        renderSelectedDelivery();
      });
    }

    selectors.paymentCards.forEach((card) => {
      card.addEventListener('click', () => handlePaymentSelection(card.dataset.payment));
      card.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handlePaymentSelection(card.dataset.payment);
        }
      });
    });

    if (selectors.confirmOrderButton) {
      selectors.confirmOrderButton.addEventListener('click', handleConfirmOrder);
    }
  }

  function init() {
    updateUserState(getUserId());
    loadAndRenderCart();
    attachEvents();
    showStep('method');

    if (!state.isAuthenticated) {
      pushAlert('Para guardar tus domicilios necesitás iniciar sesión.', 'error');
    }
  }

  window.addEventListener(USER_READY_EVENT, (event) => {
    handleAuthReady(event.detail?.userId);
  });

  window.addEventListener('storage', (event) => {
    if (event.key !== USER_ID_STORAGE_KEY || !event.newValue) return;
    handleAuthReady(event.newValue);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
