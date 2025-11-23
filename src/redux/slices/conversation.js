// conversation.js - HOÀN CHỈNH VỚI BẢO VỆ MESSAGES VÀ REAL-TIME FIXES
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

const findMessageById = (chatState, messageId) => {
  // Tìm trong current messages
  if (chatState.current_messages) {
    const foundInCurrent = chatState.current_messages.find(
      (msg) => msg.id === messageId
    );
    if (foundInCurrent) return foundInCurrent;
  }

  // Tìm trong current conversation messages
  if (chatState.current_conversation?.messages) {
    const foundInConv = chatState.current_conversation.messages.find(
      (msg) => msg.id === messageId
    );
    if (foundInConv) return foundInConv;
  }

  // Tìm trong current room messages
  if (chatState.current_room?.messages) {
    const foundInRoom = chatState.current_room.messages.find(
      (msg) => msg.id === messageId
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
  },
  group_chat: {
    rooms: [],
    current_room: null,
    isLoading: false,
    error: null,
    pinned_messages: [],
    shouldRefetchPinned: false,
  },
  deletedMessages: [],
  notification: {
    // 🆕 THÊM NOTIFICATION STATE
    open: false,
    message: "",
    severity: "error", // error, warning, info, success
    duration: 3000,
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

    // 🆕 SỬA QUAN TRỌNG: setCurrentGroupRoom với logic MERGE messages
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

    // 🆕 SỬA: fetchCurrentMessages với xử lý direct messages realtime
    fetchCurrentMessages(state, action) {
      const {
        messages,
        currentUserId,
        isGroup = false,
        merge = true,
      } = action.payload;

      console.log("📥 fetchCurrentMessages - DEBUG with REPLY:", {
        messages_count: messages?.length,
        currentUserId,
        isGroup,
        merge,
        sample_messages: messages?.slice(0, 3).map((m) => ({
          id: m._id || m.id,
          subtype: m.subtype || m.type,
          has_replyTo: !!m.replyTo,
          replyTo_type: typeof m.replyTo,
          replyTo_data: m.replyTo,
        })),
      });

      // Validate messages
      const validMessages = Array.isArray(messages) ? messages : [];

      // 🆕 THÊM: Hàm xử lý replyTo
      const processReplyTo = (m) => {
        if (!m.replyTo) return null;

        console.log("🔍 Processing replyTo for message:", {
          message_id: m._id || m.id,
          replyTo_raw: m.replyTo,
          replyTo_type: typeof m.replyTo,
        });

        // Nếu replyTo đã là object đầy đủ
        if (typeof m.replyTo === "object" && m.replyTo.id) {
          console.log("✅ replyTo already has full object structure");
          return {
            id: m.replyTo.id,
            content: m.replyTo.content || m.replyContent || "Original message",
            sender: m.replyTo.sender ||
              m.replySender || {
                keycloakId: "unknown",
                username: "Unknown",
              },
            type: m.replyTo.type || m.replyType || "text",
          };
        }

        // Nếu replyTo chỉ là ID string
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
          new_messages_with_reply: newMessages.filter((m) => m.replyTo).length,
        });

        const allMessages = [
          ...existingMessages,
          ...newMessages.map((m) => {
            const senderId = m.sender?.keycloakId || m.senderId || m.sender;
            const isOutgoing = senderId === currentUserId;

            // 🆕 XỬ LÝ REPLYTO CHO GROUP
            const processedReplyTo = processReplyTo(m);

            console.log("🔍 Group message processing:", {
              message_id: m._id || m.id,
              subtype: m.subtype || m.type,
              has_replyTo: !!m.replyTo,
              processed_replyTo: !!processedReplyTo,
            });

            return {
              id: m._id || m.id,
              _id: m._id || m.id,
              type: "msg",
              subtype: m.subtype || m.type || "text", // 🆕 SỬA: Ưu tiên subtype
              message: m.content || m.message || "",
              content: m.content || m.message || "",
              incoming: !isOutgoing,
              outgoing: isOutgoing,
              time: formatMessageTime(m.createdAt || m.time),
              createdAt: m.createdAt || m.time,
              attachments: m.attachments || [],
              sender: m.sender || {
                keycloakId: senderId,
                username: m.senderName || "Unknown",
              },
              // 🆕 THÊM REPLYTO ĐÃ XỬ LÝ
              replyTo: processedReplyTo,
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
          messages_with_reply: allMessages.filter((m) => m.replyTo).length,
          outgoing_count: allMessages.filter((m) => m.outgoing).length,
          incoming_count: allMessages.filter((m) => m.incoming).length,
        });
      } else {
        // 🆕 SỬA QUAN TRỌNG: Xử lý direct messages với REPLYTO
        const existingMessages = state.direct_chat.current_messages || [];
        const existingMessageIds = new Set(
          existingMessages.map((m) => m._id || m.id)
        );

        const newMessages = validMessages.filter(
          (m) => !existingMessageIds.has(m._id || m.id)
        );

        console.log("🔄 Merging direct messages:", {
          existing: existingMessages.length,
          new: newMessages.length,
          duplicates: validMessages.length - newMessages.length,
          new_messages_with_reply: newMessages.filter((m) => m.replyTo).length,
        });

        const allMessages = [
          ...existingMessages,
          ...newMessages.map((m) => {
            const senderId = m.sender?.keycloakId || m.from;
            const isOutgoing = senderId === currentUserId;

            // 🆕 XỬ LÝ REPLYTO CHO DIRECT
            const processedReplyTo = processReplyTo(m);

            console.log("🔍 Direct message processing:", {
              message_id: m._id || m.id,
              subtype: m.subtype || m.type,
              has_replyTo: !!m.replyTo,
              processed_replyTo: !!processedReplyTo,
            });

            return {
              id: m._id || m.id,
              type: "msg",
              subtype: m.subtype || m.type || "text", // 🆕 SỬA: Ưu tiên subtype
              message: m.content || m.message || "",
              content: m.content || m.message || "",
              incoming: !isOutgoing,
              outgoing: isOutgoing,
              time: formatMessageTime(m.createdAt || m.time),
              createdAt: m.createdAt || m.time,
              attachments: m.attachments || [],
              sender: m.sender || {
                keycloakId: senderId,
                username: m.sender?.username || "Unknown",
              },
              // 🆕 THÊM REPLYTO ĐÃ XỬ LÝ
              replyTo: processedReplyTo,
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
          messages_with_reply: allMessages.filter((m) => m.replyTo).length,
          outgoing_count: allMessages.filter((m) => m.outgoing).length,
          incoming_count: allMessages.filter((m) => m.incoming).length,
        });
      }
    },

    // 🆕 SỬA: addDirectMessage với xử lý realtime cho cả direct và group
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
        replaceOptimistic,
        tempId,
        currentUserId,
      });

      if (isGroup) {
        // 🆕 Xử lý group message với replaceOptimistic
        const room =
          state.group_chat.rooms.find((r) => r.id === conversation_id) ||
          state.group_chat.current_room;

        if (!room) {
          console.log("❌ No group room found for message");
          return;
        }

        // Đảm bảo room.messages tồn tại
        if (!room.messages) {
          room.messages = [];
        }

        // 🆕 Xử lý replace optimistic message
        if (replaceOptimistic && tempId) {
          const optimisticIndex = room.messages.findIndex(
            (m) => m.tempId === tempId || m.id === tempId
          );

          if (optimisticIndex !== -1) {
            console.log("🔄 Replacing optimistic message:", {
              optimistic_index: optimisticIndex,
              tempId,
              real_id: message.id,
            });

            room.messages[optimisticIndex] = {
              ...message,
              isOptimistic: false,
            };

            // Cập nhật lastMessage
            room.lastMessage = {
              id: message.id,
              content: message.content,
              type: message.type,
              sender: message.sender,
              time: message.time,
            };

            room.msg = message.content;
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

        const newGroupMessage = {
          _id: message._id || message.id,
          id: message.id || message._id,
          type: "msg",
          subtype: message.subtype || message.type || "text",
          message: message.message || message.content || "",
          content: message.content || message.message || "",
          sender: message.sender || {
            keycloakId: currentUserId,
            username: "You",
          },
          replyTo: message.replyTo,
          createdAt:
            message.createdAt || message.time || new Date().toISOString(),
          time: formatMessageTime(message.createdAt || message.time),
          attachments: message.attachments || [],
          incoming: message.incoming !== undefined ? message.incoming : false,
          outgoing: message.outgoing !== undefined ? message.outgoing : true,
          isOptimistic: isOptimistic,
          tempId: tempId,
        };

        room.messages.push(newGroupMessage);

        // Cập nhật lastMessage
        room.lastMessage = {
          id: newGroupMessage.id,
          content: newGroupMessage.content,
          type: newGroupMessage.type,
          sender: newGroupMessage.sender,
          time: newGroupMessage.time,
        };

        room.msg = newGroupMessage.content;
        room.time = newGroupMessage.time;

        console.log("✅ Group message added via addDirectMessage", {
          isOptimistic,
          totalMessages: room.messages.length,
        });
      } else {
        // 🆕 Xử lý direct message với replaceOptimistic
        const conv =
          state.direct_chat.conversations.find(
            (c) => c.id === conversation_id
          ) || state.direct_chat.current_conversation;

        if (!conv) {
          console.log("❌ No conversation found for message");
          return;
        }

        // Xử lý replace optimistic message
        if (replaceOptimistic && tempId) {
          const optimisticIndex = state.direct_chat.current_messages.findIndex(
            (m) => m.tempId === tempId || m.id === tempId
          );

          if (optimisticIndex !== -1) {
            console.log("🔄 Replacing optimistic direct message:", {
              optimistic_index: optimisticIndex,
              tempId,
              real_id: message.id,
            });

            state.direct_chat.current_messages[optimisticIndex] = {
              ...message,
              isOptimistic: false,
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

        // Thêm message mới
        if (!existsInCurrent) {
          state.direct_chat.current_messages.push(message);
        }

        // Cập nhật conversation messages
        if (!conv.messages) conv.messages = [];

        if (!existsInConv) {
          const newMessageObj = {
            _id: message.id,
            content: message.message,
            type: message.subtype || "text",
            from: message.outgoing ? currentUserId : conv.user_id,
            to: message.outgoing ? conv.user_id : currentUserId,
            createdAt:
              message.createdAt || message.time || new Date().toISOString(),
            attachments: message.attachments || [],
            seen: false,
          };

          conv.messages.push(newMessageObj);
        }

        conv.msg = message.message;
        conv.time = message.time;
      }
    },

    // 🆕 SỬA: addGroupMessage hoàn chỉnh với realtime support
    addGroupMessage(state, action) {
      const {
        message,
        room_id,
        isOptimistic = false,
        replaceOptimistic = false,
        tempId = null,
      } = action.payload;

      console.log("📨 addGroupMessage - REALTIME DEBUG:", {
        message_id: message.id,
        tempId,
        room_id,
        isOptimistic,
        replaceOptimistic,
        current_room_id: state.group_chat.current_room?.id,
        message_sender: message.sender?.keycloakId,
        is_reply: message.subtype === "reply",
      });

      // 🆕 TÌM ROOM - ƯU TIÊN current_room
      let room = state.group_chat.current_room;
      if (!room || room.id !== room_id) {
        room = state.group_chat.rooms.find((r) => r.id === room_id);
      }

      if (!room) {
        console.log("❌ No group room found for message");
        return;
      }

      // 🆕 ĐẢM BẢO room.messages TỒN TẠI
      if (!room.messages) {
        console.log("🔄 Initializing room.messages array");
        room.messages = [];
      }

      // 🆕 CẢI TIẾN: LOGIC THAY THẾ OPTIMISTIC MESSAGE
      if (replaceOptimistic || (isOptimistic === false && tempId)) {
        console.log("🔄 Looking for optimistic message to replace...", {
          tempId,
          replaceOptimistic,
          isOptimistic,
          message_id: message.id,
        });

        // 🆕 STRATEGY 1: Tìm bằng tempId (chính xác nhất)
        let optimisticIndex = -1;

        if (tempId) {
          optimisticIndex = room.messages.findIndex(
            (m) => m.tempId === tempId || m.id === tempId
          );
          console.log("🔍 Search by tempId result:", {
            tempId,
            optimisticIndex,
          });
        }

        // 🆕 STRATEGY 2: Tìm bằng sender + content + timestamp (fallback)
        if (optimisticIndex === -1) {
          optimisticIndex = room.messages.findIndex(
            (m) =>
              m.isOptimistic &&
              m.sender?.keycloakId === message.sender?.keycloakId &&
              m.content === message.content &&
              Math.abs(new Date(m.createdAt) - new Date(message.createdAt)) <
                30000 // 30 giây
          );
          console.log("🔍 Search by content fallback result:", {
            optimisticIndex,
          });
        }

        if (optimisticIndex !== -1) {
          console.log("✅ Replacing optimistic message with real message:", {
            optimistic_index: optimisticIndex,
            optimistic_id: room.messages[optimisticIndex].id,
            real_id: message.id,
            tempId_matched: tempId
              ? room.messages[optimisticIndex].tempId === tempId
              : "N/A",
          });

          // 🆕 GIỮ LẠI MỘT SỐ THÔNG TIN QUAN TRỌNG TỪ OPTIMISTIC MESSAGE
          const optimisticMessage = room.messages[optimisticIndex];

          room.messages[optimisticIndex] = {
            ...message,
            isOptimistic: false,
            // 🆕 QUAN TRỌNG: Giữ lại các thuộc tính hiển thị từ optimistic message
            time: optimisticMessage.time || message.time,
            createdAt: optimisticMessage.createdAt || message.createdAt,
          };

          // Cập nhật lastMessage
          room.lastMessage = {
            id: message.id,
            content: message.content,
            type: message.type,
            sender: message.sender,
            time: message.time,
          };

          room.msg = message.content;
          room.time = message.time;

          console.log("✅ Optimistic message replaced successfully");
          return;
        } else {
          console.log("⚠️ No optimistic message found to replace");
        }
      }

      // 🆕 CẢI TIẾN: DUPLICATE DETECTION
      const existsInRoom = room.messages.find((m) => {
        // Strategy 1: Check by MongoDB _id
        if (m._id && message._id && m._id === message._id) return true;

        // Strategy 2: Check by UUID (từ optimistic update)
        if (m.id === message.id) return true;

        // Strategy 3: Check by content + sender + timestamp
        if (
          m.content === message.content &&
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
          isOptimistic: existsInRoom.isOptimistic,
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
        // 🆕 THÊM REPLYTO SUPPORT
        replyTo: message.replyTo
          ? {
              id: message.replyTo.id,
              content: message.replyTo.content,
              sender:
                typeof message.replyTo.sender === "string"
                  ? { keycloakId: message.replyTo.sender, username: "Unknown" }
                  : message.replyTo.sender,
              type: message.replyTo.type || "text",
            }
          : undefined,
        createdAt:
          message.createdAt || message.time || new Date().toISOString(),
        time: formatMessageTime(message.createdAt || message.time),
        attachments: message.attachments || [],
        // 🆕 QUAN TRỌNG: GIỮ NGUYÊN incoming/outgoing
        incoming: message.incoming !== undefined ? message.incoming : false,
        outgoing: message.outgoing !== undefined ? message.outgoing : true,
        isOptimistic: message.isOptimistic || isOptimistic,
        // 🆕 THÊM: tempId để tracking
        tempId: message.tempId || tempId,
      };

      console.log("✅ Adding message to room:", {
        room_id: room.id,
        message_id: newMessage.id,
        tempId: newMessage.tempId,
        isOptimistic: newMessage.isOptimistic,
        incoming: newMessage.incoming,
        outgoing: newMessage.outgoing,
        total_messages_before: room.messages.length,
      });

      // 🆕 THÊM MESSAGE VÀO DANH SÁCH
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

    // 🆕 THÊM: updateDirectMessage để xử lý optimistic updates cho direct chat
    updateDirectMessage(state, action) {
      const { tempId, realMessage, conversation_id } = action.payload;

      console.log("🔄 updateDirectMessage:", {
        tempId,
        realMessageId: realMessage.id,
        conversation_id,
      });

      // Tìm và thay thế optimistic message trong current_messages
      const optimisticIndex = state.direct_chat.current_messages.findIndex(
        (m) => m.tempId === tempId || m.id === tempId
      );

      if (optimisticIndex !== -1) {
        console.log("✅ Replacing optimistic direct message:", {
          optimistic_index: optimisticIndex,
          tempId,
          real_id: realMessage.id,
        });

        state.direct_chat.current_messages[optimisticIndex] = {
          ...realMessage,
          isOptimistic: false,
        };
      }

      // Cập nhật trong conversation messages nếu có
      const conv =
        state.direct_chat.conversations.find((c) => c.id === conversation_id) ||
        state.direct_chat.current_conversation;

      if (conv && conv.messages) {
        const convOptimisticIndex = conv.messages.findIndex(
          (m) => m._id === tempId
        );

        if (convOptimisticIndex !== -1) {
          conv.messages[convOptimisticIndex] = {
            _id: realMessage.id,
            content: realMessage.content,
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
          };
        }
      }
    },

    // Các reducers khác giữ nguyên
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
    // Trong conversation slice
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
    // Reset conversation state
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
      });

      targetState.pinned_messages = messages;
    },

    // 🆕 THÊM: Reducer để cập nhật message pinned status trong current messages
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

    // 🆕 THÊM: Reducer để set refetch flag
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
  updateDirectMessage, // 🆕 THÊM
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

// 🆕 THÊM: Thunk để xóa tin nhắn
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

        console.log("✅ Pinned messages fetched:", res.data.data.length);
      } else {
        console.warn("⚠️ No pinned messages data in response");
      }
    } catch (error) {
      console.error("❌ fetchPinnedMessages error:", error);
    }
  };
