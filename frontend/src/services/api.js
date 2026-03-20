// ==========================================================
// CONFIGURATION NG AXIOS API NATIN
// ==========================================================
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const payload = error?.response?.data;

    if (
      status === 403 &&
      payload?.code === "ACCOUNT_BANNED" &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      try {
        localStorage.removeItem("dogscan_auth_token");
      } catch {
        // ignore storage errors
      }

      const params = new URLSearchParams();
      params.set("banned", "1");
      if (payload?.ban_reason) params.set("ban_reason", payload.ban_reason);
      if (payload?.banned_until) params.set("banned_until", payload.banned_until);
      window.location.assign(`/login?${params.toString()}`);
    }

    return Promise.reject(error);
  }
);

export default api;
