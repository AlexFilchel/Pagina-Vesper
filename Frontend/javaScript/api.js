(function (window) {
  'use strict';

  const API_ROOT = (typeof window.__VESPER_API_BASE__ === 'string' && window.__VESPER_API_BASE__)
    ? window.__VESPER_API_BASE__
    : 'http://localhost:8080';
  const API_BASE_URL = `${API_ROOT.replace(/\/$/, '')}/api`;
  const REGISTER_KEY_PREFIX = 'vesper.user.registered';

  function buildUrl(path) {
    if (!path.startsWith('/')) {
      return `${API_BASE_URL}/${path}`;
    }
    return `${API_BASE_URL}${path}`;
  }

  async function getAccessToken() {
    try {
      if (window.auth0Client && typeof window.auth0Client.getTokenSilently === 'function') {
        return await window.auth0Client.getTokenSilently();
      }
    } catch (error) {
      console.error('❌ No se pudo obtener el token de acceso', error);
      throw error;
    }
    return null;
  }

  async function request(path, options = {}) {
    const {
      method = 'GET',
      headers: customHeaders = {},
      body,
      requiresAuth = true,
    } = options;

    const headers = new Headers(customHeaders instanceof Headers ? customHeaders : customHeaders);
    if (!(body instanceof FormData)) {
      headers.set('Accept', 'application/json');
    }

    const fetchOptions = { method, headers };

    if (body !== undefined && body !== null) {
      if (body instanceof FormData) {
        fetchOptions.body = body;
      } else if (typeof body === 'string') {
        fetchOptions.body = body;
        if (!headers.has('Content-Type')) {
          headers.set('Content-Type', 'application/json');
        }
      } else {
        fetchOptions.body = JSON.stringify(body);
        headers.set('Content-Type', 'application/json');
      }
    }

    if (requiresAuth) {
      const token = await getAccessToken();
      if (!token) {
        throw new Error('No se encontró un token de autenticación.');
      }
      headers.set('Authorization', `Bearer ${token}`);
    }

    let response;
    try {
      response = await fetch(buildUrl(path), fetchOptions);
    } catch (error) {
      console.error('❌ Error de red al llamar a la API', error);
      throw new Error('No se pudo conectar con el servidor.');
    }

    if (!response.ok) {
      let errorMessage = `Error ${response.status}`;
      try {
        const data = await response.json();
        errorMessage = data?.message || data?.error || errorMessage;
      } catch (error) {
        // ignorar si no hay JSON
      }
      const apiError = new Error(errorMessage);
      apiError.status = response.status;
      throw apiError;
    }

    if (response.status === 204) {
      return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      return response.json();
    }
    return response.text();
  }

  function cacheRegistrationFlag(userSub) {
    try {
      if (!userSub || !window.localStorage) return;
      window.localStorage.setItem(`${REGISTER_KEY_PREFIX}:${userSub}`, 'true');
    } catch (error) {
      console.warn('⚠️ No se pudo guardar el estado de registro en localStorage', error);
    }
  }

  function isUserRegisteredCached(userSub) {
    try {
      if (!userSub || !window.localStorage) return false;
      return window.localStorage.getItem(`${REGISTER_KEY_PREFIX}:${userSub}`) === 'true';
    } catch (error) {
      return false;
    }
  }

  const apiClient = {
    async fetchPerfumes() {
      return request('/public/perfumes', { requiresAuth: false });
    },
    async createPerfume(data) {
      return request('/admin/perfumes', { method: 'POST', body: data });
    },
    async updatePerfume(id, data) {
      return request(`/admin/perfumes/${id}`, { method: 'PUT', body: data });
    },
    async deletePerfume(id) {
      return request(`/admin/perfumes/${id}`, { method: 'DELETE' });
    },
    async fetchVapes() {
      return request('/public/vapes', { requiresAuth: false });
    },
    async createVape(data) {
      return request('/admin/vapes', { method: 'POST', body: data });
    },
    async updateVape(id, data) {
      return request(`/admin/vapes/${id}`, { method: 'PUT', body: data });
    },
    async deleteVape(id) {
      return request(`/admin/vapes/${id}`, { method: 'DELETE' });
    },
    async fetchFlavors() {
      return request('/public/sabores', { requiresAuth: false });
    },
    async createFlavor(data) {
      return request('/admin/sabores', { method: 'POST', body: data });
    },
    async ensureUserRegistered(userInfo) {
      try {
        const userSub = userInfo?.sub;
        if (!userSub) {
          console.warn('⚠️ No se pudo determinar el usuario autenticado para registrar.');
          return;
        }
        if (isUserRegisteredCached(userSub)) {
          return;
        }
        await request('/user/registrar', { method: 'POST' });
        cacheRegistrationFlag(userSub);
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          console.warn('⚠️ No se pudo registrar al usuario: falta de autorización.');
          return;
        }
        console.error('❌ Error registrando al usuario autenticado', error);
      }
    },
    getAccessToken,
  };

  window.apiClient = apiClient;
})(window);
