// src/pages/dashboard/Settings/components/dialogs/NotificationsDialog.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  FormControlLabel,
  Switch,
  Box,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Bell, Chat, SpeakerHigh, DeviceMobile, Desktop } from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeDialog,
  updateNotifications,
} from "../../../../../redux/slices/settingsSlice";
import { showSnackbar } from "../../../../../redux/slices/app";
import { settingServices } from "../../../../../services/settingServices";

const NotificationsDialog = () => {
  const dispatch = useDispatch();
  const { dialogs, notifications } = useSelector((state) => state.settings);
  const { userInfo } = useSelector((state) => state.auth); // Lấy userInfo từ auth
  const [localSettings, setLocalSettings] = useState(notifications);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync local state với Redux state khi dialog mở
  useEffect(() => {
    if (dialogs?.notifications) {
      setLocalSettings(notifications);
      setHasChanges(false);
    }
  }, [dialogs?.notifications, notifications]);

  const handleClose = () => {
    dispatch(closeDialog({ type: "notifications" }));
  };

  const handleToggle = (key) => {
    const newSettings = {
      ...localSettings,
      [key]: !localSettings[key],
    };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Gọi API để lưu cài đặt lên server
      const result = await settingServices.updateNotificationSettings(
        userInfo.user_id, // Sử dụng userInfo.keycloakId
        localSettings
      );

      // Cập nhật Redux state
      dispatch(updateNotifications(result.data));

      // Hiển thị thông báo thành công
      dispatch(
        showSnackbar({
          severity: "success",
          message: "Cài đặt thông báo đã được lưu thành công!",
        })
      );

      setHasChanges(false);
      handleClose();
    } catch (error) {
      console.error("Error saving notification settings:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message:
            error.response?.data?.message || "Lỗi khi lưu cài đặt thông báo!",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(notifications); // Reset về giá trị ban đầu
    setHasChanges(false);
  };

  const notificationOptions = [
    {
      key: "message",
      icon: <Chat size={20} />,
      label: "Thông báo tin nhắn mới",
      description: "Nhận thông báo khi có tin nhắn mới",
    },
    {
      key: "preview",
      icon: <Chat size={20} />,
      label: "Hiển thị nội dung xem trước",
      description: "Hiển thị nội dung tin nhắn trong thông báo",
    },
    {
      key: "sound",
      icon: <SpeakerHigh size={20} />,
      label: "Âm thanh thông báo",
      description: "Phát âm thanh khi có thông báo mới",
    },
    {
      key: "desktop",
      icon: <Desktop size={20} />,
      label: "Thông báo desktop",
      description: "Hiển thị thông báo trên desktop",
    },
    {
      key: "mobile",
      icon: <DeviceMobile size={20} />,
      label: "Thông báo trên điện thoại",
      description: "Nhận thông báo push trên thiết bị di động",
    },
  ];

  const messageNotifications = notificationOptions.filter(
    (item) => item.key === "message" || item.key === "preview"
  );
  const soundNotifications = notificationOptions.filter(
    (item) => item.key === "sound"
  );
  const deviceNotifications = notificationOptions.filter(
    (item) => item.key === "desktop" || item.key === "mobile"
  );

  return (
    <Dialog
      open={dialogs?.notifications || false}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Bell size={24} weight="duotone" />
          <Typography variant="h6" fontWeight={600}>
            Cài đặt thông báo
          </Typography>
        </Stack>
        {hasChanges && (
          <Alert severity="info" sx={{ mt: 1, fontSize: "0.8rem" }}>
            Bạn có thay đổi chưa lưu
          </Alert>
        )}
      </DialogTitle>

      <DialogContent>
        <Stack spacing={4} sx={{ mt: 1 }}>
          {/* Message Notifications */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ mb: 3 }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: "primary.main",
                  color: "white",
                }}
              >
                <Chat size={20} weight="fill" />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Thông báo tin nhắn
              </Typography>
            </Stack>

            <Stack spacing={2.5}>
              {messageNotifications.map((option) => (
                <Box
                  key={option.key}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.paper",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ color: "primary.main" }}>{option.icon}</Box>
                      <Stack>
                        <Typography variant="body1" fontWeight={500}>
                          {option.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Stack>
                    </Stack>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings[option.key] || false}
                          onChange={() => handleToggle(option.key)}
                          color="primary"
                          disabled={isLoading}
                        />
                      }
                      label=""
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* Sound Settings */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ mb: 3 }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: "secondary.main",
                  color: "white",
                }}
              >
                <SpeakerHigh size={20} weight="fill" />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Cài đặt âm thanh
              </Typography>
            </Stack>

            <Stack spacing={2.5}>
              {soundNotifications.map((option) => (
                <Box
                  key={option.key}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.paper",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ color: "secondary.main" }}>{option.icon}</Box>
                      <Stack>
                        <Typography variant="body1" fontWeight={500}>
                          {option.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Stack>
                    </Stack>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings[option.key] || false}
                          onChange={() => handleToggle(option.key)}
                          color="secondary"
                          disabled={isLoading}
                        />
                      }
                      label=""
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>

          <Divider />

          {/* Device Settings */}
          <Box>
            <Stack
              direction="row"
              alignItems="center"
              spacing={2}
              sx={{ mb: 3 }}
            >
              <Box
                sx={{
                  p: 1,
                  borderRadius: 1,
                  backgroundColor: "info.main",
                  color: "white",
                }}
              >
                <DeviceMobile size={20} weight="fill" />
              </Box>
              <Typography variant="h6" fontWeight={600}>
                Thiết bị nhận thông báo
              </Typography>
            </Stack>

            <Stack spacing={2.5}>
              {deviceNotifications.map((option) => (
                <Box
                  key={option.key}
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: "background.paper",
                  }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <Box sx={{ color: "info.main" }}>{option.icon}</Box>
                      <Stack>
                        <Typography variant="body1" fontWeight={500}>
                          {option.label}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {option.description}
                        </Typography>
                      </Stack>
                    </Stack>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={localSettings[option.key] || false}
                          onChange={() => handleToggle(option.key)}
                          color="info"
                          disabled={isLoading}
                        />
                      }
                      label=""
                    />
                  </Stack>
                </Box>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleReset} disabled={!hasChanges || isLoading}>
          Đặt lại
        </Button>
        <Box sx={{ flex: 1 }} />
        <Button onClick={handleClose} variant="outlined" disabled={isLoading}>
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!hasChanges || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
        >
          {isLoading ? "Đang lưu..." : "Lưu cài đặt"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default NotificationsDialog;
