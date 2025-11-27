// src/services/reminderService.js
import api from "../utils/axios";

const reminderService = {
  // 🆕 Tạo reminder mới
  async createReminder(reminderData) {
    try {
      const response = await api.post("/reminders/create", {
        ...reminderData,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating reminder:", error);
      throw error;
    }
  },

  // 🆕 Lấy danh sách reminders của user
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

  // 🆕 Lấy chi tiết reminder
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

  // 🆕 Cập nhật reminder
  async updateReminder(reminderId, keycloakId, updates) {
    try {
      const response = await api.patch("/reminders/update", {
        reminderId,
        keycloakId,
        updates,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating reminder:", error);
      throw error;
    }
  },

  // 🆕 Xóa reminder
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

  // 🆕 Lấy reminders sắp tới (cho dashboard)
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

  // 🆕 Đánh dấu reminder đã gửi (dùng cho cron job - internal)
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

  // 🆕 Lấy reminder statistics
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

  // 🆕 Tạo reminder tự động từ task due date
  async createDueDateReminder(taskId, keycloakId, dueDate, message = null) {
    try {
      // Tạo reminder trước due date 1 ngày
      const remindAt = new Date(dueDate);
      remindAt.setDate(remindAt.getDate() - 1);

      const reminderData = {
        taskId,
        keycloakId,
        remindAt: remindAt.toISOString(),
        message:
          message ||
          `Task của bạn sắp đến hạn vào ${new Date(dueDate).toLocaleDateString(
            "vi-VN"
          )}`,
        reminderType: "due_date",
      };

      const response = await api.post("/reminders/create", reminderData);
      return response.data;
    } catch (error) {
      console.error("Error creating due date reminder:", error);
      throw error;
    }
  },

  // 🆕 Tạo reminder tự động từ task start date
  async createStartDateReminder(taskId, keycloakId, startDate, message = null) {
    try {
      // Tạo reminder vào chính start date
      const remindAt = new Date(startDate);

      const reminderData = {
        taskId,
        keycloakId,
        remindAt: remindAt.toISOString(),
        message: message || `Task của bạn bắt đầu vào hôm nay`,
        reminderType: "start_date",
      };

      const response = await api.post("/reminders/create", reminderData);
      return response.data;
    } catch (error) {
      console.error("Error creating start date reminder:", error);
      throw error;
    }
  },

  // 🆕 Lấy reminders theo task
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

  // 🆕 Xóa tất cả reminders của task
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
};

export default reminderService;
