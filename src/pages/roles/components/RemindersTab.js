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
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  IconButton,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  AccessTime,
  Visibility,
  Delete,
  Refresh,
  Add,
} from "@mui/icons-material";

// Utility functions
const getReminderTypeColor = (type) => {
  const colors = {
    due_date: "#ff6b6b",
    custom: "#4ecdc4",
    start_date: "#45b7d1",
  };
  return colors[type] || "#666";
};

const getReminderTypeText = (type) => {
  const typeMap = {
    due_date: "Hạn task",
    custom: "Tùy chỉnh",
    start_date: "Bắt đầu",
  };
  return typeMap[type] || type;
};

const formatRemindTime = (remindAt) => {
  const now = new Date();
  const remindDate = new Date(remindAt);
  const diffMs = remindDate - now;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 0) return "Đã qua";
  if (diffMins < 60) return `${diffMins} phút nữa`;
  if (diffHours < 24) return `${diffHours} giờ nữa`;
  if (diffDays < 7) return `${diffDays} ngày nữa`;

  return remindDate.toLocaleDateString("vi-VN");
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
              <Typography variant="h5">Quản lý Reminders</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button startIcon={<Refresh />} onClick={onRefresh}>
                  Làm mới
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={onCreateReminder}
                  disabled={!currentUser}
                >
                  Tạo Reminder
                </Button>
              </Box>
            </Box>

            {reminders.length === 0 ? (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ textAlign: "center", py: 4 }}
              >
                Chưa có reminder nào
              </Typography>
            ) : (
              <List>
                {reminders.map((reminder) => (
                  <ListItem
                    key={reminder._id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: reminder.isSent
                        ? "action.hover"
                        : "background.default",
                      opacity: reminder.isSent ? 0.7 : 1,
                    }}
                    secondaryAction={
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          color="info"
                          onClick={() => onViewReminder(reminder)}
                          title="Xem chi tiết"
                        >
                          <Visibility />
                        </IconButton>
                        <IconButton
                          color="error"
                          onClick={() => onDeleteReminder(reminder._id)}
                          title="Xóa reminder"
                          disabled={reminder.isSent}
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          bgcolor: getReminderTypeColor(reminder.reminderType),
                        }}
                      >
                        <AccessTime />
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
                          <Typography variant="h6">
                            {reminder.message}
                          </Typography>
                          <Chip
                            label={getReminderTypeText(reminder.reminderType)}
                            size="small"
                            sx={{
                              bgcolor: getReminderTypeColor(
                                reminder.reminderType
                              ),
                              color: "white",
                            }}
                          />
                          <Chip
                            label={formatRemindTime(reminder.remindAt)}
                            size="small"
                            color={reminder.isSent ? "default" : "primary"}
                            variant={reminder.isSent ? "outlined" : "filled"}
                          />
                          {reminder.isSent && (
                            <Chip label="Đã gửi" size="small" color="success" />
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
                          {reminder.taskId && (
                            <>
                              <Typography variant="body2">
                                Task: <strong>{reminder.taskId.title}</strong>
                              </Typography>
                              <Typography variant="body2">
                                Trạng thái:{" "}
                                <strong>
                                  {reminder.taskId.status === "todo" &&
                                    "Chưa làm"}
                                  {reminder.taskId.status === "in_progress" &&
                                    "Đang làm"}
                                  {reminder.taskId.status === "review" &&
                                    "Chờ duyệt"}
                                  {reminder.taskId.status === "done" &&
                                    "Hoàn thành"}
                                </strong>
                              </Typography>
                              <Typography variant="body2">
                                Độ ưu tiên:{" "}
                                <strong>
                                  {reminder.taskId.priority === "low" && "Thấp"}
                                  {reminder.taskId.priority === "medium" &&
                                    "Trung bình"}
                                  {reminder.taskId.priority === "high" && "Cao"}
                                </strong>
                              </Typography>
                            </>
                          )}
                          <Typography variant="body2">
                            Thời gian:{" "}
                            <strong>
                              {new Date(reminder.remindAt).toLocaleString(
                                "vi-VN"
                              )}
                            </strong>
                          </Typography>
                          {reminder.taskId?.dueDate && (
                            <Typography variant="body2">
                              Hạn task:{" "}
                              <strong>
                                {new Date(
                                  reminder.taskId.dueDate
                                ).toLocaleDateString("vi-VN")}
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
  );
}
