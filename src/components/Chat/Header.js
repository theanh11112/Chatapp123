// ChatHeader.js - HOÀN THIỆN VỚI E2EE INTEGRATION & FIXED UI
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
  Tooltip,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  CaretDown,
  MagnifyingGlass,
  Phone,
  VideoCamera,
  Users,
  Lock,
  Key,
} from "phosphor-react";
import useResponsive from "../../hooks/useResponsive";
import { ToggleSidebar } from "../../redux/slices/app";
import { useDispatch, useSelector } from "react-redux";
import { StartAudioCall } from "../../redux/slices/audioCall";
import { StartVideoCall } from "../../redux/slices/videoCall";
import { showSnackbar } from "../../redux/slices/app";
import { getSocket, connectSocket } from "../../socket";
import { useE2EE } from "../../contexts/E2EEContext";
import E2EEIndicator from "./E2EEIndicator";

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

  // Lấy state hiện tại từ app
  const { current_conversation } = useSelector(
    (state) => state.conversation?.direct_chat || {}
  );
  const { current_room } = useSelector(
    (state) => state.conversation?.group_chat || {}
  );

  // 🆕 Lấy user info từ auth state
  const { user_id, user, token } = useSelector((state) => state.auth);
  const currentUserId = user_id || user?.keycloakId;

  // 🆕 Kiểm tra socket connection
  const socket = useSelector((state) => state.app.socket);
  const isSocketConnected = socket?.connected || false;

  // 🆕 E2EE Context
  const { e2eeEnabled, friendsE2EEStatus, initiateKeyExchange, getFriendKey } =
    useE2EE();

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);

  // Xác định loại chat hiện tại
  const isGroupChat = Boolean(current_room?.id);
  const isDirectChat = Boolean(current_conversation?.id);
  const currentChat = isGroupChat ? current_room : current_conversation;
  const menuItems = isGroupChat
    ? Group_Conversation_Menu
    : Direct_Conversation_Menu;

  // 🆕 Lấy thông tin E2EE cho conversation hiện tại
  const friendId = current_conversation?.user_id;
  const isFriendE2EEEnabled = friendsE2EEStatus[friendId] || false;
  const hasFriendKey = getFriendKey ? getFriendKey(friendId) : null;

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

  // 🆕 Get E2EE status text với thông tin chi tiết hơn
  const getE2EEStatusText = () => {
    if (isGroupChat) {
      return "Group chats do not support End-to-End Encryption";
    }

    if (!e2eeEnabled) {
      return "End-to-End Encryption is disabled for your account. Enable it in settings.";
    }

    if (!isFriendE2EEEnabled) {
      return "Your friend has End-to-End Encryption disabled. They need to enable it first.";
    }

    if (!hasFriendKey) {
      return "Key exchange required for End-to-End Encryption. Click 'Exchange' to establish secure connection.";
    }

    return "Messages in this chat are End-to-End Encrypted. Only you and your friend can read them.";
  };

  // 🆕 Get short E2EE status text for inline display
  const getShortE2EEStatusText = () => {
    if (isGroupChat) return "";

    if (!e2eeEnabled) return "E2EE disabled";
    if (!isFriendE2EEEnabled) return "Friend E2EE disabled";
    if (!hasFriendKey) return "Key exchange needed";
    return "End-to-End Encrypted";
  };

  // Kiểm tra có chat nào active không
  const hasActiveChat = isGroupChat || isDirectChat;

  // 🆕 Handle start audio call - FIXED
  const handleStartAudioCall = async () => {
    console.log("🎯 handleStartAudioCall called");

    if (!isDirectChat || !current_conversation?.user_id) {
      console.error("❌ No direct chat or user_id");
      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Cannot start audio call - no active conversation",
        })
      );
      return;
    }

    if (!user_id) {
      console.error("❌ Current user not authenticated");
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Please login to start a call",
        })
      );
      return;
    }

    const toUserId = current_conversation.user_id;

    try {
      // Kiểm tra socket connection
      const socket = getSocket();
      console.log("📞 Starting audio call to:", {
        toUserId,
        fromUserId: user_id,
        socketConnected: socket?.connected,
        socketId: socket?.id,
      });

      if (!socket || !socket.connected) {
        console.error("❌ Socket not connected, trying to reconnect...");

        // Thử reconnect socket với token
        try {
          await connectSocket(token);
          console.log("✅ Socket reconnected");
        } catch (socketError) {
          console.error("❌ Failed to reconnect socket:", socketError);
          dispatch(
            showSnackbar({
              severity: "error",
              message: "Connection lost. Please refresh the page.",
            })
          );
          return;
        }
      }

      // Start call
      const result = await dispatch(StartAudioCall(toUserId));
      console.log("✅ Audio call started successfully:", result);
    } catch (error) {
      console.error("❌ Error starting audio call:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: error.message || "Failed to start call",
        })
      );
    }
  };

  // 🆕 Handle start video call - FIXED
  const handleStartVideoCall = () => {
    console.log("🎯 handleStartVideoCall called");

    if (!isDirectChat || !current_conversation?.user_id) {
      console.error("❌ No direct chat or user_id");
      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Cannot start video call - no active conversation",
        })
      );
      return;
    }

    if (!currentUserId) {
      console.error("❌ Current user not authenticated");
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Please login to start a video call",
        })
      );
      return;
    }

    console.log("📹 Starting video call to:", {
      toUserId: current_conversation.user_id,
      fromUserId: currentUserId,
      socketConnected: isSocketConnected,
    });

    dispatch(StartVideoCall(current_conversation.user_id, "direct"))
      .then((result) => {
        console.log("✅ Video call started successfully:", result);
      })
      .catch((error) => {
        console.error("❌ Failed to start video call:", error);
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Failed to start video call. Please try again.",
          })
        );
      });
  };

  // 🆕 Handle initiate key exchange
  const handleInitiateKeyExchange = async () => {
    if (!friendId) {
      console.error("❌ No friend ID available");
      return;
    }

    try {
      const success = await initiateKeyExchange(friendId);
      if (success) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Key exchange initiated successfully",
          })
        );
      }
    } catch (error) {
      console.error("❌ Error initiating key exchange:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to initiate key exchange",
        })
      );
    }
  };

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
          borderBottom:
            isDirectChat && e2eeEnabled && isFriendE2EEEnabled && hasFriendKey
              ? `2px solid ${theme.palette.success.main}`
              : "none",
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
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                  // Điều chỉnh vị trí badge xuống dưới thêm một chút
                  vertical: "bottom",
                  horizontal: "right",
                }}
                sx={{
                  // Điều chỉnh margin để badge không bị lệch
                  "& .MuiBadge-badge": {
                    bottom: 4,
                    right: 4,
                  },
                }}
                variant={current_conversation?.online ? "dot" : undefined}
              >
                <Avatar
                  alt={getChatName()}
                  src={getChatAvatar()}
                  sx={{ width: 40, height: 40 }}
                />
              </StyledBadge>
            )}

            <Stack spacing={0.2} sx={{ justifyContent: "center" }}>
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

              <Stack direction="row" alignItems="center" spacing={1}>
                {/* Trạng thái online/offline */}
                <Typography variant="caption" color="text.secondary">
                  {getStatusText()}
                </Typography>

                {/* 🆕 E2EE status - hiển thị ngắn gọn */}
                {isDirectChat && getShortE2EEStatusText() && (
                  <>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontSize: "0.6rem" }}
                    >
                      •
                    </Typography>

                    <Tooltip title={getE2EEStatusText()} arrow placement="top">
                      <Stack direction="row" alignItems="center" spacing={0.3}>
                        {e2eeEnabled && isFriendE2EEEnabled && hasFriendKey ? (
                          <>
                            <Lock
                              size={10}
                              color={theme.palette.success.main}
                            />
                            <Typography
                              variant="caption"
                              color="success.main"
                              sx={{ fontSize: "0.65rem" }}
                            >
                              E2EE
                            </Typography>
                          </>
                        ) : e2eeEnabled &&
                          isFriendE2EEEnabled &&
                          !hasFriendKey ? (
                          <>
                            <Lock
                              size={10}
                              color={theme.palette.warning.main}
                            />
                            <Typography
                              variant="caption"
                              color="warning.main"
                              sx={{ fontSize: "0.65rem" }}
                            >
                              Needs Key
                            </Typography>
                          </>
                        ) : e2eeEnabled && !isFriendE2EEEnabled ? (
                          <>
                            <Lock
                              size={10}
                              color={theme.palette.warning.main}
                            />
                            <Typography
                              variant="caption"
                              color="warning.main"
                              sx={{ fontSize: "0.65rem" }}
                            >
                              No E2EE
                            </Typography>
                          </>
                        ) : !e2eeEnabled ? (
                          <>
                            <Lock size={10} color={theme.palette.error.main} />
                            <Typography
                              variant="caption"
                              color="error.main"
                              sx={{ fontSize: "0.65rem" }}
                            >
                              E2EE Off
                            </Typography>
                          </>
                        ) : null}
                      </Stack>
                    </Tooltip>
                  </>
                )}
              </Stack>

              {/* 🆕 Nút Exchange key khi cần - hiển thị dưới dòng status */}
              {isDirectChat &&
                e2eeEnabled &&
                isFriendE2EEEnabled &&
                !hasFriendKey && (
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={0.5}
                    sx={{ mt: 0.2 }}
                  >
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleInitiateKeyExchange}
                      sx={{
                        height: 20,
                        fontSize: "0.6rem",
                        minWidth: "auto",
                        padding: "0 8px",
                        lineHeight: 1,
                        textTransform: "none",
                      }}
                      startIcon={<Key size={10} />}
                    >
                      Exchange Keys
                    </Button>
                    <Tooltip title="Establish secure connection" arrow>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: "0.6rem" }}
                      >
                        for End-to-End Encryption
                      </Typography>
                    </Tooltip>
                  </Stack>
                )}
            </Stack>
          </Stack>

          <Stack direction="row" spacing={isMobile ? 1 : 3} alignItems="center">
            {/* 🆕 E2EE Indicator */}
            {isDirectChat && (
              <Tooltip title={getE2EEStatusText()} arrow>
                <Box>
                  <E2EEIndicator />
                </Box>
              </Tooltip>
            )}

            {/* Video call - only for direct chats */}
            {!isGroupChat && isDirectChat && (
              <Tooltip
                title={
                  !isSocketConnected ? "Connecting..." : "Start video call"
                }
                arrow
              >
                <span>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartVideoCall();
                    }}
                    disabled={!current_conversation?.user_id}
                    sx={{
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <VideoCamera />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {/* Audio call - only for direct chats */}
            {!isGroupChat && isDirectChat && (
              <Tooltip
                title={
                  !isSocketConnected ? "Connecting..." : "Start audio call"
                }
                arrow
              >
                <span>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      handleStartAudioCall();
                    }}
                    disabled={!current_conversation?.user_id}
                    sx={{
                      "&:hover": {
                        backgroundColor: theme.palette.action.hover,
                      },
                    }}
                  >
                    <Phone />
                  </IconButton>
                </span>
              </Tooltip>
            )}

            {/* Group call options */}
            {isGroupChat && (
              <Tooltip title="Group calls coming soon" arrow>
                <span>
                  <IconButton
                    disabled
                    sx={{
                      cursor: "not-allowed",
                      opacity: 0.5,
                    }}
                  >
                    <VideoCamera />
                  </IconButton>
                </span>
              </Tooltip>
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
