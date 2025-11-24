// src/components/Chat/PinnedMessages.js - ĐÃ ĐIỀU CHỈNH CHIỀU RỘNG
import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  IconButton,
  Stack,
  Paper,
  Divider,
  Tooltip,
  CircularProgress,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import {
  PushPin as PinIcon,
  Close as CloseIcon,
  Launch as LaunchIcon,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";
import {
  unpinMessage,
  setPinnedMessages,
  updateMessagePinnedStatus,
  fetchPinnedMessages,
} from "../../redux/slices/conversation";
import { showSnackbar } from "../../redux/slices/app";
import { useKeycloak } from "@react-keycloak/web";

const PinnedMessages = () => {
  const dispatch = useDispatch();
  const { keycloak } = useKeycloak();
  const { chat_type, room_id } = useSelector((state) => state.app);
  const { pinned_messages: directPinned = [] } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { pinned_messages: groupPinned = [] } = useSelector(
    (state) => state.conversation.group_chat
  );
  const [isLoading, setIsLoading] = useState(false);
  const [socket, setSocket] = useState(null);

  // 🆕 THÊM: Responsive design
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const isTablet = useMediaQuery(theme.breakpoints.down("md"));

  const pinnedMessages =
    (chat_type === "group" ? groupPinned : directPinned) || [];

  // 🆕 SỬA: Hàm refetch pinned messages
  const refetchPinnedMessages = useCallback(async () => {
    if (!room_id || !keycloak?.subject) {
      console.log("❌ Missing room_id or keycloak subject");
      return;
    }

    try {
      setIsLoading(true);
      console.log("🔄 Refetching pinned messages for room:", room_id);
      await dispatch(fetchPinnedMessages(room_id, chat_type));
      console.log("✅ Pinned messages refetched successfully");
    } catch (error) {
      console.error("❌ Error refetching pinned messages:", error);
      if (
        !error.message?.includes("cancel") &&
        !error.message?.includes("abort")
      ) {
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Failed to refresh pinned messages",
          })
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [room_id, chat_type, dispatch, keycloak?.subject]);

  // Socket listeners và các hàm khác giữ nguyên...
  useEffect(() => {
    const currentSocket = window.socket;
    if (!currentSocket) {
      console.log("❌ Socket not available for real-time updates");
      return;
    }

    setSocket(currentSocket);
    console.log("🔌 Setting up socket listeners for pinned messages");

    const handleMessagePinned = (data) => {
      console.log("📌 Socket: Message pinned real-time", data);
      if (
        data.pinnedMessages &&
        data.roomId === room_id &&
        data.chatType === chat_type
      ) {
        dispatch(
          setPinnedMessages({
            messages: data.pinnedMessages,
            chatType: chat_type,
          })
        );
      } else {
        refetchPinnedMessages();
      }
      dispatch(
        updateMessagePinnedStatus({
          messageId: data.messageId,
          isPinned: true,
          chatType: data.chatType,
        })
      );
    };

    const handleMessageUnpinned = (data) => {
      console.log("📌 Socket: Message unpinned real-time", data);
      if (
        data.pinnedMessages &&
        data.roomId === room_id &&
        data.chatType === chat_type
      ) {
        dispatch(
          setPinnedMessages({
            messages: data.pinnedMessages,
            chatType: chat_type,
          })
        );
      } else {
        refetchPinnedMessages();
      }
      dispatch(
        updateMessagePinnedStatus({
          messageId: data.messageId,
          isPinned: false,
          chatType: data.chatType,
        })
      );
    };

    // Đăng ký socket listeners
    currentSocket.on("message_pinned", handleMessagePinned);
    currentSocket.on("message_unpinned", handleMessageUnpinned);

    return () => {
      if (currentSocket) {
        currentSocket.off("message_pinned", handleMessagePinned);
        currentSocket.off("message_unpinned", handleMessageUnpinned);
      }
    };
  }, [dispatch, room_id, chat_type, refetchPinnedMessages]);

  useEffect(() => {
    if (room_id && keycloak?.subject) {
      console.log("🔄 Initial fetch pinned messages for room:", room_id);
      refetchPinnedMessages();
    }
  }, [room_id, keycloak?.subject, refetchPinnedMessages]);

  const handleUnpin = async (messageId) => {
    if (!socket) {
      console.error("❌ Socket not available");
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Socket connection not available",
        })
      );
      return;
    }

    const socketEvent =
      chat_type === "group" ? "unpin_group_message" : "unpin_direct_message";
    const socketData =
      chat_type === "group" ? { messageId, roomId: room_id } : { messageId };

    try {
      setIsLoading(true);
      dispatch(unpinMessage({ messageId, chatType: chat_type }));
      dispatch(
        updateMessagePinnedStatus({
          messageId,
          isPinned: false,
          chatType: chat_type,
        })
      );

      socket.emit(socketEvent, socketData, (response) => {
        if (response.status === "success") {
          dispatch(
            showSnackbar({
              severity: "success",
              message: "Message unpinned successfully",
            })
          );
          if (response.data?.pinnedMessages) {
            dispatch(
              setPinnedMessages({
                messages: response.data.pinnedMessages,
                chatType: chat_type,
              })
            );
          } else {
            refetchPinnedMessages();
          }
        } else {
          dispatch(
            showSnackbar({
              severity: "error",
              message: response.message || "Failed to unpin message",
            })
          );
          refetchPinnedMessages();
        }
      });
    } catch (error) {
      console.error("❌ Error unpinning message:", error);
      refetchPinnedMessages();
    } finally {
      setIsLoading(false);
    }
  };

  const handleScrollToMessage = (messageId) => {
    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      messageElement.style.backgroundColor = "rgba(255, 235, 59, 0.3)";
      messageElement.style.transition = "background-color 0.5s ease";
      setTimeout(() => {
        messageElement.style.backgroundColor = "";
      }, 2000);
    } else {
      dispatch(
        showSnackbar({
          severity: "warning",
          message:
            "Message not found in current view. Scroll to see more messages.",
        })
      );
    }
  };

  const getMessageContent = (message) => {
    if (message.message) return message.message;
    if (message.content) return message.content;
    switch (message.subtype) {
      case "img":
        return "📷 Image";
      case "doc":
        return "📄 Document";
      case "Link":
        return "🔗 Link";
      case "reply":
        return "↩️ Reply";
      default:
        return "📎 Media message";
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      );
    } catch (error) {
      return "";
    }
  };

  if (!pinnedMessages || pinnedMessages.length === 0) {
    return null;
  }

  return (
    <Paper
      elevation={1}
      sx={{
        // 🆕 ĐIỀU CHỈNH CHIỀU RỘNG
        mx: isMobile ? 1 : 2,
        mt: 1,
        mb: 1,
        p: isMobile ? 1 : 1.5,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        // 🆕 GIỚI HẠN CHIỀU RỘNG TỐI ĐA
        maxWidth: "100%",
        width: "auto",
        // 🆕 ĐẢM BẢO KHÔNG VƯỢT QUÁ CHIỀU RỘNG CONTAINER
        boxSizing: "border-box",
      }}
    >
      <Stack spacing={1.5}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PinIcon
            sx={{
              fontSize: isMobile ? 16 : 18,
              color: "primary.main",
            }}
          />
          <Typography
            variant={isMobile ? "caption" : "subtitle2"}
            fontWeight="bold"
            sx={{
              // 🆕 XỬ LÝ TEXT TRÀN TRÊN MOBILE
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            Pinned Messages ({pinnedMessages.length})
          </Typography>
          {isLoading && <CircularProgress size={isMobile ? 14 : 16} />}
        </Box>

        <Divider />

        <Stack spacing={1}>
          {pinnedMessages.map((message) => (
            <Box
              key={message._id}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: isMobile ? 1 : 1.5,
                p: isMobile ? 1 : 1.5,
                borderRadius: 1.5,
                backgroundColor: "action.hover",
                border: "1px solid",
                borderColor: "divider",
                transition: "all 0.2s ease",
                "&:hover": {
                  backgroundColor: "action.selected",
                  transform: "translateY(-1px)",
                  boxShadow: 1,
                },
                // 🆕 ĐẢM BẢO KHÔNG VƯỢT QUÁ CHIỀU RỘNG
                maxWidth: "100%",
                overflow: "hidden",
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minWidth: 0,
                  // 🆕 GIỚI HẠN CHIỀU RỘNG NỘI DUNG
                  maxWidth: "calc(100% - 80px)",
                }}
              >
                <Typography
                  variant={isMobile ? "caption" : "caption"}
                  color="text.secondary"
                  fontWeight="500"
                  sx={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {message.sender?.name || "Unknown User"}
                </Typography>
                <Typography
                  variant={isMobile ? "caption" : "body2"}
                  sx={{
                    // 🆕 CẢI THIỆN HIỂN THỊ NỘI DUNG DÀI
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    mt: 0.5,
                    display: "block",
                    // 🆕 ĐẢM BẢO KHÔNG TRÀN
                    maxWidth: "100%",
                  }}
                >
                  {getMessageContent(message)}
                </Typography>
                {message.pinnedAt && (
                  <Typography
                    variant={isMobile ? "caption" : "caption"}
                    color="text.disabled"
                    sx={{
                      mt: 0.5,
                      display: "block",
                      fontSize: isMobile ? "0.7rem" : "0.75rem",
                    }}
                  >
                    Pinned {formatTime(message.pinnedAt)}
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={0.5}>
                <Tooltip title="Go to message">
                  <IconButton
                    size="small"
                    onClick={() => handleScrollToMessage(message._id)}
                    disabled={isLoading}
                    sx={{
                      color: "primary.main",
                      "&:hover": {
                        backgroundColor: "primary.light",
                        color: "primary.contrastText",
                      },
                      // 🆕 ĐIỀU CHỈNH KÍCH THƯỚC CHO MOBILE
                      minWidth: "auto",
                      padding: isMobile ? "4px" : "8px",
                    }}
                  >
                    <LaunchIcon sx={{ fontSize: isMobile ? 14 : 16 }} />
                  </IconButton>
                </Tooltip>

                <Tooltip title="Unpin message">
                  <IconButton
                    size="small"
                    onClick={() => handleUnpin(message._id)}
                    disabled={isLoading}
                    sx={{
                      color: "error.main",
                      "&:hover": {
                        backgroundColor: "error.light",
                        color: "error.contrastText",
                      },
                      // 🆕 ĐIỀU CHỈNH KÍCH THƯỚC CHO MOBILE
                      minWidth: "auto",
                      padding: isMobile ? "4px" : "8px",
                    }}
                  >
                    <CloseIcon sx={{ fontSize: isMobile ? 14 : 16 }} />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Paper>
  );
};

export default PinnedMessages;
