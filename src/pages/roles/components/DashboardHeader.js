// src/pages/roles/components/DashboardHeader.js
import React from "react";
import { Box, Typography, Button } from "@mui/material";
import {
  AdminPanelSettings,
  Notifications,
  Add,
  AccessTime,
} from "@mui/icons-material";

export default function DashboardHeader({
  onCreateTask,
  onCreateNotification,
  onCreateReminder,
  currentUser,
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        mb: 4,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <AdminPanelSettings color="primary" sx={{ fontSize: 48 }} />
        <Box>
          <Typography variant="h4" fontWeight="bold" color="primary">
            Admin Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary">
            Quản lý hệ thống & Phân tích hiệu suất
          </Typography>
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 2 }}>
        <Button
          variant="outlined"
          startIcon={<AccessTime />}
          onClick={onCreateReminder}
          disabled={!currentUser}
        >
          Tạo Reminder
        </Button>
        <Button
          variant="outlined"
          startIcon={<Notifications />}
          onClick={onCreateNotification}
        >
          Tạo Thông báo
        </Button>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={onCreateTask}
          disabled={!currentUser}
        >
          Tạo Task Mới
        </Button>
      </Box>
    </Box>
  );
}
