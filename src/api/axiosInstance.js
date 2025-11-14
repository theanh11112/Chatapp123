import axios from "axios";
import keycloak from "../auth/keycloak";

// 🔧 Tạo instance axios
const api = axios.create({
  baseURL: "http://localhost:3001/", // backend local của bạn
});

// 🧠 Gắn interceptor để tự động thêm token
api.interceptors.request.use(
  async (config) => {
    if (keycloak.authenticated) {
      try {
        await keycloak.updateToken(60); // refresh nếu gần hết hạn
        config.headers.Authorization = `Bearer ${keycloak.token}`;
      } catch (error) {
        console.warn("⚠️ Token expired — redirect to login");
        keycloak.login();
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
