// src/services/notificationService.js
import api from "../utils/axios";
import userService from "./userService"; // Import user service để lấy thông tin user

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

  async showMessageNotification(message, settings, isGroup = false) {
    // Kiểm tra cài đặt thông báo
    if (!settings.message || this.permission !== "granted") {
      return null;
    }

    // LẤY THÔNG TIN NGƯỜI GỬI TỪ KEYCLOAK ID
    let senderInfo = {
      username: "Ai đó",
      avatar: "/default-avatar.png",
    };

    try {
      if (message.sender?.keycloakId) {
        const userData = await userService.getUserById(
          message.sender.keycloakId
        );
        if (userData) {
          senderInfo = {
            username: userData.fullName || userData.username,
            avatar: userData.avatar,
          };
        }
      } else if (message.sender?.username) {
        // Fallback nếu có username nhưng không có keycloakId
        senderInfo = {
          username: message.sender.username,
          avatar: message.sender.avatar || "/default-avatar.png",
        };
      }
    } catch (error) {
      console.warn("❌ Cannot fetch sender info, using fallback:", error);
    }

    const title = isGroup
      ? `Tin nhắn nhóm từ ${senderInfo.username}`
      : `Tin nhắn mới từ ${senderInfo.username}`;

    const options = {
      body: settings.preview
        ? this.truncateMessage(message.content || message.message)
        : "Bạn có tin nhắn mới",
      icon: senderInfo.avatar,
      badge: "/badge.png",
      tag: "chat-message",
      requireInteraction: false,
      silent: !settings.sound,
      data: {
        messageId: message._id || message.id,
        roomId: message.room_id || message.conversation_id,
        isGroup: isGroup,
        timestamp: new Date().toISOString(),
      },
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
        this.handleNotificationClick(notification.data, isGroup);
      };

      // Xử lý đóng notification
      notification.onclose = () => {
        console.log("Notification closed:", notification.data);
      };

      // Tự động đóng sau 5 giây
      setTimeout(() => {
        if (notification.close) {
          notification.close();
        }
      }, 5000);

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      return null;
    }
  }

  truncateMessage(message, maxLength = 50) {
    if (!message) return "Tin nhắn mới";

    // Xử lý message có thể là string hoặc object
    const messageText =
      typeof message === "string"
        ? message
        : message.content || message.message || "Tin nhắn mới";

    return messageText.length > maxLength
      ? messageText.substring(0, maxLength) + "..."
      : messageText;
  }

  handleNotificationClick(notificationData, isGroup = false) {
    console.log("Notification clicked:", { notificationData, isGroup });

    // Điều hướng đến conversation dựa trên thông tin notification
    if (notificationData.roomId) {
      if (isGroup) {
        // Điều hướng đến group chat
        window.location.href = `/group/${notificationData.roomId}`;
      } else {
        // Điều hướng đến direct chat
        window.location.href = `/chat/${notificationData.roomId}`;
      }
    } else {
      console.warn("No roomId found in notification data");
    }
  }

  playNotificationSound() {
    try {
      // Sử dụng Web Audio API để phát âm thanh
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext ||
          window.webkitAudioContext)();
      }

      // Chỉ phát âm thanh nếu context không bị suspended
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
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
      console.warn("Cannot play notification sound with Web Audio API:", error);
      // Fallback: Sử dụng HTML5 Audio
      this.playFallbackSound();
    }
  }

  playFallbackSound() {
    try {
      // Sử dụng âm thanh notification mặc định của browser
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiP1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiP1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmUgBjiP1/LMeSw=="
      );
      audio.volume = 0.3;

      // Xử lý lỗi phát âm thanh
      audio.play().catch((e) => {
        console.log("Không thể phát âm thanh fallback:", e);
        // Thử phương pháp khác
        this.playSimpleBeep();
      });
    } catch (error) {
      console.log("Fallback sound also failed, trying simple beep");
      this.playSimpleBeep();
    }
  }

  playSimpleBeep() {
    // Phương pháp đơn giản nhất - tạo beep bằng oscillator
    try {
      const audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      gainNode.gain.value = 0.1;

      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
      }, 100);
    } catch (error) {
      console.log("All sound methods failed");
    }
  }

  async requestPermission() {
    if (!("Notification" in window)) {
      console.warn("Browser không hỗ trợ notifications");
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      return this.permission === "granted";
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      return false;
    }
  }

  isSupported() {
    return "Notification" in window;
  }

  getPermission() {
    return this.permission;
  }

  // Phương thức để test thông báo
  async testNotification(settings) {
    const testMessage = {
      sender: {
        keycloakId: "test-user-123",
        username: "Người dùng thử nghiệm",
        avatar: "",
      },
      content: "Đây là thông báo thử nghiệm từ hệ thống!",
      conversation_id: "test-conversation",
      room_id: "test-group",
      _id: "test-message-123",
    };

    // Test direct message
    await this.showMessageNotification(testMessage, settings, false);

    // Test group message
    await this.showMessageNotification(testMessage, settings, true);
  }

  // 🆕 THÊM: Phương thức hiển thị thông báo hệ thống
  async showSystemNotification(title, message, options = {}) {
    if (this.permission !== "granted") {
      console.warn("Notification permission not granted");
      return null;
    }

    const notificationOptions = {
      body: message,
      icon: options.icon || "/default-avatar.png",
      badge: "/badge.png",
      tag: options.tag || "system-notification",
      requireInteraction: options.requireInteraction || false,
      silent: options.silent || false,
      data: options.data || {},
    };

    try {
      const notification = new Notification(title, notificationOptions);

      if (options.onClick) {
        notification.onclick = options.onClick;
      }

      if (options.autoClose !== false) {
        setTimeout(() => {
          if (notification.close) {
            notification.close();
          }
        }, options.duration || 5000);
      }

      return notification;
    } catch (error) {
      console.error("Error creating system notification:", error);
      return null;
    }
  }

  // 🆕 THÊM: Đóng tất cả thông báo
  closeAllNotifications() {
    // This is a workaround since there's no direct way to close all notifications
    console.log("Cannot programmatically close all notifications in browser");
  }
}

// 🏠 Dashboard thông báo
const getDashboard = async () => {
  try {
    const response = await api.get("/notifications/dashboard");
    return response.data;
  } catch (error) {
    console.error("Error fetching notification dashboard:", error);
    // Trả về data mặc định thay vì throw error
    return {
      status: "error",
      message:
        error.response?.data?.message || "Lỗi khi tải dashboard thông báo",
      data: null,
    };
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
    // Trả về data mặc định thay vì throw error
    return {
      status: "error",
      message: error.response?.data?.message || "Lỗi khi tải thông báo admin",
      data: [],
    };
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
    console.log("📨 Creating system notification:", notificationData);

    const response = await api.post(
      "/notifications/admin/notifications/create",
      {
        ...notificationData,
      }
    );

    console.log("✅ System notification created:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error creating system notification:", error);
    console.error("❌ Error details:", error.response?.data);

    return {
      status: "error",
      message:
        error.response?.data?.message || "Lỗi khi tạo thông báo hệ thống",
      data: null,
    };
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
    // Trả về data mặc định thay vì throw error
    return {
      status: "error",
      message:
        error.response?.data?.message || "Lỗi khi tải thông báo người dùng",
      data: [],
    };
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
    // Trả về data mặc định
    return {
      status: "error",
      message:
        error.response?.data?.message ||
        "Lỗi khi tải số lượng thông báo chưa đọc",
      data: { unreadCount: 0 },
    };
  }
};

// ==================== STATISTICS ====================

// 📊 Thống kê cơ bản thông báo
const getNotificationStats = async () => {
  try {
    const response = await api.get("/notifications/notifications/stats");

    if (response.data && response.data.status === "success") {
      return response.data;
    } else {
      console.warn("Unexpected response structure:", response.data);
      return {
        status: "success",
        data: {
          total: 0,
          unread: 0,
          read: 0,
          todayCount: 0,
          thisWeekCount: 0,
          byType: {
            info: 0,
            warning: 0,
            error: 0,
            success: 0,
          },
        },
      };
    }
  } catch (error) {
    console.error("Error fetching notification stats:", error);
    return {
      status: "error",
      message:
        error.response?.data?.message || "Lỗi khi tải thống kê thông báo",
      data: {
        total: 0,
        unread: 0,
        read: 0,
        todayCount: 0,
        thisWeekCount: 0,
        byType: {
          info: 0,
          warning: 0,
          error: 0,
          success: 0,
        },
      },
    };
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
    // Trả về data mặc định thay vì throw error
    return {
      status: "error",
      message: error.response?.data?.message || "Lỗi khi tải thống kê chi tiết",
      data: {
        dailyStats: [],
        typeDistribution: {},
        readRate: 0,
      },
    };
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
    console.log("🎯 Creating auto system notification:", type, data);

    // LẤY THÔNG TIN USER NẾU CÓ TRONG DATA
    let completerName = data.completerName || "Người dùng";
    let updaterName = data.updaterName || "Người dùng";

    // Nếu có keycloakId, lấy thông tin user
    if (data.completerKeycloakId) {
      try {
        const userInfo = await userService.getUserById(
          data.completerKeycloakId
        );
        completerName = userInfo.username;
      } catch (error) {
        console.warn("Cannot fetch completer info:", error);
      }
    }

    if (data.updaterKeycloakId) {
      try {
        const userInfo = await userService.getUserById(data.updaterKeycloakId);
        updaterName = userInfo.fullName;
      } catch (error) {
        console.warn("Cannot fetch updater info:", error);
      }
    }

    const notificationTemplates = {
      task_created: {
        title: "Task mới được tạo",
        message: `Task "${data.taskTitle}" đã được tạo bởi admin`,
        type: "info",
        priority: "medium",
        recipientType: "admin",
        source: "Task Management",
        actionUrl: `/tasks/${data.taskId}`,
      },
      task_completed: {
        title: "Task đã hoàn thành",
        message: `Task "${data.taskTitle}" đã được hoàn thành bởi ${completerName}`,
        type: "success",
        priority: "medium",
        recipientType: "admin",
        source: "Task Management",
        actionUrl: `/tasks/${data.taskId}`,
      },
      task_updated: {
        title: "Task đã được cập nhật",
        message: `Task "${data.taskTitle}" đã được cập nhật bởi ${updaterName}`,
        type: "warning",
        priority: "medium",
        recipientType: "admin",
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
      user_joined: {
        title: "Người dùng mới tham gia",
        message: `Người dùng ${data.userName} đã tham gia hệ thống`,
        type: "info",
        priority: "low",
        recipientType: "admin",
        source: "User Management",
      },
      new_message: {
        title: "Tin nhắn mới",
        message: `Bạn có tin nhắn mới từ ${data.senderName}`,
        type: "info",
        priority: "medium",
        recipientType: "user",
        source: "Chat System",
        actionUrl: `/chat/${data.conversationId}`,
      },
    };

    const template = notificationTemplates[type];
    if (!template) {
      throw new Error(`Notification template for type '${type}' not found`);
    }

    console.log("📝 Using template:", template);

    const response = await createSystemNotification({
      ...template,
      metadata: data,
      createdBy: "system_auto",
    });

    console.log("✅ Auto notification created successfully:", response);
    return response;
  } catch (error) {
    console.error("❌ Error creating auto system notification:", error);
    return {
      status: "error",
      message: error.message,
    };
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

// 🆕 THÊM: Bulk delete notifications
const bulkDeleteNotifications = async (
  notificationIds,
  keycloakId,
  isAdmin = false
) => {
  try {
    if (isAdmin) {
      // Admin có thể xóa nhiều thông báo
      const promises = notificationIds.map((notificationId) =>
        deleteNotification(notificationId)
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
    } else {
      // User chỉ có thể đánh dấu là ẩn (soft delete)
      console.log("Users can only soft delete notifications");
      return {
        successful: 0,
        failed: notificationIds.length,
        total: notificationIds.length,
        message:
          "Users can only hide notifications, not permanently delete them",
      };
    }
  } catch (error) {
    console.error("Error in bulk delete:", error);
    throw error;
  }
};

// 🆕 THÊM: Lấy thông báo theo loại
const getNotificationsByType = async (keycloakId, type, filters = {}) => {
  try {
    const response = await api.post("/notifications/notifications/by-type", {
      userId: keycloakId,
      type,
      ...filters,
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching notifications by type:", error);
    return {
      status: "error",
      message:
        error.response?.data?.message || "Lỗi khi tải thông báo theo loại",
      data: [],
    };
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
  bulkDeleteNotifications,
  getNotificationsByType,

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
  showSystemNotification: (title, message, options) =>
    browserNotificationService.showSystemNotification(title, message, options),
};

export default notificationService;
