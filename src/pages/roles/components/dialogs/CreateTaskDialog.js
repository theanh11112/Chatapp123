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

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.assigneeId) return;

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
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setLoading(false);
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
    onClose();
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
              onChange={(e) =>
                setNewTask({ ...newTask, title: e.target.value })
              }
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
              onChange={(e) =>
                setNewTask({ ...newTask, description: e.target.value })
              }
              placeholder="Mô tả chi tiết task..."
            />
          </Grid>

          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              select
              label="Người nhận"
              value={newTask.assigneeId}
              onChange={(e) =>
                setNewTask({ ...newTask, assigneeId: e.target.value })
              }
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
              onChange={(e) =>
                setNewTask({ ...newTask, priority: e.target.value })
              }
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
              value={newTask.dueDate}
              onChange={(e) =>
                setNewTask({ ...newTask, dueDate: e.target.value })
              }
              InputLabelProps={{ shrink: true }}
            />
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
          disabled={!newTask.title || !newTask.assigneeId || loading}
        >
          {loading ? "Đang tạo..." : "Tạo Task"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
