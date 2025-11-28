// src/pages/roles/components/dialogs/CreateNotificationDialog.js
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Box,
  Typography,
  Grid,
  Alert,
} from "@mui/material";
import { NotificationsActive } from "@mui/icons-material";

export default function CreateNotificationDialog({
  open,
  onClose,
  onCreateNotification,
}) {
  const [newNotification, setNewNotification] = useState({
    title: "",
    message: "",
    type: "info",
    priority: "medium",
    recipientType: "all",
    recipientIds: [],
    source: "System Admin",
    scheduleDate: "",
    scheduleTime: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // 🆕 Hàm validate form
  const validateForm = () => {
    const newErrors = {};

    if (!newNotification.title.trim()) {
      newErrors.title = "Tiêu đề không được để trống";
    }

    if (!newNotification.message.trim()) {
      newErrors.message = "Nội dung không được để trống";
    }

    // 🆕 Validate scheduled time nếu có
    if (newNotification.scheduleDate && newNotification.scheduleTime) {
      const scheduledDateTime = new Date(
        `${newNotification.scheduleDate}T${newNotification.scheduleTime}`
      );
      const now = new Date();

      if (scheduledDateTime <= now) {
        newErrors.scheduleDate = "Thời gian lên lịch phải ở tương lai";
        newErrors.scheduleTime = "Thời gian lên lịch phải ở tương lai";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 🆕 Hàm kiểm tra có thể submit không
  const canSubmit = () => {
    const hasRequiredFields =
      newNotification.title.trim() && newNotification.message.trim();

    if (!hasRequiredFields) return false;

    // Check if scheduled time is valid (if provided)
    if (newNotification.scheduleDate && newNotification.scheduleTime) {
      const scheduledDateTime = new Date(
        `${newNotification.scheduleDate}T${newNotification.scheduleTime}`
      );
      const now = new Date();
      return scheduledDateTime > now;
    }

    return true; // Cho phép tạo ngay lập tức nếu không lên lịch
  };

  const handleCreateNotification = async () => {
    if (!validateForm()) return;

    // 🆕 Double-check date/time validation
    if (newNotification.scheduleDate && newNotification.scheduleTime) {
      const scheduledDateTime = new Date(
        `${newNotification.scheduleDate}T${newNotification.scheduleTime}`
      );
      const now = new Date();

      if (scheduledDateTime <= now) {
        setErrors({
          scheduleDate: "Thời gian lên lịch phải ở tương lai",
          scheduleTime: "Thời gian lên lịch phải ở tương lai",
        });
        return;
      }
    }

    setLoading(true);
    try {
      await onCreateNotification(newNotification);
      // Reset form
      setNewNotification({
        title: "",
        message: "",
        type: "info",
        priority: "medium",
        recipientType: "all",
        recipientIds: [],
        source: "System Admin",
        scheduleDate: "",
        scheduleTime: "",
      });
      setErrors({});
    } catch (error) {
      console.error("Error creating notification:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setNewNotification((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }

    // 🆕 Validate date/time immediately when changed
    if (field === "scheduleDate" || field === "scheduleTime") {
      validateScheduledTime();
    }
  };

  // 🆕 Hàm validate scheduled time
  const validateScheduledTime = () => {
    if (newNotification.scheduleDate && newNotification.scheduleTime) {
      const scheduledDateTime = new Date(
        `${newNotification.scheduleDate}T${newNotification.scheduleTime}`
      );
      const now = new Date();

      if (scheduledDateTime <= now) {
        setErrors((prev) => ({
          ...prev,
          scheduleDate: "Thời gian lên lịch phải ở tương lai",
          scheduleTime: "Thời gian lên lịch phải ở tương lai",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          scheduleDate: "",
          scheduleTime: "",
        }));
      }
    }
  };

  const handleClose = () => {
    setNewNotification({
      title: "",
      message: "",
      type: "info",
      priority: "medium",
      recipientType: "all",
      recipientIds: [],
      source: "System Admin",
      scheduleDate: "",
      scheduleTime: "",
    });
    setErrors({});
    onClose();
  };

  // 🆕 Lấy ngày mai làm mặc định
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  // 🆕 Lấy giờ tiếp theo làm mặc định
  const getNextHourTime = () => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    return `${nextHour.getHours().toString().padStart(2, "0")}:${nextHour
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  // 🆕 Lấy ngày hiện tại
  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <NotificationsActive color="primary" />
          <Typography variant="h6">Tạo Thông báo Hệ thống</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Tiêu đề thông báo"
              value={newNotification.title}
              onChange={handleChange("title")}
              error={!!errors.title}
              helperText={errors.title}
              placeholder="Nhập tiêu đề thông báo..."
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Nội dung thông báo"
              value={newNotification.message}
              onChange={handleChange("message")}
              error={!!errors.message}
              helperText={errors.message}
              placeholder="Nhập nội dung thông báo..."
              required
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Loại thông báo"
              value={newNotification.type}
              onChange={handleChange("type")}
            >
              <MenuItem value="info">Thông tin</MenuItem>
              <MenuItem value="success">Thành công</MenuItem>
              <MenuItem value="warning">Cảnh báo</MenuItem>
              <MenuItem value="error">Lỗi</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Độ ưu tiên"
              value={newNotification.priority}
              onChange={handleChange("priority")}
            >
              <MenuItem value="low">Thấp</MenuItem>
              <MenuItem value="medium">Trung bình</MenuItem>
              <MenuItem value="high">Cao</MenuItem>
              <MenuItem value="critical">Khẩn cấp</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Đối tượng nhận"
              value={newNotification.recipientType}
              onChange={handleChange("recipientType")}
            >
              <MenuItem value="all">Tất cả người dùng</MenuItem>
              <MenuItem value="admin">Quản trị viên</MenuItem>
              <MenuItem value="user">Người dùng thường</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Nguồn thông báo"
              value={newNotification.source}
              onChange={handleChange("source")}
              placeholder="VD: System Admin, Monitoring..."
            />
          </Grid>

          {/* 🆕 Scheduled Time Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, mb: 1 }}>
              ⏰ Lên lịch thông báo (tùy chọn)
            </Typography>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Ngày gửi"
              type="date"
              value={newNotification.scheduleDate || getTomorrowDate()}
              onChange={handleChange("scheduleDate")}
              error={!!errors.scheduleDate}
              helperText={errors.scheduleDate || "Để trống để gửi ngay lập tức"}
              InputLabelProps={{
                shrink: true,
              }}
              inputProps={{
                min: getTodayDate(),
              }}
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Giờ gửi"
              type="time"
              value={newNotification.scheduleTime || getNextHourTime()}
              onChange={handleChange("scheduleTime")}
              error={!!errors.scheduleTime}
              helperText={errors.scheduleTime}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>

          {/* 🆕 Schedule Validation Alert */}
          {newNotification.scheduleDate &&
            newNotification.scheduleTime &&
            (() => {
              const scheduledDateTime = new Date(
                `${newNotification.scheduleDate}T${newNotification.scheduleTime}`
              );
              const now = new Date();
              const isValid = scheduledDateTime > now;

              return (
                <Grid item xs={12}>
                  <Alert severity={isValid ? "success" : "error"}>
                    {isValid
                      ? `✅ Thông báo sẽ được gửi vào: ${scheduledDateTime.toLocaleString(
                          "vi-VN"
                        )}`
                      : `❌ Thời gian lên lịch phải ở tương lai! Đã chọn: ${scheduledDateTime.toLocaleString(
                          "vi-VN"
                        )}`}
                  </Alert>
                </Grid>
              );
            })()}
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateNotification}
          disabled={!canSubmit() || loading}
        >
          {loading ? "Đang tạo..." : "Tạo Thông báo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
