// src/pages/roles/components/user/ReminderSystem.js
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
} from "@mui/material";
import {
  Add,
  AccessTime,
  Notifications,
  Delete,
  Schedule,
} from "@mui/icons-material";

const ReminderSystem = ({
  loading = false,
  reminders = [],
  currentUser,
  onRefresh,
  onDeleteReminder,
  onCreateReminder,
}) => {
  const [filter, setFilter] = useState("active"); // active, inactive, all

  const getReminderTypeColor = (type) => {
    switch (type) {
      case "meeting":
        return "primary";
      case "deadline":
        return "error";
      case "task":
        return "warning";
      default:
        return "default";
    }
  };

  const getReminderTypeIcon = (type) => {
    switch (type) {
      case "meeting":
        return "👥";
      case "deadline":
        return "⏰";
      case "task":
        return "✅";
      default:
        return "🔔";
    }
  };

  const getReminderTypeText = (type) => {
    switch (type) {
      case "meeting":
        return "Cuộc họp";
      case "deadline":
        return "Hạn chót";
      case "task":
        return "Công việc";
      default:
        return "Nhắc nhở";
    }
  };

  const getTimeDifference = (remindAt) => {
    if (!remindAt) return "Không có thời gian";

    const now = new Date();
    const reminderTime = new Date(remindAt);
    const diff = reminderTime - now;

    if (diff < 0) {
      return "Đã quá hạn";
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Còn ${hours} giờ ${minutes} phút`;
    } else if (minutes > 0) {
      return `Còn ${minutes} phút`;
    } else {
      return "Sắp đến hạn";
    }
  };

  const handleDeleteReminder = (reminderId) => {
    if (onDeleteReminder) {
      onDeleteReminder(reminderId);
    }
  };

  const handleCreateReminder = () => {
    if (onCreateReminder) {
      onCreateReminder();
    }
  };

  // Filter reminders based on status and time
  const filteredReminders = reminders.filter((reminder) => {
    if (filter === "active") {
      return reminder.isActive !== false;
    } else if (filter === "inactive") {
      return reminder.isActive === false;
    }
    return true;
  });

  const activeReminders = reminders.filter((r) => r.isActive !== false);
  const inactiveReminders = reminders.filter((r) => r.isActive === false);

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography textAlign="center">Đang tải nhắc nhở...</Typography>
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
            <Typography variant="h5" fontWeight="bold">
              ⏰ Hệ thống Nhắc nhở
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                startIcon={<Add />}
                variant="contained"
                onClick={handleCreateReminder}
              >
                Thêm nhắc nhở
              </Button>
              <Button
                startIcon={<Schedule />}
                onClick={onRefresh}
                variant="outlined"
              >
                Làm mới
              </Button>
            </Box>
          </Box>

          {/* Filter Buttons */}
          <Box sx={{ display: "flex", gap: 1, mb: 3 }}>
            <Button
              size="small"
              onClick={() => setFilter("active")}
              variant={filter === "active" ? "contained" : "outlined"}
            >
              Đang hoạt động ({activeReminders.length})
            </Button>
            <Button
              size="small"
              onClick={() => setFilter("inactive")}
              variant={filter === "inactive" ? "contained" : "outlined"}
            >
              Đã tắt ({inactiveReminders.length})
            </Button>
            <Button
              size="small"
              onClick={() => setFilter("all")}
              variant={filter === "all" ? "contained" : "outlined"}
            >
              Tất cả ({reminders.length})
            </Button>
          </Box>

          {/* Active Reminders */}
          {filteredReminders.length > 0 ? (
            <List>
              {filteredReminders.map((reminder, index) => (
                <div key={reminder._id || reminder.id || index}>
                  <ListItem
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      mb: 1,
                      bgcolor:
                        reminder.isActive === false
                          ? "action.hover"
                          : "background.paper",
                      opacity: reminder.isActive === false ? 0.6 : 1,
                    }}
                  >
                    <ListItemIcon>
                      <Box sx={{ fontSize: 24 }}>
                        {getReminderTypeIcon(reminder.type)}
                      </Box>
                    </ListItemIcon>

                    {/* Thay thế ListItemText bằng custom layout để tránh lỗi nesting */}
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
                          fontWeight="medium"
                          color={
                            reminder.isActive === false
                              ? "text.secondary"
                              : "text.primary"
                          }
                        >
                          {reminder.title}
                        </Typography>
                        <Chip
                          label={getReminderTypeText(reminder.type)}
                          size="small"
                          color={getReminderTypeColor(reminder.type)}
                          variant={
                            reminder.isActive === false ? "outlined" : "filled"
                          }
                        />
                      </Box>

                      {/* Secondary content */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {reminder.description}
                      </Typography>

                      {/* Timestamp and status */}
                      <Box
                        sx={{ display: "flex", gap: 2, alignItems: "center" }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <AccessTime fontSize="small" />
                          <Typography variant="caption" color="text.secondary">
                            {reminder.remindAt
                              ? new Date(reminder.remindAt).toLocaleString(
                                  "vi-VN"
                                )
                              : "Không có thời gian"}
                          </Typography>
                        </Box>
                        <Chip
                          label={getTimeDifference(reminder.remindAt)}
                          size="small"
                          variant="outlined"
                          color={
                            getTimeDifference(reminder.remindAt).includes(
                              "quá hạn"
                            )
                              ? "error"
                              : getTimeDifference(reminder.remindAt).includes(
                                  "Sắp đến"
                                )
                              ? "warning"
                              : "primary"
                          }
                        />
                      </Box>
                    </Box>

                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() =>
                          handleDeleteReminder(reminder._id || reminder.id)
                        }
                        color="error"
                        size="small"
                      >
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {index < filteredReminders.length - 1 && <Divider />}
                </div>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              {filter === "active"
                ? "Không có nhắc nhở nào đang hoạt động."
                : filter === "inactive"
                ? "Không có nhắc nhở nào đã tắt."
                : "Không có nhắc nhở nào."}
            </Alert>
          )}

          {/* Statistics */}
          <Box
            sx={{ mt: 3, p: 2, bgcolor: "background.default", borderRadius: 2 }}
          >
            <Typography variant="subtitle2" gutterBottom>
              📊 Thống kê nhắc nhở
            </Typography>
            <Box sx={{ display: "flex", gap: 3 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Tổng số
                </Typography>
                <Typography variant="h6">{reminders.length}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Đang hoạt động
                </Typography>
                <Typography variant="h6" color="primary.main">
                  {activeReminders.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Đã tắt
                </Typography>
                <Typography variant="h6" color="text.secondary">
                  {inactiveReminders.length}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </div>
  );
};

export default ReminderSystem;
