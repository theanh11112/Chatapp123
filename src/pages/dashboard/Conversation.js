import React, { useEffect, useRef, useState, useCallback } from "react";
import { Stack, Box, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { SimpleBarStyle } from "../../components/Scrollbar";
import { ChatHeader, ChatFooter } from "../../components/Chat";
import useResponsive from "../../hooks/useResponsive";
import {
  DocMsg,
  LinkMsg,
  MediaMsg,
  ReplyMsg,
  TextMsg,
  Timeline,
} from "../../sections/dashboard/Conversation";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCurrentMessages,
  setCurrentConversation,
} from "../../redux/slices/conversation";
import { useKeycloak } from "@react-keycloak/web";

const Conversation = ({ isMobile, menu }) => {
  const dispatch = useDispatch();
  const theme = useTheme();

  const { conversations, current_conversation, current_messages } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { room_id } = useSelector((state) => state.app);
  const { keycloak, initialized } = useKeycloak();

  const currentUserId =
    initialized && keycloak?.authenticated ? keycloak?.subject : null;

  const [dragState, setDragState] = useState({
    dragging: false,
    activeMsgId: null,
    startX: 0,
    dragOffset: 0,
  });

  // --- Refs cho drag ---
  const messageRefs = useRef({});

  // Debug để theo dõi state
  useEffect(() => {
    console.log("🔵 MOUNT → ConversationPage");
    console.log("🔍 Conversation Debug:", {
      room_id,
      current_conversation: current_conversation?.id,
      conversations_count: conversations.length,
      currentUserId,
      current_messages_count: current_messages.length,
    });

    return () => console.log("🔴 UNMOUNT → ConversationPage");
  }, []);

  // QUAN TRỌNG: Set current_conversation khi room_id thay đổi
  const setCurrentConvFromRoomId = useCallback(() => {
    console.log("🔄 setCurrentConvFromRoomId called", {
      room_id,
      conversations_count: conversations.length,
      currentUserId,
    });

    if (!room_id || !currentUserId) {
      console.log("❌ Missing room_id or currentUserId");
      return null;
    }

    const current = conversations.find((el) => el?.id === room_id);
    console.log("🔍 Looking for conversation with room_id:", room_id);
    console.log("🔍 Found conversation:", current);

    if (!current) {
      console.log("❌ No conversation found for room_id:", room_id);
      return null;
    }

    // Luôn set current_conversation khi room_id thay đổi
    console.log("🔄 Setting current conversation:", {
      id: current.id,
      name: current.name,
      user_id: current.user_id,
    });
    dispatch(setCurrentConversation(current));
    dispatch(
      fetchCurrentMessages({ messages: current.messages, currentUserId })
    );

    return current;
  }, [room_id, conversations, currentUserId, dispatch]);

  useEffect(() => {
    const currentConv = setCurrentConvFromRoomId();

    // Nếu current_conversation bị null nhưng có room_id, force set lại
    if (!current_conversation?.id && room_id && currentConv) {
      console.log("🔄 Force setting current_conversation from room_id");
      dispatch(setCurrentConversation(currentConv));
    }
  }, [
    room_id,
    conversations,
    current_conversation,
    setCurrentConvFromRoomId,
    dispatch,
  ]);

  // 🔥 THÊM: Xử lý realtime messages từ socket
  useEffect(() => {
    console.log("📥 Current messages updated:", {
      count: current_messages.length,
      last_message: current_messages[current_messages.length - 1],
    });
  }, [current_messages]);

  // Theo dõi changes
  useEffect(() => {
    console.log("📊 Conversation State Update:", {
      room_id,
      has_current_conv: !!current_conversation?.id,
      current_conv_id: current_conversation?.id,
      current_conv_user: current_conversation?.user_id,
      messages_count: current_messages.length,
    });
  }, [room_id, current_conversation, current_messages]);

  // --- Drag handlers ---
  const startDrag = (e, id) => {
    e.preventDefault();
    setDragState({
      dragging: true,
      activeMsgId: id,
      startX: e.clientX,
      dragOffset: 0,
    });
  };

  const onDrag = (e) => {
    if (!dragState.dragging) return;
    const offset = Math.max(
      0,
      Math.min(Math.abs(e.clientX - dragState.startX), 80)
    );
    setDragState((prev) => ({ ...prev, dragOffset: offset }));
  };

  const endDrag = () => {
    setDragState({
      dragging: false,
      activeMsgId: null,
      startX: 0,
      dragOffset: 0,
    });
  };

  const startDragTouch = (e, id) => {
    const touch = e.touches[0];
    setDragState({
      dragging: true,
      activeMsgId: id,
      startX: touch.clientX,
      dragOffset: 0,
    });
  };

  const onDragTouch = (e) => {
    if (!dragState.dragging) return;
    const touch = e.touches[0];
    const offset = Math.max(
      0,
      Math.min(Math.abs(touch.clientX - dragState.startX), 80)
    );
    setDragState((prev) => ({ ...prev, dragOffset: offset }));
  };

  const endDragTouch = () => {
    endDrag();
  };

  // 🔥 SỬA: Hiển thị loading nếu không có conversation hoặc messages đang loading
  if (!current_conversation?.id || !currentUserId) {
    return (
      <Box
        p={isMobile ? 1 : 3}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <Typography variant="body1" color="text.secondary">
          {room_id
            ? "Loading conversation..."
            : "Select a conversation to start chatting"}
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={isMobile ? 1 : 3}>
      <Stack spacing={3}>
        {current_messages.map((el, index) => {
          // 🔥 SỬA: Validate message data
          if (!el) {
            console.warn("⚠️ Invalid message detected at index:", index);
            return null;
          }

          if (el.type === "divider") {
            return <Timeline key={el.id || `divider-${index}`} el={el} />;
          }

          if (el.type === "msg") {
            const isOutgoing = el.outgoing;
            const alignment = isOutgoing ? "flex-end" : "flex-start";

            const MsgComponent = (() => {
              switch (el.subtype) {
                case "img":
                  return MediaMsg;
                case "doc":
                  return DocMsg;
                case "Link":
                  return LinkMsg;
                case "reply":
                  return ReplyMsg;
                default:
                  return TextMsg;
              }
            })();

            const isActive = dragState.activeMsgId === el.id;
            const offset = isActive ? dragState.dragOffset : 0;
            const translateX = isOutgoing ? -offset : offset;

            return (
              <Box
                key={el.id || `msg-${index}`}
                display="flex"
                justifyContent={alignment}
                alignItems="flex-end"
                sx={{
                  position: "relative",
                  cursor: dragState.dragging ? "grabbing" : "grab",
                }}
                onMouseDown={(e) => startDrag(e, el.id)}
                onMouseMove={onDrag}
                onMouseUp={endDrag}
                onMouseLeave={endDrag}
                onTouchStart={(e) => startDragTouch(e, el.id)}
                onTouchMove={onDragTouch}
                onTouchEnd={endDragTouch}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "flex-end",
                    transform: `translateX(${translateX}px)`,
                    transition: dragState.dragging ? "none" : "transform 0.2s",
                    position: "relative",
                  }}
                >
                  <MsgComponent el={el} menu={menu} />

                  {/* Timestamp: right cho outgoing, left cho incoming */}
                  {isActive && offset > 0 && (
                    <Box
                      sx={{
                        position: "absolute",
                        bottom: 4,
                        fontSize: 12,
                        color: "#999",
                        whiteSpace: "nowrap",
                        opacity: dragState.dragging ? 1 : 0,
                        transition: "opacity 0.2s",
                        left: isOutgoing ? "auto" : -60,
                        right: isOutgoing ? -40 : "auto",
                      }}
                    >
                      {el.time}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          }

          return null;
        })}
      </Stack>
    </Box>
  );
};

const ChatComponent = () => {
  const isMobile = useResponsive("between", "md", "xs", "sm");
  const theme = useTheme();
  const messageListRef = useRef(null);
  const { current_messages, current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );

  useEffect(() => {
    console.log(
      "🔍 ChatComponent - current_conversation:",
      current_conversation
    );
  }, [current_conversation]);

  useEffect(() => {
    console.log(
      "📊 ChatComponent - current_messages count:",
      current_messages.length
    );

    if (!messageListRef.current) return;
    // Auto scroll to bottom khi có messages mới
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
  }, [current_messages]);

  return (
    <Stack height="100%" maxHeight="100vh" width={isMobile ? "100vw" : "auto"}>
      <ChatHeader />
      <Box
        ref={messageListRef}
        width="100%"
        sx={{
          position: "relative",
          flexGrow: 1,
          overflow: "auto",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F0F4FA"
              : theme.palette.background.paper,
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
        }}
      >
        <SimpleBarStyle timeout={500} clickOnTrack={false}>
          <Conversation menu={true} isMobile={isMobile} />
        </SimpleBarStyle>
      </Box>
      <ChatFooter />
    </Stack>
  );
};

export default ChatComponent;
export { Conversation };
