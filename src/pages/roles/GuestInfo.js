import React from "react";
import { Container, Card, CardContent, Typography, Box } from "@mui/material";
import PersonOutlineIcon from "@mui/icons-material/PersonOutline";

export default function GuestInfo() {
  return (
    <Container maxWidth="sm">
      <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 8 }}>
        <PersonOutlineIcon color="info" sx={{ fontSize: 50 }} />
        <Typography variant="h4" fontWeight="bold">
          👋 Xin chào Guest
        </Typography>
      </Box>

      <Card sx={{ mt: 4, p: 2 }}>
        <CardContent>
          <Typography variant="body1">
            Đây là trang thông tin cơ bản dành cho khách truy cập.
            Bạn có thể xem các nội dung giới thiệu và thông tin công khai của hệ thống.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
}
