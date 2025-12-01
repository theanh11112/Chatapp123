// services/reportService.js
import api from "../utils/axios";

// 🆕 Utility functions - ĐẶT NGOÀI object chính
const getStatusColor = (status) => {
  const colors = {
    pending: "#ff6b6b",
    in_progress: "#4ecdc4",
    resolved: "#96ceb4",
    rejected: "#ffa726",
    closed: "#666666",
  };
  return colors[status] || "#666";
};

const getPriorityColor = (priority) => {
  const colors = {
    low: "#66bb6a",
    medium: "#ffa726",
    high: "#ef5350",
    critical: "#d32f2f",
  };
  return colors[priority] || "#666";
};

const getStatusText = (status) => {
  const statusMap = {
    pending: "Đang chờ",
    in_progress: "Đang xử lý",
    resolved: "Đã giải quyết",
    rejected: "Đã từ chối",
    closed: "Đã đóng",
  };
  return statusMap[status] || status;
};

const getPriorityText = (priority) => {
  const priorityMap = {
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
    critical: "Khẩn cấp",
  };
  return priorityMap[priority] || priority;
};

const getTypeText = (type) => {
  const typeMap = {
    bug: "Lỗi hệ thống",
    feature: "Đề xuất tính năng",
    complaint: "Khiếu nại",
    suggestion: "Góp ý",
    other: "Khác",
  };
  return typeMap[type] || type;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";

  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const reportService = {
  // 🆕 Lấy dashboard report
  async getDashboard() {
    try {
      const response = await api.get("/reports/dashboard");
      return response.data;
    } catch (error) {
      console.error("Error fetching report dashboard:", error);
      throw error;
    }
  },

  // 🆕 Tạo report mới
  async createReport(reportData) {
    try {
      const response = await api.post("/reports/create", {
        ...reportData,
      });
      return response.data;
    } catch (error) {
      console.error("Error creating report:", error);
      throw error;
    }
  },

  // 🆕 Lấy danh sách reports của user
  async getUserReports(filters = {}) {
    try {
      const response = await api.post("/reports/my-reports", {
        ...filters,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user reports:", error);
      throw error;
    }
  },

  // 🆕 Lấy chi tiết report của user
  async getUserReportDetail(reportId) {
    try {
      const response = await api.post("/reports/my-report/detail", {
        reportId,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user report detail:", error);
      throw error;
    }
  },

  // 🆕 Cập nhật report của user (chỉ khi pending)
  async updateUserReport(reportId, updates) {
    try {
      const response = await api.put("/reports/my-report/update", {
        reportId,
        ...updates,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating user report:", error);
      throw error;
    }
  },

  // 🆕 Xóa report của user (chỉ khi pending)
  async deleteUserReport(reportId) {
    try {
      const response = await api.delete("/reports/my-report/delete", {
        data: { reportId },
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting user report:", error);
      throw error;
    }
  },

  // ==================== ADMIN FUNCTIONS ====================

  // 🆕 Admin lấy tất cả reports
  async getAllReports(filters = {}) {
    try {
      const response = await api.post("/reports/admin/all", {
        ...filters,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching all reports:", error);
      throw error;
    }
  },

  // 🆕 Admin xem chi tiết report
  async getReportDetail(reportId) {
    try {
      const response = await api.post("/reports/admin/detail", {
        reportId,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching report detail:", error);
      throw error;
    }
  },

  // 🆕 Admin assign report
  async assignReport(reportId, assignedTo) {
    try {
      const response = await api.put("/reports/admin/assign", {
        reportId,
        assignedTo,
      });
      return response.data;
    } catch (error) {
      console.error("Error assigning report:", error);
      throw error;
    }
  },

  // 🆕 Admin cập nhật trạng thái report
  async updateReportStatus(reportId, status, resolutionNote = "") {
    try {
      const response = await api.put("/reports/admin/update-status", {
        reportId,
        status,
        resolutionNote,
      });
      return response.data;
    } catch (error) {
      console.error("Error updating report status:", error);
      throw error;
    }
  },

  // 🆕 Admin thêm ghi chú giải quyết
  async addResolutionNote(reportId, resolutionNote) {
    try {
      const response = await api.put("/reports/admin/add-resolution", {
        reportId,
        resolutionNote,
      });
      return response.data;
    } catch (error) {
      console.error("Error adding resolution note:", error);
      throw error;
    }
  },

  // ==================== STATISTICS ====================

  // 🆕 Lấy thống kê report cơ bản
  async getReportStats() {
    try {
      const response = await api.get("/reports/stats");
      return response.data;
    } catch (error) {
      console.error("Error fetching report stats:", error);
      throw error;
    }
  },

  // 🆕 Lấy thống kê chi tiết
  async getDetailedReportStats(days = 30) {
    try {
      const response = await api.post("/reports/stats/detailed", {
        days,
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching detailed report stats:", error);
      throw error;
    }
  },

  // ==================== UTILITY FUNCTIONS ====================

  // 🆕 Lấy report statistics cho user
  async getUserReportStats() {
    try {
      const userReports = await this.getUserReports();

      const totalReports = userReports.data?.length || 0;
      const pendingReports =
        userReports.data?.filter((report) => report.status === "pending")
          .length || 0;
      const inProgressReports =
        userReports.data?.filter((report) => report.status === "in_progress")
          .length || 0;
      const resolvedReports =
        userReports.data?.filter((report) => report.status === "resolved")
          .length || 0;

      return {
        totalReports,
        pendingReports,
        inProgressReports,
        resolvedReports,
      };
    } catch (error) {
      console.error("Error fetching user report stats:", error);
      return {
        totalReports: 0,
        pendingReports: 0,
        inProgressReports: 0,
        resolvedReports: 0,
      };
    }
  },

  // 🆕 Format data cho form tạo report
  formatReportData(formData) {
    return {
      title: formData.title,
      description: formData.description,
      type: formData.type || "other",
      priority: formData.priority || "medium",
      category: formData.category || "general",
      attachments: formData.attachments || [],
      metadata: formData.metadata || {},
    };
  },

  // 🆕 Format filters cho danh sách reports
  formatReportFilters(filters) {
    const formattedFilters = {};

    if (filters.status && filters.status !== "all") {
      formattedFilters.status = filters.status;
    }

    if (filters.type && filters.type !== "all") {
      formattedFilters.type = filters.type;
    }

    if (filters.priority && filters.priority !== "all") {
      formattedFilters.priority = filters.priority;
    }

    if (filters.category && filters.category !== "all") {
      formattedFilters.category = filters.category;
    }

    if (filters.search) {
      formattedFilters.search = filters.search;
    }

    if (filters.page) {
      formattedFilters.page = filters.page;
    }

    if (filters.limit) {
      formattedFilters.limit = filters.limit;
    }

    return formattedFilters;
  },

  // 🆕 Get status options
  getStatusOptions() {
    return [
      { value: "all", label: "Tất cả trạng thái" },
      { value: "pending", label: "Đang chờ", color: "orange" },
      { value: "in_progress", label: "Đang xử lý", color: "blue" },
      { value: "resolved", label: "Đã giải quyết", color: "green" },
      { value: "rejected", label: "Đã từ chối", color: "red" },
      { value: "closed", label: "Đã đóng", color: "gray" },
    ];
  },

  // 🆕 Get type options
  getTypeOptions() {
    return [
      { value: "all", label: "Tất cả loại" },
      { value: "bug", label: "Lỗi hệ thống" },
      { value: "feature", label: "Đề xuất tính năng" },
      { value: "complaint", label: "Khiếu nại" },
      { value: "suggestion", label: "Góp ý" },
      { value: "other", label: "Khác" },
    ];
  },

  // 🆕 Get priority options
  getPriorityOptions() {
    return [
      { value: "all", label: "Tất cả độ ưu tiên" },
      { value: "low", label: "Thấp", color: "gray" },
      { value: "medium", label: "Trung bình", color: "blue" },
      { value: "high", label: "Cao", color: "orange" },
      { value: "critical", label: "Khẩn cấp", color: "red" },
    ];
  },

  // 🆕 Get category options
  getCategoryOptions() {
    return [
      { value: "all", label: "Tất cả danh mục" },
      { value: "technical", label: "Kỹ thuật" },
      { value: "content", label: "Nội dung" },
      { value: "user_behavior", label: "Hành vi người dùng" },
      { value: "payment", label: "Thanh toán" },
      { value: "general", label: "Chung" },
    ];
  },

  // 🆕 Export utility functions
  getStatusColor,
  getPriorityColor,
  getStatusText,
  getPriorityText,
  getTypeText,
  formatDate,

  // 🆕 Check if user can edit report (only pending status)
  canEditReport(report) {
    return report.status === "pending";
  },

  // 🆕 Check if user can delete report (only pending status)
  canDeleteReport(report) {
    return report.status === "pending";
  },

  // 🆕 Calculate response time in hours
  calculateResponseTime(report) {
    if (!report.firstResponseAt || !report.createdAt) return null;

    const responseTime =
      new Date(report.firstResponseAt) - new Date(report.createdAt);
    return Math.round((responseTime / (1000 * 60 * 60)) * 100) / 100; // hours
  },

  // 🆕 Calculate resolution time in hours
  calculateResolutionTime(report) {
    if (!report.resolution?.resolvedAt || !report.createdAt) return null;

    const resolutionTime =
      new Date(report.resolution.resolvedAt) - new Date(report.createdAt);
    return Math.round((resolutionTime / (1000 * 60 * 60)) * 100) / 100; // hours
  },
};

export default reportService;
