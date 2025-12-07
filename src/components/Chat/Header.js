// ChatHeader.js - VERSION MỚI SỬ DỤNG HOOKS & SERVICES THAY CONTEXT
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
import { getSocket } from "../../socket";
import { useAutoE2EE, useE2EEStatus } from "../../e2ee";
import { initiateKeyExchange } from "../../e2ee/services/keyExchangeService";

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

// E2EE Indicator Component
const E2EEIndicator = ({ isEncrypted, hasError, isDisabled }) => {
  const theme = useTheme();

  if (isDisabled) {
    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: theme.palette.grey[300],
        }}
      >
        <Lock size={12} color={theme.palette.grey[600]} />
      </Box>
    );
  }

  if (hasError) {
    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: theme.palette.error.light,
          animation: "pulse 2s infinite",
          "@keyframes pulse": {
            "0%": {
              opacity: 1,
            },
            "50%": {
              opacity: 0.5,
            },
            "100%": {
              opacity: 1,
            },
          },
        }}
      >
        <Lock size={12} color={theme.palette.error.contrastText} />
      </Box>
    );
  }

  if (isEncrypted) {
    return (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: theme.palette.success.light,
        }}
      >
        <Lock size={12} color={theme.palette.success.contrastText} />
      </Box>
    );
  }

  // Not encrypted but ready
  return (
    <Box
      sx={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 20,
        height: 20,
        borderRadius: "50%",
        backgroundColor: theme.palette.warning.light,
      }}
    >
      <Lock size={12} color={theme.palette.warning.contrastText} />
    </Box>
  );
};

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

  // Lấy user info từ auth state
  const { user_id, user, token } = useSelector((state) => state.auth);
  const currentUserId = user_id || user?.keycloakId;

  // 🆕 Sử dụng hook auto E2EE
  const {
    isReady: autoServiceReady,
    myFingerprint,
    error: autoServiceError,
    encryptMessage,
    decryptMessage,
    canEncryptTo,
    syncKeys,
    getStats,
  } = useAutoE2EE();

  // 🆕 Sử dụng hook E2EE status cho peer hiện tại
  const friendId = current_conversation?.user_id;
  // Header.js - Sửa phần sử dụng hook
  // Line 243 và các vị trí sử dụng useE2EEStatus

  const {
    status: e2eeStatus,
    isEncrypted,
    hasPeerKey,
    peerFingerprint,
    needsDerivation,
    needsKeyExchange,
    isChecking,
    checkStatus: refreshE2EEStatus,
    deriveSecret,
    resetAttempts,
  } = useE2EEStatus(friendId, {
    autoCheck: true,
    checkInterval: 30000,
  });

  // Kiểm tra socket connection
  const socket = useSelector((state) => state.app.socket);
  const isSocketConnected = socket?.connected || false;

  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const [peerKeyStatus, setPeerKeyStatus] = React.useState(null);
  const [isCheckingPeerKey, setIsCheckingPeerKey] = React.useState(false);

  // Xác định loại chat hiện tại
  const isGroupChat = Boolean(current_room?.id);
  const isDirectChat = Boolean(current_conversation?.id);
  const currentChat = isGroupChat ? current_room : current_conversation;
  const menuItems = isGroupChat
    ? Group_Conversation_Menu
    : Direct_Conversation_Menu;

  // Kiểm tra peer key khi có friendId
  React.useEffect(() => {
    const checkPeerKey = async () => {
      if (!friendId || !autoServiceReady) return;

      setIsCheckingPeerKey(true);
      try {
        const result = await canEncryptTo(friendId);
        setPeerKeyStatus(result);
      } catch (error) {
        console.error("❌ Failed to check peer key:", error);
        setPeerKeyStatus({
          canEncrypt: false,
          hasKey: false,
          error: error.message,
        });
      } finally {
        setIsCheckingPeerKey(false);
      }
    };

    checkPeerKey();
  }, [friendId, autoServiceReady, canEncryptTo]);

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

    if (!autoServiceReady) {
      return "End-to-End Encryption service is initializing...";
    }

    if (autoServiceError) {
      return `E2EE service error: ${autoServiceError}`;
    }

    if (!friendId) {
      return "No conversation selected";
    }

    if (isChecking) {
      return "Checking encryption status...";
    }

    if (!peerKeyStatus?.hasKey) {
      return "Friend's public key not available. They need to enable E2EE first.";
    }

    if (needsDerivation) {
      return "Key derivation needed. Click 'Derive Keys' to establish secure connection.";
    }

    if (isEncrypted) {
      return "Messages in this chat are End-to-End Encrypted. Only you and your friend can read them.";
    }

    return "Encryption not established. Click 'Initiate Exchange' to start.";
  };

  // 🆕 Get short E2EE status text for inline display
  const getShortE2EEStatusText = () => {
    if (isGroupChat) return "";

    if (!autoServiceReady) return "Initializing...";
    if (autoServiceError) return "E2EE Error";
    if (isChecking || isCheckingPeerKey) return "Checking...";
    if (!peerKeyStatus?.hasKey) return "No friend key";
    if (needsDerivation) return "Needs derivation";
    if (isEncrypted) return "Encrypted";
    return "Not encrypted";
  };

  // Kiểm tra có chat nào active không
  const hasActiveChat = isGroupChat || isDirectChat;

  // 🆕 Handle initiate key exchange
  const handleInitiateKeyExchange = async () => {
    if (!friendId) {
      console.error("❌ No friend ID available");
      dispatch(
        showSnackbar({
          severity: "error",
          message: "No friend selected",
        })
      );
      return;
    }

    try {
      dispatch(
        showSnackbar({
          severity: "info",
          message: "Initiating key exchange...",
        })
      );

      const result = await initiateKeyExchange(friendId);

      if (result.success) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Key exchange initiated successfully",
          })
        );

        // Refresh status after a delay
        setTimeout(() => {
          refreshE2EEStatus(true);
        }, 2000);
      } else {
        dispatch(
          showSnackbar({
            severity: "error",
            message: `Failed to initiate exchange: ${result.error}`,
          })
        );
      }
    } catch (error) {
      console.error("❌ Error initiating key exchange:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Failed to initiate key exchange: ${error.message}`,
        })
      );
    }
  };

  // 🆕 Handle key derivation
  const handleDeriveKeys = async () => {
    if (!friendId) return;

    try {
      const result = await deriveSecret();
      if (result.success) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Keys derived successfully",
          })
        );
        refreshE2EEStatus(true);
      } else {
        dispatch(
          showSnackbar({
            severity: "warning",
            message: result.reason || "Derivation needed",
          })
        );
      }
    } catch (error) {
      console.error("❌ Error deriving keys:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to derive keys",
        })
      );
    }
  };

  // 🆕 Test encryption (for debugging)
  const handleTestEncryption = async () => {
    if (!friendId || !autoServiceReady) return;

    try {
      const testMessage = "Test encryption message";
      const result = await encryptMessage(testMessage, friendId);

      if (result.success) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Encryption test successful",
          })
        );
      } else {
        dispatch(
          showSnackbar({
            severity: "error",
            message: `Encryption failed: ${result.error}`,
          })
        );
      }
    } catch (error) {
      console.error("❌ Test encryption error:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Test encryption failed",
        })
      );
    }
  };

  // 🆕 Handle sync keys
  const handleSyncKeys = async () => {
    try {
      const result = await syncKeys();
      if (result.success) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Keys synced successfully",
          })
        );
        refreshE2EEStatus(true);
      } else {
        dispatch(
          showSnackbar({
            severity: "warning",
            message: `Sync incomplete: ${result.error}`,
          })
        );
      }
    } catch (error) {
      console.error("❌ Sync error:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to sync keys",
        })
      );
    }
  };

  // Handle start audio call
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
      const socket = getSocket();
      console.log("📞 Starting audio call to:", {
        toUserId,
        fromUserId: user_id,
        socketConnected: socket?.connected,
        socketId: socket?.id,
      });

      if (!socket || !socket.connected) {
        console.error("❌ Socket not connected");
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Connection lost. Please refresh the page.",
          })
        );
        return;
      }

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

  // Handle start video call
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
            isDirectChat && isEncrypted
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
                }}
                sx={{
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
                        <E2EEIndicator
                          isEncrypted={isEncrypted}
                          hasError={!!autoServiceError}
                          isDisabled={!autoServiceReady}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            fontSize: "0.65rem",
                            color: isEncrypted
                              ? theme.palette.success.main
                              : autoServiceError
                              ? theme.palette.error.main
                              : needsDerivation || needsKeyExchange
                              ? theme.palette.warning.main
                              : theme.palette.text.secondary,
                          }}
                        >
                          {getShortE2EEStatusText()}
                        </Typography>
                      </Stack>
                    </Tooltip>
                  </>
                )}
              </Stack>

              {/* 🆕 Action buttons cho E2EE khi cần */}
              {isDirectChat && friendId && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={0.5}
                  sx={{ mt: 0.2 }}
                >
                  {/* Nút Initiate Exchange khi chưa có key */}
                  {!peerKeyStatus?.hasKey && autoServiceReady && (
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
                      Initiate Exchange
                    </Button>
                  )}

                  {/* Nút Derive Keys khi có key nhưng chưa encrypted */}
                  {peerKeyStatus?.hasKey && needsDerivation && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleDeriveKeys}
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
                      Derive Keys
                    </Button>
                  )}

                  {/* Nút Sync Keys khi có lỗi */}
                  {autoServiceError && (
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={handleSyncKeys}
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
                      Sync Keys
                    </Button>
                  )}
                </Stack>
              )}
            </Stack>
          </Stack>

          <Stack direction="row" spacing={isMobile ? 1 : 3} alignItems="center">
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

                  {/* 🆕 Debug menu items for E2EE */}
                  {isDirectChat && friendId && (
                    <>
                      <Divider />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        px={2}
                      >
                        E2EE Debug
                      </Typography>
                      <MenuItem
                        onClick={() => {
                          setAnchorEl(null);
                          refreshE2EEStatus(true);
                        }}
                      >
                        Refresh E2EE Status
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          setAnchorEl(null);
                          handleTestEncryption();
                        }}
                      >
                        Test Encryption
                      </MenuItem>
                      <MenuItem
                        onClick={() => {
                          setAnchorEl(null);
                          handleSyncKeys();
                        }}
                      >
                        Sync All Keys
                      </MenuItem>
                    </>
                  )}
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
