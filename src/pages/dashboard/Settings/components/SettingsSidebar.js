// src/pages/dashboard/Settings/components/SettingsSidebar.js - Phiên bản đơn giản
import React, { useState } from "react";
import {
  Box,
  Stack,
  Divider,
  Typography,
  IconButton,
  Collapse,
  Tooltip,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CaretLeft, CaretRight } from "phosphor-react";

import ProfileSection from "./ProfileSection";
import SettingsList from "./SettingsList";

const SettingsSidebar = () => {
  const theme = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <Box
      sx={{
        overflowY: "auto",
        height: "100vh",
        width: isCollapsed ? 80 : 320,
        background:
          theme.palette.mode === "light"
            ? "linear-gradient(180deg, #FFFFFF 0%, #F8FAFF 100%)"
            : "linear-gradient(180deg, #1E293B 0%, #0F172A 100%)",
        boxShadow:
          theme.palette.mode === "light"
            ? "4px 0 20px rgba(0, 0, 0, 0.06)"
            : "4px 0 20px rgba(0, 0, 0, 0.3)",
        borderRight: `1px solid ${
          theme.palette.mode === "light" ? "#E2E8F0" : "#334155"
        }`,
        position: "relative",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Stack p={isCollapsed ? 2 : 4} spacing={isCollapsed ? 2 : 4}>
        {/* Header đơn giản chỉ có toggle button và title */}
        <Stack
          direction="row"
          alignItems="center"
          spacing={2}
          justifyContent={isCollapsed ? "center" : "space-between"}
        >
          {/* Toggle Button - Luôn ở đầu */}
          <Tooltip
            title={isCollapsed ? "Mở rộng" : "Thu nhỏ"}
            placement="right"
            arrow
          >
            <IconButton
              onClick={toggleSidebar}
              sx={{
                backgroundColor:
                  theme.palette.mode === "light" ? "#F1F5F9" : "#334155",
                "&:hover": {
                  backgroundColor:
                    theme.palette.mode === "light" ? "#E2E8F0" : "#475569",
                  transform: "scale(1.1)",
                },
                transition: "all 0.4s ease",
              }}
            >
              {isCollapsed ? (
                <CaretRight
                  size={20}
                  color={theme.palette.mode === "light" ? "#475569" : "#94A3B8"}
                />
              ) : (
                <CaretLeft
                  size={20}
                  color={theme.palette.mode === "light" ? "#475569" : "#94A3B8"}
                />
              )}
            </IconButton>
          </Tooltip>

          {/* Title - Chỉ hiển thị khi mở rộng */}
          <Collapse in={!isCollapsed} orientation="horizontal">
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{
                background:
                  theme.palette.mode === "light"
                    ? "linear-gradient(135deg, #0162C4 0%, #00B8D9 100%)"
                    : "linear-gradient(135deg, #90CAF9 0%, #4FC3F7 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                flex: 1,
                textAlign: "center",
              }}
            >
              Cài đặt
            </Typography>
          </Collapse>

          {/* Empty space để cân bằng layout khi mở rộng */}
          <Collapse in={!isCollapsed} orientation="horizontal">
            <Box sx={{ width: 40 }} /> {/* Placeholder để cân bằng */}
          </Collapse>
        </Stack>

        {/* Profile Section - ẩn khi collapsed */}
        <Collapse in={!isCollapsed}>
          <ProfileSection />
        </Collapse>

        <Divider
          sx={{
            borderColor: theme.palette.mode === "light" ? "#E2E8F0" : "#334155",
            my: 1,
          }}
        />

        {/* Settings List - luôn hiển thị nhưng compact khi collapsed */}
        <SettingsList isCollapsed={isCollapsed} />
      </Stack>

      {/* Footer với version info khi mở rộng */}
      <Collapse in={!isCollapsed}>
        <Box
          sx={{
            p: 3,
            borderTop: `1px solid ${
              theme.palette.mode === "light" ? "#E2E8F0" : "#334155"
            }`,
            textAlign: "center",
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ opacity: 0.7 }}
          >
            Version 1.0.0
          </Typography>
        </Box>
      </Collapse>
    </Box>
  );
};

export default SettingsSidebar;
