(function() {
  'use strict';

  const SDK_URL = 'https://cdn.auth0.com/js/auth0-spa-js/2.1/auth0-spa-js.production.js';
  const SDK_SCRIPT_ID = 'auth0-spa-sdk';
  const REDIRECT_URI = window.location.origin + window.location.pathname;

  let auth0Client = null;
  let resolveClient;
  let rejectClient;

  const clientPromise = new Promise((resolve, reject) => {
    resolveClient = resolve;
    rejectClient = reject;
  });

  const emit = (eventName, detail) => {
    try {
      window.dispatchEvent(new CustomEvent(eventName, { detail }));
    } catch (error) {
      console.error('❌ No se pudo emitir el evento de Auth0', error);
    }
  };

  const setClient = (client) => {
    if (auth0Client) {
      return auth0Client;
    }
    auth0Client = client;
    resolveClient?.(auth0Client);
    emit('auth0-ready', { client: auth0Client });
    return auth0Client;
  };

  const handleInitError = (error) => {
    console.error('❌ Error inicializando Auth0:', error);
    rejectClient?.(error);
    emit('auth0-error', { error });
  };

  async function initAuth0() {
    if (auth0Client) {
      return auth0Client;
    }

    try {
      const createClient = window.createAuth0Client || window.auth0?.createAuth0Client;
      if (typeof createClient !== 'function') {
        throw new Error('Auth0 SDK no disponible');
      }

      const client = await createClient({
        domain: 'vesperarg.us.auth0.com',
        clientId: 'pYeprEq6ZK2yUBxV6agbfDIiExVkU0xD',
        authorizationParams: {
          redirect_uri: REDIRECT_URI
        },
        useRefreshTokens: true,
        cacheLocation: 'localstorage'
      });

      setClient(client);
      console.log('✅ Auth0 inicializado correctamente');

      if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
        console.log('📥 Procesando callback de autenticación...');
        await client.handleRedirectCallback();
        window.history.replaceState({}, document.title, window.location.pathname);
      }

      setupUI();
      return client;
    } catch (error) {
      handleInitError(error);
      throw error;
    }
  }

  function ensureSdkLoaded() {
    if (window.createAuth0Client || window.auth0?.createAuth0Client) {
      initAuth0();
      return;
    }

    if (document.getElementById(SDK_SCRIPT_ID)) {
      return;
    }

    const script = document.createElement('script');
    script.id = SDK_SCRIPT_ID;
    script.src = SDK_URL;
    script.async = true;
    script.onload = () => {
      console.log('✅ SDK de Auth0 cargado');
      initAuth0();
    };
    script.onerror = (event) => {
      const error = new Error('No se pudo cargar el SDK de Auth0');
      error.detail = event;
      handleInitError(error);
    };

    document.head.appendChild(script);
  }

  ensureSdkLoaded();

  async function setupUI() {
    try {
      const client = await window.getAuth0Client();
      const loginBtn = document.getElementById('btn-login');
      const accountLabel = document.querySelector('.site-header__action-label');

      if (!loginBtn || !accountLabel) {
        return;
      }

      const isAuth = await client.isAuthenticated();
      console.log('🔐 Autenticado:', isAuth);

      if (isAuth) {
        const user = await client.getUser();
        const username =
          user?.nickname || user?.username || user?.given_name || user?.name || 'Usuario';

        accountLabel.textContent = username;
        loginBtn.textContent = 'Cerrar sesión';
        loginBtn.onclick = (e) => {
          e.preventDefault();
          client.logout({
            logoutParams: { returnTo: window.location.origin + '/Frontend/index.html' }
          });
        };
      } else {
        accountLabel.textContent = 'Mi cuenta';
        loginBtn.textContent = 'Iniciar sesión';
        loginBtn.onclick = (e) => {
          e.preventDefault();
          client.loginWithRedirect({
            authorizationParams: { redirect_uri: REDIRECT_URI }
          });
        };
      }
    } catch (error) {
      console.error('❌ Error al configurar la UI de Auth0:', error);
    }
  }

  window.getAuth0Client = async function() {
    if (auth0Client) {
      return auth0Client;
    }
    return clientPromise;
  };

  window.getAuth0Token = async function(options = {}) {
    const client = await window.getAuth0Client();
    return client.getTokenSilently(options);
  };
})();
