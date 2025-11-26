// store/slices/chatboxSlice.js
import { createSlice } from "@reduxjs/toolkit";

const chatboxSlice = createSlice({
  name: "chatbox",
  initialState: {
    messages: [],
    isLoading: false,
    isOpen: false,
    isMinimized: true,
    chatSessions: {}, // { userId: { messages: [], lastActive: timestamp } }
  },
  reducers: {
    // State cho chatbox
    setChatboxOpen: (state, action) => {
      state.isOpen = action.payload;
    },

    setChatboxMinimized: (state, action) => {
      state.isMinimized = action.payload;
    },

    setChatboxLoading: (state, action) => {
      state.isLoading = action.payload;
    },

    // Quản lý messages
    addChatboxMessage: (state, action) => {
      const { message, userId } = action.payload;

      // Thêm vào messages hiện tại
      state.messages.push(message);

      // Lưu vào lịch sử theo user
      if (userId) {
        if (!state.chatSessions[userId]) {
          state.chatSessions[userId] = {
            messages: [],
            lastActive: Date.now(),
          };
        }
        state.chatSessions[userId].messages.push(message);
        state.chatSessions[userId].lastActive = Date.now();

        // Giới hạn số lượng tin nhắn trong session (tránh storage quá lớn)
        if (state.chatSessions[userId].messages.length > 100) {
          state.chatSessions[userId].messages =
            state.chatSessions[userId].messages.slice(-50);
        }
      }
    },

    setChatboxMessages: (state, action) => {
      const { messages, userId } = action.payload;
      state.messages = messages;

      // Đồng bộ với chat sessions
      if (userId && state.chatSessions[userId]) {
        state.chatSessions[userId].messages = messages;
        state.chatSessions[userId].lastActive = Date.now();
      }
    },

    clearChatboxMessages: (state, action) => {
      const { userId } = action.payload;
      state.messages = [];

      if (userId && state.chatSessions[userId]) {
        state.chatSessions[userId].messages = [];
      }
    },

    // Khôi phục chat session từ lịch sử
    restoreChatboxSession: (state, action) => {
      const { userId } = action.payload;

      if (userId && state.chatSessions[userId]) {
        state.messages = [...state.chatSessions[userId].messages];
        state.isOpen = true;
        state.isMinimized = false;
      }
    },

    // Xóa session cũ
    cleanupOldSessions: (state, action) => {
      const { maxAge = 7 * 24 * 60 * 60 * 1000 } = action.payload; // Mặc định 7 ngày
      const now = Date.now();

      Object.keys(state.chatSessions).forEach((userId) => {
        const session = state.chatSessions[userId];
        if (now - session.lastActive > maxAge) {
          delete state.chatSessions[userId];
        }
      });
    },
  },
});

export const {
  setChatboxOpen,
  setChatboxMinimized,
  setChatboxLoading,
  addChatboxMessage,
  setChatboxMessages,
  clearChatboxMessages,
  restoreChatboxSession,
  cleanupOldSessions,
} = chatboxSlice.actions;

export default chatboxSlice.reducer;
