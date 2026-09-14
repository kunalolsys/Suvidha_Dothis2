import api from "./api";
import { setAccessToken, clearAccessToken } from "./tokenManager";

// LOGIN
export const loginUser = async (data) => {
  const res = await api.post("/auth/login", data);

  const token = res.data.accessToken;
  setAccessToken(token);

  return res;
};

// LOGOUT
export const logoutUser = async () => {
  try {
    await api.post("/auth/logout");
  } finally {
    localStorage.clear()
    clearAccessToken();
    window.location.href = "/";
  }
};

// REFRESH (manual call if needed)
export const refreshAccessToken = async () => {
  const res = await api.get("/auth/refresh");
  setAccessToken(res.data.accessToken);
  return res.data.accessToken;
};