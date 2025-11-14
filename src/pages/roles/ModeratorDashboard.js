import React from "react";
import { Container, Card, CardContent, Typography, Box } from "@mui/material";
import SecurityIcon from "@mui/icons-material/Security";

export default function ModeratorDashboard() {
  return (
    <Container maxWidth="md">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 8 }}>
        <SecurityIcon color="secondary" sx={{ fontSize: 50 }} />
        <Typography variant="h4" fontWeight="bold">
          Chào Moderator 🛡️
        </Typography>
      </Box>

      <Card sx={{ mt: 4, p: 2 }}>
        <CardContent>
          <Typography variant="body1">
            Đây là <strong>dashboard</strong> của bạn.
            Bạn có quyền giám sát, kiểm duyệt nội dung và hỗ trợ người dùng trong hệ thống.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
