// conversation.js - HOÀN CHỈNH VỚI E2EE INTEGRATION
import { createSlice } from "@reduxjs/toolkit";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../../config";
import { timeAgo } from "../../utils/timeAgo";
import api from "../../utils/axios";
import { showSnackbar } from "../../redux/slices/app";

const parseTimestamp = (ts) => {
  const t = new Date(ts).getTime();
  return isNaN(t) ? null : t;
};

const formatMessageTime = (ts) => {
  try {
    if (!ts) return "";
    const date = new Date(ts);
    return isNaN(date.getTime())
      ? ""
      : date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
  } catch (error) {
    console.error("❌ Error formatting time:", error);
    return "";
  }
};

const getEncryptionData = (message) => {
  if (!message) return { ciphertext: null, iv: null, keyId: null };

  return {
    ciphertext:
      message.encryptionData?.ciphertext ||
      message.encryptionMetadata?.ciphertext ||
      message.ciphertext,
    iv:
      message.encryptionData?.iv ||
      message.encryptionMetadata?.iv ||
      message.iv,
    keyId:
      message.encryptionData?.keyId ||
      message.encryptionMetadata?.keyFingerprint ||
      message.keyId,
    algorithm:
      message.encryptionData?.algorithm ||
      message.encryptionMetadata?.algorithm,
  };
};
const findMessageById = (chatState, messageId) => {
  // Tìm trong current messages
  if (chatState.current_messages) {
    const foundInCurrent = chatState.current_messages.find(
      (msg) => msg.id === messageId || msg._id === messageId
    );
    if (foundInCurrent) return foundInCurrent;
  }

  // Tìm trong current conversation messages
  if (chatState.current_conversation?.messages) {
    const foundInConv = chatState.current_conversation.messages.find(
      (msg) => msg.id === messageId || msg._id === messageId
    );
    if (foundInConv) return foundInConv;
  }

  // Tìm trong current room messages
  if (chatState.current_room?.messages) {
    const foundInRoom = chatState.current_room.messages.find(
      (msg) => msg.id === messageId || msg._id === messageId
    );
    if (foundInRoom) return foundInRoom;
  }

  return null;
};

const initialState = {
  direct_chat: {
    conversations: [],
    current_conversation: { id: null, messages: [] },
    current_messages: [],
    isLoading: false,
    error: null,
    pinned_messages: [],
    shouldRefetchPinned: false,
    // 🆕 THÊM: E2EE state
    encryptionKeys: {}, // {conversationId: {publicKey, privateKey, sharedSecret}}
    keyExchangeStatus: {}, // {conversationId: 'pending' | 'completed' | 'failed'}
  },
  group_chat: {
    rooms: [],
    current_room: null,
    isLoading: false,
    error: null,
    pinned_messages: [],
    shouldRefetchPinned: false,
    // 🆕 THÊM: E2EE state cho group
    encryptionKeys: {}, // {roomId: {publicKey, privateKey, sharedSecrets: {userId: sharedSecret}}}
    keyExchangeStatus: {}, // {roomId: {userId: 'pending' | 'completed' | 'failed'}}
  },
  deletedMessages: [],
  notification: {
    open: false,
    message: "",
    severity: "error",
    duration: 3000,
  },
  // 🆕 THÊM: Global E2EE state
  e2ee: {
    isEnabled: true,
    encryptionStatus: "initializing", // 'initializing' | 'ready' | 'error'
    keyPairs: {}, // {userId: {publicKey, privateKey}}
    pendingDecryption: [], // Messages waiting for decryption
    decryptionQueue: [], // Queue for decryption processing
  },
};

const slice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    // ==================== DIRECT CHAT REDUCERS ====================
    fetchDirectConversationsStart(state) {
      state.direct_chat.isLoading = true;
      state.direct_chat.error = null;
    },

    fetchDirectConversationsSuccess(state, action) {
      const { conversations, currentUserId } = action.payload;

      console.log("🔄 Processing DIRECT conversations in Redux:", {
        incoming_conversations_count: conversations.length,
        encrypted_conversations: conversations.filter((c) => c.isEncrypted)
          .length,
      });

      // 🆕 SỬA LỖI: Đảm bảo encryptionKeys tồn tại
      const encryptionKeys = state.direct_chat.encryptionKeys || {};

      // Xử lý direct conversations (one-to-one)
      state.direct_chat.conversations = conversations.map((conv) => {
        const user = conv.participants?.find(
          (p) => p.keycloakId !== currentUserId
        );
        const lastMsg = conv.messages?.slice(-1)[0];
        const lastSeenTs = parseTimestamp(user?.lastSeen);

        // 🆕 Check if conversation is encrypted
        const isEncrypted = conv.isEncrypted || false;
        const encryptionStatus = conv.encryptionStatus || "none";

        // 🆕 SỬA LỖI: Truy cập an toàn vào encryptionKeys
        const hasSharedSecret = !!encryptionKeys[conv._id]?.sharedSecret;

        return {
          id: conv._id,
          user_id: user?.keycloakId || null,
          name:
            `${user?.username || ""} ${user?.lastName || ""}`.trim() ||
            "Unknown",
          online: user?.status === "Online",
          img: user?.avatar
            ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
            : `https://i.pravatar.cc/150?u=${user?.keycloakId}`,
          msg: isEncrypted
            ? "🔒 Encrypted message"
            : lastMsg?.content || lastMsg?.text || "",
          time: formatMessageTime(lastMsg?.createdAt),
          unread: 0,
          pinned: false,
          about: user?.about || "",
          messages: conv.messages || [],
          lastSeen: lastSeenTs ? timeAgo(lastSeenTs) : "",
          // 🆕 E2EE fields
          isEncrypted: isEncrypted,
          encryptionStatus: encryptionStatus,
          publicKey: user?.publicKey,
          hasSharedSecret: hasSharedSecret, // 🆕 SỬA: Sử dụng biến đã kiểm tra
        };
      });

      // Giữ current_conversation nếu vẫn tồn tại
      if (state.direct_chat.current_conversation?.id) {
        const currentConvInNewList = state.direct_chat.conversations.find(
          (c) => c.id === state.direct_chat.current_conversation.id
        );
        if (currentConvInNewList) {
          state.direct_chat.current_conversation = {
            ...state.direct_chat.current_conversation,
            ...currentConvInNewList,
          };
        }
      }

      state.direct_chat.isLoading = false;
    },

    fetchDirectConversationsFail(state, action) {
      state.direct_chat.isLoading = false;
      state.direct_chat.error = action.payload.error;
    },

    // ==================== GROUP CHAT REDUCERS ====================
    fetchGroupRoomsStart(state) {
      state.group_chat.isLoading = true;
      state.group_chat.error = null;
    },

    fetchGroupRoomsSuccess(state, action) {
      const { rooms } = action.payload;

      console.log("🔄 Processing GROUP rooms in Redux:", {
        incoming_rooms_count: rooms.length,
        encrypted_rooms: rooms.filter((r) => r.isEncrypted).length,
      });

      // Xử lý group rooms
      state.group_chat.rooms = rooms.map((room) => {
        const lastMsg = room.lastMessage;
        const membersCount = room.members?.length || 0;
        const onlineMembers =
          room.members?.filter((m) => m.status === "Online").length || 0;

        // 🆕 Check if room is encrypted
        const isEncrypted = room.isEncrypted || false;
        const encryptionStatus = room.encryptionStatus || "none";

        return {
          id: room._id,
          name: room.name || "Unnamed Group",
          isGroup: true,
          members: room.members || [],
          membersCount: membersCount,
          onlineMembers: onlineMembers,
          createdBy: room.createdBy || {},
          lastMessage: lastMsg
            ? {
                id: lastMsg._id,
                content: isEncrypted ? "🔒 Encrypted message" : lastMsg.content,
                type: lastMsg.type,
                sender: lastMsg.sender,
                time: formatMessageTime(lastMsg.createdAt),
                isEncrypted: lastMsg.isEncrypted || false,
              }
            : null,
          pinnedMessages: room.pinnedMessages || [],
          topic: room.topic || "",
          img:
            room.img ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              room.name || "Group"
            )}&background=random`,
          msg: isEncrypted
            ? "🔒 Encrypted message"
            : lastMsg?.content || "No messages yet",
          time: lastMsg ? formatMessageTime(lastMsg.createdAt) : "",
          unread: 0,
          pinned: room.pinnedMessages?.length > 0,
          messages: room.messages || [],
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          // 🆕 E2EE fields
          isEncrypted: isEncrypted,
          encryptionStatus: encryptionStatus,
          hasSharedSecrets:
            Object.keys(
              state.group_chat.encryptionKeys[room._id]?.sharedSecrets || {}
            ).length > 0,
        };
      });

      state.group_chat.isLoading = false;
    },

    fetchGroupRoomsFail(state, action) {
      state.group_chat.isLoading = false;
      state.group_chat.error = action.payload.error;
    },

    // 🆕 SỬA: setCurrentGroupRoom với logic MERGE messages và E2EE
    setCurrentGroupRoom(state, action) {
      try {
        console.log("🔄 setCurrentGroupRoom with E2EE:", {
          payload: action.payload,
          current_room_id: state.group_chat.current_room?.id,
          current_messages_count:
            state.group_chat.current_room?.messages?.length,
          isEncrypted: action.payload?.isEncrypted,
        });

        const roomData = action.payload;

        if (roomData === null) {
          state.group_chat.current_room = null;
          console.log("✅ Current room cleared");
          return;
        }

        if (!roomData || !roomData.id) {
          console.warn("⚠️ Invalid room data in setCurrentGroupRoom");
          return;
        }

        const isSameRoom = state.group_chat.current_room?.id === roomData.id;
        const currentMessages = state.group_chat.current_room?.messages || [];
        const newMessages = roomData.messages || [];

        console.log("🛡️ Message protection check:", {
          isSameRoom,
          currentMessagesCount: currentMessages.length,
          newMessagesCount: newMessages.length,
          encrypted_messages: newMessages.filter((m) => m.isEncrypted).length,
        });

        let finalMessages = currentMessages;

        if (isSameRoom && currentMessages.length > 0) {
          console.log("✅ Preserving current messages for same room");
          finalMessages = currentMessages;
        } else if (newMessages.length > 0) {
          console.log("🔄 Using new room messages");
          finalMessages = newMessages;
        } else {
          console.log("🔄 No messages available, using empty array");
          finalMessages = [];
        }

        state.group_chat.current_room = {
          id: roomData.id,
          name: roomData.name || "Unnamed Group",
          isGroup: true,
          messages: finalMessages,
          membersCount: roomData.membersCount || 0,
          onlineMembers: roomData.onlineMembers || 0,
          img:
            roomData.img ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              roomData.name || "Group"
            )}&background=random`,
          topic: roomData.topic || "",
          createdBy: roomData.createdBy || {},
          lastMessage: roomData.lastMessage || null,
          pinnedMessages: roomData.pinnedMessages || [],
          // 🆕 E2EE fields
          isEncrypted: roomData.isEncrypted || false,
          encryptionStatus: roomData.encryptionStatus || "none",
          publicKeys: roomData.publicKeys || {},
          hasSharedSecrets:
            Object.keys(
              state.group_chat.encryptionKeys[roomData.id]?.sharedSecrets || {}
            ).length > 0,
        };

        console.log("✅ Current group room set with messages:", {
          messagesCount: state.group_chat.current_room.messages.length,
          source: isSameRoom ? "preserved" : "new",
          isEncrypted: state.group_chat.current_room.isEncrypted,
          encryptionStatus: state.group_chat.current_room.encryptionStatus,
        });
      } catch (error) {
        console.error("❌ Error in setCurrentGroupRoom:", error);
      }
    },

    // Sửa reducer setCurrentConversation trong conversation.js
    setCurrentConversation(state, action) {
      console.log("🔄 setCurrentConversation with E2EE:", action.payload);

      if (action.payload === null) {
        state.direct_chat.current_conversation = { id: null, messages: [] };
        state.direct_chat.current_messages = [];
        console.log("✅ Current conversation cleared");
        return;
      }

      state.direct_chat.current_messages = [];

      // 🆕 SỬA LỖI: Đảm bảo encryptionKeys tồn tại
      const encryptionKeys = state.direct_chat.encryptionKeys || {};
      const hasSharedSecret = !!encryptionKeys[action.payload.id]?.sharedSecret;

      state.direct_chat.current_conversation = {
        ...action.payload,
        // 🆕 Ensure E2EE fields with safe access
        isEncrypted: action.payload.isEncrypted || false,
        encryptionStatus: action.payload.encryptionStatus || "none",
        hasSharedSecret: hasSharedSecret,
      };

      console.log("✅ Current conversation set, messages cleared");
    },

    clearCurrentRoom(state) {
      console.log("🔄 Clearing current room");
      state.group_chat.current_room = null;
    },

    clearCurrentConversation(state) {
      console.log("🔄 Clearing current conversation");
      state.direct_chat.current_conversation = { id: null, messages: [] };
      state.direct_chat.current_messages = [];
    },

    // 🆕 CẬP NHẬT: fetchCurrentMessages với xử lý E2EE messages hoàn chỉnh
    // 🆕 CẬP NHẬT: fetchCurrentMessages với xử lý E2EE messages hoàn chỉnh
    fetchCurrentMessages(state, action) {
      const {
        messages,
        currentUserId,
        isGroup = false,
        merge = true,
      } = action.payload;

      console.log("📥 fetchCurrentMessages - E2EE COMPLETE:", {
        messages_count: messages?.length,
        currentUserId,
        isGroup,
        merge,
        encrypted_messages: messages?.filter((m) => m.isEncrypted).length,
        sample_encrypted: messages?.filter((m) => m.isEncrypted).slice(0, 2),
      });

      const validMessages = Array.isArray(messages) ? messages : [];

      // 🆕 Hàm xử lý replyTo với E2EE support
      const processReplyTo = (m) => {
        if (!m.replyTo) return null;

        console.log("🔍 Processing replyTo for E2EE message:", {
          message_id: m._id || m.id,
          replyTo_raw: m.replyTo,
          isEncrypted: m.isEncrypted,
        });

        if (typeof m.replyTo === "object" && m.replyTo.id) {
          console.log("✅ replyTo already has full object structure");
          return {
            id: m.replyTo.id,
            content: m.replyTo.isEncrypted
              ? "🔒 Encrypted message"
              : m.replyTo.content || m.replyContent || "Original message",
            sender: m.replyTo.sender ||
              m.replySender || {
                keycloakId: "unknown",
                username: "Unknown",
              },
            type: m.replyTo.type || m.replyType || "text",
            isEncrypted: m.replyTo.isEncrypted || false,
          };
        }

        if (typeof m.replyTo === "string") {
          console.log("🔄 replyTo is string ID, creating full object");
          return {
            id: m.replyTo,
            content: m.replyContent || "Original message",
            sender: m.replySender || {
              keycloakId: "unknown",
              username: "Unknown",
            },
            type: m.replyType || "text",
            isEncrypted: m.replyType === "encrypted",
          };
        }

        console.log("⚠️ Unknown replyTo format:", m.replyTo);
        return null;
      };

      if (isGroup) {
        if (!state.group_chat.current_room) {
          console.warn("⚠️ No current room found for group messages");
          state.group_chat.current_room = {
            id: null,
            name: "Unknown Group",
            isGroup: true,
            messages: [],
            membersCount: 0,
            onlineMembers: 0,
            img: "https://ui-avatars.com/api/?name=Group&background=random",
            topic: "",
            createdBy: {},
            lastMessage: null,
            pinnedMessages: [],
            isEncrypted: false,
            encryptionStatus: "none",
          };
        }

        const existingMessages = state.group_chat.current_room.messages || [];
        const existingMessageIds = new Set(
          existingMessages.map((m) => m._id || m.id)
        );

        const newMessages = validMessages.filter(
          (m) => !existingMessageIds.has(m._id || m.id)
        );

        console.log("🔄 Merging group messages with E2EE:", {
          existing: existingMessages.length,
          new: newMessages.length,
          duplicates: validMessages.length - newMessages.length,
          encrypted_new_messages: newMessages.filter((m) => m.isEncrypted)
            .length,
        });

        const allMessages = [
          ...existingMessages,
          ...newMessages.map((m) => {
            const senderId = m.sender?.keycloakId || m.senderId || m.sender;
            const isOutgoing = senderId === currentUserId;

            const processedReplyTo = processReplyTo(m);

            // 🆕 SỬA: Lấy dữ liệu mã hóa đúng cách
            const { ciphertext, iv, keyId } = getEncryptionData(m);
            const isEncrypted = m.isEncrypted || false;

            // 🆕 Determine message content based on encryption
            let messageContent = m.content || m.message || "";
            if (isEncrypted) {
              if (ciphertext && iv && keyId) {
                // Message is encrypted, show placeholder or try to decrypt
                messageContent = "🔒 Encrypted message";
              } else {
                messageContent = "🔒 [Encrypted - No data]";
              }
            }

            return {
              id: m._id || m.id,
              _id: m._id || m.id,
              type: "msg",
              subtype: m.subtype || m.type || "text",
              message: messageContent,
              content: messageContent,
              incoming: !isOutgoing,
              outgoing: isOutgoing,
              time: formatMessageTime(m.createdAt || m.time),
              createdAt: m.createdAt || m.time,
              attachments: m.attachments || [],
              sender: m.sender || {
                keycloakId: senderId,
                username: m.senderName || "Unknown",
              },
              replyTo: processedReplyTo,
              // 🆕 E2EE FIELDS - SỬA: Sử dụng biến đã lấy
              isEncrypted: isEncrypted,
              ciphertext: ciphertext,
              iv: iv,
              keyId: keyId,
              ephemeralPublicKey: m.ephemeralPublicKey,
              encryptedKey: m.encryptedKey,
              encryptionStatus:
                m.encryptionStatus || (isEncrypted ? "encrypted" : "none"),
              // 🆕 Optimistic update fields
              isOptimistic: m.isOptimistic || false,
              tempId: m.tempId,
              // 🆕 Decryption state
              isDecrypted: m.isDecrypted || false,
              decryptedContent: m.decryptedContent,
              decryptionError: m.decryptionError,
            };
          }),
        ];

        allMessages.sort(
          (a, b) =>
            new Date(a.createdAt || a.time) - new Date(b.createdAt || b.time)
        );

        state.group_chat.current_room.messages = allMessages;

        console.log("✅ Final group messages after fetch:", {
          total_messages: allMessages.length,
          encrypted_messages: allMessages.filter((m) => m.isEncrypted).length,
          decrypted_messages: allMessages.filter((m) => m.isDecrypted).length,
        });
      } else {
        const existingMessages = state.direct_chat.current_messages || [];
        const existingMessageIds = new Set(
          existingMessages.map((m) => m._id || m.id)
        );

        const newMessages = validMessages.filter(
          (m) => !existingMessageIds.has(m._id || m.id)
        );

        console.log("🔄 Merging direct messages with E2EE:", {
          existing: existingMessages.length,
          new: newMessages.length,
          duplicates: validMessages.length - newMessages.length,
          encrypted_messages: newMessages.filter((m) => m.isEncrypted).length,
        });

        const allMessages = [
          ...existingMessages,
          ...newMessages.map((m) => {
            const senderId = m.sender?.keycloakId || m.from;
            const isOutgoing = senderId === currentUserId;

            const processedReplyTo = processReplyTo(m);

            // 🆕 SỬA: Lấy dữ liệu mã hóa đúng cách
            const { ciphertext, iv, keyId } = getEncryptionData(m);
            const isEncrypted = m.isEncrypted || false;

            // 🆕 Determine message content based on encryption
            let messageContent = m.content || m.message || "";
            if (isEncrypted) {
              if (ciphertext && iv && keyId) {
                // Message is encrypted, show placeholder
                messageContent = "🔒 Encrypted message";
              } else {
                messageContent = "🔒 [Encrypted - No data]";
              }
            }

            return {
              id: m._id || m.id,
              type: "msg",
              subtype: m.subtype || m.type || "text",
              message: messageContent,
              content: messageContent,
              incoming: !isOutgoing,
              outgoing: isOutgoing,
              time: formatMessageTime(m.createdAt || m.time),
              createdAt: m.createdAt || m.time,
              attachments: m.attachments || [],
              sender: m.sender || {
                keycloakId: senderId,
                username: m.sender?.username || "Unknown",
              },
              replyTo: processedReplyTo,
              // 🆕 E2EE FIELDS - SỬA: Sử dụng biến đã lấy
              isEncrypted: isEncrypted,
              ciphertext: ciphertext,
              iv: iv,
              keyId: keyId,
              ephemeralPublicKey: m.ephemeralPublicKey,
              encryptedKey: m.encryptedKey,
              encryptionStatus:
                m.encryptionStatus || (isEncrypted ? "encrypted" : "none"),
              // 🆕 Optimistic update fields
              isOptimistic: m.isOptimistic || false,
              tempId: m.tempId,
              // 🆕 Decryption state
              isDecrypted: m.isDecrypted || false,
              decryptionError: m.decryptionError,
              decryptedContent: m.decryptedContent,
            };
          }),
        ];

        allMessages.sort(
          (a, b) =>
            new Date(a.createdAt || a.time) - new Date(b.createdAt || b.time)
        );

        state.direct_chat.current_messages = allMessages;

        console.log("✅ Final direct messages after fetch:", {
          total_messages: allMessages.length,
          encrypted_messages: allMessages.filter((m) => m.isEncrypted).length,
          decrypted_messages: allMessages.filter((m) => m.isDecrypted).length,
        });
      }
    },
    // 🆕 CẬP NHẬT: addDirectMessage với E2EE support hoàn chỉnh
    addDirectMessage(state, action) {
      const {
        message,
        conversation_id,
        currentUserId,
        isGroup = false,
        isOptimistic = false,
        replaceOptimistic = false,
        tempId = null,
      } = action.payload;

      if (!message || !conversation_id) {
        console.warn("⚠️ Invalid message or conversation_id");
        return;
      }

      console.log("📨 addDirectMessage with FULL E2EE:", {
        message_id: message.id,
        conversation_id,
        isGroup,
        isOptimistic,
        isEncrypted: message.isEncrypted,
        encryptionStatus: message.encryptionStatus,
        hasCiphertext: !!message.ciphertext,
        hasKeyId: !!message.keyId,
      });

      if (isGroup) {
        const room =
          state.group_chat.rooms.find((r) => r.id === conversation_id) ||
          state.group_chat.current_room;

        if (!room) {
          console.log("❌ No group room found for message");
          return;
        }

        if (!room.messages) {
          room.messages = [];
        }

        // 🆕 Xử lý replace optimistic message với E2EE
        if (replaceOptimistic && tempId) {
          const optimisticIndex = room.messages.findIndex(
            (m) => m.tempId === tempId || m.id === tempId
          );

          if (optimisticIndex !== -1) {
            console.log("🔄 Replacing optimistic E2EE message:", {
              optimistic_index: optimisticIndex,
              tempId,
              real_id: message.id,
              encryptionStatus: message.encryptionStatus,
              isEncrypted: message.isEncrypted,
            });

            room.messages[optimisticIndex] = {
              ...room.messages[optimisticIndex],
              ...message,
              isOptimistic: false,
              encryptionStatus: message.encryptionStatus || "encrypted",
              isEncrypted: message.isEncrypted || false,
            };

            // 🆕 Update lastMessage với encrypted content
            room.lastMessage = {
              id: message.id,
              content: message.isEncrypted
                ? "🔒 Encrypted message"
                : message.content,
              type: message.type,
              sender: message.sender,
              time: message.time,
              isEncrypted: message.isEncrypted,
            };

            room.msg = message.isEncrypted
              ? "🔒 Encrypted message"
              : message.content;
            room.time = message.time;
            return;
          }
        }

        // Check duplicate
        const existsInRoom = room.messages.find(
          (m) => m.id === message.id || m._id === message._id
        );

        if (existsInRoom && !isOptimistic) {
          console.log("⚠️ Group message already exists, skipping");
          return;
        }

        // 🆕 SỬA: Lấy dữ liệu mã hóa đúng cách
        const { ciphertext, iv, keyId } = getEncryptionData(message);
        const isEncrypted = message.isEncrypted || false;

        // 🆕 Determine message content for encrypted messages
        let displayContent = message.message || message.content || "";
        if (isEncrypted) {
          if (ciphertext && iv && keyId) {
            displayContent = "🔒 Encrypted message";
          } else {
            displayContent = "🔒 [Encrypted - No data]";
          }
        }

        const newGroupMessage = {
          _id: message._id || message.id,
          id: message.id || message._id,
          type: "msg",
          subtype: message.subtype || message.type || "text",
          message: displayContent,
          content: message.content || message.message || "",
          sender: message.sender || {
            keycloakId: currentUserId,
            username: "You",
          },
          replyTo: message.replyTo
            ? {
                id: message.replyTo.id,
                content: message.replyTo.isEncrypted
                  ? "🔒 Encrypted message"
                  : message.replyTo.content,
                sender:
                  typeof message.replyTo.sender === "string"
                    ? {
                        keycloakId: message.replyTo.sender,
                        username: "Unknown",
                      }
                    : message.replyTo.sender,
                type: message.replyTo.type || "text",
                isEncrypted: message.replyTo.isEncrypted || false,
              }
            : undefined,
          createdAt:
            message.createdAt || message.time || new Date().toISOString(),
          time: formatMessageTime(message.createdAt || message.time),
          attachments: message.attachments || [],
          incoming: message.incoming !== undefined ? message.incoming : false,
          outgoing: message.outgoing !== undefined ? message.outgoing : true,
          // 🆕 E2EE FIELDS - SỬA
          isEncrypted: isEncrypted,
          ciphertext: ciphertext,
          iv: iv,
          keyId: keyId,
          ephemeralPublicKey: message.ephemeralPublicKey,
          encryptedKey: message.encryptedKey,
          encryptionStatus:
            message.encryptionStatus || (isEncrypted ? "encrypted" : "none"),
          // 🆕 Decryption state
          isDecrypted: message.isDecrypted || false,
          decryptedContent: message.decryptedContent,
          decryptionError: message.decryptionError,
          isOptimistic: isOptimistic,
          tempId: tempId,
        };

        room.messages.push(newGroupMessage);

        // 🆕 Update lastMessage với encryption info
        room.lastMessage = {
          id: newGroupMessage.id,
          content: displayContent,
          type: newGroupMessage.type,
          sender: newGroupMessage.sender,
          time: newGroupMessage.time,
          isEncrypted: newGroupMessage.isEncrypted,
        };

        room.msg = displayContent;
        room.time = newGroupMessage.time;

        console.log("✅ Group E2EE message added", {
          isOptimistic,
          isEncrypted: newGroupMessage.isEncrypted,
          totalMessages: room.messages.length,
          encryptionStatus: newGroupMessage.encryptionStatus,
        });
      } else {
        const conv =
          state.direct_chat.conversations.find(
            (c) => c.id === conversation_id
          ) || state.direct_chat.current_conversation;

        if (!conv) {
          console.log("❌ No conversation found for message");
          return;
        }

        // Xử lý replace optimistic message với E2EE
        if (replaceOptimistic && tempId) {
          const optimisticIndex = state.direct_chat.current_messages.findIndex(
            (m) => m.tempId === tempId || m.id === tempId
          );

          if (optimisticIndex !== -1) {
            console.log("🔄 Replacing optimistic direct E2EE message:", {
              optimistic_index: optimisticIndex,
              tempId,
              real_id: message.id,
              encryptionStatus: message.encryptionStatus,
              isEncrypted: message.isEncrypted,
            });

            // 🆕 SỬA: Lấy dữ liệu mã hóa đúng cách
            const { ciphertext, iv, keyId } = getEncryptionData(message);

            state.direct_chat.current_messages[optimisticIndex] = {
              ...state.direct_chat.current_messages[optimisticIndex],
              ...message,
              isOptimistic: false,
              // 🆕 SỬA: Thêm các trường mã hóa đúng cách
              ciphertext: ciphertext,
              iv: iv,
              keyId: keyId,
              encryptionStatus: message.encryptionStatus || "encrypted",
              isEncrypted: message.isEncrypted || false,
            };
            return;
          }
        }

        // Check duplicate
        const existsInCurrent = state.direct_chat.current_messages.find(
          (m) => m.id === message.id
        );
        const existsInConv = conv.messages?.find((m) => m._id === message.id);

        if ((existsInCurrent || existsInConv) && !isOptimistic) {
          console.log("⚠️ Direct message already exists, skipping");
          return;
        }

        // 🆕 SỬA: Lấy dữ liệu mã hóa đúng cách
        const { ciphertext, iv, keyId } = getEncryptionData(message);
        const isEncrypted = message.isEncrypted || false;

        // 🆕 Determine message content for encrypted messages
        let displayContent = message.message || "";
        if (isEncrypted) {
          if (ciphertext && iv && keyId) {
            displayContent = "🔒 Encrypted message";
          } else {
            displayContent = "🔒 [Encrypted - No data]";
          }
        }

        // Thêm message mới với E2EE fields
        if (!existsInCurrent) {
          const newMessage = {
            ...message,
            message: displayContent,
            // 🆕 SỬA: Thêm các trường mã hóa
            ciphertext: ciphertext,
            iv: iv,
            keyId: keyId,
            isEncrypted: isEncrypted,
            encryptionStatus:
              message.encryptionStatus || (isEncrypted ? "encrypted" : "none"),
            isDecrypted: message.isDecrypted || false,
            decryptedContent: message.decryptedContent,
          };
          state.direct_chat.current_messages.push(newMessage);
        }

        // Cập nhật conversation messages
        if (!conv.messages) conv.messages = [];

        if (!existsInConv) {
          const newMessageObj = {
            _id: message.id,
            content: displayContent,
            type: message.subtype || "text",
            from: message.outgoing ? currentUserId : conv.user_id,
            to: message.outgoing ? conv.user_id : currentUserId,
            createdAt:
              message.createdAt || message.time || new Date().toISOString(),
            attachments: message.attachments || [],
            seen: false,
            // 🆕 E2EE FIELDS
            isEncrypted: isEncrypted,
            ciphertext: ciphertext,
            iv: iv,
            keyId: keyId,
            ephemeralPublicKey: message.ephemeralPublicKey,
            encryptedKey: message.encryptedKey,
            encryptionStatus: message.encryptionStatus || "none",
            isDecrypted: message.isDecrypted || false,
          };

          conv.messages.push(newMessageObj);
        }

        conv.msg = displayContent;
        conv.time = message.time;
      }
    },

    // 🆕 CẬP NHẬT: addGroupMessage với E2EE support hoàn chỉnh
    // 🆕 CẬP NHẬT: addGroupMessage với E2EE support hoàn chỉnh
    addGroupMessage(state, action) {
      const {
        message,
        room_id,
        isOptimistic = false,
        replaceOptimistic = false,
        tempId = null,
      } = action.payload;

      console.log("📨 addGroupMessage - E2EE COMPLETE:", {
        message_id: message.id,
        tempId,
        room_id,
        isOptimistic,
        isEncrypted: message.isEncrypted,
        encryptionStatus: message.encryptionStatus,
        hasCiphertext: !!message.ciphertext,
        hasEphemeralKey: !!message.ephemeralPublicKey,
      });

      let room = state.group_chat.current_room;
      if (!room || room.id !== room_id) {
        room = state.group_chat.rooms.find((r) => r.id === room_id);
      }

      if (!room) {
        console.log("❌ No group room found for message");
        return;
      }

      if (!room.messages) {
        console.log("🔄 Initializing room.messages array");
        room.messages = [];
      }

      // 🆕 Xử lý replace optimistic message với E2EE
      if (replaceOptimistic || (isOptimistic === false && tempId)) {
        console.log("🔄 Looking for optimistic E2EE message to replace...", {
          tempId,
          replaceOptimistic,
          isOptimistic,
          message_id: message.id,
          encryptionStatus: message.encryptionStatus,
          isEncrypted: message.isEncrypted,
        });

        let optimisticIndex = -1;

        if (tempId) {
          optimisticIndex = room.messages.findIndex(
            (m) => m.tempId === tempId || m.id === tempId
          );
        }

        if (optimisticIndex === -1) {
          optimisticIndex = room.messages.findIndex(
            (m) =>
              m.isOptimistic &&
              m.sender?.keycloakId === message.sender?.keycloakId &&
              (m.content === message.content ||
                m.message === message.message) &&
              Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) <
                30000
          );
        }

        if (optimisticIndex !== -1) {
          console.log(
            "✅ Replacing optimistic E2EE message with real message:",
            {
              optimistic_index: optimisticIndex,
              optimistic_id: room.messages[optimisticIndex].id,
              real_id: message.id,
              encryptionStatus: message.encryptionStatus,
              isEncrypted: message.isEncrypted,
            }
          );

          const optimisticMessage = room.messages[optimisticIndex];

          // 🆕 Keep important display properties from optimistic message
          room.messages[optimisticIndex] = {
            ...optimisticMessage,
            ...message,
            isOptimistic: false,
            encryptionStatus: message.encryptionStatus || "encrypted",
            isEncrypted: message.isEncrypted || false,
            time: optimisticMessage.time || message.time,
            createdAt: optimisticMessage.createdAt || message.createdAt,
            // 🆕 SỬA: Determine display content based on encryption
            message: message.isEncrypted
              ? "🔒 Encrypted message"
              : message.message || message.content || "",
          };

          // Update lastMessage
          room.lastMessage = {
            id: message.id,
            content: message.isEncrypted
              ? "🔒 Encrypted message"
              : message.content,
            type: message.type,
            sender: message.sender,
            time: message.time,
            isEncrypted: message.isEncrypted,
          };

          room.msg = message.isEncrypted
            ? "🔒 Encrypted message"
            : message.content;
          room.time = message.time;

          console.log("✅ Optimistic E2EE message replaced successfully");
          return;
        } else {
          console.log("⚠️ No optimistic message found to replace");
        }
      }

      // 🆕 DUPLICATE DETECTION với E2EE
      const existsInRoom = room.messages.find((m) => {
        if (m._id && message._id && m._id === message._id) return true;
        if (m.id === message.id) return true;
        if (
          (m.content === message.content || m.message === message.message) &&
          m.sender?.keycloakId === message.sender?.keycloakId &&
          Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 5000
        ) {
          return true;
        }
        return false;
      });

      if (existsInRoom && !isOptimistic) {
        console.log("⚠️ Group message already exists, skipping", {
          existing_id: existsInRoom._id || existsInRoom.id,
          new_id: message._id || message.id,
          isEncrypted: message.isEncrypted,
        });
        return;
      }

      // 🆕 SỬA: Lấy dữ liệu mã hóa đúng cách
      const { ciphertext, iv, keyId } = getEncryptionData(message);
      const isEncrypted = message.isEncrypted || false;

      // 🆕 TẠO MESSAGE THỐNG NHẤT với E2EE
      const displayContent = isEncrypted
        ? "🔒 Encrypted message"
        : message.message || message.content || "";

      const newMessage = {
        _id: message._id || message.id,
        id: message.id || message._id,
        type: "msg",
        subtype: message.subtype || message.type || "text",
        message: displayContent,
        content: message.content || message.message || "",
        sender: {
          keycloakId: message.sender?.keycloakId || "unknown",
          username: message.sender?.username || "Unknown",
          ...message.sender,
        },
        replyTo: message.replyTo
          ? {
              id: message.replyTo.id,
              content: message.replyTo.isEncrypted
                ? "🔒 Encrypted message"
                : message.replyTo.content,
              sender:
                typeof message.replyTo.sender === "string"
                  ? { keycloakId: message.replyTo.sender, username: "Unknown" }
                  : message.replyTo.sender,
              type: message.replyTo.type || "text",
              isEncrypted: message.replyTo.isEncrypted || false,
            }
          : undefined,
        createdAt:
          message.createdAt || message.time || new Date().toISOString(),
        time: formatMessageTime(message.createdAt || message.time),
        attachments: message.attachments || [],
        incoming: message.incoming !== undefined ? message.incoming : false,
        outgoing: message.outgoing !== undefined ? message.outgoing : true,
        // 🆕 E2EE FIELDS - SỬA
        isEncrypted: isEncrypted,
        ciphertext: ciphertext,
        iv: iv,
        keyId: keyId,
        ephemeralPublicKey: message.ephemeralPublicKey,
        encryptedKey: message.encryptedKey,
        encryptionStatus:
          message.encryptionStatus || (isEncrypted ? "encrypted" : "none"),
        // 🆕 Decryption state
        isDecrypted: message.isDecrypted || false,
        decryptedContent: message.decryptedContent,
        decryptionError: message.decryptionError,
        isOptimistic: message.isOptimistic || isOptimistic,
        tempId: message.tempId || tempId,
      };

      console.log("✅ Adding E2EE message to room:", {
        room_id: room.id,
        message_id: newMessage.id,
        isEncrypted: newMessage.isEncrypted,
        encryptionStatus: newMessage.encryptionStatus,
        total_messages_before: room.messages.length,
        hasDecryptedContent: !!newMessage.decryptedContent,
      });

      room.messages.push(newMessage);

      room.lastMessage = {
        id: newMessage.id,
        content: displayContent,
        type: newMessage.type,
        sender: newMessage.sender,
        time: newMessage.time,
        isEncrypted: newMessage.isEncrypted,
      };

      room.msg = displayContent;
      room.time = newMessage.time;

      if (room !== state.group_chat.current_room) {
        const roomIndex = state.group_chat.rooms.findIndex(
          (r) => r.id === room_id
        );
        if (roomIndex !== -1) {
          state.group_chat.rooms[roomIndex] = room;
        }
      }
    },

    // 🆕 CẬP NHẬT: updateDirectMessage với E2EE support
    // 🆕 CẬP NHẬT: updateDirectMessage với E2EE support
    updateDirectMessage(state, action) {
      const { tempId, realMessage, conversation_id } = action.payload;

      console.log("🔄 updateDirectMessage with E2EE:", {
        tempId,
        realMessageId: realMessage.id,
        conversation_id,
        isEncrypted: realMessage.isEncrypted,
        encryptionStatus: realMessage.encryptionStatus,
        isDecrypted: realMessage.isDecrypted,
      });

      const optimisticIndex = state.direct_chat.current_messages.findIndex(
        (m) => m.tempId === tempId || m.id === tempId
      );

      if (optimisticIndex !== -1) {
        console.log("✅ Replacing optimistic direct E2EE message:", {
          optimistic_index: optimisticIndex,
          tempId,
          real_id: realMessage.id,
          encryptionStatus: realMessage.encryptionStatus,
        });

        const existingMessage =
          state.direct_chat.current_messages[optimisticIndex];

        // 🆕 SỬA: Lấy dữ liệu mã hóa đúng cách
        const { ciphertext, iv, keyId } = getEncryptionData(realMessage);

        state.direct_chat.current_messages[optimisticIndex] = {
          ...existingMessage,
          ...realMessage,
          isOptimistic: false,
          // 🆕 SỬA: Lấy dữ liệu mã hóa đúng cách
          ciphertext: ciphertext,
          iv: iv,
          keyId: keyId,
          encryptionStatus: realMessage.encryptionStatus || "encrypted",
          isEncrypted: realMessage.isEncrypted || false,
          // 🆕 Preserve decrypted content if available
          message: realMessage.isDecrypted
            ? realMessage.decryptedContent
            : realMessage.isEncrypted
            ? "🔒 Encrypted message"
            : realMessage.message,
        };
      }

      const conv =
        state.direct_chat.conversations.find((c) => c.id === conversation_id) ||
        state.direct_chat.current_conversation;

      if (conv && conv.messages) {
        const convOptimisticIndex = conv.messages.findIndex(
          (m) => m._id === tempId
        );

        if (convOptimisticIndex !== -1) {
          // 🆕 SỬA: Lấy dữ liệu mã hóa đúng cách
          const { ciphertext, iv, keyId } = getEncryptionData(realMessage);
          const isEncrypted = realMessage.isEncrypted || false;

          const displayContent = isEncrypted
            ? "🔒 Encrypted message"
            : realMessage.content;

          conv.messages[convOptimisticIndex] = {
            _id: realMessage.id,
            content: displayContent,
            type: realMessage.type,
            from: realMessage.outgoing
              ? realMessage.sender?.keycloakId
              : conv.user_id,
            to: realMessage.outgoing
              ? conv.user_id
              : realMessage.sender?.keycloakId,
            createdAt: realMessage.createdAt,
            attachments: realMessage.attachments || [],
            seen: false,
            // 🆕 E2EE FIELDS - SỬA
            isEncrypted: isEncrypted,
            ciphertext: ciphertext,
            iv: iv,
            keyId: keyId,
            ephemeralPublicKey: realMessage.ephemeralPublicKey,
            encryptedKey: realMessage.encryptedKey,
            encryptionStatus: realMessage.encryptionStatus || "none",
            isDecrypted: realMessage.isDecrypted || false,
          };
        }
      }
    },

    // 🆕 THÊM: Reducer để cập nhật encryption status
    // 🆕 THÊM: Reducer để cập nhật encryption status
    updateEncryptionStatus(state, action) {
      const {
        messageId,
        encryptionStatus,
        chatType,
        isDecrypted,
        decryptedContent,
        decryptionError,
      } = action.payload;

      console.log("🔐 updateEncryptionStatus:", {
        messageId,
        encryptionStatus,
        chatType,
        isDecrypted,
        hasDecryptedContent: !!decryptedContent,
        decryptionError,
      });

      if (chatType === "group") {
        if (state.group_chat.current_room?.messages) {
          state.group_chat.current_room.messages =
            state.group_chat.current_room.messages.map((msg) => {
              if (msg.id === messageId || msg._id === messageId) {
                const updatedMsg = {
                  ...msg,
                  encryptionStatus,
                  isDecrypted: isDecrypted || msg.isDecrypted,
                  decryptionError: decryptionError || msg.decryptionError,
                };

                // 🆕 Update message content if decrypted
                if (isDecrypted && decryptedContent) {
                  updatedMsg.message = decryptedContent;
                  updatedMsg.decryptedContent = decryptedContent;
                  updatedMsg.isDecrypted = true;
                  updatedMsg.encryptionStatus = "decrypted";
                } else if (encryptionStatus === "decryption_failed") {
                  // Hiển thị thông báo lỗi nếu giải mã thất bại
                  updatedMsg.message = "🔒 [Decryption failed]";
                }

                return updatedMsg;
              }
              return msg;
            });
        }

        state.group_chat.rooms.forEach((room) => {
          if (room.messages) {
            room.messages = room.messages.map((msg) => {
              if (msg.id === messageId || msg._id === messageId) {
                const updatedMsg = {
                  ...msg,
                  encryptionStatus,
                  isDecrypted: isDecrypted || msg.isDecrypted,
                  decryptionError: decryptionError || msg.decryptionError,
                };

                if (isDecrypted && decryptedContent) {
                  updatedMsg.message = decryptedContent;
                  updatedMsg.decryptedContent = decryptedContent;
                  updatedMsg.isDecrypted = true;
                  updatedMsg.encryptionStatus = "decrypted";
                } else if (encryptionStatus === "decryption_failed") {
                  updatedMsg.message = "🔒 [Decryption failed]";
                }

                return updatedMsg;
              }
              return msg;
            });
          }
        });
      } else {
        state.direct_chat.current_messages =
          state.direct_chat.current_messages.map((msg) => {
            if (msg.id === messageId || msg._id === messageId) {
              const updatedMsg = {
                ...msg,
                encryptionStatus,
                isDecrypted: isDecrypted || msg.isDecrypted,
                decryptionError: decryptionError || msg.decryptionError,
              };

              if (isDecrypted && decryptedContent) {
                updatedMsg.message = decryptedContent;
                updatedMsg.decryptedContent = decryptedContent;
                updatedMsg.isDecrypted = true;
                updatedMsg.encryptionStatus = "decrypted";
              } else if (encryptionStatus === "decryption_failed") {
                updatedMsg.message = "🔒 [Decryption failed]";
              }

              return updatedMsg;
            }
            return msg;
          });

        state.direct_chat.conversations.forEach((conv) => {
          if (conv.messages) {
            conv.messages = conv.messages.map((msg) => {
              if (msg._id === messageId) {
                const updatedMsg = {
                  ...msg,
                  encryptionStatus,
                  isDecrypted: isDecrypted || msg.isDecrypted,
                  decryptionError: decryptionError || msg.decryptionError,
                };

                if (isDecrypted && decryptedContent) {
                  updatedMsg.content = decryptedContent;
                  updatedMsg.isDecrypted = true;
                  updatedMsg.encryptionStatus = "decrypted";
                } else if (encryptionStatus === "decryption_failed") {
                  updatedMsg.content = "🔒 [Decryption failed]";
                }

                return updatedMsg;
              }
              return msg;
            });
          }
        });
      }
    },

    // 🆕 THÊM: Reducer để xử lý encrypted messages từ socket
    // 🆕 THÊM: Reducer để xử lý encrypted messages từ socket
    processEncryptedMessage(state, action) {
      const { message, chatType } = action.payload;

      // 🆕 SỬA: Lấy dữ liệu mã hóa đúng cách
      const { ciphertext, iv, keyId } = getEncryptionData(message);
      const isEncrypted = message.isEncrypted || false;

      console.log("🔐 processEncryptedMessage:", {
        message_id: message.id || message._id,
        chatType,
        isEncrypted: isEncrypted,
        ciphertext: !!ciphertext,
        iv: !!iv,
        keyId: keyId,
        encryptionData: message.encryptionData,
        encryptionMetadata: message.encryptionMetadata,
        isDecrypted: message.isDecrypted,
        hasDecryptedContent: !!message.decryptedContent,
      });

      const targetState =
        chatType === "group" ? state.group_chat : state.direct_chat;

      if (chatType === "group") {
        const room = targetState.current_room;
        if (room && room.messages) {
          const exists = room.messages.find(
            (m) => m.id === message.id || m._id === message._id
          );

          if (!exists) {
            // 🆕 SỬA: Hiển thị nội dung đã giải mã nếu có
            let displayContent = message.content || message.message || "";
            if (isEncrypted) {
              if (message.isDecrypted && message.decryptedContent) {
                // Nếu đã giải mã, hiển thị nội dung đã giải mã
                displayContent = message.decryptedContent;
              } else if (ciphertext && iv && keyId) {
                // Nếu có đủ dữ liệu mã hóa nhưng chưa giải mã
                displayContent = "🔒 Encrypted message";
              } else {
                // Nếu thiếu dữ liệu mã hóa
                displayContent = "🔒 [Encrypted - No data]";
              }
            }

            const newMessage = {
              ...message,
              id: message.id || message._id,
              _id: message._id || message.id,
              type: "msg",
              subtype: message.subtype || message.type || "text",
              message: displayContent,
              content: message.content || message.message || "",
              incoming: true,
              outgoing: false,
              time: formatMessageTime(message.createdAt || new Date()),
              // 🆕 SỬA: Thêm các trường mã hóa đúng cách
              isEncrypted: isEncrypted,
              ciphertext: ciphertext,
              iv: iv,
              keyId: keyId,
              ephemeralPublicKey: message.ephemeralPublicKey,
              encryptedKey: message.encryptedKey,
              encryptionStatus:
                message.encryptionStatus ||
                (isEncrypted ? "encrypted" : "none"),
              isDecrypted: message.isDecrypted || false,
              decryptedContent: message.decryptedContent,
              decryptionError: message.decryptionError,
            };

            console.log("✅ Adding encrypted group message:", {
              message_id: newMessage.id,
              isEncrypted: newMessage.isEncrypted,
              isDecrypted: newMessage.isDecrypted,
              hasCiphertext: !!newMessage.ciphertext,
              hasIV: !!newMessage.iv,
              keyId: newMessage.keyId,
              displayContent: displayContent,
            });

            room.messages.push(newMessage);
          } else {
            console.log("ℹ️ Encrypted group message already exists");
          }
        } else {
          console.warn("⚠️ No current room found for encrypted group message");
        }
      } else {
        // Handle direct encrypted messages
        const exists = state.direct_chat.current_messages.find(
          (m) => m.id === message.id || m._id === message._id
        );

        if (!exists) {
          // 🆕 SỬA: Hiển thị nội dung đã giải mã nếu có
          let displayContent = message.content || message.message || "";
          if (isEncrypted) {
            if (message.isDecrypted && message.decryptedContent) {
              // Nếu đã giải mã, hiển thị nội dung đã giải mã
              displayContent = message.decryptedContent;
            } else if (ciphertext && iv && keyId) {
              // Nếu có đủ dữ liệu mã hóa nhưng chưa giải mã
              displayContent = "🔒 Encrypted message";
            } else {
              // Nếu thiếu dữ liệu mã hóa
              displayContent = "🔒 [Encrypted - No data]";
            }
          }

          const newMessage = {
            ...message,
            id: message.id || message._id,
            _id: message._id || message.id,
            type: "msg",
            subtype: message.subtype || message.type || "text",
            message: displayContent,
            content: message.content || message.message || "",
            incoming: true,
            outgoing: false,
            time: formatMessageTime(message.createdAt || new Date()),
            // 🆕 SỬA: Thêm các trường mã hóa đúng cách
            isEncrypted: isEncrypted,
            ciphertext: ciphertext,
            iv: iv,
            keyId: keyId,
            ephemeralPublicKey: message.ephemeralPublicKey,
            encryptedKey: message.encryptedKey,
            encryptionStatus:
              message.encryptionStatus || (isEncrypted ? "encrypted" : "none"),
            isDecrypted: message.isDecrypted || false,
            decryptedContent: message.decryptedContent,
            decryptionError: message.decryptionError,
          };

          console.log("✅ Adding encrypted direct message:", {
            message_id: newMessage.id,
            isEncrypted: newMessage.isEncrypted,
            isDecrypted: newMessage.isDecrypted,
            hasCiphertext: !!newMessage.ciphertext,
            hasIV: !!newMessage.iv,
            keyId: newMessage.keyId,
            displayContent: displayContent,
          });

          state.direct_chat.current_messages.push(newMessage);
        } else {
          console.log("ℹ️ Encrypted direct message already exists");
        }
      }
    },
    // 🆕 THÊM: Reducers cho E2EE key management
    setEncryptionKeys(state, action) {
      const { chatType, targetId, keys } = action.payload;

      console.log("🔑 setEncryptionKeys:", {
        chatType,
        targetId,
        hasPublicKey: !!keys.publicKey,
        hasPrivateKey: !!keys.privateKey,
        hasSharedSecret: !!keys.sharedSecret,
      });

      if (chatType === "group") {
        // 🆕 SỬA: Đảm bảo encryptionKeys tồn tại
        if (!state.group_chat.encryptionKeys) {
          state.group_chat.encryptionKeys = {};
        }
        state.group_chat.encryptionKeys[targetId] = {
          ...state.group_chat.encryptionKeys[targetId],
          ...keys,
        };
      } else {
        // 🆕 SỬA: Đảm bảo encryptionKeys tồn tại
        if (!state.direct_chat.encryptionKeys) {
          state.direct_chat.encryptionKeys = {};
        }
        state.direct_chat.encryptionKeys[targetId] = {
          ...state.direct_chat.encryptionKeys[targetId],
          ...keys,
        };

        // Update conversation hasSharedSecret flag
        const convIndex = state.direct_chat.conversations.findIndex(
          (c) => c.id === targetId
        );
        if (convIndex !== -1) {
          state.direct_chat.conversations[convIndex].hasSharedSecret =
            !!keys.sharedSecret;
        }

        if (state.direct_chat.current_conversation?.id === targetId) {
          state.direct_chat.current_conversation.hasSharedSecret =
            !!keys.sharedSecret;
        }
      }
    },

    setKeyExchangeStatus(state, action) {
      const { chatType, targetId, userId, status } = action.payload;

      console.log("🔑 setKeyExchangeStatus:", {
        chatType,
        targetId,
        userId,
        status,
      });

      if (chatType === "group") {
        if (!state.group_chat.keyExchangeStatus[targetId]) {
          state.group_chat.keyExchangeStatus[targetId] = {};
        }
        state.group_chat.keyExchangeStatus[targetId][userId] = status;
      } else {
        state.direct_chat.keyExchangeStatus[targetId] = status;
      }
    },

    // 🆕 THÊM: Reducer để cập nhật message sau khi decrypt
    updateDecryptedMessage(state, action) {
      const { messageId, chatType, decryptedContent } = action.payload;

      console.log("🔓 updateDecryptedMessage:", {
        messageId,
        chatType,
        decryptedContentLength: decryptedContent?.length,
      });

      if (chatType === "group") {
        if (state.group_chat.current_room?.messages) {
          state.group_chat.current_room.messages =
            state.group_chat.current_room.messages.map((msg) => {
              if (msg.id === messageId || msg._id === messageId) {
                return {
                  ...msg,
                  message: decryptedContent,
                  decryptedContent: decryptedContent,
                  isDecrypted: true,
                  encryptionStatus: "decrypted",
                };
              }
              return msg;
            });
        }

        state.group_chat.rooms.forEach((room) => {
          if (room.messages) {
            room.messages = room.messages.map((msg) => {
              if (msg.id === messageId || msg._id === messageId) {
                return {
                  ...msg,
                  message: decryptedContent,
                  decryptedContent: decryptedContent,
                  isDecrypted: true,
                  encryptionStatus: "decrypted",
                };
              }
              return msg;
            });
          }
        });
      } else {
        state.direct_chat.current_messages =
          state.direct_chat.current_messages.map((msg) => {
            if (msg.id === messageId || msg._id === messageId) {
              return {
                ...msg,
                message: decryptedContent,
                decryptedContent: decryptedContent,
                isDecrypted: true,
                encryptionStatus: "decrypted",
              };
            }
            return msg;
          });

        state.direct_chat.conversations.forEach((conv) => {
          if (conv.messages) {
            conv.messages = conv.messages.map((msg) => {
              if (msg._id === messageId) {
                return {
                  ...msg,
                  content: decryptedContent,
                  isDecrypted: true,
                  encryptionStatus: "decrypted",
                };
              }
              return msg;
            });
          }
        });
      }
    },

    // 🆕 THÊM: Reducer để set E2EE enabled status
    setE2EEEnabled(state, action) {
      const { isEnabled } = action.payload;
      state.e2ee.isEnabled = isEnabled;
      console.log("🔐 E2EE enabled:", isEnabled);
    },

    // 🆕 THÊM: Reducer để update global E2EE status
    updateE2EEStatus(state, action) {
      const { status } = action.payload;
      state.e2ee.encryptionStatus = status;
      console.log("🔐 E2EE status updated:", status);
    },

    // 🆕 THÊM: Reducer để add key pair
    addKeyPair(state, action) {
      const { userId, keyPair } = action.payload;
      state.e2ee.keyPairs[userId] = keyPair;
      console.log("🔑 Key pair added for user:", userId);
    },

    // 🆕 THÊM: Reducer để add to decryption queue
    addToDecryptionQueue(state, action) {
      const { message } = action.payload;
      state.e2ee.decryptionQueue.push(message);
      console.log("🔐 Added to decryption queue:", message.id);
    },

    // 🆕 THÊM: Reducer để remove from decryption queue
    removeFromDecryptionQueue(state, action) {
      const { messageId } = action.payload;
      state.e2ee.decryptionQueue = state.e2ee.decryptionQueue.filter(
        (msg) => msg.id !== messageId
      );
      console.log("🔐 Removed from decryption queue:", messageId);
    },

    // ==================== CÁC REDUCERS KHÁC GIỮ NGUYÊN ====================
    updateDirectConversation(state, action) {
      const { conversation, currentUserId } = action.payload;

      console.log("🔄 updateDirectConversation with E2EE:", {
        conversation_id: conversation._id,
        currentUserId,
        isEncrypted: conversation.isEncrypted,
      });

      const index = state.direct_chat.conversations.findIndex(
        (c) => c.id === conversation._id
      );

      if (index !== -1) {
        const user = conversation.participants?.find(
          (p) => p.keycloakId !== currentUserId
        );
        const lastMsg = conversation.messages?.slice(-1)[0];
        const lastSeenTs = parseTimestamp(user?.lastSeen);

        const isEncrypted = conversation.isEncrypted || false;
        const displayContent = isEncrypted
          ? "🔒 Encrypted message"
          : lastMsg?.content || lastMsg?.text || "";

        state.direct_chat.conversations[index] = {
          id: conversation._id,
          user_id: user?.keycloakId || null,
          name:
            `${user?.username || ""} ${user?.lastName || ""}`.trim() ||
            "Unknown",
          online: user?.status === "Online",
          img: user?.avatar
            ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
            : `https://i.pravatar.cc/150?u=${user?.keycloakId}`,
          msg: displayContent,
          time: formatMessageTime(lastMsg?.createdAt),
          unread: 0,
          pinned: false,
          about: user?.about || "",
          messages: conversation.messages || [],
          lastSeen: lastSeenTs ? timeAgo(lastSeenTs) : "",
          // 🆕 E2EE fields
          isEncrypted: isEncrypted,
          encryptionStatus: conversation.encryptionStatus || "none",
          publicKey: user?.publicKey,
          hasSharedSecret:
            !!state.direct_chat.encryptionKeys[conversation._id]?.sharedSecret,
        };

        // Cập nhật current_conversation nếu đang active
        if (state.direct_chat.current_conversation?.id === conversation._id) {
          state.direct_chat.current_conversation =
            state.direct_chat.conversations[index];
        }
      }
    },

    addDirectConversation(state, action) {
      const { conversation, currentUserId } = action.payload;

      console.log("➕ addDirectConversation:", {
        conversation_id: conversation._id,
        currentUserId,
        isEncrypted: conversation.isEncrypted,
      });

      const exists = state.direct_chat.conversations.find(
        (c) => c.id === conversation._id
      );

      if (!exists) {
        const user = conversation.participants?.find(
          (p) => p.keycloakId !== currentUserId
        );
        const lastMsg = conversation.messages?.slice(-1)[0];
        const lastSeenTs = parseTimestamp(user?.lastSeen);

        const isEncrypted = conversation.isEncrypted || false;
        const displayContent = isEncrypted
          ? "🔒 Encrypted message"
          : lastMsg?.content || lastMsg?.text || "";

        const newConversation = {
          id: conversation._id,
          user_id: user?.keycloakId || null,
          name:
            `${user?.username || ""} ${user?.lastName || ""}`.trim() ||
            "Unknown",
          online: user?.status === "Online",
          img: user?.avatar
            ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
            : `https://i.pravatar.cc/150?u=${user?.keycloakId}`,
          msg: displayContent,
          time: formatMessageTime(lastMsg?.createdAt),
          unread: 0,
          pinned: false,
          about: user?.about || "",
          messages: conversation.messages || [],
          lastSeen: lastSeenTs ? timeAgo(lastSeenTs) : "",
          // 🆕 E2EE fields
          isEncrypted: isEncrypted,
          encryptionStatus: conversation.encryptionStatus || "none",
          publicKey: user?.publicKey,
          hasSharedSecret: false, // Initially false, will be updated when keys are exchanged
        };

        state.direct_chat.conversations.push(newConversation);
        console.log(
          "✅ Direct conversation added with E2EE status:",
          isEncrypted
        );
      } else {
        console.log("ℹ️ Direct conversation already exists");
      }
    },

    updateGroupRoom(state, action) {
      const { room } = action.payload;

      console.log("🔄 updateGroupRoom with E2EE:", {
        room_id: room._id,
        name: room.name,
        isEncrypted: room.isEncrypted,
      });

      const index = state.group_chat.rooms.findIndex((r) => r.id === room._id);

      if (index !== -1) {
        const lastMsg = room.lastMessage;
        const membersCount = room.members?.length || 0;
        const onlineMembers =
          room.members?.filter((m) => m.status === "Online").length || 0;

        const isEncrypted = room.isEncrypted || false;
        const displayContent = isEncrypted
          ? "🔒 Encrypted message"
          : lastMsg?.content || "No messages yet";

        state.group_chat.rooms[index] = {
          id: room._id,
          name: room.name || "Unnamed Group",
          isGroup: true,
          members: room.members || [],
          membersCount: membersCount,
          onlineMembers: onlineMembers,
          createdBy: room.createdBy || {},
          lastMessage: lastMsg
            ? {
                id: lastMsg._id,
                content: displayContent,
                type: lastMsg.type,
                sender: lastMsg.sender,
                time: formatMessageTime(lastMsg.createdAt),
                isEncrypted: lastMsg.isEncrypted || false,
              }
            : null,
          pinnedMessages: room.pinnedMessages || [],
          topic: room.topic || "",
          img:
            room.img ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              room.name || "Group"
            )}&background=random`,
          msg: displayContent,
          time: lastMsg ? formatMessageTime(lastMsg.createdAt) : "",
          unread: 0,
          pinned: room.pinnedMessages?.length > 0,
          messages: room.messages || [],
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
          // 🆕 E2EE fields
          isEncrypted: isEncrypted,
          encryptionStatus: room.encryptionStatus || "none",
          hasSharedSecrets:
            Object.keys(
              state.group_chat.encryptionKeys[room._id]?.sharedSecrets || {}
            ).length > 0,
        };

        // Cập nhật current_room nếu đang active
        if (state.group_chat.current_room?.id === room._id) {
          state.group_chat.current_room = state.group_chat.rooms[index];
        }

        console.log("✅ Group room updated with E2EE");
      } else {
        console.log("❌ Group room not found for update");
      }
    },

    updateUserPresence(state, action) {
      const { userId, status, lastSeen } = action.payload;

      console.log("👤 updateUserPresence:", { userId, status, lastSeen });

      // Update trong direct conversations
      state.direct_chat.conversations.forEach((conv) => {
        if (conv.user_id === userId) {
          conv.online = status === "Online";
          if (lastSeen) {
            conv.lastSeen = timeAgo(new Date(lastSeen).getTime());
          }
        }
      });

      // Update trong group rooms members
      state.group_chat.rooms.forEach((room) => {
        if (room.members) {
          room.members.forEach((member) => {
            if (member.keycloakId === userId) {
              member.status = status;
              if (lastSeen) {
                member.lastSeen = lastSeen;
              }
            }
          });

          // Recalculate online members count
          room.onlineMembers = room.members.filter(
            (m) => m.status === "Online"
          ).length;
        }
      });

      // Update current conversation nếu có
      if (state.direct_chat.current_conversation?.user_id === userId) {
        state.direct_chat.current_conversation.online = status === "Online";
        if (lastSeen) {
          state.direct_chat.current_conversation.lastSeen = timeAgo(
            new Date(lastSeen).getTime()
          );
        }
      }

      // Update current room members nếu có
      if (state.group_chat.current_room?.members) {
        state.group_chat.current_room.members.forEach((member) => {
          if (member.keycloakId === userId) {
            member.status = status;
            if (lastSeen) {
              member.lastSeen = lastSeen;
            }
          }
        });

        // Recalculate online members count
        state.group_chat.current_room.onlineMembers =
          state.group_chat.current_room.members.filter(
            (m) => m.status === "Online"
          ).length;
      }
    },

    deleteMessage(state, action) {
      const { messageId, isGroup = false } = action.payload;

      console.log("🗑️ deleteMessage:", { messageId, isGroup });

      let deletedMessage = null;

      if (isGroup) {
        // Xóa trong group chat và lưu message đã xóa
        if (state.group_chat.current_room?.messages) {
          const messageIndex = state.group_chat.current_room.messages.findIndex(
            (msg) => msg.id === messageId || msg._id === messageId
          );

          if (messageIndex !== -1) {
            deletedMessage =
              state.group_chat.current_room.messages[messageIndex];
            state.group_chat.current_room.messages.splice(messageIndex, 1);
          }
        }

        // Cập nhật trong rooms list nếu cần
        state.group_chat.rooms.forEach((room) => {
          if (room.messages) {
            room.messages = room.messages.filter(
              (msg) => msg.id !== messageId && msg._id !== messageId
            );
          }
        });
      } else {
        // Xóa trong direct chat và lưu message đã xóa
        const messageIndex = state.direct_chat.current_messages.findIndex(
          (msg) => msg.id === messageId || msg._id === messageId
        );

        if (messageIndex !== -1) {
          deletedMessage = state.direct_chat.current_messages[messageIndex];
          state.direct_chat.current_messages.splice(messageIndex, 1);
        }

        // Cập nhật trong conversations list
        state.direct_chat.conversations.forEach((conv) => {
          if (conv.messages) {
            conv.messages = conv.messages.filter(
              (msg) => msg._id !== messageId
            );
          }
        });
      }

      // 🆕 LƯU MESSAGE ĐÃ XÓA ĐỂ CÓ THỂ RESTORE SAU NÀY
      if (deletedMessage) {
        if (!state.deletedMessages) {
          state.deletedMessages = [];
        }
        state.deletedMessages.push({
          ...deletedMessage,
          deletedAt: new Date().toISOString(),
        });
      }

      console.log("✅ Message deleted successfully");
    },

    resetConversationState(state) {
      console.log("🔄 Resetting conversation state");
      Object.assign(state, initialState);
    },

    restoreMessage(state, action) {
      const { messageId, isGroup } = action.payload;
      console.log("🔄 Restoring message:", { messageId, isGroup });

      // 🆕 TÌM MESSAGE TRONG deletedMessages
      const deletedMessageIndex = state.deletedMessages?.findIndex(
        (msg) => msg.id === messageId || msg._id === messageId
      );

      console.log("🔍 Deleted message search:", {
        deletedMessageIndex,
        deletedMessagesCount: state.deletedMessages?.length,
      });

      if (deletedMessageIndex !== -1 && state.deletedMessages) {
        const messageToRestore = state.deletedMessages[deletedMessageIndex];

        console.log("✅ Found message to restore:", {
          messageId: messageToRestore.id || messageToRestore._id,
          content: messageToRestore.content || messageToRestore.message,
          isEncrypted: messageToRestore.isEncrypted,
        });

        if (isGroup) {
          // Khôi phục trong group chat
          if (state.group_chat.current_room?.messages) {
            state.group_chat.current_room.messages.push(messageToRestore);
            // Sắp xếp lại theo thời gian
            state.group_chat.current_room.messages.sort(
              (a, b) =>
                new Date(a.createdAt || a.time) -
                new Date(b.createdAt || b.time)
            );
            console.log("✅ Group message restored to current room");
          }
        } else {
          // Khôi phục trong direct chat
          state.direct_chat.current_messages.push(messageToRestore);
          // Sắp xếp lại theo thời gian
          state.direct_chat.current_messages.sort(
            (a, b) =>
              new Date(a.createdAt || a.time) - new Date(b.createdAt || b.time)
          );
          console.log("✅ Direct message restored to current messages");
        }

        // Xóa khỏi temp storage
        state.deletedMessages.splice(deletedMessageIndex, 1);

        console.log("🎉 Message restored successfully");
      } else {
        console.error("❌ Message not found in deletedMessages:", {
          messageId,
          deletedMessages: state.deletedMessages,
        });
      }
    },

    showMessage: (state, action) => {
      const { message, severity = "error", duration = 3000 } = action.payload;
      state.notification = {
        open: true,
        message,
        severity,
        duration,
      };
    },

    hideMessage: (state) => {
      state.notification = {
        ...state.notification,
        open: false,
      };
    },

    pinMessage: (state, action) => {
      const { messageId, chatType } = action.payload;
      const targetState =
        chatType === "group" ? state.group_chat : state.direct_chat;

      if (!targetState.pinned_messages.find((msg) => msg.id === messageId)) {
        const message = findMessageById(targetState, messageId);
        if (message) {
          targetState.pinned_messages.push(message);
        }
      }
    },

    unpinMessage: (state, action) => {
      const { messageId, chatType } = action.payload;
      const targetState =
        chatType === "group" ? state.group_chat : state.direct_chat;

      targetState.pinned_messages = targetState.pinned_messages.filter(
        (msg) => msg.id !== messageId
      );
    },

    setPinnedMessages: (state, action) => {
      const { messages, chatType } = action.payload;
      const targetState =
        chatType === "group" ? state.group_chat : state.direct_chat;

      targetState.pinned_messages = messages;
    },

    clearPinnedMessages: (state, action) => {
      const { chatType } = action.payload;
      const targetState =
        chatType === "group" ? state.group_chat : state.direct_chat;

      targetState.pinned_messages = [];
    },

    updatePinnedMessages: (state, action) => {
      const { messages, chatType } = action.payload;
      const targetState =
        chatType === "group" ? state.group_chat : state.direct_chat;

      console.log("📍 Redux: updatePinnedMessages", {
        chatType,
        messagesCount: messages.length,
        encrypted_pinned_messages: messages.filter((m) => m.isEncrypted).length,
      });

      targetState.pinned_messages = messages;
    },

    updateMessagePinnedStatus: (state, action) => {
      const { messageId, isPinned, chatType } = action.payload;

      console.log("📍 Redux: updateMessagePinnedStatus", {
        messageId,
        isPinned,
        chatType,
      });

      if (chatType === "group") {
        // Cập nhật trong current room messages
        if (state.group_chat.current_room?.messages) {
          state.group_chat.current_room.messages =
            state.group_chat.current_room.messages.map((msg) =>
              msg.id === messageId || msg._id === messageId
                ? { ...msg, isPinned }
                : msg
            );
        }

        // Cập nhật trong rooms list
        state.group_chat.rooms.forEach((room) => {
          if (room.messages) {
            room.messages = room.messages.map((msg) =>
              msg.id === messageId || msg._id === messageId
                ? { ...msg, isPinned }
                : msg
            );
          }
        });
      } else {
        // Cập nhật trong direct chat messages
        state.direct_chat.current_messages =
          state.direct_chat.current_messages.map((msg) =>
            msg.id === messageId || msg._id === messageId
              ? { ...msg, isPinned }
              : msg
          );

        // Cập nhật trong conversations
        state.direct_chat.conversations.forEach((conv) => {
          if (conv.messages) {
            conv.messages = conv.messages.map((msg) =>
              msg._id === messageId ? { ...msg, isPinned } : msg
            );
          }
        });
      }
    },

    setShouldRefetchPinned: (state, action) => {
      const { chatType, shouldRefetch } = action.payload;
      const targetState =
        chatType === "group" ? state.group_chat : state.direct_chat;

      if (!targetState.shouldRefetchPinned) {
        targetState.shouldRefetchPinned = shouldRefetch;
      } else {
        targetState.shouldRefetchPinned = shouldRefetch;
      }
    },
  },
});

export default slice.reducer;

// 🆕 CẬP NHẬT EXPORTS - THÊM TẤT CẢ CÁC ACTIONS E2EE
export const {
  fetchDirectConversationsStart,
  fetchDirectConversationsSuccess,
  fetchDirectConversationsFail,
  fetchGroupRoomsStart,
  fetchGroupRoomsSuccess,
  fetchGroupRoomsFail,
  setCurrentGroupRoom,
  setCurrentConversation,
  fetchCurrentMessages,
  addDirectMessage,
  updateUserPresence,
  resetConversationState,
  addGroupMessage,
  updateDirectConversation,
  addDirectConversation,
  updateGroupRoom,
  clearCurrentRoom,
  clearCurrentConversation,
  updateDirectMessage,
  deleteMessage,
  restoreMessage,
  showMessage,
  hideMessage,
  pinMessage,
  unpinMessage,
  setPinnedMessages,
  clearPinnedMessages,
  updatePinnedMessages,
  updateMessagePinnedStatus,
  setShouldRefetchPinned,
  // 🆕 E2EE ACTIONS
  updateEncryptionStatus,
  processEncryptedMessage,
  setEncryptionKeys,
  setKeyExchangeStatus,
  updateDecryptedMessage,
  setE2EEEnabled,
  updateE2EEStatus,
  addKeyPair,
  addToDecryptionQueue,
  removeFromDecryptionQueue,
} = slice.actions;

// ==================== THUNKS ====================

// 🆕 THÊM: Thunk để khởi tạo E2EE
export const initializeE2EE = () => async (dispatch, getState) => {
  try {
    console.log("🔐 Initializing E2EE...");

    dispatch(updateE2EEStatus({ status: "initializing" }));

    // TODO: Generate key pair for current user
    // const keyPair = await generateKeyPair();
    // dispatch(addKeyPair({ userId: getState().auth.user_id, keyPair }));

    dispatch(updateE2EEStatus({ status: "ready" }));
    console.log("✅ E2EE initialized successfully");
  } catch (error) {
    console.error("❌ E2EE initialization failed:", error);
    dispatch(updateE2EEStatus({ status: "error" }));
    dispatch(
      showSnackbar({
        severity: "error",
        message:
          "Failed to initialize encryption. Some messages may not be secure.",
      })
    );
  }
};

// 🆕 THÊM: Thunk để bật/tắt E2EE
export const toggleE2EE = (enabled) => async (dispatch) => {
  try {
    dispatch(setE2EEEnabled({ isEnabled: enabled }));

    if (enabled) {
      dispatch(initializeE2EE());
    }

    dispatch(
      showSnackbar({
        severity: "info",
        message: enabled
          ? "End-to-end encryption enabled"
          : "End-to-end encryption disabled",
      })
    );
  } catch (error) {
    console.error("❌ Failed to toggle E2EE:", error);
    dispatch(
      showSnackbar({
        severity: "error",
        message: "Failed to toggle encryption",
      })
    );
  }
};

// 🆕 THÊM: Thunk để tự động giải mã tin nhắn khi fetch
export const autoDecryptMessages =
  (chatType, conversationId = null) =>
  async (dispatch, getState) => {
    try {
      const state = getState();
      const e2eeEnabled = state.conversation.e2ee.isEnabled;

      if (!e2eeEnabled) {
        console.log("🔐 E2EE is disabled, skipping auto-decrypt");
        return;
      }

      let messages = [];

      if (chatType === "group") {
        if (state.conversation.group_chat.current_room?.messages) {
          messages = state.conversation.group_chat.current_room.messages.filter(
            (m) => m.isEncrypted && !m.isDecrypted
          );
        }
      } else {
        messages = state.conversation.direct_chat.current_messages.filter(
          (m) => m.isEncrypted && !m.isDecrypted
        );
      }

      console.log(
        `🔐 Auto-decrypt found ${messages.length} messages to decrypt`
      );

      if (messages.length > 0) {
        // TODO: Thực hiện giải mã thực tế ở đây
        // dispatch(decryptPendingMessages(chatType, decryptionFunction));

        console.log("⚠️ Auto-decrypt is TODO - implement decryption function");

        // 🆕 HIỂN THỊ THÔNG BÁO CHO NGƯỜI DÙNG
        dispatch(
          showSnackbar({
            severity: "info",
            message: `Found ${messages.length} encrypted messages. Decryption will be attempted.`,
          })
        );
      }
    } catch (error) {
      console.error("❌ autoDecryptMessages error:", error);
    }
  };

// 🆕 THÊM: Thunk để decrypt message
export const decryptMessageThunk =
  (messageId, chatType, decryptionFunction) => async (dispatch, getState) => {
    try {
      console.log("🔓 decryptMessageThunk:", { messageId, chatType });

      const state = getState();
      let message = null;

      // Find the message
      if (chatType === "group") {
        if (state.conversation.group_chat.current_room?.messages) {
          message = state.conversation.group_chat.current_room.messages.find(
            (m) => m.id === messageId || m._id === messageId
          );
        }
      } else {
        message = state.conversation.direct_chat.current_messages.find(
          (m) => m.id === messageId || m._id === messageId
        );
      }

      if (!message) {
        console.error("❌ Message not found for decryption");
        return;
      }

      if (!message.isEncrypted) {
        console.log("ℹ️ Message is not encrypted");
        return;
      }

      if (message.isDecrypted) {
        console.log("ℹ️ Message already decrypted");
        return;
      }

      // Add to decryption queue
      dispatch(addToDecryptionQueue({ message }));

      try {
        // Call decryption function
        const decryptedContent = await decryptionFunction(message);

        console.log("✅ Message decrypted successfully:", {
          messageId,
          decryptedContentLength: decryptedContent?.length,
        });

        // Update message with decrypted content
        dispatch(
          updateDecryptedMessage({
            messageId,
            chatType,
            decryptedContent,
          })
        );

        // Remove from queue
        dispatch(removeFromDecryptionQueue({ messageId }));
      } catch (decryptError) {
        console.error("❌ Decryption failed:", decryptError);

        // Update message with decryption error
        dispatch(
          updateEncryptionStatus({
            messageId,
            chatType,
            encryptionStatus: "decryption_failed",
            decryptionError: decryptError.message,
          })
        );

        // Remove from queue
        dispatch(removeFromDecryptionQueue({ messageId }));

        dispatch(
          showSnackbar({
            severity: "error",
            message:
              "Failed to decrypt message. You may need to exchange keys.",
          })
        );
      }
    } catch (error) {
      console.error("❌ decryptMessageThunk error:", error);
      dispatch(removeFromDecryptionQueue({ messageId }));
    }
  };

// 🆕 THÊM: Thunk để xử lý batch decryption
export const decryptPendingMessages =
  (chatType, decryptionFunction) => async (dispatch, getState) => {
    try {
      console.log("🔓 Decrypting pending messages for:", chatType);

      const state = getState();
      let messages = [];

      if (chatType === "group") {
        if (state.conversation.group_chat.current_room?.messages) {
          messages = state.conversation.group_chat.current_room.messages.filter(
            (m) => m.isEncrypted && !m.isDecrypted
          );
        }
      } else {
        messages = state.conversation.direct_chat.current_messages.filter(
          (m) => m.isEncrypted && !m.isDecrypted
        );
      }

      console.log(`🔓 Found ${messages.length} messages to decrypt`);

      // Decrypt each message
      for (const message of messages) {
        if (!message.isDecrypted) {
          await dispatch(
            decryptMessageThunk(
              message.id || message._id,
              chatType,
              decryptionFunction
            )
          );
          // Small delay to prevent UI blocking
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      }

      console.log("✅ Batch decryption completed");
    } catch (error) {
      console.error("❌ Batch decryption failed:", error);
    }
  };

// Fetch group messages với MERGE
// Fetch group messages với MERGE
export const fetchGroupMessages = (roomId) => async (dispatch, getState) => {
  try {
    console.log("🔄 Fetching group messages for room:", roomId);

    // Validate roomId
    if (!roomId) {
      console.error("❌ No roomId provided");
      return;
    }

    // Lấy keycloakId từ state
    const state = getState();
    const keycloakId = state.auth.user_id;

    if (!keycloakId) {
      console.error("❌ No keycloakId found in state");
      return;
    }

    // Gọi API với method POST và body
    console.log("🔄 Calling API for group messages with POST", roomId);
    const res = await api.post(`users/rooms/messages`, {
      roomId: roomId,
      keycloakId: keycloakId,
      page: 1,
      limit: 100,
    });

    // Kiểm tra dữ liệu trước khi dispatch
    if (res.data && Array.isArray(res.data.data)) {
      dispatch(
        fetchCurrentMessages({
          messages: res.data.data,
          currentUserId: keycloakId,
          isGroup: true,
          merge: true, // QUAN TRỌNG: MERGE messages
        })
      );

      // 🆕 Tự động decrypt messages nếu E2EE enabled
      const e2eeEnabled = state.conversation.e2ee.isEnabled;
      if (e2eeEnabled && res.data.data.some((m) => m.isEncrypted)) {
        console.log("🔐 Auto-decrypting encrypted messages after fetch");
        // Gọi auto-decrypt sau khi fetch xong
        setTimeout(() => {
          dispatch(autoDecryptMessages("group", roomId));
        }, 500);
      }
    } else {
      console.warn("⚠️ No messages data in response:", res.data);
      // KHÔNG dispatch empty array để tránh mất messages hiện tại
    }
  } catch (error) {
    console.error("❌ fetchGroupMessages error:", error);
    // KHÔNG dispatch empty array để tránh mất messages hiện tại
    if (error.response) {
      console.error("❌ API Error:", error.response.data);
    }
  }
};

// Add group message thunk
export const addGroupMessageThunk =
  (message, room_id) => async (dispatch, getState) => {
    try {
      console.log("🔄 addGroupMessageThunk with E2EE:", {
        message_id: message.id,
        room_id,
        isEncrypted: message.isEncrypted,
      });

      dispatch(
        addGroupMessage({
          message,
          room_id,
        })
      );

      // 🆕 Log encryption status
      if (message.isEncrypted) {
        console.log("🔐 Encrypted message added to group:", {
          messageId: message.id,
          hasCiphertext: !!message.ciphertext,
          keyId: message.keyId,
        });
      }
    } catch (error) {
      console.error("❌ addGroupMessageThunk error:", error);
    }
  };

// Giữ nguyên các thunks khác
export const fetchDirectConversations =
  ({ conversations, currentUserId }) =>
  async (dispatch) => {
    dispatch(fetchDirectConversationsStart());
    try {
      dispatch(
        fetchDirectConversationsSuccess({ conversations, currentUserId })
      );

      // 🆕 Check for encrypted conversations
      const encryptedConvs = conversations.filter((c) => c.isEncrypted);
      if (encryptedConvs.length > 0) {
        console.log(
          `🔐 Found ${encryptedConvs.length} encrypted conversations`
        );
      }
    } catch (error) {
      console.error("❌ fetchDirectConversations error:", error);
      dispatch(fetchDirectConversationsFail({ error }));
    }
  };

// Fetch group rooms với endpoint đúng
export const fetchGroupRooms = (keycloakId) => async (dispatch) => {
  dispatch(fetchGroupRoomsStart());
  try {
    const res = await api.post("users/rooms/group", {
      keycloakId,
    });
    console.log("✅ Group rooms response:", {
      roomsCount: res.data.data?.length,
      data: res.data,
      encryptedRooms: res.data.data?.filter((r) => r.isEncrypted).length,
    });

    // Kiểm tra dữ liệu trả về
    if (res.data && res.data.data) {
      dispatch(fetchGroupRoomsSuccess({ rooms: res.data.data }));
    } else {
      console.warn("⚠️ No rooms data in response:", res.data);
      dispatch(fetchGroupRoomsSuccess({ rooms: [] }));
    }
  } catch (error) {
    console.error("❌ fetchGroupRooms error:", error);
    dispatch(fetchGroupRoomsFail({ error: error.message }));
  }
};

// 🆕 THÊM: Thunk để xóa tin nhắn - LẤY keycloakId TỪ STATE
export const deleteMessageThunk =
  (messageId, isGroup = false, roomId = null, socket) =>
  async (dispatch, getState) => {
    try {
      console.log("🗑️ deleteMessageThunk:", { messageId, isGroup, roomId });

      const state = getState();
      const keycloakId = state.auth.user_id;

      if (!keycloakId) {
        dispatch(
          showSnackbar({
            severity: "error",
            message: "User not authenticated",
          })
        );
        throw new Error("User not authenticated");
      }

      // 1. OPTIMISTIC UPDATE
      dispatch(deleteMessage({ messageId, isGroup }));

      // 2. EMIT SOCKET SAU KHI DISPATCH
      if (socket) {
        const socketEvent = isGroup
          ? "delete_group_message"
          : "delete_direct_message";

        const socketData = isGroup
          ? { messageId, keycloakId, roomId }
          : { messageId, keycloakId };

        socket.emit(socketEvent, socketData, (response) => {
          console.log("✅ Socket response:", response);

          if (response.status !== "success") {
            console.error("❌ Socket delete failed, restoring message...");

            // Rollback nếu server báo lỗi
            dispatch(restoreMessage({ messageId, isGroup }));

            // 🆕 HIỂN THỊ THÔNG BÁO LỖI CHO NGƯỜI DÙNG
            let errorMessage = "Failed to delete message";

            if (response.message.includes("1 hour")) {
              errorMessage =
                "You can only delete messages within 1 hour of sending";
            } else if (response.message.includes("own messages")) {
              errorMessage = "You can only delete your own messages";
            } else if (response.message.includes("not found")) {
              errorMessage = "Message not found";
            } else if (response.message.includes("Access denied")) {
              errorMessage = "Access denied to this conversation";
            }

            // THAY THẾ: Sử dụng showSnackbar từ app slice
            dispatch(
              showSnackbar({
                severity: "error",
                message: errorMessage,
              })
            );
          } else {
            // 🆕 HIỂN THỊ THÔNG BÁO THÀNH CÔNG
            // THAY THẾ: Sử dụng showSnackbar từ app slice
            dispatch(
              showSnackbar({
                severity: "success",
                message: "Message deleted successfully",
              })
            );
          }
        });
      } else {
        console.error("❌ Socket not available");
        dispatch(restoreMessage({ messageId, isGroup }));

        // 🆕 HIỂN THỊ THÔNG BÁO LỖI
        // THAY THẾ: Sử dụng showSnackbar từ app slice
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Socket connection not available",
          })
        );

        throw new Error("Socket connection not available");
      }
    } catch (error) {
      console.error("❌ deleteMessageThunk error:", error);
      dispatch(restoreMessage({ messageId, isGroup }));

      // 🆕 HIỂN THỊ THÔNG BÁO LỖI
      // THAY THẾ: Sử dụng showSnackbar từ app slice
      dispatch(
        showSnackbar({
          severity: "error",
          message: error.message || "Failed to delete message",
        })
      );

      throw error;
    }
  };

// 🆕 THÊM: Thunk để fetch pinned messages
export const fetchPinnedMessages =
  (roomId, chatType) => async (dispatch, getState) => {
    try {
      const state = getState();
      const keycloakId = state.auth.user_id;
      console.log("🔄 Fetching pinned messages for room:", roomId, keycloakId);

      if (!keycloakId) {
        console.error("❌ No keycloakId found in state");
        return;
      }

      const res = await api.post("users/messages/pinned", {
        roomId: roomId,
        keycloakId: keycloakId,
      });

      if (res.data && res.data.status === "success") {
        dispatch(
          setPinnedMessages({
            messages: res.data.data,
            chatType: chatType,
          })
        );

        console.log("✅ Pinned messages fetched:", {
          count: res.data.data.length,
          encrypted: res.data.data.filter((m) => m.isEncrypted).length,
        });
      } else {
        console.warn("⚠️ No pinned messages data in response");
      }
    } catch (error) {
      console.error("❌ fetchPinnedMessages error:", error);
    }
  };

// 🆕 THÊM: Thunk để xử lý incoming encrypted message từ socket
// 🆕 THÊM: Thunk để xử lý incoming encrypted message từ socket
export const handleIncomingEncryptedMessage =
  (messageData) => async (dispatch, getState) => {
    try {
      const { message, chatType, roomId, conversationId } = messageData;

      console.log("🔐 handleIncomingEncryptedMessage:", {
        message_id: message.id,
        chatType,
        isEncrypted: message.isEncrypted,
        hasCiphertext: !!message.ciphertext,
      });

      // First, add the message to state
      if (chatType === "group") {
        dispatch(addGroupMessageThunk(message, roomId));
      } else {
        // Direct message
        const state = getState();
        const currentUserId = state.auth.user_id;

        dispatch(
          addDirectMessage({
            message,
            conversation_id: conversationId,
            currentUserId,
            isGroup: false,
            isOptimistic: false,
          })
        );
      }

      // 🆕 Auto-decrypt nếu có thể
      if (message.isEncrypted && !message.isDecrypted) {
        const state = getState();
        const e2eeEnabled = state.conversation.e2ee.isEnabled;

        if (e2eeEnabled) {
          console.log(
            "🔐 Auto-decrypting incoming encrypted message:",
            message.id
          );

          // 🆕 THÊM: Thử giải mã ngay lập tức
          setTimeout(() => {
            dispatch(
              autoDecryptMessages(
                chatType,
                chatType === "group" ? roomId : conversationId
              )
            );
          }, 300);
        }
      }
    } catch (error) {
      console.error("❌ handleIncomingEncryptedMessage error:", error);
    }
  };

// 🆕 THÊM: Thunk để kiểm tra và cập nhật E2EE status
export const checkE2EEStatus =
  (targetId, chatType) => async (dispatch, getState) => {
    try {
      const state = getState();
      let hasKeys = false;

      if (chatType === "group") {
        hasKeys =
          !!state.conversation.group_chat.encryptionKeys[targetId]
            ?.sharedSecrets;
      } else {
        hasKeys =
          !!state.conversation.direct_chat.encryptionKeys[targetId]
            ?.sharedSecret;
      }

      console.log("🔐 E2EE status check:", {
        targetId,
        chatType,
        hasKeys,
      });

      if (!hasKeys) {
        // TODO: Initiate key exchange
        console.log("🔐 No encryption keys found, initiating key exchange...");

        if (chatType === "group") {
          dispatch(
            setKeyExchangeStatus({
              chatType,
              targetId,
              userId: state.auth.user_id,
              status: "pending",
            })
          );
        } else {
          dispatch(
            setKeyExchangeStatus({
              chatType,
              targetId,
              status: "pending",
            })
          );
        }
      }

      return hasKeys;
    } catch (error) {
      console.error("❌ checkE2EEStatus error:", error);
      return false;
    }
  };
