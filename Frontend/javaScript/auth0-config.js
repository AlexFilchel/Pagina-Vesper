let auth0Client = null;

// ✅ Configuración de tu app Auth0
const APP_REDIRECT_PATH = "/Frontend/index.html";
const AUTH0_SDK_URL = window.__AUTH0_SDK_URL__ || "https://cdn.auth0.com/js/auth0-spa-js/2.0/auth0-spa-js.production.js";

const resolveOrigin = () => {
  if (window.location.origin && window.location.origin !== "null") {
    return window.location.origin;
  }

  const { protocol, host } = window.location;
  if (protocol && host) {
    return `${protocol}//${host}`;
  }

  return window.location.href;
};

const REDIRECT_URI = new URL(APP_REDIRECT_PATH, resolveOrigin()).href;

const config = {
  domain: "dev-txbkgaorh27oni5i.us.auth0.com",
  clientId: "n6ccBcUaLGxOIQTA6Ka29j0AD4Xi88Jn",
  authorizationParams: {
    redirect_uri: REDIRECT_URI
  }
};

console.log("📦 Buscando SDK de Auth0:", typeof window.createAuth0Client);

const SDK_SCRIPT_SELECTOR = "script[data-auth0-spa-sdk]";
let sdkLoadingPromise = null;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function loadAuth0SDK() {
  if (typeof window.createAuth0Client !== "undefined") {
    return Promise.resolve();
  }

  if (sdkLoadingPromise) {
    return sdkLoadingPromise;
  }

  sdkLoadingPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(SDK_SCRIPT_SELECTOR);

    if (existingScript) {
      if (existingScript.dataset.loaded === "true") {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("No se pudo cargar el SDK de Auth0")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = AUTH0_SDK_URL;
    script.async = true;
    script.defer = true;
    script.setAttribute("data-auth0-spa-sdk", "true");
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => {
      reject(new Error("No se pudo cargar el SDK de Auth0"));
    };

    document.head.appendChild(script);
  });

  return sdkLoadingPromise;
}

async function ensureAuth0SDK(timeoutMs = 12000) {
  await loadAuth0SDK();

  const startedAt = Date.now();
  while (typeof window.createAuth0Client === "undefined") {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error("Timeout esperando SDK de Auth0");
    }

    await delay(50);
  }
}

// ✅ Inicializa Auth0 al cargar
async function initAuth0() {
  try {
    await ensureAuth0SDK();

    auth0Client = await window.createAuth0Client(config);
    console.log("✅ Auth0 inicializado correctamente");

    if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
      console.log("📥 Procesando callback de Auth0...");

      try {
        await auth0Client.handleRedirectCallback();
        console.log("✅ Callback procesado exitosamente");

        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error("❌ Error manejando callback:", err);
        alert("Error al iniciar sesión. Por favor, intenta nuevamente.");
      }
    }

    await updateUI();
  } catch (error) {
    console.error("❌ Error inicializando Auth0:", error);
    const message = error?.message || "";

    if (message.includes("Timeout") || message.includes("No se pudo cargar")) {
      alert("Error cargando el sistema de autenticación. Por favor, verifica tu conexión e intenta nuevamente.");
    } else {
      alert("Ocurrió un problema al inicializar la autenticación. Intenta nuevamente más tarde.");
    }
  }
}

// ✅ Actualiza la interfaz
async function updateUI() {
  try {
    if (!auth0Client) {
      console.warn("⚠️ Auth0 client no disponible aún");
      return;
    }

    const isAuthenticated = await auth0Client.isAuthenticated();
    console.log("🔐 Usuario autenticado:", isAuthenticated);

    const loginButton = document.getElementById("btn-login");
    const registerButton = document.getElementById("btn-register");

    if (!loginButton || !registerButton) {
      console.warn("⚠️ Botones de login no encontrados");
      return;
    }

    if (isAuthenticated) {
      const user = await auth0Client.getUser();
      console.log("👤 Usuario logueado:", user);

      loginButton.textContent = user?.name || "Mi perfil";
      loginButton.onclick = event => {
        event.preventDefault();
        alert(`Bienvenido, ${user?.name || "usuario"}\nEmail: ${user?.email || "Sin email"}`);
      };

      registerButton.textContent = "Cerrar sesión";
      registerButton.onclick = event => {
        event.preventDefault();
        logout();
      };
    } else {
      console.log("🔓 Usuario no autenticado");

      loginButton.textContent = "Iniciar sesión";
      registerButton.textContent = "Crear cuenta";

      loginButton.onclick = event => {
        event.preventDefault();
        login();
      };
      registerButton.onclick = event => {
        event.preventDefault();
        login({
          authorizationParams: {
            screen_hint: "signup"
          }
        });
      };
    }
  } catch (error) {
    console.error("❌ Error actualizando UI:", error);
  }
}

// ✅ Login con Auth0
async function login(options = {}) {
  try {
    if (!auth0Client) {
      console.warn("⚠️ Auth0 aún no está listo. Intenta nuevamente en un momento.");
      alert("El sistema de autenticación aún se está cargando. Intenta en un momento.");
      return;
    }

    console.log("🚀 Iniciando login...");
    console.log("📍 Redirect URI:", REDIRECT_URI);

    const authorizationParams = {
      redirect_uri: REDIRECT_URI,
      ...(options.authorizationParams || {})
    };

    const finalOptions = {
      ...options,
      authorizationParams
    };

    await auth0Client.loginWithRedirect(finalOptions);
  } catch (error) {
    console.error("❌ Error en login:", error);
    alert("Error al iniciar sesión. Verifica tu configuración de Auth0.");
  }
}

// ✅ Logout con Auth0
function logout() {
  try {
    console.log("👋 Cerrando sesión...");

    if (!auth0Client) {
      console.warn("⚠️ Auth0 aún no está listo");
      return;
    }

    auth0Client.logout({
      logoutParams: {
        returnTo: REDIRECT_URI
      }
    });
  } catch (error) {
    console.error("❌ Error en logout:", error);
  }
}

// Inicializa cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth0);
} else {
  initAuth0();
}

// Exponer funciones para debugging si es necesario
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && auth0Client) {
    updateUI();
  }
});

window.__auth0 = {
  get client() {
    return auth0Client;
  },
  refreshUI: updateUI
};
