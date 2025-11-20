import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Stack,
  Box,
  Typography,
  CircularProgress,
  Avatar,
} from "@mui/material";
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
  setCurrentGroupRoom,
  fetchGroupMessages,
} from "../../redux/slices/conversation";
import { useKeycloak } from "@react-keycloak/web";

const Conversation = ({ isMobile, menu }) => {
  const dispatch = useDispatch();
  const theme = useTheme();

  const { conversations, current_conversation, current_messages } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { rooms, current_room } = useSelector(
    (state) => state.conversation.group_chat
  );
  const { room_id, chat_type } = useSelector((state) => state.app);
  const { keycloak, initialized } = useKeycloak();

  const currentUserId =
    initialized && keycloak?.authenticated ? keycloak?.subject : null;

  const [dragState, setDragState] = useState({
    dragging: false,
    activeMsgId: null,
    startX: 0,
    dragOffset: 0,
  });

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // 🆕 SỬA: Lấy current chat info từ conversation state thay vì app state
  const getCurrentChatInfo = () => {
    if (chat_type === "group") {
      return current_room;
    } else {
      return current_conversation;
    }
  };

  const currentChatInfo = getCurrentChatInfo();

  // 🆕 SỬA: Lấy messages dựa trên chat_type
  const getCurrentMessages = () => {
    if (chat_type === "group") {
      return current_room?.messages || [];
    } else {
      return current_messages || [];
    }
  };

  const currentMessages = getCurrentMessages();

  // 🆕 THÊM: Hàm format ngày
  const formatMessageDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // So sánh ngày (bỏ qua giờ)
    const isToday = date.toDateString() === today.toDateString();
    const isYesterday = date.toDateString() === yesterday.toDateString();

    if (isToday) {
      return "Today";
    } else if (isYesterday) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
  };

  // 🆕 THÊM: Hàm nhóm tin nhắn theo ngày
  const groupMessagesByDate = (messages) => {
    if (!messages || messages.length === 0) return [];

    const groupedMessages = [];
    let currentDateGroup = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt || message.time);
      const dateKey = messageDate.toDateString(); // Chỉ so sánh ngày, không so giờ

      if (!currentDateGroup || currentDateGroup.dateKey !== dateKey) {
        // Tạo timeline divider cho ngày mới
        if (currentDateGroup) {
          groupedMessages.push(currentDateGroup);
        }

        currentDateGroup = {
          type: "date_group",
          dateKey: dateKey,
          date: messageDate,
          displayDate: formatMessageDate(messageDate),
          messages: [],
        };
      }

      // Thêm message vào nhóm hiện tại
      currentDateGroup.messages.push(message);
    });

    // Thêm nhóm cuối cùng
    if (currentDateGroup) {
      groupedMessages.push(currentDateGroup);
    }

    return groupedMessages;
  };

  // 🆕 THÊM: Component hiển thị date divider
  const DateDivider = ({ date }) => {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          my: 2,
          px: 2,
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 0.5,
            backgroundColor:
              theme.palette.mode === "light"
                ? "#E8EDF5"
                : "rgba(255,255,255,0.1)",
            borderRadius: 2,
            border: `1px solid ${
              theme.palette.mode === "light"
                ? "#D1D9E8"
                : "rgba(255,255,255,0.2)"
            }`,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              color: "text.secondary",
              fontWeight: 500,
              fontSize: "0.7rem",
            }}
          >
            {date}
          </Typography>
        </Box>
      </Box>
    );
  };

  // 🆕 THÊM: Hàm xác định khi nào hiển thị tên người gửi - SỬA THÀNH 1 NGÀY
  const shouldShowSenderName = useCallback(
    (currentMessage, previousMessage, chatType) => {
      // Nếu là tin nhắn đầu tiên
      if (!previousMessage) return true;

      // Nếu là direct chat, không hiển thị tên
      if (chatType === "individual") return false;

      // Nếu là tin nhắn system
      if (currentMessage.subtype === "system") return false;

      // Nếu người gửi khác với tin nhắn trước
      if (
        currentMessage.sender?.keycloakId !== previousMessage.sender?.keycloakId
      ) {
        return true;
      }

      // 🆕 SỬA: KIỂM TRA THỜI GIAN: Nếu cách nhau quá 1 NGÀY (24 giờ), hiển thị lại tên
      const currentTime = new Date(
        currentMessage.createdAt || currentMessage.time
      );
      const previousTime = new Date(
        previousMessage.createdAt || previousMessage.time
      );
      const timeDiff = Math.abs(currentTime - previousTime) / (1000 * 60 * 60); // giờ

      if (timeDiff > 24) {
        return true;
      }

      return false;
    },
    []
  );

  // 🆕 THÊM: Hàm xác định khi nào là đầu đoạn tin nhắn - SỬA THÀNH 1 NGÀY
  const isStartOfMessageGroup = useCallback(
    (currentMessage, nextMessage, chatType) => {
      // Nếu là tin nhắn cuối cùng
      if (!nextMessage) return true;

      // Nếu là direct chat, luôn là đầu đoạn
      if (chatType === "individual") return true;

      // Nếu người gửi khác với tin nhắn tiếp theo
      if (
        currentMessage.sender?.keycloakId !== nextMessage.sender?.keycloakId
      ) {
        return true;
      }

      // 🆕 SỬA: KIỂM TRA THỜI GIAN: Nếu cách nhau quá 1 NGÀY (24 giờ), là đầu đoạn
      const currentTime = new Date(
        currentMessage.createdAt || currentMessage.time
      );
      const nextTime = new Date(nextMessage.createdAt || nextMessage.time);
      const timeDiff = Math.abs(nextTime - currentTime) / (1000 * 60 * 60); // giờ

      if (timeDiff > 24) {
        return true;
      }

      return false;
    },
    []
  );

  // 🆕 THÊM: Component hiển thị tên người gửi
  const SenderName = ({ message, showAvatar = false }) => {
    if (!message.sender || chat_type === "individual") return null;

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 0.5,
          ml: message.outgoing ? "auto" : 4.5,
          mr: message.outgoing ? 3 : "auto",
          justifyContent: message.outgoing ? "flex-end" : "flex-start",
          maxWidth: "70%",
          px: 1,
        }}
      >
        {showAvatar && !message.outgoing && (
          <Avatar
            sx={{ width: 24, height: 24 }}
            src={message.sender.avatar}
            alt={message.sender.username}
          />
        )}
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 500,
            fontSize: "0.75rem",
            textAlign: message.outgoing ? "right" : "left",
          }}
        >
          {message.outgoing ? "You" : message.sender.username}
        </Typography>
      </Box>
    );
  };

  // 🆕 THÊM: Debug message grouping
  useEffect(() => {
    if (currentMessages.length > 0) {
      const grouped = groupMessagesByDate(currentMessages);
      console.log("📅 Message Grouping Debug:", {
        totalMessages: currentMessages.length,
        dateGroups: grouped.length,
        groups: grouped.map((group) => ({
          date: group.displayDate,
          messageCount: group.messages?.length,
        })),
      });
    }
  }, [currentMessages]);

  // 🆕 THÊM: Debug render và messages
  useEffect(() => {
    console.log("🎯 Conversation - RENDER DEBUG:", {
      currentMessages_length: currentMessages.length,
      current_room_messages_length: current_room?.messages?.length,
      room_id,
      chat_type,
    });
  }, [currentMessages, current_room, room_id, chat_type]);

  // 🆕 SỬA QUAN TRỌNG: Fetch messages chỉ khi cần thiết
  useEffect(() => {
    console.log("🔄 Conversation - Check if should fetch messages:", {
      room_id,
      chat_type,
      current_room_id: current_room?.id,
      current_room_messages_count: current_room?.messages?.length,
      current_messages_count: current_messages?.length,
    });

    // 🆕 CHỈ fetch messages khi:
    // 1. Có room_id hợp lệ
    // 2. Là group chat
    // 3. current_room TỒN TẠI nhưng KHÔNG có messages HOẶC messages rỗng
    if (room_id && chat_type === "group" && current_room?.id === room_id) {
      const shouldFetch =
        !current_room.messages || current_room.messages.length === 0;

      console.log("🔍 Should fetch group messages?", {
        shouldFetch,
        hasMessages: !!current_room.messages,
        messagesCount: current_room.messages?.length,
      });

      if (shouldFetch) {
        console.log("🔄 Conversation - Fetching messages for group:", room_id);
        setIsLoadingMessages(true);
        dispatch(fetchGroupMessages(room_id))
          .then(() => setIsLoadingMessages(false))
          .catch(() => setIsLoadingMessages(false));
      } else {
        console.log("✅ Using existing messages, no fetch needed");
        setIsLoadingMessages(false);
      }
    } else if (room_id && chat_type === "individual") {
      // Đối với direct chat, messages đã được load cùng với conversation
      setIsLoadingMessages(false);
    }
  }, [room_id, chat_type, current_room, dispatch]);

  // 🆕 SỬA QUAN TRỌNG: setCurrentChatFromRoomId với logic bảo vệ messages
  const setCurrentChatFromRoomId = useCallback(() => {
    console.log("🔄 setCurrentChatFromRoomId called", {
      room_id,
      chat_type,
      currentUserId,
      current_room_exists: !!current_room,
      current_room_messages: current_room?.messages?.length,
    });

    if (!room_id || !currentUserId) {
      console.log("❌ Missing room_id or currentUserId");
      return null;
    }

    if (chat_type === "group") {
      const currentRoom = rooms.find((el) => el?.id === room_id);
      console.log("🔍 Looking for group room with room_id:", room_id);
      console.log("🔍 Found group room:", {
        id: currentRoom?.id,
        name: currentRoom?.name,
        messages_count: currentRoom?.messages?.length,
      });

      if (!currentRoom) {
        console.log("❌ No group room found for room_id:", room_id);
        return null;
      }

      // 🆕 QUAN TRỌNG: CHỈ dispatch khi THỰC SỰ CẦN THIẾT
      const shouldSetNewRoom =
        // Chưa có current room
        !current_room ||
        // Current room khác với room muốn set
        current_room.id !== room_id ||
        // Current room không có messages nhưng room mới có
        (!current_room.messages?.length && currentRoom.messages?.length);

      console.log("🔍 Should set new room?", {
        shouldSetNewRoom,
        hasCurrentRoom: !!current_room,
        sameRoom: current_room?.id === room_id,
        currentHasMessages: current_room?.messages?.length,
        newHasMessages: currentRoom.messages?.length,
      });

      if (!shouldSetNewRoom) {
        console.log("✅ Already correct room with messages, skipping set");
        return current_room;
      }

      console.log("🔄 Setting current group room:", {
        id: currentRoom.id,
        name: currentRoom.name,
        messages_count: currentRoom.messages?.length,
      });
      dispatch(setCurrentGroupRoom(currentRoom));
      return currentRoom;
    } else {
      const currentConv = conversations.find((el) => el?.id === room_id);
      console.log("🔍 Looking for conversation with room_id:", room_id);
      console.log("🔍 Found conversation:", currentConv);

      if (!currentConv) {
        console.log("❌ No conversation found for room_id:", room_id);
        return null;
      }

      console.log("🔄 Setting current conversation:", {
        id: currentConv.id,
        name: currentConv.name,
        user_id: currentConv.user_id,
        messages_count: currentConv.messages?.length,
      });
      dispatch(setCurrentConversation(currentConv));
      dispatch(
        fetchCurrentMessages({
          messages: currentConv.messages || [],
          currentUserId,
        })
      );
      return currentConv;
    }
  }, [
    room_id,
    chat_type,
    conversations,
    rooms,
    currentUserId,
    dispatch,
    current_room,
  ]);

  useEffect(() => {
    const currentChat = setCurrentChatFromRoomId();

    // Nếu current chat bị null nhưng có room_id, force set lại
    if (!currentChat && room_id) {
      console.log("🔄 Force setting current chat from room_id");
      setCurrentChatFromRoomId();
    }
  }, [room_id, chat_type, setCurrentChatFromRoomId]);

  // Debug để theo dõi state
  useEffect(() => {
    console.log("🔵 Conversation Debug:", {
      room_id,
      chat_type,
      currentChatInfo: currentChatInfo?.id,
      current_conversation: current_conversation?.id,
      current_room: current_room?.id,
      current_messages_count: currentMessages.length,
      isLoadingMessages,
      current_room_messages_source:
        current_room?.messages?.length > 0 ? "has_messages" : "empty",
    });
  }, [
    room_id,
    chat_type,
    currentChatInfo,
    current_conversation,
    current_room,
    currentMessages,
    isLoadingMessages,
  ]);

  // --- Drag handlers (giữ nguyên) ---
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

  // 🆕 TẠM THỜI: Key để force re-render khi messages thay đổi
  const messagesKey =
    currentMessages.length > 0
      ? `messages-${currentMessages.length}-${
          currentMessages[currentMessages.length - 1]?.id
        }`
      : "no-messages";

  // 🆕 SỬA: Hiển thị loading nếu đang loading messages
  if (isLoadingMessages) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading messages...
        </Typography>
      </Box>
    );
  }

  // 🆕 SỬA: Hiển thị placeholder khi không có conversation được chọn
  if (!room_id || !currentChatInfo) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          flexDirection: "column",
          gap: 2,
          p: 3,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          {!room_id ? "Select a conversation" : "Loading conversation..."}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {!room_id
            ? "Choose a conversation from the list to start chatting"
            : "Please wait while we load the conversation..."}
        </Typography>
      </Box>
    );
  }

  // 🆕 SỬA: Nhóm tin nhắn theo ngày
  const groupedMessages = groupMessagesByDate(currentMessages);

  return (
    <Box p={isMobile ? 1 : 3} key={messagesKey}>
      <Stack spacing={1}>
        {groupedMessages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No messages yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start the conversation with {currentChatInfo?.name}!
            </Typography>
          </Box>
        ) : (
          groupedMessages.map((dateGroup, groupIndex) => (
            <React.Fragment
              key={`date-group-${dateGroup.dateKey}-${groupIndex}`}
            >
              {/* Date Divider */}
              <DateDivider date={dateGroup.displayDate} />

              {/* Messages in this date */}
              {dateGroup.messages.map((el, index) => {
                // 🆕 SỬA: Validate message data
                if (!el) return null;

                if (el.type === "divider") {
                  return <Timeline key={el.id || `divider-${index}`} el={el} />;
                }

                if (el.type === "msg") {
                  const isOutgoing = el.outgoing;
                  const alignment = isOutgoing ? "flex-end" : "flex-start";

                  // 🆕 XÁC ĐỊNH KHI NÀO HIỂN THỊ TÊN NGƯỜI GỬI (TRONG CÙNG NGÀY)
                  const previousMessage =
                    index > 0 ? dateGroup.messages[index - 1] : null;
                  const nextMessage =
                    index < dateGroup.messages.length - 1
                      ? dateGroup.messages[index + 1]
                      : null;

                  const showSenderName = shouldShowSenderName(
                    el,
                    previousMessage,
                    chat_type
                  );
                  const isStartOfGroup = isStartOfMessageGroup(
                    el,
                    nextMessage,
                    chat_type
                  );

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
                      key={el.id || `msg-${groupIndex}-${index}`}
                      sx={{
                        position: "relative",
                        marginBottom: isStartOfGroup ? 1 : 0.5,
                      }}
                    >
                      {/* 🆕 HIỂN THỊ TÊN NGƯỜI GỬI */}
                      {showSenderName && chat_type === "group" && (
                        <SenderName message={el} />
                      )}

                      <Box
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
                            transition: dragState.dragging
                              ? "none"
                              : "transform 0.2s",
                            position: "relative",
                            // 🆕 THÊM AVATAR CHO ĐẦU ĐOẠN TIN NHẮN
                            ...(isStartOfGroup &&
                              !el.outgoing &&
                              chat_type === "group" && {
                                alignItems: "flex-start",
                              }),
                          }}
                        >
                          {/* 🆕 AVATAR CHO INCOMING MESSAGES */}
                          {isStartOfGroup &&
                            !el.outgoing &&
                            chat_type === "group" && (
                              <Avatar
                                sx={{
                                  width: 32,
                                  height: 32,
                                  mr: 1,
                                  mt: 0.5,
                                }}
                                src={el.sender?.avatar}
                                alt={el.sender?.username}
                              />
                            )}

                          <Box
                            sx={{
                              // 🆕 THÊM MARGIN ĐỂ CÂN CHỈNH KHI CÓ AVATAR
                              ...(isStartOfGroup &&
                                !el.outgoing &&
                                chat_type === "group" && {
                                  marginLeft: 0,
                                }),
                            }}
                          >
                            <MsgComponent el={el} menu={menu} />
                          </Box>

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
                    </Box>
                  );
                }

                return null;
              })}
            </React.Fragment>
          ))
        )}
      </Stack>
    </Box>
  );
};

// ChatComponent giữ nguyên
const ChatComponent = () => {
  const isMobile = useResponsive("between", "md", "xs", "sm");
  const theme = useTheme();
  const messageListRef = useRef(null);
  const { current_messages, current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { current_room } = useSelector(
    (state) => state.conversation.group_chat
  );
  const { chat_type, room_id } = useSelector((state) => state.app);

  // 🆕 SỬA: Lấy current chat info từ conversation state
  const currentChatInfo =
    chat_type === "group" ? current_room : current_conversation;

  useEffect(() => {
    console.log("🔍 ChatComponent - current state:", {
      room_id,
      chat_type,
      currentChatInfo: currentChatInfo?.id,
      current_conversation: current_conversation?.id,
      current_room: current_room?.id,
      direct_messages_count: current_messages?.length,
      group_messages_count: current_room?.messages?.length,
    });
  }, [
    chat_type,
    current_conversation,
    current_room,
    room_id,
    currentChatInfo,
    current_messages,
  ]);

  // 🆕 THÊM DEBUG SCROLL
  useEffect(() => {
    if (!messageListRef.current) {
      console.log("❌ messageListRef not available");
      return;
    }

    console.log("🔄 Auto-scroll triggered:", {
      current_messages_count: current_messages?.length,
      current_room_messages_count: current_room?.messages?.length,
      scrollHeight: messageListRef.current.scrollHeight,
      clientHeight: messageListRef.current.clientHeight,
    });

    // Auto scroll to bottom khi có messages mới
    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;

    console.log("✅ Scrolled to bottom:", {
      scrollTop: messageListRef.current.scrollTop,
      scrollHeight: messageListRef.current.scrollHeight,
    });
  }, [current_messages, current_room?.messages]);

  return (
    <Stack height="100%" maxHeight="100vh" width={isMobile ? "100vw" : "auto"}>
      {/* ChatHeader sẽ tự động hiển thị thông tin dựa trên current_conversation và current_room */}
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
