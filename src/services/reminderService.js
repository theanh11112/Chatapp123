// src/services/reminderService.js - ĐÃ CẬP NHẬT (KHÔNG CÓ RECIPIENT_IDS)
import api from "../utils/axios";

const reminderService = {
  // 🎯 Tạo reminder mới - ĐÃ CẬP NHẬT: KHÔNG CÓ RECIPIENT_IDS
  async createReminder(reminderData) {
    try {
      const response = await api.post("/reminders/create", {
        ...reminderData,
        // 🆕 LOẠI BỎ recipientIds - backend sẽ tự set = keycloakId
      });
      return response.data;
    } catch (error) {
      console.error("Error creating reminder:", error);
      throw error;
    }
  },

  // 🎯 Lấy danh sách reminders của user - GIỮ NGUYÊN
  async getUserReminders(keycloakId, filters = {}) {
    try {
      const response = await api.post("/reminders/get-user-reminders", {
        keycloakId,
        ...filters,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user reminders:", error);
      throw error;
    }
  },

  // 🎯 Lấy chi tiết reminder - GIỮ NGUYÊN
  async getReminderDetail(reminderId, keycloakId) {
    try {
      const response = await api.post("/reminders/get-detail", {
        reminderId,
        keycloakId,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching reminder detail:", error);
      throw error;
    }
  },

  // 🎯 Cập nhật reminder - ĐÃ CẬP NHẬT: KHÔNG CÓ RECIPIENT_IDS
  async updateReminder(reminderId, keycloakId, updates) {
    try {
      // 🆕 LOẠI BỎ recipientIds khỏi updates nếu có
      const { recipientIds, ...cleanUpdates } = updates;

      const response = await api.patch("/reminders/update", {
        reminderId,
        keycloakId,
        updates: cleanUpdates,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating reminder:", error);
      throw error;
    }
  },

  // 🎯 Xóa reminder - GIỮ NGUYÊN
  async deleteReminder(reminderId, keycloakId) {
    try {
      const response = await api.post("/reminders/delete", {
        reminderId,
        keycloakId,
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting reminder:", error);
      throw error;
    }
  },

  // 🎯 Lấy reminders sắp tới (cho dashboard) - GIỮ NGUYÊN
  async getUpcomingReminders(keycloakId, limit = 10) {
    try {
      const response = await api.post("/reminders/upcoming", {
        keycloakId,
        limit,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching upcoming reminders:", error);
      throw error;
    }
  },

  // 🎯 Đánh dấu reminder đã gửi (dùng cho cron job - internal)
  async markReminderAsSent(reminderId) {
    try {
      const response = await api.patch("/reminders/mark-sent", {
        reminderId,
      });
      return response.data;
    } catch (error) {
      console.error("Error marking reminder as sent:", error);
      throw error;
    }
  },

  // 🎯 Lấy reminder statistics - ĐÃ CẬP NHẬT
  async getReminderStats(keycloakId) {
    try {
      const userReminders = await this.getUserReminders(keycloakId, {
        showSent: true,
      });

      const totalReminders = userReminders.data?.length || 0;
      const upcomingReminders =
        userReminders.data?.filter(
          (reminder) =>
            !reminder.isSent && new Date(reminder.remindAt) > new Date()
        ).length || 0;
      const sentReminders =
        userReminders.data?.filter((reminder) => reminder.isSent).length || 0;

      return {
        totalReminders,
        upcomingReminders,
        sentReminders,
      };
    } catch (error) {
      console.error("Error fetching reminder stats:", error);
      return {
        totalReminders: 0,
        upcomingReminders: 0,
        sentReminders: 0,
      };
    }
  },

  // 🎯 Tạo reminder tự động từ task due date - ĐÃ CẬP NHẬT: CHỈ CHO CHÍNH MÌNH
  async createDueDateReminder(taskId, keycloakId, dueDate, message = null) {
    try {
      // Tạo reminder trước due date 1 ngày
      const remindAt = new Date(dueDate);
      remindAt.setDate(remindAt.getDate() - 1);

      const reminderData = {
        taskId,
        keycloakId,
        remindAt: remindAt.toISOString(),
        title: `Nhắc nhở hạn task`,
        description:
          message ||
          `Task của bạn sắp đến hạn vào ${new Date(dueDate).toLocaleDateString(
            "vi-VN"
          )}`,
        reminderType: "due_date",
        // 🆕 KHÔNG CÓ recipientIds - backend sẽ tự set = keycloakId
      };

      const response = await api.post("/reminders/create", reminderData);
      return response.data;
    } catch (error) {
      console.error("Error creating due date reminder:", error);
      throw error;
    }
  },

  // 🎯 Tạo reminder tự động từ task start date - ĐÃ CẬP NHẬT: CHỈ CHO CHÍNH MÌNH
  async createStartDateReminder(taskId, keycloakId, startDate, message = null) {
    try {
      // Tạo reminder vào chính start date
      const remindAt = new Date(startDate);

      const reminderData = {
        taskId,
        keycloakId,
        remindAt: remindAt.toISOString(),
        title: `Nhắc nhở bắt đầu task`,
        description: message || `Task của bạn bắt đầu vào hôm nay`,
        reminderType: "start_date",
        // 🆕 KHÔNG CÓ recipientIds - backend sẽ tự set = keycloakId
      };

      const response = await api.post("/reminders/create", reminderData);
      return response.data;
    } catch (error) {
      console.error("Error creating start date reminder:", error);
      throw error;
    }
  },

  // 🎯 Lấy reminders theo task - ĐÃ CẬP NHẬT
  async getRemindersByTask(taskId, keycloakId) {
    try {
      const userReminders = await this.getUserReminders(keycloakId, {
        showSent: true,
      });

      const taskReminders =
        userReminders.data?.filter(
          (reminder) =>
            reminder.taskId?._id === taskId || reminder.taskId === taskId
        ) || [];

      return {
        status: "success",
        data: taskReminders,
        results: taskReminders.length,
      };
    } catch (error) {
      console.error("Error fetching reminders by task:", error);
      throw error;
    }
  },

  // 🎯 Xóa tất cả reminders của task
  async deleteTaskReminders(taskId, keycloakId) {
    try {
      const taskReminders = await this.getRemindersByTask(taskId, keycloakId);

      // Xóa từng reminder
      const deletePromises = taskReminders.data.map((reminder) =>
        this.deleteReminder(reminder._id, keycloakId)
      );

      await Promise.all(deletePromises);

      return {
        status: "success",
        message: `Đã xóa ${taskReminders.results} reminders của task`,
        deletedCount: taskReminders.results,
      };
    } catch (error) {
      console.error("Error deleting task reminders:", error);
      throw error;
    }
  },

  // 🎯 Tạo reminder cá nhân (không liên quan task) - ĐÃ CẬP NHẬT: CHỈ CHO CHÍNH MÌNH
  async createPersonalReminder(keycloakId, title, description, remindAt) {
    try {
      const reminderData = {
        keycloakId,
        title,
        description,
        remindAt,
        reminderType: "personal",
        // 🆕 KHÔNG CÓ recipientIds - backend sẽ tự set = keycloakId
      };

      const response = await api.post("/reminders/create", reminderData);
      return response.data;
    } catch (error) {
      console.error("Error creating personal reminder:", error);
      throw error;
    }
  },

  // 🎯 Tạo reminder cho meeting/event - ĐÃ CẬP NHẬT: CHỈ CHO CHÍNH MÌNH
  async createMeetingReminder(
    keycloakId,
    title,
    description,
    remindAt,
    location = ""
  ) {
    try {
      const reminderData = {
        keycloakId,
        title,
        description: location
          ? `${description} - Địa điểm: ${location}`
          : description,
        remindAt,
        reminderType: "meeting",
        // 🆕 KHÔNG CÓ recipientIds - backend sẽ tự set = keycloakId
      };

      const response = await api.post("/reminders/create", reminderData);
      return response.data;
    } catch (error) {
      console.error("Error creating meeting reminder:", error);
      throw error;
    }
  },

  // 🎯 Lọc reminders theo type - ĐÃ CẬP NHẬT
  async getRemindersByType(keycloakId, reminderType, filters = {}) {
    try {
      const userReminders = await this.getUserReminders(keycloakId, filters);

      const filteredReminders =
        userReminders.data?.filter(
          (reminder) => reminder.reminderType === reminderType
        ) || [];

      return {
        status: "success",
        data: filteredReminders,
        results: filteredReminders.length,
      };
    } catch (error) {
      console.error("Error fetching reminders by type:", error);
      throw error;
    }
  },

  // 🎯 Tìm kiếm reminders - ĐÃ CẬP NHẬT
  async searchReminders(keycloakId, searchTerm, filters = {}) {
    try {
      const userReminders = await this.getUserReminders(keycloakId, filters);

      const searchResults =
        userReminders.data?.filter(
          (reminder) =>
            reminder.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reminder.description
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase())
        ) || [];

      return {
        status: "success",
        data: searchResults,
        results: searchResults.length,
      };
    } catch (error) {
      console.error("Error searching reminders:", error);
      throw error;
    }
  },

  // 🆕 Hàm tiện ích: Tạo reminder nhanh
  async createQuickReminder(keycloakId, title, hoursFromNow = 24) {
    try {
      const remindAt = new Date();
      remindAt.setHours(remindAt.getHours() + hoursFromNow);

      const reminderData = {
        keycloakId,
        title,
        description: "Nhắc nhở nhanh",
        remindAt: remindAt.toISOString(),
        reminderType: "personal",
      };

      const response = await api.post("/reminders/create", reminderData);
      return response.data;
    } catch (error) {
      console.error("Error creating quick reminder:", error);
      throw error;
    }
  },

  // 🆕 Hàm tiện ích: Tạo reminder lặp lại (hàng ngày/tuần/tháng)
  async createRecurringReminder(
    keycloakId,
    title,
    description,
    startDate,
    recurrence = "daily", // daily, weekly, monthly
    occurrences = 5 // số lần lặp lại
  ) {
    try {
      const reminders = [];
      const start = new Date(startDate);

      for (let i = 0; i < occurrences; i++) {
        const remindAt = new Date(start);

        switch (recurrence) {
          case "daily":
            remindAt.setDate(remindAt.getDate() + i);
            break;
          case "weekly":
            remindAt.setDate(remindAt.getDate() + i * 7);
            break;
          case "monthly":
            remindAt.setMonth(remindAt.getMonth() + i);
            break;
          default:
            remindAt.setDate(remindAt.getDate() + i);
        }

        const reminderData = {
          keycloakId,
          title: `${title} (${i + 1}/${occurrences})`,
          description,
          remindAt: remindAt.toISOString(),
          reminderType: "personal",
        };

        reminders.push(this.createReminder(reminderData));
      }

      const results = await Promise.all(reminders);
      return {
        status: "success",
        message: `Đã tạo ${occurrences} reminders lặp lại`,
        data: results,
      };
    } catch (error) {
      console.error("Error creating recurring reminder:", error);
      throw error;
    }
  },

  // 🆕 Hàm tiện ích: Lấy reminders trong khoảng thời gian
  async getRemindersInDateRange(keycloakId, startDate, endDate, filters = {}) {
    try {
      const userReminders = await this.getUserReminders(keycloakId, filters);

      const start = new Date(startDate);
      const end = new Date(endDate);

      const rangeReminders =
        userReminders.data?.filter((reminder) => {
          const remindDate = new Date(reminder.remindAt);
          return remindDate >= start && remindDate <= end;
        }) || [];

      return {
        status: "success",
        data: rangeReminders,
        results: rangeReminders.length,
      };
    } catch (error) {
      console.error("Error fetching reminders in date range:", error);
      throw error;
    }
  },
};

export default reminderService;
