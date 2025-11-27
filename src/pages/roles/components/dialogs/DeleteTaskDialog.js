// src/pages/roles/components/dialogs/DeleteTaskDialog.js
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
} from "@mui/material";
import { Warning, Delete } from "@mui/icons-material";

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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Warning color="error" />
          <Typography variant="h6">Xác nhận xóa Task</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Typography variant="body1">
          Bạn có chắc chắn muốn xóa task "<strong>{task?.title}</strong>" không?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến task sẽ
          bị xóa vĩnh viễn.
        </Typography>
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
          {loading ? "Đang xóa..." : "Xóa Task"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
