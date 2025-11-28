// src/pages/dashboard/Settings/index.js
import React, { useEffect } from "react";
import { Stack, Box } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { syncProfileWithApp } from "../../../redux/slices/settingsSlice";
import { settingServices } from "../../../services/settingServices";
import { setSettingsFromAPI } from "../../../redux/slices/settingsSlice";

// Components
import SettingsSidebar from "./components/SettingsSidebar";
import SettingsContent from "./components/SettingsContent";

// Dialogs
import ProfileDialog from "./components/dialogs/ProfileDialog";
import ThemeDialog from "./components/dialogs/ThemeDialog";
import NotificationsDialog from "./components/dialogs/NotificationsDialog";
import PrivacyDialog from "./components/dialogs/PrivacyDialog";
import HelpDialog from "./components/dialogs/HelpDialog";

const Settings = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.app);
  const { userInfo } = useSelector((state) => state.auth);

  // Sync profile data với app state khi component mount
  useEffect(() => {
    console.log("11111", user);
    dispatch(syncProfileWithApp({ user, userInfo }));
  }, [dispatch, user, userInfo]);

  // Load settings từ API khi component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        if (userInfo?.keycloakId) {
          const result = await settingServices.getSettings(userInfo.user_id);
          dispatch(setSettingsFromAPI(result.data));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    };

    loadSettings();
  }, [dispatch, userInfo?.user_id]);

  return (
    <>
      <Stack
        direction="row"
        sx={{
          width: "100%",
          height: "100vh",
          overflow: "hidden",
          backgroundColor: theme.palette.background.default,
        }}
      >
        {/* Left Pane - Sidebar */}
        <SettingsSidebar />

        {/* Right Pane - Content */}
        <Box
          sx={{
            flex: 1,
            height: "100vh",
            overflowY: "auto",
            backgroundColor:
              theme.palette.mode === "light"
                ? "#FAFBFC"
                : theme.palette.background.paper,
            boxShadow:
              theme.palette.mode === "light"
                ? "inset 1px 0 2px rgba(0,0,0,0.04)"
                : "inset 1px 0 2px rgba(255,255,255,0.04)",
          }}
        >
          <SettingsContent />
        </Box>
      </Stack>

      {/* Dialogs */}
      <ProfileDialog />
      <ThemeDialog />
      <NotificationsDialog />
      <PrivacyDialog />
      <HelpDialog />
    </>
  );
};

export default Settings;
