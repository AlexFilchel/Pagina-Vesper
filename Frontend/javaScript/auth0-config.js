(function() {
  'use strict';

  let auth0Client = null;
  const REDIRECT_URI = window.location.origin + window.location.pathname;

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
        // 🔒 Mantener sesión activa
        useRefreshTokens: true,
        cacheLocation: "localstorage"
      });

      window.auth0Client = auth0Client;
      console.log("✅ Auth0 inicializado correctamente");

      // Manejar callback si vuelve de login
      if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
        console.log("📥 Procesando callback...");
        await auth0Client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setupUI();
    } catch (error) {
      console.error("❌ Error inicializando Auth0:", error);
    }
  }

  async function setupUI() {
    const loginBtn = document.getElementById("btn-login");
    const accountLabel = document.querySelector(".site-header__action-label");

    if (!loginBtn || !accountLabel) {
      console.warn("⚠️ Elementos no encontrados en esta página");
      return;
    }

    const isAuth = await auth0Client.isAuthenticated();
    console.log("🔐 Autenticado:", isAuth);

    if (isAuth) {
      const user = await auth0Client.getUser();
      await registerUserIfNeeded(user);

      const username =
        user.nickname || user.username || user.given_name || user.name || "Usuario";

      accountLabel.textContent = username;

      loginBtn.textContent = "Cerrar sesión";
      loginBtn.onclick = (e) => {
        e.preventDefault();
        auth0Client.logout({
          logoutParams: { returnTo: window.location.origin + "/Frontend/index.html" }
        });
      };
    } else {
      accountLabel.textContent = "Mi cuenta";
      loginBtn.textContent = "Iniciar sesión";
      loginBtn.onclick = (e) => {
        e.preventDefault();
        auth0Client.loginWithRedirect({
          authorizationParams: { redirect_uri: REDIRECT_URI }
        });
      };
    }
  }

  async function registerUserIfNeeded(user) {
    if (!user || !user.sub) return;
    const storageKey = `vesper:user-registered:${user.sub}`;
    if (localStorage.getItem(storageKey) === 'true') {
      return;
    }

    if (!window.apiClient || typeof window.apiClient.registerCurrentUser !== 'function') {
      console.warn('⚠️ Cliente de API no disponible para registrar usuario.');
      return;
    }

    try {
      await window.apiClient.registerCurrentUser();
      localStorage.setItem(storageKey, 'true');
      console.log('✅ Usuario sincronizado con la base de datos');
    } catch (error) {
      console.error('❌ Error registrando usuario en la API:', error);
    }
  }
})();
