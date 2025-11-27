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
  });
  const [loading, setLoading] = useState(false);

  const handleCreateNotification = async () => {
    if (!newNotification.title || !newNotification.message) return;

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
      });
    } catch (error) {
      console.error("Error creating notification:", error);
    } finally {
      setLoading(false);
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
    });
    onClose();
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
              onChange={(e) =>
                setNewNotification({
                  ...newNotification,
                  title: e.target.value,
                })
              }
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
              onChange={(e) =>
                setNewNotification({
                  ...newNotification,
                  message: e.target.value,
                })
              }
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
              onChange={(e) =>
                setNewNotification({
                  ...newNotification,
                  type: e.target.value,
                })
              }
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
              onChange={(e) =>
                setNewNotification({
                  ...newNotification,
                  priority: e.target.value,
                })
              }
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
              onChange={(e) =>
                setNewNotification({
                  ...newNotification,
                  recipientType: e.target.value,
                })
              }
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
              onChange={(e) =>
                setNewNotification({
                  ...newNotification,
                  source: e.target.value,
                })
              }
              placeholder="VD: System Admin, Monitoring..."
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
          onClick={handleCreateNotification}
          disabled={
            !newNotification.title || !newNotification.message || loading
          }
        >
          {loading ? "Đang tạo..." : "Tạo Thông báo"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
