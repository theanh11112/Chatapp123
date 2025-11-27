// src/services/analyticsService.js
import api from "../utils/axios";

const analyticsService = {
  // ==================== SYSTEM STATS ====================

  // 📊 Lấy thống kê hệ thống
  async getSystemStats() {
    try {
      const response = await api.get("/analytics/system-stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching system stats:", error);
      // Fallback data
      return {
        totalUsers: 156,
        onlineUsers: 23,
        totalTasks: 89,
        completedTasks: 67,
        systemLoad: 75,
        responseTime: 120,
      };
    }
  },

  // 📈 Lấy dữ liệu hoạt động hệ thống
  async getUserActivityData() {
    try {
      const response = await api.get("/analytics/user-activity");
      return response.data;
    } catch (error) {
      console.error("Error fetching user activity data:", error);
      // Fallback data
      return [
        { name: "T2", messages: 45, tasks: 12, online: 18 },
        { name: "T3", messages: 52, tasks: 15, online: 22 },
        { name: "T4", messages: 48, tasks: 18, online: 25 },
        { name: "T5", messages: 67, tasks: 22, online: 28 },
        { name: "T6", messages: 73, tasks: 25, online: 31 },
        { name: "T7", messages: 58, tasks: 20, online: 26 },
        { name: "CN", messages: 42, tasks: 14, online: 19 },
      ];
    }
  },

  // 📊 Lấy phân bổ trạng thái task
  async getTaskStatusDistribution() {
    try {
      const response = await api.get("/analytics/task-distribution");
      return response.data;
    } catch (error) {
      console.error("Error fetching task status distribution:", error);
      // Fallback data
      return [
        { name: "Chưa làm", value: 15, color: "#ff6b6b" },
        { name: "Đang làm", value: 28, color: "#4ecdc4" },
        { name: "Chờ duyệt", value: 12, color: "#45b7d1" },
        { name: "Hoàn thành", value: 67, color: "#96ceb4" },
      ];
    }
  },

  // ==================== USER MANAGEMENT ====================

  // 👥 Lấy danh sách người dùng
  async getUsersList() {
    try {
      const response = await api.get("/users/get-users");
      return response.data;
    } catch (error) {
      console.error("Error fetching users list:", error);
      // Fallback data
      return {
        data: [
          {
            _id: "1",
            firstName: "An",
            lastName: "Nguyen",
            email: "an.nguyen@example.com",
            username: "annguyen",
            isActive: true,
            roles: ["user"],
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
          {
            _id: "2",
            firstName: "Hao",
            lastName: "Nguyen",
            email: "hao.nguyen@example.com",
            username: "haonguyen",
            isActive: true,
            roles: ["user"],
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
          },
          {
            _id: "3",
            firstName: "Thu",
            lastName: "Nguyen",
            email: "thu.nguyen@example.com",
            username: "thunguyen",
            isActive: false,
            roles: ["user"],
            createdAt: new Date().toISOString(),
            lastLogin: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
          },
        ],
      };
    }
  },

  // 🔄 Cập nhật trạng thái người dùng
  async updateUserStatus(userId, isActive) {
    try {
      const response = await api.patch(`/users/update-status`, {
        userId,
        isActive,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating user status:", error);
      throw error;
    }
  },
  // 🆕 THÊM: Xóa role của user
  removeUserRole: async (userId, role) => {
    try {
      const response = await api.patch("/users/remove-role", {
        userId,
        role,
      });
      return response.data;
    } catch (error) {
      console.error("Error removing user role:", error);
      throw error;
    }
  },

  // 🔄 Cập nhật vai trò người dùng
  async updateUserRole(userId, role) {
    try {
      const response = await api.patch(`/users/update-role`, {
        userId,
        role,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating user role:", error);
      throw error;
    }
  },

  // ==================== PERFORMANCE METRICS ====================

  // ⚡ Lấy hiệu suất hệ thống
  async getSystemPerformance() {
    try {
      const response = await api.get("/analytics/performance");
      return response.data;
    } catch (error) {
      console.error("Error fetching system performance:", error);
      return {
        cpuUsage: 45,
        memoryUsage: 68,
        diskUsage: 52,
        networkLatency: 85,
      };
    }
  },

  // 📈 Lấy thống kê sử dụng theo thời gian
  async getUsageStats(days = 30) {
    try {
      const response = await api.post("/analytics/usage-stats", { days });
      return response.data;
    } catch (error) {
      console.error("Error fetching usage stats:", error);
      throw error;
    }
  },

  // ==================== DASHBOARD SUMMARY ====================

  // 🏠 Lấy tổng quan dashboard
  async getDashboardSummary() {
    try {
      const [systemStats, activityData, taskDistribution] = await Promise.all([
        this.getSystemStats(),
        this.getUserActivityData(),
        this.getTaskStatusDistribution(),
      ]);

      return {
        systemStats,
        activityData,
        taskDistribution,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
      throw error;
    }
  },
};

export default analyticsService;
