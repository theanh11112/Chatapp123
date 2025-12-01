// src/pages/roles/components/RemindersTab.js - HOÀN CHỈNH VỚI NÚT HOÀN THÀNH
import React, { useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  Avatar,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Divider,
  alpha,
  Badge,
  Tabs,
  Tab,
} from "@mui/material";
import {
  AccessTime,
  Visibility,
  Delete,
  Refresh,
  Add,
  Task,
  CheckCircle,
  Schedule,
  NotificationsActive,
  Notifications,
  Done,
} from "@mui/icons-material";

// Utility functions (giữ nguyên)
const getReminderConfig = (type) => {
  const config = {
    personal: {
      color: "#4caf50",
      icon: "👤",
      label: "Cá nhân",
      bgColor: "#e8f5e9",
    },
    meeting: {
      color: "#2196f3",
      icon: "👥",
      label: "Cuộc họp",
      bgColor: "#e3f2fd",
    },
    deadline: {
      color: "#ff9800",
      icon: "⏰",
      label: "Hạn chót",
      bgColor: "#fff3e0",
    },
    task_reminder: {
      color: "#9c27b0",
      icon: "✅",
      label: "Công việc",
      bgColor: "#f3e5f5",
    },
    due_date: {
      color: "#f44336",
      icon: "⏳",
      label: "Hạn task",
      bgColor: "#ffebee",
    },
    start_date: {
      color: "#4caf50",
      icon: "🚀",
      label: "Bắt đầu task",
      bgColor: "#e8f5e9",
    },
    birthday: {
      color: "#e91e63",
      icon: "🎂",
      label: "Sinh nhật",
      bgColor: "#fce4ec",
    },
    appointment: {
      color: "#00bcd4",
      icon: "📅",
      label: "Lịch hẹn",
      bgColor: "#e0f7fa",
    },
  };
  return config[type] || config.personal;
};

const getTimeStatus = (remindAt) => {
  const now = new Date();
  const remindDate = new Date(remindAt);
  const diffMs = remindDate - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMs < 0) {
    return { status: "overdue", text: "Đã quá hạn", color: "error" };
  }
  if (diffMins < 60) {
    return { status: "urgent", text: `${diffMins} phút nữa`, color: "error" };
  }
  if (diffHours < 24) {
    return { status: "soon", text: `${diffHours} giờ nữa`, color: "warning" };
  }
  if (diffDays < 7) {
    return { status: "upcoming", text: `${diffDays} ngày nữa`, color: "info" };
  }
  return {
    status: "future",
    text: remindDate.toLocaleDateString("vi-VN"),
    color: "success",
  };
};

const formatRemindTime = (remindAt) => {
  return new Date(remindAt).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function RemindersTab({
  reminders = [],
  currentUser,
  onCreateReminder,
  onRefresh,
  onViewReminder,
  onDeleteReminder,
  onCompleteReminder, // 🆕 THÊM PROP MỚI
  loading = false,
}) {
  const [activeTab, setActiveTab] = useState(0);

  // 🆕 DEBUG - kiểm tra props
  console.log("🔔 RemindersTab received:", {
    remindersCount: reminders?.length,
    loading,
    currentUser: !!currentUser,
    hasOnCompleteReminder: !!onCompleteReminder,
  });

  // 🆕 TÍNH TOÁN REMINDERS THEO TAB
  const activeReminders = reminders.filter(
    (r) => !r.isCompleted && r.isActive !== false
  );
  const completedReminders = reminders.filter((r) => r.isCompleted);
  const allReminders = reminders.filter((r) => r.isActive !== false);

  // 🆕 LẤY REMINDERS THEO TAB ĐANG CHỌN
  const getDisplayReminders = () => {
    switch (activeTab) {
      case 0: // Tất cả
        return allReminders;
      case 1: // Đang hoạt động
        return activeReminders;
      case 2: // Đã hoàn thành
        return completedReminders;
      default:
        return allReminders;
    }
  };

  const displayReminders = getDisplayReminders();

  // 🆕 HÀM XỬ LÝ HOÀN THÀNH REMINDER
  const handleCompleteReminder = (reminderId) => {
    if (onCompleteReminder) {
      onCompleteReminder(reminderId);
    } else {
      console.warn("❌ onCompleteReminder prop is not available");
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
          <CardContent sx={{ p: 3 }}>
            {/* Header */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 4,
              }}
            >
              <Box>
                <Typography
                  variant="h4"
                  component="h1"
                  fontWeight="bold"
                  gutterBottom
                >
                  ⏰ Quản lý Nhắc nhở
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Theo dõi và quản lý tất cả nhắc nhở hệ thống
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={onRefresh}
                  sx={{ borderRadius: 2 }}
                >
                  Làm mới
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={onCreateReminder}
                  disabled={!currentUser}
                  sx={{ borderRadius: 2 }}
                >
                  Tạo Nhắc nhở
                </Button>
              </Box>
            </Box>

            {/* Statistics */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    bgcolor: "primary.main",
                    color: "white",
                    borderRadius: 3,
                    boxShadow: 2,
                  }}
                >
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <Typography variant="h2" fontWeight="bold">
                      {allReminders.length}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Tổng số
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    bgcolor: "success.main",
                    color: "white",
                    borderRadius: 3,
                    boxShadow: 2,
                  }}
                >
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <Badge
                      badgeContent={activeReminders.length}
                      color="warning"
                      sx={{
                        "& .MuiBadge-badge": {
                          fontSize: "1rem",
                          height: 28,
                          minWidth: 28,
                        },
                      }}
                    >
                      <Typography variant="h2" fontWeight="bold">
                        {activeReminders.length}
                      </Typography>
                    </Badge>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Đang hoạt động
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    bgcolor: "grey.500",
                    color: "white",
                    borderRadius: 3,
                    boxShadow: 2,
                  }}
                >
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <Typography variant="h2" fontWeight="bold">
                      {completedReminders.length}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Đã hoàn thành
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    bgcolor: "warning.main",
                    color: "white",
                    borderRadius: 3,
                    boxShadow: 2,
                  }}
                >
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <Typography variant="h2" fontWeight="bold">
                      {
                        activeReminders.filter(
                          (r) => getTimeStatus(r.remindAt).status === "urgent"
                        ).length
                      }
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Khẩn cấp
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Tabs Navigation */}
            <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
              <Tabs
                value={activeTab}
                onChange={(e, newValue) => setActiveTab(newValue)}
              >
                <Tab
                  icon={<Notifications />}
                  label={`Tất cả (${allReminders.length})`}
                />
                <Tab
                  icon={<NotificationsActive />}
                  label={`Đang hoạt động (${activeReminders.length})`}
                />
                <Tab
                  icon={<CheckCircle />}
                  label={`Đã hoàn thành (${completedReminders.length})`}
                />
              </Tabs>
            </Box>

            {/* Reminders List */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                component="h2"
                fontWeight="bold"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                {activeTab === 0 && <Notifications color="primary" />}
                {activeTab === 1 && <NotificationsActive color="primary" />}
                {activeTab === 2 && <CheckCircle color="success" />}
                {activeTab === 0 &&
                  `Tất cả nhắc nhở (${displayReminders.length})`}
                {activeTab === 1 &&
                  `Nhắc nhở đang hoạt động (${displayReminders.length})`}
                {activeTab === 2 &&
                  `Nhắc nhở đã hoàn thành (${displayReminders.length})`}
              </Typography>

              {displayReminders.length === 0 ? (
                <Box
                  sx={{
                    textAlign: "center",
                    py: 4,
                    bgcolor: "background.default",
                    borderRadius: 3,
                  }}
                >
                  <AccessTime
                    sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
                  />
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    {activeTab === 0 && "Không có nhắc nhở nào"}
                    {activeTab === 1 && "Không có nhắc nhở nào đang hoạt động"}
                    {activeTab === 2 && "Không có nhắc nhở nào đã hoàn thành"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {activeTab === 1 && "Tạo nhắc nhở mới để bắt đầu theo dõi"}
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {displayReminders.map((reminder, index) => {
                    const reminderConfig = getReminderConfig(
                      reminder.reminderType
                    );
                    const timeStatus = getTimeStatus(reminder.remindAt);

                    return (
                      <React.Fragment key={reminder._id}>
                        <ListItem
                          sx={{
                            p: 3,
                            mb: 2,
                            borderRadius: 3,
                            border: `1px solid ${alpha(
                              reminderConfig.color,
                              0.2
                            )}`,
                            bgcolor: reminder.isCompleted
                              ? "background.default"
                              : reminderConfig.bgColor,
                            transition: "all 0.3s ease",
                            opacity: reminder.isCompleted ? 0.7 : 1,
                            "&:hover": {
                              boxShadow: 2,
                              transform: "translateY(-2px)",
                            },
                          }}
                        >
                          {/* Avatar */}
                          <Avatar
                            sx={{
                              bgcolor: reminder.isCompleted
                                ? "grey.500"
                                : reminderConfig.color,
                              mr: 3,
                              width: 56,
                              height: 56,
                              fontSize: "1.5rem",
                              boxShadow: 2,
                            }}
                          >
                            {reminderConfig.icon}
                          </Avatar>

                          {/* Content */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            {/* Header */}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "flex-start",
                                justifyContent: "space-between",
                                mb: 2,
                              }}
                            >
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography
                                  variant="h6"
                                  component="div"
                                  sx={{
                                    fontWeight: 600,
                                    color: reminder.isCompleted
                                      ? "text.secondary"
                                      : reminderConfig.color,
                                    mb: 1,
                                    textDecoration: reminder.isCompleted
                                      ? "line-through"
                                      : "none",
                                  }}
                                >
                                  {reminder.title}
                                </Typography>

                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 1,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <Chip
                                    label={reminderConfig.label}
                                    size="small"
                                    sx={{
                                      bgcolor: reminder.isCompleted
                                        ? "grey.500"
                                        : reminderConfig.color,
                                      color: "white",
                                      fontWeight: 600,
                                    }}
                                  />
                                  {!reminder.isCompleted && (
                                    <Chip
                                      label={timeStatus.text}
                                      size="small"
                                      color={timeStatus.color}
                                      variant="filled"
                                      sx={{ fontWeight: 600 }}
                                    />
                                  )}
                                  {reminder.isCompleted && (
                                    <Chip
                                      label="HOÀN THÀNH"
                                      size="small"
                                      color="success"
                                      variant="filled"
                                      sx={{ fontWeight: 600 }}
                                    />
                                  )}
                                  {reminder.taskId && (
                                    <Chip
                                      icon={<Task />}
                                      label="Có task"
                                      size="small"
                                      color="primary"
                                      variant="outlined"
                                    />
                                  )}
                                </Box>
                              </Box>

                              {/* Actions */}
                              <Box sx={{ display: "flex", gap: 1, ml: 2 }}>
                                {/* 🆕 NÚT HOÀN THÀNH - CHỈ HIỆN KHI CHƯA HOÀN THÀNH */}
                                {!reminder.isCompleted && (
                                  <IconButton
                                    onClick={() =>
                                      handleCompleteReminder(reminder._id)
                                    }
                                    title="Đánh dấu đã hoàn thành"
                                    sx={{
                                      bgcolor: "success.main",
                                      color: "white",
                                      "&:hover": {
                                        bgcolor: "success.dark",
                                      },
                                    }}
                                  >
                                    <Done />
                                  </IconButton>
                                )}

                                <IconButton
                                  onClick={() => onViewReminder(reminder)}
                                  title="Xem chi tiết"
                                  sx={{
                                    bgcolor: "primary.main",
                                    color: "white",
                                    "&:hover": {
                                      bgcolor: "primary.dark",
                                    },
                                  }}
                                >
                                  <Visibility />
                                </IconButton>

                                {!reminder.isCompleted && (
                                  <IconButton
                                    onClick={() =>
                                      onDeleteReminder(reminder._id)
                                    }
                                    title="Xóa nhắc nhở"
                                    sx={{
                                      bgcolor: "error.main",
                                      color: "white",
                                      "&:hover": {
                                        bgcolor: "error.dark",
                                      },
                                    }}
                                  >
                                    <Delete />
                                  </IconButton>
                                )}
                              </Box>
                            </Box>

                            {/* Description */}
                            {reminder.description && (
                              <Typography
                                variant="body1"
                                component="div"
                                sx={{
                                  mb: 2,
                                  lineHeight: 1.6,
                                  color: reminder.isCompleted
                                    ? "text.secondary"
                                    : "text.primary",
                                }}
                              >
                                {reminder.description}
                              </Typography>
                            )}

                            {/* Metadata */}
                            <Box
                              sx={{
                                display: "flex",
                                gap: 3,
                                flexWrap: "wrap",
                                alignItems: "center",
                              }}
                            >
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                }}
                              >
                                <Schedule
                                  fontSize="small"
                                  sx={{ color: "text.secondary" }}
                                />
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {formatRemindTime(reminder.remindAt)}
                                </Typography>
                              </Box>

                              {/* Hiển thị thông tin creator */}
                              {reminder.creatorInfo && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  👤 Tạo bởi:{" "}
                                  <strong>
                                    {reminder.creatorInfo.lastName}
                                  </strong>
                                </Typography>
                              )}

                              {reminder.taskId && (
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  📋 <strong>{reminder.taskId.title}</strong>
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </ListItem>

                        {index < displayReminders.length - 1 && (
                          <Divider sx={{ my: 2 }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
