// src/pages/dashboard/Settings/components/dialogs/ProfileDialog.js
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  TextField,
  Avatar,
  Box,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { User, Camera } from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import {
  closeDialog,
  updateProfile,
} from "../../../../../redux/slices/settingsSlice";
import {
  UpdateUserProfile,
  FetchUserProfile,
} from "../../../../../redux/slices/app";
import { showSnackbar } from "../../../../../redux/slices/app";

const ProfileDialog = () => {
  const dispatch = useDispatch();
  const { dialogs, profile } = useSelector((state) => state.settings);
  const { user } = useSelector((state) => state.app);
  const { userInfo } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    username: "",
    status: "",
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (dialogs.profile) {
      const currentUsername =
        userInfo?.username || user?.username || user?.name || "";
      const currentStatus = user?.status || "Sẵn sàng trò chuyện";

      setFormData({
        username: currentUsername,
        status: currentStatus,
      });
    }
  }, [dialogs.profile, user, userInfo]);

  const handleClose = () => {
    dispatch(closeDialog({ type: "profile" }));
  };

  const handleSave = async () => {
    if (!formData.username.trim()) {
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Vui lòng nhập username",
        })
      );
      return;
    }

    setIsLoading(true);

    try {
      const updateData = {
        username: formData.username.trim(),
        status: formData.status.trim(),
      };

      console.log("🔄 Updating profile with data:", updateData);

      dispatch(UpdateUserProfile(updateData));
      dispatch(updateProfile(updateData));
      dispatch(FetchUserProfile());

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Cập nhật hồ sơ thành công!",
        })
      );

      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Cập nhật hồ sơ thất bại. Vui lòng thử lại!",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      console.log("Avatar file:", file);
      // TODO: Implement avatar upload functionality
    }
  };

  const avatarUrl = profile?.avatar || user?.avatar || userInfo?.avatar || "";
  const displayUsername =
    formData.username ||
    userInfo?.username ||
    user?.username ||
    user?.name ||
    "Người dùng";
  const displayEmail = userInfo?.email || user?.email || "Chưa có email";

  return (
    <Dialog
      open={dialogs?.profile || false}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      disableEnforceFocus={false}
      disableAutoFocus={true}
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <User size={24} />
          <Typography variant="h6" fontWeight={600}>
            Chỉnh sửa hồ sơ
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={3}>
          {/* Avatar Section */}
          <Stack alignItems="center" spacing={2}>
            <Box sx={{ position: "relative" }}>
              <Avatar
                src={avatarUrl}
                sx={{
                  width: 80,
                  height: 80,
                  border: (theme) => `3px solid ${theme.palette.primary.main}`,
                  fontSize: "32px",
                  fontWeight: 600,
                }}
              >
                {displayUsername?.charAt(0)?.toUpperCase() || "U"}
              </Avatar>
              <IconButton
                component="label"
                sx={{
                  position: "absolute",
                  bottom: 0,
                  right: 0,
                  backgroundColor: "primary.main",
                  color: "white",
                  "&:hover": {
                    backgroundColor: "primary.dark",
                  },
                  width: 28,
                  height: 28,
                }}
                size="small"
                disableRipple
                tabIndex={-1}
              >
                <Camera size={14} />
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
              </IconButton>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
            >
              Nhấn để thay đổi ảnh đại diện
              <br />
              <Typography variant="caption" color="text.disabled">
                (Hỗ trợ: JPG, PNG, GIF)
              </Typography>
            </Typography>
          </Stack>

          {/* Username Field */}
          <TextField
            fullWidth
            label="Tên hiển thị"
            value={formData.username}
            onChange={handleChange("username")}
            placeholder="Nhập tên hiển thị của bạn"
            disabled={isLoading}
            autoFocus={false}
            helperText="Tên này sẽ hiển thị với mọi người trong cuộc trò chuyện"
          />

          {/* Status Field */}
          <TextField
            fullWidth
            label="Trạng thái"
            value={formData.status}
            onChange={handleChange("status")}
            placeholder="Mô tả trạng thái của bạn..."
            multiline
            rows={2}
            disabled={isLoading}
            helperText="Ví dụ: Đang làm việc, Đang họp,..."
          />

          {/* Account Info */}
          <Box
            sx={{
              p: 2,
              bgcolor: "background.neutral",
              borderRadius: 2,
              border: 1,
              borderColor: "divider",
            }}
          >
            <Typography
              variant="subtitle2"
              fontWeight={600}
              gutterBottom
              color="primary"
            >
              Thông tin tài khoản
            </Typography>
            <Stack spacing={0.5}>
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={500}
                  color="text.primary"
                >
                  Email:
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {displayEmail}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={500}
                  color="text.primary"
                >
                  ID nhân viên:
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {userInfo?.employee_id || user?.employee_id || "EMP001"}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={500}
                  color="text.primary"
                >
                  Phòng ban:
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1 }}
                >
                  {userInfo?.department || user?.department || "General"}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  fontWeight={500}
                  color="text.primary"
                >
                  Loại tài khoản:
                </Typography>
                <Typography
                  variant="caption"
                  color="success.main"
                  sx={{ ml: 1 }}
                >
                  Nội bộ công ty
                </Typography>
              </Box>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={handleClose}
          disabled={isLoading}
          variant="outlined"
          sx={{ minWidth: 80 }}
        >
          Hủy
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!formData.username.trim() || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : null}
          sx={{ minWidth: 120 }}
        >
          {isLoading ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProfileDialog;
