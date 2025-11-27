// src/pages/roles/components/user/NotificationCenter.js
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Button,
  Divider,
  Alert,
  Badge,
} from "@mui/material";
import { Notifications, Delete, MarkEmailRead } from "@mui/icons-material";

const NotificationCenter = ({
  loading = false,
  notifications = [],
  unreadNotificationsCount = 0,
  onMarkAsRead,
  onDeleteNotification,
  onMarkAllAsRead,
  onRefresh,
}) => {
  const [filter, setFilter] = useState("all"); // all, unread, read

  const getNotificationIcon = (type) => {
    switch (type) {
      case "task":
        return "✅";
      case "meeting":
        return "👥";
      case "system":
        return "⚙️";
      case "update":
        return "🔄";
      default:
        return "🔔";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "info";
      default:
        return "default";
    }
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Vừa xong";

    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diff = now - notificationTime;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} phút trước`;
    } else if (hours < 24) {
      return `${hours} giờ trước`;
    } else {
      return `${days} ngày trước`;
    }
  };

  const handleMarkAsRead = (notificationId) => {
    if (onMarkAsRead) {
      onMarkAsRead(notificationId);
    }
  };

  const handleDeleteNotification = (notificationId) => {
    if (onDeleteNotification) {
      onDeleteNotification(notificationId);
    }
  };

  const handleMarkAllAsRead = () => {
    if (onMarkAllAsRead) {
      onMarkAllAsRead();
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "all") return true;
    if (filter === "unread") return !notification.isRead;
    if (filter === "read") return notification.isRead;
    return true;
  });

  const readCount = notifications.filter((n) => n.isRead).length;

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography textAlign="center">Đang tải thông báo...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <CardContent>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Badge badgeContent={unreadNotificationsCount} color="error">
                <Notifications color="primary" />
              </Badge>
              <Typography variant="h5" fontWeight="bold">
                Trung tâm Thông báo
              </Typography>
            </Box>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                size="small"
                onClick={() => setFilter("all")}
                variant={filter === "all" ? "contained" : "outlined"}
              >
                Tất cả
              </Button>
              <Button
                size="small"
                onClick={() => setFilter("unread")}
                variant={filter === "unread" ? "contained" : "outlined"}
              >
                Chưa đọc
              </Button>
              <Button
                size="small"
                onClick={() => setFilter("read")}
                variant={filter === "read" ? "contained" : "outlined"}
              >
                Đã đọc
              </Button>
            </Box>
          </Box>

          {/* Action Buttons */}
          <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
            <Button
              startIcon={<MarkEmailRead />}
              onClick={handleMarkAllAsRead}
              disabled={unreadNotificationsCount === 0}
              variant="outlined"
              size="small"
            >
              Đánh dấu tất cả đã đọc
            </Button>
            <Button
              startIcon={<Delete />}
              onClick={onRefresh}
              variant="outlined"
              size="small"
            >
              Làm mới
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          {/* Notifications List */}
          {filteredNotifications.length > 0 ? (
            <List>
              {filteredNotifications.map((notification, index) => (
                <div key={notification._id || notification.id || index}>
                  <ListItem
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: notification.isRead
                        ? "background.paper"
                        : "action.hover",
                      position: "relative",
                      "&::before": notification.isRead
                        ? {}
                        : {
                            content: '""',
                            position: "absolute",
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 4,
                            backgroundColor: "primary.main",
                            borderTopLeftRadius: 8,
                            borderBottomLeftRadius: 8,
                          },
                    }}
                  >
                    <ListItemIcon>
                      <Box sx={{ fontSize: 24 }}>
                        {getNotificationIcon(notification.type)}
                      </Box>
                    </ListItemIcon>

                    {/* Sửa phần ListItemText để tránh lỗi nesting */}
                    <Box sx={{ flex: 1, mr: 2 }}>
                      {/* Primary content */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight={notification.isRead ? "normal" : "bold"}
                          component="span"
                        >
                          {notification.title}
                        </Typography>
                        <Chip
                          label={
                            notification.priority === "high"
                              ? "Quan trọng"
                              : notification.priority === "medium"
                              ? "Bình thường"
                              : "Thông tin"
                          }
                          size="small"
                          color={getPriorityColor(notification.priority)}
                        />
                      </Box>

                      {/* Secondary content */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {notification.message || notification.description}
                      </Typography>

                      {/* Timestamp */}
                      <Typography variant="caption" color="text.secondary">
                        {getTimeAgo(
                          notification.timestamp || notification.createdAt
                        )}
                      </Typography>
                    </Box>

                    <ListItemSecondaryAction>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        {!notification.isRead && (
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleMarkAsRead(
                                notification._id || notification.id
                              )
                            }
                            color="primary"
                          >
                            <MarkEmailRead />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          onClick={() =>
                            handleDeleteNotification(
                              notification._id || notification.id
                            )
                          }
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                </div>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              {filter === "unread"
                ? "Không có thông báo nào chưa đọc."
                : filter === "read"
                ? "Không có thông báo nào đã đọc."
                : "Không có thông báo nào."}
            </Alert>
          )}

          {/* Statistics */}
          <Box
            sx={{ mt: 3, p: 2, bgcolor: "background.default", borderRadius: 2 }}
          >
            <Typography variant="subtitle2" gutterBottom>
              📊 Thống kê thông báo
            </Typography>
            <Box sx={{ display: "flex", gap: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Tổng số
                </Typography>
                <Typography variant="h6">{notifications.length}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Chưa đọc
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {unreadNotificationsCount}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Đã đọc
                </Typography>
                <Typography variant="h6" color="success.main">
                  {readCount}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotificationCenter;
