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

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  const getCurrentChatInfo = () => {
    if (chat_type === "group") {
      return current_room;
    } else {
      return current_conversation;
    }
  };

  const currentChatInfo = getCurrentChatInfo();

  const getCurrentMessages = () => {
    if (chat_type === "group") {
      return current_room?.messages || [];
    } else {
      return current_messages || [];
    }
  };

  const currentMessages = getCurrentMessages();

  const formatMessageDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

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

  const groupMessagesByDate = (messages) => {
    if (!messages || messages.length === 0) return [];

    const groupedMessages = [];
    let currentDateGroup = null;

    messages.forEach((message) => {
      const messageDate = new Date(message.createdAt || message.time);
      const dateKey = messageDate.toDateString();

      if (!currentDateGroup || currentDateGroup.dateKey !== dateKey) {
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

      currentDateGroup.messages.push(message);
    });

    if (currentDateGroup) {
      groupedMessages.push(currentDateGroup);
    }

    return groupedMessages;
  };

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

  const shouldShowSenderName = useCallback(
    (currentMessage, previousMessage, chatType) => {
      if (!previousMessage) return true;
      if (chatType === "individual") return false;
      if (currentMessage.subtype === "system") return false;

      if (
        currentMessage.sender?.keycloakId !== previousMessage.sender?.keycloakId
      ) {
        return true;
      }

      const currentTime = new Date(
        currentMessage.createdAt || currentMessage.time
      );
      const previousTime = new Date(
        previousMessage.createdAt || previousMessage.time
      );
      const timeDiff = Math.abs(currentTime - previousTime) / (1000 * 60 * 60);

      if (timeDiff > 24) {
        return true;
      }

      return false;
    },
    []
  );

  const isStartOfMessageGroup = useCallback(
    (currentMessage, nextMessage, chatType) => {
      if (!nextMessage) return true;
      if (chatType === "individual") return true;

      if (
        currentMessage.sender?.keycloakId !== nextMessage.sender?.keycloakId
      ) {
        return true;
      }

      const currentTime = new Date(
        currentMessage.createdAt || currentMessage.time
      );
      const nextTime = new Date(nextMessage.createdAt || nextMessage.time);
      const timeDiff = Math.abs(nextTime - currentTime) / (1000 * 60 * 60);

      if (timeDiff > 24) {
        return true;
      }

      return false;
    },
    []
  );

  const SenderName = ({ message }) => {
    if (!message.sender || chat_type === "individual") return null;

    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mb: 0.5,
          ml: message.outgoing ? "auto" : 0, // Sửa: bỏ margin left
          mr: message.outgoing ? 0 : "auto", // Sửa: bỏ margin right
          justifyContent: message.outgoing ? "flex-end" : "flex-start",
          maxWidth: "100%",
        }}
      >
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

  // 🆕 SỬA: Component MessageWrapper với avatar nhỏ hơn và căn chỉnh sát hơn
  // 🆕 SỬA: Component MessageWrapper với avatar ở dưới chân tin nhắn
  const MessageWrapper = ({
    message,
    showSenderName,
    isStartOfGroup,
    children,
  }) => {
    const isOutgoing = message.outgoing;

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: isOutgoing ? "flex-end" : "flex-start",
          alignItems: "flex-end", // 🆕 SỬA: align items về bottom
          mb: isStartOfGroup ? 1 : 0.25,
          px: 1,
          position: "relative",
        }}
      >
        {/* Avatar cho incoming messages - CHUYỂN XUỐNG DƯỚI */}
        {!isOutgoing && chat_type === "group" && (
          <Box
            sx={{
              width: 28,
              height: 28,
              mr: 1,
              visibility: isStartOfGroup ? "visible" : "hidden",
              display: "flex",
              alignItems: "flex-end", // 🆕 Căn avatar về bottom
              justifyContent: "center",
              order: 1, // 🆕 Avatar sẽ là phần tử đầu tiên (bên trái)
            }}
          >
            {isStartOfGroup && (
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                }}
                src={message.sender?.avatar}
                alt={message.sender?.username}
              />
            )}
          </Box>
        )}

        {/* Container cho tin nhắn và tên người gửi */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "70%",
            minWidth: isOutgoing ? "auto" : "-50",
            ...(isOutgoing && {
              alignItems: "flex-end",
            }),
            order: 2, // 🆕 Message content là phần tử thứ hai
          }}
        >
          {/* Tên người gửi - VẪN Ở TRÊN */}
          {showSenderName && chat_type === "group" && (
            <SenderName message={message} />
          )}

          {/* Nội dung tin nhắn */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: isOutgoing ? "flex-end" : "flex-start",
              width: "100%",
            }}
          >
            {children}
          </Box>
        </Box>

        {/* Placeholder cho outgoing messages - CHUYỂN XUỐNG DƯỚI */}
        {isOutgoing && (
          <Box
            sx={{
              width: 28,
              ml: 1,
              flexShrink: 0,
              order: 3, // 🆕 Placeholder là phần tử thứ ba (bên phải)
            }}
          />
        )}
      </Box>
    );
  };

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

  useEffect(() => {
    console.log("🎯 Conversation - RENDER DEBUG:", {
      currentMessages_length: currentMessages.length,
      current_room_messages_length: current_room?.messages?.length,
      room_id,
      chat_type,
    });
  }, [currentMessages, current_room, room_id, chat_type]);

  useEffect(() => {
    console.log("🔄 Conversation - Check if should fetch messages:", {
      room_id,
      chat_type,
      current_room_id: current_room?.id,
      current_room_messages_count: current_room?.messages?.length,
      current_messages_count: current_messages?.length,
    });

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
      setIsLoadingMessages(false);
    }
  }, [room_id, chat_type, current_room, dispatch]);

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

      const shouldSetNewRoom =
        !current_room ||
        current_room.id !== room_id ||
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

    if (!currentChat && room_id) {
      console.log("🔄 Force setting current chat from room_id");
      setCurrentChatFromRoomId();
    }
  }, [room_id, chat_type, setCurrentChatFromRoomId]);

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

  const messagesKey =
    currentMessages.length > 0
      ? `messages-${currentMessages.length}-${
          currentMessages[currentMessages.length - 1]?.id
        }`
      : "no-messages";

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

  const groupedMessages = groupMessagesByDate(currentMessages);

  return (
    <Box p={isMobile ? 0.5 : 2} key={messagesKey}>
      {" "}
      {/* Giảm padding container */}
      <Stack spacing={0.5}>
        {" "}
        {/* Giảm spacing giữa các message */}
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
                if (!el) return null;

                if (el.type === "divider") {
                  return <Timeline key={el.id || `divider-${index}`} el={el} />;
                }

                if (el.type === "msg") {
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

                  return (
                    <MessageWrapper
                      key={el.id || `msg-${groupIndex}-${index}`}
                      message={el}
                      showSenderName={showSenderName}
                      isStartOfGroup={isStartOfGroup}
                    >
                      <MsgComponent el={el} menu={menu} />
                    </MessageWrapper>
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

    messageListRef.current.scrollTop = messageListRef.current.scrollHeight;

    console.log("✅ Scrolled to bottom:", {
      scrollTop: messageListRef.current.scrollTop,
      scrollHeight: messageListRef.current.scrollHeight,
    });
  }, [current_messages, current_room?.messages]);

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
