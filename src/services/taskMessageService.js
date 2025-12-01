// src/services/taskMessageService.js
import api from "../utils/axios";

const taskMessageService = {
  // Gửi tin nhắn
  sendMessage: async (messageData) => {
    const response = await api.post("/taskMessage/send", messageData);
    return response.data;
  },

  // Lấy tin nhắn của task
  getTaskMessages: async (taskId, keycloakId, page = 1, limit = 50) => {
    const response = await api.post("/taskMessage/get-task-messages", {
      taskId,
      keycloakId,
      page,
      limit,
    });
    return response.data;
  },

  // Chỉnh sửa tin nhắn
  editMessage: async (messageId, keycloakId, newMessage) => {
    const response = await api.patch("/taskMessage/edit", {
      messageId,
      keycloakId,
      newMessage,
    });
    return response.data;
  },

  // Xóa tin nhắn
  deleteMessage: async (messageId, keycloakId) => {
    const response = await api.post("/taskMessage/delete", {
      messageId,
      keycloakId,
    });
    return response.data;
  },
};

export default taskMessageService;
