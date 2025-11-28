// src/pages/dashboard/Settings/components/dialogs/HelpDialog.js
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  Link,
} from "@mui/material";
import { Info, Question, Envelope, Book } from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { closeDialog } from "../../../../../redux/slices/settingsSlice";

const HelpDialog = () => {
  const dispatch = useDispatch();
  const { dialogs } = useSelector((state) => state.settings);

  const handleClose = () => {
    dispatch(closeDialog({ type: "help" }));
  };

  return (
    <Dialog
      open={dialogs?.help || false}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Info size={24} />
          <Typography variant="h6">Trợ giúp & Hỗ trợ</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* FAQ */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Question size={20} />
              <Typography variant="body1" fontWeight={500}>
                Câu hỏi thường gặp
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              • Làm thế nào để tạo nhóm chat?
              <br />
              • Cách thay đổi ảnh đại diện?
              <br />
              • Quên mật khẩu phải làm sao?
              <br />
            </Typography>
          </Box>

          {/* Documentation */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Book size={20} />
              <Typography variant="body1" fontWeight={500}>
                Tài liệu hướng dẫn
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Truy cập tài liệu hướng dẫn sử dụng đầy đủ tại:
              <br />
              <Link href="#" underline="hover">
                https://help.company-chat.com
              </Link>
            </Typography>
          </Box>

          {/* Contact Support */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ mb: 2 }}
            >
              <Envelope size={20} />
              <Typography variant="body1" fontWeight={500}>
                Liên hệ hỗ trợ
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Email: support@company.com
              <br />
              Điện thoại: (024) 1234 5678
              <br />
              Giờ làm việc: 8:00 - 17:00 (Thứ 2 - Thứ 6)
            </Typography>
          </Box>

          {/* App Info */}
          <Box sx={{ p: 2, bgcolor: "background.neutral", borderRadius: 1 }}>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Thông tin ứng dụng
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Phiên bản: 1.0.0
              <br />
              Bản quyền: © 2024 Company Chat App
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
};

export default HelpDialog;
