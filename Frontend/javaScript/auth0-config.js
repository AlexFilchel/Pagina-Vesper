class Auth0Manager {
  constructor(config) {
    this.config = config;
    this.client = null;
    this.loginButton = null;
    this.registerButton = null;
    this.isAuthenticated = false;
    this.user = null;

    this.handleLoginButtonClick = this.handleLoginButtonClick.bind(this);
    this.handleRegisterButtonClick = this.handleRegisterButtonClick.bind(this);
  }

  async init() {
    try {
      this.client = await createAuth0Client({
        domain: this.config.domain,
        clientId: this.config.clientId,
        authorizationParams: {
          redirect_uri: this.config.redirect_uri
        }
      });

      this.cacheDomReferences();
      this.bindUiEvents();
      await this.handleRedirectCallback();
      await this.updateUi();
      console.log("✅ Auth0 inicializado correctamente");
    } catch (error) {
      console.error("❌ Error inicializando Auth0:", error);
    }
  }

  cacheDomReferences() {
    this.loginButton = document.getElementById("btn-login");
    this.registerButton = document.getElementById("btn-register");

    if (!this.loginButton) {
      console.warn("⚠️ Botón de iniciar sesión no encontrado en el DOM");
    }

    if (!this.registerButton) {
      console.warn("⚠️ Botón de registro no encontrado en el DOM");
    }
  }

  bindUiEvents() {
    if (this.loginButton) {
      this.loginButton.addEventListener("click", this.handleLoginButtonClick);
    }

    if (this.registerButton) {
      this.registerButton.addEventListener("click", this.handleRegisterButtonClick);
    }
  }

  async handleRedirectCallback() {
    if (!this.client) return;

    const urlHasCode = window.location.search.includes("code=");
    const urlHasState = window.location.search.includes("state=");

    if (!(urlHasCode && urlHasState)) return;

    try {
      console.log("📥 Procesando callback de Auth0...");
      await this.client.handleRedirectCallback();
      console.log("✅ Callback procesado exitosamente");

      const targetUrl = new URL(this.config.redirect_uri);
      const cleanPath = `${targetUrl.pathname}${targetUrl.search}`;
      window.history.replaceState({}, document.title, cleanPath);
    } catch (error) {
      console.error("❌ Error manejando callback:", error);
      alert("Error al iniciar sesión. Por favor, intenta nuevamente.");
    }
  }

  async updateUi() {
    if (!this.client) return;

    try {
      this.isAuthenticated = await this.client.isAuthenticated();
      console.log("🔐 Usuario autenticado:", this.isAuthenticated);

      if (!this.loginButton || !this.registerButton) {
        return;
      }

      if (this.isAuthenticated) {
        this.user = await this.client.getUser();
        console.log("👤 Usuario logueado:", this.user);

        const userName = this.user?.name || "Mi perfil";
        this.loginButton.textContent = userName;
        this.loginButton.setAttribute("aria-label", `Ver información de ${userName}`);

        this.registerButton.textContent = "Cerrar sesión";
        this.registerButton.setAttribute("aria-label", "Cerrar sesión");
      } else {
        this.user = null;
        this.loginButton.textContent = "Iniciar sesión";
        this.loginButton.setAttribute("aria-label", "Iniciar sesión");

        this.registerButton.textContent = "Crear cuenta";
        this.registerButton.setAttribute("aria-label", "Crear cuenta");
      }
    } catch (error) {
      console.error("❌ Error actualizando UI:", error);
    }
  }

  async login() {
    if (!this.client) return;

    try {
      console.log("🚀 Iniciando login...");
      await this.client.loginWithRedirect({
        authorizationParams: {
          redirect_uri: this.config.redirect_uri
        }
      });
    } catch (error) {
      console.error("❌ Error en login:", error);
      alert("Error al iniciar sesión. Verifica tu configuración de Auth0.");
    }
  }

  logout() {
    if (!this.client) return;

    try {
      console.log("👋 Cerrando sesión...");
      this.client.logout({
        logoutParams: {
          returnTo: this.config.redirect_uri
        }
      });
    } catch (error) {
      console.error("❌ Error en logout:", error);
    }
  }

  handleLoginButtonClick(event) {
    event.preventDefault();

    if (!this.isAuthenticated) {
      this.login();
      return;
    }

    const name = this.user?.name || "usuario";
    const email = this.user?.email || "sin correo";
    alert(`Bienvenido, ${name}\nEmail: ${email}`);
  }

  handleRegisterButtonClick(event) {
    event.preventDefault();

    if (this.isAuthenticated) {
      this.logout();
    } else {
      this.login();
    }
  }
}

const AUTH0_CONFIG = {
  domain: "dev-txbkgaorh27oni5i.us.auth0.com",
  clientId: "n6ccBcUaLGx0IQTA6Ka29j0AD4Xi88Jn",
  redirect_uri: "http://127.0.0.1:5500/Frontend/index.html"
};

let auth0Manager = null;

function initAuth0() {
  if (auth0Manager) return;
  auth0Manager = new Auth0Manager(AUTH0_CONFIG);
  auth0Manager.init();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initAuth0);
} else {
  initAuth0();
}
