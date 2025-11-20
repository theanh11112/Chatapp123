// conversation.js - HOÀN CHỈNH VỚI BẢO VỆ MESSAGES
import { createSlice } from "@reduxjs/toolkit";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../../config";
import { timeAgo } from "../../utils/timeAgo";
import api from "../../utils/axios";

const parseTimestamp = (ts) => {
  const t = new Date(ts).getTime();
  return isNaN(t) ? null : t;
};

const formatMessageTime = (ts) =>
  ts
    ? new Date(ts).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

const initialState = {
  direct_chat: {
    conversations: [],
    current_conversation: { id: null, messages: [] },
    current_messages: [],
    isLoading: false,
    error: null,
  },
  group_chat: {
    rooms: [],
    current_room: null,
    isLoading: false,
    error: null,
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
      });

      // Xử lý direct conversations (one-to-one)
      state.direct_chat.conversations = conversations.map((conv) => {
        const user = conv.participants?.find(
          (p) => p.keycloakId !== currentUserId
        );
        const lastMsg = conv.messages?.slice(-1)[0];
        const lastSeenTs = parseTimestamp(user?.lastSeen);

        return {
          id: conv._id, // ID từ conversation schema
          user_id: user?.keycloakId || null,
          name:
            `${user?.username || ""} ${user?.lastName || ""}`.trim() ||
            "Unknown",
          online: user?.status === "Online",
          img: user?.avatar
            ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
            : `https://i.pravatar.cc/150?u=${user?.keycloakId}`,
          msg: lastMsg?.content || lastMsg?.text || "",
          time: formatMessageTime(lastMsg?.createdAt),
          unread: 0,
          pinned: false,
          about: user?.about || "",
          messages: conv.messages || [],
          lastSeen: lastSeenTs ? timeAgo(lastSeenTs) : "",
        };
      });

      // Giữ current_conversation nếu vẫn tồn tại
      if (state.direct_chat.current_conversation?.id) {
        const currentConvInNewList = state.direct_chat.conversations.find(
          (c) => c.id === state.direct_chat.current_conversation.id
        );
        if (currentConvInNewList) {
          state.direct_chat.current_conversation = currentConvInNewList;
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
      });

      // Xử lý group rooms (room schema khác với conversation)
      state.group_chat.rooms = rooms.map((room) => {
        const lastMsg = room.lastMessage;
        const membersCount = room.members?.length || 0;
        const onlineMembers =
          room.members?.filter((m) => m.status === "Online").length || 0;

        return {
          id: room._id, // ID từ room schema
          name: room.name || "Unnamed Group",
          isGroup: true, // Luôn là true cho group
          members: room.members || [],
          membersCount: membersCount,
          onlineMembers: onlineMembers,
          createdBy: room.createdBy || {},
          lastMessage: lastMsg
            ? {
                id: lastMsg._id,
                content: lastMsg.content,
                type: lastMsg.type,
                sender: lastMsg.sender,
                time: formatMessageTime(lastMsg.createdAt),
              }
            : null,
          pinnedMessages: room.pinnedMessages || [],
          topic: room.topic || "",
          img:
            room.img ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              room.name || "Group"
            )}&background=random`,
          msg: lastMsg?.content || "No messages yet",
          time: lastMsg ? formatMessageTime(lastMsg.createdAt) : "",
          unread: 0,
          pinned: room.pinnedMessages?.length > 0,
          messages: room.messages || [], // Messages từ room schema
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        };
      });

      state.group_chat.isLoading = false;
    },

    fetchGroupRoomsFail(state, action) {
      state.group_chat.isLoading = false;
      state.group_chat.error = action.payload.error;
    },

    // 🆕 SỬA QUAN TRỌNG: Set current group room với BẢO VỆ MESSAGES
    // conversation.js - SỬA LỖI QUAN TRỌNG TRONG setCurrentGroupRoom

    // 🆕 SỬA QUAN TRỌNG: setCurrentGroupRoom với logic MERGE messages
    // conversation.js - SỬA setCurrentGroupRoom ĐỂ BẢO VỆ MESSAGES
    setCurrentGroupRoom(state, action) {
      try {
        console.log("🔄 setCurrentGroupRoom:", {
          payload: action.payload,
          current_room_id: state.group_chat.current_room?.id,
          current_messages_count:
            state.group_chat.current_room?.messages?.length,
        });

        const roomData = action.payload;

        // Cho phép set null để clear room
        if (roomData === null) {
          state.group_chat.current_room = null;
          console.log("✅ Current room cleared");
          return;
        }

        if (!roomData || !roomData.id) {
          console.warn("⚠️ Invalid room data in setCurrentGroupRoom");
          return;
        }

        // 🆕 QUAN TRỌNG: BẢO VỆ MESSAGES HIỆN TẠI
        const isSameRoom = state.group_chat.current_room?.id === roomData.id;
        const currentMessages = state.group_chat.current_room?.messages || [];
        const newMessages = roomData.messages || [];

        console.log("🛡️ Message protection check:", {
          isSameRoom,
          currentMessagesCount: currentMessages.length,
          newMessagesCount: newMessages.length,
        });

        // 🆕 QUY TẮC: Nếu là cùng room và có messages hiện tại, GIỮ messages hiện tại
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
          messages: finalMessages, // 🆕 MESSAGES ĐƯỢC BẢO VỆ
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
        };

        console.log("✅ Current group room set with messages:", {
          messagesCount: state.group_chat.current_room.messages.length,
          source: isSameRoom ? "preserved" : "new",
        });
      } catch (error) {
        console.error("❌ Error in setCurrentGroupRoom:", error);
      }
    },

    setCurrentConversation(state, action) {
      console.log("🔄 setCurrentConversation:", action.payload);

      // Cho phép set null để clear conversation
      if (action.payload === null) {
        state.direct_chat.current_conversation = { id: null, messages: [] };
        state.direct_chat.current_messages = [];
        console.log("✅ Current conversation cleared");
        return;
      }

      state.direct_chat.current_conversation = action.payload;
    },

    // Clear current room
    clearCurrentRoom(state) {
      console.log("🔄 Clearing current room");
      state.group_chat.current_room = null;
    },

    // Clear current conversation
    clearCurrentConversation(state) {
      console.log("🔄 Clearing current conversation");
      state.direct_chat.current_conversation = { id: null, messages: [] };
      state.direct_chat.current_messages = [];
    },

    // Fetch messages với MERGE thay vì REPLACE
    // conversation.js - THÊM DEBUG TRONG fetchCurrentMessages

    // Fetch messages với MERGE thay vì REPLACE
    // Trong conversation.js - SỬA fetchCurrentMessages
    fetchCurrentMessages(state, action) {
      const {
        messages,
        currentUserId,
        isGroup = false,
        merge = true,
      } = action.payload;

      console.log("📥 fetchCurrentMessages - DEBUG:", {
        messages_count: messages?.length,
        currentUserId,
        isGroup,
        merge,
        sample_messages: messages?.slice(0, 3).map((m) => ({
          id: m._id || m.id,
          sender_id: m.sender?.keycloakId || m.senderId, // THÊM senderId
          currentUserId,
          should_be_outgoing:
            (m.sender?.keycloakId || m.senderId) === currentUserId,
          content: m.content?.substring(0, 30),
        })),
      });

      // Validate messages
      const validMessages = Array.isArray(messages) ? messages : [];

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
          };
        }

        const existingMessages = state.group_chat.current_room.messages || [];
        const existingMessageIds = new Set(
          existingMessages.map((m) => m._id || m.id)
        );

        const newMessages = validMessages.filter(
          (m) => !existingMessageIds.has(m._id || m.id)
        );

        console.log("🔄 Merging group messages:", {
          existing: existingMessages.length,
          new: newMessages.length,
          duplicates: validMessages.length - newMessages.length,
        });

        const allMessages = [
          ...existingMessages,
          ...newMessages.map((m) => {
            // 🆕 CẢI THIỆN: Xác định sender với nhiều trường hợp
            const senderId = m.sender?.keycloakId || m.senderId || m.sender;
            const isOutgoing = senderId === currentUserId;

            console.log("🔍 Message sender detection:", {
              message_id: m._id || m.id,
              sender_data: m.sender,
              senderId_extracted: senderId,
              currentUserId,
              isOutgoing,
            });

            return {
              id: m._id || m.id,
              _id: m._id || m.id,
              type: "msg",
              subtype: m.type || "text",
              message: m.content || m.message || "",
              content: m.content || m.message || "",
              incoming: !isOutgoing,
              outgoing: isOutgoing,
              time: formatMessageTime(m.createdAt || m.time),
              createdAt: m.createdAt || m.time,
              attachments: m.attachments || [],
              // 🆕 CẢI THIỆN: Đảm bảo sender structure đầy đủ
              sender: m.sender || {
                keycloakId: senderId,
                username: m.senderName || "Unknown",
              },
            };
          }),
        ];

        allMessages.sort(
          (a, b) =>
            new Date(a.createdAt || a.time) - new Date(b.createdAt || b.time)
        );

        state.group_chat.current_room.messages = allMessages;

        console.log("✅ Final messages after fetch:", {
          total_messages: allMessages.length,
          outgoing_count: allMessages.filter((m) => m.outgoing).length,
          incoming_count: allMessages.filter((m) => m.incoming).length,
        });
      } else {
        // Xử lý direct messages tương tự
        state.direct_chat.current_messages = validMessages.map((m) => {
          const senderId = m.sender?.keycloakId || m.from;
          const isOutgoing = senderId === currentUserId;

          return {
            id: m._id || m.id,
            type: "msg",
            subtype: m.type || "text",
            message: m.content || m.message || "",
            incoming: !isOutgoing,
            outgoing: isOutgoing,
            time: formatMessageTime(m.createdAt || m.time),
            attachments: m.attachments || [],
            sender: m.sender || { keycloakId: senderId },
          };
        });
      }
    },
    // Add direct message với xử lý riêng cho group và direct
    addDirectMessage(state, action) {
      const {
        message,
        conversation_id,
        currentUserId,
        isGroup = false,
        isOptimistic = false,
      } = action.payload;

      // Validate message
      if (!message || !conversation_id) {
        console.warn("⚠️ Invalid message or conversation_id");
        return;
      }

      console.log("📨 addDirectMessage:", {
        message_id: message.id,
        conversation_id,
        isGroup,
        isOptimistic,
        currentUserId,
      });

      if (isGroup) {
        // Xử lý group message
        const room =
          state.group_chat.rooms.find((r) => r.id === conversation_id) ||
          state.group_chat.current_room;

        if (!room) {
          console.log("❌ No group room found for message");
          return;
        }

        // Check duplicate với multiple strategies
        const existsInRoom = this.checkMessageDuplicate(room.messages, message);
        if (existsInRoom) {
          console.log("⚠️ Group message already exists, skipping");
          return;
        }

        if (!room.messages) room.messages = [];

        const newGroupMessage = {
          _id: message.id,
          id: message.id,
          content: message.message,
          type: message.subtype || "text",
          sender: message.sender || {
            keycloakId: currentUserId,
            username: "You",
          },
          createdAt: message.time || new Date().toISOString(),
          attachments: message.attachments || [],
          incoming: false,
          outgoing: true,
          time: formatMessageTime(message.time),
          isOptimistic: isOptimistic,
        };

        room.messages.push(newGroupMessage);

        // Cập nhật lastMessage
        room.msg = message.message;
        room.time = formatMessageTime(new Date());
        room.lastMessage = {
          id: message.id,
          content: message.message,
          type: message.subtype || "text",
          sender: message.sender || {
            keycloakId: currentUserId,
            username: "You",
          },
          time: formatMessageTime(new Date()),
        };

        console.log("✅ Group message added via addDirectMessage", {
          isOptimistic,
          totalMessages: room.messages.length,
        });
      } else {
        // Xử lý direct message
        const conv =
          state.direct_chat.conversations.find(
            (c) => c.id === conversation_id
          ) || state.direct_chat.current_conversation;

        if (!conv) {
          console.log("❌ No conversation found for message");
          return;
        }

        // Check duplicate
        const existsInCurrent = state.direct_chat.current_messages.find(
          (m) => m.id === message.id
        );
        const existsInConv = conv.messages.find((m) => m._id === message.id);

        if (existsInCurrent || existsInConv) {
          console.log("⚠️ Direct message already exists, skipping");
          return;
        }

        state.direct_chat.current_messages.push(message);

        if (!conv.messages) conv.messages = [];

        const newMessageObj = {
          _id: message.id,
          content: message.message,
          type: message.subtype || "text",
          from: message.outgoing ? currentUserId : conv.user_id,
          to: message.outgoing ? conv.user_id : currentUserId,
          createdAt: message.time || new Date().toISOString(),
          attachments: message.attachments || [],
          seen: false,
        };

        conv.messages.push(newMessageObj);
        conv.msg = message.message;
        conv.time = message.time;
      }
    },

    // 🆕 ADD GROUP MESSAGE HOÀN CHỈNH - VỚI DUPLICATE DETECTION
    // Trong addGroupMessage reducer - THÊM DEBUG CHI TIẾT
    // conversation.js - SỬA LỖI QUAN TRỌNG TRONG addGroupMessage

    // 🆕 SỬA: addGroupMessage với đúng message structure
    // conversation.js - SỬA LỖI QUAN TRỌNG

    // 🆕 SỬA: addGroupMessage - LÀM VIỆC TRỰC TIẾP VỚI current_room
    // Trong conversation.js - THÊM debug cho realtime messages
    addGroupMessage(state, action) {
      const { message, room_id, isOptimistic = false } = action.payload;

      console.log("📨 addGroupMessage - REALTIME DEBUG:", {
        message_id: message.id,
        room_id,
        isOptimistic,
        current_room_id: state.group_chat.current_room?.id,
        message_sender: message.sender?.keycloakId,
        message_incoming: message.incoming,
        message_outgoing: message.outgoing,
      });

      // 🆕 QUAN TRỌNG: ƯU TIÊN LÀM VIỆC VỚI current_room TRỰC TIẾP
      let room = state.group_chat.current_room;

      // Nếu current_room không khớp với room_id, tìm trong rooms
      if (!room || room.id !== room_id) {
        room = state.group_chat.rooms.find((r) => r.id === room_id);
      }

      if (!room) {
        console.log("❌ No group room found for message");
        return;
      }

      // 🆕 QUAN TRỌNG: ĐẢM BẢO room.messages LUÔN TỒN TẠI
      if (!room.messages) {
        console.log("🔄 Initializing room.messages array");
        room.messages = [];
      }

      // 🆕 NÂNG CAO: Duplicate detection với multiple strategies
      const existsInRoom = room.messages.find((m) => {
        // Strategy 1: Check by MongoDB _id (từ backend)
        if (m._id === message._id) return true;

        // Strategy 2: Check by UUID (từ optimistic update)
        if (m.id === message.id) return true;

        // Strategy 3: Check by content + sender + timestamp (fallback)
        if (
          m.content === message.content &&
          m.sender?.keycloakId === message.sender?.keycloakId &&
          Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) < 5000
        ) {
          return true;
        }

        return false;
      });

      if (existsInRoom) {
        console.log("⚠️ Group message already exists, skipping", {
          existing_id: existsInRoom._id || existsInRoom.id,
          new_id: message._id || message.id,
        });
        return;
      }

      // 🆕 TẠO MESSAGE THỐNG NHẤT
      const newMessage = {
        _id: message._id || message.id,
        id: message.id || message._id,
        type: "msg",
        subtype: message.subtype || message.type || "text",
        message: message.message || message.content || "",
        content: message.content || message.message || "",
        sender: {
          keycloakId: message.sender?.keycloakId || "unknown",
          username: message.sender?.username || "Unknown",
          ...message.sender,
        },
        createdAt:
          message.createdAt || message.time || new Date().toISOString(),
        time: formatMessageTime(message.createdAt || message.time),
        attachments: message.attachments || [],
        // 🆕 QUAN TRỌNG: GIỮ NGUYÊN incoming/outgoing TỪ SOCKET
        incoming: message.incoming !== undefined ? message.incoming : false,
        outgoing: message.outgoing !== undefined ? message.outgoing : true,
        isOptimistic: message.isOptimistic || isOptimistic,
      };

      console.log("✅ Adding realtime message to room:", {
        room_id: room.id,
        message_id: newMessage.id,
        incoming: newMessage.incoming,
        outgoing: newMessage.outgoing,
        total_messages_before: room.messages.length,
      });

      room.messages.push(newMessage);

      // Cập nhật lastMessage
      room.lastMessage = {
        id: newMessage.id,
        content: newMessage.content,
        type: newMessage.type,
        sender: newMessage.sender,
        time: newMessage.time,
      };

      room.msg = newMessage.content;
      room.time = newMessage.time;

      // Cập nhật lại room trong rooms array nếu cần
      if (room !== state.group_chat.current_room) {
        const roomIndex = state.group_chat.rooms.findIndex(
          (r) => r.id === room_id
        );
        if (roomIndex !== -1) {
          state.group_chat.rooms[roomIndex] = room;
        }
      }
    },

    // 🆕 UPDATE OPTIMISTIC MESSAGE VỚI REAL DATA TỪ BACKEND
    updateOptimisticMessage(state, action) {
      const { optimisticId, realMessage, room_id } = action.payload;

      console.log("🔄 Updating optimistic message:", {
        optimisticId,
        realMessageId: realMessage.id,
        room_id,
      });

      const room =
        state.group_chat.rooms.find((r) => r.id === room_id) ||
        state.group_chat.current_room;

      if (!room || !room.messages) return;

      // Tìm optimistic message bằng UUID
      const optimisticIndex = room.messages.findIndex(
        (m) => m.id === optimisticId && m.isOptimistic
      );

      if (optimisticIndex !== -1) {
        // 🆕 THAY THẾ optimistic message bằng real message
        room.messages[optimisticIndex] = {
          ...room.messages[optimisticIndex],
          _id: realMessage.id, // Cập nhật MongoDB _id
          id: realMessage.id, // Giữ nguyên id từ backend
          isOptimistic: false, // Đánh dấu đã được confirm
          // Giữ nguyên các fields khác từ optimistic message
        };

        // Cập nhật lastMessage
        if (room.lastMessage && room.lastMessage.id === optimisticId) {
          room.lastMessage = {
            id: realMessage.id,
            content: realMessage.content,
            type: realMessage.type,
            sender: realMessage.sender,
            time: formatMessageTime(realMessage.createdAt),
          };
        }

        console.log("✅ Optimistic message updated with real data");
      }
    },

    // Update direct conversation
    updateDirectConversation(state, action) {
      const { conversation, currentUserId } = action.payload;

      console.log("🔄 updateDirectConversation:", {
        conversation_id: conversation._id,
        currentUserId,
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
          msg: lastMsg?.content || lastMsg?.text || "",
          time: formatMessageTime(lastMsg?.createdAt),
          unread: 0,
          pinned: false,
          about: user?.about || "",
          messages: conversation.messages || [],
          lastSeen: lastSeenTs ? timeAgo(lastSeenTs) : "",
        };

        // Cập nhật current_conversation nếu đang active
        if (state.direct_chat.current_conversation?.id === conversation._id) {
          state.direct_chat.current_conversation =
            state.direct_chat.conversations[index];
        }
      }
    },

    // Add direct conversation
    addDirectConversation(state, action) {
      const { conversation, currentUserId } = action.payload;

      console.log("➕ addDirectConversation:", {
        conversation_id: conversation._id,
        currentUserId,
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
          msg: lastMsg?.content || lastMsg?.text || "",
          time: formatMessageTime(lastMsg?.createdAt),
          unread: 0,
          pinned: false,
          about: user?.about || "",
          messages: conversation.messages || [],
          lastSeen: lastSeenTs ? timeAgo(lastSeenTs) : "",
        };

        state.direct_chat.conversations.push(newConversation);
        console.log("✅ Direct conversation added successfully");
      } else {
        console.log("ℹ️ Direct conversation already exists");
      }
    },

    // Update group room
    updateGroupRoom(state, action) {
      const { room } = action.payload;

      console.log("🔄 updateGroupRoom:", {
        room_id: room._id,
        name: room.name,
      });

      const index = state.group_chat.rooms.findIndex((r) => r.id === room._id);

      if (index !== -1) {
        const lastMsg = room.lastMessage;
        const membersCount = room.members?.length || 0;
        const onlineMembers =
          room.members?.filter((m) => m.status === "Online").length || 0;

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
                content: lastMsg.content,
                type: lastMsg.type,
                sender: lastMsg.sender,
                time: formatMessageTime(lastMsg.createdAt),
              }
            : null,
          pinnedMessages: room.pinnedMessages || [],
          topic: room.topic || "",
          img:
            room.img ||
            `https://ui-avatars.com/api/?name=${encodeURIComponent(
              room.name || "Group"
            )}&background=random`,
          msg: lastMsg?.content || "No messages yet",
          time: lastMsg ? formatMessageTime(lastMsg.createdAt) : "",
          unread: 0,
          pinned: room.pinnedMessages?.length > 0,
          messages: room.messages || [],
          createdAt: room.createdAt,
          updatedAt: room.updatedAt,
        };

        // Cập nhật current_room nếu đang active
        if (state.group_chat.current_room?.id === room._id) {
          state.group_chat.current_room = state.group_chat.rooms[index];
        }

        console.log("✅ Group room updated successfully");
      } else {
        console.log("❌ Group room not found for update");
      }
    },

    // Update user presence
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

    // Reset conversation state
    resetConversationState(state) {
      console.log("🔄 Resetting conversation state");
      Object.assign(state, initialState);
    },
  },
});

export default slice.reducer;

// 🆕 CẬP NHẬT EXPORTS - THÊM TẤT CẢ CÁC ACTIONS
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
  updateOptimisticMessage, // 🆕 THÊM
} = slice.actions;

// ==================== THUNKS ====================

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
      console.log("🔄 addGroupMessageThunk:", {
        message_id: message.id,
        room_id,
      });

      dispatch(
        addGroupMessage({
          message,
          room_id,
        })
      );
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
    } catch (error) {
      console.error("❌ fetchDirectConversations error:", error);
      dispatch(fetchDirectConversationsFail({ error }));
    }
  };

// Fetch group rooms với endpoint đúng
export const fetchGroupRooms = (keycloakId) => async (dispatch) => {
  dispatch(fetchGroupRoomsStart());
  try {
    const res = await api.post("/users/rooms/group", {
      keycloakId,
    });
    console.log("✅ Group rooms response:", {
      roomsCount: res.data.data?.length,
      data: res.data,
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
