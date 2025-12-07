import { useEffect, useCallback } from "react";
import { useDispatch } from "react-redux";
import {
  addDirectMessage,
  addGroupMessage,
} from "../../redux/slices/conversation";

export const useSocketHandlers = (
  room_id,
  chat_type,
  currentUserId,
  e2eeDecryption
) => {
  const dispatch = useDispatch();

  const handleReceiveEncryptedMessage = useCallback(
    async (data) => {
      const messageData = Array.isArray(data) ? data[0] : data;

      // Kiểm tra có thuộc conversation hiện tại không
      const isForCurrentConversation =
        messageData.conversationId === room_id ||
        messageData.roomId === room_id;

      if (!isForCurrentConversation) return;

      const timestamp = messageData.timestamp || new Date().toISOString();
      const messageObject = {
        id: messageData.messageId,
        _id: messageData.messageId,
        type: "msg",
        subtype: "text",
        message: "🔒 Encrypted message",
        content: "🔒 Encrypted message",
        sender: {
          keycloakId: messageData.senderId,
          username: messageData.senderName || "Unknown",
        },
        isEncrypted: true,
        ciphertext: messageData.ciphertext,
        iv: messageData.iv,
        keyId: messageData.keyId,
        algorithm: messageData.algorithm,
        createdAt: timestamp,
        time: new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        incoming: messageData.senderId !== currentUserId,
        outgoing: messageData.senderId === currentUserId,
        encryptionStatus: "encrypted",
        isDecrypted: false,
        decryptedContent: null,
      };

      if (chat_type === "group") {
        dispatch(
          addGroupMessage({
            message: messageObject,
            room_id: messageData.roomId || messageData.conversationId,
            isOptimistic: false,
          })
        );
      } else {
        dispatch(
          addDirectMessage({
            message: messageObject,
            conversation_id: messageData.conversationId,
            currentUserId: currentUserId,
            isGroup: false,
            isOptimistic: false,
          })
        );
      }
    },
    [room_id, chat_type, currentUserId, dispatch]
  );

  // Setup socket listeners
  useEffect(() => {
    const socket = window.socket;
    if (!socket) return;

    const handleMessageDecrypted = (data) => {
      console.log("Message decrypted:", data);
    };

    const handleNewMessageNotification = (data) => {
      console.log("New message notification:", data);
    };

    socket.on("receive_encrypted_message", handleReceiveEncryptedMessage);
    socket.on("message_decrypted", handleMessageDecrypted);
    socket.on("new_message", handleNewMessageNotification);
    socket.on("message_received", handleNewMessageNotification);

    return () => {
      socket.off("receive_encrypted_message", handleReceiveEncryptedMessage);
      socket.off("message_decrypted", handleMessageDecrypted);
      socket.off("new_message", handleNewMessageNotification);
      socket.off("message_received", handleNewMessageNotification);
    };
  }, [handleReceiveEncryptedMessage]);

  return { handleReceiveEncryptedMessage };
};
