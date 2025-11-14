import React from "react";
import { useTheme } from "@mui/material/styles";
import { Box, Divider, IconButton, Stack } from "@mui/material";
import AntSwitch from "../../components/AntSwitch";
import Logo from "../../assets/Images/logo.ico";
import useSettings from "../../hooks/useSettings";
import { Nav_Buttons, Nav_Setting } from "../../data";
import ProfileMenu from "./ProfileMenu";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { UpdateTab } from "../../redux/slices/app";


// 🎯 Sidebar có thể nhận role động (default là "user")
const SideBar = ({ role }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { tab } = useSelector((state) => state.app);
  const { onToggleMode } = useSettings();

  // 🔗 Sinh đường dẫn động theo role
  const getPath = (index) => {
    switch (index) {
      case 0:
        return `/${role}/app`;
      case 1:
        return `/${role}/group`;
      case 2:
        return `/${role}/call`;
      case 3:
        return `/${role}/settings`;
      case 4:
        return `/${role}/dashboard`;
      default:
        return `/${role}`;
    }
  };

  const handleChangeTab = (index) => {
    console.log(getPath(index));
    dispatch(UpdateTab({ tab: index }));
    navigate(getPath(index));
    console.log("✅ navigate() executed successfully");
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
