(function () {
  const API_BASE_URL = window.__VESPER_API_BASE__ || 'http://localhost:8080';
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
  };

  const cartState = {
    items: [
      {
        id: 'perfume-1',
        name: 'Vesper Signature Eau de Parfum 100ml',
        detail: 'Cantidad: 1',
        qty: 1,
        price: 82000,
      },
      {
        id: 'vape-1',
        name: 'Midnight Ice Vape 5000 puffs',
        detail: 'Cantidad: 1',
        qty: 1,
        price: 42000,
      },
    ],
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

  function refreshUserIdFromStorage() {
    const storedId = getUserId();
    if (storedId !== state.userId) {
      updateUserState(storedId);
    }
    return state.userId;
  }

  function updateUserState(userId) {
    state.userId = userId ? String(userId) : null;
    updateAuthDependentUi();
  }

  function updateAuthDependentUi() {
    const requiresAuth = [selectors.addressSubmitButton];
    requiresAuth.forEach((element) => {
      if (!element) return;
      const shouldDisable = !state.userId;
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

  async function fetchDomicilios(preferSelectedId) {
    refreshUserIdFromStorage();
    if (!state.userId) {
      pushAlert('Necesitás iniciar sesión para guardar tus direcciones.', 'error');
      return;
    }
    toggleLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/usuarios/${state.userId}/domicilios`);
      if (!response.ok) {
        throw new Error('No pudimos obtener tus direcciones guardadas.');
      }
      const data = await response.json();
      data.sort((a, b) => a.id - b.id);
      const previousId = preferSelectedId ?? state.domicilioSeleccionado?.id ?? null;
      state.domicilios = data;
      state.domicilioSeleccionado = previousId
        ? state.domicilios.find((item) => item.id === previousId) || null
        : null;
      renderAddressList();
    } catch (error) {
      console.error(error);
      pushAlert(error.message || 'Ocurrió un error al obtener los domicilios.', 'error');
    } finally {
      toggleLoading(false);
    }
  }

  function renderAddressList() {
  if (!selectors.addressList) return;
  const emptyState = selectors.addressEmptyState;
  selectors.addressList.querySelectorAll('.address-card').forEach((card) => card.remove());

  if (!state.domicilios.length) {
    if (emptyState) emptyState.classList.remove('hidden');
    if (selectors.confirmAddressButton) selectors.confirmAddressButton.disabled = true;
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
      ? 'Seleccionado'
      : 'Usar este domicilio';
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
      meta.textContent = item.detail || `Cantidad: ${item.qty}`;
      info.append(title, meta);

      const price = document.createElement('span');
      price.className = 'summary-item__price';
      price.textContent = currencyFormatter.format(item.price * item.qty);

      row.append(info, price);
      selectors.summaryItems.append(row);
    });
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
    refreshUserIdFromStorage();
    if (!state.userId) {
      pushAlert('Necesitamos tu usuario para guardar el domicilio. Iniciá sesión.', 'error');
      return;
    }
    if (!selectors.addressForm.reportValidity()) {
      setFormFeedback('Revisá los campos marcados en rojo.', 'error');
      return;
    }

    const formData = new FormData(selectors.addressForm);
    const payload = Object.fromEntries(formData.entries());
    setFormFeedback('Guardando dirección...', 'info');
    toggleLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/usuarios/${state.userId}/domicilios`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorBody = await safeJson(response);
        const details = errorBody?.details;
        const message = details
          ? Object.values(details).join(' \u2022 ')
          : errorBody?.error || 'No pudimos guardar el domicilio.';
        throw new Error(message);
      }

      const created = await response.json();
      selectors.addressForm.reset();
      setFormFeedback('Dirección guardada con éxito.', 'success');
      pushAlert('Dirección guardada correctamente.', 'info');
      await fetchDomicilios(created.id);
      showStep('address-list');
    } catch (error) {
      console.error(error);
      setFormFeedback(error.message || 'Ocurrió un error al guardar el domicilio.', 'error');
      pushAlert(error.message || 'Ocurrió un error al guardar el domicilio.', 'error');
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
      mercado_pago: 'Serás redirigido a Mercado Pago para finalizar la compra.',
    };
    setPaymentFeedback(messages[type] || '', 'info');
  }

  function handleConfirmOrder() {
    if (!state.metodoPago) {
      setPaymentFeedback('Elegí un medio de pago para continuar.', 'error');
      return;
    }
    setPaymentFeedback('¡Perfecto! Te enviaremos a la pasarela de pago para finalizar.', 'success');
    pushAlert('Medio de pago confirmado. Continuá para finalizar tu compra.', 'info');
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
    renderSummaryItems();
    updateSummary();
    attachEvents();
    showStep('method');

    if (!state.userId) {
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
