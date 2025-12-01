// src/pages/roles/components/dialogs/ViewReminderDialog.js - HOÀN CHỈNH
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Divider,
  Alert,
  Avatar,
  AvatarGroup,
  Tooltip,
  Grid,
  IconButton,
} from "@mui/material";
import {
  AccessTime,
  Task,
  CheckCircle,
  Cancel,
  People,
  Person,
  Close,
} from "@mui/icons-material";

// Utility functions (giữ nguyên)
const getReminderTypeColor = (type) => {
  const colors = {
    personal: "#4caf50",
    meeting: "#2196f3",
    deadline: "#ff9800",
    task_reminder: "#9c27b0",
    birthday: "#e91e63",
    appointment: "#00bcd4",
    due_date: "#ff6b6b",
    custom: "#4ecdc4",
    start_date: "#45b7d1",
  };
  return colors[type] || "#666";
};

const getReminderTypeText = (type) => {
  const typeMap = {
    personal: "Cá nhân",
    meeting: "Cuộc họp",
    deadline: "Hạn chót",
    task_reminder: "Công việc",
    birthday: "Sinh nhật",
    appointment: "Lịch hẹn",
    due_date: "Hạn task",
    custom: "Tùy chỉnh",
    start_date: "Bắt đầu",
  };
  return typeMap[type] || type;
};

const getStatusText = (status) => {
  const statusMap = {
    todo: "Cần làm",
    in_progress: "Đang làm",
    review: "Chờ duyệt",
    done: "Hoàn thành",
  };
  return statusMap[status] || status;
};

const getPriorityText = (priority) => {
  const priorityMap = {
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
  };
  return priorityMap[priority] || priority;
};

export default function ViewReminderDialog({
  open,
  onClose,
  reminder,
  currentUser,
  onDeleteReminder,
}) {
  if (!reminder) return null;

  const isPast = new Date(reminder.remindAt) < new Date();
  const isOverdue = isPast && !reminder.isCompleted;

  // 🆕 Hàm render recipients info
  const renderRecipientsInfo = () => {
    if (!reminder.recipientIds || reminder.recipientIds.length === 0) {
      return (
        <Alert severity="info" sx={{ mt: 1 }}>
          📭 Chưa có người nhận nào được chỉ định
        </Alert>
      );
    }

    const recipients =
      reminder.recipientsInfo ||
      reminder.recipientIds.map((id) => ({
        keycloakId: id,
        firstName: "Unknown",
        lastName: "User",
        username: id,
      }));

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="subtitle2" color="text.secondary" gutterBottom>
          👥 Người nhận ({recipients.length})
        </Typography>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2 }}>
          <AvatarGroup max={5}>
            {recipients.map((recipient, index) => (
              <Tooltip
                key={recipient.keycloakId || index}
                title={`${recipient.firstName} ${recipient.lastName} ${
                  recipient.username ? `(@${recipient.username})` : ""
                }`}
              >
                <Avatar
                  sx={{ width: 32, height: 32 }}
                  alt={`${recipient.firstName} ${recipient.lastName}`}
                >
                  {recipient.firstName?.[0]}
                  {recipient.lastName?.[0]}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
          <Box sx={{ flex: 1 }}>
            {recipients.map((recipient, index) => (
              <Box
                key={recipient.keycloakId || index}
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
              >
                <Avatar sx={{ width: 24, height: 24, fontSize: "0.7rem" }}>
                  {recipient.firstName?.[0]}
                  {recipient.lastName?.[0]}
                </Avatar>
                <Typography variant="body2">
                  {recipient.firstName} {recipient.lastName}
                  {recipient.username && (
                    <Typography
                      component="span"
                      variant="caption"
                      color="text.secondary"
                      sx={{ ml: 0.5 }}
                    >
                      (@{recipient.username})
                    </Typography>
                  )}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
    );
  };

  // 🆕 Hàm xử lý xóa reminder
  const handleDeleteReminder = () => {
    if (onDeleteReminder && reminder._id) {
      onDeleteReminder(reminder._id);
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <AccessTime color="primary" />
            <Typography variant="h6" fontWeight="bold">
              ⏰ Chi tiết Reminder
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Chip
              label={reminder.isCompleted ? "Đã hoàn thành" : "Chưa hoàn thành"}
              color={reminder.isCompleted ? "success" : "warning"}
              variant="outlined"
              size="small"
            />
            <IconButton onClick={onClose} size="small">
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Title and Description */}
          <Box>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ wordBreak: "break-word" }}
            >
              {reminder.title}
            </Typography>
            {reminder.description && (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{
                  p: 2,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                  wordBreak: "break-word",
                }}
              >
                {reminder.description}
              </Typography>
            )}
          </Box>

          <Divider />

          {/* Basic Information */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  🕐 Thời gian nhắc nhở
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {new Date(reminder.remindAt).toLocaleString("vi-VN", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Typography>
                <Chip
                  label={isPast ? "Đã qua" : "Sắp tới"}
                  size="small"
                  color={isPast ? "error" : "success"}
                  sx={{ mt: 1 }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  📋 Loại reminder
                </Typography>
                <Chip
                  label={getReminderTypeText(reminder.reminderType)}
                  size="small"
                  sx={{
                    bgcolor: getReminderTypeColor(reminder.reminderType),
                    color: "white",
                  }}
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  📮 Trạng thái
                </Typography>
                <Chip
                  icon={reminder.isCompleted ? <CheckCircle /> : <Cancel />}
                  label={
                    reminder.isCompleted ? "Đã hoàn thành" : "Chưa hoàn thành"
                  }
                  color={reminder.isCompleted ? "success" : "default"}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Grid>

            <Grid item xs={12} md={6}>
              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  ⚡ Hoạt động
                </Typography>
                <Chip
                  label={
                    reminder.isActive !== false ? "Đang hoạt động" : "Đã tắt"
                  }
                  color={reminder.isActive !== false ? "success" : "default"}
                  variant="outlined"
                  size="small"
                />
              </Box>
            </Grid>
          </Grid>

          {/* Creator Information */}
          {reminder.creatorInfo && (
            <Box>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                👤 Người tạo
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Avatar sx={{ width: 32, height: 32, fontSize: "0.8rem" }}>
                  {reminder.creatorInfo.firstName?.[0]}
                  {reminder.creatorInfo.lastName?.[0]}
                </Avatar>
                <Box>
                  <Typography variant="body2" fontWeight="medium">
                    {reminder.creatorInfo.firstName}{" "}
                    {reminder.creatorInfo.lastName}
                  </Typography>
                  {reminder.creatorInfo.username && (
                    <Typography variant="caption" color="text.secondary">
                      @{reminder.creatorInfo.username}
                    </Typography>
                  )}
                </Box>
              </Box>
            </Box>
          )}

          {/* Recipients Information */}
          {renderRecipientsInfo()}

          <Divider />

          {/* Task Information (if linked to task) */}
          {reminder.taskId && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Task fontSize="small" />
                📋 Thông tin Task liên quan
              </Typography>

              <Box sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tiêu đề
                    </Typography>
                    <Typography
                      variant="body1"
                      fontWeight="medium"
                      sx={{ wordBreak: "break-word" }}
                    >
                      {reminder.taskId.title}
                    </Typography>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Trạng thái
                    </Typography>
                    <Chip
                      label={getStatusText(reminder.taskId.status)}
                      size="small"
                      color={
                        reminder.taskId.status === "done"
                          ? "success"
                          : reminder.taskId.status === "in_progress"
                          ? "warning"
                          : "default"
                      }
                    />
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Độ ưu tiên
                    </Typography>
                    <Chip
                      label={getPriorityText(reminder.taskId.priority)}
                      size="small"
                      color={
                        reminder.taskId.priority === "high"
                          ? "error"
                          : reminder.taskId.priority === "medium"
                          ? "warning"
                          : "success"
                      }
                    />
                  </Grid>

                  {reminder.taskId.dueDate && (
                    <Grid item xs={12} md={4}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Hạn task
                      </Typography>
                      <Typography variant="body2">
                        {new Date(reminder.taskId.dueDate).toLocaleDateString(
                          "vi-VN"
                        )}
                      </Typography>
                    </Grid>
                  )}

                  {reminder.taskId.description && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Mô tả
                      </Typography>
                      <Typography
                        variant="body2"
                        sx={{ wordBreak: "break-word" }}
                      >
                        {reminder.taskId.description}
                      </Typography>
                    </Grid>
                  )}

                  {/* Hiển thị assignees của task */}
                  {reminder.taskId.assigneeIds &&
                    reminder.taskId.assigneeIds.length > 0 && (
                      <Grid item xs={12}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Người thực hiện
                        </Typography>
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <People fontSize="small" color="action" />
                          <Typography variant="body2">
                            {reminder.taskId.assigneeIds.length} người
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                </Grid>
              </Box>
            </Box>
          )}

          {/* Warnings and Info */}
          {isOverdue && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              ⚠️ Reminder này đã qua thời gian nhưng chưa hoàn thành
            </Alert>
          )}

          {reminder.recipientIds && reminder.recipientIds.length > 1 && (
            <Alert severity="info">
              💡 Reminder này sẽ được gửi cho{" "}
              <strong>{reminder.recipientIds.length} người</strong>
            </Alert>
          )}

          {!reminder.isActive && (
            <Alert severity="info">
              🔕 Reminder này đã bị tắt và sẽ không được gửi
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, justifyContent: "space-between" }}>
        <Box>
          {/* Thêm nút xóa cho creator hoặc admin */}
          {(currentUser?.keycloakId === reminder.creatorInfo?.keycloakId ||
            currentUser?.roles?.includes("admin")) && (
            <Button
              onClick={handleDeleteReminder}
              color="error"
              variant="outlined"
            >
              Xóa Reminder
            </Button>
          )}
        </Box>
        <Button onClick={onClose} variant="contained">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
