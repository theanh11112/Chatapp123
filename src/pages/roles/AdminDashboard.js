// src/pages/roles/AdminDashboard.js
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
} from "@mui/icons-material";

// Import components
import DashboardHeader from "./components/DashboardHeader";
import OverviewTab from "./components/OverviewTab";
import UsersTab from "./components/UsersTab";
import TasksTab from "./components/TasksTab";
import NotificationsTab from "./components/NotificationsTab";
import RemindersTab from "./components/RemindersTab";
import CreateTaskDialog from "./components/dialogs/CreateTaskDialog";
import CreateNotificationDialog from "./components/dialogs/CreateNotificationDialog";
import CreateReminderDialog from "./components/dialogs/CreateReminderDialog";
import ViewTaskDialog from "./components/dialogs/ViewTaskDialog";
import DeleteTaskDialog from "./components/dialogs/DeleteTaskDialog";
import ViewReminderDialog from "./components/dialogs/ViewReminderDialog";

// Import services
import taskService from "../../services/taskService";
import reminderService from "../../services/reminderService";
import analyticsService from "../../services/analyticsService";
import notificationService from "../../services/notificationService";
import { showSnackbar, closeSnackBar } from "../../redux/slices/app";
import { useDispatch, useSelector } from "react-redux";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState(0);
  const [createTaskDialog, setCreateTaskDialog] = useState(false);
  const [createReminderDialog, setCreateReminderDialog] = useState(false);
  const [viewTaskDialog, setViewTaskDialog] = useState(false);
  const [viewReminderDialog, setViewReminderDialog] = useState(false);
  const [deleteTaskDialog, setDeleteTaskDialog] = useState(false);
  const [createNotificationDialog, setCreateNotificationDialog] =
    useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [selectedReminder, setSelectedReminder] = useState(null);

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
  const [notificationStats, setNotificationStats] = useState({});
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const { snackbar } = useSelector((state) => state.app);

  // 🆕 Lấy user từ auth slice thay vì app slice
  const {
    userInfo: currentUser,
    user_id,
    token,
    isLoggedIn,
  } = useSelector((state) => state.auth);

  console.log("Current User from auth:", currentUser);

  // 🆕 Hàm hiển thị snackbar với useCallback
  const showSnackbarMessage = useCallback(
    (message, severity = "success") => {
      dispatch(showSnackbar({ message, severity }));
    },
    [dispatch]
  );

  // 🆕 Hàm fallback để tạo dữ liệu mẫu
  const getFallbackData = useCallback((dataType) => {
    console.log(`Using fallback data for: ${dataType}`);

    switch (dataType) {
      case "systemStats":
        return {
          totalUsers: 150,
          onlineUsers: 23,
          totalTasks: 456,
          completedTasks: 289,
          systemLoad: 45,
          responseTime: 120,
        };
      case "userActivity":
        return [
          { date: "2024-01-01", activeUsers: 45 },
          { date: "2024-01-02", activeUsers: 52 },
          { date: "2024-01-03", activeUsers: 38 },
        ];
      case "taskStatus":
        return [
          { status: "pending", count: 45 },
          { status: "in_progress", count: 89 },
          { status: "done", count: 289 },
          { status: "cancelled", count: 33 },
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
          },
        ];
      default:
        return null;
    }
  }, []);

  // 🆕 Hàm load reminders với useCallback
  const loadReminders = useCallback(async () => {
    // Sử dụng user_id từ auth thay vì keycloakId
    if (!user_id) return;

    try {
      const response = await reminderService.getUserReminders(user_id, {
        page: 1,
        limit: 20,
        showSent: true,
      });
      setReminders(response.data || []);
    } catch (error) {
      console.error("Error loading reminders:", error);
      setReminders([]);
    }
  }, [user_id]);

  // 🆕 Hàm load dashboard data với useCallback
  const loadDashboardData = useCallback(async () => {
    // Sử dụng user_id từ auth thay vì keycloakId
    if (!user_id) return;

    setLoading(true);
    try {
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
        // 🆕 SỬA: Load users data với getAllUsers mới
        try {
          const usersResponse = await analyticsService.getAllUsers();
          if (usersResponse && usersResponse.status === "success") {
            console.log(
              "✅ Users loaded successfully:",
              usersResponse.data.length
            );
            setUsersList(usersResponse.data || []);
          } else {
            console.warn("⚠️ Using fallback users data");
            setUsersList(getFallbackData("usersList"));
          }
        } catch (error) {
          console.error("Error loading users, using fallback:", error);
          setUsersList(getFallbackData("usersList"));
        }
      } else if (activeTab === 2) {
        // Load tasks data
        try {
          const tasksResponse = await taskService.getUserTasks(
            user_id, // Sử dụng user_id
            {
              status: "all",
              page: 1,
              limit: 10,
            }
          );
          setRecentTasks(tasksResponse.data || []);
        } catch (error) {
          console.error("Error loading tasks:", error);
          setRecentTasks([]);
        }
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
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      showSnackbarMessage("Lỗi khi tải dữ liệu", "error");
    } finally {
      setLoading(false);
    }
  }, [activeTab, user_id, showSnackbarMessage, getFallbackData, loadReminders]);

  // 🆕 Hàm xử lý thay đổi role với useCallback
  const handleRoleChange = useCallback(
    async (userId, newRole) => {
      try {
        // TÌM USER TRONG usersList ĐỂ LẤY keycloakId
        const user = usersList.find((u) => u._id === userId);
        if (!user) {
          showSnackbarMessage("Không tìm thấy thông tin user", "error");
          return;
        }

        // Kiểm tra xem hàm có tồn tại không
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
        // TÌM USER TRONG usersList ĐỂ LẤY keycloakId
        const user = usersList.find((u) => u._id === userId);
        if (!user) {
          showSnackbarMessage("Không tìm thấy thông tin user", "error");
          return;
        }

        // Kiểm tra xem hàm có tồn tại không
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
    // Sử dụng user_id từ auth
    if (!user_id || !taskToDelete) return;

    try {
      const response = await taskService.deleteTask(
        taskToDelete._id,
        user_id // Sử dụng user_id
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
    }
  }, [user_id, taskToDelete, showSnackbarMessage, loadDashboardData]);

  // 🆕 Hàm mở dialog xác nhận xóa với useCallback
  const handleOpenDeleteDialog = useCallback((task) => {
    setTaskToDelete(task);
    setDeleteTaskDialog(true);
  }, []);

  // 🆕 Hàm xem chi tiết task với useCallback
  const handleViewTask = useCallback(
    async (task) => {
      // Sử dụng user_id từ auth
      if (!user_id) {
        showSnackbarMessage("Vui lòng đăng nhập", "error");
        return;
      }

      setSelectedTask(task);
      setViewTaskDialog(true);
    },
    [user_id, showSnackbarMessage]
  );

  // 🆕 Hàm xử lý xóa reminder với useCallback
  const handleDeleteReminder = useCallback(
    async (reminderId) => {
      // Sử dụng user_id từ auth
      if (!user_id) return;

      try {
        const response = await reminderService.deleteReminder(
          reminderId,
          user_id // Sử dụng user_id
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
        currentUser={currentUser} // Vẫn truyền currentUser cho component con
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
                  // TÌM USER TRONG usersList ĐỂ LẤY keycloakId
                  const user = usersList.find((u) => u._id === userId);
                  if (!user) {
                    showSnackbarMessage(
                      "Không tìm thấy thông tin user",
                      "error"
                    );
                    return;
                  }

                  // Kiểm tra hàm có tồn tại không
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
              recentTasks={recentTasks}
              currentUser={currentUser}
              onRefresh={loadDashboardData}
              onViewTask={handleViewTask}
              onUpdateTaskStatus={async (taskId, newStatus) => {
                // Sử dụng user_id từ auth
                if (!user_id) return;

                try {
                  const response = await taskService.updateTask(
                    taskId,
                    user_id, // Sử dụng user_id
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

                    loadDashboardData();
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
              onCreateReminder={() => setCreateReminderDialog(true)}
            />
          </Box>
        )}

        {activeTab === 4 && (
          <Box sx={{ flex: 1, overflow: "auto" }}>
            <NotificationsTab
              loading={loading}
              notifications={notifications}
              notificationStats={notificationStats}
              unreadNotificationsCount={unreadNotificationsCount}
              onRefresh={loadDashboardData}
              onMarkAsRead={async (notificationId) => {
                try {
                  const response =
                    await notificationService.markNotificationAsRead(
                      notificationId
                    );
                  if (response.status === "success") {
                    showSnackbarMessage("Đã đánh dấu thông báo", "success");
                    loadDashboardData();
                  }
                } catch (error) {
                  console.error("Error marking notification as read:", error);
                  showSnackbarMessage("Lỗi khi đánh dấu thông báo", "error");
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
                  }
                } catch (error) {
                  console.error("Error deleting notification:", error);
                  showSnackbarMessage("Lỗi khi xóa thông báo", "error");
                }
              }}
              onMarkAllAsRead={async () => {
                try {
                  const response =
                    await notificationService.markAllNotificationsAsRead(
                      user_id, // Sử dụng user_id
                      currentUser?.roles
                    );
                  if (response.status === "success") {
                    showSnackbarMessage(
                      "Đã đánh dấu tất cả thông báo đã đọc",
                      "success"
                    );
                    loadDashboardData();
                  }
                } catch (error) {
                  console.error(
                    "Error marking all notifications as read:",
                    error
                  );
                  showSnackbarMessage("Lỗi khi đánh dấu thông báo", "error");
                }
              }}
              onCreateNotification={() => setCreateNotificationDialog(true)}
            />
          </Box>
        )}
      </Box>

      {/* Dialogs */}
      <CreateReminderDialog
        open={createReminderDialog}
        onClose={() => setCreateReminderDialog(false)}
        currentUser={currentUser}
        onCreateReminder={async (reminderData) => {
          try {
            setLoading(true);
            const response = await reminderService.createReminder({
              ...reminderData,
              keycloakId: user_id, // Sử dụng user_id
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
      />

      <CreateTaskDialog
        open={createTaskDialog}
        onClose={() => setCreateTaskDialog(false)}
        currentUser={currentUser}
        onCreateTask={async (taskData) => {
          try {
            setLoading(true);
            const response = await taskService.createTask({
              ...taskData,
              assignerId: user_id, // Sử dụng user_id
            });

            if (response.status === "success") {
              showSnackbarMessage("Tạo task thành công!", "success");
              setCreateTaskDialog(false);

              // Tạo thông báo tự động cho task mới
              await notificationService.createAutoSystemNotification(
                "task_created",
                {
                  taskId: response.data._id,
                  taskTitle: taskData.title,
                  creatorName:
                    currentUser?.firstName + " " + currentUser?.lastName,
                  assigneeId: taskData.assigneeId,
                }
              );

              loadDashboardData();
            } else {
              showSnackbarMessage(
                response.message || "Lỗi khi tạo task",
                "error"
              );
            }
          } catch (error) {
            console.error("Error creating task:", error);
            showSnackbarMessage("Lỗi khi tạo task", "error");
          } finally {
            setLoading(false);
          }
        }}
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
          // Sử dụng user_id từ auth
          if (!user_id) return;

          try {
            const response = await taskService.updateTask(
              taskId,
              user_id, // Sử dụng user_id
              { status: newStatus }
            );

            if (response.status === "success") {
              showSnackbarMessage("Cập nhật trạng thái thành công!", "success");
              loadDashboardData();
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
      />

      <DeleteTaskDialog
        open={deleteTaskDialog}
        onClose={() => setDeleteTaskDialog(false)}
        task={taskToDelete}
        onConfirm={handleDeleteTask}
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
