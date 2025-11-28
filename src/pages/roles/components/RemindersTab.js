// src/pages/roles/components/RemindersTab.js
import React from "react";
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
} from "@mui/icons-material";

// Utility functions
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
    task: {
      color: "#9c27b0",
      icon: "✅",
      label: "Công việc",
      bgColor: "#f3e5f5",
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
  loading,
  reminders,
  currentUser,
  onRefresh,
  onViewReminder,
  onDeleteReminder,
  onCreateReminder,
}) {
  const activeReminders = reminders.filter((r) => !r.isSent);
  const sentReminders = reminders.filter((r) => r.isSent);

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
                      {reminders.length}
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
                      {sentReminders.length}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Đã gửi
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
                        reminders.filter(
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

            {/* Active Reminders */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h5"
                component="h2"
                fontWeight="bold"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <NotificationsActive color="primary" />
                Nhắc nhở đang hoạt động ({activeReminders.length})
              </Typography>

              {activeReminders.length === 0 ? (
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
                    Không có nhắc nhở nào đang hoạt động
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Tạo nhắc nhở mới để bắt đầu theo dõi
                  </Typography>
                </Box>
              ) : (
                <List sx={{ p: 0 }}>
                  {activeReminders.map((reminder, index) => {
                    const reminderConfig = getReminderConfig(reminder.type);
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
                            bgcolor: reminderConfig.bgColor,
                            transition: "all 0.3s ease",
                            "&:hover": {
                              boxShadow: 2,
                              transform: "translateY(-2px)",
                            },
                          }}
                        >
                          {/* Avatar */}
                          <Avatar
                            sx={{
                              bgcolor: reminderConfig.color,
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
                                    color: reminderConfig.color,
                                    mb: 1,
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
                                      bgcolor: reminderConfig.color,
                                      color: "white",
                                      fontWeight: 600,
                                    }}
                                  />
                                  <Chip
                                    label={timeStatus.text}
                                    size="small"
                                    color={timeStatus.color}
                                    variant="filled"
                                    sx={{ fontWeight: 600 }}
                                  />
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
                                <IconButton
                                  onClick={() => onDeleteReminder(reminder._id)}
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
                                  color: "text.primary",
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

                        {index < activeReminders.length - 1 && (
                          <Divider sx={{ my: 2 }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </List>
              )}
            </Box>

            {/* Sent Reminders */}
            {sentReminders.length > 0 && (
              <Box>
                <Typography
                  variant="h5"
                  component="h2"
                  fontWeight="bold"
                  gutterBottom
                  sx={{ display: "flex", alignItems: "center", gap: 1 }}
                >
                  <CheckCircle color="success" />
                  Nhắc nhở đã gửi ({sentReminders.length})
                </Typography>

                <List sx={{ p: 0 }}>
                  {sentReminders.map((reminder, index) => {
                    const reminderConfig = getReminderConfig(reminder.type);

                    return (
                      <React.Fragment key={reminder._id}>
                        <ListItem
                          sx={{
                            p: 3,
                            mb: 2,
                            borderRadius: 3,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.default",
                            opacity: 0.7,
                          }}
                        >
                          <Avatar
                            sx={{
                              bgcolor: "grey.500",
                              mr: 3,
                              width: 56,
                              height: 56,
                              fontSize: "1.5rem",
                            }}
                          >
                            {reminderConfig.icon}
                          </Avatar>

                          <Box sx={{ flex: 1, minWidth: 0 }}>
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
                                    fontWeight: 500,
                                    color: "text.secondary",
                                    mb: 1,
                                    textDecoration: "line-through",
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
                                    variant="outlined"
                                    sx={{ color: "text.secondary" }}
                                  />
                                  <Chip
                                    label="ĐÃ GỬI"
                                    size="small"
                                    color="success"
                                    variant="filled"
                                    sx={{ fontWeight: 600 }}
                                  />
                                </Box>
                              </Box>
                            </Box>

                            {reminder.description && (
                              <Typography
                                variant="body1"
                                component="div"
                                sx={{
                                  mb: 2,
                                  lineHeight: 1.6,
                                  color: "text.secondary",
                                }}
                              >
                                {reminder.description}
                              </Typography>
                            )}

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
                            </Box>
                          </Box>
                        </ListItem>

                        {index < sentReminders.length - 1 && (
                          <Divider sx={{ my: 2 }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </List>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
