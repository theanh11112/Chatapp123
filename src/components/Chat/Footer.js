// Footer.js - HOÀN CHỈNH - ĐÃ SỬA LỖI RESET MESSAGES
import {
  Box,
  Fab,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
} from "@mui/material";
import {
  Camera,
  File,
  Image,
  LinkSimple,
  PaperPlaneTilt,
  Smiley,
  Sticker,
  User,
} from "phosphor-react";
import { useTheme, styled } from "@mui/material/styles";
import React, { useRef, useState, useCallback, useEffect } from "react";
import useResponsive from "../../hooks/useResponsive";
import { useKeycloak } from "@react-keycloak/web";

import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { socket } from "../../socket";
import { useSelector, useDispatch } from "react-redux";
import {
  addDirectMessage,
  addGroupMessage,
} from "../../redux/slices/conversation";
import { v4 as uuidv4 } from "uuid";

const StyledInput = styled(TextField)(({ theme }) => ({
  "& .MuiInputBase-input": {
    paddingTop: "12px !important",
    paddingBottom: "12px !important",
  },
}));

const Actions = [
  { color: "#4da5fe", icon: <Image size={24} />, y: 102, title: "Photo/Video" },
  { color: "#1b8cfe", icon: <Sticker size={24} />, y: 172, title: "Stickers" },
  { color: "#0172e4", icon: <Camera size={24} />, y: 242, title: "Image" },
  { color: "#0159b2", icon: <File size={24} />, y: 312, title: "Document" },
  { color: "#013f7f", icon: <User size={24} />, y: 382, title: "Contact" },
];

// ----------------------------- CHAT INPUT -----------------------------
const ChatInput = React.memo(
  ({
    openPicker,
    setOpenPicker,
    setValue,
    value,
    inputRef,
    handleSendMessage,
  }) => {
    const [openActions, setOpenActions] = useState(false);

    return (
      <StyledInput
        inputRef={inputRef}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
          }
        }}
        fullWidth
        placeholder="Write a message..."
        variant="filled"
        InputProps={{
          disableUnderline: true,
          startAdornment: (
            <InputAdornment position="start">
              <Stack sx={{ width: "max-content" }}>
                <Stack
                  sx={{
                    position: "relative",
                    display: openActions ? "inline-block" : "none",
                  }}
                >
                  {Actions.map((el, idx) => (
                    <Tooltip placement="right" title={el.title} key={idx}>
                      <Fab
                        sx={{
                          position: "absolute",
                          top: -el.y,
                          backgroundColor: el.color,
                        }}
                        onClick={() => setOpenActions(false)}
                      >
                        {el.icon}
                      </Fab>
                    </Tooltip>
                  ))}
                </Stack>
                <IconButton onClick={() => setOpenActions(!openActions)}>
                  <LinkSimple />
                </IconButton>
              </Stack>
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={() => setOpenPicker(!openPicker)}>
                <Smiley />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
    );
  }
);

// ----------------------------- UTIL -----------------------------
function linkify(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.replace(
    urlRegex,
    (url) => `<a href="${url}" target="_blank">${url}</a>`
  );
}

function containsUrl(text) {
  return /(https?:\/\/[^\s]+)/g.test(text);
}

// ----------------------------- FOOTER MAIN -----------------------------
const Footer = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { keycloak, initialized } = useKeycloak();

  // Lấy cả direct và group state từ Redux
  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { current_room } = useSelector(
    (state) => state.conversation.group_chat
  );

  // Lấy room_id và chat_type từ app slice
  const { room_id, chat_type } = useSelector((state) => state.app);

  const { sideBar } = useSelector((state) => state.app);
  const isMobile = useResponsive("between", "md", "xs", "sm");

  const [openPicker, setOpenPicker] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  // Lấy user_id từ Keycloak
  const user_id =
    initialized && keycloak?.authenticated ? keycloak?.subject : null;

  // 🆕 Xác định loại chat hiện tại
  const isGroupChat = chat_type === "group";
  const isDirectChat = chat_type === "individual";

  // 🆕 Lấy thông tin chat hiện tại - ĐÃ SỬA DEPENDENCIES
  // Footer.js - SỬA getCurrentChat để giảm re-render
  const getCurrentChat = useCallback(() => {
    console.log("🔄 getCurrentChat called:", {
      isGroupChat,
      isDirectChat,
      current_room_id: current_room?.id,
      current_conversation_id: current_conversation?.id,
      room_id,
    });

    // 🆕 SỬA: Chỉ return new object khi thực sự thay đổi
    if (isGroupChat && current_room?.id === room_id) {
      return {
        type: "group",
        id: current_room.id,
        name: current_room.name,
        data: current_room,
      };
    } else if (isDirectChat && current_conversation?.id === room_id) {
      return {
        type: "direct",
        id: current_conversation.id,
        name: current_conversation.name,
        user_id: current_conversation.user_id,
        data: current_conversation,
      };
    }
    return null;
  }, [isGroupChat, isDirectChat, current_room, current_conversation, room_id]);

  // 🆕 THÊM: Debug effect để theo dõi re-render
  useEffect(() => {
    console.log("🔄 Footer - Re-render triggered:", {
      room_id,
      chat_type,
      current_room_id: current_room?.id,
      current_conversation_id: current_conversation?.id,
      value_length: value.length,
    });
  }, [room_id, chat_type, current_room, current_conversation, value]);

  // -------------------- HANDLE EMOJI INSERT --------------------
  const handleEmojiClick = useCallback(
    (emoji) => {
      const input = inputRef.current;
      if (!input) return;

      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newValue = value.slice(0, start) + emoji + value.slice(end);

      setValue(newValue);

      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + emoji.length;
      }, 1);
    },
    [value]
  );

  // 🆕 SỬA QUAN TRỌNG: Handle send message với logic chống reset
  const handleSendMessage = useCallback(() => {
    console.log("📤 Attempting to send message...");

    const currentChat = getCurrentChat();

    console.log("🔍 Send Message Debug:", {
      currentChat,
      value: value.trim(),
      user_id,
      room_id,
      chat_type,
      isGroupChat,
      isDirectChat,
      current_room_messages: current_room?.messages?.length,
      current_conversation_messages: current_conversation?.messages?.length,
    });

    if (!value.trim()) {
      console.log("❌ Message is empty");
      return;
    }

    if (!currentChat?.id) {
      console.log("❌ No valid chat found");
      return;
    }

    if (!user_id) {
      console.log("❌ No user_id available");
      return;
    }

    const msgId = uuidv4();
    const timestamp = new Date().toISOString();

    if (isGroupChat) {
      // 🆕 GROUP MESSAGE - OPTIMISTIC UPDATE VỚI UUID
      const optimisticMessage = {
        id: msgId, // UUID cho optimistic update
        _id: msgId, // 🆕 THÊM _id để duplicate detection hoạt động
        type: "msg",
        subtype: containsUrl(value) ? "link" : "text",
        message: value,
        content: value,
        incoming: false,
        outgoing: true,
        time: formatMessageTime(timestamp),
        createdAt: timestamp,
        attachments: [],
        sender: {
          keycloakId: user_id,
          username: keycloak?.tokenParsed?.preferred_username || "You",
        },
        isOptimistic: true, // 🆕 FLAG ĐỂ PHÂN BIỆT
      };

      console.log("📝 Optimistic update for GROUP message - STRUCTURE:", {
        message_structure: optimisticMessage,
        type: optimisticMessage.type,
        subtype: optimisticMessage.subtype,
        has_message: !!optimisticMessage.message,
        has_content: !!optimisticMessage.content,
      });

      // 🆕 SỬA: Dispatch với flag isOptimistic
      dispatch(
        addGroupMessage({
          message: optimisticMessage,
          room_id: currentChat.id,
          isOptimistic: true,
        })
      );

      // 🆕 EMIT SOCKET EVENT FOR GROUP
      console.log("🔌 Emitting group_message socket event:", {
        roomId: currentChat.id,
        message: value,
        sender: user_id,
        messageId: msgId, // 🆕 GỬI CẢ UUID ĐỂ BACKEND GHÉP
      });

      socket.emit("group_message", {
        roomId: currentChat.id,
        message: value,
        sender: {
          keycloakId: user_id,
          username: keycloak?.tokenParsed?.preferred_username || "Unknown",
        },
        type: containsUrl(value) ? "link" : "text",
        timestamp: timestamp,
        messageId: msgId, // 🆕 QUAN TRỌNG: Gửi UUID để backend có thể mapping
      });

      console.log("✅ Group message sent via socket with optimistic update");
    } else {
      // DIRECT MESSAGE
      if (!currentChat.user_id) {
        console.log("❌ No user_id in conversation");
        return;
      }

      const optimisticMessage = {
        id: msgId,
        type: "msg",
        subtype: containsUrl(value) ? "link" : "text",
        message: value,
        incoming: false,
        outgoing: true,
        time: formatMessageTime(timestamp),
        attachments: [],
        isOptimistic: true, // 🆕 FLAG CHO DIRECT MESSAGE
      };

      console.log("📝 Optimistic update for DIRECT message:", {
        conversation_id: currentChat.id,
        message_id: msgId,
      });

      // 🆕 SỬA: Direct message với optimistic flag
      dispatch(
        addDirectMessage({
          message: optimisticMessage,
          conversation_id: currentChat.id,
          currentUserId: user_id,
          isGroup: false,
          isOptimistic: true,
        })
      );

      console.log("🔌 Emitting text_message socket event:", {
        conversation_id: currentChat.id,
        to: currentChat.user_id,
        from: user_id,
        messageId: msgId,
      });

      socket.emit("text_message", {
        id: msgId,
        message: linkify(value),
        from: user_id,
        to: currentChat.user_id,
        conversation_id: currentChat.id,
        type: containsUrl(value) ? "link" : "text",
      });

      console.log("✅ Direct message sent via socket with optimistic update");
    }

    setValue("");
  }, [
    value,
    getCurrentChat,
    dispatch,
    user_id,
    isGroupChat,
    isDirectChat,
    keycloak,
    current_room,
    current_conversation,
  ]);

  // 🆕 THÊM: Format time helper
  const formatMessageTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // 🆕 THÊM: Debug currentChat changes
  useEffect(() => {
    const currentChat = getCurrentChat();
    console.log("🔄 Footer - Current Chat Updated:", {
      currentChat,
      chat_type,
      room_id,
      hasUser: !!user_id,
      current_room_messages: current_room?.messages?.length,
      current_conversation_messages: current_conversation?.messages?.length,
    });
  }, [
    getCurrentChat,
    chat_type,
    room_id,
    user_id,
    current_room,
    current_conversation,
  ]);

  // Nếu không có chat được chọn, ẩn input
  const currentChat = getCurrentChat();
  if (!currentChat) {
    console.log("🚫 Footer: No valid chat available");
    return (
      <Box
        sx={{
          width: "100%",
          backgroundColor: theme.palette.background.paper,
          padding: 2,
          textAlign: "center",
          color: theme.palette.text.secondary,
        }}
      >
        Select a conversation to start messaging
      </Box>
    );
  }

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        p={isMobile ? 1 : 2}
        sx={{
          width: "100%",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background.paper,
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
        }}
      >
        <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 3}>
          <Stack sx={{ width: "100%" }}>
            {openPicker && (
              <Box
                sx={{
                  zIndex: 10,
                  position: "fixed",
                  bottom: 81,
                  right: isMobile ? 20 : sideBar.open ? 420 : 100,
                }}
              >
                <Picker
                  theme={theme.palette.mode}
                  data={data}
                  onEmojiSelect={(e) => handleEmojiClick(e.native)}
                />
              </Box>
            )}

            <ChatInput
              inputRef={inputRef}
              value={value}
              setValue={setValue}
              openPicker={openPicker}
              setOpenPicker={setOpenPicker}
              handleSendMessage={handleSendMessage}
            />
          </Stack>

          {/* SEND BUTTON */}
          <Box
            sx={{
              height: 48,
              width: 48,
              backgroundColor: theme.palette.primary.main,
              borderRadius: 1.5,
            }}
          >
            <Stack
              sx={{ height: "100%" }}
              alignItems="center"
              justifyContent="center"
            >
              <IconButton
                onClick={handleSendMessage}
                disabled={!currentChat || !user_id || !value.trim()}
              >
                <PaperPlaneTilt color="#fff" />
              </IconButton>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default React.memo(Footer);
