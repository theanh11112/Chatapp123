// src/components/Task/TaskChat.js - HOÀN CHỈNH REAL-TIME
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Paper,
  TextField,
  Button,
  Avatar,
  Typography,
  IconButton,
  CircularProgress,
  Menu,
  MenuItem,
  Chip,
  Tooltip,
  Alert,
  Collapse,
} from "@mui/material";
import {
  Send,
  MoreVert,
  Edit,
  Delete,
  Reply,
  Close,
  KeyboardArrowDown,
} from "@mui/icons-material";
import { useDispatch, useSelector } from "react-redux";

// IMPORT TASK CHAT ACTIONS
import {
  setCurrentTask,
  fetchTaskMessages,
  addTaskMessage,
  deleteTaskMessage,
  updateTaskMessage,
  clearMessages,
  clearError,
} from "../../redux/slices/taskChat";

// IMPORT GLOBAL SOCKET
import { getSocket } from "../../socket";

const TaskChat = ({ task, currentUser, onClose }) => {
  const dispatch = useDispatch();

  // LẤY GLOBAL SOCKET
  const socket = getSocket();

  // LẤY STATE TỪ TASKCHAT REDUX
  const {
    messages,
    current_task,
    isLoading,
    error: reduxError,
  } = useSelector((state) => state.taskChat);

  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [error, setError] = useState("");
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [lastTaskId, setLastTaskId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // 🎯 DEBUG: Theo dõi state changes
  useEffect(() => {
    console.log("📊 TaskChat State Update:", {
      messagesCount: messages.length,
      currentTask: current_task?._id,
      selectedTask: task?._id,
      isLoading,
      hasSocket: !!socket,
      socketConnected: socket?.connected,
      socketId: socket?.id,
    });
  }, [messages, current_task, task, isLoading, socket]);

  // Scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 🔄 Load messages với cache prevention
  const loadMessages = useCallback(async () => {
    if (!task?._id || !currentUser?.user_id) {
      console.log("❌ Missing task ID or user ID");
      return;
    }

    // CHỈ LOAD KHI TASK THAY ĐỔI
    if (task._id === lastTaskId) {
      console.log("✅ Same task, skipping message reload");
      return;
    }

    try {
      console.log("🔄 Task changed, loading messages for:", task._id);
      setError("");
      dispatch(clearError());

      // CLEAR MESSAGES CŨ KHI CHUYỂN TASK
      if (lastTaskId && lastTaskId !== task._id) {
        console.log("🗑️ Clearing old messages for task:", lastTaskId);
        dispatch(clearMessages());
      }

      // SET CURRENT TASK TRONG REDUX
      dispatch(setCurrentTask(task));

      // Gọi API fetch messages
      const result = await dispatch(
        fetchTaskMessages({
          taskId: task._id,
          keycloakId: currentUser.user_id,
        })
      );

      if (fetchTaskMessages.fulfilled.match(result)) {
        console.log(
          "✅ Messages loaded successfully:",
          result.payload.data?.length || 0
        );
        setLastTaskId(task._id);
      } else {
        throw new Error(result.error?.message || "Failed to load messages");
      }
    } catch (error) {
      console.error("❌ Error loading messages:", error);
      setError("Không thể tải tin nhắn");
    }
  }, [task?._id, currentUser?.user_id, dispatch, lastTaskId]);

  // 🔌 Socket connection manager
  useEffect(() => {
    if (!socket) {
      console.log("❌ No socket available");
      setIsConnected(false);
      return;
    }

    console.log("🔌 Socket status:", {
      connected: socket.connected,
      id: socket.id,
      hasTask: !!task?._id,
    });

    // Socket event listeners for connection status
    const handleConnect = () => {
      console.log("✅ Socket connected");
      setIsConnected(true);
    };

    const handleDisconnect = () => {
      console.log("❌ Socket disconnected");
      setIsConnected(false);
    };

    // Set initial connection status
    setIsConnected(socket.connected);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [socket, task?._id]);

  // 📨 Socket handlers hoàn chỉnh
  useEffect(() => {
    console.log(
      "🔌 Setting up task chat socket listeners for task:",
      task?._id
    );

    if (!socket || !task?._id) {
      console.log("❌ No socket or task ID available", {
        hasSocket: !!socket,
        hasTaskId: !!task?._id,
      });
      return;
    }

    if (!socket.connected) {
      console.log("⚠️ Socket not connected, but setting up listeners anyway");
    }

    // Join task room
    console.log("🔗 Joining task room:", task._id, socket);
    socket.emit("join_task_room", { taskId: task._id });

    // Socket event handlers
    const handleNewTaskMessage = (data) => {
      console.log("📨 REAL-TIME: New task message received:", {
        receivedTaskId: data.taskId,
        currentTaskId: task._id,
        messageId: data.message?._id,
      });

      if (data.taskId === task._id && data.message) {
        console.log("✅ Adding REAL-TIME message to state");

        // Remove any optimistic message with same content
        const optimisticMessageIndex = messages.findIndex(
          (msg) => msg.isOptimistic && msg.message === data.message.message
        );

        if (optimisticMessageIndex !== -1) {
          console.log("🔄 Replacing optimistic message with real message");
          dispatch(
            deleteTaskMessage({
              messageId: messages[optimisticMessageIndex]._id,
            })
          );
        }

        dispatch(
          addTaskMessage({
            message: data.message,
            taskId: data.taskId,
            isOptimistic: false,
          })
        );
      }
    };

    const handleTaskMessageUpdated = (data) => {
      console.log("✏️ REAL-TIME: Task message updated:", data);
      if (data.taskId === task._id && data.updatedMessage) {
        dispatch(
          updateTaskMessage({
            messageId: data.messageId,
            updatedMessage: data.updatedMessage,
          })
        );
      }
    };

    const handleTaskMessageDeleted = (data) => {
      console.log("🗑️ REAL-TIME: Task message deleted:", data);
      if (data.taskId === task._id) {
        dispatch(deleteTaskMessage({ messageId: data.messageId }));
      }
    };

    const handleTaskRoomJoined = (data) => {
      console.log("✅ Successfully joined task room:", data);
    };

    const handleError = (error) => {
      console.error("❌ Socket error:", error);
      setError(error.message || "Lỗi kết nối");
    };

    // Register socket listeners
    socket.on("new_task_message", handleNewTaskMessage);
    socket.on("task_message_updated", handleTaskMessageUpdated);
    socket.on("task_message_deleted", handleTaskMessageDeleted);
    socket.on("task_room_joined", handleTaskRoomJoined);
    socket.on("error", handleError);

    return () => {
      console.log(
        "🔌 Cleaning up task chat socket listeners for task:",
        task?._id
      );

      if (socket) {
        socket.off("new_task_message", handleNewTaskMessage);
        socket.off("task_message_updated", handleTaskMessageUpdated);
        socket.off("task_message_deleted", handleTaskMessageDeleted);
        socket.off("task_room_joined", handleTaskRoomJoined);
        socket.off("error", handleError);

        // Leave task room khi unmount
        if (task?._id) {
          socket.emit("leave_task_room", { taskId: task._id });
        }
      }
    };
  }, [socket, task?._id, dispatch, messages]);

  // 🔄 Load messages khi task hoặc user thay đổi
  useEffect(() => {
    if (task?._id && currentUser?.user_id) {
      loadMessages();
    }
  }, [task?._id, currentUser?.user_id, loadMessages]);

  // 🧹 Reset khi component unmount
  useEffect(() => {
    return () => {
      console.log("🧹 Cleaning up TaskChat component");
      setLastTaskId(null);
      setError("");
      dispatch(clearError());
    };
  }, [dispatch]);

  // 📤 Gửi tin nhắn real-time hoàn chỉnh
  const sendMessage = async () => {
    if (!newMessage.trim() || !task?._id || !currentUser?.user_id || !socket) {
      console.log("❌ Missing required data for sending message:", {
        hasMessage: !!newMessage.trim(),
        hasTask: !!task?._id,
        hasUser: !!currentUser?.user_id,
        hasSocket: !!socket,
      });
      return;
    }

    if (!socket.connected) {
      setError("Mất kết nối. Vui lòng thử lại.");
      console.log("❌ Socket not connected");
      return;
    }

    let optimisticId = null;

    try {
      setSending(true);
      setError("");
      dispatch(clearError());

      const messageData = {
        taskId: task._id,
        keycloakId: currentUser.user_id,
        message: newMessage.trim(),
        replyTo: replyingTo?._id || null,
      };

      console.log("📤 Sending REAL-TIME message via socket:", {
        taskId: task._id,
        socketId: socket.id,
        connected: socket.connected,
      });

      // Thêm optimistic message trước khi gửi
      optimisticId = `optimistic-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      const optimisticMessage = {
        _id: optimisticId,
        taskId: task._id,
        message: newMessage.trim(),
        replyTo: replyingTo,
        sender: currentUser,
        senderId: { keycloakId: currentUser.user_id },
        createdAt: new Date().toISOString(),
        isOptimistic: true,
        tempId: optimisticId,
      };

      dispatch(
        addTaskMessage({
          message: optimisticMessage,
          taskId: task._id,
          isOptimistic: true,
        })
      );

      // Gửi tin nhắn qua socket
      socket.emit("new_task_message", messageData);

      setNewMessage("");
      setReplyingTo(null);

      console.log("✅ Message sent via socket, optimistic update added");
    } catch (error) {
      console.error("❌ Error sending message:", error);
      setError(error.message || "Không thể gửi tin nhắn");

      // Remove optimistic message on error
      if (optimisticId) {
        console.log(
          "🗑️ Removing optimistic message due to error:",
          optimisticId
        );
        dispatch(deleteTaskMessage({ messageId: optimisticId }));
      }
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Context menu handlers
  const handleMenuOpen = (event, message) => {
    setMenuAnchor(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedMessage(null);
  };

  const handleReply = () => {
    setReplyingTo(selectedMessage);
    handleMenuClose();
  };

  // ✏️ Chỉnh sửa tin nhắn với socket
  const handleEdit = async () => {
    if (!selectedMessage || !task?._id || !currentUser?.user_id || !socket)
      return;

    const newMessageText = prompt(
      "Chỉnh sửa tin nhắn:",
      selectedMessage.message || selectedMessage.content
    );

    if (
      newMessageText &&
      newMessageText.trim() !==
        (selectedMessage.message || selectedMessage.content)
    ) {
      try {
        socket.emit("edit_task_message", {
          messageId: selectedMessage._id,
          taskId: task._id,
          keycloakId: currentUser.user_id,
          newMessage: newMessageText.trim(),
        });

        console.log("✅ Edit message sent via socket");
      } catch (error) {
        console.error("❌ Error editing message:", error);
        setError(error.message || "Không thể chỉnh sửa tin nhắn");
      }
    }
    handleMenuClose();
  };

  // 🗑️ Xóa tin nhắn với socket
  const handleDelete = async () => {
    if (!selectedMessage || !task?._id || !currentUser?.user_id || !socket)
      return;

    if (window.confirm("Bạn có chắc muốn xóa tin nhắn này?")) {
      try {
        socket.emit("delete_task_message", {
          messageId: selectedMessage._id,
          taskId: task._id,
          keycloakId: currentUser.user_id,
        });

        console.log("✅ Delete message sent via socket");
      } catch (error) {
        console.error("❌ Error deleting message:", error);
        setError(error.message || "Không thể xóa tin nhắn");
      }
    }
    handleMenuClose();
  };

  // 🛠️ Utility functions
  const formatTime = (dateString) => {
    try {
      return new Date(dateString).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "??:??";
    }
  };

  const formatDate = (dateString) => {
    try {
      return new Date(dateString).toLocaleDateString("vi-VN");
    } catch {
      return "??/??/????";
    }
  };

  const isMyMessage = (message) => {
    const senderKeycloakId =
      message.sender?.keycloakId || message.senderId?.keycloakId;
    return senderKeycloakId === currentUser?.user_id;
  };

  const getInitials = (user) => {
    if (!user) return "?";
    return (
      `${user?.firstName?.[0] || ""}${
        user?.lastName?.[0] || ""
      }`.toUpperCase() || "?"
    );
  };

  const getAvatarColor = (userId) => {
    if (!userId) return "#9c27b0";
    const colors = [
      "#f44336",
      "#e91e63",
      "#9c27b0",
      "#673ab7",
      "#3f51b5",
      "#2196f3",
      "#03a9f4",
      "#00bcd4",
      "#009688",
      "#4caf50",
    ];
    const index =
      userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) %
      colors.length;
    return colors[index];
  };

  const toggleHeader = () => {
    setHeaderCollapsed(!headerCollapsed);
  };

  const getSenderInfo = (message) => {
    return message.sender || message.senderId || {};
  };

  const getDisplayName = (sender) => {
    if (!sender) return "Unknown";
    if (sender.firstName || sender.lastName) {
      return `${sender.firstName || ""} ${sender.lastName || ""}`.trim();
    }
    return sender.username || "Unknown";
  };

  // Hiển thị ngày phân cách giữa các tin nhắn
  const shouldShowDate = (currentMessage, previousMessage) => {
    if (!previousMessage) return true;
    try {
      const currentDate = new Date(currentMessage.createdAt).toDateString();
      const previousDate = new Date(previousMessage.createdAt).toDateString();
      return currentDate !== previousDate;
    } catch {
      return false;
    }
  };

  // Xử lý đóng error
  const handleCloseError = () => {
    setError("");
    dispatch(clearError());
  };

  return (
    <Paper
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: 0,
        overflow: "hidden",
      }}
    >
      {/* Header - CÓ THỂ ẨN/HIỆN */}
      <Collapse in={!headerCollapsed}>
        <Box
          sx={{
            p: 1.5,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "primary.main",
            color: "white",
            minHeight: "60px",
          }}
        >
          <Box sx={{ minWidth: 0, flex: 1, mr: 1 }}>
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                fontSize: { xs: "1rem", sm: "1.1rem" },
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.2,
              }}
            >
              💬 {task?.title}
              {!isConnected && (
                <Chip
                  label="Đang kết nối..."
                  size="small"
                  color="warning"
                  sx={{ ml: 1, height: 20, fontSize: "0.6rem" }}
                />
              )}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                opacity: 0.8,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "block",
                lineHeight: 1.2,
              }}
            >
              {isLoading
                ? "Đang tải tin nhắn..."
                : `Tin nhắn: ${
                    messages.length
                  } | Task ID: ${task?._id?.substring(0, 8)}...`}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            {onClose && (
              <IconButton
                onClick={onClose}
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                <Close />
              </IconButton>
            )}
            <IconButton
              onClick={toggleHeader}
              sx={{
                color: "white",
                "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
              }}
            >
              <KeyboardArrowDown />
            </IconButton>
          </Box>
        </Box>
      </Collapse>

      {/* Nút hiện header khi bị ẩn */}
      {headerCollapsed && (
        <Box
          sx={{
            p: 1,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "grey.100",
            cursor: "pointer",
            "&:hover": { bgcolor: "grey.200" },
          }}
          onClick={toggleHeader}
        >
          <Typography
            variant="body2"
            sx={{
              fontWeight: "medium",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            💬 {task?.title} {isLoading ? "(Đang tải...)" : ""}
            {!isConnected && " (Đang kết nối...)"}
          </Typography>
          <KeyboardArrowDown fontSize="small" />
        </Box>
      )}

      {/* Messages Container */}
      <Box
        ref={messagesContainerRef}
        sx={{
          flex: 1,
          overflow: "auto",
          p: 2,
          bgcolor: "grey.50",
        }}
      >
        {/* HIỂN THỊ ERROR TỪ REDUX HOẶC LOCAL */}
        {(error || reduxError) && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={handleCloseError}>
            {error || reduxError}
          </Alert>
        )}

        {isLoading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              py: 4,
            }}
          >
            <CircularProgress size={24} />
            <Typography variant="body2" sx={{ ml: 2, color: "text.secondary" }}>
              Đang tải tin nhắn...
            </Typography>
          </Box>
        ) : messages.length === 0 ? (
          <Box sx={{ textAlign: "center", py: 8, color: "text.secondary" }}>
            <Typography variant="h6" gutterBottom>
              💬 Bắt đầu cuộc trò chuyện
            </Typography>
            <Typography variant="body2">
              Gửi tin nhắn đầu tiên để thảo luận về task này
            </Typography>
            {!isConnected && (
              <Alert
                severity="warning"
                sx={{ mt: 2, maxWidth: 300, mx: "auto" }}
              >
                Đang chờ kết nối real-time...
              </Alert>
            )}
          </Box>
        ) : (
          messages.map((message, index) => {
            const sender = getSenderInfo(message);
            const isMine = isMyMessage(message);
            const displayName = getDisplayName(sender);
            const previousMessage = index > 0 ? messages[index - 1] : null;
            const showDate = shouldShowDate(message, previousMessage);

            return (
              <React.Fragment key={message._id || message.tempId}>
                {/* Hiển thị ngày phân cách */}
                {showDate && (
                  <Box
                    sx={{ display: "flex", justifyContent: "center", my: 2 }}
                  >
                    <Chip
                      label={formatDate(message.createdAt)}
                      size="small"
                      variant="outlined"
                      sx={{ bgcolor: "background.paper", fontSize: "0.7rem" }}
                    />
                  </Box>
                )}

                <Box
                  sx={{
                    display: "flex",
                    justifyContent: isMine ? "flex-end" : "flex-start",
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: "70%",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isMine ? "flex-end" : "flex-start",
                    }}
                  >
                    {/* Reply preview */}
                    {message.replyTo && (
                      <Paper
                        sx={{
                          p: 1,
                          mb: 1,
                          bgcolor: "grey.100",
                          borderLeft: "3px solid",
                          borderColor: "primary.main",
                          maxWidth: "100%",
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Trả lời{" "}
                          {getDisplayName(
                            message.replyTo.sender || message.replyTo.senderId
                          )}
                          :
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{ fontStyle: "italic" }}
                        >
                          {message.replyTo.message || message.replyTo.content}
                        </Typography>
                      </Paper>
                    )}

                    <Box
                      sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}
                    >
                      {/* Avatar for others */}
                      {!isMine && (
                        <Tooltip title={displayName}>
                          <Avatar
                            sx={{
                              bgcolor: getAvatarColor(sender?.keycloakId),
                              width: 32,
                              height: 32,
                              fontSize: "0.8rem",
                            }}
                          >
                            {getInitials(sender)}
                          </Avatar>
                        </Tooltip>
                      )}

                      {/* Message content */}
                      <Box>
                        <Paper
                          sx={{
                            p: 1.5,
                            bgcolor: isMine ? "primary.main" : "white",
                            color: isMine ? "white" : "text.primary",
                            borderRadius: 2,
                            boxShadow: 1,
                            maxWidth: "100%",
                            border: message.isOptimistic
                              ? "2px dashed #ff9800"
                              : "none",
                            opacity: message.isOptimistic ? 0.8 : 1,
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              lineHeight: 1.4,
                              wordBreak: "break-word",
                              whiteSpace: "pre-wrap",
                            }}
                          >
                            {message.message || message.content}
                          </Typography>

                          {/* Message metadata */}
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mt: 1,
                              opacity: 0.7,
                            }}
                          >
                            <Typography variant="caption">
                              {formatTime(message.createdAt)}
                            </Typography>
                            {message.isEdited && (
                              <Chip
                                label="đã chỉnh sửa"
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 18,
                                  fontSize: "0.55rem",
                                  color: "inherit",
                                }}
                              />
                            )}
                            {message.isOptimistic && (
                              <Chip
                                label="đang gửi..."
                                size="small"
                                variant="outlined"
                                sx={{
                                  height: 18,
                                  fontSize: "0.55rem",
                                  color: "#ff9800",
                                  borderColor: "#ff9800",
                                }}
                              />
                            )}
                          </Box>
                        </Paper>

                        {/* Sender name for others */}
                        {!isMine && (
                          <Typography variant="caption" sx={{ mt: 0.5, ml: 1 }}>
                            {displayName}
                          </Typography>
                        )}
                      </Box>

                      {/* Avatar for me */}
                      {isMine && (
                        <Tooltip title="Bạn">
                          <Avatar
                            sx={{
                              bgcolor: "secondary.main",
                              width: 32,
                              height: 32,
                              fontSize: "0.8rem",
                            }}
                          >
                            {getInitials(currentUser)}
                          </Avatar>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {/* Message actions - chỉ hiện cho tin nhắn của mình và không phải optimistic */}
                  {isMine && !message.isOptimistic && (
                    <IconButton
                      size="small"
                      onClick={(e) => handleMenuOpen(e, message)}
                      sx={{
                        alignSelf: "flex-start",
                        ml: 1,
                        opacity: 0.6,
                        "&:hover": { opacity: 1, bgcolor: "action.hover" },
                      }}
                    >
                      <MoreVert fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              </React.Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Reply preview */}
      {replyingTo && (
        <Box
          sx={{
            p: 1.5,
            borderTop: 1,
            borderColor: "divider",
            bgcolor: "primary.50",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="caption" color="text.secondary">
              Đang trả lời{" "}
              <strong>{getDisplayName(getSenderInfo(replyingTo))}</strong>:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                fontStyle: "italic",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {replyingTo.message || replyingTo.content}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={() => setReplyingTo(null)}
            sx={{ flexShrink: 0 }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Box>
      )}

      {/* Input area */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: "divider",
          bgcolor: "white",
        }}
      >
        <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={
              !isConnected
                ? "Đang kết nối... Vui lòng chờ"
                : "Nhập tin nhắn... (Enter để gửi, Shift+Enter để xuống dòng)"
            }
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending || isLoading || !isConnected}
            multiline
            maxRows={3}
            size="small"
          />

          <Button
            variant="contained"
            onClick={sendMessage}
            disabled={
              !newMessage.trim() || sending || isLoading || !isConnected
            }
            startIcon={sending ? <CircularProgress size={16} /> : <Send />}
            sx={{ minWidth: "auto", px: 2, height: "40px" }}
          >
            {sending ? "" : "Gửi"}
          </Button>
        </Box>

        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mt: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            💡 Nhấn Enter để gửi nhanh, Shift+Enter để xuống dòng
          </Typography>

          {!isConnected && (
            <Chip
              label="Đang kết nối..."
              size="small"
              color="warning"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Context Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleReply}>
          <Reply fontSize="small" sx={{ mr: 1 }} />
          Trả lời
        </MenuItem>
        {selectedMessage && isMyMessage(selectedMessage) && (
          <MenuItem onClick={handleEdit}>
            <Edit fontSize="small" sx={{ mr: 1 }} />
            Chỉnh sửa
          </MenuItem>
        )}
        {selectedMessage && isMyMessage(selectedMessage) && (
          <MenuItem onClick={handleDelete} sx={{ color: "error.main" }}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            Xóa
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
};

export default TaskChat;
