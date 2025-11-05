import React from "react";
import { Container, Card, CardContent, Typography, Box } from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";

export default function UserDashboard() {
  return (
    <Container maxWidth="md">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 8 }}>
        <AccountCircleIcon color="primary" sx={{ fontSize: 50 }} />
        <Typography variant="h4" fontWeight="bold">
          👋 Xin chào User
        </Typography>
      </Box>

      <Card sx={{ mt: 4, p: 2 }}>
        <CardContent>
          <Typography variant="body1">
            Đây là <strong>trang dashboard người dùng</strong>.
            Tại đây, bạn có thể xem tin nhắn, tham gia nhóm, và quản lý hồ sơ cá nhân.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
