// src/pages/roles/components/NotificationsTab.js
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
  Badge,
  alpha,
} from "@mui/material";
import {
  Notifications,
  Warning,
  CheckCircle,
  Error as ErrorIcon,
  Info as InfoIcon,
  Delete,
  MarkEmailRead,
  Add,
  Refresh,
  Schedule,
} from "@mui/icons-material";

// Utility functions
const getNotificationConfig = (type) => {
  const config = {
    info: {
      color: "#2196f3",
      icon: <InfoIcon />,
      label: "Thông tin",
      bgColor: "#e3f2fd",
    },
    success: {
      color: "#4caf50",
      icon: <CheckCircle />,
      label: "Thành công",
      bgColor: "#e8f5e9",
    },
    warning: {
      color: "#ff9800",
      icon: <Warning />,
      label: "Cảnh báo",
      bgColor: "#fff3e0",
    },
    error: {
      color: "#f44336",
      icon: <ErrorIcon />,
      label: "Lỗi",
      bgColor: "#ffebee",
    },
  };
  return config[type] || config.info;
};

const getPriorityConfig = (priority) => {
  const config = {
    low: { color: "#66bb6a", label: "Thấp" },
    medium: { color: "#ffa726", label: "Trung bình" },
    high: { color: "#ef5350", label: "Cao" },
    critical: { color: "#d32f2f", label: "Khẩn cấp" },
  };
  return config[priority] || config.medium;
};

const formatDate = (dateString) => {
  if (!dateString) return "Không có";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function NotificationsTab({
  loading,
  notifications,
  notificationStats,
  unreadNotificationsCount,
  onRefresh,
  onMarkAsRead,
  onDeleteNotification,
  onMarkAllAsRead,
  onCreateNotification,
}) {
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
                  📢 Quản lý Thông báo
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Quản lý và theo dõi tất cả thông báo hệ thống
                </Typography>
              </Box>
              <Box sx={{ display: "flex", gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<MarkEmailRead />}
                  onClick={onMarkAllAsRead}
                  disabled={unreadNotificationsCount === 0}
                  sx={{ borderRadius: 2 }}
                >
                  Đánh dấu tất cả đã đọc
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={onCreateNotification}
                  sx={{ borderRadius: 2 }}
                >
                  Tạo Thông báo
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={onRefresh}
                  sx={{ borderRadius: 2 }}
                >
                  Làm mới
                </Button>
              </Box>
            </Box>

            {/* Statistics Cards */}
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
                      {notificationStats.totalNotifications || 0}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Tổng thông báo
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <Card
                  sx={{
                    bgcolor: "error.main",
                    color: "white",
                    borderRadius: 3,
                    boxShadow: 2,
                  }}
                >
                  <CardContent sx={{ textAlign: "center", p: 3 }}>
                    <Badge
                      badgeContent={unreadNotificationsCount}
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
                        {unreadNotificationsCount}
                      </Typography>
                    </Badge>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Chưa đọc
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
                      {notificationStats.todayCount || 0}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Hôm nay
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
                    <Typography variant="h2" fontWeight="bold">
                      {notificationStats.thisWeekCount || 0}
                    </Typography>
                    <Typography variant="body1" sx={{ opacity: 0.9 }}>
                      Tuần này
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Notifications List */}
            {notifications.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 8 }}>
                <Notifications
                  sx={{ fontSize: 64, color: "text.secondary", mb: 2 }}
                />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Không có thông báo nào
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tất cả thông báo hệ thống sẽ xuất hiện ở đây
                </Typography>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {notifications.map((notification, index) => {
                  const notifConfig = getNotificationConfig(notification.type);
                  const priorityConfig = getPriorityConfig(
                    notification.priority
                  );

                  return (
                    <React.Fragment key={notification._id}>
                      <ListItem
                        sx={{
                          p: 3,
                          mb: 2,
                          borderRadius: 3,
                          border: `1px solid ${alpha(notifConfig.color, 0.2)}`,
                          bgcolor: notification.isRead
                            ? "background.paper"
                            : notifConfig.bgColor,
                          transition: "all 0.3s ease",
                          "&:hover": {
                            boxShadow: 2,
                            transform: "translateY(-2px)",
                          },
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        {/* Unread indicator */}
                        {!notification.isRead && (
                          <Box
                            sx={{
                              position: "absolute",
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: 4,
                              bgcolor: notifConfig.color,
                            }}
                          />
                        )}

                        {/* Avatar */}
                        <Avatar
                          sx={{
                            bgcolor: notifConfig.color,
                            mr: 3,
                            width: 56,
                            height: 56,
                            boxShadow: 2,
                          }}
                        >
                          {notifConfig.icon}
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
                                  fontWeight: notification.isRead ? 500 : 700,
                                  color: notification.isRead
                                    ? "text.primary"
                                    : notifConfig.color,
                                  mb: 1,
                                }}
                              >
                                {notification.title}
                              </Typography>

                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1,
                                  flexWrap: "wrap",
                                }}
                              >
                                <Chip
                                  label={notifConfig.label}
                                  size="small"
                                  sx={{
                                    bgcolor: notifConfig.color,
                                    color: "white",
                                    fontWeight: 600,
                                  }}
                                />
                                <Chip
                                  label={priorityConfig.label}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    color: priorityConfig.color,
                                    borderColor: priorityConfig.color,
                                    fontWeight: 500,
                                  }}
                                />
                                {!notification.isRead && (
                                  <Chip
                                    label="MỚI"
                                    size="small"
                                    color="primary"
                                    variant="filled"
                                    sx={{ fontWeight: 700 }}
                                  />
                                )}
                              </Box>
                            </Box>

                            {/* Actions */}
                            <Box sx={{ display: "flex", gap: 1, ml: 2 }}>
                              {!notification.isRead && (
                                <IconButton
                                  onClick={() => onMarkAsRead(notification._id)}
                                  title="Đánh dấu đã đọc"
                                  sx={{
                                    bgcolor: "primary.main",
                                    color: "white",
                                    "&:hover": {
                                      bgcolor: "primary.dark",
                                    },
                                  }}
                                >
                                  <CheckCircle />
                                </IconButton>
                              )}
                              <IconButton
                                onClick={() =>
                                  onDeleteNotification(notification._id)
                                }
                                title="Xóa thông báo"
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

                          {/* Message */}
                          <Typography
                            variant="body1"
                            component="div"
                            sx={{
                              fontWeight: notification.isRead ? 400 : 500,
                              mb: 2,
                              lineHeight: 1.6,
                            }}
                          >
                            {notification.message}
                          </Typography>

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
                                {formatDate(notification.createdAt)}
                              </Typography>
                            </Box>

                            {notification.source && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                📝 <strong>{notification.source}</strong>
                              </Typography>
                            )}

                            {notification.recipientType && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                👥{" "}
                                <strong>
                                  {notification.recipientType === "all"
                                    ? "Tất cả người dùng"
                                    : notification.recipientType === "admin"
                                    ? "Quản trị viên"
                                    : "Người dùng thường"}
                                </strong>
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </ListItem>

                      {index < notifications.length - 1 && (
                        <Divider sx={{ my: 2 }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
