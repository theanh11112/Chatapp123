// SideBar.js - Sửa pathToTabMap
import React from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Divider, IconButton, Stack } from "@mui/material";
import AntSwitch from "../../components/AntSwitch";
import Logo from "../../assets/Images/logo.ico";
import useSettings from "../../hooks/useSettings";
import { Nav_Buttons, Nav_Setting } from "../../data";
import ProfileMenu from "./ProfileMenu";
import { useNavigate, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { UpdateTab } from "../../redux/slices/app";

const SideBar = ({ role }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const { tab } = useSelector((state) => state.app);
  const { onToggleMode } = useSettings();

  // 🔗 Sinh đường dẫn ĐÚNG theo cấu trúc route mới
  const getPath = (index) => {
    switch (index) {
      case 0: // Chat
        return `/${role}/app`;
      case 1: // Group
        return `/${role}/group`;
      case 2: // Call
        return `/${role}/call`;
      case 3: // Settings
        return `/${role}/settings`;
      case 4: // Dashboard
        return `/${role}/dashboard`;
      default:
        return `/${role}/dashboard`;
    }
  };

  // 🔥 SỬA: Cập nhật tab active dựa trên current path - FIXED
  React.useEffect(() => {
    const pathToTabMap = {
      [`/${role}/app`]: 0,
      [`/${role}/group`]: 1,
      [`/${role}/call`]: 2,
      [`/${role}/settings`]: 3,
      [`/${role}/dashboard`]: 4,
      // 🔥 THÊM: Conversation và Chats cũng là chat (tab 0)
      [`/${role}/conversation`]: 0,
      [`/${role}/chats`]: 0,
    };

    const currentTab = pathToTabMap[location.pathname];

    // 🔥 CHỈ update tab nếu path được map và khác với tab hiện tại
    if (currentTab !== undefined && currentTab !== tab) {
      console.log(
        "🔄 Auto-updating tab to:",
        currentTab,
        "for path:",
        location.pathname
      );
      dispatch(UpdateTab({ tab: currentTab }));
    }
  }, [location.pathname, role, tab, dispatch]);

  const handleChangeTab = (index) => {
    const path = getPath(index);
    console.log("🔄 Navigating to:", path, "from tab:", index);
    dispatch(UpdateTab({ tab: index }));
    navigate(path);
  };

  return (
    <Box
      sx={{
        height: "100vh",
        width: 100,
        backgroundColor:
          theme.palette.mode === "light"
            ? "#F0F4FA"
            : theme.palette.background.paper,
        boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
      }}
    >
      <Stack
        py={3}
        alignItems="center"
        justifyContent="space-between"
        sx={{ height: "100%" }}
      >
        {/* --- Logo + Navigation Buttons --- */}
        <Stack alignItems="center" spacing={4}>
          <Box
            sx={{
              height: 64,
              width: 64,
              borderRadius: 1.5,
              backgroundColor: theme.palette.primary.main,
            }}
            p={1}
          >
            <img src={Logo} alt="Tawk" />
          </Box>

          {/* --- Navigation Buttons --- */}
          <Stack
            sx={{ width: "max-content" }}
            direction="column"
            alignItems="center"
            spacing={3}
          >
            {Nav_Buttons.filter((el) => el.roles.includes(role)).map(
              (el, index) =>
                el.index === tab ? (
                  <Box
                    key={index}
                    sx={{
                      backgroundColor: theme.palette.primary.main,
                      borderRadius: 1.5,
                    }}
                    p={1}
                  >
                    <IconButton
                      onClick={() => handleChangeTab(el.index)}
                      sx={{ width: "max-content", color: "#ffffff" }}
                    >
                      {el.icon}
                    </IconButton>
                  </Box>
                ) : (
                  <IconButton
                    key={index}
                    onClick={() => handleChangeTab(el.index)}
                    sx={{
                      width: "max-content",
                      color:
                        theme.palette.mode === "light"
                          ? "#080707"
                          : theme.palette.text.primary,
                    }}
                  >
                    {el.icon}
                  </IconButton>
                )
            )}

            <Divider sx={{ width: 48 }} />

            {Nav_Setting.map((el, index) =>
              el.index === tab ? (
                <Box
                  key={index}
                  sx={{
                    backgroundColor: theme.palette.primary.main,
                    borderRadius: 1.5,
                  }}
                  p={1}
                >
                  <IconButton
                    onClick={() => handleChangeTab(el.index)}
                    sx={{ width: "max-content", color: "#ffffff" }}
                  >
                    {el.icon}
                  </IconButton>
                </Box>
              ) : (
                <IconButton
                  key={index}
                  onClick={() => handleChangeTab(el.index)}
                  sx={{
                    width: "max-content",
                    color:
                      theme.palette.mode === "light"
                        ? "#080707"
                        : theme.palette.text.primary,
                  }}
                >
                  {el.icon}
                </IconButton>
              )
            )}
          </Stack>
        </Stack>

        {/* --- Theme switch & profile --- */}
        <Stack spacing={4}>
          <AntSwitch
            defaultChecked={theme.palette.mode === "dark"}
            onChange={onToggleMode}
          />
          <ProfileMenu />
        </Stack>
      </Stack>
    </Box>
  );
};

export default SideBar;
