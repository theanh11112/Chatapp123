// src/services/settingServices.js
import api from "../utils/axios";

export const settingServices = {
  // Lấy tất cả cài đặt
  getSettings: async (keycloakId) => {
    const response = await api.post("/settings/get-settings", {
      keycloakId,
    });
    return response.data;
  },

  // Cập nhật cài đặt thông báo
  updateNotificationSettings: async (keycloakId, settings) => {
    const response = await api.put("/settings/notifications", {
      keycloakId,
      settings,
    });
    return response.data;
  },

  // Cập nhật cài đặt bảo mật
  updatePrivacySettings: async (keycloakId, settings) => {
    const response = await api.put("/settings/privacy", {
      keycloakId,
      ...settings,
    });
    return response.data;
  },

  // Cập nhật cài đặt chung
  updateGeneralSettings: async (keycloakId, settings) => {
    const response = await api.put("/settings/general", {
      keycloakId,
      ...settings,
    });
    return response.data;
  },

  // Cập nhật cài đặt chat
  updateChatSettings: async (keycloakId, settings) => {
    const response = await api.put("/settings/chat", {
      keycloakId,
      ...settings,
    });
    return response.data;
  },

  // Reset cài đặt về mặc định
  resetSettings: async (keycloakId) => {
    const response = await api.post("/settings/reset", {
      keycloakId,
    });
    return response.data;
  },
};
