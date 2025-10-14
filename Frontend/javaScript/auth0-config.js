(function() {
  'use strict';

  let auth0Client = null;
  const REDIRECT_URI = window.location.origin + window.location.pathname;
  let resolveAuth0Client;
  let rejectAuth0Client;

  const auth0ClientPromise = new Promise((resolve, reject) => {
    resolveAuth0Client = resolve;
    rejectAuth0Client = reject;
  });

  /**
   * Permite a otros módulos esperar a que el cliente de Auth0 esté listo.
   */
  window.auth0ClientPromise = auth0ClientPromise;
  window.getAuth0Client = () => auth0ClientPromise;
  window.getAccessToken = async (options = {}) => {
    const client = await auth0ClientPromise;
    return client.getTokenSilently(options);
  };

  init();

  async function init() {
    try {
      await initAuth0();
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupUI, { once: true });
      } else {
        setupUI();
      }
    } catch (error) {
      console.error('❌ Error inicializando Auth0:', error);
      rejectAuth0Client?.(error);
    }
  }

  async function initAuth0() {
    if (auth0Client) {
      return auth0Client;
    }

    const createClient = window.auth0?.createAuth0Client || window.createAuth0Client;
    if (typeof createClient !== 'function') {
      throw new Error('Auth0 SPA SDK no se cargó correctamente.');
    }

    auth0Client = await createClient({
      domain: 'vesperarg.us.auth0.com',
      clientId: 'pYeprEq6ZK2yUBxV6agbfDIiExVkU0xD',
      authorizationParams: {
        redirect_uri: REDIRECT_URI
      },
      useRefreshTokens: true,
      cacheLocation: 'localstorage'
    });

    resolveAuth0Client?.(auth0Client);

    if (window.location.search.includes('code=') && window.location.search.includes('state=')) {
      await auth0Client.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    return auth0Client;
  }

  async function setupUI() {
    if (!auth0Client) {
      try {
        await initAuth0();
      } catch (error) {
        console.error('❌ No se pudo inicializar la interfaz de Auth0:', error);
        return;
      }
    }

    const loginBtn = document.getElementById('btn-login');
    const accountLabel = document.querySelector('.site-header__action-label');

    if (!loginBtn || !accountLabel) {
      return;
    }

    try {
      const isAuth = await auth0Client.isAuthenticated();

      if (isAuth) {
        const user = await auth0Client.getUser();
        const username = user.nickname || user.username || user.given_name || user.name || 'Usuario';

        accountLabel.textContent = username;
        loginBtn.textContent = 'Cerrar sesión';
        loginBtn.onclick = (event) => {
          event.preventDefault();
          auth0Client.logout({
            logoutParams: { returnTo: window.location.origin + '/Frontend/index.html' }
          });
        };
      } else {
        accountLabel.textContent = 'Mi cuenta';
        loginBtn.textContent = 'Iniciar sesión';
        loginBtn.onclick = (event) => {
          event.preventDefault();
          auth0Client.loginWithRedirect({
            authorizationParams: { redirect_uri: REDIRECT_URI }
          });
        };
      }
    } catch (error) {
      console.error('❌ Error actualizando la UI de Auth0:', error);
    }
  }
})();
