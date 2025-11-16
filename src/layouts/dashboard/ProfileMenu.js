import React from "react";
import { Avatar, Box, Fade, Menu, MenuItem, Stack } from "@mui/material";
import { Profile_Menu } from "../../data";
import { useDispatch, useSelector } from "react-redux";
import { logoutAll } from "../../redux/slices/actions/logout";
import { socket } from "../../socket";
import { useNavigate } from "react-router-dom";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../../config";
import { useKeycloak } from "@react-keycloak/web";

const ProfileMenu = () => {
  const { user } = useSelector((state) => state.app);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { keycloak } = useKeycloak();

  const [anchorEl, setAnchorEl] = React.useState(null);
  const openMenu = Boolean(anchorEl);

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const user_id = window.localStorage.getItem("user_id");
  const user_name = user?.firstName || "User";
  const user_img = user?.avatar
    ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
    : "";

  const handleLogout = () => {
    handleClose();

    // 1️⃣ Reset Redux state, conversation state, app
    dispatch(logoutAll());

    // 2️⃣ Emit end socket
    socket.emit("end", { user_id });

    // 3️⃣ Logout Keycloak và redirect về homepage
    keycloak.logout({
      redirectUri: window.location.origin,
    });
  };

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
      />

      <Menu
        MenuListProps={{ "aria-labelledby": "fade-button" }}
        TransitionComponent={Fade}
        id="profile-positioned-menu"
        aria-labelledby="profile-positioned-button"
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Box p={1}>
          <Stack spacing={1}>
            {Profile_Menu.map((el, idx) => (
              <MenuItem key={idx} onClick={handleClose}>
                <Stack
                  onClick={() => {
                    if (idx === 0) navigate("/profile");
                    else if (idx === 1) navigate("/settings");
                    else handleLogout(); // 🔹 dùng hàm logout mới
                  }}
                  sx={{ width: 100 }}
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <span>{el.title}</span>
                  {el.icon}
                </Stack>
              </MenuItem>
            ))}
          </Stack>
        </Box>
      </Menu>
    </>
  );
};

export default ProfileMenu;
