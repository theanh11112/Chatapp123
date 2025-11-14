import React from "react";
import { Stack, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import useResponsive from "../../hooks/useResponsive";
import { Outlet } from "react-router-dom";
import DashboardLayout from "../dashboard/index";
import Chats from "../../pages/dashboard/Chats";
import Call from "../../pages/dashboard/Call";
import { Conversation } from "../../pages/dashboard/Conversation";
import GeneralApp from "../../pages/dashboard/GeneralApp";


const RoleLayout = ({ showNav = true, showChat = false }) => {
  const theme = useTheme();
  const isDesktop = useResponsive("up", "md");

  return (
    <Stack direction="row" sx={{ height: "100vh", width: "100%" }}>
      {/* Luôn render DashboardLayout, nhưng tùy theo thiết bị mà có thể ẩn Sidebar */}
      <DashboardLayout showNav={showNav && isDesktop} showChat={showChat} />
        
      <GeneralApp/>
      {/* Nội dung chính */}
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
};

export default RoleLayout;
