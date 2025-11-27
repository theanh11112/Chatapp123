// src/pages/roles/components/dialogs/CreateReminderDialog.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  Grid,
} from "@mui/material";

export default function CreateReminderDialog({
  open,
  onClose,
  currentUser,
  onCreateReminder,
}) {
  const [formData, setFormData] = useState({
    taskId: "",
    remindAt: new Date(Date.now() + 60 * 60 * 1000), // 1 giờ sau
    message: "",
    reminderType: "custom",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Format date thành string cho input
  const formatDateForInput = (date) => {
    return date.toISOString().slice(0, 16);
  };

  // Parse string từ input thành Date
  const parseDateFromInput = (dateString) => {
    return new Date(dateString);
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.remindAt) {
      setError("Vui lòng chọn thời gian nhắc nhở");
      return;
    }

    if (formData.remindAt <= new Date()) {
      setError("Thời gian nhắc nhở phải là tương lai");
      return;
    }

    if (!formData.message.trim()) {
      setError("Vui lòng nhập nội dung nhắc nhở");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await onCreateReminder(formData);
      handleClose();
    } catch (err) {
      setError("Lỗi khi tạo reminder");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      taskId: "",
      remindAt: new Date(Date.now() + 60 * 60 * 1000),
      message: "",
      reminderType: "custom",
    });
    setError("");
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleDateChange = (dateString) => {
    const newDate = parseDateFromInput(dateString);
    handleChange("remindAt", newDate);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Typography variant="h6" fontWeight="bold">
          Tạo Reminder Mới
        </Typography>
      </DialogTitle>

      <DialogContent>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          {/* Loại reminder */}
          <FormControl fullWidth>
            <InputLabel>Loại Reminder</InputLabel>
            <Select
              value={formData.reminderType}
              label="Loại Reminder"
              onChange={(e) => handleChange("reminderType", e.target.value)}
            >
              <MenuItem value="custom">Tùy chỉnh</MenuItem>
              <MenuItem value="due_date">Nhắc hạn task</MenuItem>
              <MenuItem value="start_date">Nhắc bắt đầu task</MenuItem>
            </Select>
          </FormControl>

          {/* Thời gian nhắc nhở - Thay thế DateTimePicker bằng input thường */}
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                label="Thời gian nhắc nhở"
                type="datetime-local"
                value={formatDateForInput(formData.remindAt)}
                onChange={(e) => handleDateChange(e.target.value)}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: formatDateForInput(new Date()),
                }}
              />
            </Grid>
          </Grid>

          {/* Nội dung nhắc nhở */}
          <TextField
            label="Nội dung nhắc nhở"
            multiline
            rows={3}
            value={formData.message}
            onChange={(e) => handleChange("message", e.target.value)}
            placeholder="Nhập nội dung nhắc nhở..."
            fullWidth
          />

          {/* Task ID (optional) */}
          <TextField
            label="ID Task (tùy chọn)"
            value={formData.taskId}
            onChange={(e) => handleChange("taskId", e.target.value)}
            placeholder="Nhập ID task nếu có..."
            fullWidth
            helperText="Để trống nếu là reminder độc lập"
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={handleClose} disabled={loading}>
          Hủy
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? "Đang tạo..." : "Tạo Reminder"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
