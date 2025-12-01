import React, { useState, useEffect, useCallback } from "react";
import {
  Container,
  Paper,
  Tabs,
  Tab,
  Alert,
  Snackbar,
  Badge,
  CircularProgress,
  Box,
} from "@mui/material";
import {
  Analytics,
  People,
  Task,
  Notifications,
  AccessTime,
  Report,
} from "@mui/icons-material";

// Import components
import DashboardHeader from "./components/admin/DashboardHeader";
import OverviewTab from "./components/admin/OverviewTab";
import UsersTab from "./components/admin/UsersTab";
import TasksTab from "./components/admin/TasksTab";
import NotificationsTab from "./components/admin/NotificationsTab";
import RemindersTab from "./components/admin/RemindersTab";
import ReportsTab from "./components/admin/ReportsTab";
import CreateTaskDialog from "./components/dialogs/CreateTaskDialog";
import CreateNotificationDialog from "./components/dialogs/CreateNotificationDialog";
import CreateReminderDialog from "./components/dialogs/CreateReminderDialog";
import ViewTaskDialog from "./components/dialogs/ViewTaskDialog";
import DeleteTaskDialog from "./components/dialogs/DeleteTaskDialog";
import ViewReminderDialog from "./components/dialogs/ViewReminderDialog";
import ViewReportDialog from "./components/dialogs/ViewReportDialog";
import EditTaskDialog from "./components/dialogs/EditTaskDialog"; // 🆕 IMPORT EDIT DIALOG

// Import services
import taskService from "../../services/taskService";
import reminderService from "../../services/reminderService";
import analyticsService from "../../services/analyticsService";
import notificationService from "../../services/notificationService";
import reportService from "../../services/reportService";
import { showSnackbar, closeSnackBar } from "../../redux/slices/app";
import { useDispatch, useSelector } from "react-redux";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [createTaskDialog, setCreateTaskDialog] = useState(false);
  const [createReminderDialog, setCreateReminderDialog] = useState(false);
  const [viewTaskDialog, setViewTaskDialog] = useState(false);
  const [viewReminderDialog, setViewReminderDialog] = useState(false);
  const [viewReportDialog, setViewReportDialog] = useState(false);
  const [deleteTaskDialog, setDeleteTaskDialog] = useState(false);
  const [createNotificationDialog, setCreateNotificationDialog] =
    useState(false);
  const [editTaskDialog, setEditTaskDialog] = useState(false); // 🆕 STATE EDIT TASK DIALOG
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [taskToEdit, setTaskToEdit] = useState(null); // 🆕 STATE TASK CẦN EDIT

  // State chung
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    onlineUsers: 0,
    totalTasks: 0,
    completedTasks: 0,
    systemLoad: 0,
    responseTime: 0,
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [userActivityData, setUserActivityData] = useState([]);
  const [taskStatusData, setTaskStatusData] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [reports, setReports] = useState([]);
  const [reportStats, setReportStats] = useState({});
  const [notificationStats, setNotificationStats] = useState({});
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const { snackbar } = useSelector((state) => state.app);

  // 🆕 Lấy user từ auth slice
  const {
    userInfo: currentUser,
    user_id,
    isLoggedIn,
  } = useSelector((state) => state.auth);

  // 🆕 Hàm hiển thị snackbar với useCallback
  const showSnackbarMessage = useCallback(
    (message, severity = "success") => {
      dispatch(showSnackbar({ message, severity }));
    },
    [dispatch]
  );

  // 🆕 Hàm fallback để tạo dữ liệu mẫu
  const getFallbackData = useCallback((dataType) => {
    console.log(`🔄 Using fallback data for: ${dataType}`);

    const currentDate = new Date();
    const oneWeekAgo = new Date(
      currentDate.getTime() - 7 * 24 * 60 * 60 * 1000
    );

    // Helper để tạo dates cho charts
    const generateDateRange = (days) => {
      const dates = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        dates.push(date.toISOString().split("T")[0]);
      }
      return dates;
    };

    switch (dataType) {
      case "systemStats":
        return {
          totalUsers: 156,
          onlineUsers: 23,
          totalTasks: 489,
          completedTasks: 312,
          systemLoad: 65,
          responseTime: 128,
          activeSessions: 45,
          storageUsage: 76,
          updatedAt: new Date().toISOString(),
        };

      case "userActivity":
        const dates = generateDateRange(7);
        return dates.map((date, index) => ({
          date,
          activeUsers: Math.floor(Math.random() * 50) + 20,
          newUsers: Math.floor(Math.random() * 10) + 1,
          returningUsers: Math.floor(Math.random() * 40) + 15,
        }));

      case "taskStatus":
        return [
          { status: "todo", count: 67, color: "#ff6b6b", label: "Cần làm" },
          {
            status: "in_progress",
            count: 89,
            color: "#4ecdc4",
            label: "Đang làm",
          },
          { status: "review", count: 23, color: "#45b7d1", label: "Chờ duyệt" },
          { status: "done", count: 312, color: "#96ceb4", label: "Hoàn thành" },
        ];

      case "taskDistribution":
        return [
          { name: "Cá nhân", value: 245, color: "#8884d8" },
          { name: "Nhóm", value: 144, color: "#82ca9d" },
          { name: "Dự án", value: 98, color: "#ffc658" },
        ];

      case "usersList":
        return [
          {
            _id: "1",
            keycloakId: "user1",
            firstName: "Nguyễn Văn",
            lastName: "A",
            email: "a@example.com",
            username: "usera",
            roles: ["user"],
            isActive: true,
            lastSeen: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            avatar: "",
            department: "Engineering",
          },
          {
            _id: "2",
            keycloakId: "user2",
            firstName: "Trần Thị",
            lastName: "B",
            email: "b@example.com",
            username: "userb",
            roles: ["moderator"],
            isActive: true,
            lastSeen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            avatar: "",
            department: "Marketing",
          },
          {
            _id: "3",
            keycloakId: "user3",
            firstName: "Lê Văn",
            lastName: "C",
            email: "c@example.com",
            username: "userc",
            roles: ["admin"],
            isActive: true,
            lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
            createdAt: new Date().toISOString(),
            avatar: "",
            department: "Management",
          },
          {
            _id: "4",
            keycloakId: "user4",
            firstName: "Phạm Thị",
            lastName: "D",
            email: "d@example.com",
            username: "userd",
            roles: ["user"],
            isActive: false,
            lastSeen: new Date(
              Date.now() - 7 * 24 * 60 * 60 * 1000
            ).toISOString(),
            createdAt: new Date().toISOString(),
            avatar: "",
            department: "Sales",
          },
        ];

      case "reports":
        return [
          {
            _id: "1",
            title: "Lỗi đăng nhập hệ thống",
            description:
              "Không thể đăng nhập vào hệ thống sau khi update phiên bản mới",
            type: "bug",
            priority: "high",
            status: "pending",
            reportedBy: "user1",
            reportedByEmail: "user1@example.com",
            category: "technical",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            _id: "2",
            title: "Giao diện không responsive trên mobile",
            description: "Giao diện bị vỡ khi xem trên điện thoại di động",
            type: "ui_issue",
            priority: "medium",
            status: "in_progress",
            reportedBy: "user2",
            reportedByEmail: "user2@example.com",
            category: "design",
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            _id: "3",
            title: "Tính năng export báo cáo bị lỗi",
            description: "Không thể export báo cáo sang file Excel",
            type: "feature_request",
            priority: "low",
            status: "resolved",
            reportedBy: "user3",
            reportedByEmail: "user3@example.com",
            category: "functionality",
            createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];

      case "reportStats":
        return {
          total: 156,
          pending: 45,
          in_progress: 23,
          resolved: 67,
          closed: 21,
          byPriority: {
            low: 56,
            medium: 67,
            high: 28,
            critical: 5,
          },
          byType: {
            bug: 89,
            feature_request: 45,
            ui_issue: 22,
          },
        };

      case "notifications":
        return [
          {
            _id: "1",
            title: "Hệ thống bảo trì",
            message: "Hệ thống sẽ bảo trì từ 2:00 - 4:00 ngày mai",
            type: "info",
            priority: "medium",
            isRead: false,
            recipientType: "all",
            source: "System Admin",
            createdAt: new Date().toISOString(),
          },
          {
            _id: "2",
            title: "Task mới được giao",
            message: "Bạn có task mới 'Cập nhật tài liệu dự án'",
            type: "success",
            priority: "high",
            isRead: true,
            recipientType: "user",
            source: "Task Management",
            createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          {
            _id: "3",
            title: "Cảnh báo bảo mật",
            message: "Phát hiện hoạt động đăng nhập bất thường",
            type: "warning",
            priority: "critical",
            isRead: false,
            recipientType: "admin",
            source: "Security System",
            createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
        ];

      case "notificationStats":
        return {
          total: 156,
          unread: 23,
          read: 133,
          todayCount: 12,
          thisWeekCount: 45,
          byType: {
            info: 67,
            success: 45,
            warning: 23,
            error: 21,
          },
          byPriority: {
            low: 89,
            medium: 45,
            high: 18,
            critical: 4,
          },
        };

      case "reminders":
        return [
          {
            _id: "1",
            title: "Họp đánh giá tuần",
            description: "Họp đánh giá công việc tuần với team",
            dueDate: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            priority: "high",
            isCompleted: false,
            assignedTo: ["user1", "user2"],
            createdBy: "admin1",
            createdAt: new Date().toISOString(),
          },
          {
            _id: "2",
            title: "Gửi báo cáo tháng",
            description: "Hoàn thành và gửi báo cáo tháng cho quản lý",
            dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            priority: "medium",
            isCompleted: false,
            assignedTo: ["user3"],
            createdBy: "admin1",
            createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
          },
          {
            _id: "3",
            title: "Training onboarding",
            description: "Training cho nhân viên mới",
            dueDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            priority: "low",
            isCompleted: true,
            assignedTo: ["user4"],
            createdBy: "admin2",
            createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
          },
        ];

      case "performanceMetrics":
        return {
          cpuUsage: 45,
          memoryUsage: 67,
          diskUsage: 34,
          networkLatency: 23,
          uptime: 99.8,
          errorRate: 0.2,
          responseTime: 156,
          requestsPerMinute: 234,
        };

      case "recentActivities":
        return [
          {
            _id: "1",
            user: "Nguyễn Văn A",
            action: "created_task",
            target: "Task: Cập nhật tài liệu",
            timestamp: new Date().toISOString(),
            icon: "📝",
          },
          {
            _id: "2",
            user: "Trần Thị B",
            action: "completed_task",
            target: "Task: Fix lỗi đăng nhập",
            timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
            icon: "✅",
          },
          {
            _id: "3",
            user: "Lê Văn C",
            action: "uploaded_file",
            target: "File: Báo cáo tháng.pdf",
            timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
            icon: "📎",
          },
          {
            _id: "4",
            user: "System",
            action: "system_update",
            target: "Phiên bản 2.1.0",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            icon: "🔄",
          },
        ];

      case "dashboardOverview":
        return {
          totalUsers: 156,
          activeUsers: 23,
          totalTasks: 489,
          completedTasks: 312,
          pendingReports: 45,
          systemHealth: 95,
          storageUsage: 76,
          uptime: "99.8%",
        };

      default:
        console.warn(`❌ No fallback data defined for: ${dataType}`);
        return null;
    }
  }, []);
  // 🆕 Hàm load reminders với useCallback
  // 🆕 Hàm load reminders với useCallback
  // 🆕 CẬP NHẬT HÀM LOAD REMINDERS
  const loadReminders = useCallback(async () => {
    if (!user_id) return;

    try {
      console.log("🔄 Loading reminders for user:", user_id);
      const response = await reminderService.getUserReminders(user_id, {
        page: 1,
        limit: 20,
        showSent: true,
      });

      // 🆕 XỬ LÝ MAPPING isSent → isCompleted ĐỂ ĐẢM BẢO TƯƠNG THÍCH
      const mappedReminders =
        response.data?.map((reminder) => ({
          ...reminder,
          isCompleted:
            reminder.isCompleted !== undefined
              ? reminder.isCompleted
              : reminder.isSent,
          // 🆕 Đảm bảo cả hai field đều tồn tại
          isSent:
            reminder.isSent !== undefined
              ? reminder.isSent
              : reminder.isCompleted,
        })) || [];

      console.log("✅ Reminders loaded after mapping:", mappedReminders);
      setReminders(mappedReminders);
    } catch (error) {
      console.error("❌ Error loading reminders:", error);
      // Thử dùng fallback data nếu có lỗi
      const fallbackReminders = getFallbackData("reminders");
      setReminders(fallbackReminders || []);
    }
  }, [user_id, getFallbackData]);

  // 🆕 Hàm load reports với useCallback
  const loadReports = useCallback(async () => {
    try {
      const [reportsResponse, statsResponse] = await Promise.all([
        reportService.getAllReports({
          page: 1,
          limit: 20,
          status: "all",
        }),
        reportService.getReportStats(),
      ]);

      setReports(reportsResponse.data || []);
      setReportStats(statsResponse.data || {});
    } catch (error) {
      console.error("Error loading reports, using fallback:", error);
      setReports(getFallbackData("reports"));
      setReportStats({});
    }
  }, [getFallbackData]);

  // 🆕 HÀM LOAD TASKS CỦA USER (ĐƠN GIẢN HƠN)
  const loadUserTasks = useCallback(
    async (filters = {}) => {
      if (!user_id) return;

      try {
        setLoading(true);
        const response = await taskService.getUserTasks(user_id, {
          status: "all",
          page: 1,
          limit: 50,
          viewType: "created",
          ...filters,
        });

        if (response.status === "success") {
          setRecentTasks(response.data || []);
        } else {
          setRecentTasks([]);
          console.warn("⚠️ Error loading user tasks:", response.message);
        }
      } catch (error) {
        console.error("❌ Error loading user tasks:", error);
        setRecentTasks([]);
      } finally {
        setLoading(false);
      }
    },
    [user_id]
  );

  // 🆕 Hàm load dashboard data với useCallback
  const loadDashboardData = useCallback(async () => {
    if (!user_id) return;

    setLoading(true);
    try {
      // 🆕 LUÔN LOAD USERS LIST DÙ Ở TAB NÀO - ĐỂ CREATE TASK DIALOG CÓ THỂ CHỌN USER
      try {
        const usersResponse = await analyticsService.getAllUsers();
        if (usersResponse && usersResponse.status === "success") {
          setUsersList(usersResponse.data || []);
          console.log(
            "✅ Loaded users list:",
            usersResponse.data.length,
            "users"
          );
        } else {
          const fallbackUsers = getFallbackData("usersList");
          setUsersList(fallbackUsers);
          console.log(
            "⚠️ Using fallback users:",
            fallbackUsers.length,
            "users"
          );
        }
      } catch (error) {
        console.error("Error loading users, using fallback:", error);
        const fallbackUsers = getFallbackData("usersList");
        setUsersList(fallbackUsers);
        console.log(
          "❌ Error, using fallback users:",
          fallbackUsers.length,
          "users"
        );
      }

      // Load data theo tab
      if (activeTab === 0) {
        // Load overview data với fallback
        try {
          const [stats, activity, statusDist, notifStats] = await Promise.all([
            analyticsService.getSystemStats
              ? analyticsService.getSystemStats()
              : Promise.resolve(getFallbackData("systemStats")),
            analyticsService.getUserActivityData
              ? analyticsService.getUserActivityData()
              : Promise.resolve(getFallbackData("userActivity")),
            analyticsService.getTaskStatusDistribution
              ? analyticsService.getTaskStatusDistribution()
              : Promise.resolve(getFallbackData("taskStatus")),
            notificationService.getNotificationStats
              ? notificationService.getNotificationStats()
              : Promise.resolve({ data: {} }),
          ]);

          setSystemStats(
            stats?.data || stats || getFallbackData("systemStats")
          );
          setUserActivityData(
            activity?.data || activity || getFallbackData("userActivity")
          );
          setTaskStatusData(
            statusDist?.data || statusDist || getFallbackData("taskStatus")
          );
          setNotificationStats(notifStats?.data || notifStats || {});
        } catch (error) {
          console.error("Error loading overview data, using fallback:", error);
          setSystemStats(getFallbackData("systemStats"));
          setUserActivityData(getFallbackData("userActivity"));
          setTaskStatusData(getFallbackData("taskStatus"));
          setNotificationStats({});
        }
      } else if (activeTab === 1) {
        // Tab Users - chỉ cần refresh lại nếu cần
        console.log("🔄 Users tab - users list already loaded");
      } else if (activeTab === 2) {
        // 🆕 LOAD TASKS CỦA USER THAY VÌ TẤT CẢ TASKS
        await loadUserTasks({
          status: "all",
          sortBy: "createdAt",
          sortOrder: "desc",
        });
      } else if (activeTab === 3) {
        // Load reminders data
        await loadReminders();
      } else if (activeTab === 4) {
        // Load notifications data
        try {
          const [notificationsResponse, stats] = await Promise.all([
            notificationService.getAllAdminNotifications
              ? notificationService.getAllAdminNotifications({
                  page: 1,
                  limit: 20,
                })
              : Promise.resolve({ data: [] }),
            notificationService.getNotificationStats
              ? notificationService.getNotificationStats()
              : Promise.resolve({ data: {} }),
          ]);

          setNotifications(notificationsResponse?.data || []);
          setNotificationStats(stats?.data || {});
        } catch (error) {
          console.error("Error loading notifications:", error);
          setNotifications([]);
          setNotificationStats({});
        }
      } else if (activeTab === 5) {
        // Load reports data
        await loadReports();
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      showSnackbarMessage("Lỗi khi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }, [
    activeTab,
    user_id,
    showSnackbarMessage,
    getFallbackData,
    loadReminders,
    loadReports,
    loadUserTasks,
  ]);

  // 🆕 Hàm xử lý thay đổi role với useCallback
  const handleRoleChange = useCallback(
    async (userId, newRole) => {
      try {
        const user = usersList.find((u) => u._id === userId);
        if (!user) {
          showSnackbarMessage("Không tìm thấy thông tin user", "error");
          return;
        }

        if (
          analyticsService.updateUserRole &&
          typeof analyticsService.updateUserRole === "function"
        ) {
          const response = await analyticsService.updateUserRole(
            user.keycloakId,
            newRole
          );
          if (response.status === "success") {
            showSnackbarMessage(
              `Cập nhật vai trò thành công: ${newRole}`,
              "success"
            );
            loadDashboardData();
          } else {
            showSnackbarMessage(
              response.message || "Lỗi khi cập nhật vai trò",
              "error"
            );
          }
        } else {
          showSnackbarMessage(
            "Chức năng cập nhật vai trò chưa khả dụng",
            "warning"
          );
        }
      } catch (error) {
        console.error("Error updating user role:", error);
        showSnackbarMessage("Lỗi khi cập nhật vai trò", "error");
      }
    },
    [usersList, showSnackbarMessage, loadDashboardData]
  );

  // 🆕 Hàm xử lý xóa role với useCallback
  const handleRemoveRole = useCallback(
    async (userId, roleToRemove) => {
      try {
        const user = usersList.find((u) => u._id === userId);
        if (!user) {
          showSnackbarMessage("Không tìm thấy thông tin user", "error");
          return;
        }

        if (
          analyticsService.removeUserRole &&
          typeof analyticsService.removeUserRole === "function"
        ) {
          const response = await analyticsService.removeUserRole(
            user.keycloakId,
            roleToRemove
          );
          if (response.status === "success") {
            showSnackbarMessage(
              `Đã xóa vai trò ${roleToRemove} thành công`,
              "success"
            );
            loadDashboardData();
          } else {
            showSnackbarMessage(
              response.message || "Lỗi khi xóa vai trò",
              "error"
            );
          }
        } else {
          showSnackbarMessage("Chức năng xóa vai trò chưa khả dụng", "warning");
        }
      } catch (error) {
        console.error("Error removing user role:", error);
        showSnackbarMessage("Lỗi khi xóa vai trò", "error");
      }
    },
    [usersList, showSnackbarMessage, loadDashboardData]
  );

  // 🆕 Hàm xử lý xóa task với useCallback
  const handleDeleteTask = useCallback(async () => {
    if (!user_id || !taskToDelete) return;

    try {
      const response = await taskService.deleteTask(taskToDelete._id, user_id);
      if (response.status === "success") {
        showSnackbarMessage("Xóa task thành công!", "success");
        setDeleteTaskDialog(false);
        setTaskToDelete(null);
        loadUserTasks(); // 🆕 RELOAD TASKS CỦA USER
      } else {
        showSnackbarMessage(response.message || "Lỗi khi xóa task", "error");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      showSnackbarMessage("Lỗi khi xóa task", "error");
    }
  }, [user_id, taskToDelete, showSnackbarMessage, loadUserTasks]);

  // 🆕 Hàm mở dialog xác nhận xóa với useCallback
  const handleOpenDeleteDialog = useCallback((task) => {
    setTaskToDelete(task);
    setDeleteTaskDialog(true);
  }, []);

  // 🆕 Hàm xem chi tiết task với useCallback
  const handleViewTask = useCallback(
    async (task) => {
      if (!user_id) {
        showSnackbarMessage("Vui lòng đăng nhập", "error");
        return;
      }
      setSelectedTask(task);
      setViewTaskDialog(true);
    },
    [user_id, showSnackbarMessage]
  );

  // 🆕 Hàm chỉnh sửa task với useCallback
  const handleEditTask = useCallback((task) => {
    setTaskToEdit(task);
    setEditTaskDialog(true);
  }, []);

  // 🆕 Hàm cập nhật task với useCallback
  // 🆕 Hàm cập nhật task với useCallback - ĐÃ SỬA
  const handleUpdateTask = useCallback(
    async (taskId, updatedData) => {
      if (!user_id) return;

      try {
        setLoading(true);
        const response = await taskService.updateTask(
          taskId,
          user_id,
          updatedData
        );

        if (response.status === "success") {
          showSnackbarMessage("Cập nhật task thành công!", "success");
          setEditTaskDialog(false);
          setTaskToEdit(null);

          // 🆕 QUAN TRỌNG: Reload cả tasks list và dashboard data
          await loadUserTasks(); // Reload tasks của user
          await loadDashboardData(); // Reload toàn bộ dashboard để cập nhật thống kê

          // 🆕 Đóng cả view task dialog nếu đang mở
          setViewTaskDialog(false);

          // Tạo thông báo khi task được cập nhật
          try {
            await notificationService.createAutoSystemNotification(
              "task_updated",
              {
                taskId: taskId,
                taskTitle: updatedData.title,
                updaterName:
                  currentUser?.firstName + " " + currentUser?.lastName,
                assigneeIds: updatedData.assigneeIds,
              }
            );
          } catch (notifError) {
            console.warn("Could not create notification:", notifError);
          }
        } else {
          showSnackbarMessage(
            response.message || "Lỗi khi cập nhật task",
            "error"
          );
        }
      } catch (error) {
        console.error("Error updating task:", error);
        showSnackbarMessage("Lỗi khi cập nhật task", "error");
      } finally {
        setLoading(false);
      }
    },
    [
      user_id,
      showSnackbarMessage,
      loadUserTasks,
      loadDashboardData,
      currentUser,
    ]
  );

  // 🆕 THÊM HÀM XỬ LÝ HOÀN THÀNH REMINDER
  const handleCompleteReminder = useCallback(
    async (reminderId) => {
      if (!user_id) return;

      try {
        console.log("🎯 Marking reminder as completed:", reminderId);

        // Tạm thời cập nhật local state trước
        setReminders((prevReminders) =>
          prevReminders.map((reminder) =>
            reminder._id === reminderId
              ? {
                  ...reminder,
                  isCompleted: true,
                  completedAt: new Date().toISOString(),
                  isSent: true, // 🆕 Đảm bảo tương thích nếu backend dùng isSent
                }
              : reminder
          )
        );

        showSnackbarMessage("Đã đánh dấu nhắc nhở là hoàn thành!", "success");

        // 🆕 Gọi API để cập nhật trên server (nếu có)
        try {
          // Kiểm tra xem service có hàm update không
          if (reminderService.updateReminder) {
            const response = await reminderService.updateReminder(
              reminderId,
              user_id,
              {
                isCompleted: true,
                completedAt: new Date().toISOString(),
              }
            );
            console.log("✅ Server updated:", response);
          } else if (reminderService.markAsCompleted) {
            const response = await reminderService.markAsCompleted(
              reminderId,
              user_id
            );
            console.log("✅ Server updated:", response);
          }
        } catch (apiError) {
          console.warn(
            "⚠️ Could not update server, but local state is updated:",
            apiError
          );
          // Vẫn giữ local state đã cập nhật
        }
      } catch (error) {
        console.error("Error completing reminder:", error);
        showSnackbarMessage("Lỗi khi cập nhật nhắc nhở", "error");
      }
    },
    [user_id, showSnackbarMessage]
  );

  // 🆕 Hàm xử lý xóa reminder với useCallback
  const handleDeleteReminder = useCallback(
    async (reminderId) => {
      if (!user_id) return;

      try {
        const response = await reminderService.deleteReminder(
          reminderId,
          user_id
        );
        if (response.status === "success") {
          showSnackbarMessage("Xóa reminder thành công!", "success");
          loadDashboardData();
        } else {
          showSnackbarMessage(
            response.message || "Lỗi khi xóa reminder",
            "error"
          );
        }
      } catch (error) {
        console.error("Error deleting reminder:", error);
        showSnackbarMessage("Lỗi khi xóa reminder", "error");
      }
    },
    [user_id, showSnackbarMessage, loadDashboardData]
  );

  // 🆕 Hàm xem chi tiết reminder với useCallback
  const handleViewReminder = useCallback((reminder) => {
    setSelectedReminder(reminder);
    setViewReminderDialog(true);
  }, []);

  // 🆕 Hàm xem chi tiết report với useCallback
  const handleViewReport = useCallback((report) => {
    setSelectedReport(report);
    setViewReportDialog(true);
  }, []);

  // 🆕 Hàm xử lý cập nhật trạng thái report với useCallback
  const handleUpdateReportStatus = useCallback(
    async (reportId, status, resolutionNote = "") => {
      try {
        const response = await reportService.updateReportStatus(
          reportId,
          status,
          resolutionNote
        );
        if (response.status === "success") {
          showSnackbarMessage(
            `Đã cập nhật trạng thái báo cáo thành ${status}`,
            "success"
          );
          loadDashboardData();
          setViewReportDialog(false);
        } else {
          showSnackbarMessage(
            response.message || "Lỗi khi cập nhật trạng thái",
            "error"
          );
        }
      } catch (error) {
        console.error("Error updating report status:", error);
        showSnackbarMessage("Lỗi khi cập nhật trạng thái báo cáo", "error");
      }
    },
    [showSnackbarMessage, loadDashboardData]
  );

  // 🆕 Hàm xử lý assign report với useCallback
  const handleAssignReport = useCallback(
    async (reportId, assignedTo) => {
      try {
        const response = await reportService.assignReport(reportId, assignedTo);
        if (response.status === "success") {
          showSnackbarMessage(`Đã assign báo cáo cho ${assignedTo}`, "success");
          loadDashboardData();
        } else {
          showSnackbarMessage(
            response.message || "Lỗi khi assign báo cáo",
            "error"
          );
        }
      } catch (error) {
        console.error("Error assigning report:", error);
        showSnackbarMessage("Lỗi khi assign báo cáo", "error");
      }
    },
    [showSnackbarMessage, loadDashboardData]
  );

  // Load data khi tab thay đổi
  useEffect(() => {
    if (user_id) {
      loadDashboardData();
    }
  }, [activeTab, user_id, loadDashboardData]);

  // Tính toán số thông báo chưa đọc
  const unreadNotificationsCount = notifications.filter(
    (notif) => !notif.isRead
  ).length;

  // 🆕 Tính toán số report pending
  const pendingReportsCount = reports.filter(
    (report) => report.status === "pending"
  ).length;

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: 4,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <DashboardHeader
        onCreateTask={() => setCreateTaskDialog(true)}
        onCreateNotification={() => setCreateNotificationDialog(true)}
        onCreateReminder={() => setCreateReminderDialog(true)}
        currentUser={currentUser}
      />
      {!isLoggedIn && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Vui lòng đăng nhập để sử dụng tính năng quản lý task
        </Alert>
      )}
      {/* Tabs Navigation */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Analytics />} label="Tổng quan" />
          <Tab icon={<People />} label="Người dùng" />
          <Tab icon={<Task />} label="Quản lý Task" />
          <Tab icon={<AccessTime />} label="Reminders" />
          <Tab
            icon={
              <Badge badgeContent={unreadNotificationsCount} color="error">
                <Notifications />
              </Badge>
            }
            label="Thông báo"
          />
          <Tab
            icon={
              <Badge badgeContent={pendingReportsCount} color="error">
                <Report />
              </Badge>
            }
            label="Báo cáo"
          />
        </Tabs>
      </Paper>
      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {/* Nội dung các tab với scroll */}
      <Box
        sx={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {activeTab === 0 && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <OverviewTab
              loading={loading}
              systemStats={systemStats}
              userActivityData={userActivityData}
              taskStatusData={taskStatusData}
              notificationStats={notificationStats}
            />
          </Box>
        )}
        {activeTab === 1 && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <UsersTab
              loading={loading}
              usersList={usersList}
              currentUser={currentUser}
              onRefresh={loadDashboardData}
              onUserStatusChange={async (userId, newStatus) => {
                try {
                  const user = usersList.find((u) => u._id === userId);
                  if (!user) {
                    showSnackbarMessage(
                      "Không tìm thấy thông tin user",
                      "error"
                    );
                    return;
                  }

                  if (
                    analyticsService.updateUserStatus &&
                    typeof analyticsService.updateUserStatus === "function"
                  ) {
                    const response = await analyticsService.updateUserStatus(
                      user.keycloakId,
                      newStatus
                    );
                    if (response.status === "success") {
                      showSnackbarMessage(
                        "Cập nhật trạng thái người dùng thành công",
                        "success"
                      );
                      loadDashboardData();
                    } else {
                      showSnackbarMessage(
                        response.message || "Lỗi khi cập nhật",
                        "error"
                      );
                    }
                  } else {
                    showSnackbarMessage(
                      "Chức năng cập nhật trạng thái chưa khả dụng",
                      "warning"
                    );
                  }
                } catch (error) {
                  console.error("Error updating user status:", error);
                  showSnackbarMessage(
                    "Lỗi khi cập nhật trạng thái người dùng",
                    "error"
                  );
                }
              }}
              onRoleChange={handleRoleChange}
              onRemoveRole={handleRemoveRole}
            />
          </Box>
        )}
        {activeTab === 2 && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <TasksTab
              loading={loading}
              recentTasks={recentTasks} // 🆕 CHỈ HIỂN THỊ TASKS CỦA USER
              currentUser={currentUser}
              onRefresh={() => loadUserTasks()} // 🆕 RELOAD TASKS CỦA USER
              onViewTask={handleViewTask}
              onEditTask={handleEditTask} // 🆕 THÊM PROP EDIT TASK
              onUpdateTaskStatus={async (taskId, newStatus) => {
                if (!user_id) return;

                try {
                  const response = await taskService.updateTask(
                    taskId,
                    user_id,
                    { status: newStatus }
                  );
                  if (response.status === "success") {
                    showSnackbarMessage(
                      "Cập nhật trạng thái thành công!",
                      "success"
                    );

                    // Tạo thông báo khi task hoàn thành
                    if (newStatus === "done") {
                      const task = recentTasks.find((t) => t._id === taskId);
                      if (task) {
                        await notificationService.createAutoSystemNotification(
                          "task_completed",
                          {
                            taskId: taskId,
                            taskTitle: task.title,
                            completerName:
                              currentUser?.firstName +
                              " " +
                              currentUser?.lastName,
                            assignerId: task.assignerId?._id,
                          }
                        );
                      }
                    }

                    loadUserTasks(); // 🆕 RELOAD TASKS CỦA USER
                    setViewTaskDialog(false);
                  } else {
                    showSnackbarMessage(
                      response.message || "Lỗi khi cập nhật",
                      "error"
                    );
                  }
                } catch (error) {
                  console.error("Error updating task status:", error);
                  showSnackbarMessage("Lỗi khi cập nhật trạng thái", "error");
                }
              }}
              onDeleteTask={handleOpenDeleteDialog}
              onCreateTask={() => setCreateTaskDialog(true)}
            />
          </Box>
        )}
        {activeTab === 3 && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <RemindersTab
              loading={loading}
              reminders={reminders}
              currentUser={currentUser}
              onRefresh={loadDashboardData}
              onViewReminder={handleViewReminder}
              onDeleteReminder={handleDeleteReminder}
              onCompleteReminder={handleCompleteReminder}
              onCreateReminder={() => setCreateReminderDialog(true)}
            />
          </Box>
        )}
        {activeTab === 4 && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <NotificationsTab
              loading={loading}
              notifications={notifications}
              notificationStats={
                notificationStats.data || notificationStats || {}
              } // 🆕 SỬA LẠI Ở ĐÂY
              unreadNotificationsCount={unreadNotificationsCount}
              onRefresh={loadDashboardData}
              onMarkAsRead={async (notificationId) => {
                try {
                  console.log(
                    "🔄 AdminDashboard: Marking notification as read:",
                    notificationId
                  );

                  const response =
                    await notificationService.markNotificationAsRead(
                      notificationId
                    );

                  if (response.status === "success") {
                    showSnackbarMessage("Đã đánh dấu thông báo", "success");

                    // 🆕 Cập nhật local state ngay lập tức
                    setNotifications((prev) =>
                      prev.map((notif) =>
                        notif._id === notificationId
                          ? { ...notif, isRead: true }
                          : notif
                      )
                    );

                    loadDashboardData();
                  } else {
                    showSnackbarMessage(
                      response.message || "Lỗi khi đánh dấu thông báo",
                      "error"
                    );
                  }
                } catch (error) {
                  console.error(
                    "❌ AdminDashboard Error marking notification as read:",
                    error
                  );
                  showSnackbarMessage(
                    error.response?.data?.message ||
                      "Lỗi khi đánh dấu thông báo",
                    "error"
                  );
                }
              }}
              onDeleteNotification={async (notificationId) => {
                try {
                  const response = await notificationService.deleteNotification(
                    notificationId
                  );
                  if (response.status === "success") {
                    showSnackbarMessage("Đã xóa thông báo", "success");
                    loadDashboardData();
                  } else {
                    showSnackbarMessage(
                      response.message || "Lỗi khi xóa thông báo",
                      "error"
                    );
                  }
                } catch (error) {
                  console.error("Error deleting notification:", error);
                  showSnackbarMessage("Lỗi khi xóa thông báo", "error");
                }
              }}
              onMarkAllAsRead={async () => {
                try {
                  console.log(
                    "🔄 AdminDashboard: Marking ALL notifications as read",
                    {
                      user_id,
                      userRoles: currentUser?.role,
                      unreadCount: unreadNotificationsCount,
                    }
                  );

                  if (unreadNotificationsCount === 0) {
                    showSnackbarMessage(
                      "Không có thông báo nào chưa đọc",
                      "info"
                    );
                    return;
                  }

                  const response =
                    await notificationService.markAllNotificationsAsRead(
                      user_id,
                      currentUser?.role || []
                    );

                  if (response.status === "success") {
                    showSnackbarMessage(
                      `Đã đánh dấu ${
                        response.modifiedCount || unreadNotificationsCount
                      } thông báo đã đọc`,
                      "success"
                    );

                    // 🆕 QUAN TRỌNG: Cập nhật local state ngay lập tức
                    setNotifications((prevNotifications) =>
                      prevNotifications.map((notification) => ({
                        ...notification,
                        isRead: true,
                      }))
                    );

                    // 🆕 Cập nhật thống kê ngay lập tức
                    setNotificationStats((prevStats) => ({
                      ...prevStats,
                      unread: 0,
                      read:
                        (prevStats.read || 0) +
                        (response.modifiedCount || unreadNotificationsCount),
                    }));

                    console.log(
                      "✅ Local state updated after mark all as read"
                    );
                  } else {
                    showSnackbarMessage(
                      response.message || "Lỗi khi đánh dấu thông báo",
                      "error"
                    );
                  }
                } catch (error) {
                  console.error(
                    "❌ Error marking all notifications as read:",
                    error
                  );
                  showSnackbarMessage(
                    error.response?.data?.message ||
                      "Lỗi khi đánh dấu thông báo",
                    "error"
                  );
                }
              }}
              onCreateNotification={() => setCreateNotificationDialog(true)}
            />
          </Box>
        )}
        {activeTab === 5 && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <ReportsTab
              loading={loading}
              reports={reports}
              reportStats={reportStats}
              currentUser={currentUser}
              onRefresh={loadDashboardData}
              onViewReport={handleViewReport}
              onUpdateReportStatus={handleUpdateReportStatus}
              onAssignReport={handleAssignReport}
            />
          </Box>
        )}
      </Box>
      {/* Dialogs */}
      <CreateReminderDialog
        open={createReminderDialog}
        onClose={() => setCreateReminderDialog(false)}
        currentUser={currentUser}
        tasks={recentTasks} // 🆕 TRUYỀN TASKS CỦA ADMIN
        isAdmin={true} // 🆕 THÊM PROP NÀY
        onCreateReminder={async (reminderData) => {
          try {
            setLoading(true);

            // 🆕 LOẠI BỎ recipientIds - backend sẽ tự xử lý
            const { recipientIds, ...cleanReminderData } = reminderData;

            const response = await reminderService.createReminder({
              ...cleanReminderData,
              keycloakId: user_id,
            });

            if (response.status === "success") {
              showSnackbarMessage("Tạo reminder thành công!", "success");
              setCreateReminderDialog(false);
              loadDashboardData();
            } else {
              showSnackbarMessage(
                response.message || "Lỗi khi tạo reminder",
                "error"
              );
            }
          } catch (error) {
            console.error("Error creating reminder:", error);
            showSnackbarMessage("Lỗi khi tạo reminder", "error");
          } finally {
            setLoading(false);
          }
        }}
      />
      <ViewReminderDialog
        open={viewReminderDialog}
        onClose={() => setViewReminderDialog(false)}
        reminder={selectedReminder}
        currentUser={currentUser}
        onDeleteReminder={handleDeleteReminder}
      />
      <CreateTaskDialog
        open={createTaskDialog}
        onClose={() => setCreateTaskDialog(false)}
        currentUser={currentUser}
        users={usersList}
        onCreateTask={async (taskData) => {
          try {
            setLoading(true);
            console.log("🎯 Creating task with data:", taskData);

            const response = await taskService.createTask({
              ...taskData,
              assignerId: user_id,
            });

            if (response.status === "success") {
              showSnackbarMessage("Tạo task thành công!", "success");
              setCreateTaskDialog(false);

              // 🆕 Tạo thông báo tự động cho task mới - XỬ LÝ LỖI TỐT HƠN
              try {
                console.log("📢 Creating auto notification for new task");

                const notificationResult =
                  await notificationService.createAutoSystemNotification(
                    "task_created",
                    {
                      taskId: response.data._id,
                      taskTitle: taskData.title,
                      creatorName:
                        currentUser?.firstName + " " + currentUser?.lastName,
                      assigneeIds: taskData.assigneeIds,
                    }
                  );

                if (notificationResult.status === "success") {
                  console.log("✅ Auto notification created successfully");
                } else {
                  console.warn(
                    "⚠️ Auto notification creation failed:",
                    notificationResult.message
                  );
                  // Không hiển thị lỗi cho user vì đây là tính năng phụ
                }
              } catch (notifError) {
                console.warn(
                  "⚠️ Could not create auto notification:",
                  notifError
                );
                // Không ảnh hưởng đến flow chính
              }

              loadUserTasks(); // 🆕 RELOAD TASKS CỦA USER
            } else {
              showSnackbarMessage(
                response.message || "Lỗi khi tạo task",
                "error"
              );
            }
          } catch (error) {
            console.error("❌ Error creating task:", error);
            showSnackbarMessage("Lỗi khi tạo task", "error");
          } finally {
            setLoading(false);
          }
        }}
      />
      {/* 🆕 EDIT TASK DIALOG */}
      <EditTaskDialog
        open={editTaskDialog}
        onClose={() => {
          setEditTaskDialog(false);
          setTaskToEdit(null);
        }}
        task={taskToEdit}
        currentUser={currentUser}
        users={usersList}
        onUpdateTask={handleUpdateTask}
      />
      <CreateNotificationDialog
        open={createNotificationDialog}
        onClose={() => setCreateNotificationDialog(false)}
        onCreateNotification={async (notificationData) => {
          try {
            const response = await notificationService.createSystemNotification(
              notificationData
            );
            if (response.status === "success") {
              showSnackbarMessage("Tạo thông báo thành công!", "success");
              setCreateNotificationDialog(false);
              loadDashboardData();
            } else {
              showSnackbarMessage(
                response.message || "Lỗi khi tạo thông báo",
                "error"
              );
            }
          } catch (error) {
            console.error("Error creating notification:", error);
            showSnackbarMessage("Lỗi khi tạo thông báo", "error");
          }
        }}
      />
      <ViewTaskDialog
        open={viewTaskDialog}
        onClose={() => setViewTaskDialog(false)}
        task={selectedTask}
        currentUser={currentUser}
        onUpdateTaskStatus={async (taskId, newStatus) => {
          if (!user_id) return;

          try {
            const response = await taskService.updateTask(taskId, user_id, {
              status: newStatus,
            });
            if (response.status === "success") {
              showSnackbarMessage("Cập nhật trạng thái thành công!", "success");
              loadUserTasks(); // 🆕 RELOAD TASKS CỦA USER
              setViewTaskDialog(false);
            } else {
              showSnackbarMessage(
                response.message || "Lỗi khi cập nhật",
                "error"
              );
            }
          } catch (error) {
            console.error("Error updating task status:", error);
            showSnackbarMessage("Lỗi khi cập nhật trạng thái", "error");
          }
        }}
        onEditTask={handleEditTask} // 🆕 THÊM PROP EDIT TASK
      />
      <DeleteTaskDialog
        open={deleteTaskDialog}
        onClose={() => setDeleteTaskDialog(false)}
        task={taskToDelete}
        onConfirm={handleDeleteTask}
      />
      <ViewReportDialog
        open={viewReportDialog}
        onClose={() => setViewReportDialog(false)}
        report={selectedReport}
        currentUser={currentUser}
        onUpdateReportStatus={handleUpdateReportStatus}
        onAssignReport={handleAssignReport}
      />
      {/* Snackbar từ Redux */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => dispatch(closeSnackBar())}
      >
        <Alert
          onClose={() => dispatch(closeSnackBar())}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
