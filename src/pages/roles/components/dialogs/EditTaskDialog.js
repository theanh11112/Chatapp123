// src/pages/roles/components/dialogs/EditTaskDialog.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Autocomplete,
  Alert,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Save,
  Cancel,
  Edit,
  Task,
  Description,
  People,
  Warning,
  CalendarToday,
  AccessTime,
} from "@mui/icons-material";

// Utility functions (giống với ViewTaskDialog)
const getStatusColor = (status) => {
  const colors = {
    todo: "#ff6b6b",
    in_progress: "#4ecdc4",
    review: "#45b7d1",
    done: "#96ceb4",
  };
  return colors[status] || "#666";
};

const getPriorityColor = (priority) => {
  const colors = {
    low: "#66bb6a",
    medium: "#ffa726",
    high: "#ef5350",
  };
  return colors[priority] || "#666";
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

const getDisplayName = (user) => {
  if (!user) return "Unknown User";
  if (user.fullName && user.fullName.trim() !== "") {
    return user.fullName;
  }
  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }
  return user.username || "Unknown User";
};

export default function EditTaskDialog({
  open,
  onClose,
  task,
  currentUser,
  users = [],
  onUpdateTask,
}) {
  const [editedTask, setEditedTask] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);

  // Khởi tạo dữ liệu khi task thay đổi
  useEffect(() => {
    if (task) {
      setEditedTask({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().slice(0, 16)
          : "",
        estimatedHours: task.estimatedHours || 0,
        assigneeIds: task.assigneeIds || task.assigneeId || [],
        tags: task.tags || [],
      });
      setHasChanges(false);
      setErrors({});
    }
  }, [task]);

  // Kiểm tra thay đổi
  useEffect(() => {
    if (task && editedTask) {
      const originalTask = {
        title: task.title || "",
        description: task.description || "",
        status: task.status || "todo",
        priority: task.priority || "medium",
        dueDate: task.dueDate
          ? new Date(task.dueDate).toISOString().slice(0, 16)
          : "",
        estimatedHours: task.estimatedHours || 0,
        assigneeIds: task.assigneeIds || task.assigneeId || [],
        tags: task.tags || [],
      };

      const changed =
        JSON.stringify(originalTask) !== JSON.stringify(editedTask);
      setHasChanges(changed);
    }
  }, [editedTask, task]);

  const handleChange = (field) => (event) => {
    const value = event.target ? event.target.value : event;
    setEditedTask((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error khi user sửa
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const handleTagsChange = (event, value) => {
    setEditedTask((prev) => ({
      ...prev,
      tags: value,
    }));
  };

  const handleAssigneesChange = (event, value) => {
    setEditedTask((prev) => ({
      ...prev,
      assigneeIds: value.map((user) => user.keycloakId),
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!editedTask.title?.trim()) {
      newErrors.title = "Tiêu đề không được để trống";
    }

    if (
      !Array.isArray(editedTask.assigneeIds) ||
      editedTask.assigneeIds.length === 0
    ) {
      newErrors.assigneeIds = "Chọn ít nhất 1 người nhận task";
    }

    if (editedTask.dueDate) {
      const dueDateTime = new Date(editedTask.dueDate);
      const now = new Date();
      if (dueDateTime <= now) {
        newErrors.dueDate = "Hạn hoàn thành phải ở tương lai";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      await onUpdateTask(task._id, editedTask);
      onClose();
    } catch (error) {
      console.error("Error updating task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      if (
        window.confirm(
          "Bạn có chắc muốn đóng? Các thay đổi chưa lưu sẽ bị mất."
        )
      ) {
        onClose();
      }
    } else {
      onClose();
    }
  };

  // Lấy danh sách assignees đã chọn
  const selectedAssignees = users.filter((user) =>
    editedTask?.assigneeIds?.includes(user.keycloakId)
  );

  if (!editedTask) {
    return (
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogContent>
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Edit color="primary" />
          <Typography variant="h6">✏️ Chỉnh sửa Task</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {/* Thông báo có thay đổi */}
          {hasChanges && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Bạn có thay đổi chưa lưu
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Tiêu đề */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Tiêu đề task"
                value={editedTask.title}
                onChange={handleChange("title")}
                error={!!errors.title}
                helperText={errors.title}
                required
              />
            </Grid>

            {/* Mô tả */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Mô tả"
                value={editedTask.description}
                onChange={handleChange("description")}
                placeholder="Mô tả chi tiết task..."
              />
            </Grid>

            {/* Trạng thái & Độ ưu tiên */}
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={editedTask.status}
                  label="Trạng thái"
                  onChange={handleChange("status")}
                >
                  <MenuItem value="todo">Cần làm</MenuItem>
                  <MenuItem value="in_progress">Đang làm</MenuItem>
                  <MenuItem value="review">Chờ duyệt</MenuItem>
                  <MenuItem value="done">Hoàn thành</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel>Độ ưu tiên</InputLabel>
                <Select
                  value={editedTask.priority}
                  label="Độ ưu tiên"
                  onChange={handleChange("priority")}
                >
                  <MenuItem value="low">Thấp</MenuItem>
                  <MenuItem value="medium">Trung bình</MenuItem>
                  <MenuItem value="high">Cao</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Người nhận */}
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
                    helperText={
                      errors.assigneeIds || "Chọn ít nhất 1 người nhận"
                    }
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

            {/* Hạn hoàn thành & Giờ ước tính */}
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Hạn hoàn thành"
                value={editedTask.dueDate}
                onChange={handleChange("dueDate")}
                error={!!errors.dueDate}
                helperText={errors.dueDate}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  min: new Date().toISOString().slice(0, 16),
                }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="number"
                label="Giờ ước tính"
                value={editedTask.estimatedHours}
                onChange={handleChange("estimatedHours")}
                InputProps={{
                  inputProps: { min: 0, max: 1000 },
                }}
                helperText="Số giờ dự kiến hoàn thành"
              />
            </Grid>

            {/* Tags */}
            <Grid item xs={12}>
              <Autocomplete
                multiple
                freeSolo
                options={[]}
                value={editedTask.tags}
                onChange={handleTagsChange}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags"
                    placeholder="Thêm tags (nhấn Enter sau mỗi tag)"
                  />
                )}
                renderTags={(value, getTagProps) =>
                  value.map((option, index) => (
                    <Chip
                      label={option}
                      {...getTagProps({ index })}
                      size="small"
                      variant="outlined"
                      color="primary"
                    />
                  ))
                }
              />
            </Grid>

            {/* Preview */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" gutterBottom>
                👁️ Xem trước:
              </Typography>
              <Box
                sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    mb: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {editedTask.title || "[Tiêu đề task]"}
                  </Typography>
                  <Chip
                    label={getPriorityText(editedTask.priority)}
                    size="small"
                    sx={{
                      bgcolor: getPriorityColor(editedTask.priority),
                      color: "white",
                    }}
                  />
                  <Chip
                    label={getStatusText(editedTask.status)}
                    size="small"
                    sx={{
                      bgcolor: getStatusColor(editedTask.status),
                      color: "white",
                    }}
                  />
                </Box>

                {editedTask.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mb: 1 }}
                  >
                    {editedTask.description}
                  </Typography>
                )}

                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {selectedAssignees.length > 0 && (
                    <Chip
                      icon={<People />}
                      label={`${selectedAssignees.length} người nhận`}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                  {editedTask.estimatedHours > 0 && (
                    <Chip
                      label={`${editedTask.estimatedHours}h`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                  {editedTask.dueDate && (
                    <Chip
                      label={`Hạn: ${new Date(
                        editedTask.dueDate
                      ).toLocaleDateString("vi-VN")}`}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} startIcon={<Cancel />} disabled={loading}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          startIcon={loading ? <CircularProgress size={16} /> : <Save />}
          disabled={!hasChanges || loading}
        >
          {loading ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
