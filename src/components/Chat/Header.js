import React from "react";
import {
  Avatar,
  Badge,
  Box,
  Chip,
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
import {
  CaretDown,
  MagnifyingGlass,
  Phone,
  VideoCamera,
  Users,
} from "phosphor-react";
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

const GroupBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    fontSize: "0.6rem",
    height: 16,
    minWidth: 16,
    padding: "0 4px",
  },
}));

// Menu items for different conversation types
const Direct_Conversation_Menu = [
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

const Group_Conversation_Menu = [
  {
    id: 1,
    title: "Group info",
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
    title: "Exit group",
  },
  {
    id: 5,
    title: "Report group",
  },
];

const ChatHeader = () => {
  const dispatch = useDispatch();
  const isMobile = useResponsive("between", "md", "xs", "sm");
  const theme = useTheme();

  // Lấy cả direct conversation và group room từ state
  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { current_room } = useSelector(
    (state) => state.conversation.group_chat
  );

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  // Debug current conversations
  React.useEffect(() => {
    console.log("🔍 ChatHeader - current_conversation:", current_conversation);
    console.log("🔍 ChatHeader - current_room:", current_room);
  }, [current_conversation, current_room]);

  // Xác định loại chat hiện tại
  const isGroupChat = Boolean(current_room?.id);
  const isDirectChat = Boolean(current_conversation?.id);
  const currentChat = isGroupChat ? current_room : current_conversation;
  const menuItems = isGroupChat
    ? Group_Conversation_Menu
    : Direct_Conversation_Menu;

  // Lấy thông tin avatar
  const getChatAvatar = () => {
    if (isGroupChat) {
      return (
        current_room?.img ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          current_room?.name || "Group"
        )}&background=random`
      );
    } else {
      return (
        current_conversation?.img ||
        `https://i.pravatar.cc/150?u=${current_conversation?.user_id}`
      );
    }
  };

  // Lấy tên chat
  const getChatName = () => {
    if (isGroupChat) {
      return current_room?.name || "Unnamed Group";
    } else if (isDirectChat) {
      return current_conversation?.name || "Unknown User";
    }
    return "";
  };

  // Lấy trạng thái
  const getStatusText = () => {
    if (isGroupChat) {
      const membersCount = current_room?.membersCount || 0;
      const onlineCount = current_room?.onlineMembers || 0;
      return `${membersCount} members • ${onlineCount} online`;
    } else if (isDirectChat) {
      return current_conversation?.online
        ? "Online"
        : current_conversation?.lastSeen
        ? `Last seen ${current_conversation.lastSeen}`
        : "Offline";
    }
    return "";
  };

  // Kiểm tra có chat nào active không
  const hasActiveChat = isGroupChat || isDirectChat;

  // Nếu không có conversation nào active, hiển thị placeholder
  if (!hasActiveChat) {
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
            {isGroupChat ? (
              <GroupBadge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                badgeContent={<Users size={10} />}
              >
                <Avatar
                  alt={getChatName()}
                  src={getChatAvatar()}
                  sx={{ width: 40, height: 40 }}
                >
                  {getChatName().charAt(0)}
                </Avatar>
              </GroupBadge>
            ) : (
              <StyledBadge
                overlap="circular"
                anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                variant={current_conversation?.online ? "dot" : undefined}
              >
                <Avatar
                  alt={getChatName()}
                  src={getChatAvatar()}
                  sx={{ width: 40, height: 40 }}
                />
              </StyledBadge>
            )}

            <Stack spacing={0.2}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Typography variant="subtitle2">{getChatName()}</Typography>
                {isGroupChat && (
                  <Chip
                    label="Group"
                    size="small"
                    color="primary"
                    variant="outlined"
                    sx={{ height: 20, fontSize: "0.6rem" }}
                  />
                )}
              </Stack>

              <Typography variant="caption" color="text.secondary">
                {getStatusText()}
              </Typography>
            </Stack>
          </Stack>

          <Stack direction="row" spacing={isMobile ? 1 : 3} alignItems="center">
            {/* Video call - only for direct chats */}
            {!isGroupChat && isDirectChat && (
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
            )}

            {/* Audio call - only for direct chats */}
            {!isGroupChat && isDirectChat && (
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
            )}

            {/* Group call options */}
            {isGroupChat && (
              <IconButton
                onClick={() => {
                  // TODO: Implement group call functionality
                  console.log("Start group call");
                }}
              >
                <VideoCamera />
              </IconButton>
            )}

            {/* Search icon for both types */}
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
                  {menuItems.map((el) => (
                    <MenuItem
                      key={el.id}
                      onClick={() => {
                        setAnchorEl(null);
                        console.log(`Clicked: ${el.title}`, {
                          isGroupChat,
                          chatId: currentChat.id,
                        });
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
