// src/components/Chat/PinnedMessages.js - HOÀN CHỈNH REAL-TIME
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

  const pinnedMessages =
    (chat_type === "group" ? groupPinned : directPinned) || [];

  // 🆕 HOÀN THIỆN: Hàm refetch pinned messages với useCallback
  const refetchPinnedMessages = useCallback(async () => {
    if (!room_id || !keycloak?.subject) return;

    try {
      setIsLoading(true);
      console.log("🔄 Refetching pinned messages for room:", room_id);

      await dispatch(fetchPinnedMessages(room_id, chat_type)).unwrap();

      console.log("✅ Pinned messages refetched successfully");
    } catch (error) {
      console.error("❌ Error refetching pinned messages:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to refresh pinned messages",
        })
      );
    } finally {
      setIsLoading(false);
    }
  }, [room_id, keycloak?.subject, dispatch, chat_type]);

  // 🆕 HOÀN THIỆN: Socket listeners cho real-time updates
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

      // 🆕 CẬP NHẬT NGAY LẬP TỨC NẾU CÓ DANH SÁCH MỚI
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
        // Refetch nếu không có danh sách mới
        refetchPinnedMessages();
      }

      // 🆕 CẬP NHẬT TRẠNG THÁI PIN TRONG MESSAGE
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

      // 🆕 CẬP NHẬT NGAY LẬP TỨC NẾU CÓ DANH SÁCH MỚI
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
        // Refetch nếu không có danh sách mới
        refetchPinnedMessages();
      }

      // 🆕 CẬP NHẬT TRẠNG THÁI PIN TRONG MESSAGE
      dispatch(
        updateMessagePinnedStatus({
          messageId: data.messageId,
          isPinned: false,
          chatType: data.chatType,
        })
      );
    };

    const handlePinnedMessagesUpdated = (data) => {
      console.log("📌 Socket: Pinned messages updated", data);

      if (data.roomId === room_id && data.chatType === chat_type) {
        // 🆕 CẬP NHẬT DANH SÁCH PINNED MESSAGES TỪ SERVER
        dispatch(
          setPinnedMessages({
            messages: data.pinnedMessages || [],
            chatType: chat_type,
          })
        );

        // 🆕 CẬP NHẬT TRẠNG THÁI PIN CHO MESSAGE CỤ THỂ
        if (data.action === "pin") {
          dispatch(
            updateMessagePinnedStatus({
              messageId: data.messageId,
              isPinned: true,
              chatType: data.chatType,
            })
          );
        } else if (data.action === "unpin") {
          dispatch(
            updateMessagePinnedStatus({
              messageId: data.messageId,
              isPinned: false,
              chatType: data.chatType,
            })
          );
        }
      }
    };

    // 🆕 THÊM: Listener cho pin response
    const handlePinResponse = (data) => {
      console.log("📌 Socket: Pin response", data);

      if (data.status === "success" && data.data?.pinnedMessages) {
        // Cập nhật danh sách từ response
        dispatch(
          setPinnedMessages({
            messages: data.data.pinnedMessages,
            chatType: chat_type,
          })
        );
      }
    };

    const handleUnpinResponse = (data) => {
      console.log("📌 Socket: Unpin response", data);

      if (data.status === "success" && data.data?.pinnedMessages) {
        // Cập nhật danh sách từ response
        dispatch(
          setPinnedMessages({
            messages: data.data.pinnedMessages,
            chatType: chat_type,
          })
        );
      }
    };

    // Đăng ký socket listeners
    currentSocket.on("message_pinned", handleMessagePinned);
    currentSocket.on("message_unpinned", handleMessageUnpinned);
    currentSocket.on("pinned_messages_updated", handlePinnedMessagesUpdated);
    currentSocket.on("pin_message_response", handlePinResponse);
    currentSocket.on("unpin_message_response", handleUnpinResponse);

    // Cleanup
    return () => {
      if (currentSocket) {
        currentSocket.off("message_pinned", handleMessagePinned);
        currentSocket.off("message_unpinned", handleMessageUnpinned);
        currentSocket.off(
          "pinned_messages_updated",
          handlePinnedMessagesUpdated
        );
        currentSocket.off("pin_message_response", handlePinResponse);
        currentSocket.off("unpin_message_response", handleUnpinResponse);
      }
    };
  }, [dispatch, room_id, chat_type, refetchPinnedMessages]);

  // 🆕 HOÀN THIỆN: Auto refetch khi room thay đổi
  useEffect(() => {
    if (room_id && keycloak?.subject) {
      console.log("🔄 Initial fetch pinned messages for room:", room_id);
      refetchPinnedMessages();
    }
  }, [room_id, keycloak?.subject, refetchPinnedMessages]);

  // 🆕 HOÀN THIỆN: Hàm unpin message
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

    console.log("📌 Unpinning message:", {
      messageId,
      socketEvent,
      socketData,
    });

    try {
      setIsLoading(true);

      // 🆕 OPTIMISTIC UPDATE: Cập nhật UI ngay lập tức
      dispatch(unpinMessage({ messageId, chatType: chat_type }));
      dispatch(
        updateMessagePinnedStatus({
          messageId,
          isPinned: false,
          chatType: chat_type,
        })
      );

      socket.emit(socketEvent, socketData, (response) => {
        console.log("📌 Unpin response:", response);

        if (response.status === "success") {
          dispatch(
            showSnackbar({
              severity: "success",
              message: "Message unpinned successfully",
            })
          );

          // 🆕 CẬP NHẬT DANH SÁCH TỪ RESPONSE NẾU CÓ
          if (response.data?.pinnedMessages) {
            dispatch(
              setPinnedMessages({
                messages: response.data.pinnedMessages,
                chatType: chat_type,
              })
            );
          } else {
            // Refetch để đảm bảo đồng bộ
            refetchPinnedMessages();
          }
        } else {
          // 🆕 ROLLBACK NẾU LỖI
          dispatch(
            showSnackbar({
              severity: "error",
              message: response.message || "Failed to unpin message",
            })
          );
          // Rollback optimistic update bằng cách refetch
          refetchPinnedMessages();
        }
      });
    } catch (error) {
      console.error("❌ Error unpinning message:", error);
      // Rollback optimistic update
      refetchPinnedMessages();
    } finally {
      setIsLoading(false);
    }
  };

  // 🆕 HOÀN THIỆN: Hàm scroll to message
  const handleScrollToMessage = (messageId) => {
    console.log(
      "🔍 Searching for message element with ID:",
      `message-${messageId}`
    );

    const messageElement = document.getElementById(`message-${messageId}`);
    if (messageElement) {
      messageElement.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      // Highlight effect
      messageElement.style.backgroundColor = "rgba(255, 235, 59, 0.3)";
      messageElement.style.transition = "background-color 0.5s ease";

      setTimeout(() => {
        messageElement.style.backgroundColor = "";
      }, 2000);
    } else {
      console.warn("❌ Message element not found for ID:", messageId);
      dispatch(
        showSnackbar({
          severity: "warning",
          message:
            "Message not found in current view. Scroll to see more messages.",
        })
      );
    }
  };

  // 🆕 HOÀN THIỆN: Format message content
  const getMessageContent = (message) => {
    if (message.message) return message.message;
    if (message.content) return message.content;

    // Xử lý các loại message khác
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

  // 🆕 HOÀN THIỆN: Format time
  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    try {
      const date = new Date(timestamp);
      return (
        date.toLocaleDateString() +
        " " +
        date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
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
        mx: 2,
        mt: 1,
        mb: 1,
        p: 1.5,
        backgroundColor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <Stack spacing={1.5}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PinIcon sx={{ fontSize: 18, color: "primary.main" }} />
          <Typography variant="subtitle2" fontWeight="bold">
            Pinned Messages ({pinnedMessages.length})
          </Typography>
          {isLoading && <CircularProgress size={16} />}
        </Box>

        <Divider />

        <Stack spacing={1}>
          {pinnedMessages.map((message) => (
            <Box
              key={message._id}
              sx={{
                display: "flex",
                alignItems: "flex-start",
                gap: 1.5,
                p: 1.5,
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
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  fontWeight="500"
                >
                  {message.sender?.name || "Unknown User"}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    mt: 0.5,
                  }}
                >
                  {getMessageContent(message)}
                </Typography>
                {message.pinnedAt && (
                  <Typography
                    variant="caption"
                    color="text.disabled"
                    sx={{ mt: 0.5, display: "block" }}
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
                    }}
                  >
                    <LaunchIcon sx={{ fontSize: 16 }} />
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
                    }}
                  >
                    <CloseIcon sx={{ fontSize: 16 }} />
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
