let auth0Client = null;

// ✅ Configuración de tu app Auth0
const config = {
  domain: "dev-txbkgaorh27oni5i.us.auth0.com",
  clientId: "n6ccBcUaLGxOIQTA6Ka29j0AD4Xi88Jn",
  authorizationParams: {
    redirect_uri: window.location.origin + window.location.pathname
  }
};

// ✅ Inicializa Auth0 al cargar
async function initAuth0() {
  try {
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
  }
}

// ✅ Actualiza la interfaz
async function updateUI() {
  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    console.log("🔐 Usuario autenticado:", isAuthenticated);
    
    const loginButton = document.getElementById("btn-login");
    const registerButton = document.getElementById("btn-register");

    if (!loginButton || !registerButton) {
      console.warn("⚠️ Botones de login no encontrados");
      return;
    }

    // Previene comportamiento por defecto
    loginButton.addEventListener("click", e => e.preventDefault());
    registerButton.addEventListener("click", e => e.preventDefault());

    if (isAuthenticated) {
      const user = await auth0Client.getUser();
      console.log("👤 Usuario logueado:", user);

      loginButton.textContent = user.name || "Mi perfil";
      loginButton.onclick = () => {
        alert(`Bienvenido, ${user.name || "usuario"}\nEmail: ${user.email}`);
      };
      
      registerButton.textContent = "Cerrar sesión";
      registerButton.onclick = logout;

    } else {
      console.log("🔓 Usuario no autenticado");
      
      loginButton.textContent = "Iniciar sesión";
      registerButton.textContent = "Crear cuenta";

      loginButton.onclick = login;
      registerButton.onclick = login;
    }
  } catch (error) {
    console.error("❌ Error actualizando UI:", error);
  }
}

// ✅ Login con Auth0
async function login() {
  try {
    console.log("🚀 Iniciando login...");
    console.log("📍 Redirect URI:", window.location.origin + window.location.pathname);
    
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin + window.location.pathname
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
    
    auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin + window.location.pathname
      }
    });
  } catch (error) {
    console.error("❌ Error en logout:", error);
  }
}

// Inicializa Auth0 ANTES de que cargue main.js
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAuth0);
} else {
  initAuth0();
}