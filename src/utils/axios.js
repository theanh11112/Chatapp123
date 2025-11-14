// src/utils/axios.js
import axios from "axios";
import keycloak from "../auth/keycloak";
import { BASE_URL } from "../config";

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use(
  async (config) => {
    if (keycloak?.authenticated) {
      await keycloak.updateToken(60);
      config.headers.Authorization = `Bearer ${keycloak.token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
