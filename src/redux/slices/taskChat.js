// src/redux/slices/taskChat.js - HOÀN CHỈNH REAL-TIME MESSAGING
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import taskMessageService from "../../services/taskMessageService";

// Async thunks
export const fetchTaskMessages = createAsyncThunk(
  "taskChat/fetchTaskMessages",
  async ({ taskId, keycloakId, page = 1, limit = 50 }, { rejectWithValue }) => {
    try {
      console.log("🎯 Fetching task messages for task:", taskId);
      const response = await taskMessageService.getTaskMessages(
        taskId,
        keycloakId,
        page,
        limit
      );
      return response;
    } catch (error) {
      console.error("❌ Error fetching task messages:", error);
      return rejectWithValue(
        error.response?.data?.message || "Không thể tải tin nhắn"
      );
    }
  }
);

export const sendTaskMessage = createAsyncThunk(
  "taskChat/sendTaskMessage",
  async ({ messageData, socket }, { rejectWithValue, dispatch, getState }) => {
    // Tạo tempId ở đầu function để có thể sử dụng trong cả try và catch
    const tempId = `temp-${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      console.log("📤 Sending task message:", messageData);

      // 🆕 LẤY CURRENT TASK TỪ STATE ĐỂ KIỂM TRA
      const state = getState();
      const currentTaskId = state.taskChat.current_task?._id;
      const isCurrentTask = currentTaskId === messageData.taskId;

      console.log("🔍 Current task check:", {
        currentTaskId,
        messageTaskId: messageData.taskId,
        isCurrentTask,
      });

      // 🆕 CHỈ TẠO OPTIMISTIC MESSAGE NẾU LÀ TASK HIỆN TẠI
      if (isCurrentTask) {
        // Tạo optimistic message
        const optimisticMessage = {
          _id: tempId,
          taskId: messageData.taskId,
          message: messageData.message,
          replyTo: messageData.replyTo,
          senderId: {
            keycloakId: messageData.keycloakId,
            firstName: "", // Sẽ được cập nhật từ response
            lastName: "",
          },
          createdAt: new Date().toISOString(),
          isOptimistic: true,
          isEdited: false,
          tempId: tempId, // 🆕 THÊM tempId để dễ dàng xác định
        };

        console.log("🚀 Adding optimistic message:", optimisticMessage);

        // Thêm optimistic message vào state ngay lập tức
        dispatch(
          addOptimisticMessage({
            message: optimisticMessage,
            taskId: messageData.taskId,
          })
        );
      } else {
        console.log("⏭️ Skipping optimistic update - not current task");
      }

      // Gửi request
      const response = await taskMessageService.sendMessage(messageData);

      console.log("✅ Message sent successfully:", response);

      // 🆕 FIX: KHÔNG emit socket event ở đây nữa - sẽ được xử lý trong socket handler
      // Trả về cả response và tempId để update
      return {
        response: response.data,
        tempId: isCurrentTask ? tempId : null,
        isCurrentTask,
      };
    } catch (error) {
      console.error("❌ Error sending task message:", error);

      // 🆕 CHỈ XÓA OPTIMISTIC MESSAGE NẾU CÓ TEMPID
      if (tempId) {
        dispatch(removeOptimisticMessage({ tempId }));
      }

      return rejectWithValue(
        error.response?.data?.message || "Không thể gửi tin nhắn"
      );
    }
  }
);

export const editTaskMessageThunk = createAsyncThunk(
  "taskChat/editTaskMessage",
  async (
    { messageId, keycloakId, newMessage, taskId, socket },
    { rejectWithValue }
  ) => {
    try {
      console.log("✏️ Editing message:", messageId);

      const response = await taskMessageService.editMessage(
        messageId,
        keycloakId,
        newMessage
      );

      // 🆕 FIX: KHÔNG emit socket event ở đây nữa
      return response.data;
    } catch (error) {
      console.error("❌ Error editing message:", error);
      return rejectWithValue(
        error.response?.data?.message || "Không thể chỉnh sửa tin nhắn"
      );
    }
  }
);

export const deleteTaskMessageThunk = createAsyncThunk(
  "taskChat/deleteTaskMessage",
  async ({ messageId, keycloakId, taskId, socket }, { rejectWithValue }) => {
    try {
      console.log("🗑️ Deleting message:", messageId);

      const response = await taskMessageService.deleteMessage(
        messageId,
        keycloakId
      );

      // 🆕 FIX: KHÔNG emit socket event ở đây nữa
      return { messageId, taskId };
    } catch (error) {
      console.error("❌ Error deleting message:", error);
      return rejectWithValue(
        error.response?.data?.message || "Không thể xóa tin nhắn"
      );
    }
  }
);

// Initial state
const initialState = {
  messages: [],
  current_task: null,
  isLoading: false,
  error: null,
  hasMore: true,
  currentPage: 1,
};

// Create slice
const taskChatSlice = createSlice({
  name: "taskChat",
  initialState,
  reducers: {
    // Set current task
    setCurrentTask: (state, action) => {
      state.current_task = action.payload;
      console.log("🎯 Current task set to:", action.payload?._id);
    },

    // Add message (cho socket real-time)
    addTaskMessage: (state, action) => {
      const { message, taskId, isOptimistic = false } = action.payload;

      console.log("🔄 Adding message to state:", {
        messageId: message._id,
        taskId,
        isOptimistic,
        currentTask: state.current_task?._id,
      });

      // 🆕 SỬA: Chỉ thêm nếu thuộc task hiện tại HOẶC chưa có current task
      if (state.current_task && state.current_task._id !== taskId) {
        console.log("❌ Skipping message - different task:", {
          currentTask: state.current_task?._id,
          messageTask: taskId,
        });
        return;
      }

      // Kiểm tra trùng lặp
      const existingMessage = state.messages.find(
        (msg) => msg._id === message._id
      );

      if (!existingMessage) {
        // 🆕 THÊM MESSAGE VÀO MẢNG (LUÔN PUSH)
        state.messages.push(message);

        // 🆕 SỬA: LUÔN SẮP XẾP THEO THỜI GIAN
        state.messages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        console.log(
          "✅ Message added to state. Total messages:",
          state.messages.length
        );
      } else {
        console.log("⚠️ Message already exists in state:", message._id);
      }
    },

    // 🆕 THÊM: Optimistic message handler riêng
    addOptimisticMessage: (state, action) => {
      const { message, taskId } = action.payload;

      console.log("🚀 Adding optimistic message:", {
        tempId: message.tempId,
        taskId,
        currentTask: state.current_task?._id,
      });

      // Chỉ thêm nếu thuộc task hiện tại
      if (state.current_task && state.current_task._id !== taskId) {
        console.log("❌ Skipping optimistic message - different task");
        return;
      }

      // Kiểm tra trùng lặp
      const existingMessage = state.messages.find(
        (msg) => msg.tempId === message.tempId
      );

      if (!existingMessage) {
        state.messages.push(message);

        // Sắp xếp lại messages
        state.messages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        console.log(
          "✅ Optimistic message added. Total messages:",
          state.messages.length
        );
      } else {
        console.log("⚠️ Optimistic message already exists:", message.tempId);
      }
    },

    // Update message (cho socket real-time)
    updateTaskMessage: (state, action) => {
      const { messageId, updatedMessage } = action.payload;

      console.log("✏️ Updating message via socket:", messageId);

      const messageIndex = state.messages.findIndex(
        (msg) => msg._id === messageId
      );

      if (messageIndex !== -1) {
        state.messages[messageIndex] = {
          ...state.messages[messageIndex],
          ...updatedMessage,
          isEdited: true,
        };
        console.log("✅ Message updated via socket successfully");
      } else {
        console.log("❌ Message not found for update:", messageId);
      }
    },

    // Replace optimistic message với real message
    replaceOptimisticMessage: (state, action) => {
      const { tempId, realMessage } = action.payload;

      console.log("🔄 Replacing optimistic message:", tempId);

      const messageIndex = state.messages.findIndex(
        (msg) => msg.tempId === tempId || msg._id === tempId
      );

      if (messageIndex !== -1) {
        state.messages[messageIndex] = {
          ...realMessage,
          isOptimistic: false,
          tempId: undefined, // 🆕 XÓA tempId sau khi thay thế
        };
        console.log("✅ Optimistic message replaced with real message");
      } else {
        console.log("❌ Optimistic message not found:", tempId);
        // 🆕 THÊM: Nếu không tìm thấy optimistic message, thêm message mới
        state.messages.push(realMessage);
        state.messages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
        console.log("📥 Added new message instead");
      }
    },

    // Remove optimistic message (khi có lỗi)
    removeOptimisticMessage: (state, action) => {
      const { tempId } = action.payload;
      console.log("🗑️ Removing optimistic message:", tempId);

      const initialLength = state.messages.length;
      state.messages = state.messages.filter(
        (msg) => !(msg.tempId === tempId || msg._id === tempId)
      );

      console.log(
        "✅ Optimistic message removed. Before:",
        initialLength,
        "After:",
        state.messages.length
      );
    },

    // Delete message (cho socket real-time)
    deleteTaskMessage: (state, action) => {
      const { messageId } = action.payload;
      console.log("🗑️ Deleting message via socket:", messageId);

      const initialLength = state.messages.length;
      state.messages = state.messages.filter((msg) => msg._id !== messageId);

      console.log(
        "✅ Message deleted via socket. Before:",
        initialLength,
        "After:",
        state.messages.length
      );
    },

    // 🆕 THÊM: Mark message as sent (khi nhận confirmation từ socket)
    markMessageAsSent: (state, action) => {
      const { tempId, realMessageId } = action.payload;

      console.log("✅ Marking message as sent:", { tempId, realMessageId });

      const messageIndex = state.messages.findIndex(
        (msg) => msg.tempId === tempId
      );

      if (messageIndex !== -1) {
        state.messages[messageIndex] = {
          ...state.messages[messageIndex],
          _id: realMessageId,
          isOptimistic: false,
          tempId: undefined,
        };
        console.log("✅ Message marked as sent successfully");
      }
    },

    // 🆕 THÊM: Handle socket message confirmation
    handleSocketMessageConfirmation: (state, action) => {
      const { tempId, realMessage } = action.payload;

      console.log("🔌 Socket confirmation received:", {
        tempId,
        realMessageId: realMessage._id,
      });

      const messageIndex = state.messages.findIndex(
        (msg) => msg.tempId === tempId
      );

      if (messageIndex !== -1) {
        // Thay thế optimistic message với real message từ socket
        state.messages[messageIndex] = {
          ...realMessage,
          isOptimistic: false,
          tempId: undefined,
        };
        console.log("✅ Socket message confirmation applied");
      } else {
        // Nếu không tìm thấy optimistic message, thêm message mới
        console.log(
          "⚠️ Optimistic message not found, adding new message from socket"
        );
        state.messages.push(realMessage);
        state.messages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );
      }
    },

    // Clear all messages
    clearMessages: (state) => {
      console.log("🧹 Clearing all messages");
      state.messages = [];
      state.current_task = null;
      state.isLoading = false;
      state.error = null;
      state.hasMore = true;
      state.currentPage = 1;
    },

    // Clear error
    clearError: (state) => {
      state.error = null;
    },

    // Reset state
    resetTaskChat: () => {
      console.log("🔄 Resetting task chat state");
      return initialState;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Task Messages
      .addCase(fetchTaskMessages.pending, (state) => {
        console.log("⏳ Fetching task messages...");
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTaskMessages.fulfilled, (state, action) => {
        console.log("✅ Task messages fetched successfully");
        state.isLoading = false;
        state.error = null;

        const { data, pagination } = action.payload;

        console.log("📨 Fetch result:", {
          messagesCount: data?.messages?.length,
          pagination,
        });

        if (pagination?.currentPage === 1) {
          // Replace all messages for first page
          state.messages = data?.messages || [];
          console.log("🔄 Replaced all messages for first page");
        } else {
          // Append messages for subsequent pages
          state.messages = [...state.messages, ...(data?.messages || [])];
          console.log(
            "📥 Appended messages for page:",
            pagination?.currentPage
          );
        }

        // 🆕 LUÔN SẮP XẾP SAU KHI FETCH
        state.messages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        state.currentPage = pagination?.currentPage || 1;
        state.hasMore = pagination?.hasNextPage || false;

        console.log("📊 Final state after fetch:", {
          messagesCount: state.messages.length,
          currentPage: state.currentPage,
          hasMore: state.hasMore,
        });
      })
      .addCase(fetchTaskMessages.rejected, (state, action) => {
        console.error("❌ Fetch task messages failed:", action.payload);
        state.isLoading = false;
        state.error = action.payload;
      })

      // Send Task Message
      .addCase(sendTaskMessage.pending, (state) => {
        console.log("⏳ Sending message...");
        state.error = null;
        // 🆕 NOTE: Optimistic message đã được thêm trong thunk
      })
      .addCase(sendTaskMessage.fulfilled, (state, action) => {
        console.log("✅ Send message fulfilled:", {
          tempId: action.payload.tempId,
          isCurrentTask: action.payload.isCurrentTask,
        });

        state.error = null;
        const { response, tempId, isCurrentTask } = action.payload;

        // 🆕 SỬA: XỬ LÝ CẢ HAI TRƯỜNG HỢP
        if (tempId && isCurrentTask) {
          // TH1: Có optimistic update - thay thế message
          const messageIndex = state.messages.findIndex(
            (msg) => msg.tempId === tempId || msg._id === tempId
          );

          if (messageIndex !== -1) {
            console.log("🔄 Replacing optimistic message with real message");
            state.messages[messageIndex] = {
              ...response,
              isOptimistic: false,
              tempId: undefined, // 🆕 XÓA tempId
            };
          } else {
            console.log("⚠️ Optimistic message not found, adding new message");
            state.messages.push(response);
          }
        } else {
          // TH2: Không có optimistic update - thêm message mới
          console.log("📥 Adding new message (no optimistic update)");
          state.messages.push(response);
        }

        // 🆕 LUÔN SẮP XẾP LẠI SAU KHI THÊM/THAY THẾ
        state.messages.sort(
          (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
        );

        console.log(
          "📊 Final messages count after send:",
          state.messages.length
        );
      })
      .addCase(sendTaskMessage.rejected, (state, action) => {
        console.error("❌ Send message failed:", action.payload);
        state.error = action.payload;
        // 🆕 NOTE: Optimistic message đã được xóa trong thunk
      })

      // Edit Task Message
      .addCase(editTaskMessageThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(editTaskMessageThunk.fulfilled, (state, action) => {
        state.error = null;
        const updatedMessage = action.payload;

        const messageIndex = state.messages.findIndex(
          (msg) => msg._id === updatedMessage._id
        );
        if (messageIndex !== -1) {
          state.messages[messageIndex] = {
            ...state.messages[messageIndex],
            ...updatedMessage,
            isEdited: true,
          };
          console.log("✅ Message edited successfully");
        } else {
          console.log("❌ Message not found for edit:", updatedMessage._id);
          // 🆕 THÊM: Nếu không tìm thấy, thêm message mới
          state.messages.push(updatedMessage);
          state.messages.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );
          console.log("📥 Added edited message as new message");
        }
      })
      .addCase(editTaskMessageThunk.rejected, (state, action) => {
        state.error = action.payload;
      })

      // Delete Task Message
      .addCase(deleteTaskMessageThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(deleteTaskMessageThunk.fulfilled, (state, action) => {
        state.error = null;
        const { messageId } = action.payload;

        const initialLength = state.messages.length;
        state.messages = state.messages.filter((msg) => msg._id !== messageId);

        console.log(
          "✅ Message deleted via thunk. Before:",
          initialLength,
          "After:",
          state.messages.length
        );
      })
      .addCase(deleteTaskMessageThunk.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

// Export actions
export const {
  setCurrentTask,
  addTaskMessage,
  addOptimisticMessage,
  updateTaskMessage,
  replaceOptimisticMessage,
  removeOptimisticMessage,
  deleteTaskMessage,
  markMessageAsSent,
  handleSocketMessageConfirmation,
  clearMessages,
  clearError,
  resetTaskChat,
} = taskChatSlice.actions;

// Export selector
export const selectTaskChat = (state) => state.taskChat;

// Export reducer
export default taskChatSlice.reducer;
