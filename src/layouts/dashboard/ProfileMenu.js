import React, { useState } from "react";
import {
  Avatar,
  Box,
  Fade,
  Menu,
  MenuItem,
  Stack,
  CircularProgress,
  Typography,
} from "@mui/material";
import { Profile_Menu } from "../../data";
import { useDispatch, useSelector } from "react-redux";
import { logoutAll } from "../../redux/slices/actions/logout";
import { socket } from "../../socket";
import { useNavigate, useLocation } from "react-router-dom";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../../config";
import { useKeycloak } from "@react-keycloak/web";
import { showSnackbar } from "../../redux/slices/app";

const ProfileMenu = () => {
  const { user, isLoading } = useSelector((state) => state.app);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { keycloak } = useKeycloak();

  const [anchorEl, setAnchorEl] = useState(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const openMenu = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  // Lấy user_id
  const user_id = keycloak?.subject || window.localStorage.getItem("user_id");

  // Debug info
  console.log("👤 ProfileMenu - User:", user);
  console.log("📍 Current location:", location.pathname);
  console.log("🔑 Keycloak authenticated:", keycloak?.authenticated);

  // Xử lý user name
  const getUserName = () => {
    if (!user) return "User";
    if (user.firstName && user.lastName)
      return `${user.firstName} ${user.lastName}`;
    if (user.firstName) return user.firstName;
    if (user.email) return user.email.split("@")[0];
    return "User";
  };

  // Xử lý avatar URL an toàn
  const getUserAvatar = () => {
    try {
      if (!user?.avatar) return "";

      const avatar = user.avatar;

      // Nếu đã là full URL
      if (typeof avatar === "string" && avatar.startsWith("http")) {
        return avatar;
      }

      // Nếu là S3 key
      if (
        typeof avatar === "string" &&
        S3_BUCKET_NAME &&
        AWS_S3_REGION &&
        avatar.trim() !== ""
      ) {
        return `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${avatar.trim()}`;
      }
    } catch (error) {
      console.error("Error processing avatar URL:", error);
    }

    return "";
  };

  // Lấy role từ current path
  const getCurrentRole = () => {
    const path = location.pathname;
    console.log("🔍 Analyzing path for role:", path);

    // Kiểm tra từng role trong path
    if (path.startsWith("/admin/") || path === "/admin") return "admin";
    if (path.startsWith("/moderator/") || path === "/moderator")
      return "moderator";
    if (path.startsWith("/bot/") || path === "/bot") return "bot";
    if (path.startsWith("/guest/") || path === "/guest") return "guest";
    if (path.startsWith("/user/") || path === "/user") return "user";

    // Fallback: kiểm tra keycloak role
    if (keycloak?.tokenParsed?.realm_access?.roles) {
      const roles = keycloak.tokenParsed.realm_access.roles;
      if (roles.includes("admin")) return "admin";
      if (roles.includes("moderator")) return "moderator";
      if (roles.includes("bot")) return "bot";
      if (roles.includes("guest")) return "guest";
    }

    // Default
    return "user";
  };

  const user_name = getUserName();
  const user_img = getUserAvatar();

  const handleLogout = async () => {
    try {
      handleClose();

      // 1. Socket disconnect
      if (user_id && socket) {
        socket.emit("end", { user_id });
        socket.disconnect();
      }

      // 2. Reset Redux state
      dispatch(logoutAll());

      // 3. Clear storage
      localStorage.clear();
      sessionStorage.clear();

      // 4. Keycloak logout
      if (keycloak?.authenticated) {
        await keycloak.logout({
          redirectUri: window.location.origin,
        });
      } else {
        // Fallback redirect
        window.location.href = "/";
      }
    } catch (error) {
      console.error("Logout error:", error);
      window.location.href = "/";
    }
  };

  const handleMenuItemClick = (idx) => {
    console.log(
      `📱 Menu click - Index: ${idx}, Title: ${Profile_Menu[idx]?.title}`
    );

    // Lấy role hiện tại
    const role = getCurrentRole();
    console.log(`👑 Current role determined: ${role}`);

    handleClose();
    setIsNavigating(true);

    try {
      switch (idx) {
        case 0: // Profile
          console.log(`🔄 Navigating to /${role}/profile...`);
          navigate(`/${role}/profile`, {
            replace: false,
            state: { from: location.pathname },
          });
          break;

        case 1: // Settings
          console.log(`🔄 Navigating to /${role}/settings...`);

          // Kiểm tra xem role có route settings không
          if (["user", "admin", "moderator"].includes(role)) {
            navigate(`/${role}/settings`, {
              replace: false,
              state: { from: location.pathname },
            });
          } else {
            // Bot và Guest có thể không có settings page, redirect đến profile
            console.log(
              `⚠️ Role ${role} doesn't have settings, redirecting to profile`
            );
            dispatch(
              showSnackbar({
                severity: "info",
                message: "Settings not available for your role",
              })
            );
            navigate(`/${role}/profile`, {
              replace: false,
              state: { from: location.pathname },
            });
          }
          break;

        case 2: // Logout
          console.log("🚪 Initiating logout...");
          handleLogout();
          break;

        default:
          console.warn(`Unknown menu index: ${idx}`);
          break;
      }
    } catch (error) {
      console.error("Navigation error:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Navigation failed. Please try again.",
        })
      );

      // Fallback: thử absolute path
      setTimeout(() => {
        if (idx === 0) {
          window.location.href = `/${role}/profile`;
        } else if (idx === 1 && ["user", "admin", "moderator"].includes(role)) {
          window.location.href = `/${role}/settings`;
        }
      }, 500);
    } finally {
      setIsNavigating(false);
    }
  };

  // Thêm fallback logic để handle navigation failure
  const navigateWithFallback = (path) => {
    console.log(`🚀 Attempting to navigate to: ${path}`);

    // Thử navigate bình thường
    const navigationResult = navigate(path);

    // Sau 1 giây, kiểm tra xem navigation có thành công không
    setTimeout(() => {
      if (window.location.pathname !== path) {
        console.warn(`⚠️ Navigation to ${path} failed, forcing redirect...`);
        window.location.href = path;
      }
    }, 1000);

    return navigationResult;
  };

  // Loading state
  if (isLoading || isNavigating) {
    return (
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        width={40}
        height={40}
      >
        <CircularProgress size={24} />
      </Box>
    );
  }

  return (
    <>
      <Avatar
        id="profile-positioned-button"
        aria-controls={openMenu ? "profile-positioned-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={openMenu ? "true" : undefined}
        alt={user_name}
        src={user_img}
        onClick={handleClick}
        sx={{
          cursor: "pointer",
          bgcolor: user_img ? "transparent" : "primary.main",
          width: 40,
          height: 40,
          "&:hover": {
            opacity: 0.8,
            transform: "scale(1.05)",
            transition: "all 0.2s ease",
          },
        }}
      >
        {!user_img && (user_name.charAt(0) || "U").toUpperCase()}
      </Avatar>

      <Menu
        MenuListProps={{
          "aria-labelledby": "fade-button",
          sx: {
            minWidth: 180,
            py: 0.5,
          },
        }}
        TransitionComponent={Fade}
        id="profile-positioned-menu"
        aria-labelledby="profile-positioned-button"
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        PaperProps={{
          elevation: 3,
          sx: {
            mt: 1.5,
            borderRadius: 2,
            overflow: "hidden",
          },
        }}
      >
        {/* User info header */}
        <Box
          p={2}
          sx={{
            bgcolor: "primary.light",
            color: "primary.contrastText",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          <Typography variant="subtitle2" fontWeight="bold">
            {user_name}
          </Typography>
          <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
            {user?.email || "No email"}
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.5,
              fontSize: "0.7rem",
              opacity: 0.8,
            }}
          >
            Role: {getCurrentRole()}
          </Typography>
        </Box>

        <Box p={1}>
          <Stack spacing={0.5}>
            {Profile_Menu.map((el, idx) => {
              // Ẩn Settings menu nếu role là bot hoặc guest
              if (idx === 1 && ["bot", "guest"].includes(getCurrentRole())) {
                return null;
              }

              return (
                <MenuItem
                  key={idx}
                  onClick={() => handleMenuItemClick(idx)}
                  sx={{
                    borderRadius: 1,
                    py: 1.5,
                    px: 2,
                    "&:hover": {
                      bgcolor: "action.hover",
                    },
                    "&.Mui-selected": {
                      bgcolor: "action.selected",
                    },
                  }}
                >
                  <Stack
                    sx={{ width: "100%" }}
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="body2" fontWeight={500}>
                      {el.title}
                    </Typography>
                    <Box sx={{ color: "action.active" }}>{el.icon}</Box>
                  </Stack>
                </MenuItem>
              );
            })}
          </Stack>
        </Box>
      </Menu>
    </>
  );
};

export default ProfileMenu;
