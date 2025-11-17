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
import { addDirectMessage } from "../../redux/slices/conversation";
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

  // Lấy current_conversation từ Redux
  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );

  // Lấy room_id từ app slice để backup
  const { room_id } = useSelector((state) => state.app);

  // Lấy conversations để tìm current_conversation nếu bị null
  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat
  );

  const { sideBar } = useSelector((state) => state.app);
  const isMobile = useResponsive("between", "md", "xs", "sm");

  const [openPicker, setOpenPicker] = useState(false);
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  // Lấy user_id từ Keycloak - FIXED
  const user_id =
    initialized && keycloak?.authenticated ? keycloak?.subject : null;

  // Tìm current_conversation từ room_id nếu current_conversation bị null hoặc mất user_id
  const getCurrentConversation = useCallback(() => {
    // Nếu current_conversation hợp lệ, sử dụng nó
    if (current_conversation?.id && current_conversation?.user_id) {
      return current_conversation;
    }

    // Nếu current_conversation có id nhưng mất user_id, tìm trong conversations
    if (current_conversation?.id && !current_conversation.user_id) {
      console.log(
        "🔄 Current conversation lost user_id, searching in conversations..."
      );
      const foundConversation = conversations.find(
        (conv) => conv.id === current_conversation.id
      );
      if (foundConversation && foundConversation.user_id) {
        console.log("🔍 Found conversation with user_id:", foundConversation);
        return foundConversation;
      }
    }

    // Fallback: tìm từ room_id
    if (room_id) {
      const foundConversation = conversations.find(
        (conv) => conv.id === room_id
      );
      if (foundConversation && foundConversation.user_id) {
        console.log("🔄 Found conversation from room_id:", foundConversation);
        return foundConversation;
      }
    }

    console.log("❌ No valid conversation found");
    return null;
  }, [current_conversation, room_id, conversations]);

  // Debug để theo dõi current_conversation
  useEffect(() => {
    const currentConv = getCurrentConversation();
    console.log("🔍 Footer Debug:", {
      current_conversation: currentConv,
      room_id,
      conversations_count: conversations.length,
      user_id,
      keycloak_authenticated: keycloak?.authenticated,
    });

    // Log khi conversation bị reset
    if (current_conversation?.id && !current_conversation.user_id) {
      console.warn(
        "🚨 REDUX ALERT: Current conversation lost user_id!",
        current_conversation
      );
    }
  }, [
    current_conversation,
    room_id,
    conversations,
    user_id,
    keycloak,
    getCurrentConversation,
  ]);

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

  // -------------------- SEND MESSAGE --------------------
  const handleSendMessage = useCallback(() => {
    console.log("📤 Attempting to send message...");

    const currentConv = getCurrentConversation();

    console.log("🔍 Send Message Debug:", {
      currentConv,
      value: value.trim(),
      user_id,
      room_id,
      has_user_id: !!user_id,
      has_conv_user_id: !!currentConv?.user_id,
    });

    if (!value.trim()) {
      console.log("❌ Message is empty");
      return;
    }

    if (!currentConv?.id) {
      console.log("❌ No valid conversation found");
      return;
    }

    if (!currentConv.user_id) {
      console.log("❌ No user_id in conversation");
      return;
    }

    if (!user_id) {
      console.log("❌ No user_id available");
      return;
    }

    const msgId = uuidv4();

    const localMessage = {
      id: msgId,
      type: "msg",
      subtype: containsUrl(value) ? "Link" : "Text",
      message: value,
      incoming: false,
      outgoing: true,
      time: new Date().toISOString(),
      attachments: [],
    };

    console.log("📝 Dispatching message:", {
      conversation_id: currentConv.id,
      to_user_id: currentConv.user_id,
      from_user_id: user_id,
      message: localMessage,
    });

    // Dispatch message to Redux
    dispatch(
      addDirectMessage({
        message: localMessage,
        conversation_id: currentConv.id,
        currentUserId: user_id,
      })
    );

    // Emit socket event
    socket.emit("text_message", {
      id: msgId,
      message: linkify(value),
      from: user_id,
      to: currentConv.user_id,
      conversation_id: currentConv.id,
      type: containsUrl(value) ? "Link" : "Text",
    });

    setValue("");
  }, [value, getCurrentConversation, dispatch, user_id]);

  // Nếu không có conversation được chọn, ẩn input
  const validConversation = getCurrentConversation();
  if (!validConversation) {
    console.log("🚫 Footer: No valid conversation available");
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
                disabled={!validConversation?.user_id || !user_id}
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
