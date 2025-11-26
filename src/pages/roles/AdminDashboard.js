// src/pages/roles/AdminDashboard.js
import React, { useState, useEffect } from "react";
import {
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Paper,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  LinearProgress,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  Tabs,
  Tab,
  Snackbar,
  CircularProgress,
  Divider,
  Badge,
} from "@mui/material";
import {
  AdminPanelSettings,
  People,
  Task,
  Notifications,
  Analytics,
  TrendingUp,
  Schedule,
  Warning,
  CheckCircle,
  PlayArrow,
  Visibility,
  Add,
  Refresh,
  AccessTime,
  Person,
  CalendarToday,
  Description,
  Delete,
  Block,
  Check,
  MarkEmailRead,
  NotificationsActive,
} from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

// Import services
import taskService from "../../services/taskService";
import analyticsService from "../../services/analyticsService";
import notificationService from "../../services/notificationService"; // 🆕 Import notification service
import { showSnackbar, closeSnackBar } from "../../redux/slices/app";
import { useDispatch, useSelector } from "react-redux";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [createTaskDialog, setCreateTaskDialog] = useState(false);
  const [viewTaskDialog, setViewTaskDialog] = useState(false);
  const [deleteTaskDialog, setDeleteTaskDialog] = useState(false);
  const [createNotificationDialog, setCreateNotificationDialog] =
    useState(false); // 🆕 Dialog tạo thông báo
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
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
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigneeId: "",
    priority: "medium",
    dueDate: "",
  });
  const [newNotification, setNewNotification] = useState({
    // 🆕 State cho thông báo mới
    title: "",
    message: "",
    type: "info",
    priority: "medium",
    recipientType: "all",
    recipientIds: [],
    source: "System Admin",
  });
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false); // 🆕 Loading cho thông báo

  // State cho notifications
  const [usersList, setUsersList] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [notificationStats, setNotificationStats] = useState({}); // 🆕 Stats thông báo
  const [usersLoading, setUsersLoading] = useState(false);
  const [notificationsLoading, setNotificationsLoading] = useState(false);

  const dispatch = useDispatch();
  const { snackbar } = useSelector((state) => state.app);

  const [currentUser, setCurrentUser] = useState(null);

  // 🆕 Lấy current user từ Keycloak
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const userInfo = {
          keycloakId: "f5dcb70a-4b2e-4f9c-a17f-3015cb6aed42", // Hoang Ngan - Admin
          username: "hoangngan",
          firstName: "Hoang",
          lastName: "Ngan",
          email: "hoangngan123@gmail.com",
          roles: ["admin", "user"],
        };
        setCurrentUser(userInfo);
      } catch (error) {
        console.error("Error loading current user:", error);
        showSnackbarMessage("Lỗi khi tải thông tin người dùng", "error");
      }
    };

    loadCurrentUser();
  }, []);

  // 🆕 Load real data từ backend
  useEffect(() => {
    if (currentUser) {
      loadDashboardData();
    }
  }, [activeTab, currentUser]);

  // 🆕 Hàm hiển thị snackbar sử dụng Redux
  const showSnackbarMessage = (message, severity = "success") => {
    dispatch(showSnackbar({ message, severity }));
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      if (activeTab === 0) {
        // Load overview data với notifications
        const [stats, activity, statusDist, notifStats] = await Promise.all([
          analyticsService.getSystemStats(),
          analyticsService.getUserActivityData(),
          analyticsService.getTaskStatusDistribution(),
          notificationService.getNotificationStats(), // 🆕 Load notification stats
        ]);

        setSystemStats(stats);
        setUserActivityData(activity);
        setTaskStatusData(statusDist);
        setNotificationStats(notifStats.data || {}); // 🆕 Set notification stats
      } else if (activeTab === 1) {
        // Load users data
        setUsersLoading(true);
        try {
          const usersResponse = await analyticsService.getUsersList();
          setUsersList(usersResponse.data || []);
        } catch (error) {
          console.error("Error loading users:", error);
          setUsersList([
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
          ]);
        }
        setUsersLoading(false);
      } else if (activeTab === 2) {
        // Load tasks data
        if (currentUser) {
          const tasksResponse = await taskService.getUserTasks(
            currentUser.keycloakId,
            {
              status: "all",
              page: 1,
              limit: 10,
            }
          );
          setRecentTasks(tasksResponse.data || []);
        }
      } else if (activeTab === 3) {
        // Load notifications data với notificationService
        setNotificationsLoading(true);
        try {
          const [notificationsResponse, stats] = await Promise.all([
            notificationService.getAllAdminNotifications({
              page: 1,
              limit: 20,
            }),
            notificationService.getNotificationStats(),
          ]);

          setNotifications(notificationsResponse.data || []);
          setNotificationStats(stats.data || {});
        } catch (error) {
          console.error("Error loading notifications:", error);
          setNotifications([
            {
              _id: "1",
              title: "Hệ thống khởi động thành công",
              message: "Hệ thống đã khởi động và sẵn sàng hoạt động",
              type: "info",
              priority: "medium",
              isRead: false,
              createdAt: new Date().toISOString(),
              source: "System",
            },
            {
              _id: "2",
              title: "Cảnh báo hiệu suất",
              message: "Hiệu suất hệ thống đang ở mức cao",
              type: "warning",
              priority: "high",
              isRead: true,
              createdAt: new Date().toISOString(),
              source: "Monitoring",
            },
          ]);
        }
        setNotificationsLoading(false);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      showSnackbarMessage("Lỗi khi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  };

  // 🆕 Hàm xử lý xóa task
  const handleDeleteTask = async () => {
    if (!currentUser || !taskToDelete) return;

    try {
      setDeleteLoading(true);
      const response = await taskService.deleteTask(
        taskToDelete._id,
        currentUser.keycloakId
      );

      if (response.status === "success") {
        showSnackbarMessage("Xóa task thành công!", "success");
        setDeleteTaskDialog(false);
        setTaskToDelete(null);
        loadDashboardData();
      } else {
        showSnackbarMessage(response.message || "Lỗi khi xóa task", "error");
      }
    } catch (error) {
      console.error("Error deleting task:", error);
      showSnackbarMessage("Lỗi khi xóa task", "error");
    } finally {
      setDeleteLoading(false);
    }
  };

  // 🆕 Hàm mở dialog xác nhận xóa
  const handleOpenDeleteDialog = (task) => {
    setTaskToDelete(task);
    setDeleteTaskDialog(true);
  };

  // 🆕 Hàm xử lý thay đổi trạng thái người dùng
  const handleUserStatusChange = async (userId, newStatus) => {
    try {
      const response = await analyticsService.updateUserStatus(
        userId,
        newStatus
      );
      if (response.status === "success") {
        showSnackbarMessage(
          "Cập nhật trạng thái người dùng thành công",
          "success"
        );
        if (activeTab === 1) {
          const usersResponse = await analyticsService.getUsersList();
          setUsersList(usersResponse.data || []);
        }
      } else {
        showSnackbarMessage(response.message || "Lỗi khi cập nhật", "error");
      }
    } catch (error) {
      console.error("Error updating user status:", error);
      showSnackbarMessage("Lỗi khi cập nhật trạng thái người dùng", "error");
    }
  };

  // 🆕 Hàm xử lý đánh dấu thông báo đã đọc với notificationService
  const handleMarkNotificationAsRead = async (notificationId) => {
    try {
      const response = await notificationService.markNotificationAsRead(
        notificationId
      );
      if (response.status === "success") {
        showSnackbarMessage("Đã đánh dấu thông báo", "success");
        loadDashboardData(); // Refresh notifications
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
      showSnackbarMessage("Lỗi khi đánh dấu thông báo", "error");
    }
  };

  // 🆕 Hàm xử lý xóa thông báo với notificationService
  const handleDeleteNotification = async (notificationId) => {
    try {
      const response = await notificationService.deleteNotification(
        notificationId
      );
      if (response.status === "success") {
        showSnackbarMessage("Đã xóa thông báo", "success");
        loadDashboardData(); // Refresh notifications
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
      showSnackbarMessage("Lỗi khi xóa thông báo", "error");
    }
  };

  // 🆕 Hàm tạo thông báo hệ thống
  const handleCreateNotification = async () => {
    try {
      setNotificationLoading(true);
      const response = await notificationService.createSystemNotification(
        newNotification
      );

      if (response.status === "success") {
        showSnackbarMessage("Tạo thông báo thành công!", "success");
        setCreateNotificationDialog(false);
        setNewNotification({
          title: "",
          message: "",
          type: "info",
          priority: "medium",
          recipientType: "all",
          recipientIds: [],
          source: "System Admin",
        });
        loadDashboardData(); // Refresh data
      } else {
        showSnackbarMessage(
          response.message || "Lỗi khi tạo thông báo",
          "error"
        );
      }
    } catch (error) {
      console.error("Error creating notification:", error);
      showSnackbarMessage("Lỗi khi tạo thông báo", "error");
    } finally {
      setNotificationLoading(false);
    }
  };

  // 🆕 Hàm đánh dấu tất cả thông báo đã đọc
  const handleMarkAllNotificationsAsRead = async () => {
    try {
      const response = await notificationService.markAllNotificationsAsRead(
        currentUser.keycloakId,
        currentUser.roles
      );
      if (response.status === "success") {
        showSnackbarMessage("Đã đánh dấu tất cả thông báo đã đọc", "success");
        loadDashboardData();
      }
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      showSnackbarMessage("Lỗi khi đánh dấu thông báo", "error");
    }
  };

  // 🆕 Hàm xem chi tiết task
  const handleViewTask = async (task) => {
    if (!currentUser) {
      showSnackbarMessage("Vui lòng đăng nhập", "error");
      return;
    }

    setSelectedTask(task);
    setViewTaskDialog(true);
    setDetailLoading(true);

    try {
      const response = await taskService.getTaskDetail(
        task._id,
        currentUser.keycloakId
      );

      if (response.status === "success") {
        setTaskDetail(response.data);
      } else {
        showSnackbarMessage(
          response.message || "Lỗi khi tải chi tiết task",
          "error"
        );
        setTaskDetail(task);
      }
    } catch (error) {
      console.error("Error loading task detail:", error);
      showSnackbarMessage("Lỗi khi tải chi tiết task", "error");
      setTaskDetail(task);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCreateTask = async () => {
    if (!currentUser) {
      showSnackbarMessage("Vui lòng đăng nhập", "error");
      return;
    }

    try {
      setLoading(true);
      const taskData = {
        ...newTask,
        assignerId: currentUser.keycloakId,
      };

      const response = await taskService.createTask(taskData);

      if (response.status === "success") {
        showSnackbarMessage("Tạo task thành công!", "success");
        setCreateTaskDialog(false);
        setNewTask({
          title: "",
          description: "",
          assigneeId: "",
          priority: "medium",
          dueDate: "",
        });

        // Tạo thông báo tự động cho task mới
        await notificationService.createAutoSystemNotification("task_created", {
          taskId: response.data._id,
          taskTitle: newTask.title,
          creatorName: currentUser.firstName + " " + currentUser.lastName,
          assigneeId: newTask.assigneeId,
        });

        if (activeTab === 2) {
          loadDashboardData();
        }
      } else {
        showSnackbarMessage(response.message || "Lỗi khi tạo task", "error");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      showSnackbarMessage("Lỗi khi tạo task", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    if (!currentUser) return;

    try {
      const response = await taskService.updateTask(
        taskId,
        currentUser.keycloakId,
        {
          status: newStatus,
        }
      );

      if (response.status === "success") {
        showSnackbarMessage("Cập nhật trạng thái thành công!", "success");

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
                  currentUser.firstName + " " + currentUser.lastName,
                assignerId: task.assignerId?._id,
              }
            );
          }
        }

        loadDashboardData();
        setViewTaskDialog(false);
      } else {
        showSnackbarMessage(response.message || "Lỗi khi cập nhật", "error");
      }
    } catch (error) {
      console.error("Error updating task status:", error);
      showSnackbarMessage("Lỗi khi cập nhật trạng thái", "error");
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      todo: "#ff6b6b",
      in_progress: "#4ecdc4",
      review: "#45b7d1",
      done: "#96ceb4",
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

  const getNotificationTypeColor = (type) => {
    const colors = {
      info: "#2196f3",
      success: "#4caf50",
      warning: "#ff9800",
      error: "#f44336",
    };
    return colors[type] || "#666";
  };

  const getStatusText = (status) => {
    const statusMap = {
      todo: "Chưa làm",
      in_progress: "Đang làm",
      review: "Chờ duyệt",
      done: "Hoàn thành",
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

  const formatDate = (dateString) => {
    if (!dateString) return "Không có";
    return new Date(dateString).toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 🆕 Users list từ database
  const users = [
    { keycloakId: "e0d7a6e9-98d6-4481-bdd1-dd68283b65c4", name: "An Nguyen" },
    { keycloakId: "f5dcb70a-4b2e-4f9c-a17f-3015cb6aed42", name: "Hoang Ngan" },
    { keycloakId: "ba025aa5-6cfb-463c-b245-e94472081d45", name: "Hao Nguyen" },
    { keycloakId: "0da81ddf-8ba1-4dca-86df-e219df84c699", name: "Thu Nguyen" },
    { keycloakId: "9a3c43e8-9edd-4efe-977d-bf03168a6c30", name: "Dan Nguyen" },
    { keycloakId: "faf4e025-74c8-4043-80d9-5bac987b9c01", name: "Theanh Luu" },
  ];

  // 🆕 Dữ liệu mẫu cho biểu đồ thông báo
  const notificationChartData = [
    { name: "T2", info: 12, warning: 4, error: 2, success: 8 },
    { name: "T3", info: 8, warning: 2, error: 1, success: 10 },
    { name: "T4", info: 15, warning: 5, error: 3, success: 12 },
    { name: "T5", info: 10, warning: 3, error: 1, success: 9 },
    { name: "T6", info: 18, warning: 6, error: 4, success: 14 },
    { name: "T7", info: 14, warning: 4, error: 2, success: 11 },
    { name: "CN", info: 9, warning: 2, error: 1, success: 7 },
  ];

  // 🆕 Tính toán số thông báo chưa đọc
  const unreadNotificationsCount = notifications.filter(
    (notif) => !notif.isRead
  ).length;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 4,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <AdminPanelSettings color="primary" sx={{ fontSize: 48 }} />
          <Box>
            <Typography variant="h4" fontWeight="bold" color="primary">
              Admin Dashboard
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              Quản lý hệ thống & Phân tích hiệu suất
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={<Notifications />}
            onClick={() => setCreateNotificationDialog(true)}
          >
            Tạo Thông báo
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setCreateTaskDialog(true)}
            disabled={!currentUser}
          >
            Tạo Task Mới
          </Button>
        </Box>
      </Box>

      {!currentUser && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Vui lòng đăng nhập để sử dụng tính năng quản lý task
        </Alert>
      )}

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
        >
          <Tab icon={<Analytics />} label="Tổng quan" />
          <Tab icon={<People />} label="Người dùng" />
          <Tab icon={<Task />} label="Quản lý Task" />
          <Tab
            icon={
              <Badge badgeContent={unreadNotificationsCount} color="error">
                <Notifications />
              </Badge>
            }
            label="Thông báo"
          />
        </Tabs>
      </Paper>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Overview Tab với thông tin notifications */}
      {activeTab === 0 && !loading && (
        <Grid container spacing={3}>
          {/* System Stats Cards */}
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: "primary.main", color: "white" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <People sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {systemStats.totalUsers}
                    </Typography>
                    <Typography variant="body2">Tổng người dùng</Typography>
                    <Chip
                      label={`${systemStats.onlineUsers} online`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.2)",
                        color: "white",
                        mt: 1,
                      }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: "secondary.main", color: "white" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Task sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {systemStats.totalTasks}
                    </Typography>
                    <Typography variant="body2">Tổng tasks</Typography>
                    <Chip
                      label={`${systemStats.completedTasks} hoàn thành`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.2)",
                        color: "white",
                        mt: 1,
                      }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Thống kê thông báo Card */}
          <Grid item xs={12} md={3}>
            <Card sx={{ bgcolor: "info.main", color: "white" }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Notifications sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography variant="h4" fontWeight="bold">
                      {notificationStats.totalNotifications || 0}
                    </Typography>
                    <Typography variant="body2">Tổng thông báo</Typography>
                    <Chip
                      label={`${notificationStats.unreadCount || 0} chưa đọc`}
                      size="small"
                      sx={{
                        bgcolor: "rgba(255,255,255,0.2)",
                        color: "white",
                        mt: 1,
                      }}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Hiệu suất hệ thống Card */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <TrendingUp color="success" sx={{ fontSize: 40 }} />
                  <Box>
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color="success.main"
                    >
                      {systemStats.systemLoad}%
                    </Typography>
                    <Typography variant="body2">Hiệu suất hệ thống</Typography>
                    <LinearProgress
                      variant="determinate"
                      value={systemStats.systemLoad}
                      sx={{ mt: 1 }}
                      color={systemStats.systemLoad > 80 ? "error" : "success"}
                    />
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          {/* Charts */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Hoạt động hệ thống (7 ngày)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={userActivityData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="messages"
                      stroke="#8884d8"
                      name="Tin nhắn"
                    />
                    <Line
                      type="monotone"
                      dataKey="tasks"
                      stroke="#82ca9d"
                      name="Tasks"
                    />
                    <Line
                      type="monotone"
                      dataKey="online"
                      stroke="#ffc658"
                      name="Online"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Phân bổ Task
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={taskStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {taskStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* 🆕 Biểu đồ thông báo */}
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Phân tích Thông báo (7 ngày gần nhất)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={notificationChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="info" fill="#2196f3" name="Thông tin" />
                    <Bar dataKey="success" fill="#4caf50" name="Thành công" />
                    <Bar dataKey="warning" fill="#ff9800" name="Cảnh báo" />
                    <Bar dataKey="error" fill="#f44336" name="Lỗi" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Users Tab */}
      {activeTab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Typography variant="h5">Quản lý Người dùng</Typography>
                  <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                    <Typography variant="body2" color="text.secondary">
                      Tổng số: {usersList.length} người dùng
                    </Typography>
                    <Button startIcon={<Refresh />} onClick={loadDashboardData}>
                      Refresh
                    </Button>
                  </Box>
                </Box>

                {usersLoading ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", py: 4 }}
                  >
                    <CircularProgress />
                  </Box>
                ) : usersList.length === 0 ? (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ textAlign: "center", py: 4 }}
                  >
                    Không có người dùng nào
                  </Typography>
                ) : (
                  <List>
                    {usersList.map((user) => (
                      <ListItem
                        key={user._id}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          mb: 1,
                          bgcolor: "background.default",
                        }}
                        secondaryAction={
                          <Box
                            sx={{
                              display: "flex",
                              gap: 1,
                              alignItems: "center",
                            }}
                          >
                            <Chip
                              label={
                                user.isActive ? "Đang hoạt động" : "Đã khóa"
                              }
                              color={user.isActive ? "success" : "error"}
                              size="small"
                            />
                            <IconButton
                              color={user.isActive ? "error" : "success"}
                              onClick={() =>
                                handleUserStatusChange(user._id, !user.isActive)
                              }
                              title={
                                user.isActive
                                  ? "Khóa người dùng"
                                  : "Mở khóa người dùng"
                              }
                            >
                              {user.isActive ? <Block /> : <Check />}
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemIcon>
                          <Avatar
                            sx={{
                              bgcolor: user.isActive
                                ? "primary.main"
                                : "grey.500",
                            }}
                            src={user.avatar}
                          >
                            {!user.avatar && <Person />}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Typography variant="h6">
                                {user.firstName} {user.lastName}
                              </Typography>
                              {user.roles?.includes("admin") && (
                                <Chip
                                  label="Admin"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box
                              sx={{
                                display: "flex",
                                gap: 3,
                                mt: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography variant="body2">
                                Email: <strong>{user.email}</strong>
                              </Typography>
                              <Typography variant="body2">
                                Username: <strong>{user.username}</strong>
                              </Typography>
                              <Typography variant="body2">
                                Ngày tham gia:{" "}
                                <strong>
                                  {new Date(user.createdAt).toLocaleDateString(
                                    "vi-VN"
                                  )}
                                </strong>
                              </Typography>
                              <Typography variant="body2">
                                Lần đăng nhập cuối:{" "}
                                <strong>
                                  {user.lastLogin
                                    ? new Date(
                                        user.lastLogin
                                      ).toLocaleDateString("vi-VN")
                                    : "Chưa đăng nhập"}
                                </strong>
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tasks Management Tab với real data */}
      {activeTab === 2 && !loading && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Typography variant="h5">Quản lý Tasks</Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button startIcon={<Refresh />} onClick={loadDashboardData}>
                      Refresh
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setCreateTaskDialog(true)}
                      disabled={!currentUser}
                    >
                      Tạo Task
                    </Button>
                  </Box>
                </Box>

                {recentTasks.length === 0 ? (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ textAlign: "center", py: 4 }}
                  >
                    Chưa có task nào
                  </Typography>
                ) : (
                  <List>
                    {recentTasks.map((task) => (
                      <ListItem
                        key={task._id}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          mb: 1,
                          bgcolor: "background.default",
                        }}
                        secondaryAction={
                          <Box sx={{ display: "flex", gap: 1 }}>
                            <IconButton
                              color="info"
                              onClick={() => handleViewTask(task)}
                              title="Xem chi tiết"
                            >
                              <Visibility />
                            </IconButton>
                            {task.status !== "done" && (
                              <IconButton
                                color="success"
                                onClick={() =>
                                  handleUpdateTaskStatus(task._id, "done")
                                }
                                title="Đánh dấu hoàn thành"
                              >
                                <CheckCircle />
                              </IconButton>
                            )}
                            <IconButton
                              color="error"
                              onClick={() => handleOpenDeleteDialog(task)}
                              title="Xóa task"
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemIcon>
                          <Avatar
                            sx={{ bgcolor: getPriorityColor(task.priority) }}
                          >
                            <Task />
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Typography variant="h6">{task.title}</Typography>
                              <Chip
                                label={getPriorityText(task.priority)}
                                size="small"
                                sx={{
                                  bgcolor: getPriorityColor(task.priority),
                                  color: "white",
                                }}
                              />
                              <Chip
                                label={getStatusText(task.status)}
                                size="small"
                                sx={{
                                  bgcolor: getStatusColor(task.status),
                                  color: "white",
                                }}
                              />
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
                              <Typography variant="body2">
                                Người giao:{" "}
                                <strong>
                                  {task.assignerId?.username || "Unknown User"}
                                </strong>
                              </Typography>
                              <Typography variant="body2">
                                Người nhận:{" "}
                                <strong>
                                  {task.assigneeId?.username || "Unknown User"}
                                </strong>
                              </Typography>
                              {task.dueDate && (
                                <Typography variant="body2">
                                  Hạn:{" "}
                                  <strong>
                                    {new Date(task.dueDate).toLocaleDateString(
                                      "vi-VN"
                                    )}
                                  </strong>
                                </Typography>
                              )}
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Notifications Tab với notificationService */}
      {activeTab === 3 && (
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Card>
              <CardContent>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    mb: 3,
                  }}
                >
                  <Typography variant="h5">
                    Quản lý Thông báo Hệ thống
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1 }}>
                    <Button
                      variant="outlined"
                      startIcon={<MarkEmailRead />}
                      onClick={handleMarkAllNotificationsAsRead}
                      disabled={unreadNotificationsCount === 0}
                    >
                      Đánh dấu tất cả đã đọc
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={<Add />}
                      onClick={() => setCreateNotificationDialog(true)}
                    >
                      Tạo Thông báo
                    </Button>
                    <Button
                      variant="outlined"
                      startIcon={<Refresh />}
                      onClick={loadDashboardData}
                    >
                      Refresh
                    </Button>
                  </Box>
                </Box>

                {/* Thống kê nhanh */}
                <Grid container spacing={2} sx={{ mb: 3 }}>
                  <Grid item xs={12} md={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: "center" }}>
                        <Typography variant="h4" color="primary">
                          {notificationStats.totalNotifications || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tổng thông báo
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: "center" }}>
                        <Typography variant="h4" color="error">
                          {unreadNotificationsCount}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Chưa đọc
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: "center" }}>
                        <Typography variant="h4" color="warning.main">
                          {notificationStats.todayCount || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Hôm nay
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} md={3}>
                    <Card variant="outlined">
                      <CardContent sx={{ textAlign: "center" }}>
                        <Typography variant="h4" color="success.main">
                          {notificationStats.thisWeekCount || 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tuần này
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {notificationsLoading ? (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", py: 4 }}
                  >
                    <CircularProgress />
                  </Box>
                ) : notifications.length === 0 ? (
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ textAlign: "center", py: 4 }}
                  >
                    Không có thông báo nào
                  </Typography>
                ) : (
                  <List>
                    {notifications.map((notification) => (
                      <ListItem
                        key={notification._id}
                        sx={{
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 2,
                          mb: 1,
                          bgcolor: notification.isRead
                            ? "background.default"
                            : "action.hover",
                        }}
                        secondaryAction={
                          <Box sx={{ display: "flex", gap: 1 }}>
                            {!notification.isRead && (
                              <IconButton
                                color="primary"
                                onClick={() =>
                                  handleMarkNotificationAsRead(notification._id)
                                }
                                title="Đánh dấu đã đọc"
                              >
                                <CheckCircle />
                              </IconButton>
                            )}
                            <IconButton
                              color="error"
                              onClick={() =>
                                handleDeleteNotification(notification._id)
                              }
                              title="Xóa thông báo"
                            >
                              <Delete />
                            </IconButton>
                          </Box>
                        }
                      >
                        <ListItemIcon>
                          <Avatar
                            sx={{
                              bgcolor: getNotificationTypeColor(
                                notification.type
                              ),
                            }}
                          >
                            {notification.type === "error" ? (
                              <Warning />
                            ) : notification.type === "warning" ? (
                              <Warning />
                            ) : notification.type === "success" ? (
                              <CheckCircle />
                            ) : (
                              <Notifications />
                            )}
                          </Avatar>
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: notification.isRead
                                    ? "normal"
                                    : "bold",
                                }}
                              >
                                {notification.title}
                              </Typography>
                              <Chip
                                label={
                                  notification.type === "error"
                                    ? "Lỗi"
                                    : notification.type === "warning"
                                    ? "Cảnh báo"
                                    : notification.type === "success"
                                    ? "Thành công"
                                    : "Thông tin"
                                }
                                size="small"
                                color={
                                  notification.type === "error"
                                    ? "error"
                                    : notification.type === "warning"
                                    ? "warning"
                                    : notification.type === "success"
                                    ? "success"
                                    : "info"
                                }
                              />
                              <Chip
                                label={getPriorityText(notification.priority)}
                                size="small"
                                variant="outlined"
                                sx={{
                                  color: getPriorityColor(
                                    notification.priority
                                  ),
                                  borderColor: getPriorityColor(
                                    notification.priority
                                  ),
                                }}
                              />
                              {!notification.isRead && (
                                <Chip
                                  label="Mới"
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box sx={{ mt: 1 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: notification.isRead
                                    ? "normal"
                                    : "medium",
                                }}
                              >
                                {notification.message}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 3,
                                  mt: 1,
                                  flexWrap: "wrap",
                                }}
                              >
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  Thời gian:{" "}
                                  <strong>
                                    {formatDate(notification.createdAt)}
                                  </strong>
                                </Typography>
                                {notification.source && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Nguồn:{" "}
                                    <strong>{notification.source}</strong>
                                  </Typography>
                                )}
                                {notification.recipientType && (
                                  <Typography
                                    variant="body2"
                                    color="text.secondary"
                                  >
                                    Đối tượng:{" "}
                                    <strong>
                                      {notification.recipientType === "all"
                                        ? "Tất cả"
                                        : notification.recipientType === "admin"
                                        ? "Quản trị viên"
                                        : "Người dùng"}
                                    </strong>
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Create Task Dialog */}
      <Dialog
        open={createTaskDialog}
        onClose={() => setCreateTaskDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Add color="primary" />
            <Typography variant="h6">Tạo Task Mới</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tiêu đề task"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                placeholder="Nhập tiêu đề task..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Mô tả"
                value={newTask.description}
                onChange={(e) =>
                  setNewTask({ ...newTask, description: e.target.value })
                }
                placeholder="Mô tả chi tiết task..."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Người nhận"
                value={newTask.assigneeId}
                onChange={(e) =>
                  setNewTask({ ...newTask, assigneeId: e.target.value })
                }
              >
                {users.map((user) => (
                  <MenuItem key={user.keycloakId} value={user.keycloakId}>
                    {user.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Độ ưu tiên"
                value={newTask.priority}
                onChange={(e) =>
                  setNewTask({ ...newTask, priority: e.target.value })
                }
              >
                <MenuItem value="low">Thấp</MenuItem>
                <MenuItem value="medium">Trung bình</MenuItem>
                <MenuItem value="high">Cao</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Hạn hoàn thành"
                value={newTask.dueDate}
                onChange={(e) =>
                  setNewTask({ ...newTask, dueDate: e.target.value })
                }
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCreateTaskDialog(false)}>Hủy</Button>
          <Button
            variant="contained"
            onClick={handleCreateTask}
            disabled={!newTask.title || !newTask.assigneeId || loading}
          >
            {loading ? "Đang tạo..." : "Tạo Task"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Create Notification Dialog */}
      <Dialog
        open={createNotificationDialog}
        onClose={() => setCreateNotificationDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <NotificationsActive color="primary" />
            <Typography variant="h6">Tạo Thông báo Hệ thống</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tiêu đề thông báo"
                value={newNotification.title}
                onChange={(e) =>
                  setNewNotification({
                    ...newNotification,
                    title: e.target.value,
                  })
                }
                placeholder="Nhập tiêu đề thông báo..."
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Nội dung thông báo"
                value={newNotification.message}
                onChange={(e) =>
                  setNewNotification({
                    ...newNotification,
                    message: e.target.value,
                  })
                }
                placeholder="Nhập nội dung thông báo..."
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Loại thông báo"
                value={newNotification.type}
                onChange={(e) =>
                  setNewNotification({
                    ...newNotification,
                    type: e.target.value,
                  })
                }
              >
                <MenuItem value="info">Thông tin</MenuItem>
                <MenuItem value="success">Thành công</MenuItem>
                <MenuItem value="warning">Cảnh báo</MenuItem>
                <MenuItem value="error">Lỗi</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Độ ưu tiên"
                value={newNotification.priority}
                onChange={(e) =>
                  setNewNotification({
                    ...newNotification,
                    priority: e.target.value,
                  })
                }
              >
                <MenuItem value="low">Thấp</MenuItem>
                <MenuItem value="medium">Trung bình</MenuItem>
                <MenuItem value="high">Cao</MenuItem>
                <MenuItem value="critical">Khẩn cấp</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                select
                label="Đối tượng nhận"
                value={newNotification.recipientType}
                onChange={(e) =>
                  setNewNotification({
                    ...newNotification,
                    recipientType: e.target.value,
                  })
                }
              >
                <MenuItem value="all">Tất cả người dùng</MenuItem>
                <MenuItem value="admin">Quản trị viên</MenuItem>
                <MenuItem value="user">Người dùng thường</MenuItem>
              </TextField>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Nguồn thông báo"
                value={newNotification.source}
                onChange={(e) =>
                  setNewNotification({
                    ...newNotification,
                    source: e.target.value,
                  })
                }
                placeholder="VD: System Admin, Monitoring..."
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setCreateNotificationDialog(false)}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateNotification}
            disabled={
              !newNotification.title ||
              !newNotification.message ||
              notificationLoading
            }
          >
            {notificationLoading ? "Đang tạo..." : "Tạo Thông báo"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* View Task Detail Dialog */}
      <Dialog
        open={viewTaskDialog}
        onClose={() => setViewTaskDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Task color="primary" />
            <Typography variant="h6">Chi tiết Task</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          {detailLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            taskDetail && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h5" gutterBottom>
                  {taskDetail.title}
                </Typography>

                {taskDetail.description && (
                  <>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Description color="action" />
                      <Typography variant="subtitle1" fontWeight="bold">
                        Mô tả:
                      </Typography>
                    </Box>
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      paragraph
                      sx={{ ml: 3 }}
                    >
                      {taskDetail.description}
                    </Typography>
                  </>
                )}

                <Divider sx={{ my: 2 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Person color="action" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        Trạng thái:
                      </Typography>
                    </Box>
                    <Chip
                      label={getStatusText(taskDetail.status)}
                      sx={{
                        bgcolor: getStatusColor(taskDetail.status),
                        color: "white",
                        ml: 3,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Warning color="action" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        Độ ưu tiên:
                      </Typography>
                    </Box>
                    <Chip
                      label={getPriorityText(taskDetail.priority)}
                      sx={{
                        bgcolor: getPriorityColor(taskDetail.priority),
                        color: "white",
                        ml: 3,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Person color="action" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        Người giao:
                      </Typography>
                    </Box>
                    <Typography sx={{ ml: 3 }}>
                      {taskDetail.assignerId?.username || "Unknown User"}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <Person color="action" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        Người nhận:
                      </Typography>
                    </Box>
                    <Typography sx={{ ml: 3 }}>
                      {taskDetail.assigneeId?.username || "Unknown User"}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <CalendarToday color="action" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        Ngày tạo:
                      </Typography>
                    </Box>
                    <Typography sx={{ ml: 3 }}>
                      {formatDate(taskDetail.createdAt)}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 1,
                      }}
                    >
                      <AccessTime color="action" />
                      <Typography variant="subtitle2" fontWeight="bold">
                        Hạn hoàn thành:
                      </Typography>
                    </Box>
                    <Typography sx={{ ml: 3 }}>
                      {taskDetail.dueDate
                        ? formatDate(taskDetail.dueDate)
                        : "Không có"}
                    </Typography>
                  </Grid>

                  {taskDetail.estimatedHours > 0 && (
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <AccessTime color="action" />
                        <Typography variant="subtitle2" fontWeight="bold">
                          Giờ ước tính:
                        </Typography>
                      </Box>
                      <Typography sx={{ ml: 3 }}>
                        {taskDetail.estimatedHours} giờ
                      </Typography>
                    </Grid>
                  )}

                  {taskDetail.tags && taskDetail.tags.length > 0 && (
                    <Grid item xs={12}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 1,
                        }}
                      >
                        <Typography variant="subtitle2" fontWeight="bold">
                          Tags:
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          ml: 3,
                          display: "flex",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        {taskDetail.tags.map((tag, index) => (
                          <Chip
                            key={index}
                            label={tag}
                            size="small"
                            variant="outlined"
                          />
                        ))}
                      </Box>
                    </Grid>
                  )}
                </Grid>

                {/* Activity Log Section */}
                {taskDetail.activityLog &&
                  taskDetail.activityLog.length > 0 && (
                    <>
                      <Divider sx={{ my: 3 }} />
                      <Typography variant="h6" gutterBottom>
                        Lịch sử hoạt động
                      </Typography>
                      <List dense>
                        {taskDetail.activityLog
                          .slice(0, 5)
                          .map((activity, index) => (
                            <ListItem key={index}>
                              <ListItemText
                                primary={`${
                                  activity.username || "Unknown User"
                                } - ${activity.action} - ${formatDate(
                                  activity.timestamp
                                )}`}
                                secondary={
                                  activity.details
                                    ? `Từ: ${
                                        activity.details.from || "N/A"
                                      } → Đến: ${activity.details.to || "N/A"}`
                                    : ""
                                }
                              />
                            </ListItem>
                          ))}
                      </List>
                    </>
                  )}
              </Box>
            )
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setViewTaskDialog(false)}>Đóng</Button>
          {taskDetail && taskDetail.status !== "done" && (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckCircle />}
              onClick={() => handleUpdateTaskStatus(taskDetail._id, "done")}
            >
              Đánh dấu hoàn thành
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Delete Task Confirmation Dialog */}
      <Dialog
        open={deleteTaskDialog}
        onClose={() => setDeleteTaskDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Warning color="error" />
            <Typography variant="h6">Xác nhận xóa Task</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Typography variant="body1">
            Bạn có chắc chắn muốn xóa task "
            <strong>{taskToDelete?.title}</strong>" không?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến task
            sẽ bị xóa vĩnh viễn.
          </Typography>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setDeleteTaskDialog(false)}
            disabled={deleteLoading}
          >
            Hủy
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteTask}
            disabled={deleteLoading}
            startIcon={
              deleteLoading ? <CircularProgress size={16} /> : <Delete />
            }
          >
            {deleteLoading ? "Đang xóa..." : "Xóa Task"}
          </Button>
        </DialogActions>
      </Dialog>

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
