// src/pages/dashboard/Settings/components/dialogs/PrivacyDialog.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Divider,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Shield, Eye, User, Clock } from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeDialog,
  updatePrivacy,
} from "../../../../../redux/slices/settingsSlice";
import { showSnackbar } from "../../../../../redux/slices/app";
import { settingServices } from "../../../../../services/settingServices";

const PrivacyDialog = () => {
  const dispatch = useDispatch();
  const { dialogs, privacy } = useSelector((state) => state.settings);
  const { userInfo } = useSelector((state) => state.auth); // Lấy userInfo từ auth
  const [localSettings, setLocalSettings] = useState(privacy);
  const [hasChanges, setHasChanges] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Sync local state với Redux state khi dialog mở
  useEffect(() => {
    if (dialogs?.privacy) {
      setLocalSettings(privacy);
      setHasChanges(false);
    }
  }, [dialogs?.privacy, privacy]);

  const handleClose = () => {
    dispatch(closeDialog({ type: "privacy" }));
  };

  const handlePrivacyChange = (field, value) => {
    const newSettings = {
      ...localSettings,
      [field]: value,
    };
    setLocalSettings(newSettings);
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);

      // Gọi API để lưu cài đặt bảo mật lên server
      const result = await settingServices.updatePrivacySettings(
        userInfo.user_id, // Sử dụng userInfo.keycloakId
        localSettings
      );
      console.log("2222", userInfo.user_id);

      // Cập nhật Redux state
      dispatch(updatePrivacy(result.data));

      // Hiển thị thông báo thành công
      dispatch(
        showSnackbar({
          severity: "success",
          message: "Cài đặt bảo mật đã được lưu thành công!",
        })
      );

      setHasChanges(false);
      handleClose();
    } catch (error) {
      console.error("Error saving privacy settings:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message:
            error.response?.data?.message || "Lỗi khi lưu cài đặt bảo mật!",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setLocalSettings(privacy); // Reset về giá trị ban đầu
    setHasChanges(false);
  };

  const privacyOptions = [
    {
      key: "lastSeen",
      icon: <Clock size={20} />,
      label: "Lần cuối hiển thị",
      description: "Ai có thể xem thời gian bạn hoạt động lần cuối",
      options: [
        { value: "everyone", label: "Mọi người" },
        { value: "contacts", label: "Chỉ bạn bè" },
        { value: "nobody", label: "Không ai" },
      ],
    },
    {
      key: "profilePhoto",
      icon: <User size={20} />,
      label: "Ảnh đại diện",
      description: "Ai có thể xem ảnh đại diện của bạn",
      options: [
        { value: "everyone", label: "Mọi người" },
        { value: "contacts", label: "Chỉ bạn bè" },
        { value: "nobody", label: "Không ai" },
      ],
    },
    {
      key: "status",
      icon: <Eye size={20} />,
      label: "Trạng thái",
      description: "Ai có thể xem trạng thái của bạn",
      options: [
        { value: "everyone", label: "Mọi người" },
        { value: "contacts", label: "Chỉ bạn bè" },
        { value: "nobody", label: "Không ai" },
      ],
    },
  ];

  return (
    <Dialog
      open={dialogs?.privacy || false}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Shield size={24} weight="duotone" />
          <Typography variant="h6" fontWeight={600}>
            Cài đặt bảo mật
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
          {privacyOptions.map((section, index) => (
            <Box key={section.key}>
              <FormControl component="fieldset" fullWidth>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={2}
                  sx={{ mb: 2 }}
                >
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1,
                      backgroundColor: "primary.main",
                      color: "white",
                    }}
                  >
                    {section.icon}
                  </Box>
                  <Box>
                    <FormLabel component="legend">
                      <Typography variant="body1" fontWeight={600}>
                        {section.label}
                      </Typography>
                    </FormLabel>
                    <Typography variant="caption" color="text.secondary">
                      {section.description}
                    </Typography>
                  </Box>
                </Stack>
                <RadioGroup
                  value={localSettings[section.key] || "everyone"}
                  onChange={(e) =>
                    handlePrivacyChange(section.key, e.target.value)
                  }
                >
                  <Stack spacing={1}>
                    {section.options.map((option) => (
                      <Box
                        key={option.value}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundColor: "background.paper",
                          "&:hover": {
                            backgroundColor: "action.hover",
                          },
                        }}
                      >
                        <FormControlLabel
                          value={option.value}
                          control={<Radio disabled={isLoading} />}
                          label={
                            <Typography variant="body2" fontWeight={500}>
                              {option.label}
                            </Typography>
                          }
                          sx={{ width: "100%", m: 0 }}
                        />
                      </Box>
                    ))}
                  </Stack>
                </RadioGroup>
              </FormControl>
              {index < privacyOptions.length - 1 && <Divider sx={{ mt: 3 }} />}
            </Box>
          ))}
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

export default PrivacyDialog;
