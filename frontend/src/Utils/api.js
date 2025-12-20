import axios from "axios";

const API_BASE_URL_DESKTOP = import.meta.env.VITE_API_BASE_URL;
const API_BASE_URL_MOBILE = import.meta.env.VITE_API_BASE_URL_MOBILE;
let API_BASE_URL = API_BASE_URL_DESKTOP;
if (!window.location.host.includes("localhost")) {
  API_BASE_URL = API_BASE_URL_MOBILE;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Setup interceptors
export const setupAxiosInterceptors = () => {
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

      // Skip token refresh if request is marked as public
      if (originalRequest?.publicApi) {
        return Promise.reject(error);
      }

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          await api.post("/api/users/token/refresh/");

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
