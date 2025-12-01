// src/pages/roles/components/dialogs/CreateTaskDialog.js - ĐÃ HOÀN THIỆN
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
  Chip,
  Autocomplete,
} from "@mui/material";
import { Add, People } from "@mui/icons-material";

// 🆕 Utility function để lấy display name
const getDisplayName = (user) => {
  if (!user) return "Unknown User";

  // Ưu tiên fullName, sau đó đến firstName + lastName, cuối cùng là username
  if (user.fullName && user.fullName.trim() !== "") {
    return user.fullName;
  }

  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  return user.username || "Unknown User";
};

export default function CreateTaskDialog({
  open,
  onClose,
  currentUser,
  onCreateTask,
  users = [], // 🆕 Nhận danh sách users từ props
}) {
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigneeIds: [], // 🆕 THAY ĐỔI: thành mảng
    priority: "medium",
    dueDate: "",
    estimatedHours: 0,
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // 🆕 Hàm validate form
  const validateForm = () => {
    const newErrors = {};

    if (!newTask.title.trim()) {
      newErrors.title = "Tiêu đề không được để trống";
    }

    // 🆕 VALIDATION MỚI: assigneeIds phải là mảng và có ít nhất 1 phần tử
    if (
      !Array.isArray(newTask.assigneeIds) ||
      newTask.assigneeIds.length === 0
    ) {
      newErrors.assigneeIds = "Chọn ít nhất 1 người nhận task";
    }

    // Validate due date nếu có
    if (newTask.dueDate) {
      const dueDateTime = new Date(newTask.dueDate);
      const now = new Date();

      if (dueDateTime <= now) {
        newErrors.dueDate = "Hạn hoàn thành phải ở tương lai";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 🆕 Hàm kiểm tra có thể submit không
  const canSubmit = () => {
    const hasRequiredFields =
      newTask.title.trim() &&
      Array.isArray(newTask.assigneeIds) &&
      newTask.assigneeIds.length > 0;

    if (!hasRequiredFields) return false;

    // Check if due date is valid (if provided)
    if (newTask.dueDate) {
      const dueDateTime = new Date(newTask.dueDate);
      const now = new Date();
      return dueDateTime > now;
    }

    return true;
  };

  const handleCreateTask = async () => {
    if (!validateForm()) return;

    // Double-check due date validation
    if (newTask.dueDate) {
      const dueDateTime = new Date(newTask.dueDate);
      const now = new Date();

      if (dueDateTime <= now) {
        setErrors({
          dueDate: "Hạn hoàn thành phải ở tương lai",
        });
        return;
      }
    }

    setLoading(true);
    try {
      await onCreateTask(newTask);
      // Reset form
      setNewTask({
        title: "",
        description: "",
        assigneeIds: [],
        priority: "medium",
        dueDate: "",
        estimatedHours: 0,
      });
      setErrors({});
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target ? event.target.value : event;
    setNewTask((prev) => ({
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

    // Validate due date immediately when changed
    if (field === "dueDate") {
      validateDueDate();
    }
  };

  // 🆕 Hàm xử lý chọn assignees
  const handleAssigneesChange = (event, value) => {
    setNewTask((prev) => ({
      ...prev,
      assigneeIds: value.map((user) => user.keycloakId),
    }));

    if (errors.assigneeIds) {
      setErrors((prev) => ({
        ...prev,
        assigneeIds: "",
      }));
    }
  };

  // Hàm validate due date
  const validateDueDate = () => {
    if (newTask.dueDate) {
      const dueDateTime = new Date(newTask.dueDate);
      const now = new Date();

      if (dueDateTime <= now) {
        setErrors((prev) => ({
          ...prev,
          dueDate: "Hạn hoàn thành phải ở tương lai",
        }));
      } else {
        setErrors((prev) => ({
          ...prev,
          dueDate: "",
        }));
      }
    }
  };

  const handleClose = () => {
    setNewTask({
      title: "",
      description: "",
      assigneeIds: [],
      priority: "medium",
      dueDate: "",
      estimatedHours: 0,
    });
    setErrors({});
    onClose();
  };

  // Lấy thời gian mặc định (1 giờ sau)
  const getDefaultDueDate = () => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    return nextHour.toISOString().slice(0, 16);
  };

  // 🆕 Lấy danh sách assignees đã chọn
  const selectedAssignees = users.filter((user) =>
    newTask.assigneeIds.includes(user.keycloakId)
  );

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Add color="primary" />
          <Typography variant="h6">🎯 Tạo Task Mới</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Tiêu đề task"
              value={newTask.title}
              onChange={handleChange("title")}
              error={!!errors.title}
              helperText={errors.title}
              placeholder="Nhập tiêu đề task..."
              required
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Mô tả"
              value={newTask.description}
              onChange={handleChange("description")}
              placeholder="Mô tả chi tiết task..."
            />
          </Grid>

          {/* 🆕 Assignees Selection - Multiple */}
          <Grid item xs={12}>
            <Typography variant="subtitle2" gutterBottom>
              👥 Người nhận task
            </Typography>
            <Autocomplete
              multiple
              options={users}
              getOptionLabel={(option) => getDisplayName(option)}
              value={selectedAssignees}
              onChange={handleAssigneesChange}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Chọn người nhận task"
                  placeholder="Tìm kiếm người nhận..."
                  error={!!errors.assigneeIds}
                  helperText={errors.assigneeIds || "Chọn ít nhất 1 người nhận"}
                />
              )}
              renderTags={(value, getTagProps) =>
                value.map((option, index) => (
                  <Chip
                    label={getDisplayName(option)}
                    {...getTagProps({ index })}
                    size="small"
                  />
                ))
              }
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Độ ưu tiên"
              value={newTask.priority}
              onChange={handleChange("priority")}
            >
              <MenuItem value="low">Thấp</MenuItem>
              <MenuItem value="medium">Trung bình</MenuItem>
              <MenuItem value="high">Cao</MenuItem>
            </TextField>
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              type="number"
              label="Giờ ước tính"
              value={newTask.estimatedHours}
              onChange={handleChange("estimatedHours")}
              InputProps={{
                inputProps: { min: 0, max: 1000 },
              }}
              helperText="Số giờ dự kiến hoàn thành"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              type="datetime-local"
              label="Hạn hoàn thành"
              value={newTask.dueDate || getDefaultDueDate()}
              onChange={handleChange("dueDate")}
              error={!!errors.dueDate}
              helperText={errors.dueDate || "Để trống nếu không có hạn cụ thể"}
              InputLabelProps={{ shrink: true }}
              inputProps={{
                min: new Date().toISOString().slice(0, 16),
              }}
            />
          </Grid>

          {/* Due Date Validation Alert */}
          {newTask.dueDate &&
            (() => {
              const dueDateTime = new Date(newTask.dueDate);
              const now = new Date();
              const isValid = dueDateTime > now;

              return (
                <Grid item xs={12}>
                  <Alert severity={isValid ? "success" : "error"}>
                    {isValid
                      ? `✅ Task cần hoàn thành trước: ${dueDateTime.toLocaleString(
                          "vi-VN"
                        )}`
                      : `❌ Hạn hoàn thành phải ở tương lai! Đã chọn: ${dueDateTime.toLocaleString(
                          "vi-VN"
                        )}`}
                  </Alert>
                </Grid>
              );
            })()}

          {/* 🆕 Task Preview */}
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}>
              <Typography
                variant="subtitle2"
                color="text.secondary"
                gutterBottom
              >
                👁️ Xem trước task:
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>{newTask.title || "[Tiêu đề task]"}</strong>
              </Typography>
              {newTask.description && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {newTask.description}
                </Typography>
              )}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  label={`Ưu tiên: ${newTask.priority}`}
                  size="small"
                  color={
                    newTask.priority === "high"
                      ? "error"
                      : newTask.priority === "medium"
                      ? "warning"
                      : "success"
                  }
                />
                {newTask.assigneeIds.length > 0 && (
                  <Chip
                    icon={<People />}
                    label={`${
                      newTask.assigneeIds.length
                    } người nhận: ${selectedAssignees
                      .map((user) => getDisplayName(user))
                      .join(", ")}`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                )}
                {newTask.estimatedHours > 0 && (
                  <Chip
                    label={`${newTask.estimatedHours}h`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Box>
            </Box>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleCreateTask}
          disabled={!canSubmit() || loading}
        >
          {loading
            ? "Đang tạo..."
            : `Tạo Task (${newTask.assigneeIds.length} người)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
