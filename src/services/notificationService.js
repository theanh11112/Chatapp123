// src/services/notificationService.js
import api from "../utils/axios";

class BrowserNotificationService {
  constructor() {
    this.permission = null;
    this.audioContext = null;
    this.init();
  }

  async init() {
    if (!("Notification" in window)) {
      console.warn("Browser không hỗ trợ notifications");
      return;
    }

    this.permission = Notification.permission;

    if (this.permission === "default") {
      this.permission = await Notification.requestPermission();
    }
  }

  showMessageNotification(message, settings, isGroup = false) {
    // Kiểm tra cài đặt thông báo
    if (!settings.message || this.permission !== "granted") {
      return null;
    }

    const senderName =
      message.sender?.username || message.sender?.name || "Ai đó";
    const title = isGroup
      ? `Tin nhắn nhóm từ ${senderName}`
      : `Tin nhắn mới từ ${senderName}`;

    const options = {
      body: settings.preview
        ? this.truncateMessage(message.content || message.message)
        : "Bạn có tin nhắn mới",
      icon: message.sender?.avatar || "/default-avatar.png",
      badge: "/badge.png",
      tag: "chat-message",
      requireInteraction: false,
      silent: !settings.sound, // Tắt âm thanh nếu setting sound là false
    };

    try {
      const notification = new Notification(title, options);

      // Thêm âm thanh nếu được bật
      if (settings.sound) {
        this.playNotificationSound();
      }

      // Xử lý click notification
      notification.onclick = () => {
        window.focus();
        notification.close();
        this.handleNotificationClick(message, isGroup);
      };

      // Tự động đóng sau 5 giây
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  truncateMessage(message, maxLength = 50) {
    if (!message) return "Tin nhắn mới";
    return message.length > maxLength
      ? message.substring(0, maxLength) + "..."
      : message;
  }

  handleNotificationClick(message, isGroup = false) {
    // Điều hướng đến conversation
    console.log("Notification clicked:", { message, isGroup });

    // Ví dụ: Điều hướng đến conversation
    // if (isGroup) {
    //   window.location.href = `/group/${message.room_id}`;
    // } else {
    //   window.location.href = `/chat/${message.conversation_id}`;
    // }
  }

  playNotificationSound() {
    try {
      // Sử dụng Web Audio API để phát âm thanh
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
      }

      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
      oscillator.frequency.setValueAtTime(
        600,
        this.audioContext.currentTime + 0.1
      );

      gainNode.gain.setValueAtTime(0.3, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.01,
        this.audioContext.currentTime + 0.3
      );

      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + 0.3);
    } catch (error) {
      console.warn("Cannot play notification sound:", error);
      // Fallback: Sử dụng HTML5 Audio
      this.playFallbackSound();
    }
  }

  playFallbackSound() {
    try {
      // Tạo âm thanh đơn giản bằng base64
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiP1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiP1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiP1/LMeSw=="
      );
      audio.volume = 0.3;
      audio
        .play()
        .catch((e) => console.log("Không thể phát âm thanh fallback:", e));
    } catch (error) {
      console.log("Fallback sound also failed");
    }
  }

  async requestPermission() {
    if (!("Notification" in window)) return false;

    this.permission = await Notification.requestPermission();
    return this.permission === "granted";
  }

  isSupported() {
    return "Notification" in window;
  }

  getPermission() {
    return this.permission;
  }

  // Phương thức để test thông báo
  testNotification(settings) {
    const testMessage = {
      sender: {
        username: "Người dùng thử nghiệm",
        avatar: "",
      },
      content: "Đây là thông báo thử nghiệm từ hệ thống!",
      conversation_id: "test",
      room_id: "test-group",
    };

    this.showMessageNotification(testMessage, settings, false);
    this.showMessageNotification(testMessage, settings, true);
  }
}

// 🏠 Dashboard thông báo
const getDashboard = async () => {
  try {
    const response = await api.get("/notifications/dashboard");
    return response.data;
  } catch (error) {
    console.error("Error fetching notification dashboard:", error);
    throw error;
  }
};

// ==================== ADMIN NOTIFICATIONS ====================

// 📋 Lấy danh sách thông báo cho admin
const getAllAdminNotifications = async (filters = {}) => {
  try {
    const response = await api.post("/notifications/admin/notifications", {
      ...filters,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching admin notifications:", error);
    throw error;
  }
};

// ✅ Đánh dấu thông báo đã đọc (admin)
const markNotificationAsRead = async (notificationId) => {
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
};

// 🗑️ Xóa thông báo (admin)
const deleteNotification = async (notificationId) => {
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
};

// ➕ Tạo thông báo hệ thống (cho admin)
const createSystemNotification = async (notificationData) => {
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
};

// ==================== USER NOTIFICATIONS ====================

// 📱 Lấy thông báo cho người dùng thông thường
const getUserNotifications = async (keycloakId, filters = {}) => {
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
};

// ✅ Đánh dấu thông báo đã đọc (user)
const markUserNotificationAsRead = async (notificationId, keycloakId) => {
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
};

// ✅ Đánh dấu tất cả thông báo là đã đọc (user)
const markAllNotificationsAsRead = async (keycloakId, userRoles = []) => {
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
};

// 🔢 Lấy số lượng thông báo chưa đọc (user)
const getUnreadNotificationsCount = async (keycloakId, userRoles = []) => {
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
};

// ==================== STATISTICS ====================

// 📊 Thống kê cơ bản thông báo
const getNotificationStats = async () => {
  try {
    const response = await api.get("/notifications/notifications/stats");
    return response.data;
  } catch (error) {
    console.error("Error fetching notification stats:", error);
    throw error;
  }
};

// 📈 Thống kê chi tiết thông báo
const getDetailedNotificationStats = async (days = 30) => {
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
};

// ==================== UTILITY METHODS ====================

// 🎯 Lấy thông báo cho dashboard admin
const getNotificationsForAdminDashboard = async (keycloakId) => {
  try {
    const [adminNotifications, stats] = await Promise.all([
      getAllAdminNotifications({ page: 1, limit: 10 }),
      getNotificationStats(),
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
};

// 🎯 Lấy thông báo cho dashboard user
const getNotificationsForUserDashboard = async (keycloakId, userRoles = []) => {
  try {
    const [userNotifications, unreadCount] = await Promise.all([
      getUserNotifications(keycloakId, { page: 1, limit: 10 }),
      getUnreadNotificationsCount(keycloakId, userRoles),
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
};

// 🎯 Tạo thông báo hệ thống tự động
const createAutoSystemNotification = async (type, data) => {
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

    const response = await createSystemNotification({
      ...template,
      metadata: data,
    });

    return response;
  } catch (error) {
    console.error("Error creating auto system notification:", error);
    throw error;
  }
};

// 🎯 Xử lý batch operations
const batchMarkAsRead = async (notificationIds, keycloakId) => {
  try {
    const promises = notificationIds.map((notificationId) =>
      markUserNotificationAsRead(notificationId, keycloakId)
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
};

// Tạo instance của BrowserNotificationService
const browserNotificationService = new BrowserNotificationService();

// Export combined service
const notificationService = {
  // Browser Notification Methods
  browser: browserNotificationService,

  // API Methods
  getDashboard,
  getAllAdminNotifications,
  markNotificationAsRead,
  deleteNotification,
  createSystemNotification,
  getUserNotifications,
  markUserNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationsCount,
  getNotificationStats,
  getDetailedNotificationStats,
  getNotificationsForAdminDashboard,
  getNotificationsForUserDashboard,
  createAutoSystemNotification,
  batchMarkAsRead,

  // Convenience methods for backward compatibility
  showMessageNotification: (message, settings, isGroup = false) =>
    browserNotificationService.showMessageNotification(
      message,
      settings,
      isGroup
    ),
  testNotification: (settings) =>
    browserNotificationService.testNotification(settings),
  requestPermission: () => browserNotificationService.requestPermission(),
  getPermission: () => browserNotificationService.getPermission(),
  isSupported: () => browserNotificationService.isSupported(),
};

export default notificationService;
