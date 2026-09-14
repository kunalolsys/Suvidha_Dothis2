import axios from "axios";
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
} from "./tokenManager";
let API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// Normalize base URL: remove trailing slash and ensure /v1 segment exists
API_BASE_URL = API_BASE_URL.replace(/\/$/, "");
if (!/\/v1($|\/)/.test(API_BASE_URL)) {
  API_BASE_URL = API_BASE_URL + "/v1";
}

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

let isRefreshing = false;
let failedQueue = [];

// process queued requests
const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

// 🔹 REQUEST INTERCEPTOR
api.interceptors.request.use((config) => {
  const token = getAccessToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// 🔹 RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (originalRequest.url.includes("/auth/login")) {
      return Promise.reject(err); // ✅ let UI handle error
    }
    // ❌ DO NOT INTERCEPT REFRESH API
    if (originalRequest.url.includes("/auth/refresh")) {
      clearAccessToken();
      window.location.replace("/");

      return Promise.reject(err);
    }

    // ✅ HANDLE NORMAL 401
    if (
      (err.response?.status === 401 || err.response?.status === 403) &&
      !originalRequest._retry
    ) {
      originalRequest._retry = true;

      try {
        const res = await api.get("/auth/refresh");

        const newToken = res.data.accessToken;

        if (!newToken) throw new Error("No token");

        setAccessToken(newToken);

        return api({
          ...originalRequest,
          headers: {
            ...originalRequest.headers,
            Authorization: `Bearer ${newToken}`,
          },
        });
      } catch (refreshErr) {
        clearAccessToken();

        window.location.replace("/");

        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(err);
  },
);

export default api;
