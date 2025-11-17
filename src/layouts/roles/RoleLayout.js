// RoleLayout.js - CHỈ render Outlet, không có logic điều kiện
import React from "react";
import { Stack, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useResponsive from "../../hooks/useResponsive";
import { Outlet } from "react-router-dom";
import DashboardLayout from "../dashboard/index";

const RoleLayout = React.memo(({ showNav = true, showChat = false, role }) => {
  const theme = useTheme();
  const isDesktop = useResponsive("up", "md");

  console.log("📍 RoleLayout rendering for role:", role);

  return (
    <Stack direction="row" sx={{ height: "100vh", width: "100%" }}>
      {/* DashboardLayout - Sidebar */}
      {showNav && isDesktop && (
        <DashboardLayout
          key={`dashboard-${role}`}
          showNav={showNav}
          showChat={showChat}
        />
      )}

      {/* Main Content Area - CHỈ Outlet */}
      <Box
        sx={{
          flexGrow: 1,
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F0F4FA"
              : theme.palette.background.default,
          overflow: "auto",
        }}
      >
        <Outlet />
      </Box>
    </Stack>
  );
});

RoleLayout.displayName = "RoleLayout";

export default RoleLayout;
