import api from "../utils/axios";

const notificationService = {
  // 🏠 Dashboard thông báo
  async getDashboard() {
    try {
      const response = await api.get("/notifications/dashboard");
      return response.data;
    } catch (error) {
      console.error("Error fetching notification dashboard:", error);
      throw error;
    }
  },

  // ==================== ADMIN NOTIFICATIONS ====================

  // 📋 Lấy danh sách thông báo cho admin
  async getAllAdminNotifications(filters = {}) {
    try {
      const response = await api.post("/notifications/admin/notifications", {
        ...filters,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching admin notifications:", error);
      throw error;
    }
  },

  // ✅ Đánh dấu thông báo đã đọc (admin)
  async markNotificationAsRead(notificationId) {
    try {
      const response = await api.put(
        "/notifications/admin/notifications/mark-read",
        {
          notificationId,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      throw error;
    }
  },

  // 🗑️ Xóa thông báo (admin)
  async deleteNotification(notificationId) {
    try {
      const response = await api.delete(
        "/notifications/admin/notifications/delete",
        {
          data: { notificationId },
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error deleting notification:", error);
      throw error;
    }
  },

  // ➕ Tạo thông báo hệ thống (cho admin)
  async createSystemNotification(notificationData) {
    try {
      const response = await api.post(
        "/notifications/admin/notifications/create",
        {
          ...notificationData,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error creating system notification:", error);
      throw error;
    }
  },

  // ==================== USER NOTIFICATIONS ====================

  // 📱 Lấy thông báo cho người dùng thông thường
  async getUserNotifications(keycloakId, filters = {}) {
    try {
      const response = await api.post("/notifications/notifications/user", {
        userId: keycloakId,
        ...filters,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user notifications:", error);
      throw error;
    }
  },

  // ✅ Đánh dấu thông báo đã đọc (user)
  async markUserNotificationAsRead(notificationId, keycloakId) {
    try {
      const response = await api.put("/notifications/notifications/mark-read", {
        notificationId,
        userId: keycloakId,
      });
      return response.data;
    } catch (error) {
      console.error("Error marking user notification as read:", error);
      throw error;
    }
  },

  // ✅ Đánh dấu tất cả thông báo là đã đọc (user)
  async markAllNotificationsAsRead(keycloakId, userRoles = []) {
    try {
      const response = await api.put(
        "/notifications/notifications/mark-all-read",
        {
          userId: keycloakId,
          userRoles,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      throw error;
    }
  },

  // 🔢 Lấy số lượng thông báo chưa đọc (user)
  async getUnreadNotificationsCount(keycloakId, userRoles = []) {
    try {
      const response = await api.post(
        "/notifications/notifications/unread-count",
        {
          userId: keycloakId,
          userRoles,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching unread notifications count:", error);
      throw error;
    }
  },

  // ==================== STATISTICS ====================

  // 📊 Thống kê cơ bản thông báo
  async getNotificationStats() {
    try {
      const response = await api.get("/notifications/notifications/stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching notification stats:", error);
      throw error;
    }
  },

  // 📈 Thống kê chi tiết thông báo
  async getDetailedNotificationStats(days = 30) {
    try {
      const response = await api.post(
        "/notifications/notifications/detailed-stats",
        {
          days,
        }
      );
      return response.data;
    } catch (error) {
      console.error("Error fetching detailed notification stats:", error);
      throw error;
    }
  },

  // ==================== UTILITY METHODS ====================

  // 🎯 Lấy thông báo cho dashboard admin
  async getNotificationsForAdminDashboard(keycloakId) {
    try {
      const [adminNotifications, stats] = await Promise.all([
        this.getAllAdminNotifications({ page: 1, limit: 10 }),
        this.getNotificationStats(),
      ]);

      return {
        recentNotifications: adminNotifications.data || [],
        stats: stats.data || {},
      };
    } catch (error) {
      console.error("Error fetching notifications for admin dashboard:", error);
      return {
        recentNotifications: [],
        stats: {},
      };
    }
  },

  // 🎯 Lấy thông báo cho dashboard user
  async getNotificationsForUserDashboard(keycloakId, userRoles = []) {
    try {
      const [userNotifications, unreadCount] = await Promise.all([
        this.getUserNotifications(keycloakId, { page: 1, limit: 10 }),
        this.getUnreadNotificationsCount(keycloakId, userRoles),
      ]);

      return {
        recentNotifications: userNotifications.data || [],
        unreadCount: unreadCount.data?.unreadCount || 0,
      };
    } catch (error) {
      console.error("Error fetching notifications for user dashboard:", error);
      return {
        recentNotifications: [],
        unreadCount: 0,
      };
    }
  },

  // 🎯 Tạo thông báo hệ thống tự động
  async createAutoSystemNotification(type, data) {
    try {
      const notificationTemplates = {
        task_created: {
          title: "Task mới được tạo",
          message: `Task "${data.taskTitle}" đã được tạo bởi ${data.creatorName}`,
          type: "info",
          priority: "medium",
          recipientType: "user",
          recipientIds: [data.assigneeId],
          source: "Task Management",
          actionUrl: `/tasks/${data.taskId}`,
        },
        task_completed: {
          title: "Task đã hoàn thành",
          message: `Task "${data.taskTitle}" đã được hoàn thành bởi ${data.completerName}`,
          type: "success",
          priority: "medium",
          recipientType: "user",
          recipientIds: [data.assignerId],
          source: "Task Management",
          actionUrl: `/tasks/${data.taskId}`,
        },
        system_warning: {
          title: "Cảnh báo hệ thống",
          message: data.message || "Hệ thống gặp sự cố nhẹ",
          type: "warning",
          priority: "high",
          recipientType: "admin",
          source: "System Monitoring",
        },
        system_error: {
          title: "Lỗi hệ thống",
          message: data.message || "Đã xảy ra lỗi hệ thống",
          type: "error",
          priority: "critical",
          recipientType: "admin",
          source: "System Monitoring",
        },
      };

      const template = notificationTemplates[type];
      if (!template) {
        throw new Error(`Notification template for type '${type}' not found`);
      }

      const response = await this.createSystemNotification({
        ...template,
        metadata: data,
      });

      return response;
    } catch (error) {
      console.error("Error creating auto system notification:", error);
      throw error;
    }
  },

  // 🎯 Xử lý batch operations
  async batchMarkAsRead(notificationIds, keycloakId) {
    try {
      const promises = notificationIds.map((notificationId) =>
        this.markUserNotificationAsRead(notificationId, keycloakId)
      );
      const results = await Promise.allSettled(promises);

      const successful = results.filter(
        (result) => result.status === "fulfilled"
      ).length;
      const failed = results.filter(
        (result) => result.status === "rejected"
      ).length;

      return {
        successful,
        failed,
        total: notificationIds.length,
      };
    } catch (error) {
      console.error("Error in batch mark as read:", error);
      throw error;
    }
  },
};

export default notificationService;
