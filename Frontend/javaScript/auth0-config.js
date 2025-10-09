(function() {
  'use strict';

  let auth0Client = null;
  const REDIRECT_URI = "http://127.0.0.1:5500/Frontend/index.html";

  // Cargar SDK de Auth0
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
      // Esperar a que esté disponible
      if (!window.createAuth0Client && !window.auth0?.createAuth0Client) {
        console.error('❌ createAuth0Client no está disponible');
        return;
      }

      const createClient = window.createAuth0Client || window.auth0.createAuth0Client;
      
      auth0Client = await createClient({
        domain: "vesperarg.us.auth0.com",
        clientId: "pYeprEq6ZK2yUBxV6agbfDIiExVkU0xD",
        authorizationParams: {
          redirect_uri: REDIRECT_URI
        }
      });

      console.log("✅ Auth0 inicializado correctamente");

      // Manejar callback
      if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
        console.log("📥 Procesando callback...");
        try {
          await auth0Client.handleRedirectCallback();
          console.log("✅ Callback procesado");
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (err) {
          console.error("❌ Error en callback:", err);
        }
      }

      setupUI();
    } catch (error) {
      console.error("❌ Error inicializando Auth0:", error);
    }
  }

  async function setupUI() {
    const loginBtn = document.getElementById("btn-login");
    const registerBtn = document.getElementById("btn-register");

    if (!loginBtn || !registerBtn) {
      console.warn("⚠️ Botones no encontrados");
      return;
    }

    const isAuth = await auth0Client.isAuthenticated();
    console.log("🔐 Autenticado:", isAuth);

    if (isAuth) {
      const user = await auth0Client.getUser();
      loginBtn.textContent = user.name || "Mi perfil";
      loginBtn.onclick = (e) => {
        e.preventDefault();
        alert(`Hola ${user.name}\n${user.email}`);
      };
      registerBtn.textContent = "Cerrar sesión";
      registerBtn.onclick = (e) => {
        e.preventDefault();
        auth0Client.logout({
          logoutParams: { returnTo: REDIRECT_URI }
        });
      };
    } else {
      loginBtn.textContent = "Iniciar sesión";
      registerBtn.textContent = "Crear cuenta";
      
      const handleLogin = (e) => {
        e.preventDefault();
        console.log("🚀 Login...");
        auth0Client.loginWithRedirect({
          authorizationParams: { redirect_uri: REDIRECT_URI }
        });
      };

      loginBtn.onclick = handleLogin;
      registerBtn.onclick = handleLogin;
    }
  }
})();