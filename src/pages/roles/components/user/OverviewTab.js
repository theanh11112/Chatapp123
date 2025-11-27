// src/pages/roles/components/user/OverviewTab.js
import React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  useTheme,
} from "@mui/material";
import {
  TaskAlt,
  AccessTime,
  NotificationsActive,
  CheckCircle,
  Schedule,
} from "@mui/icons-material";

// Import components
import QuickStats from "./QuickStats";
import RecentActivity from "./RecentActivity";

const OverviewTab = ({
  loading = false,
  currentUser,
  dashboardStats = {},
  tasks = [],
  reminders = [],
  notifications = [],
  onRefresh,
}) => {
  const theme = useTheme();

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <Typography>Đang tải tổng quan...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flex: 1, overflow: "auto" }}>
      <Grid container spacing={3}>
        {/* Welcome Card */}
        <Grid item xs={12}>
          <Card
            sx={{
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
              color: "white",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <CardContent sx={{ position: "relative", zIndex: 1 }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="h4" fontWeight="bold" gutterBottom>
                    👋 Chào buổi sáng, {currentUser?.firstName}!
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Hôm nay bạn có {dashboardStats.inProgressTasks || 0} công
                    việc đang thực hiện
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                    <Chip
                      label={`${dashboardStats.completedTasks || 0}/${
                        dashboardStats.totalTasks || 0
                      } hoàn thành`}
                      sx={{
                        background: "rgba(255,255,255,0.2)",
                        color: "white",
                      }}
                    />
                    <Chip
                      label={`${
                        dashboardStats.unreadNotifications || 0
                      } thông báo mới`}
                      sx={{
                        background: "rgba(255,255,255,0.2)",
                        color: "white",
                      }}
                    />
                  </Box>
                </Box>
                <Avatar
                  sx={{ width: 80, height: 80, border: "3px solid white" }}
                  src={currentUser?.avatar}
                >
                  {currentUser?.firstName?.[0]}
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats */}
        <Grid item xs={12}>
          <QuickStats data={dashboardStats} />
        </Grid>

        {/* Tasks Overview */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: "100%" }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mb: 2,
                }}
              >
                <Typography
                  variant="h6"
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <TaskAlt color="primary" /> Công việc của tôi
                </Typography>
                <Chip
                  label={`${dashboardStats.completedTasks || 0}/${
                    dashboardStats.totalTasks || 0
                  } hoàn thành`}
                  color="primary"
                  variant="outlined"
                />
              </Box>

              {/* Task Stats */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" color="primary.main">
                      {dashboardStats.totalTasks || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tổng số
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" color="success.main">
                      {dashboardStats.completedTasks || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Hoàn thành
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" color="warning.main">
                      {dashboardStats.inProgressTasks || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Đang làm
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Recent Tasks */}
              <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                {tasks.slice(0, 3).map((task, index) => (
                  <Box
                    key={task._id || index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: index % 2 === 0 ? "action.hover" : "transparent",
                      mb: 1,
                    }}
                  >
                    <CheckCircle
                      sx={{
                        fontSize: 20,
                        color:
                          task.status === "done"
                            ? "success.main"
                            : "action.disabled",
                      }}
                    />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" fontWeight="medium">
                        {task.title}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {task.status === "done"
                          ? "Đã hoàn thành"
                          : task.status === "in_progress"
                          ? "Đang thực hiện"
                          : "Chờ xử lý"}
                      </Typography>
                    </Box>
                    <Chip
                      label={task.priority}
                      size="small"
                      color={
                        task.priority === "high"
                          ? "error"
                          : task.priority === "medium"
                          ? "warning"
                          : "default"
                      }
                    />
                  </Box>
                ))}
                {tasks.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                    sx={{ py: 2 }}
                  >
                    Không có công việc nào
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Sidebar - Reminders & Notifications */}
        <Grid item xs={12} md={6}>
          <Grid container spacing={3}>
            {/* Upcoming Reminders */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <AccessTime color="warning" /> Nhắc nhở sắp tới
                    </Typography>
                    <Chip
                      label={`${dashboardStats.totalReminders || 0} nhắc nhở`}
                      color="warning"
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                    {reminders.slice(0, 3).map((reminder, index) => (
                      <Box
                        key={reminder._id || index}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          p: 1.5,
                          borderRadius: 2,
                          bgcolor: "warning.light",
                          mb: 1,
                          border: "1px solid",
                          borderColor: "warning.main",
                        }}
                      >
                        <Schedule sx={{ color: "warning.main" }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {reminder.title}
                          </Typography>
                          <Typography variant="caption">
                            {reminder.remindAt
                              ? new Date(reminder.remindAt).toLocaleString(
                                  "vi-VN"
                                )
                              : "Không có thời gian"}
                          </Typography>
                        </Box>
                      </Box>
                    ))}

                    {reminders.length === 0 && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        textAlign="center"
                        sx={{ py: 2 }}
                      >
                        Không có nhắc nhở nào sắp tới
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Recent Notifications */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      mb: 2,
                    }}
                  >
                    <Typography
                      variant="h6"
                      sx={{ display: "flex", alignItems: "center", gap: 1 }}
                    >
                      <NotificationsActive color="info" /> Thông báo gần đây
                    </Typography>
                    <Chip
                      label={`${notifications.length} thông báo`}
                      color="info"
                      variant="outlined"
                      size="small"
                    />
                  </Box>

                  <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                    {notifications.slice(0, 3).map((notification, index) => (
                      <Box
                        key={notification._id || index}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: !notification.isRead
                            ? "action.hover"
                            : "transparent",
                          mb: 1,
                          borderLeft: !notification.isRead
                            ? "4px solid"
                            : "none",
                          borderColor: "primary.main",
                        }}
                      >
                        <Avatar
                          sx={{
                            width: 32,
                            height: 32,
                            bgcolor: "primary.main",
                          }}
                        >
                          {notification.type === "system" ? "S" : "U"}
                        </Avatar>
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {notification.title}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {notification.createdAt
                              ? new Date(
                                  notification.createdAt
                                ).toLocaleTimeString("vi-VN")
                              : "Vừa xong"}
                          </Typography>
                        </Box>
                        {!notification.isRead && (
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              bgcolor: "primary.main",
                            }}
                          />
                        )}
                      </Box>
                    ))}

                    {notifications.length === 0 && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        textAlign="center"
                        sx={{ py: 2 }}
                      >
                        Không có thông báo nào
                      </Typography>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12}>
          <RecentActivity
            activities={[]} // Có thể thêm activities từ props nếu có
            loading={loading}
            onRefresh={onRefresh}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default OverviewTab;
