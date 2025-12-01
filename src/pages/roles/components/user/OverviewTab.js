// src/pages/roles/components/user/OverviewTab.js - ĐÃ THÊM NÚT CHAT
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
  Button,
  LinearProgress,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  TaskAlt,
  AccessTime,
  NotificationsActive,
  CheckCircle,
  Schedule,
  Report,
  TrendingUp,
  Refresh,
  BugReport,
  Lightbulb,
  Warning,
  Chat,
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
  reports = [], // 🆕 Thêm reports
  onRefresh,
  onOpenChat, // 🆕 THÊM PROP CHAT
}) => {
  const theme = useTheme();

  // 🆕 Tính toán thống kê reports
  const reportStats = {
    total: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    inProgress: reports.filter((r) => r.status === "in_progress").length,
    resolved: reports.filter((r) => ["resolved", "closed"].includes(r.status))
      .length,
    rejected: reports.filter((r) => r.status === "rejected").length,
    bug: reports.filter((r) => r.type === "bug").length,
    feature: reports.filter((r) => r.type === "feature").length,
    suggestion: reports.filter((r) => r.type === "suggestion").length,
  };

  // 🆕 Hàm lấy icon cho loại report
  const getReportTypeIcon = (type) => {
    switch (type) {
      case "bug":
        return <BugReport sx={{ color: "error.main" }} />;
      case "feature":
        return <Lightbulb sx={{ color: "warning.main" }} />;
      case "suggestion":
        return <Lightbulb sx={{ color: "info.main" }} />;
      case "complaint":
        return <Warning sx={{ color: "error.main" }} />;
      default:
        return <Report sx={{ color: "primary.main" }} />;
    }
  };

  // 🆕 Hàm lấy màu cho trạng thái report
  const getReportStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "warning";
      case "in_progress":
        return "info";
      case "resolved":
        return "success";
      case "closed":
        return "default";
      case "rejected":
        return "error";
      default:
        return "default";
    }
  };

  // 🆕 Hàm lấy text cho trạng thái report
  const getReportStatusText = (status) => {
    switch (status) {
      case "pending":
        return "Đang chờ";
      case "in_progress":
        return "Đang xử lý";
      case "resolved":
        return "Đã giải quyết";
      case "closed":
        return "Đã đóng";
      case "rejected":
        return "Đã từ chối";
      default:
        return status;
    }
  };

  // 🆕 Hàm format date
  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // 🆕 Hàm xử lý mở chat với task
  const handleOpenTaskChat = (task) => {
    if (onOpenChat) {
      onOpenChat(task);
    }
  };

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
                    việc đang thực hiện và {reportStats.pending || 0} báo cáo
                    đang chờ xử lý
                  </Typography>
                  <Box
                    sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}
                  >
                    <Chip
                      label={`${dashboardStats.completedTasks || 0}/${
                        dashboardStats.totalTasks || 0
                      } công việc hoàn thành`}
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
                    <Chip
                      label={`${reportStats.pending || 0} báo cáo đang chờ`}
                      sx={{
                        background: "rgba(255,255,255,0.2)",
                        color: "white",
                      }}
                    />
                  </Box>
                </Box>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                  <Button
                    startIcon={<Refresh />}
                    onClick={onRefresh}
                    variant="outlined"
                    sx={{
                      color: "white",
                      borderColor: "white",
                      "&:hover": {
                        backgroundColor: "rgba(255,255,255,0.1)",
                        borderColor: "white",
                      },
                    }}
                  >
                    Làm mới
                  </Button>
                  <Avatar
                    sx={{ width: 80, height: 80, border: "3px solid white" }}
                    src={currentUser?.avatar}
                  >
                    {currentUser?.firstName?.[0]}
                  </Avatar>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Quick Stats - ĐÃ CẬP NHẬT VỚI REPORTS */}
        <Grid item xs={12}>
          <QuickStats
            data={{
              ...dashboardStats,
              pendingReports: reportStats.pending,
              totalReports: reportStats.total,
            }}
          />
        </Grid>

        {/* Tasks Overview - ĐÃ THÊM NÚT CHAT */}
        <Grid item xs={12} md={4}>
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

              {/* Progress Bar */}
              <Box sx={{ mb: 2 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    mb: 1,
                  }}
                >
                  <Typography variant="body2" color="text.secondary">
                    Tiến độ hoàn thành
                  </Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {dashboardStats.completionRate || "0%"}
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={parseInt(dashboardStats.completionRate) || 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.palette.grey[200],
                    "& .MuiLinearProgress-bar": {
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: 4,
                    },
                  }}
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

              {/* Recent Tasks - ĐÃ THÊM NÚT CHAT */}
              <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                {tasks.slice(0, 4).map((task, index) => (
                  <Box
                    key={task._id || index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: index % 2 === 0 ? "action.hover" : "transparent",
                      mb: 1,
                      "&:hover": {
                        bgcolor: "action.hover",
                      },
                    }}
                  >
                    <CheckCircle
                      sx={{
                        fontSize: 20,
                        color:
                          task.status === "done"
                            ? "success.main"
                            : task.status === "in_progress"
                            ? "warning.main"
                            : "action.disabled",
                      }}
                    />
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Tooltip title={task.title}>
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {task.title}
                        </Typography>
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary">
                        {task.status === "done"
                          ? "Đã hoàn thành"
                          : task.status === "in_progress"
                          ? "Đang thực hiện"
                          : "Chờ xử lý"}
                      </Typography>
                    </Box>
                    <Box
                      sx={{ display: "flex", gap: 0.5, alignItems: "center" }}
                    >
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
                      {/* 🆕 NÚT CHAT */}
                      <Tooltip title="Chat về task này">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenTaskChat(task)}
                          sx={{
                            color: "primary.main",
                            "&:hover": {
                              bgcolor: "primary.main",
                              color: "white",
                            },
                          }}
                        >
                          <Chat fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
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

        {/* Reports Overview - 🆕 THÊM PHẦN NÀY */}
        <Grid item xs={12} md={4}>
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
                  <Report color="info" /> Báo cáo của tôi
                </Typography>
                <Chip
                  label={`${reportStats.resolved || 0}/${
                    reportStats.total || 0
                  } đã giải quyết`}
                  color="info"
                  variant="outlined"
                />
              </Box>

              {/* Report Stats */}
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" color="info.main">
                      {reportStats.total || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Tổng số
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" color="warning.main">
                      {reportStats.pending || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Đang chờ
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" color="primary.main">
                      {reportStats.inProgress || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Đang xử lý
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={3}>
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="h6" color="success.main">
                      {reportStats.resolved || 0}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Đã giải quyết
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Recent Reports */}
              <Box sx={{ maxHeight: 200, overflowY: "auto" }}>
                {reports.slice(0, 4).map((report, index) => (
                  <Box
                    key={report._id || index}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1.5,
                      p: 1,
                      borderRadius: 1,
                      bgcolor: index % 2 === 0 ? "action.hover" : "transparent",
                      mb: 1,
                    }}
                  >
                    {getReportTypeIcon(report.type)}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Tooltip title={report.title}>
                        <Typography
                          variant="body2"
                          fontWeight="medium"
                          sx={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {report.title}
                        </Typography>
                      </Tooltip>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <Chip
                          label={getReportStatusText(report.status)}
                          size="small"
                          color={getReportStatusColor(report.status)}
                          variant="outlined"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(report.createdAt)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
                {reports.length === 0 && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    textAlign="center"
                    sx={{ py: 2 }}
                  >
                    Chưa có báo cáo nào
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Sidebar - Reminders & Notifications */}
        <Grid item xs={12} md={4}>
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

                  <Box sx={{ maxHeight: 120, overflowY: "auto" }}>
                    {reminders.slice(0, 2).map((reminder, index) => (
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
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Tooltip title={reminder.title}>
                            <Typography
                              variant="body2"
                              fontWeight="medium"
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {reminder.title}
                            </Typography>
                          </Tooltip>
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

                  <Box sx={{ maxHeight: 120, overflowY: "auto" }}>
                    {notifications.slice(0, 2).map((notification, index) => (
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
                            fontSize: "0.875rem",
                          }}
                        >
                          {notification.type === "system" ? "S" : "U"}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Tooltip title={notification.title}>
                            <Typography
                              variant="body2"
                              fontWeight="medium"
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {notification.title}
                            </Typography>
                          </Tooltip>
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

        {/* Recent Activity - ĐÃ CẬP NHẬT VỚI REPORTS */}
        <Grid item xs={12}>
          <RecentActivity
            activities={[
              ...tasks.slice(0, 3).map((task) => ({
                type: "task",
                data: task,
                timestamp: task.updatedAt || task.createdAt,
              })),
              ...reports.slice(0, 3).map((report) => ({
                type: "report",
                data: report,
                timestamp: report.updatedAt || report.createdAt,
              })),
              ...notifications.slice(0, 3).map((notification) => ({
                type: "notification",
                data: notification,
                timestamp: notification.createdAt,
              })),
            ]
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .slice(0, 6)}
            loading={loading}
            onRefresh={onRefresh}
            onOpenChat={onOpenChat} // 🆕 TRUYỀN PROP CHAT CHO ACTIVITY
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default OverviewTab;
