import React, { useEffect, useRef, useState } from "react";
import { Stack, Box } from "@mui/material";
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

  const { conversations, current_messages } = useSelector(
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

  useEffect(() => {
    if (!room_id || !currentUserId) return;
    const current = conversations.find((el) => el?.id === room_id);
    if (!current) return;
    dispatch(
      fetchCurrentMessages({ messages: current.messages, currentUserId })
    );
    dispatch(setCurrentConversation(current));
  }, [room_id, conversations, currentUserId, dispatch]);

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

  return (
    <Box p={isMobile ? 1 : 3}>
      <Stack spacing={3}>
        {current_messages.map((el) => {
          if (el.type === "divider")
            return <Timeline key={el.id || Math.random()} el={el} />;

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
                key={el.id || Math.random()}
                display="flex"
                justifyContent={alignment}
                alignItems="flex-end"
                sx={{ position: "relative", cursor: "grab" }}
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
                        bottom: 0,
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
  const { current_messages } = useSelector(
    (state) => state.conversation.direct_chat
  );

  useEffect(() => {
    if (!messageListRef.current) return;
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
          overflow: "scroll",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F0F4FA"
              : theme.palette.background,
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
