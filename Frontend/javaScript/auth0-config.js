let auth0Client = null;

// ✅ Configuración de tu app Auth0
const REDIRECT_URI = "http://127.0.0.1:5500/Frontend/index.html";
const config = {
  domain: "dev-txbkgaorh27oni5i.us.auth0.com",
  clientId: "n6ccBcUaLGxOIQTA6Ka29j0AD4Xi88Jn",
  authorizationParams: {
    redirect_uri: REDIRECT_URI
  }
};

console.log("📦 Buscando SDK de Auth0:", typeof createAuth0Client);
// ✅ Espera a que el SDK de Auth0 esté disponible
function waitForAuth0SDK() {
  return new Promise((resolve, reject) => {
    // Si ya está disponible, resolver inmediatamente
    if (typeof createAuth0Client !== 'undefined') {
      resolve();
      return;
    }

    // Esperar hasta 10 segundos
    let attempts = 0;
    const maxAttempts = 100;
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (typeof createAuth0Client !== 'undefined') {
        clearInterval(checkInterval);
        console.log('✅ SDK de Auth0 cargado');
        resolve();
      } else if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        reject(new Error('Timeout esperando SDK de Auth0'));
      }
    }, 100);
  });
}

// ✅ Inicializa Auth0 al cargar
async function initAuth0() {
  try {
    // Esperar a que el SDK esté disponible
    await waitForAuth0SDK();
    
    auth0Client = await createAuth0Client(config);
    console.log("✅ Auth0 inicializado correctamente");

    // Verifica si viene de un redirect de Auth0
    if (window.location.search.includes("code=") && window.location.search.includes("state=")) {
      console.log("📥 Procesando callback de Auth0...");
      
      try {
        await auth0Client.handleRedirectCallback();
        console.log("✅ Callback procesado exitosamente");
        
        // Limpia la URL sin perder el path
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (err) {
        console.error("❌ Error manejando callback:", err);
        alert("Error al iniciar sesión. Por favor, intenta nuevamente.");
      }
    }

    await updateUI();
  } catch (error) {
    console.error("❌ Error inicializando Auth0:", error);
    if (error.message.includes('Timeout')) {
      alert("Error cargando el sistema de autenticación. Por favor, recarga la página.");
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

      loginButton.textContent = user.name || "Mi perfil";
      loginButton.onclick = event => {
        event.preventDefault();
        alert(`Bienvenido, ${user.name || "usuario"}\nEmail: ${user.email}`);
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
        login();
      };
    }
  } catch (error) {
    console.error("❌ Error actualizando UI:", error);
  }
}

// ✅ Login con Auth0
async function login() {
  try {
    if (!auth0Client) {
      console.warn("⚠️ Auth0 aún no está listo. Intenta nuevamente en un momento.");
      alert("El sistema de autenticación aún se está cargando. Intenta en un momento.");
      return;
    }

    console.log("🚀 Iniciando login...");
    console.log("📍 Redirect URI:", REDIRECT_URI);

    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: REDIRECT_URI
      }
    });
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
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth0);
} else {
  initAuth0();
}