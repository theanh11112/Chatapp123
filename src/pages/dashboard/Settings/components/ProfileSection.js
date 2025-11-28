// src/pages/dashboard/Settings/components/ProfileSection.js
import React from "react";
import { Stack, Avatar, Typography, Box } from "@mui/material";
import { User } from "phosphor-react";
import { useTheme } from "@mui/material/styles";
import { useSelector, useDispatch } from "react-redux";
import { openDialog } from "../../../../redux/slices/settingsSlice";

const ProfileSection = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.app);
  const { userInfo } = useSelector((state) => state.auth);

  const handleEditProfile = () => {
    dispatch(openDialog({ type: "profile" }));
  };

  const displayName = userInfo?.name || user?.name || "Người dùng";
  const displayStatus = user?.status || "Sẵn sàng trò chuyện";
  const avatarUrl = user?.avatar || userInfo?.avatar;

  return (
    <Stack
      direction="row"
      spacing={3}
      alignItems="center"
      sx={{ cursor: "pointer" }}
      onClick={handleEditProfile}
    >
      <Avatar
        src={avatarUrl}
        sx={{
          height: 56,
          width: 56,
          border: `2px solid ${theme.palette.primary.main}`,
        }}
      >
        {displayName.charAt(0).toUpperCase()}
      </Avatar>
      <Stack spacing={0.5} flex={1}>
        <Typography variant="h6" fontWeight={500}>
          {displayName}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {displayStatus}
        </Typography>
        <Stack direction="row" alignItems="center" spacing={0.5}>
          <User size={14} />
          <Typography variant="caption" color="primary">
            Chỉnh sửa hồ sơ
          </Typography>
        </Stack>
      </Stack>
    </Stack>
  );
};

export default ProfileSection;
