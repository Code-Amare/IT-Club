import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // ensures cookies are sent
});

// Setup interceptors
export const setupAxiosInterceptors = () => {
  // Attach CSRF token automatically to all unsafe requests
  api.interceptors.request.use((config) => {
    if (config.method !== "get") {
      const csrfToken = getCookie("csrftoken");
      if (csrfToken) config.headers["X-CSRFToken"] = csrfToken;
    }
    return config;
  });

  api.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // Handle 401 by refreshing token (cookie-based)
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          await api.post("/api/users/token/refresh/"); // refresh token in cookie

          // Retry original request with CSRF token
          if (originalRequest.method !== "get") {
            const csrfToken = getCookie("csrftoken");
            if (csrfToken) originalRequest.headers["X-CSRFToken"] = csrfToken;
          }

          return api(originalRequest);
        } catch (refreshError) {
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );
};

export default api;
