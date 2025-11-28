// src/pages/roles/components/user/CreateReminderDialog.js
import React, { useState } from "react";
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
  Chip,
  Autocomplete,
  Alert,
  Grid,
} from "@mui/material";

const CreateReminderDialog = ({
  open,
  onClose,
  currentUser,
  onCreateReminder,
  tasks = [],
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "personal",
    remindDate: "",
    remindTime: "",
    taskId: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // 🆕 Filter tasks để chỉ lấy những task chưa hoàn thành
  const availableTasks = tasks.filter(
    (task) => task.status !== "done" && task.status !== "cancelled"
  );

  const handleChange = (field) => (event) => {
    const value = event.target ? event.target.value : event;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Mark field as touched
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }

    // 🆕 Validate date/time immediately when changed
    if (field === "remindDate" || field === "remindTime") {
      validateDateTime();
    }
  };

  // 🆕 Khi chọn task, tự động điền title và description
  const handleTaskChange = (event, value) => {
    if (value) {
      setFormData((prev) => ({
        ...prev,
        taskId: value._id,
        title: `Nhắc nhở: ${value.title}`,
        description: value.description || `Nhắc nhở cho task: ${value.title}`,
        type: "task", // Tự động set type là task
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        taskId: "",
        title: "",
        description: "",
        type: "personal",
      }));
    }
  };

  // 🆕 Hàm validate date/time
  const validateDateTime = () => {
    const newErrors = { ...errors };

    if (formData.remindDate && formData.remindTime) {
      const remindDateTime = new Date(
        `${formData.remindDate}T${formData.remindTime}`
      );
      const now = new Date();

      if (remindDateTime <= now) {
        newErrors.remindDate = "Thời gian nhắc nhở phải ở tương lai";
        newErrors.remindTime = "Thời gian nhắc nhở phải ở tương lai";
      } else {
        // Clear errors if valid
        delete newErrors.remindDate;
        delete newErrors.remindTime;
      }
    }

    setErrors(newErrors);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Tiêu đề không được để trống";
    }

    if (!formData.remindDate) {
      newErrors.remindDate = "Ngày nhắc nhở không được để trống";
    }

    if (!formData.remindTime) {
      newErrors.remindTime = "Thời gian nhắc nhở không được để trống";
    }

    // 🆕 Kiểm tra nếu ngày/giờ đã qua - với validation chi tiết hơn
    if (formData.remindDate && formData.remindTime) {
      const remindDateTime = new Date(
        `${formData.remindDate}T${formData.remindTime}`
      );
      const now = new Date();

      if (remindDateTime <= now) {
        newErrors.remindDate = "Thời gian nhắc nhở phải ở tương lai";
        newErrors.remindTime = "Thời gian nhắc nhở phải ở tương lai";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    // 🆕 Double-check date/time validation
    const remindDateTime = new Date(
      `${formData.remindDate}T${formData.remindTime}`
    );
    const now = new Date();

    if (remindDateTime <= now) {
      setErrors({
        remindDate: "Thời gian nhắc nhở phải ở tương lai",
        remindTime: "Thời gian nhắc nhở phải ở tương lai",
      });
      return;
    }

    // Tạo remindAt từ date và time
    const remindAt = remindDateTime.toISOString();

    const reminderData = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      remindAt: remindAt,
      isActive: true,
      taskId: formData.taskId || undefined, // Chỉ gửi nếu có taskId
    };

    onCreateReminder(reminderData);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      type: "personal",
      remindDate: "",
      remindTime: "",
      taskId: "",
    });
    setErrors({});
    setTouched({});
    onClose();
  };

  // 🆕 Hàm kiểm tra xem form có thể submit không
  const canSubmit = () => {
    const hasRequiredFields =
      formData.title.trim() && formData.remindDate && formData.remindTime;

    if (!hasRequiredFields) return false;

    // Check if date/time is in future
    if (formData.remindDate && formData.remindTime) {
      const remindDateTime = new Date(
        `${formData.remindDate}T${formData.remindTime}`
      );
      const now = new Date();
      return remindDateTime > now;
    }

    return false;
  };

  const reminderTypes = [
    { value: "personal", label: "Cá nhân", emoji: "👤" },
    { value: "meeting", label: "Cuộc họp", emoji: "👥" },
    { value: "deadline", label: "Hạn chót", emoji: "⏰" },
    { value: "task", label: "Công việc", emoji: "✅" },
    { value: "birthday", label: "Sinh nhật", emoji: "🎂" },
    { value: "appointment", label: "Lịch hẹn", emoji: "📅" },
  ];

  // 🆕 Hàm lấy trạng thái task
  const getTaskStatusInfo = (task) => {
    const statusMap = {
      pending: { text: "Chờ xử lý", color: "default" },
      in_progress: { text: "Đang làm", color: "warning" },
      done: { text: "Hoàn thành", color: "success" },
      cancelled: { text: "Đã hủy", color: "error" },
    };

    return statusMap[task.status] || { text: task.status, color: "default" };
  };

  const getPriorityInfo = (task) => {
    const priorityMap = {
      high: { text: "Cao", color: "error" },
      medium: { text: "Trung bình", color: "warning" },
      low: { text: "Thấp", color: "success" },
    };

    return (
      priorityMap[task.priority] || { text: task.priority, color: "default" }
    );
  };

  // Tạo danh sách giờ
  const timeOptions = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeString = `${hour.toString().padStart(2, "0")}:${minute
        .toString()
        .padStart(2, "0")}`;
      timeOptions.push(timeString);
    }
  }

  // Lấy ngày mai làm mặc định
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  // Lấy giờ tiếp theo làm mặc định
  const getNextHourTime = () => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    return `${nextHour.getHours().toString().padStart(2, "0")}:${nextHour
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  // 🆕 Lấy ngày hiện tại để set min cho date picker
  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      {/* 🆕 SỬA: Thêm component="div" để tránh lỗi DOM nesting */}
      <DialogTitle>
        <Typography variant="h6" component="div" fontWeight="bold">
          🆕 Tạo Nhắc Nhở Mới
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          {/* 🆕 Task Selection - Chỉ hiển thị nếu có tasks */}
          {availableTasks.length > 0 && (
            <Box>
              <Typography variant="subtitle2" gutterBottom>
                🔗 Liên kết với công việc (tùy chọn)
              </Typography>
              <Autocomplete
                options={availableTasks}
                getOptionLabel={(option) => option.title}
                onChange={handleTaskChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chọn công việc cần nhắc nhở"
                    placeholder="Tìm kiếm công việc..."
                  />
                )}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ width: "100%" }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Typography variant="body1">{option.title}</Typography>
                        <Box sx={{ display: "flex", gap: 0.5 }}>
                          <Chip
                            label={getTaskStatusInfo(option).text}
                            size="small"
                            color={getTaskStatusInfo(option).color}
                            variant="outlined"
                          />
                          <Chip
                            label={getPriorityInfo(option).text}
                            size="small"
                            color={getPriorityInfo(option).color}
                          />
                        </Box>
                      </Box>
                      {option.description && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mt: 0.5 }}
                        >
                          {option.description.length > 100
                            ? `${option.description.substring(0, 100)}...`
                            : option.description}
                        </Typography>
                      )}
                      {option.dueDate && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 0.5, display: "block" }}
                        >
                          📅 Hạn:{" "}
                          {new Date(option.dueDate).toLocaleDateString("vi-VN")}
                        </Typography>
                      )}
                    </Box>
                  </li>
                )}
              />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                💡 Chọn công việc để tự động điền thông tin
              </Typography>
            </Box>
          )}

          {availableTasks.length === 0 && (
            <Alert severity="info">
              📝 Hiện không có công việc nào đang thực hiện. Bạn vẫn có thể tạo
              nhắc nhở cá nhân.
            </Alert>
          )}

          {/* Title */}
          <TextField
            label="Tiêu đề nhắc nhở"
            value={formData.title}
            onChange={handleChange("title")}
            error={!!errors.title}
            helperText={errors.title}
            fullWidth
            required
          />

          {/* Description */}
          <TextField
            label="Mô tả nhắc nhở"
            value={formData.description}
            onChange={handleChange("description")}
            multiline
            rows={3}
            fullWidth
          />

          {/* Type */}
          <FormControl fullWidth>
            <InputLabel>Loại nhắc nhở</InputLabel>
            <Select
              value={formData.type}
              label="Loại nhắc nhở"
              onChange={handleChange("type")}
            >
              {reminderTypes.map((type) => (
                <MenuItem key={type.value} value={type.value}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <span>{type.emoji}</span>
                    <span>{type.label}</span>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Date and Time Selection */}
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label="Ngày nhắc nhở"
                type="date"
                value={formData.remindDate || getTomorrowDate()}
                onChange={handleChange("remindDate")}
                error={!!errors.remindDate}
                helperText={errors.remindDate || "Chọn ngày trong tương lai"}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
                inputProps={{
                  min: getTodayDate(), // 🆕 Không cho chọn ngày trong quá khứ
                }}
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth error={!!errors.remindTime}>
                <InputLabel>Thời gian</InputLabel>
                <Select
                  value={formData.remindTime || getNextHourTime()}
                  label="Thời gian"
                  onChange={handleChange("remindTime")}
                >
                  {timeOptions.map((time) => (
                    <MenuItem key={time} value={time}>
                      {time}
                    </MenuItem>
                  ))}
                </Select>
                {errors.remindTime && (
                  <Typography variant="caption" color="error">
                    {errors.remindTime}
                  </Typography>
                )}
                {!errors.remindTime && (
                  <Typography variant="caption" color="text.secondary">
                    Chọn thời gian trong tương lai
                  </Typography>
                )}
              </FormControl>
            </Grid>
          </Grid>

          {/* 🆕 Date/Time Validation Alert */}
          {formData.remindDate &&
            formData.remindTime &&
            (() => {
              const remindDateTime = new Date(
                `${formData.remindDate}T${formData.remindTime}`
              );
              const now = new Date();
              const isValid = remindDateTime > now;

              return (
                <Alert severity={isValid ? "success" : "error"} sx={{ mt: 1 }}>
                  {isValid
                    ? `✅ Nhắc nhở sẽ được kích hoạt vào: ${remindDateTime.toLocaleString(
                        "vi-VN"
                      )}`
                    : `❌ Thời gian nhắc nhở phải ở tương lai! Đã chọn: ${remindDateTime.toLocaleString(
                        "vi-VN"
                      )}`}
                </Alert>
              );
            })()}

          {/* Preview */}
          <Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}>
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              👁️ Xem trước nhắc nhở:
            </Typography>
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>{formData.title || "[Tiêu đề nhắc nhở]"}</strong>
            </Typography>
            {formData.description && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {formData.description}
              </Typography>
            )}
            <Box
              sx={{
                display: "flex",
                gap: 1,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <Chip
                label={
                  reminderTypes.find((t) => t.value === formData.type)?.label ||
                  "Cá nhân"
                }
                size="small"
                variant="outlined"
              />
              {formData.remindDate && formData.remindTime && (
                <Typography variant="caption" color="text.secondary">
                  ⏰{" "}
                  {new Date(
                    `${formData.remindDate}T${formData.remindTime}`
                  ).toLocaleString("vi-VN")}
                </Typography>
              )}
              {formData.taskId && (
                <Chip
                  label="📎 Có liên kết task"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Hủy</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!canSubmit()} // 🆕 Sử dụng hàm canSubmit thay vì disabled đơn giản
        >
          Tạo Nhắc Nhở
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateReminderDialog;
