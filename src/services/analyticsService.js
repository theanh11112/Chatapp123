// src/services/analyticsService.js
import api from "../utils/axios";

const analyticsService = {
  // 🆕 Lấy system stats
  async getSystemStats() {
    try {
      // Tạm thời mock data - trong thực tế nên có API endpoints
      const mockStats = {
        totalUsers: 156,
        onlineUsers: 89,
        totalTasks: 342,
        completedTasks: 189,
        systemLoad: 45,
        responseTime: 120,
      };

      return mockStats;
    } catch (error) {
      console.error("Error fetching system stats:", error);
      // Fallback data
      return {
        totalUsers: 0,
        onlineUsers: 0,
        totalTasks: 0,
        completedTasks: 0,
        systemLoad: 0,
        responseTime: 0,
      };
    }
  },

  // 🆕 Lấy user activity data
  async getUserActivityData() {
    try {
      // Mock data - thay thế bằng API thực tế
      const mockActivityData = [
        { name: "T2", messages: 1200, tasks: 45, online: 89 },
        { name: "T3", messages: 1900, tasks: 52, online: 92 },
        { name: "T4", messages: 1500, tasks: 38, online: 87 },
        { name: "T5", messages: 2200, tasks: 61, online: 94 },
        { name: "T6", messages: 1800, tasks: 49, online: 91 },
        { name: "T7", messages: 2500, tasks: 67, online: 96 },
        { name: "CN", messages: 2100, tasks: 58, online: 93 },
      ];

      return mockActivityData;
    } catch (error) {
      console.error("Error fetching user activity data:", error);
      // Mock data fallback
      return [
        { name: "T2", messages: 1200, tasks: 45, online: 89 },
        { name: "T3", messages: 1900, tasks: 52, online: 92 },
        { name: "T4", messages: 1500, tasks: 38, online: 87 },
        { name: "T5", messages: 2200, tasks: 61, online: 94 },
        { name: "T6", messages: 1800, tasks: 49, online: 91 },
        { name: "T7", messages: 2500, tasks: 67, online: 96 },
        { name: "CN", messages: 2100, tasks: 58, online: 93 },
      ];
    }
  },

  // 🆕 Lấy task status distribution
  async getTaskStatusDistribution() {
    try {
      // Mock data - thay thế bằng API thực tế
      const mockStatusData = [
        { name: "Chưa làm", value: 25, color: "#ff6b6b" },
        { name: "Đang làm", value: 40, color: "#4ecdc4" },
        { name: "Chờ duyệt", value: 15, color: "#45b7d1" },
        { name: "Hoàn thành", value: 20, color: "#96ceb4" },
      ];

      return mockStatusData;
    } catch (error) {
      console.error("Error fetching task status distribution:", error);
      // Mock data fallback
      return [
        { name: "Chưa làm", value: 25, color: "#ff6b6b" },
        { name: "Đang làm", value: 40, color: "#4ecdc4" },
        { name: "Chờ duyệt", value: 15, color: "#45b7d1" },
        { name: "Hoàn thành", value: 20, color: "#96ceb4" },
      ];
    }
  },

  // 🆕 Lấy user statistics
  async getUserStats() {
    try {
      // Mock data - thay thế bằng API thực tế
      return {
        totalUsers: 156,
        onlineUsers: 89,
      };
    } catch (error) {
      console.error("Error fetching user stats:", error);
      return {
        totalUsers: 0,
        onlineUsers: 0,
      };
    }
  },
};

export default analyticsService;
