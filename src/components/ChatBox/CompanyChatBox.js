// components/CompanyChatBox.js
import React, { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  IconButton,
  Typography,
  TextField,
  Avatar,
  Card,
  Fade,
  Slide,
  Chip,
  CircularProgress,
} from "@mui/material";
import {
  Close,
  ExpandLess,
  ExpandMore,
  Send,
  Chat as ChatIcon,
  SmartToy,
  Clear,
} from "@mui/icons-material";
import {
  setChatboxOpen,
  setChatboxMinimized,
  setChatboxLoading,
  addChatboxMessage,
  clearChatboxMessages,
  restoreChatboxSession,
} from "../../redux/slices/chatboxSlice";
import api from "../../utils/axios"; // ✅ Import axios instance

const CompanyChatBox = () => {
  const dispatch = useDispatch();
  const { messages, isLoading, isOpen, isMinimized } = useSelector(
    (state) => state.chatbox
  );

  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);

  // User info - lấy từ Redux store với structure CHUẨN cho backend
  const userInfo = useSelector((state) => state.auth?.userInfo) || {
    user_id: "user001",
    employee_id: "EMP001",
    department: "HR",
    role: "employee",
    permission_level: 2,
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Khôi phục chat session khi component mount
  useEffect(() => {
    if (userInfo.user_id) {
      dispatch(restoreChatboxSession({ userId: userInfo.user_id }));
    }
  }, [userInfo.user_id, dispatch]);

  // Thêm welcome message khi mở chatbox lần đầu
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      const welcomeMessage = {
        id: Date.now(),
        type: "bot",
        content:
          "Xin chào! Tôi là trợ lý ảo của công ty. Tôi có thể giúp gì cho bạn về các chính sách, quy định nội bộ?",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        suggestions: [
          "Chính sách nghỉ phép",
          "Quy định về giờ làm việc",
          "Chế độ lương thưởng",
          "Quy trình đào tạo",
        ],
      };

      dispatch(
        addChatboxMessage({
          message: welcomeMessage,
          userId: userInfo.user_id,
        })
      );
    }
  }, [isOpen, messages.length, dispatch, userInfo.user_id]);

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputMessage,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    // Thêm message vào Redux store
    dispatch(
      addChatboxMessage({
        message: userMessage,
        userId: userInfo.user_id,
      })
    );

    setInputMessage("");
    dispatch(setChatboxLoading(true));

    try {
      // ✅ SỬA: Gọi API qua axios instance với endpoint đúng
      const response = await api.post("/chat/message", {
        user_info: userInfo,
        message: inputMessage,
      });

      const data = response.data;

      const botMessage = {
        id: Date.now() + 1,
        type: "bot",
        content: data.response,
        source: data.source,
        category: data.category,
        confidence: data.confidence,
        total_results: data.total_results,
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      dispatch(
        addChatboxMessage({
          message: botMessage,
          userId: userInfo.user_id,
        })
      );
    } catch (error) {
      console.error("Chat API Error:", error);

      const errorMessage = {
        id: Date.now() + 1,
        type: "error",
        content:
          error.response?.data?.message || "Lỗi kết nối. Vui lòng thử lại sau.",
        timestamp: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };

      dispatch(
        addChatboxMessage({
          message: errorMessage,
          userId: userInfo.user_id,
        })
      );
    } finally {
      dispatch(setChatboxLoading(false));
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleChat = () => {
    if (isOpen && isMinimized) {
      dispatch(setChatboxMinimized(false));
    } else if (isOpen && !isMinimized) {
      dispatch(setChatboxOpen(false));
      dispatch(setChatboxMinimized(true));
    } else {
      dispatch(setChatboxOpen(true));
      dispatch(setChatboxMinimized(false));
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputMessage(suggestion);
  };

  const handleClearChat = () => {
    dispatch(clearChatboxMessages({ userId: userInfo.user_id }));

    // Thêm lại welcome message sau khi clear
    const welcomeMessage = {
      id: Date.now(),
      type: "bot",
      content:
        "Xin chào! Tôi là trợ lý ảo của công ty. Tôi có thể giúp gì cho bạn?",
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      suggestions: [
        "Chính sách nghỉ phép",
        "Quy định về giờ làm việc",
        "Chế độ lương thưởng",
        "Quy trình đào tạo",
      ],
    };

    dispatch(
      addChatboxMessage({
        message: welcomeMessage,
        userId: userInfo.user_id,
      })
    );
  };

  // Chatbox minimized (icon tròn)
  if (!isOpen) {
    return (
      <Box
        sx={{
          position: "fixed",
          bottom: 100,
          right: 24,
          zIndex: 9999,
        }}
      >
        <IconButton
          onClick={toggleChat}
          sx={{
            width: 56,
            height: 56,
            bgcolor: "primary.main",
            color: "white",
            "&:hover": {
              bgcolor: "primary.dark",
              transform: "scale(1.1)",
            },
            transition: "all 0.3s ease",
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            borderRadius: "50%",
          }}
        >
          <ChatIcon sx={{ fontSize: 26 }} />
        </IconButton>
      </Box>
    );
  }

  // Chatbox mở rộng
  return (
    <Box
      sx={{
        position: "fixed",
        bottom: 100,
        right: 24,
        zIndex: 9999,
        width: isMinimized ? 300 : 380,
        height: isMinimized ? 380 : 500,
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Card
          sx={{
            height: "100%",
            display: "flex",
            flexDirection: "column",
            boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
            border: "none",
            borderRadius: 2,
            overflow: "hidden",
            background: "white",
          }}
        >
          {/* Header với button clear chat */}
          <Box
            sx={{
              background: "linear-gradient(135deg, #1976d2 0%, #1565c0 100%)",
              color: "white",
              p: 2,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box
                sx={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  bgcolor: "rgba(255,255,255,0.2)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <SmartToy sx={{ fontSize: 20 }} />
              </Box>
              <Box>
                <Typography variant="h6" fontWeight="600" fontSize="1rem">
                  Trợ lý ảo
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ opacity: 0.9, fontSize: "0.7rem" }}
                >
                  Online • Sẵn sàng hỗ trợ
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: "flex", gap: 0.5 }}>
              {messages.length > 1 && (
                <IconButton
                  size="small"
                  onClick={handleClearChat}
                  sx={{
                    color: "white",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                  }}
                  title="Xóa lịch sử chat"
                >
                  <Clear sx={{ fontSize: 18 }} />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={() => dispatch(setChatboxMinimized(!isMinimized))}
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                {isMinimized ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
              <IconButton
                size="small"
                onClick={toggleChat}
                sx={{
                  color: "white",
                  "&:hover": { bgcolor: "rgba(255,255,255,0.1)" },
                }}
              >
                <Close />
              </IconButton>
            </Box>
          </Box>

          {/* Messages Container */}
          <Box
            sx={{
              flex: 1,
              p: 2,
              overflowY: "auto",
              background: "#fafafa",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              "&::-webkit-scrollbar": {
                width: 4,
              },
              "&::-webkit-scrollbar-track": {
                background: "transparent",
              },
              "&::-webkit-scrollbar-thumb": {
                background: "#cbd5e1",
                borderRadius: 2,
              },
            }}
          >
            {messages.map((message) => (
              <Fade in key={message.id} timeout={400}>
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems:
                      message.type === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 1,
                      maxWidth: "90%",
                      flexDirection:
                        message.type === "user" ? "row-reverse" : "row",
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: message.type === "user" ? "#1976d2" : "#666",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      {message.type === "user" ? "You" : "AI"}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                      <Box
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          background:
                            message.type === "user"
                              ? "#1976d2"
                              : message.type === "error"
                              ? "#ff4444"
                              : "white",
                          color:
                            message.type === "user" ? "white" : "text.primary",
                          border: message.type === "bot" ? "1px solid" : "none",
                          borderColor: "grey.200",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        }}
                      >
                        <Typography
                          variant="body2"
                          sx={{
                            lineHeight: 1.4,
                            fontSize: "0.85rem",
                            whiteSpace: "pre-line",
                          }}
                        >
                          {message.content}
                        </Typography>

                        {/* Metadata từ chatbot response */}
                        {(message.source ||
                          message.category ||
                          message.confidence) && (
                          <Box sx={{ mt: 1.5 }}>
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 0.5,
                                alignItems: "center",
                              }}
                            >
                              {message.source && (
                                <Chip
                                  label={`📚 ${message.source}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.65rem",
                                    bgcolor:
                                      message.type === "user"
                                        ? "rgba(255,255,255,0.1)"
                                        : "grey.50",
                                    color:
                                      message.type === "user"
                                        ? "white"
                                        : "text.primary",
                                    borderColor:
                                      message.type === "user"
                                        ? "rgba(255,255,255,0.3)"
                                        : "grey.300",
                                  }}
                                />
                              )}
                              {message.category && (
                                <Chip
                                  label={`🏷️ ${message.category}`}
                                  size="small"
                                  variant="outlined"
                                  sx={{
                                    height: 20,
                                    fontSize: "0.65rem",
                                    bgcolor:
                                      message.type === "user"
                                        ? "rgba(255,255,255,0.1)"
                                        : "grey.50",
                                    color:
                                      message.type === "user"
                                        ? "white"
                                        : "text.primary",
                                    borderColor:
                                      message.type === "user"
                                        ? "rgba(255,255,255,0.3)"
                                        : "grey.300",
                                  }}
                                />
                              )}
                              {message.confidence && (
                                <Typography
                                  variant="caption"
                                  color={
                                    message.type === "user"
                                      ? "rgba(255,255,255,0.8)"
                                      : "text.secondary"
                                  }
                                  sx={{ fontSize: "0.65rem" }}
                                >
                                  ✅ {Math.round(message.confidence * 100)}% phù
                                  hợp
                                </Typography>
                              )}
                              {message.total_results > 0 && (
                                <Typography
                                  variant="caption"
                                  color={
                                    message.type === "user"
                                      ? "rgba(255,255,255,0.8)"
                                      : "text.secondary"
                                  }
                                  sx={{ fontSize: "0.65rem" }}
                                >
                                  📊 {message.total_results} kết quả
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        )}

                        {/* Suggestions */}
                        {message.suggestions &&
                          message.suggestions.length > 0 && (
                            <Box sx={{ mt: 1.5 }}>
                              <Typography
                                variant="caption"
                                fontWeight="600"
                                color={
                                  message.type === "user"
                                    ? "rgba(255,255,255,0.9)"
                                    : "text.secondary"
                                }
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 0.5,
                                  fontSize: "0.75rem",
                                }}
                              >
                                💡 Gợi ý tiếp theo:
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 0.5,
                                  mt: 0.75,
                                }}
                              >
                                {message.suggestions.map(
                                  (suggestion, index) => (
                                    <Chip
                                      key={index}
                                      label={suggestion}
                                      size="small"
                                      variant={
                                        message.type === "user"
                                          ? "filled"
                                          : "outlined"
                                      }
                                      onClick={() =>
                                        handleSuggestionClick(suggestion)
                                      }
                                      sx={{
                                        cursor: "pointer",
                                        height: 22,
                                        fontSize: "0.7rem",
                                        bgcolor:
                                          message.type === "user"
                                            ? "rgba(255,255,255,0.15)"
                                            : "primary.50",
                                        color:
                                          message.type === "user"
                                            ? "white"
                                            : "primary.main",
                                        borderColor:
                                          message.type === "user"
                                            ? "rgba(255,255,255,0.3)"
                                            : "primary.light",
                                        borderWidth: 1,
                                        "&:hover": {
                                          bgcolor:
                                            message.type === "user"
                                              ? "rgba(255,255,255,0.25)"
                                              : "primary.main",
                                          color: "white",
                                          borderColor:
                                            message.type === "user"
                                              ? "rgba(255,255,255,0.4)"
                                              : "primary.main",
                                        },
                                        transition: "all 0.2s ease",
                                      }}
                                    />
                                  )
                                )}
                              </Box>
                            </Box>
                          )}
                      </Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          mt: 0.5,
                          display: "block",
                          fontSize: "0.65rem",
                          textAlign: message.type === "user" ? "right" : "left",
                        }}
                      >
                        {message.timestamp}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </Fade>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 1,
                }}
              >
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: "#666",
                    fontSize: 12,
                    fontWeight: "600",
                  }}
                >
                  AI
                </Avatar>
                <Box
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: "white",
                    border: "1px solid",
                    borderColor: "grey.200",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <CircularProgress size={16} />
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      fontWeight="500"
                      fontSize="0.75rem"
                    >
                      Đang tìm kiếm thông tin...
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            <div ref={messagesEndRef} />
          </Box>

          {/* Input Area */}
          <Box
            sx={{
              p: 2,
              borderTop: "1px solid",
              borderColor: "grey.200",
              bgcolor: "white",
            }}
          >
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-end" }}>
              <TextField
                fullWidth
                multiline
                maxRows={3}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nhập câu hỏi của bạn về chính sách công ty..."
                variant="outlined"
                size="small"
                disabled={isLoading}
                sx={{
                  "& .MuiOutlinedInput-root": {
                    borderRadius: 1.5,
                    fontSize: "0.85rem",
                    "&:hover fieldset": {
                      borderColor: "primary.main",
                    },
                    "&.Mui-focused fieldset": {
                      borderColor: "primary.main",
                      borderWidth: 1,
                    },
                  },
                }}
              />
              <IconButton
                onClick={sendMessage}
                disabled={isLoading || !inputMessage.trim()}
                sx={{
                  width: 40,
                  height: 40,
                  bgcolor: "primary.main",
                  color: "white",
                  "&:hover": {
                    bgcolor: "primary.dark",
                    transform: "translateY(-1px)",
                  },
                  "&:disabled": {
                    bgcolor: "grey.300",
                    transform: "none",
                  },
                  transition: "all 0.2s ease",
                  mb: 0.5,
                }}
              >
                <Send sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                mt: 1,
                display: "block",
                textAlign: "center",
                fontSize: "0.65rem",
              }}
            >
              Nhấn Enter để gửi, Shift + Enter để xuống dòng
            </Typography>
          </Box>
        </Card>
      </Slide>
    </Box>
  );
};

export default CompanyChatBox;
