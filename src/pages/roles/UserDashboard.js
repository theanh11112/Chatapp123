// src/pages/roles/UserDashboard.js
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
  Dashboard,
  TaskAlt,
  NotificationsActive,
  AccessTime,
} from "@mui/icons-material";

// Import components
import OverviewTab from "./components/user/OverviewTab";
import TaskManagement from "./components/user/TaskManagement";
import ReminderSystem from "./components/user/ReminderSystem";
import NotificationCenter from "./components/user/NotificationCenter";

// Import services
import taskService from "../../services/taskService";
import reminderService from "../../services/reminderService";
import notificationService from "../../services/notificationService";
import { showSnackbar, closeSnackBar } from "../../redux/slices/app";
import { useDispatch, useSelector } from "react-redux";

export default function UserDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);

  // State cho dữ liệu
  const [tasks, setTasks] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    inProgressTasks: 0,
    overdueTasks: 0,
    totalReminders: 0,
    unreadNotifications: 0,
    productivity: 0,
    completionRate: "0%",
  });

  const dispatch = useDispatch();
  const { snackbar } = useSelector((state) => state.app);

  // 🆕 Lấy user từ auth slice thay vì app slice
  const {
    userInfo: currentUser,
    user_id,
    token,
    isLoggedIn,
  } = useSelector((state) => state.auth);

  // 🎯 Hàm hiển thị snackbar với useCallback
  const showSnackbarMessage = useCallback(
    (message, severity = "success") => {
      dispatch(showSnackbar({ message, severity }));
    },
    [dispatch]
  );

  // 🎯 Hàm fallback để tạo dữ liệu mẫu
  const getFallbackData = useCallback((dataType) => {
    console.log(`Using fallback data for: ${dataType}`);

    switch (dataType) {
      case "tasks":
        return [
          {
            _id: "1",
            title: "Hoàn thành báo cáo tuần",
            description: "Viết báo cáo tổng kết công việc tuần này",
            status: "in_progress",
            priority: "high",
            dueDate: new Date(
              Date.now() + 2 * 24 * 60 * 60 * 1000
            ).toISOString(),
            assigner: "Quản lý dự án",
            progress: 60,
          },
          {
            _id: "2",
            title: "Review code cho feature mới",
            description: "Kiểm tra và review code cho tính năng authentication",
            status: "pending",
            priority: "medium",
            dueDate: new Date(
              Date.now() + 5 * 24 * 60 * 60 * 1000
            ).toISOString(),
            assigner: "Tech Lead",
            progress: 0,
          },
        ];
      case "reminders":
        return [
          {
            _id: "1",
            title: "Họp team hàng tuần",
            description: "Họp đánh giá tiến độ dự án",
            remindAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
            isSent: false,
          },
        ];
      case "notifications":
        return [
          {
            _id: "1",
            title: "Công việc mới được giao",
            message: "Bạn có một task mới cần thực hiện",
            type: "task_assigned",
            isRead: false,
            createdAt: new Date().toISOString(),
          },
        ];
      default:
        return [];
    }
  }, []);

  // 🎯 Load dashboard data với useCallback
  const loadDashboardData = useCallback(async () => {
    // Sử dụng user_id từ auth
    if (!user_id) return;

    setLoading(true);
    try {
      // Load tasks
      let tasksData = [];
      try {
        const tasksResponse = await taskService.getUserTasks(
          user_id, // Sử dụng user_id
          {
            status: "all",
            page: 1,
            limit: 50,
          }
        );
        tasksData = tasksResponse.data || getFallbackData("tasks");
      } catch (error) {
        console.error("Error loading tasks, using fallback:", error);
        tasksData = getFallbackData("tasks");
      }

      // Load reminders
      let remindersData = [];
      try {
        const remindersResponse = await reminderService.getUserReminders(
          user_id, // Sử dụng user_id
          {
            page: 1,
            limit: 20,
            showSent: false,
          }
        );
        remindersData = remindersResponse.data || getFallbackData("reminders");
      } catch (error) {
        console.error("Error loading reminders, using fallback:", error);
        remindersData = getFallbackData("reminders");
      }

      // Load notifications
      let notificationsData = [];
      try {
        const notificationsResponse =
          await notificationService.getUserNotifications(
            user_id, // Sử dụng user_id
            {
              page: 1,
              limit: 20,
            }
          );
        notificationsData =
          notificationsResponse.data || getFallbackData("notifications");
      } catch (error) {
        console.error("Error loading notifications, using fallback:", error);
        notificationsData = getFallbackData("notifications");
      }

      // Set data
      setTasks(tasksData);
      setReminders(remindersData);
      setNotifications(notificationsData);

      // Calculate stats
      const totalTasks = tasksData.length;
      const completedTasks = tasksData.filter(
        (t) => t.status === "done"
      ).length;
      const inProgressTasks = tasksData.filter(
        (t) => t.status === "in_progress"
      ).length;
      const overdueTasks = tasksData.filter(
        (t) =>
          t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "done"
      ).length;
      const totalReminders = remindersData.length;
      const unreadNotifications = notificationsData.filter(
        (n) => !n.isRead
      ).length;
      const completionRate =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const productivity = Math.min(100, completionRate + 25); // Simple productivity calculation

      setDashboardStats({
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        totalReminders,
        unreadNotifications,
        productivity,
        completionRate: `${completionRate}%`,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      showSnackbarMessage("Lỗi khi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }, [user_id, showSnackbarMessage, getFallbackData]);

  // 🎯 Hàm xử lý cập nhật task status
  const handleUpdateTaskStatus = useCallback(
    async (taskId, newStatus) => {
      // Sử dụng user_id từ auth
      if (!user_id) {
        showSnackbarMessage("Không tìm thấy thông tin người dùng", "error");
        return;
      }

      try {
        await taskService.updateTask(taskId, user_id, {
          status: newStatus,
        });

        // Update local state
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task._id === taskId ? { ...task, status: newStatus } : task
          )
        );

        showSnackbarMessage("Cập nhật trạng thái thành công", "success");

        // Reload stats
        loadDashboardData();
      } catch (error) {
        console.error("Error updating task status:", error);
        showSnackbarMessage("Lỗi khi cập nhật trạng thái", "error");
      }
    },
    [user_id, showSnackbarMessage, loadDashboardData]
  );

  // 🎯 Hàm xử lý xóa reminder
  const handleDeleteReminder = useCallback(
    async (reminderId) => {
      // Sử dụng user_id từ auth
      if (!user_id) return;

      try {
        await reminderService.deleteReminder(
          reminderId,
          user_id // Sử dụng user_id
        );

        // Update local state
        setReminders((prevReminders) =>
          prevReminders.filter((reminder) => reminder._id !== reminderId)
        );

        showSnackbarMessage("Xóa reminder thành công", "success");
        loadDashboardData();
      } catch (error) {
        console.error("Error deleting reminder:", error);
        showSnackbarMessage("Lỗi khi xóa reminder", "error");
      }
    },
    [user_id, showSnackbarMessage, loadDashboardData]
  );

  // 🎯 Hàm xử lý đánh dấu thông báo đã đọc
  const handleMarkNotificationAsRead = useCallback(
    async (notificationId) => {
      try {
        await notificationService.markNotificationAsRead(notificationId);

        // Update local state
        setNotifications((prevNotifications) =>
          prevNotifications.map((notification) =>
            notification._id === notificationId
              ? { ...notification, isRead: true }
              : notification
          )
        );

        showSnackbarMessage("Đã đánh dấu thông báo đã đọc", "success");
        loadDashboardData();
      } catch (error) {
        console.error("Error marking notification as read:", error);
        showSnackbarMessage("Lỗi khi đánh dấu thông báo", "error");
      }
    },
    [showSnackbarMessage, loadDashboardData]
  );

  // 🎯 Hàm xử lý xóa thông báo
  const handleDeleteNotification = useCallback(
    async (notificationId) => {
      try {
        await notificationService.deleteNotification(notificationId);

        // Update local state
        setNotifications((prevNotifications) =>
          prevNotifications.filter(
            (notification) => notification._id !== notificationId
          )
        );

        showSnackbarMessage("Đã xóa thông báo", "success");
        loadDashboardData();
      } catch (error) {
        console.error("Error deleting notification:", error);
        showSnackbarMessage("Lỗi khi xóa thông báo", "error");
      }
    },
    [showSnackbarMessage, loadDashboardData]
  );

  // 🎯 Hàm xử lý đánh dấu tất cả thông báo đã đọc
  const handleMarkAllNotificationsAsRead = useCallback(async () => {
    try {
      await notificationService.markAllNotificationsAsRead(
        user_id // Sử dụng user_id
      );

      // Update local state
      setNotifications((prevNotifications) =>
        prevNotifications.map((notification) => ({
          ...notification,
          isRead: true,
        }))
      );

      showSnackbarMessage("Đã đánh dấu tất cả thông báo đã đọc", "success");
      loadDashboardData();
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      showSnackbarMessage("Lỗi khi đánh dấu thông báo", "error");
    }
  }, [user_id, showSnackbarMessage, loadDashboardData]);

  // 🎯 Load data khi tab thay đổi hoặc user_id thay đổi
  useEffect(() => {
    if (user_id) {
      loadDashboardData();
    }
  }, [activeTab, user_id, loadDashboardData]);

  // Tính toán số thông báo chưa đọc
  const unreadNotificationsCount = notifications.filter(
    (n) => !n.isRead
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
      {!isLoggedIn && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Vui lòng đăng nhập để sử dụng tính năng
        </Alert>
      )}

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="fullWidth"
        >
          <Tab
            icon={<Dashboard />}
            label="Tổng quan"
            sx={{ fontWeight: activeTab === 0 ? "bold" : "normal" }}
          />
          <Tab
            icon={<TaskAlt />}
            label="Công việc"
            sx={{ fontWeight: activeTab === 1 ? "bold" : "normal" }}
          />
          <Tab
            icon={<AccessTime />}
            label="Nhắc nhở"
            sx={{ fontWeight: activeTab === 2 ? "bold" : "normal" }}
          />
          <Tab
            icon={
              <Badge badgeContent={unreadNotificationsCount} color="error">
                <NotificationsActive />
              </Badge>
            }
            label="Thông báo"
            sx={{ fontWeight: activeTab === 3 ? "bold" : "normal" }}
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
              currentUser={currentUser}
              dashboardStats={dashboardStats}
              tasks={tasks}
              reminders={reminders}
              notifications={notifications}
              onRefresh={loadDashboardData}
            />
          </Box>
        )}

        {activeTab === 1 && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <TaskManagement
              loading={loading}
              tasks={tasks}
              currentUser={currentUser}
              onRefresh={loadDashboardData}
              onUpdateTaskStatus={handleUpdateTaskStatus}
            />
          </Box>
        )}

        {activeTab === 2 && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <ReminderSystem
              loading={loading}
              reminders={reminders}
              currentUser={currentUser}
              onRefresh={loadDashboardData}
              onDeleteReminder={handleDeleteReminder}
            />
          </Box>
        )}

        {activeTab === 3 && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <NotificationCenter
              loading={loading}
              notifications={notifications}
              unreadNotificationsCount={unreadNotificationsCount}
              onRefresh={loadDashboardData}
              onMarkAsRead={handleMarkNotificationAsRead}
              onDeleteNotification={handleDeleteNotification}
              onMarkAllAsRead={handleMarkAllNotificationsAsRead}
            />
          </Box>
        )}
      </Box>

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
