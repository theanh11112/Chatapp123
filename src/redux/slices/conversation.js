// conversationSlice.js
import { createSlice } from "@reduxjs/toolkit";
import { faker } from "@faker-js/faker";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../../config";

const initialState = {
  direct_chat: {
    conversations: [],
    current_conversation: null,
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
    fetchDirectConversationsStart(state) {
      state.direct_chat.isLoading = true;
      state.direct_chat.error = null;
    },

    fetchDirectConversationsSuccess(state, action) {
      const { conversations, currentUserId } = action.payload;

      state.direct_chat.conversations = conversations.map((el) => {
        const user = el.participants.find(
          (p) => p?.keycloakId?.toString() !== currentUserId
        );
        const lastMessageObj = el.messages?.length
          ? el.messages.slice(-1)[0]
          : null;

        let time = "";
        if (lastMessageObj?.createdAt) {
          let timestamp;
          if (
            typeof lastMessageObj.createdAt === "object" &&
            lastMessageObj.createdAt.$date?.$numberLong
          ) {
            timestamp = parseInt(
              lastMessageObj.createdAt.$date.$numberLong,
              10
            );
          } else {
            timestamp = new Date(lastMessageObj.createdAt).getTime();
          }
          time = new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
        }

        return {
          id: el._id,
          user_id: user?._id || null,
          name: `${user?.username || ""} ${user?.lastName || ""}`,
          online: user?.status === "Online",
          img: user?.avatar
            ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
            : faker.image.avatar(),
          msg: lastMessageObj?.content || "",
          time,
          unread: 0,
          pinned: false,
          about: user?.about || "",
          messages: el.messages || [], // <-- thêm messages vào đây
        };
      });

      state.direct_chat.isLoading = false;
    },

    fetchDirectConversationsFail(state, action) {
      state.direct_chat.isLoading = false;
      state.direct_chat.error = action.payload.error;
    },

    updateDirectConversation(state, action) {
      const { conversation, currentUserId } = action.payload;

      state.direct_chat.conversations = state.direct_chat.conversations.map(
        (el) => {
          if (el?.id !== conversation._id) return el;

          const user = conversation.participants.find(
            (p) => p?.keycloakId?.toString() !== currentUserId
          );
          const lastMessageObj = conversation.messages?.length
            ? conversation.messages.slice(-1)[0]
            : null;

          let time = "";
          if (lastMessageObj?.createdAt) {
            let timestamp;
            if (
              typeof lastMessageObj.createdAt === "object" &&
              lastMessageObj.createdAt.$date?.$numberLong
            ) {
              timestamp = parseInt(
                lastMessageObj.createdAt.$date.$numberLong,
                10
              );
            } else {
              timestamp = new Date(lastMessageObj.createdAt).getTime();
            }
            time = new Date(timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            });
          }

          return {
            id: conversation._id,
            user_id: user?._id || null,
            name: `${user?.username || ""} ${user?.lastName || ""}`,
            online: user?.status === "Online",
            img: user?.avatar
              ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
              : faker.image.avatar(),
            msg: lastMessageObj?.content || "",
            time,
            unread: 0,
            pinned: false,
            about: user?.about || "",
            messages: conversation.messages || [], // <-- thêm messages
          };
        }
      );
    },

    addDirectConversation(state, action) {
      const { conversation, currentUserId } = action.payload;

      const user = conversation.participants.find(
        (p) => p?.keycloakId?.toString() !== currentUserId
      );
      const lastMessageObj = conversation.messages?.length
        ? conversation.messages.slice(-1)[0]
        : null;

      let time = "";
      if (lastMessageObj?.createdAt) {
        let timestamp;
        if (
          typeof lastMessageObj.createdAt === "object" &&
          lastMessageObj.createdAt.$date?.$numberLong
        ) {
          timestamp = parseInt(lastMessageObj.createdAt.$date.$numberLong, 10);
        } else {
          timestamp = new Date(lastMessageObj.createdAt).getTime();
        }
        time = new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      }

      state.direct_chat.conversations = state.direct_chat.conversations.filter(
        (el) => el?.id !== conversation._id
      );

      state.direct_chat.conversations.push({
        id: conversation._id,
        user_id: user?._id || null,
        name: `${user?.username || ""} ${user?.lastName || ""}`,
        online: user?.status === "Online",
        img: user?.avatar
          ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
          : faker.image.avatar(),
        msg: lastMessageObj?.content || "",
        time,
        unread: 0,
        pinned: false,
        about: user?.about || "",
        messages: conversation.messages || [], // <-- thêm messages
      });
    },

    setCurrentConversation(state, action) {
      state.direct_chat.current_conversation = action.payload;
    },

    fetchCurrentMessages(state, action) {
      const { messages, currentUserId } = action.payload;

      const formatted = messages.map((m) => {
        // Xử lý timestamp
        let timestamp = 0;
        if (m.createdAt) {
          if (
            typeof m.createdAt === "object" &&
            m.createdAt.$date?.$numberLong
          ) {
            timestamp = parseInt(m.createdAt.$date.$numberLong, 10);
          } else {
            timestamp = new Date(m.createdAt).getTime();
          }
        }

        const time = new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        const fromId = m.from?.toString();
        const toId = m.to?.toString();

        return {
          id: m._id,
          type: "msg",
          subtype: m.type || "text",
          message: m.content || "",
          incoming: toId === currentUserId, // Tin nhắn tới mình
          outgoing: fromId === currentUserId, // Tin nhắn của mình
          time, // Giờ gửi
          attachments: m.attachments || [], // giữ nguyên attachments nếu có
        };
      });

      state.direct_chat.current_messages = formatted;
    },
    addDirectMessage(state, action) {
      if (action.payload?.message) {
        state.direct_chat.current_messages.push(action.payload.message);
      }
    },
  },
});

export default slice.reducer;

// ---------------- Action Creators ----------------
export const FetchDirectConversations =
  ({ conversations, currentUserId }) =>
  async (dispatch) => {
    try {
      dispatch(slice.actions.fetchDirectConversationsStart());
      dispatch(
        slice.actions.fetchDirectConversationsSuccess({
          conversations,
          currentUserId,
        })
      );
    } catch (error) {
      dispatch(slice.actions.fetchDirectConversationsFail({ error }));
    }
  };

export const AddDirectConversation =
  ({ conversation, currentUserId }) =>
  async (dispatch) => {
    dispatch(
      slice.actions.addDirectConversation({ conversation, currentUserId })
    );
  };

export const UpdateDirectConversation =
  ({ conversation, currentUserId }) =>
  async (dispatch) => {
    dispatch(
      slice.actions.updateDirectConversation({ conversation, currentUserId })
    );
  };

export const SetCurrentConversation =
  (current_conversation) => async (dispatch) => {
    console.log("222", current_conversation);
    dispatch(slice.actions.setCurrentConversation(current_conversation));
  };

export const FetchCurrentMessages =
  ({ messages, currentUserId }) =>
  async (dispatch) => {
    dispatch(slice.actions.fetchCurrentMessages({ messages, currentUserId }));
  };

export const AddDirectMessage = (message) => async (dispatch) => {
  dispatch(slice.actions.addDirectMessage({ message }));
};
