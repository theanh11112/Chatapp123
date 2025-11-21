// Footer.js - ĐÃ THÊM SOCKET LISTENERS CHO DIRECT MESSAGES
import React, { useRef, useState, useCallback, useEffect } from "react";
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
import useResponsive from "../../hooks/useResponsive";
import { useKeycloak } from "@react-keycloak/web";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { socket } from "../../socket";
import { useSelector, useDispatch } from "react-redux";
import {
  addDirectMessage,
  addGroupMessage,
  updateDirectMessage,
} from "../../redux/slices/conversation";
import { v4 as uuidv4 } from "uuid";
import { ReplyPreview } from "./ReplyComponents";

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
    replyTo,
    onCancelReply,
  }) => {
    const [openActions, setOpenActions] = useState(false);

    return (
      <>
        {replyTo && <ReplyPreview replyTo={replyTo} onCancel={onCancelReply} />}

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
          placeholder={replyTo ? "Type your reply..." : "Write a message..."}
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
      </>
    );
  }
);

// ----------------------------- FOOTER MAIN -----------------------------
const Footer = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { keycloak, initialized } = useKeycloak();

  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { current_room } = useSelector(
    (state) => state.conversation.group_chat
  );

  const { room_id, chat_type } = useSelector((state) => state.app);
  const { sideBar } = useSelector((state) => state.app);
  const isMobile = useResponsive("between", "md", "xs", "sm");

  const [openPicker, setOpenPicker] = useState(false);
  const [value, setValue] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const inputRef = useRef(null);

  const user_id =
    initialized && keycloak?.authenticated ? keycloak?.subject : null;

  const isGroupChat = chat_type === "group";
  const isDirectChat = chat_type === "individual";

  const getCurrentChat = useCallback(() => {
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

  // 🆕 THÊM: Socket event listeners cho direct messages
  useEffect(() => {
    if (!socket || !user_id) return;

    // Listener cho tin nhắn direct mới
    const handleNewDirectMessage = (data) => {
      console.log("📨 Footer: Received new direct message:", data);

      const currentChat = getCurrentChat();
      if (!currentChat || currentChat.type !== "direct") {
        console.log("❌ Not in direct chat or no current chat");
        return;
      }

      // Kiểm tra xem tin nhắn có thuộc conversation hiện tại không
      if (data.conversation_id === currentChat.id) {
        console.log(
          "✅ Adding realtime direct message to current conversation"
        );

        const isOwnMessage = data.from === user_id;

        // 🆕 XỬ LÝ replyTo.sender
        let processedReplyTo = data.replyTo;
        if (processedReplyTo && typeof processedReplyTo.sender === "string") {
          processedReplyTo = {
            ...processedReplyTo,
            sender: {
              keycloakId: processedReplyTo.sender,
              username: "Unknown",
            },
          };
        }

        const messageData = {
          id: data._id || data.id,
          _id: data._id || data.id,
          type: "msg",
          subtype: data.type || "text",
          message: data.message || data.content,
          content: data.message || data.content,
          incoming: !isOwnMessage,
          outgoing: isOwnMessage,
          time: data.time || formatMessageTime(data.createdAt || new Date()),
          createdAt: data.createdAt || new Date(),
          attachments: data.attachments || [],
          sender: data.sender || {
            keycloakId: data.from,
            username: data.sender?.username || "Unknown",
          },
          replyTo: processedReplyTo,
          isOptimistic: false,
          tempId: data.tempId || data.messageId,
        };

        console.log("🔄 Footer: Processing direct message -", {
          conversation_id: data.conversation_id,
          message_id: messageData.id,
          isOwnMessage,
          hasReply: !!data.replyTo,
        });

        // 🆕 Replace optimistic message với real message từ server
        if (data.tempId || data.messageId) {
          console.log("🔄 Replacing optimistic message:", {
            tempId: data.tempId || data.messageId,
            realId: messageData.id,
          });

          // Nếu có action updateDirectMessage, sử dụng nó
          if (updateDirectMessage) {
            dispatch(
              updateDirectMessage({
                tempId: data.tempId || data.messageId,
                realMessage: messageData,
                conversation_id: currentChat.id,
              })
            );
          } else {
            // Fallback: sử dụng addDirectMessage với replace flag
            dispatch(
              addDirectMessage({
                message: messageData,
                conversation_id: currentChat.id,
                currentUserId: user_id,
                isGroup: false,
                isOptimistic: false,
                replaceOptimistic: true,
              })
            );
          }
        } else {
          // Tin nhắn mới từ người khác
          dispatch(
            addDirectMessage({
              message: messageData,
              conversation_id: currentChat.id,
              currentUserId: user_id,
              isGroup: false,
              isOptimistic: false,
            })
          );
        }
      }
    };

    // Listener cho direct reply messages
    const handleDirectReplyMessage = (data) => {
      console.log("📨 Footer: Received direct reply message:", data);
      handleNewDirectMessage(data);
    };

    socket.on("text_message", handleNewDirectMessage);
    socket.on("text_message_reply", handleDirectReplyMessage);

    return () => {
      socket.off("text_message", handleNewDirectMessage);
      socket.off("text_message_reply", handleDirectReplyMessage);
    };
  }, [socket, user_id, dispatch, getCurrentChat]);

  // 🆕 Setup reply listener từ parent component
  useEffect(() => {
    const handleSetReply = (message) => {
      console.log("🔄 Setting reply to:", message);
      setReplyTo(message);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    };

    window.setMessageReply = handleSetReply;

    return () => {
      window.setMessageReply = null;
    };
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleSendMessage = useCallback(() => {
    console.log("📤 Attempting to send message...", { replyTo });

    const currentChat = getCurrentChat();

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

    const isReply = !!replyTo;
    const messageType = isReply
      ? "reply"
      : containsUrl(value)
      ? "link"
      : "text";

    if (isGroupChat) {
      // GROUP MESSAGE - code giữ nguyên
      const optimisticMessage = {
        id: msgId,
        _id: msgId,
        type: "msg",
        subtype: messageType,
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
        isOptimistic: true,
        tempId: msgId,
        ...(isReply && {
          replyTo: {
            id: replyTo.id || replyTo._id,
            content: replyTo.content || replyTo.message,
            sender: replyTo.sender,
          },
        }),
      };

      dispatch(
        addGroupMessage({
          message: optimisticMessage,
          room_id: currentChat.id,
          isOptimistic: true,
          tempId: msgId,
        })
      );

      const socketEvent = isReply ? "group_message_reply" : "group_message";
      const socketData = isReply
        ? {
            roomId: currentChat.id,
            message: value,
            sender: {
              keycloakId: user_id,
              username: keycloak?.tokenParsed?.preferred_username || "Unknown",
            },
            type: messageType,
            timestamp: timestamp,
            messageId: msgId,
            replyTo: replyTo.id || replyTo._id,
            replyContent: replyTo.content || replyTo.message,
            replySender: (() => {
              if (typeof replyTo.sender === "string") {
                return {
                  keycloakId: replyTo.sender,
                  username: "Unknown",
                };
              }
              if (replyTo.sender && typeof replyTo.sender === "object") {
                return {
                  keycloakId:
                    replyTo.sender.keycloakId || replyTo.sender.id || "unknown",
                  username: replyTo.sender.username || "Unknown",
                  ...replyTo.sender,
                };
              }
              return {
                keycloakId: "unknown",
                username: "Unknown",
              };
            })(),
          }
        : {
            roomId: currentChat.id,
            message: value,
            sender: {
              keycloakId: user_id,
              username: keycloak?.tokenParsed?.preferred_username || "Unknown",
            },
            type: messageType,
            timestamp: timestamp,
            messageId: msgId,
          };

      socket.emit(socketEvent, socketData);
      console.log(`✅ Group ${isReply ? "reply " : ""}message sent via socket`);
    } else {
      // DIRECT MESSAGE - CÓ/HOẶC KHÔNG REPLY
      if (!currentChat.user_id) {
        console.log("❌ No user_id in conversation");
        return;
      }

      const optimisticMessage = {
        id: msgId,
        type: "msg",
        subtype: messageType,
        message: value,
        incoming: false,
        outgoing: true,
        time: formatMessageTime(timestamp),
        createdAt: timestamp,
        attachments: [],
        isOptimistic: true,
        tempId: msgId,
        ...(isReply && {
          replyTo: {
            id: replyTo.id || replyTo._id,
            content: replyTo.content || replyTo.message,
            sender: replyTo.sender,
          },
        }),
      };

      dispatch(
        addDirectMessage({
          message: optimisticMessage,
          conversation_id: currentChat.id,
          currentUserId: user_id,
          isGroup: false,
          isOptimistic: true,
          tempId: msgId,
        })
      );

      const socketEvent = isReply ? "text_message_reply" : "text_message";
      const socketData = isReply
        ? {
            id: msgId,
            message: linkify(value),
            from: user_id,
            to: currentChat.user_id,
            conversation_id: currentChat.id,
            type: messageType,
            replyTo: replyTo.id || replyTo._id,
            replyContent: replyTo.content || replyTo.message,
            replySender: replyTo.sender,
          }
        : {
            id: msgId,
            message: linkify(value),
            from: user_id,
            to: currentChat.user_id,
            conversation_id: currentChat.id,
            type: messageType,
          };

      console.log(`🔌 Emitting ${socketEvent}:`, socketData);
      socket.emit(socketEvent, socketData);
      console.log(
        `✅ Direct ${isReply ? "reply " : ""}message sent via socket`
      );
    }

    setReplyTo(null);
    setValue("");
  }, [
    value,
    replyTo,
    getCurrentChat,
    dispatch,
    user_id,
    isGroupChat,
    isDirectChat,
    keycloak,
  ]);

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

  const formatMessageTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("❌ Error formatting time:", error);
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const containsUrl = (text) => {
    return /(https?:\/\/[^\s]+)/g.test(text);
  };

  const linkify = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlRegex,
      (url) => `<a href="${url}" target="_blank">${url}</a>`
    );
  };

  const currentChat = getCurrentChat();
  if (!currentChat) {
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
              replyTo={replyTo}
              onCancelReply={handleCancelReply}
            />
          </Stack>

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
