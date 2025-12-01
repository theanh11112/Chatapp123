// src/pages/roles/components/dialogs/CreateReminderDialog.js - ĐÃ SỬA CHO ADMIN
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
  Chip,
  Autocomplete,
  Alert,
  Grid,
  CircularProgress,
} from "@mui/material";
import { Schedule } from "@mui/icons-material";

const CreateReminderDialog = ({
  open,
  onClose,
  currentUser,
  onCreateReminder,
  tasks = [],
  loading = false,
  isAdmin = false, // 🆕 THÊM PROP ĐỂ PHÂN BIỆT ADMIN/USER
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    reminderType: "personal",
    remindDate: "",
    remindTime: "",
    taskId: "",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Reset form khi dialog mở/đóng
  useEffect(() => {
    if (open) {
      const tomorrow = getTomorrowDate();
      const nextHour = getNextHourTime();

      setFormData({
        title: "",
        description: "",
        reminderType: "personal",
        remindDate: tomorrow,
        remindTime: nextHour,
        taskId: "",
      });
      setErrors({});
      setTouched({});

      console.log("📋 CreateReminderDialog - Mode:", {
        isAdmin,
        totalTasks: tasks.length,
        currentUserId: currentUser?.user_id,
      });
    }
  }, [open, currentUser, tasks, isAdmin]);

  // 🆕 SỬA: Filter tasks chỉ áp dụng cho user thường, admin có thể thấy tất cả tasks
  const availableTasks = isAdmin
    ? tasks // 🆕 ADMIN: Hiển thị tất cả tasks
    : tasks.filter((task) => {
        console.log("🔍 Checking task for user:", {
          id: task._id,
          title: task.title,
          status: task.status,
          assignees: task.assignees,
          assigneeIds: task.assigneeIds,
          assignee: task.assignee,
          currentUser: currentUser?.user_id,
        });

        // Kiểm tra task status
        const isActiveTask =
          task.status !== "done" && task.status !== "cancelled";

        // Kiểm tra assignment - sử dụng nhiều cách
        const isAssignedToCurrentUser =
          // Cách 1: Kiểm tra assignees array
          task.assignees?.some(
            (assignee) => assignee.keycloakId === currentUser?.user_id
          ) ||
          // Cách 2: Kiểm tra assigneeIds array
          task.assigneeIds?.includes(currentUser?.user_id) ||
          // Cách 3: Kiểm tra assignee string
          task.assignee === currentUser?.user_id ||
          // Cách 4: Fallback - nếu không có assignment info, coi như assigned
          (!task.assignees && !task.assigneeIds && !task.assignee);

        console.log("✅ Task assignment check:", {
          title: task.title,
          isActiveTask,
          isAssignedToCurrentUser,
          finalResult: isActiveTask && isAssignedToCurrentUser,
        });

        return isActiveTask && isAssignedToCurrentUser;
      });

  console.log("🎯 Available tasks for reminder:", {
    isAdmin,
    totalTasks: tasks.length,
    availableTasks: availableTasks.length,
    availableTasksList: availableTasks.map((t) => ({
      id: t._id,
      title: t.title,
      status: t.status,
    })),
  });

  const handleChange = (field) => (event) => {
    const value = event.target ? event.target.value : event;

    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }

    if (field === "remindDate" || field === "remindTime") {
      validateDateTime();
    }
  };

  // 🆕 SỬA: Xử lý khi chọn và clear task
  const handleTaskChange = (event, value) => {
    console.log("🎯 Task selected:", value);
    if (value) {
      setFormData((prev) => ({
        ...prev,
        taskId: value._id,
        title: `Nhắc nhở: ${value.title}`,
        description: value.description || `Nhắc nhở cho task: ${value.title}`,
        reminderType: "task_reminder",
      }));
    } else {
      // 🆕 SỬA: Reset về giá trị rỗng
      setFormData((prev) => ({
        ...prev,
        taskId: "", // ĐẢM BẢO LÀ CHUỖI RỖNG
        title: prev.title.startsWith("Nhắc nhở: ")
          ? prev.title.replace("Nhắc nhở: ", "")
          : prev.title,
        description: "",
        reminderType: "personal",
      }));
    }
  };

  // Validate real-time
  const validateDateTime = () => {
    if (formData.remindDate && formData.remindTime) {
      const remindDateTime = new Date(
        `${formData.remindDate}T${formData.remindTime}`
      );
      const now = new Date();

      if (remindDateTime <= now) {
        setErrors((prev) => ({
          ...prev,
          remindDate: "Thời gian nhắc nhở phải ở tương lai",
          remindTime: "Thời gian nhắc nhở phải ở tương lai",
        }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.remindDate;
          delete newErrors.remindTime;
          return newErrors;
        });
      }
    }
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

    // Kiểm tra date/time
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

  // 🆕 SỬA: Hàm submit đã fix
  const handleSubmit = () => {
    if (!validateForm()) return;

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

    // 🆕 SỬA: Chỉ gửi taskId nếu có giá trị
    const reminderData = {
      title: formData.title.trim(),
      description: formData.description ? formData.description.trim() : "",
      reminderType: formData.reminderType,
      remindAt: remindDateTime.toISOString(),
    };

    // 🆕 CHỈ THÊM taskId NẾU CÓ GIÁ TRỊ (không phải undefined hoặc chuỗi rỗng)
    if (formData.taskId && formData.taskId.trim() !== "") {
      reminderData.taskId = formData.taskId;
    }

    console.log("🎯 Sending reminder data:", reminderData);
    onCreateReminder(reminderData);
  };

  const handleClose = () => {
    onClose();
  };

  // Kiểm tra có thể submit không
  const canSubmit = () => {
    const hasRequiredFields =
      formData.title.trim() && formData.remindDate && formData.remindTime;

    if (!hasRequiredFields) return false;

    // Check date/time
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
    { value: "task_reminder", label: "Công việc", emoji: "✅" },
    { value: "due_date", label: "Hạn task", emoji: "⏳" },
    { value: "start_date", label: "Bắt đầu task", emoji: "🚀" },
    { value: "birthday", label: "Sinh nhật", emoji: "🎂" },
    { value: "appointment", label: "Lịch hẹn", emoji: "📅" },
  ];

  // Utility functions
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const getNextHourTime = () => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    return `${nextHour.getHours().toString().padStart(2, "0")}:${nextHour
      .getMinutes()
      .toString()
      .padStart(2, "0")}`;
  };

  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Schedule color="primary" />
          <Typography variant="h5" fontWeight="bold">
            🎯 Tạo Nhắc Nhở Mới {isAdmin && "(Admin)"}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3, mt: 1 }}>
          {/* Task Selection - CHỈ HIỆN KHI CÓ TASKS */}
          {tasks.length > 0 && (
            <Box>
              <Typography variant="subtitle1" gutterBottom fontWeight="medium">
                🔗 Liên kết với công việc (tùy chọn) -
                <Typography
                  component="span"
                  color="primary.main"
                  fontWeight="bold"
                >
                  {" "}
                  {isAdmin ? "Tất cả tasks" : "Tasks của bạn"}:{" "}
                  {availableTasks.length} tasks khả dụng
                </Typography>
              </Typography>

              {availableTasks.length > 0 ? (
                <>
                  <Autocomplete
                    options={availableTasks}
                    getOptionLabel={(option) =>
                      option.title || "Không có tiêu đề"
                    }
                    onChange={handleTaskChange}
                    value={
                      availableTasks.find(
                        (task) => task._id === formData.taskId
                      ) || null
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Chọn công việc cần nhắc nhở"
                        placeholder="Tìm kiếm công việc..."
                        fullWidth
                      />
                    )}
                    renderOption={(props, option) => (
                      <li {...props}>
                        <Box sx={{ width: "100%" }}>
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                              mb: 1,
                            }}
                          >
                            <Typography variant="body1" fontWeight="medium">
                              {option.title}
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 0.5,
                                flexWrap: "wrap",
                              }}
                            >
                              <Chip
                                label={
                                  option.status === "todo"
                                    ? "Cần làm"
                                    : option.status === "in_progress"
                                    ? "Đang làm"
                                    : option.status === "review"
                                    ? "Chờ duyệt"
                                    : option.status || "Không xác định"
                                }
                                size="small"
                                color={
                                  option.status === "in_progress"
                                    ? "warning"
                                    : option.status === "review"
                                    ? "info"
                                    : "default"
                                }
                                variant="outlined"
                              />
                              <Chip
                                label={
                                  option.priority === "high"
                                    ? "Cao"
                                    : option.priority === "medium"
                                    ? "Trung bình"
                                    : option.priority === "low"
                                    ? "Thấp"
                                    : "Không xác định"
                                }
                                size="small"
                                color={
                                  option.priority === "high"
                                    ? "error"
                                    : option.priority === "medium"
                                    ? "warning"
                                    : "success"
                                }
                              />
                            </Box>
                          </Box>
                          {option.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mb: 1 }}
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
                              sx={{ display: "block" }}
                            >
                              📅 Hạn:{" "}
                              {new Date(option.dueDate).toLocaleDateString(
                                "vi-VN"
                              )}
                            </Typography>
                          )}
                          {isAdmin && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              sx={{ display: "block", mt: 0.5 }}
                            >
                              👤 Assignment:{" "}
                              {option.assignees
                                ? `Assignees (${option.assignees.length})`
                                : option.assigneeIds
                                ? `Assignee IDs (${option.assigneeIds.length})`
                                : option.assignee
                                ? `Single assignee`
                                : "No assignment info"}
                            </Typography>
                          )}
                        </Box>
                      </li>
                    )}
                  />
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ mt: 0.5, display: "block" }}
                  >
                    💡 Chọn công việc để tự động điền thông tin nhắc nhở
                  </Typography>
                </>
              ) : (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {isAdmin ? (
                    <>
                      📝 Không có công việc nào đang hoạt động trong hệ thống.
                      <br />
                      <strong>
                        Tổng số tasks trong hệ thống: {tasks.length}
                      </strong>
                    </>
                  ) : (
                    <>
                      📝 Không có công việc nào đang thực hiện được giao cho
                      bạn.
                      <br />
                      <strong>
                        Tổng số tasks trong hệ thống: {tasks.length}
                      </strong>
                      <br />
                      Bạn vẫn có thể tạo nhắc nhở cá nhân.
                    </>
                  )}
                </Alert>
              )}
            </Box>
          )}

          {/* 🆕 THÔNG BÁO KHI KHÔNG CÓ TASKS */}
          {tasks.length === 0 && (
            <Alert severity="info">
              ℹ️ Hiện tại không có công việc nào trong hệ thống. Bạn vẫn có thể
              tạo nhắc nhở cá nhân.
            </Alert>
          )}

          <TextField
            label="Tiêu đề nhắc nhở *"
            value={formData.title}
            onChange={handleChange("title")}
            error={!!errors.title}
            helperText={errors.title}
            fullWidth
            required
            placeholder="Nhập tiêu đề nhắc nhở..."
          />

          {/* Description */}
          <TextField
            label="Mô tả nhắc nhở"
            value={formData.description}
            onChange={handleChange("description")}
            multiline
            rows={3}
            fullWidth
            placeholder="Nhập mô tả chi tiết cho nhắc nhở..."
          />

          {/* Type and DateTime Grid */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Loại nhắc nhở</InputLabel>
                <Select
                  value={formData.reminderType}
                  label="Loại nhắc nhở"
                  onChange={handleChange("reminderType")}
                >
                  {reminderTypes.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", gap: 1 }}
                      >
                        <span>{type.emoji}</span>
                        <span>{type.label}</span>
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Date and Time Selection */}
            <Grid item xs={6} sm={3}>
              <TextField
                label="Ngày *"
                type="date"
                value={formData.remindDate}
                onChange={handleChange("remindDate")}
                error={!!errors.remindDate}
                helperText={errors.remindDate}
                fullWidth
                InputLabelProps={{ shrink: true }}
                inputProps={{ min: getTodayDate() }}
                required
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <FormControl fullWidth error={!!errors.remindTime}>
                <InputLabel>Giờ *</InputLabel>
                <Select
                  value={formData.remindTime}
                  label="Giờ *"
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
              </FormControl>
            </Grid>
          </Grid>

          {/* Date/Time Validation */}
          {formData.remindDate && formData.remindTime && (
            <Alert
              severity={
                new Date(`${formData.remindDate}T${formData.remindTime}`) >
                new Date()
                  ? "success"
                  : "error"
              }
            >
              {new Date(`${formData.remindDate}T${formData.remindTime}`) >
              new Date()
                ? `✅ Nhắc nhở sẽ được kích hoạt vào: ${new Date(
                    `${formData.remindDate}T${formData.remindTime}`
                  ).toLocaleString("vi-VN")}`
                : `❌ Thời gian nhắc nhở phải ở tương lai!`}
            </Alert>
          )}

          {/* Preview */}
          <Box
            sx={{
              p: 2,
              bgcolor: "grey.50",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
              👁️ Xem trước nhắc nhở:
            </Typography>
            <Typography variant="body1" fontWeight="medium" sx={{ mb: 1 }}>
              {formData.title || "[Tiêu đề nhắc nhở]"}
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
                  reminderTypes.find((t) => t.value === formData.reminderType)
                    ?.label || "Cá nhân"
                }
                size="small"
                variant="outlined"
              />
              {formData.remindDate && formData.remindTime && (
                <Chip
                  icon={<Schedule />}
                  label={new Date(
                    `${formData.remindDate}T${formData.remindTime}`
                  ).toLocaleString("vi-VN")}
                  size="small"
                  variant="outlined"
                />
              )}
              {formData.taskId && (
                <Chip
                  label="📎 Có liên kết task"
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
              <Chip
                label={`👤 ${isAdmin ? "Cho chính admin" : "Cho chính bạn"}`}
                size="small"
                color="secondary"
                variant="outlined"
              />
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 1 }}>
        <Button onClick={handleClose} disabled={loading} variant="outlined">
          Hủy
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!canSubmit() || loading}
          startIcon={loading ? <CircularProgress size={16} /> : <Schedule />}
          sx={{ minWidth: 120 }}
        >
          {loading ? "Đang tạo..." : "Tạo Nhắc Nhở"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreateReminderDialog;
