// src/pages/roles/components/dialogs/CreateTaskDialog.js
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
import { Add } from "@mui/icons-material";

// 🆕 Users list từ database
const users = [
  { keycloakId: "e0d7a6e9-98d6-4481-bdd1-dd68283b65c4", name: "An Nguyen" },
  { keycloakId: "f5dcb70a-4b2e-4f9c-a17f-3015cb6aed42", name: "Hoang Ngan" },
  { keycloakId: "ba025aa5-6cfb-463c-b245-e94472081d45", name: "Hao Nguyen" },
  { keycloakId: "0da81ddf-8ba1-4dca-86df-e219df84c699", name: "Thu Nguyen" },
  { keycloakId: "9a3c43e8-9edd-4efe-977d-bf03168a6c30", name: "Dan Nguyen" },
  { keycloakId: "faf4e025-74c8-4043-80d9-5bac987b9c01", name: "Theanh Luu" },
];

export default function CreateTaskDialog({
  open,
  onClose,
  currentUser,
  onCreateTask,
}) {
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    assigneeId: "",
    priority: "medium",
    dueDate: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // 🆕 Hàm validate form
  const validateForm = () => {
    const newErrors = {};

    if (!newTask.title.trim()) {
      newErrors.title = "Tiêu đề không được để trống";
    }

    if (!newTask.assigneeId) {
      newErrors.assigneeId = "Người nhận không được để trống";
    }

    // 🆕 Validate due date nếu có
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
    const hasRequiredFields = newTask.title.trim() && newTask.assigneeId;

    if (!hasRequiredFields) return false;

    // Check if due date is valid (if provided)
    if (newTask.dueDate) {
      const dueDateTime = new Date(newTask.dueDate);
      const now = new Date();
      return dueDateTime > now;
    }

    return true; // Cho phép tạo task không có due date
  };

  const handleCreateTask = async () => {
    if (!validateForm()) return;

    // 🆕 Double-check due date validation
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
        assigneeId: "",
        priority: "medium",
        dueDate: "",
      });
      setErrors({});
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    const value = event.target.value;
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

    // 🆕 Validate due date immediately when changed
    if (field === "dueDate") {
      validateDueDate();
    }
  };

  // 🆕 Hàm validate due date
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
      assigneeId: "",
      priority: "medium",
      dueDate: "",
    });
    setErrors({});
    onClose();
  };

  // 🆕 Lấy thời gian mặc định (1 giờ sau)
  const getDefaultDueDate = () => {
    const nextHour = new Date();
    nextHour.setHours(nextHour.getHours() + 1);
    nextHour.setMinutes(0);
    return nextHour.toISOString().slice(0, 16); // Format: YYYY-MM-DDTHH:mm
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Add color="primary" />
          <Typography variant="h6">Tạo Task Mới</Typography>
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

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Người nhận"
              value={newTask.assigneeId}
              onChange={handleChange("assigneeId")}
              error={!!errors.assigneeId}
              helperText={errors.assigneeId}
              required
            >
              {users.map((user) => (
                <MenuItem key={user.keycloakId} value={user.keycloakId}>
                  {user.name}
                </MenuItem>
              ))}
            </TextField>
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
                min: new Date().toISOString().slice(0, 16), // Không cho chọn thời gian trong quá khứ
              }}
            />
          </Grid>

          {/* 🆕 Due Date Validation Alert */}
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
          {loading ? "Đang tạo..." : "Tạo Task"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
