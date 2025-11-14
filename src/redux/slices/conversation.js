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
      const list = conversations.map((el) => {
        const user = el.participants.find((p) => p?._id?.toString() !== currentUserId);
        return {
          id: el._id,
          user_id: user?._id || null,
          name: `${user?.firstName || ""} ${user?.lastName || ""}`,
          online: user?.status === "Online",
          img: user?.avatar
            ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${user.avatar}`
            : faker.image.avatar(),
          msg: el.messages?.length ? el.messages.slice(-1)[0].text : "",
          time: "9:36",
          unread: 0,
          pinned: false,
          about: user?.about || "",
        };
      });

      state.direct_chat.conversations = list;
      state.direct_chat.isLoading = false;
    },
    fetchDirectConversationsFail(state, action) {
      state.direct_chat.isLoading = false;
      state.direct_chat.error = action.payload.error;
    },

    updateDirectConversation(state, action) {
      const { conversation, currentUserId } = action.payload;
      state.direct_chat.conversations = state.direct_chat.conversations.map((el) => {
        if (el?.id !== conversation._id) return el;
        const user = conversation.participants.find((p) => p?._id?.toString() !== currentUserId);
        return {
          id: conversation._id,
          user_id: user?._id || null,
          name: `${user?.firstName || ""} ${user?.lastName || ""}`,
          online: user?.status === "Online",
          img: faker.image.avatar(),
          msg: faker.music.songName(),
          time: "9:36",
          unread: 0,
          pinned: false,
        };
      });
    },

    addDirectConversation(state, action) {
      const { conversation, currentUserId } = action.payload;
      const user = conversation.participants.find((p) => p?._id?.toString() !== currentUserId);
      state.direct_chat.conversations = state.direct_chat.conversations.filter(
        (el) => el?.id !== conversation._id
      );
      state.direct_chat.conversations.push({
        id: conversation._id,
        user_id: user?._id || null,
        name: `${user?.firstName || ""} ${user?.lastName || ""}`,
        online: user?.status === "Online",
        img: faker.image.avatar(),
        msg: faker.music.songName(),
        time: "9:36",
        unread: 0,
        pinned: false,
      });
    },

    setCurrentConversation(state, action) {
      state.direct_chat.current_conversation = action.payload;
    },

    fetchCurrentMessages(state, action) {
      const { messages, currentUserId } = action.payload;
      const formatted = messages.map((m) => ({
        id: m._id,
        type: "msg",
        subtype: m.type,
        message: m.text,
        incoming: m.to === currentUserId,
        outgoing: m.from === currentUserId,
      }));
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
export const FetchDirectConversations = ({ conversations, currentUserId }) => async (dispatch) => {
  try {
    dispatch(slice.actions.fetchDirectConversationsStart());
    dispatch(slice.actions.fetchDirectConversationsSuccess({ conversations, currentUserId }));
  } catch (error) {
    dispatch(slice.actions.fetchDirectConversationsFail({ error }));
  }
};

export const AddDirectConversation = ({ conversation, currentUserId }) => async (dispatch) => {
  dispatch(slice.actions.addDirectConversation({ conversation, currentUserId }));
};

export const UpdateDirectConversation = ({ conversation, currentUserId }) => async (dispatch) => {
  dispatch(slice.actions.updateDirectConversation({ conversation, currentUserId }));
};

export const SetCurrentConversation = (current_conversation) => async (dispatch) => {
  dispatch(slice.actions.setCurrentConversation(current_conversation));
};

export const FetchCurrentMessages = ({ messages, currentUserId }) => async (dispatch) => {
  dispatch(slice.actions.fetchCurrentMessages({ messages, currentUserId }));
};

export const AddDirectMessage = (message) => async (dispatch) => {
  dispatch(slice.actions.addDirectMessage({ message }));
};
