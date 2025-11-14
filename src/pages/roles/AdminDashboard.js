import React from "react";
import { Container, Card, CardContent, Typography, Box } from "@mui/material";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";

export default function AdminDashboard() {
  return (
    <Container maxWidth="md">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 8 }}>
        <AdminPanelSettingsIcon color="primary" sx={{ fontSize: 50 }} />
        <Typography variant="h4" fontWeight="bold">
          Chào Admin 👑
        </Typography>
      </Box>

      <Card sx={{ mt: 4, p: 2 }}>
        <CardContent>
          <Typography variant="body1">
            Đây là <strong>trang quản lý tổng quan</strong> của bạn.
            Tại đây, bạn có thể theo dõi, cấu hình hệ thống và quản lý người dùng
            trong ứng dụng Chat nội bộ.
          </Typography>
        </CardContent>
      </Card>
    </Container>
    
  );
}
