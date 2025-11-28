// src/pages/dashboard/Settings/components/SettingsList.js
import React from "react";
import { Stack, Typography, Box, IconButton, Tooltip } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { User, Palette, Bell, Shield, Question, Gear } from "phosphor-react";
import { useDispatch } from "react-redux";
import { openDialog } from "../../../../redux/slices/settingsSlice";

const SettingsList = ({ isCollapsed = false }) => {
  const theme = useTheme();
  const dispatch = useDispatch();

  const settingsItems = [
    {
      icon: <User size={isCollapsed ? 20 : 24} />,
      label: "Hồ sơ",
      onClick: () => dispatch(openDialog({ type: "profile" })),
      color: "primary",
      description: "Quản lý thông tin cá nhân",
    },
    {
      icon: <Palette size={isCollapsed ? 20 : 24} />,
      label: "Giao diện",
      onClick: () => dispatch(openDialog({ type: "theme" })),
      color: "secondary",
      description: "Tùy chỉnh màu sắc và theme",
    },
    {
      icon: <Bell size={isCollapsed ? 20 : 24} />,
      label: "Thông báo",
      onClick: () => dispatch(openDialog({ type: "notifications" })),
      color: "info",
      description: "Cài đặt thông báo và âm thanh",
    },
    {
      icon: <Shield size={isCollapsed ? 20 : 24} />,
      label: "Bảo mật",
      onClick: () => dispatch(openDialog({ type: "privacy" })),
      color: "warning",
      description: "Quyền riêng tư và bảo mật",
    },
    {
      icon: <Question size={isCollapsed ? 20 : 24} />,
      label: "Trợ giúp",
      onClick: () => dispatch(openDialog({ type: "help" })),
      color: "error",
      description: "Hỗ trợ và hướng dẫn",
    },
  ];

  if (isCollapsed) {
    return (
      <Stack spacing={1} alignItems="center">
        {settingsItems.map((item, index) => (
          <Tooltip
            key={index}
            title={
              <Box>
                <Typography variant="subtitle2" fontWeight={600}>
                  {item.label}
                </Typography>
                <Typography variant="caption">{item.description}</Typography>
              </Box>
            }
            placement="right"
            arrow
          >
            <IconButton
              onClick={item.onClick}
              sx={{
                color:
                  theme.palette[item.color]?.main || theme.palette.primary.main,
                p: 1.5,
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "light" ? "#F1F5F9" : "#334155",
                  transform: "scale(1.1)",
                },
                transition: "all 0.2s ease",
              }}
            >
              {item.icon}
            </IconButton>
          </Tooltip>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography
        variant="h6"
        fontWeight={600}
        color="text.secondary"
        sx={{ px: 1, mb: 1 }}
      >
        Tùy chọn
      </Typography>
      {settingsItems.map((item, index) => (
        <Box
          key={index}
          onClick={item.onClick}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 2,
            borderRadius: 2,
            cursor: "pointer",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor:
                theme.palette.mode === "light" ? "#F8FAFC" : "#334155",
              transform: "translateX(4px)",
              borderLeft: `3px solid ${theme.palette[item.color]?.main}`,
            },
            borderLeft: `3px solid transparent`,
          }}
        >
          <Box
            sx={{
              color: theme.palette[item.color]?.main,
              transition: "all 0.2s ease",
            }}
          >
            {item.icon}
          </Box>
          <Box flex={1}>
            <Typography variant="body1" fontWeight={500}>
              {item.label}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ opacity: 0.7 }}
            >
              {item.description}
            </Typography>
          </Box>
        </Box>
      ))}
    </Stack>
  );
};

export default SettingsList;
