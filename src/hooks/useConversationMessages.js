import { useState, useEffect, useCallback, useMemo } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCurrentMessages,
  setCurrentConversation,
  setCurrentGroupRoom,
  fetchGroupMessages,
} from "../../redux/slices/conversation";
import { useKeycloak } from "@react-keycloak/web";

export const useConversationMessages = () => {
  const dispatch = useDispatch();

  const { conversations, current_conversation, current_messages } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { rooms, current_room } = useSelector(
    (state) => state.conversation.group_chat
  );
  const { room_id, chat_type } = useSelector((state) => state.app);
  const { keycloak } = useKeycloak();

  const currentUserId = keycloak?.subject;
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Lấy thông tin chat hiện tại
  const getCurrentChatInfo = useCallback(() => {
    if (chat_type === "group") {
      return current_room;
    } else {
      return current_conversation;
    }
  }, [chat_type, current_room, current_conversation]);

  // Lấy messages hiện tại
  const getCurrentMessages = useCallback(() => {
    if (chat_type === "group") {
      return current_room?.messages || [];
    } else {
      return current_messages || [];
    }
  }, [chat_type, current_room, current_messages]);

  const currentChatInfo = getCurrentChatInfo();
  const currentMessages = getCurrentMessages();

  // Filter messages để hiển thị
  const displayMessages = useMemo(() => {
    console.log("📊 useConversationMessages - displayMessages:", {
      currentMessagesLength: currentMessages?.length,
      room_id,
      chat_type,
      currentChatInfoId: currentChatInfo?.id,
    });
    return currentMessages || [];
  }, [currentMessages]);

  // Set current chat từ room_id - THÊM LOGIC FETCH MESSAGES
  const setCurrentChatFromRoomId = useCallback(() => {
    console.log("🔄 setCurrentChatFromRoomId:", {
      room_id,
      chat_type,
      currentUserId,
    });

    if (!room_id) return null;

    if (chat_type === "group") {
      const currentRoom = rooms.find((el) => el?.id === room_id);
      if (!currentRoom) return null;

      const shouldSetNewRoom =
        !current_room ||
        current_room.id !== room_id ||
        (!current_room.messages?.length && currentRoom.messages?.length);

      if (shouldSetNewRoom) {
        console.log("🔄 Setting group room and fetching messages");
        dispatch(setCurrentGroupRoom(currentRoom));

        // Fetch messages nếu cần
        if (!currentRoom.messages || currentRoom.messages.length === 0) {
          setIsLoadingMessages(true);
          dispatch(fetchGroupMessages(room_id))
            .then(() => setIsLoadingMessages(false))
            .catch(() => setIsLoadingMessages(false));
        }
      }
      return currentRoom;
    } else {
      const currentConv = conversations.find((el) => el?.id === room_id);
      if (!currentConv) return null;

      console.log("🔄 Setting direct conversation:", {
        id: currentConv.id,
        name: currentConv.name,
        hasMessages: !!currentConv.messages,
        messagesCount: currentConv.messages?.length,
      });

      dispatch(setCurrentConversation(currentConv));

      // QUAN TRỌNG: Fetch messages vào Redux
      if (
        currentConv.messages &&
        currentConv.messages.length > 0 &&
        currentUserId
      ) {
        console.log("🔄 Fetching messages to Redux");
        dispatch(
          fetchCurrentMessages({
            messages: currentConv.messages,
            currentUserId,
          })
        );
      }

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

  // Auto set current chat
  useEffect(() => {
    console.log("🎯 useConversationMessages - useEffect trigger:", {
      room_id,
      chat_type,
      currentUserId,
    });
    setCurrentChatFromRoomId();
  }, [room_id, chat_type, setCurrentChatFromRoomId]);

  return {
    isLoadingMessages,
    currentChatInfo,
    currentMessages,
    displayMessages,
    setCurrentChatFromRoomId,
  };
};
