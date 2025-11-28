// src/pages/dashboard/Settings/components/SettingsContent.js
import React, { useState } from "react";
import {
  Stack,
  Typography,
  Box,
  Paper,
  Avatar,
  Chip,
  useTheme,
  Fade,
} from "@mui/material";
import {
  Palette,
  User,
  Bell,
  Shield,
  Sun,
  Moon,
  CaretRight,
  Crown,
  Calendar,
  Info,
  Gear,
  PaintBrush,
  UserCircle,
  Notification,
  Lock,
} from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { openDialog } from "../../../../redux/slices/settingsSlice";
import useSettings from "../../../../hooks/useSettings";

const SettingsContent = () => {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.app);
  const { userInfo } = useSelector((state) => state.auth);
  const theme = useTheme();
  const [hoveredCard, setHoveredCard] = useState(null);

  const { themeMode, themeColorPresets, onToggleMode } = useSettings();

  const quickActions = [
    {
      icon: <UserCircle size={24} weight="duotone" />,
      label: "Cập nhật hồ sơ",
      onClick: () => dispatch(openDialog({ type: "profile" })),
      description: "Thay đổi thông tin cá nhân và avatar",
      color: "primary",
      gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    },
    {
      icon: <PaintBrush size={24} weight="duotone" />,
      label: "Thay đổi giao diện",
      onClick: () => dispatch(openDialog({ type: "theme" })),
      description: "Tùy chỉnh màu sắc và chủ đề",
      color: "secondary",
      gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    },
    {
      icon: <Notification size={24} weight="duotone" />,
      label: "Cài đặt thông báo",
      onClick: () => dispatch(openDialog({ type: "notifications" })),
      description: "Quản lý thông báo và âm thanh",
      color: "info",
      gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    },
    {
      icon: <Lock size={24} weight="duotone" />,
      label: "Bảo mật & Quyền riêng tư",
      onClick: () => dispatch(openDialog({ type: "privacy" })),
      description: "Quản lý cài đặt bảo mật và riêng tư",
      color: "warning",
      gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    },
  ];

  const displayName =
    userInfo?.name || user?.username || user?.name || "Người dùng";
  const displayEmail = userInfo?.email || user?.email || "Chưa có email";
  const avatarUrl = user?.avatar || userInfo?.avatar;

  const currentTheme = themeMode || "light";
  const themeIcon =
    currentTheme === "dark" ? (
      <Moon size={18} weight="fill" />
    ) : (
      <Sun size={18} weight="fill" />
    );
  const themeLabel = currentTheme === "dark" ? "Tối" : "Sáng";

  const getColorValue = (colorName) => {
    const colorMap = {
      default: "#00AB55",
      purple: "#7635DC",
      cyan: "#00B8D9",
      blue: "#006C9C",
      orange: "#FF9800",
      red: "#FF3030",
    };
    return colorMap[colorName] || colorName || "#00AB55";
  };

  const primaryColorValue = getColorValue(themeColorPresets);

  return (
    <Stack spacing={3} sx={{ p: 3, maxWidth: 800, mx: "auto" }}>
      {/* Hero Section với animated background */}
      <Box sx={{ textAlign: "center", py: 3, position: "relative" }}>
        <Box
          sx={{
            position: "absolute",
            top: -30,
            left: "50%",
            transform: "translateX(-50%)",
            width: 80,
            height: 80,
            background:
              themeMode === "light"
                ? "linear-gradient(135deg, rgba(1, 98, 196, 0.1) 0%, rgba(0, 184, 217, 0.05) 100%)"
                : "linear-gradient(135deg, rgba(144, 202, 249, 0.1) 0%, rgba(79, 195, 247, 0.05) 100%)",
            borderRadius: "50%",
            filter: "blur(30px)",
            zIndex: 0,
          }}
        />
        <Gear
          size={48}
          weight="duotone"
          color={theme.palette.primary.main}
          style={{ marginBottom: 12 }}
        />
        <Typography
          variant="h3"
          fontWeight={700}
          gutterBottom
          sx={{
            background:
              themeMode === "light"
                ? "linear-gradient(135deg, #0162C4 0%, #00B8D9 100%)"
                : "linear-gradient(135deg, #90CAF9 0%, #4FC3F7 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: { xs: "2rem", md: "2.5rem" },
            mb: 1,
          }}
        >
          Cài Đặt
        </Typography>
        <Typography
          variant="h6"
          color="text.secondary"
          sx={{
            opacity: 0.8,
            maxWidth: 500,
            mx: "auto",
            lineHeight: 1.5,
            fontWeight: 400,
            fontSize: "1rem",
          }}
        >
          Tùy chỉnh trải nghiệm của bạn với các cài đặt cá nhân hóa
        </Typography>
      </Box>

      {/* User Profile Card với glass morphism */}
      <Fade in timeout={800}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            background:
              themeMode === "light"
                ? "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)"
                : "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)",
            boxShadow: "0 12px 40px rgba(0,0,0,0.08)",
            border: `1px solid ${
              themeMode === "light"
                ? "rgba(226, 232, 240, 0.6)"
                : "rgba(51, 65, 85, 0.6)"
            }`,
            backdropFilter: "blur(15px)",
            position: "relative",
            overflow: "hidden",
            "&::before": {
              content: '""',
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "4px",
              background: `linear-gradient(90deg, ${primaryColorValue} 0%, ${theme.palette.secondary.main} 100%)`,
              borderRadius: "3px 3px 0 0",
            },
          }}
        >
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={3}
            alignItems="center"
          >
            <Avatar
              src={avatarUrl}
              sx={{
                width: 80,
                height: 80,
                border: `3px solid ${primaryColorValue}`,
                boxShadow: `0 8px 24px ${primaryColorValue}30`,
                transition: "all 0.3s ease",
                "&:hover": {
                  transform: "scale(1.05) rotate(3deg)",
                  boxShadow: `0 12px 32px ${primaryColorValue}50`,
                },
              }}
            >
              <Typography variant="h4" fontWeight={600}>
                {displayName.charAt(0).toUpperCase()}
              </Typography>
            </Avatar>
            <Stack
              flex={1}
              spacing={1.5}
              alignItems={{ xs: "center", md: "flex-start" }}
              textAlign={{ xs: "center", md: "left" }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <Typography
                  variant="h4"
                  fontWeight={700}
                  sx={{ fontSize: "1.5rem" }}
                >
                  {displayName}
                </Typography>
                <Crown size={20} color="#FFD700" weight="fill" />
              </Stack>
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ opacity: 0.8, fontSize: "0.9rem" }}
              >
                {displayEmail}
              </Typography>
              <Stack
                direction="row"
                spacing={1.5}
                sx={{ mt: 1.5 }}
                flexWrap="wrap"
                justifyContent={{ xs: "center", md: "flex-start" }}
              >
                <Chip
                  icon={themeIcon}
                  label={`Chế độ ${themeLabel}`}
                  size="small"
                  variant="outlined"
                  sx={{
                    fontWeight: 500,
                    borderRadius: 2,
                    borderColor: primaryColorValue,
                    color: primaryColorValue,
                    fontSize: "0.75rem",
                  }}
                />
                <Chip
                  icon={<Crown size={14} />}
                  label="Nội bộ công ty"
                  size="small"
                  variant="filled"
                  sx={{
                    fontWeight: 500,
                    borderRadius: 2,
                    backgroundColor: theme.palette.secondary.main,
                    color: "white",
                    fontSize: "0.75rem",
                  }}
                />
              </Stack>
            </Stack>
          </Stack>
        </Paper>
      </Fade>

      {/* Quick Actions Grid với hover effects */}
      <Box>
        <Typography
          variant="h4"
          fontWeight={700}
          gutterBottom
          sx={{
            mb: 4,
            textAlign: "center",
            background:
              themeMode === "light"
                ? "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)"
                : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "1.75rem",
          }}
        >
          Thao Tác Nhanh
        </Typography>
        <Stack spacing={2.5}>
          {quickActions.map((action, index) => (
            <Fade in timeout={600 + index * 100} key={index}>
              <Paper
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                sx={{
                  p: 3,
                  cursor: "pointer",
                  borderRadius: 2,
                  background:
                    themeMode === "light"
                      ? "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)"
                      : "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)",
                  border: `1px solid ${
                    themeMode === "light"
                      ? "rgba(226, 232, 240, 0.6)"
                      : "rgba(51, 65, 85, 0.6)"
                  }`,
                  boxShadow:
                    hoveredCard === index
                      ? "0 16px 32px rgba(0,0,0,0.12)"
                      : "0 4px 20px rgba(0,0,0,0.06)",
                  transform:
                    hoveredCard === index
                      ? "translateY(-4px) scale(1.01)"
                      : "translateY(0) scale(1)",
                  backdropFilter: "blur(8px)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  position: "relative",
                  overflow: "hidden",
                  "&::before": {
                    content: '""',
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: "3px",
                    background: action.gradient,
                    transform:
                      hoveredCard === index ? "scaleX(1)" : "scaleX(0)",
                    transformOrigin: "left",
                    transition: "transform 0.3s ease",
                  },
                }}
                onClick={action.onClick}
              >
                <Stack direction="row" alignItems="center" spacing={3}>
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      background: action.gradient,
                      color: "white",
                      transition: "all 0.25s ease",
                      transform:
                        hoveredCard === index
                          ? "rotate(8deg) scale(1.05)"
                          : "rotate(0) scale(1)",
                    }}
                  >
                    {action.icon}
                  </Box>
                  <Stack flex={1} spacing={0.5}>
                    <Typography
                      variant="h6"
                      fontWeight={600}
                      sx={{ fontSize: "1.1rem" }}
                    >
                      {action.label}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ lineHeight: 1.4, fontSize: "0.85rem" }}
                    >
                      {action.description}
                    </Typography>
                  </Stack>
                  <Box
                    sx={{
                      color: "text.secondary",
                      transition: "all 0.25s ease",
                      transform:
                        hoveredCard === index
                          ? "translateX(4px)"
                          : "translateX(0)",
                    }}
                  >
                    <CaretRight size={20} weight="bold" />
                  </Box>
                </Stack>
              </Paper>
            </Fade>
          ))}
        </Stack>
      </Box>

      {/* Settings Overview trong grid layout */}
      <Box>
        <Typography
          variant="h4"
          fontWeight={700}
          gutterBottom
          sx={{
            mb: 4,
            textAlign: "center",
            background:
              themeMode === "light"
                ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
                : "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontSize: "1.75rem",
          }}
        >
          Tổng Quan Cài Đặt
        </Typography>
        <Stack direction={{ xs: "column", md: "row" }} spacing={2.5}>
          {/* Theme Settings Card */}
          <Paper
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 2,
              background:
                themeMode === "light"
                  ? "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)"
                  : "linear-gradient(135deg, #334155 0%, #475569 100%)",
              border: `1px solid ${
                themeMode === "light" ? "#cbd5e1" : "#475569"
              }`,
              transition: "all 0.25s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              },
            }}
          >
            <Stack spacing={2.5}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    background:
                      "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    color: "white",
                  }}
                >
                  <Palette size={24} weight="fill" />
                </Box>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  sx={{ fontSize: "1.1rem" }}
                >
                  Giao Diện
                </Typography>
              </Stack>
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      p: 1,
                      borderRadius: 1.5,
                      backgroundColor:
                        themeMode === "light" ? "white" : "#1e293b",
                      border: `2px solid ${primaryColorValue}30`,
                    }}
                  >
                    {themeIcon}
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {themeLabel}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Chế độ hiển thị
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <Box
                    sx={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      backgroundColor: primaryColorValue,
                      border: `2px solid ${
                        themeMode === "light" ? "white" : "#1e293b"
                      }`,
                      boxShadow: `0 3px 8px ${primaryColorValue}40`,
                    }}
                  />
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {primaryColorValue}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Màu chủ đề
                    </Typography>
                  </Box>
                </Stack>
              </Stack>
            </Stack>
          </Paper>

          {/* Account Info Card */}
          <Paper
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 2,
              background:
                themeMode === "light"
                  ? "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)"
                  : "linear-gradient(135deg, #334155 0%, #475569 100%)",
              border: `1px solid ${
                themeMode === "light" ? "#cbd5e1" : "#475569"
              }`,
              transition: "all 0.25s ease",
              "&:hover": {
                transform: "translateY(-2px)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
              },
            }}
          >
            <Stack spacing={2.5}>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 1.5,
                    background:
                      "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
                    color: "white",
                  }}
                >
                  <Calendar size={24} weight="fill" />
                </Box>
                <Typography
                  variant="h6"
                  fontWeight={600}
                  sx={{ fontSize: "1.1rem" }}
                >
                  Tài Khoản
                </Typography>
              </Stack>
              <Box>
                <Typography variant="body2" fontWeight={600} gutterBottom>
                  Thành viên từ
                </Typography>
                <Typography
                  variant="h6"
                  color="primary"
                  fontWeight={700}
                  sx={{ fontSize: "1rem" }}
                >
                  {user?.createdAt
                    ? new Date(user.createdAt).toLocaleDateString("vi-VN")
                    : "Không xác định"}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  Loại tài khoản: {userInfo?.role || user?.role || "User"}
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Stack>
      </Box>

      {/* App Info Footer với design tinh tế */}
      <Fade in timeout={1000}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            border: `1px solid ${
              themeMode === "light" ? "#e2e8f0" : "#334155"
            }`,
            background:
              themeMode === "light"
                ? "linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.9) 100%)"
                : "linear-gradient(135deg, rgba(30, 41, 59, 0.9) 0%, rgba(51, 65, 85, 0.9) 100%)",
            backdropFilter: "blur(8px)",
            textAlign: "center",
          }}
        >
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              background:
                themeMode === "light"
                  ? "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)"
                  : "linear-gradient(135deg, #334155 0%, #475569 100%)",
              display: "inline-flex",
              mb: 3,
              border: `1px solid ${
                themeMode === "light" ? "#cbd5e1" : "#475569"
              }`,
            }}
          >
            <Info size={32} weight="duotone" color={primaryColorValue} />
          </Box>
          <Typography
            variant="h5"
            fontWeight={700}
            gutterBottom
            sx={{ fontSize: "1.5rem", mb: 3 }}
          >
            Thông Tin Ứng Dụng
          </Typography>
          <Stack spacing={2.5} sx={{ mt: 3, maxWidth: 450, mx: "auto" }}>
            {[
              { label: "Phiên bản", value: "1.0.0", sub: "Build 2024.11" },
              {
                label: "Loại tài khoản",
                value: "Nội bộ công ty",
                sub: userInfo?.role || user?.role || "User",
              },
              {
                label: "Hỗ trợ kỹ thuật",
                value: "support@company.com",
                sub: "(024) 1234 5678",
              },
              {
                label: "Giờ làm việc",
                value: "Thứ 2 - Thứ 6",
                sub: "8:00 - 17:00",
              },
            ].map((item, index) => (
              <Box key={index} sx={{ textAlign: "center" }}>
                <Typography
                  variant="body1"
                  fontWeight={600}
                  color="primary"
                  sx={{ fontSize: "0.9rem" }}
                >
                  {item.label}
                </Typography>
                <Typography
                  variant="body2"
                  fontWeight={600}
                  sx={{ mt: 0.25, fontSize: "0.85rem" }}
                >
                  {item.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.sub}
                </Typography>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Fade>
    </Stack>
  );
};

export default SettingsContent;
