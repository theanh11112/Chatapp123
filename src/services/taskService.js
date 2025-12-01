// src/services/taskService.js - HOÀN CHỈNH ĐÃ CẬP NHẬT
import api from "../utils/axios";

const taskService = {
  // 🎯 Tạo task mới - ĐÃ CẬP NHẬT VỚI MULTIPLE ASSIGNEES
  async createTask(taskData) {
    try {
      console.log("🎯 Creating task with data:", taskData);
      const response = await api.post("/tasks/create", {
        ...taskData,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating task:", error);
      throw error;
    }
  },

  // 🎯 Lấy danh sách tasks của user - ĐÃ CẬP NHẬT VỚI VIEWTYPE BẮT BUỘC
  async getUserTasks(keycloakId, filters = {}) {
    try {
      console.log(
        "🎯 Fetching user tasks for:",
        keycloakId,
        "with viewType:",
        filters.viewType
      );

      // 🆕 VALIDATE: Đảm bảo có viewType
      if (!filters.viewType) {
        console.error("❌ viewType is required");
        return {
          status: "error",
          message: "viewType is required. Use 'assigned' or 'created'",
          data: [],
        };
      }

      const response = await api.post("/tasks/get-user-tasks", {
        keycloakId,
        ...filters,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user tasks:", error);

      // Trả về response error thân thiện
      return {
        status: "error",
        message: error.response?.data?.message || "Lỗi khi tải danh sách tasks",
        data: [],
      };
    }
  },

  // 🎯 Lấy chi tiết task
  async getTaskDetail(taskId, keycloakId) {
    try {
      const response = await api.post("/tasks/get-detail", {
        taskId,
        keycloakId,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching task detail:", error);
      throw error;
    }
  },

  // 🎯 Cập nhật task - ĐÃ CẬP NHẬT VỚI MULTIPLE ASSIGNEES
  async updateTask(taskId, keycloakId, updates) {
    try {
      const response = await api.patch("/tasks/update", {
        taskId,
        keycloakId,
        updates,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  },

  // 🎯 Xóa task
  async deleteTask(taskId, keycloakId) {
    try {
      const response = await api.post("/tasks/delete", {
        taskId,
        keycloakId,
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting task:", error);
      throw error;
    }
  },

  // 🎯 Lấy reminders của user - ĐÃ CẬP NHẬT
  async getUserReminders(keycloakId, page = 1, limit = 20) {
    try {
      const response = await api.post("/tasks/reminders/get-user-reminders", {
        keycloakId,
        page,
        limit,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user reminders:", error);
      throw error;
    }
  },

  // 🎯 Tạo reminder mới - ĐÃ CẬP NHẬT VỚI MULTIPLE RECIPIENTS
  async createReminder(reminderData, keycloakId) {
    try {
      const response = await api.post("/tasks/reminder/create", {
        ...reminderData,
        keycloakId,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating reminder:", error);
      throw error;
    }
  },

  // 🎯 Lấy task statistics - ĐÃ CẬP NHẬT
  async getTaskStats(keycloakId) {
    try {
      const userTasks = await this.getUserTasks(keycloakId, {
        viewType: "assigned",
      });

      const totalTasks = userTasks.data?.length || 0;
      const completedTasks =
        userTasks.data?.filter((task) => task.status === "done").length || 0;
      const inProgressTasks =
        userTasks.data?.filter((task) => task.status === "in_progress")
          .length || 0;
      const todoTasks =
        userTasks.data?.filter((task) => task.status === "todo").length || 0;
      const reviewTasks =
        userTasks.data?.filter((task) => task.status === "review").length || 0;

      return {
        totalTasks,
        completedTasks,
        inProgressTasks,
        todoTasks,
        reviewTasks,
        completionRate:
          totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
      };
    } catch (error) {
      console.error("Error fetching task stats:", error);
      return {
        totalTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        todoTasks: 0,
        reviewTasks: 0,
        completionRate: 0,
      };
    }
  },

  // 🎯 Lọc tasks theo priority - ĐÃ CẬP NHẬT
  async getTasksByPriority(keycloakId, priority, filters = {}) {
    try {
      const userTasks = await this.getUserTasks(keycloakId, filters);

      const filteredTasks =
        userTasks.data?.filter((task) => task.priority === priority) || [];

      return {
        status: "success",
        data: filteredTasks,
        results: filteredTasks.length,
      };
    } catch (error) {
      console.error("Error fetching tasks by priority:", error);
      throw error;
    }
  },

  // 🎯 Tìm kiếm tasks - ĐÃ CẬP NHẬT
  async searchTasks(keycloakId, searchTerm, filters = {}) {
    try {
      const userTasks = await this.getUserTasks(keycloakId, filters);

      const searchResults =
        userTasks.data?.filter(
          (task) =>
            task.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description
              ?.toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            task.tags?.some((tag) =>
              tag.toLowerCase().includes(searchTerm.toLowerCase())
            )
        ) || [];

      return {
        status: "success",
        data: searchResults,
        results: searchResults.length,
      };
    } catch (error) {
      console.error("Error searching tasks:", error);
      throw error;
    }
  },

  // 🎯 Lấy tasks sắp đến hạn - ĐÃ CẬP NHẬT
  async getUpcomingTasks(keycloakId, days = 7) {
    try {
      const userTasks = await this.getUserTasks(keycloakId, {
        viewType: "assigned",
      });

      const today = new Date();
      const upcomingDate = new Date();
      upcomingDate.setDate(today.getDate() + days);

      const upcomingTasks =
        userTasks.data?.filter(
          (task) =>
            task.dueDate &&
            new Date(task.dueDate) >= today &&
            new Date(task.dueDate) <= upcomingDate &&
            task.status !== "done"
        ) || [];

      return {
        status: "success",
        data: upcomingTasks,
        results: upcomingTasks.length,
      };
    } catch (error) {
      console.error("Error fetching upcoming tasks:", error);
      throw error;
    }
  },

  // 🎯 Lấy tasks quá hạn - ĐÃ CẬP NHẬT
  async getOverdueTasks(keycloakId) {
    try {
      const userTasks = await this.getUserTasks(keycloakId, {
        viewType: "assigned",
      });

      const today = new Date();

      const overdueTasks =
        userTasks.data?.filter(
          (task) =>
            task.dueDate &&
            new Date(task.dueDate) < today &&
            task.status !== "done"
        ) || [];

      return {
        status: "success",
        data: overdueTasks,
        results: overdueTasks.length,
      };
    } catch (error) {
      console.error("Error fetching overdue tasks:", error);
      throw error;
    }
  },

  // 🎯 Cập nhật task status - ĐÃ CẬP NHẬT
  async updateTaskStatus(taskId, keycloakId, status, comment = null) {
    try {
      const response = await api.patch("/tasks/update", {
        taskId,
        keycloakId,
        updates: {
          status,
          ...(comment && {
            activityLog: [
              {
                action: "status_updated",
                userId: keycloakId,
                timestamp: new Date(),
                details: { comment },
              },
            ],
          }),
        },
      });
      return response.data;
    } catch (error) {
      console.error("Error updating task status:", error);
      throw error;
    }
  },

  // 🎯 Thêm comment vào task - ĐÃ CẬP NHẬT
  async addTaskComment(taskId, keycloakId, comment) {
    try {
      const task = await this.getTaskDetail(taskId, keycloakId);

      const updatedActivityLog = [
        ...task.data.activityLog,
        {
          action: "commented",
          userId: keycloakId,
          timestamp: new Date(),
          details: { comment },
        },
      ];

      const response = await api.patch("/tasks/update", {
        taskId,
        keycloakId,
        updates: { activityLog: updatedActivityLog },
      });
      return response.data;
    } catch (error) {
      console.error("Error adding task comment:", error);
      throw error;
    }
  },

  // 🎯 Lấy tasks được giao bởi user - ĐÃ CẬP NHẬT (GIỮ LẠI ĐỂ TƯƠNG THÍCH)
  async getAssignedTasks(keycloakId, filters = {}) {
    try {
      // Sử dụng viewType: "created" để lấy tasks mà user đã giao
      const userTasks = await this.getUserTasks(keycloakId, {
        ...filters,
        viewType: "created",
      });

      return {
        status: "success",
        data: userTasks.data || [],
        results: userTasks.data?.length || 0,
      };
    } catch (error) {
      console.error("Error fetching assigned tasks:", error);
      throw error;
    }
  },

  // 🆕 LẤY TẤT CẢ TASKS TRONG HỆ THỐNG (CHO ADMIN) - ĐÃ CẬP NHẬT XỬ LÝ LỖI
  async getAllTasks(filters = {}) {
    try {
      console.log("🎯 Fetching all tasks with filters:", filters);

      // Chuẩn hóa filters - chỉ gửi các trường thực sự có giá trị
      const requestBody = {
        page: filters.page || 1,
        limit: filters.limit || 50,
      };

      // Chỉ thêm các filter nếu có giá trị và không phải là 'all'
      if (filters.status && filters.status !== "all") {
        requestBody.status = filters.status;
      }
      if (filters.priority && filters.priority !== "all") {
        requestBody.priority = filters.priority;
      }
      if (filters.search) {
        requestBody.search = filters.search;
      }
      if (filters.sortBy) {
        requestBody.sortBy = filters.sortBy;
      }
      if (filters.sortOrder) {
        requestBody.sortOrder = filters.sortOrder;
      }

      console.log("📤 Sending request body:", requestBody);

      const response = await api.post("/tasks/get-all-tasks", requestBody);
      console.log("✅ All tasks response:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ Error fetching all tasks:", error);
      console.error("❌ Error details:", error.response?.data);

      // Trả về response mặc định để tránh crash
      return {
        status: "error",
        message: error.response?.data?.message || "Lỗi khi tải danh sách tasks",
        data: [],
      };
    }
  },

  // 🆕 LỌC TASKS THEO VIEWTYPE - TIỆN ÍCH MỚI
  async getTasksByViewType(keycloakId, viewType, filters = {}) {
    try {
      const response = await this.getUserTasks(keycloakId, {
        ...filters,
        viewType: viewType,
      });
      return response;
    } catch (error) {
      console.error(`Error fetching ${viewType} tasks:`, error);
      throw error;
    }
  },

  // 🆕 LẤY TASK SUMMARY CHO USER
  async getTaskSummary(keycloakId) {
    try {
      const [assignedTasks, createdTasks] = await Promise.all([
        this.getUserTasks(keycloakId, { viewType: "assigned", status: "all" }),
        this.getUserTasks(keycloakId, { viewType: "created", status: "all" }),
      ]);

      const assignedStats = {
        total: assignedTasks.data?.length || 0,
        todo:
          assignedTasks.data?.filter((task) => task.status === "todo").length ||
          0,
        inProgress:
          assignedTasks.data?.filter((task) => task.status === "in_progress")
            .length || 0,
        review:
          assignedTasks.data?.filter((task) => task.status === "review")
            .length || 0,
        done:
          assignedTasks.data?.filter((task) => task.status === "done").length ||
          0,
      };

      const createdStats = {
        total: createdTasks.data?.length || 0,
        todo:
          createdTasks.data?.filter((task) => task.status === "todo").length ||
          0,
        inProgress:
          createdTasks.data?.filter((task) => task.status === "in_progress")
            .length || 0,
        review:
          createdTasks.data?.filter((task) => task.status === "review")
            .length || 0,
        done:
          createdTasks.data?.filter((task) => task.status === "done").length ||
          0,
      };

      return {
        status: "success",
        data: {
          assigned: assignedStats,
          created: createdStats,
          totalTasks: assignedStats.total + createdStats.total,
        },
      };
    } catch (error) {
      console.error("Error fetching task summary:", error);
      throw error;
    }
  },
};

export default taskService;
