// src/pages/roles/components/dialogs/ViewReminderDialog.js
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
} from "@mui/material";
import { AccessTime, Task, CheckCircle, Cancel } from "@mui/icons-material";

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

const getStatusText = (status) => {
  const statusMap = {
    todo: "Chưa làm",
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
}) {
  if (!reminder) return null;

  const isPast = new Date(reminder.remindAt) < new Date();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <AccessTime color="primary" />
          <Typography variant="h6" fontWeight="bold">
            Chi tiết Reminder
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Chip
            label={reminder.isSent ? "Đã gửi" : "Chưa gửi"}
            color={reminder.isSent ? "success" : "warning"}
            variant="outlined"
          />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Thông tin cơ bản */}
          <Box>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              Nội dung
            </Typography>
            <Typography
              variant="body1"
              sx={{ p: 2, bgcolor: "grey.50", borderRadius: 1 }}
            >
              {reminder.message}
            </Typography>
          </Box>

          {/* Thông tin thời gian và loại */}
          <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Thời gian nhắc nhở
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {new Date(reminder.remindAt).toLocaleString("vi-VN")}
              </Typography>
              <Typography variant="body2" color={isPast ? "error" : "success"}>
                {isPast ? "Đã qua" : "Sắp tới"}
              </Typography>
            </Box>

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Loại reminder
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

            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Trạng thái
              </Typography>
              <Chip
                icon={reminder.isSent ? <CheckCircle /> : <Cancel />}
                label={reminder.isSent ? "Đã gửi" : "Chưa gửi"}
                color={reminder.isSent ? "success" : "default"}
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>

          <Divider />

          {/* Thông tin task nếu có */}
          {reminder.taskId && (
            <Box>
              <Typography
                variant="h6"
                gutterBottom
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Task fontSize="small" />
                Thông tin Task
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  p: 2,
                  bgcolor: "grey.50",
                  borderRadius: 1,
                }}
              >
                <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Tiêu đề
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {reminder.taskId.title}
                    </Typography>
                  </Box>

                  <Box>
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
                  </Box>

                  <Box>
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
                  </Box>
                </Box>

                {reminder.taskId.description && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Mô tả
                    </Typography>
                    <Typography variant="body2">
                      {reminder.taskId.description}
                    </Typography>
                  </Box>
                )}

                {reminder.taskId.dueDate && (
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Hạn task
                    </Typography>
                    <Typography variant="body2">
                      {new Date(reminder.taskId.dueDate).toLocaleDateString(
                        "vi-VN"
                      )}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          )}

          {/* Thông báo nếu reminder đã qua */}
          {isPast && !reminder.isSent && (
            <Alert severity="warning">
              Reminder này đã qua thời gian nhưng chưa được gửi
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="contained">
          Đóng
        </Button>
      </DialogActions>
    </Dialog>
  );
}
