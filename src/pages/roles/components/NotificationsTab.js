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
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  IconButton,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  Notifications,
  Warning,
  CheckCircle,
  Delete,
  MarkEmailRead,
  Add,
  Refresh,
} from "@mui/icons-material";

// Utility functions
const getNotificationTypeColor = (type) => {
  const colors = {
    info: "#2196f3",
    success: "#4caf50",
    warning: "#ff9800",
    error: "#f44336",
  };
  return colors[type] || "#666";
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

export default function NotificationsTab({
  loading,
  notifications,
  notificationStats,
  unreadNotificationsCount,
  onRefresh,
  onMarkAsRead,
  onDeleteNotification,
  onMarkAllAsRead,
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
              <Typography variant="h5">Quản lý Thông báo Hệ thống</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<MarkEmailRead />}
                  onClick={onMarkAllAsRead}
                  disabled={unreadNotificationsCount === 0}
                >
                  Đánh dấu tất cả đã đọc
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    /* This will be handled by parent */
                  }}
                >
                  Tạo Thông báo
                </Button>
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={onRefresh}
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

            {notifications.length === 0 ? (
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
                            onClick={() => onMarkAsRead(notification._id)}
                            title="Đánh dấu đã đọc"
                          >
                            <CheckCircle />
                          </IconButton>
                        )}
                        <IconButton
                          color="error"
                          onClick={() => onDeleteNotification(notification._id)}
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
                          bgcolor: getNotificationTypeColor(notification.type),
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
                              color: getPriorityColor(notification.priority),
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
                            <Typography variant="body2" color="text.secondary">
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
                                Nguồn: <strong>{notification.source}</strong>
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
  );
}
