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
    current_conversation: { id: null, messages: [] }, // ⚡ Khởi tạo mặc định
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

      state.direct_chat.conversations = conversations.map((conv) => {
        const user = conv.participants?.find(
          (p) => p.keycloakId !== currentUserId
        );
        const lastMsg = conv.messages?.slice(-1)[0];
        const lastSeenTs = parseTimestamp(user?.lastSeen);

        return {
          id: conv._id,
          user_id: user?.keycloakId || null,
          name: `${user?.username || ""} ${user?.lastName || ""}`,
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

      // ⚡ Init current_conversation nếu có conversation
      state.direct_chat.current_conversation = state.direct_chat
        .conversations[0] || { id: null, messages: [] };

      state.direct_chat.isLoading = false;
    },
    fetchDirectConversationsFail(state, action) {
      state.direct_chat.isLoading = false;
      state.direct_chat.error = action.payload.error;
    },

    // ---------------- Conversation Updates ----------------
    addOrUpdateConversation(state, action) {
      const { conversation, currentUserId } = action.payload;

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
        name: user ? `${user.username} ${user.lastName || ""}` : "Unknown",
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

      if (existingConvIndex !== -1) {
        state.direct_chat.conversations[existingConvIndex] = convData;
      } else {
        state.direct_chat.conversations.push(convData);
      }

      // ⚡ Nếu chưa có current_conversation, set mặc định
      if (!state.direct_chat.current_conversation?.id) {
        state.direct_chat.current_conversation = convData;
      }
    },

    setCurrentConversation(state, action) {
      state.direct_chat.current_conversation = action.payload;
    },

    fetchCurrentMessages(state, action) {
      const { messages, currentUserId } = action.payload;
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
      const { message, conversation_id } = action.payload;
      if (!message) return;

      const conv =
        state.direct_chat.conversations.find((c) => c.id === conversation_id) ||
        state.direct_chat.current_conversation;
      if (!conv) return;

      // ⚡ Check duplicate by id
      const existsInCurrent = state.direct_chat.current_messages.find(
        (m) => m.id === message.id
      );
      const existsInConv = conv.messages.find((m) => m._id === message.id);
      if (existsInCurrent || existsInConv) return;

      state.direct_chat.current_messages.push(message);

      if (!conv.messages) conv.messages = [];
      conv.messages.push({
        _id: message.id,
        content: message.message,
        type: message.subtype,
        from: message.outgoing ? message.from : message.to,
        to: message.incoming ? message.to : message.from,
        createdAt: message.time || new Date().toISOString(),
        attachments: message.attachments || [],
      });

      conv.msg = message.message;
      conv.time = message.time;
    },

    updateUserPresence(state, action) {
      const { userId, status, lastSeen } = action.payload;
      const lastSeenTs = parseTimestamp(lastSeen);

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
      }
    },

    resetConversationState(state) {
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
    dispatch(fetchDirectConversationsStart());
    try {
      dispatch(
        fetchDirectConversationsSuccess({ conversations, currentUserId })
      );
    } catch (error) {
      dispatch(fetchDirectConversationsFail({ error }));
    }
  };

export const addDirectConversation =
  ({ conversation, currentUserId }) =>
  async (dispatch) => {
    dispatch(addOrUpdateConversation({ conversation, currentUserId }));
  };

export const updateDirectConversation =
  ({ conversation, currentUserId }) =>
  async (dispatch) => {
    dispatch(addOrUpdateConversation({ conversation, currentUserId }));
  };

export const setCurrentDirectConversation =
  (current_conversation) => async (dispatch) => {
    dispatch(setCurrentConversation(current_conversation));
  };

export const fetchCurrentDirectMessages =
  ({ messages, currentUserId }) =>
  async (dispatch) => {
    dispatch(fetchCurrentMessages({ messages, currentUserId }));
  };

export const addDirectMessageThunk =
  (message, conversation_id) => async (dispatch) => {
    dispatch(addDirectMessage({ message, conversation_id }));
  };
