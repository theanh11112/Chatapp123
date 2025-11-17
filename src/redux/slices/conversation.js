import { createSlice } from "@reduxjs/toolkit";
import { faker } from "@faker-js/faker";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../../config";
import { timeAgo } from "../../utils/timeAgo";

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
  group_chat: {},
};

const slice = createSlice({
  name: "conversation",
  initialState,
  reducers: {
    // ---------------- Loading & Error ----------------
    fetchDirectConversationsStart(state) {
      state.direct_chat.isLoading = true;
      state.direct_chat.error = null;
    },

    fetchDirectConversationsSuccess(state, action) {
      const { conversations, currentUserId } = action.payload;

      console.log("🔄 Processing conversations in Redux:", {
        incoming_conversations_count: conversations.length,
        current_conversation_before: state.direct_chat.current_conversation,
        current_conversation_id: state.direct_chat.current_conversation?.id,
      });

      // Lưu current_conversation hiện tại trước khi update
      const previousCurrentConversation =
        state.direct_chat.current_conversation;

      state.direct_chat.conversations = conversations.map((conv) => {
        const user = conv.participants?.find(
          (p) => p.keycloakId !== currentUserId
        );
        const lastMsg = conv.messages?.slice(-1)[0];
        const lastSeenTs = parseTimestamp(user?.lastSeen);

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
          msg: lastMsg?.content || lastMsg?.text || "",
          time: formatMessageTime(lastMsg?.createdAt),
          unread: 0,
          pinned: false,
          about: user?.about || "",
          messages: conv.messages || [],
          lastSeen: lastSeenTs ? timeAgo(lastSeenTs) : "",
        };
      });

      // ⚡ QUAN TRỌNG: Giữ current_conversation hiện tại nếu nó vẫn tồn tại
      if (previousCurrentConversation?.id) {
        const currentConvInNewList = state.direct_chat.conversations.find(
          (c) => c.id === previousCurrentConversation.id
        );

        if (currentConvInNewList) {
          console.log(
            "✅ Preserving current_conversation:",
            currentConvInNewList
          );
          state.direct_chat.current_conversation = currentConvInNewList;
        } else {
          console.log(
            "❌ Current conversation not found in new list, using first one"
          );
          state.direct_chat.current_conversation = state.direct_chat
            .conversations[0] || { id: null, messages: [] };
        }
      } else {
        // Nếu chưa có current_conversation, set conversation đầu tiên
        console.log("🔄 Setting first conversation as current");
        state.direct_chat.current_conversation = state.direct_chat
          .conversations[0] || { id: null, messages: [] };
      }

      console.log("📊 After processing:", {
        current_conversation_after: state.direct_chat.current_conversation,
        conversations_count: state.direct_chat.conversations.length,
      });

      state.direct_chat.isLoading = false;
    },

    fetchDirectConversationsFail(state, action) {
      state.direct_chat.isLoading = false;
      state.direct_chat.error = action.payload.error;
    },

    // ---------------- Conversation Updates ----------------
    addOrUpdateConversation(state, action) {
      const { conversation, currentUserId } = action.payload;

      console.log("🔄 addOrUpdateConversation:", {
        conversation_id: conversation._id,
        currentUserId,
      });

      const existingConvIndex = state.direct_chat.conversations.findIndex(
        (c) => c.id === conversation._id
      );

      let user = null;
      if (conversation.participants) {
        user = conversation.participants.find(
          (p) => p.keycloakId !== currentUserId
        );
      }

      const lastMsg = conversation.messages?.slice(-1)[0];
      const lastSeenTs = parseTimestamp(user?.lastSeen);

      const convData = {
        id: conversation._id,
        user_id: user?.keycloakId || conversation.user_id || null,
        name: user
          ? `${user.username} ${user.lastName || ""}`.trim()
          : "Unknown",
        online: user?.status === "Online" || false,
        img: user?.avatar
          ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
          : faker.image.avatar(),
        msg: lastMsg?.content || lastMsg?.text || "",
        time: formatMessageTime(lastMsg?.createdAt),
        unread: 0,
        pinned: false,
        about: user?.about || "",
        messages: conversation.messages || [],
        lastSeen: lastSeenTs ? timeAgo(lastSeenTs) : "",
      };

      console.log("📝 Processed conversation data:", convData);

      if (existingConvIndex !== -1) {
        state.direct_chat.conversations[existingConvIndex] = convData;
        console.log("✅ Updated existing conversation");
      } else {
        state.direct_chat.conversations.push(convData);
        console.log("✅ Added new conversation");
      }

      // ⚡ Cập nhật current_conversation nếu đây là conversation hiện tại
      if (state.direct_chat.current_conversation?.id === conversation._id) {
        console.log("🔄 Updating current_conversation with new data");
        state.direct_chat.current_conversation = convData;
      }

      // ⚡ Nếu chưa có current_conversation, set mặc định
      if (!state.direct_chat.current_conversation?.id) {
        console.log("🔄 Setting first conversation as current");
        state.direct_chat.current_conversation = convData;
      }
    },

    setCurrentConversation(state, action) {
      console.log("🔄 setCurrentConversation:", action.payload);
      state.direct_chat.current_conversation = action.payload;
    },

    fetchCurrentMessages(state, action) {
      const { messages, currentUserId } = action.payload;
      console.log("📥 fetchCurrentMessages:", {
        messages_count: messages?.length,
        currentUserId,
      });

      state.direct_chat.current_messages = messages.map((m) => ({
        id: m._id,
        type: "msg",
        subtype: m.type || "text",
        message: m.content || "",
        incoming: m.to?.toString() === currentUserId,
        outgoing: m.from?.toString() === currentUserId,
        time: formatMessageTime(m.createdAt),
        attachments: m.attachments || [],
      }));
    },

    addDirectMessage(state, action) {
      const { message, conversation_id, currentUserId } = action.payload;
      if (!message) return;

      console.log("📨 addDirectMessage:", {
        message_id: message.id,
        conversation_id,
        current_conversation_id: state.direct_chat.current_conversation?.id,
        currentUserId,
      });

      const conv =
        state.direct_chat.conversations.find((c) => c.id === conversation_id) ||
        state.direct_chat.current_conversation;

      if (!conv) {
        console.log("❌ No conversation found for message");
        return;
      }

      // ⚡ Check duplicate by id
      const existsInCurrent = state.direct_chat.current_messages.find(
        (m) => m.id === message.id
      );
      const existsInConv = conv.messages.find((m) => m._id === message.id);

      if (existsInCurrent || existsInConv) {
        console.log("⚠️ Message already exists, skipping");
        return;
      }

      state.direct_chat.current_messages.push(message);

      if (!conv.messages) conv.messages = [];

      console.log("🔄 Adding message to conversation:", {
        message_id: message.id,
        incoming: message.incoming,
        outgoing: message.outgoing,
        currentUserId,
        conv_user_id: conv.user_id,
      });

      // 🔥 SỬA QUAN TRỌNG: Tạo message object đầy đủ với tất cả các trường cần thiết
      const newMessageObj = {
        _id: message.id, // ← DÙNG message.id từ socket (đã được xử lý trong DashboardLayout)
        content: message.message,
        type: message.subtype || "text",
        from: message.outgoing ? currentUserId : conv.user_id,
        to: message.outgoing ? conv.user_id : currentUserId, // ← ĐẢM BẢO CÓ TRƯỜNG 'to'
        createdAt: message.time || new Date().toISOString(),
        attachments: message.attachments || [],
        seen: false, // ← THÊM TRƯỜNG seen
      };

      conv.messages.push(newMessageObj);

      conv.msg = message.message;
      conv.time = message.time;

      console.log("✅ Message added successfully");
    },

    updateUserPresence(state, action) {
      const { userId, status, lastSeen } = action.payload;
      const lastSeenTs = parseTimestamp(lastSeen);

      console.log("👤 updateUserPresence:", { userId, status, lastSeen });

      state.direct_chat.conversations = state.direct_chat.conversations.map(
        (c) =>
          c.user_id === userId
            ? {
                ...c,
                online: status === "Online",
                lastSeen: lastSeenTs ? timeAgo(lastSeenTs) : c.lastSeen,
              }
            : c
      );

      if (state.direct_chat.current_conversation?.user_id === userId) {
        state.direct_chat.current_conversation.online = status === "Online";
        state.direct_chat.current_conversation.lastSeen = lastSeenTs
          ? timeAgo(lastSeenTs)
          : state.direct_chat.current_conversation.lastSeen;

        console.log("✅ Updated current_conversation presence");
      }
    },

    resetConversationState(state) {
      console.log("🔄 Resetting conversation state");
      state.direct_chat = {
        conversations: [],
        current_conversation: { id: null, messages: [] },
        current_messages: [],
        isLoading: false,
        error: null,
      };
      state.group_chat = {};
    },
  },
});

export default slice.reducer;

export const {
  fetchDirectConversationsStart,
  fetchDirectConversationsSuccess,
  fetchDirectConversationsFail,
  addOrUpdateConversation,
  setCurrentConversation,
  fetchCurrentMessages,
  addDirectMessage,
  updateUserPresence,
  resetConversationState,
} = slice.actions;

// ---------------- Thunks ----------------
export const fetchDirectConversations =
  ({ conversations, currentUserId }) =>
  async (dispatch) => {
    console.log("🔄 fetchDirectConversations thunk called", {
      conversations_count: conversations.length,
      currentUserId,
    });

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

export const addDirectConversation =
  ({ conversation, currentUserId }) =>
  async (dispatch) => {
    console.log("🔄 addDirectConversation thunk called");
    dispatch(addOrUpdateConversation({ conversation, currentUserId }));
  };

export const updateDirectConversation =
  ({ conversation, currentUserId }) =>
  async (dispatch) => {
    console.log("🔄 updateDirectConversation thunk called");
    dispatch(addOrUpdateConversation({ conversation, currentUserId }));
  };

export const setCurrentDirectConversation =
  (current_conversation) => async (dispatch) => {
    console.log("🔄 setCurrentDirectConversation thunk called");
    dispatch(setCurrentConversation(current_conversation));
  };

export const fetchCurrentDirectMessages =
  ({ messages, currentUserId }) =>
  async (dispatch) => {
    console.log("🔄 fetchCurrentDirectMessages thunk called");
    dispatch(fetchCurrentMessages({ messages, currentUserId }));
  };

export const addDirectMessageThunk =
  (message, conversation_id) => async (dispatch) => {
    console.log("🔄 addDirectMessageThunk called");
    dispatch(addDirectMessage({ message, conversation_id }));
  };
