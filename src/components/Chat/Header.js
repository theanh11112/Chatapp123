import React from "react";
import {
  Avatar,
  Badge,
  Box,
  Divider,
  Fade,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  styled,
  Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { CaretDown, MagnifyingGlass, Phone, VideoCamera } from "phosphor-react";
import useResponsive from "../../hooks/useResponsive";
import { ToggleSidebar } from "../../redux/slices/app";
import { useDispatch, useSelector } from "react-redux";
import { StartAudioCall } from "../../redux/slices/audioCall";
import { StartVideoCall } from "../../redux/slices/videoCall";

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0,
    },
  },
}));

const Conversation_Menu = [
  {
    id: 1,
    title: "Contact info",
  },
  {
    id: 2,
    title: "Mute notifications",
  },
  {
    id: 3,
    title: "Clear messages",
  },
  {
    id: 4,
    title: "Delete chat",
  },
];

const ChatHeader = () => {
  const dispatch = useDispatch();
  const isMobile = useResponsive("between", "md", "xs", "sm");
  const theme = useTheme();

  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  // Debug current_conversation
  React.useEffect(() => {
    console.log("🔍 ChatHeader - current_conversation:", current_conversation);
  }, [current_conversation]);

  // Nếu không có current_conversation, hiển thị placeholder
  if (!current_conversation?.id) {
    return (
      <Box
        p={2}
        width="100%"
        sx={{
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background,
          boxShadow: "0px 0px 2px rgba(0,0,0,0.25)",
        }}
      >
        <Stack alignItems="center" justifyContent="center">
          <Typography variant="subtitle2" color="text.secondary">
            Select a conversation to start chatting
          </Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <>
      <Box
        p={2}
        width="100%"
        sx={{
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background,
          boxShadow: "0px 0px 2px rgba(0,0,0,0.25)",
        }}
      >
        <Stack
          alignItems="center"
          direction="row"
          justifyContent="space-between"
          sx={{ width: "100%" }}
        >
          <Stack
            onClick={() => {
              if (isMobile) {
                dispatch(ToggleSidebar());
              }
            }}
            spacing={2}
            direction="row"
            sx={{ cursor: isMobile ? "pointer" : "default" }}
          >
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant={current_conversation?.online ? "dot" : undefined}
            >
              <Avatar
                alt={current_conversation?.name}
                src={current_conversation?.img}
                sx={{ width: 40, height: 40 }}
              />
            </StyledBadge>

            <Stack spacing={0.2}>
              <Typography variant="subtitle2">
                {current_conversation?.name || "Unknown User"}
              </Typography>

              <Typography variant="caption">
                {current_conversation?.online
                  ? "Online"
                  : current_conversation?.lastSeen
                  ? `Last seen ${current_conversation.lastSeen}`
                  : "Offline"}
              </Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={isMobile ? 1 : 3} alignItems="center">
            <IconButton
              onClick={() => {
                if (current_conversation?.user_id) {
                  dispatch(StartVideoCall(current_conversation.user_id));
                }
              }}
              disabled={!current_conversation?.user_id}
            >
              <VideoCamera />
            </IconButton>

            <IconButton
              onClick={() => {
                if (current_conversation?.user_id) {
                  dispatch(StartAudioCall(current_conversation.user_id));
                }
              }}
              disabled={!current_conversation?.user_id}
            >
              <Phone />
            </IconButton>

            {!isMobile && (
              <IconButton>
                <MagnifyingGlass />
              </IconButton>
            )}

            <Divider orientation="vertical" flexItem />

            <IconButton
              id="conversation-menu-button"
              aria-controls={open ? "conversation-menu" : undefined}
              aria-haspopup="true"
              aria-expanded={open ? "true" : undefined}
              onClick={(event) => setAnchorEl(event.currentTarget)}
            >
              <CaretDown />
            </IconButton>

            <Menu
              id="conversation-menu"
              aria-labelledby="conversation-menu-button"
              anchorEl={anchorEl}
              open={open}
              onClose={() => setAnchorEl(null)}
              TransitionComponent={Fade}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
            >
              <Box p={1}>
                <Stack spacing={1}>
                  {Conversation_Menu.map((el) => (
                    <MenuItem
                      key={el.id}
                      onClick={() => {
                        setAnchorEl(null);
                        console.log(`Clicked: ${el.title}`);
                      }}
                    >
                      {el.title}
                    </MenuItem>
                  ))}
                </Stack>
              </Box>
            </Menu>
          </Stack>
        </Stack>
      </Box>
    </>
  );
};

export default ChatHeader;
