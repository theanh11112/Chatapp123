import api from "../utils/axios";

const taskService = {
  // 🆕 Tạo task mới - THÊM keycloakId vào body
  async createTask(taskData) {
    try {
      console.log("1111", taskData);
      const response = await api.post("/tasks/create", {
        ...taskData,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  },

  // 🆕 Lấy danh sách tasks của user - keycloakId đã có trong body
  async getUserTasks(keycloakId, filters = {}) {
    console.log("111111", keycloakId);
    try {
      const response = await api.post("/tasks/get-user-tasks", {
        keycloakId,
        ...filters,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      throw error;
    }
  },

  // 🆕 Lấy chi tiết task - THÊM keycloakId vào body
  async getTaskDetail(taskId, keycloakId) {
    try {
      const response = await api.post("/tasks/get-detail", {
        taskId,
        keycloakId, // 🆕 ĐÃ CÓ
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching task detail:", error);
      throw error;
    }
  },

  // 🆕 Cập nhật task - THÊM keycloakId vào body
  async updateTask(taskId, keycloakId, updates) {
    try {
      const response = await api.patch("/tasks/update", {
        taskId,
        keycloakId, // 🆕 ĐÃ CÓ
        updates,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  },

  // 🆕 Xóa task - THÊM keycloakId vào body
  async deleteTask(taskId, keycloakId) {
    try {
      const response = await api.post("/tasks/delete", {
        taskId,
        keycloakId, // 🆕 ĐÃ CÓ
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  },

  // 🆕 Lấy reminders của user - THÊM keycloakId vào body
  async getUserReminders(keycloakId, page = 1, limit = 20) {
    try {
      const response = await api.post("/tasks/reminders/get-user-reminders", {
        keycloakId, // 🆕 ĐÃ CÓ
        page,
        limit,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user reminders:", error);
      throw error;
    }
  },

  // 🆕 Tạo reminder mới - THÊM keycloakId vào body
  async createReminder(reminderData, keycloakId) {
    try {
      const response = await api.post("/tasks/reminder/create", {
        ...reminderData,
        keycloakId, // 🆕 THÊM keycloakId vào body
      });
      return response.data;
    } catch (error) {
      console.error("Error creating reminder:", error);
      throw error;
    }
  },

  // 🆕 Lấy task statistics - sử dụng keycloakId từ Redux
  async getTaskStats(keycloakId) {
    try {
      const userTasks = await this.getUserTasks(keycloakId);

      const totalTasks = userTasks.data?.length || 0;
      const completedTasks =
        userTasks.data?.filter((task) => task.status === "done").length || 0;

      return {
        totalTasks,
        completedTasks,
      };
    } catch (error) {
      console.error("Error fetching task stats:", error);
      return {
        totalTasks: 0,
        completedTasks: 0,
      };
    }
  },
};

export default taskService;
