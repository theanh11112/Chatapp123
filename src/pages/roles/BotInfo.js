import React from "react";
import { Container, Card, CardContent, Typography, Box } from "@mui/material";
import SmartToyIcon from "@mui/icons-material/SmartToy";

export default function BotInfo() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 8 }}>
        <SmartToyIcon color="success" sx={{ fontSize: 50 }} />
        <Typography variant="h4" fontWeight="bold">
          🤖 Thông tin nội bộ Bot
        </Typography>
      </Box>

      <Card sx={{ mt: 4, p: 2 }}>
        <CardContent>
          <Typography variant="body1">
            Đây là khu vực dành cho Bot AI. Bạn có thể kiểm tra log hoạt động,
            truy cập dữ liệu hoặc trạng thái tự động của hệ thống.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
