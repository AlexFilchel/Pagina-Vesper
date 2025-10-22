(function() {
  'use strict';

  const API_BASE_PATH = 'http://localhost:8080/api';
  let cachedAuth0Client = null;

  function buildUrl(path) {
    if (!path) return API_BASE_PATH;
    if (/^https?:/i.test(path)) return path;
    if (path.startsWith('/')) {
      return `${API_BASE_PATH}${path}`;
    }
    return `${API_BASE_PATH}/${path}`;
  }

  function parseJsonSafely(response) {
    const contentType = response.headers.get('content-type') || '';
    if (response.status === 204 || !contentType.includes('application/json')) {
      return Promise.resolve(null);
    }
    return response.json().catch(() => null);
  }

  async function waitForAuth0Client(timeoutMs = 10000) {
    if (cachedAuth0Client) return cachedAuth0Client;
    if (window.auth0Client) {
      cachedAuth0Client = window.auth0Client;
      return cachedAuth0Client;
    }

    const start = Date.now();
    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (window.auth0Client) {
          clearInterval(interval);
          cachedAuth0Client = window.auth0Client;
          resolve(cachedAuth0Client);
        } else if (Date.now() - start >= timeoutMs) {
          clearInterval(interval);
          reject(new Error('Auth0 client no disponible'));
        }
      }, 100);
    });
  }

  async function getAccessToken() {
    const client = await waitForAuth0Client();
    if (!client || typeof client.getTokenSilently !== 'function') {
      throw new Error('No fue posible obtener el token de autenticación.');
    }
    return client.getTokenSilently();
  }

  async function request(path, options = {}) {
    const {
      method = 'GET',
      body,
      headers = {},
      authenticated = false,
      timeoutMs = 15000
    } = options;

    const requestHeaders = new Headers(headers);
    const fetchOptions = { method, headers: requestHeaders };

    if (body instanceof FormData) {
      requestHeaders.delete('Content-Type'); 
      fetchOptions.body = body;
    } else if (body !== undefined && body !== null) {
      requestHeaders.set('Content-Type', 'application/json');
      fetchOptions.body = JSON.stringify(body);
    }


    if (authenticated) {
      try {
        const token = await getAccessToken();
        requestHeaders.set('Authorization', `Bearer ${token}`);
      } catch (error) {
        const authError = new Error('No se pudo autenticar la solicitud.');
        authError.cause = error;
        throw authError;
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    fetchOptions.signal = controller.signal;

    try {
      const response = await fetch(buildUrl(path), fetchOptions);
      clearTimeout(timeout);
      const data = await parseJsonSafely(response);
      if (!response.ok) {
        const apiError = new Error(
          data?.message || data?.error || `Error ${response.status} en la solicitud.`
        );
        apiError.status = response.status;
        apiError.details = data;
        throw apiError;
      }
      return data;
    } catch (error) {
      if (error.name === 'AbortError') {
        const timeoutError = new Error('La solicitud excedió el tiempo de espera.');
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw error;
    }
  }

  function withAuthenticatedRequest(path, method, body) {
    return request(path, { method, body, authenticated: true });
  }

  const apiClient = {
    request,
    async fetchPerfumes() {
      return request('/public/perfumes');
    },
    async fetchPerfume(id) {
      return request(`/public/perfumes/${id}`);
    },
    async createPerfume(payload) {
      return withAuthenticatedRequest('/admin/perfumes', 'POST', payload);
    },
    async updatePerfume(id, payload) {
      return withAuthenticatedRequest(`/admin/perfumes/${id}`, 'PUT', payload);
    },
    async deletePerfume(id) {
      return withAuthenticatedRequest(`/admin/perfumes/${id}`, 'DELETE');
    },
    async fetchVapes() {
      return request('/public/vapes');
    },
    async fetchVape(id) {
      return request(`/public/vapes/${id}`);
    },
    async createVape(payload) {
      return withAuthenticatedRequest('/admin/vapes', 'POST', payload);
    },
    async updateVape(id, payload) {
      return withAuthenticatedRequest(`/admin/vapes/${id}`, 'PUT', payload);
    },
    async deleteVape(id) {
      return withAuthenticatedRequest(`/admin/vapes/${id}`, 'DELETE');
    },
    async fetchFeaturedPublic() {
      return request('/public/productos-destacados');
    },
    async fetchFeaturedAdmin() {
      return withAuthenticatedRequest('/admin/productos-destacados', 'GET');
    },
    async addFeaturedProduct(productoId) {
      return withAuthenticatedRequest('/admin/productos-destacados', 'POST', { productoId });
    },
    async removeFeaturedProduct(id) {
      return withAuthenticatedRequest(`/admin/productos-destacados/${id}`, 'DELETE');
    },
    async registerCurrentUser() {
      return withAuthenticatedRequest('/user/registrar', 'POST');
    },
    async getUserProfile() {
      return withAuthenticatedRequest('/user/perfil', 'GET');
    },
    async updateUserProfile(payload) {
      return withAuthenticatedRequest('/user/perfil', 'PUT', payload);
    }
  };

  apiClient.basePath = API_BASE_PATH;

  window.apiClient = apiClient;
})();
