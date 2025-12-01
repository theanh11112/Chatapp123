// src/pages/roles/components/dialogs/DeleteTaskDialog.js - ĐÃ CẬP NHẬT
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
} from "@mui/material";
import { Warning, Delete, People } from "@mui/icons-material";

export default function DeleteTaskDialog({ open, onClose, task, onConfirm }) {
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } catch (error) {
      console.error("Error deleting task:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  // 🆕 Lấy số lượng assignees
  const getAssigneeCount = () => {
    if (!task) return 0;
    return (
      task.assigneeIds?.length ||
      task.assigneesInfo?.length ||
      (task.assigneeId ? 1 : 0)
    );
  };

  const assigneeCount = getAssigneeCount();

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Warning color="error" />
          <Typography variant="h6">🗑️ Xác nhận xóa Task</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1" gutterBottom>
          Bạn có chắc chắn muốn xóa task "<strong>{task?.title}</strong>" không?
        </Typography>

        {/* 🆕 Thông tin về assignees */}
        {assigneeCount > 0 && (
          <Alert severity="info" sx={{ mt: 1, mb: 2 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <People />
              <Typography variant="body2">
                Task này đang được giao cho{" "}
                <strong>{assigneeCount} người</strong>. Tất cả họ sẽ nhận được
                thông báo về việc task bị xóa.
              </Typography>
            </Box>
          </Alert>
        )}

        <Typography variant="body2" color="text.secondary">
          ⚠️ Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến task
          sẽ bị xóa vĩnh viễn, bao gồm:
        </Typography>

        <Box sx={{ mt: 1, ml: 2 }}>
          <Typography variant="body2" color="text.secondary">
            • Thông tin task
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Lịch sử hoạt động
          </Typography>
          <Typography variant="body2" color="text.secondary">
            • Các reminder liên quan
          </Typography>
          {assigneeCount > 0 && (
            <Typography variant="body2" color="text.secondary">
              • Thông báo cho {assigneeCount} người được giao
            </Typography>
          )}
        </Box>

        {/* 🆕 Hiển thị thông tin task summary */}
        {task && (
          <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Thông tin task sẽ bị xóa:
            </Typography>
            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
              <Chip
                label={`Trạng thái: ${task.status}`}
                size="small"
                variant="outlined"
              />
              <Chip
                label={`Ưu tiên: ${task.priority}`}
                size="small"
                variant="outlined"
              />
              {task.dueDate && (
                <Chip
                  label={`Hạn: ${new Date(task.dueDate).toLocaleDateString(
                    "vi-VN"
                  )}`}
                  size="small"
                  variant="outlined"
                />
              )}
              {assigneeCount > 0 && (
                <Chip
                  icon={<People />}
                  label={`${assigneeCount} người`}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
              )}
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          Hủy
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleDelete}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : <Delete />}
        >
          {loading
            ? "Đang xóa..."
            : `Xóa Task${assigneeCount > 0 ? ` (${assigneeCount} người)` : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
