(function() {
  'use strict';

  let auth0Client = null;
  const REDIRECT_URI = window.location.origin + window.location.pathname;
  const USER_ID_STORAGE_KEY = 'vesper.usuarioId';
  const USER_READY_EVENT = 'vesper:user-ready';

  function notifyUserReady(userId) {
    if (!userId) return;
    try {
      window.dispatchEvent(
        new CustomEvent(USER_READY_EVENT, {
          detail: { userId: String(userId) },
        })
      );
    } catch (error) {
      console.warn('⚠️ No se pudo notificar el estado de autenticación:', error);
    }
  }

  // ============================================================
  // 🔹 Cargar SDK de Auth0 dinámicamente
  // ============================================================
  const script = document.createElement('script');
  script.src = 'https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js';
  
  script.onload = function() {
    console.log('✅ SDK de Auth0 cargado');
    initAuth0();
  };

  script.onerror = function() {
    console.error('❌ Error cargando SDK de Auth0');
  };

  document.head.appendChild(script);

  // ============================================================
  // 🔹 Inicializar Auth0
  // ============================================================
  async function initAuth0() {
    try {
      const createClient = window.createAuth0Client || window.auth0.createAuth0Client;
      
      auth0Client = await createClient({
        domain: "vesperarg.us.auth0.com",
        clientId: "pYeprEq6ZK2yUBxV6agbfDIiExVkU0xD",
        authorizationParams: {
          redirect_uri: REDIRECT_URI,
          audience: "https://verper/api"
        },
        useRefreshTokens: true,
        cacheLocation: "localstorage"
      });

      window.auth0Client = auth0Client;
      console.log("✅ Auth0 inicializado correctamente");

      // Si vuelve del login, procesar callback
      if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
        console.log("📥 Procesando callback de Auth0...");
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      // Iniciar flujo principal
      await setupUI();
    } catch (error) {
      console.error("❌ Error inicializando Auth0:", error);
    }
  }

  // ============================================================
  // 🔹 Configurar interfaz y login/registro automático
  // ============================================================
  async function setupUI() {
    const accountButton = document.getElementById("account-button");
    const accountLabel = accountButton?.querySelector(".site-header__action-label");

    const isAuth = await auth0Client.isAuthenticated();
    console.log("🔐 Autenticado:", isAuth);

    if (isAuth) {
      // 🔹 Obtener datos del usuario autenticado
      const user = await auth0Client.getUser();

      // 🟢 Registrar automáticamente en la base de datos
      await registerUserIfNeeded(user);

      if (!accountButton || !accountLabel) {
        console.warn("⚠️ Elementos del header no encontrados");
        return;
      }

      // 🔹 Actualizar UI con el nombre del usuario
      const username = user.nickname || user.username || user.given_name || user.name || "Usuario";
      accountLabel.textContent = username;
      accountButton.setAttribute("aria-haspopup", "dialog");
      accountButton.setAttribute("aria-expanded", "false");
      accountButton.classList.add("is-authenticated");

      accountButton.onclick = (event) => {
        event.preventDefault();
        const modalController = window.profileModalController;
        if (modalController && typeof modalController.open === "function") {
          modalController.open();
        } else {
          console.warn("⚠️ Modal de perfil no disponible en esta vista.");
        }
      };
    } else {
      if (!accountButton || !accountLabel) {
        console.warn("⚠️ Elementos del header no encontrados");
        return;
      }

      // 🔹 Si no está logueado → mostrar botón de login
      accountLabel.textContent = "Mi cuenta";
      accountButton.setAttribute("aria-haspopup", "false");
      accountButton.setAttribute("aria-expanded", "false");
      accountButton.classList.remove("is-authenticated");

      accountButton.onclick = (event) => {
        event.preventDefault();
        auth0Client.loginWithRedirect({
          authorizationParams: { redirect_uri: REDIRECT_URI }
        });
      };
    }
  }

  // ============================================================
  // 🔹 Registrar el usuario autenticado en tu backend (una vez)
  // ============================================================
  async function registerUserIfNeeded(user) {
    if (!user || !user.sub) return null;

    const existingUserId = localStorage.getItem(USER_ID_STORAGE_KEY);
    if (existingUserId) {
      console.log(`ℹ️ ID de usuario ya existe en localStorage: ${existingUserId}`);
      notifyUserReady(existingUserId);
      return existingUserId;
    }

    console.log("ℹ️ No se encontró ID de usuario en localStorage, sincronizando con el backend...");

    try {
      const token = await auth0Client.getTokenSilently();
      const response = await fetch('http://localhost:8080/api/user/registrar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const registeredUser = await response.json();
        if (registeredUser && registeredUser.id) {
          localStorage.setItem(USER_ID_STORAGE_KEY, registeredUser.id);
          const storageKey = `vesper:user-registered:${user.sub}`;
          localStorage.setItem(storageKey, 'true');
          console.log(`✅ Usuario sincronizado. ID guardado: ${registeredUser.id}`);
          notifyUserReady(registeredUser.id);
          return registeredUser.id;
        }
        console.warn('⚠️ La respuesta del backend no contenía un ID de usuario.');
      } else {
        console.warn('⚠️ Falló la sincronización de usuario:', await response.text());
      }
    } catch (error) {
      console.error('❌ Error sincronizando usuario:', error);
    }

    return null;
  }
})();
