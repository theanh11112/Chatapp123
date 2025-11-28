// src/redux/slices/app.js
import { createSlice } from "@reduxjs/toolkit";
import api from "../../utils/axios";
import { v4 } from "uuid";
// SỬA: Import named exports thay vì default import
import { uploadToS3, getS3Url } from "../../utils/s3";
import { S3_BUCKET_NAME } from "../../config";

// ----------------------------------------------------------------------

const initialState = {
  user: {},
  sideBar: {
    open: false,
    type: "CONTACT",
  },
  isLoggedIn: true,
  tab: 0,
  snackbar: {
    open: null,
    severity: null,
    message: null,
  },
  users: [],
  all_users: [],
  friends: [],
  friendRequests: [],
  chat_type: null, // "individual" | "group"
  room_id: null,
  call_logs: [],
  messages: [],
  current_chat_info: {}, // 🆕 Thông tin chat hiện tại
};

// ----------------------------------------------------------------------

const slice = createSlice({
  name: "app",
  initialState,
  reducers: {
    fetchCallLogs(state, action) {
      state.call_logs = action.payload.call_logs;
    },
    addNewCallLog: (state, action) => {
      state.call_logs.unshift(action.payload.call);
    },
    updateCallLogStatus: (state, action) => {
      const { callId, status, endedAt } = action.payload;
      const callIndex = state.call_logs.findIndex(
        (call) => call._id === callId
      );
      if (callIndex !== -1) {
        state.call_logs[callIndex].status = status;
        state.call_logs[callIndex].endedAt = endedAt;
      }
    },
    fetchUser(state, action) {
      state.user = action.payload.user;
    },
    updateUser(state, action) {
      state.user = action.payload.user;
    },
    toggleSideBar(state) {
      state.sideBar.open = !state.sideBar.open;
    },
    updateSideBarType(state, action) {
      state.sideBar.type = action.payload.type;
    },
    updateTab(state, action) {
      state.tab = action.payload.tab;
    },
    openSnackBar(state, action) {
      state.snackbar.open = true;
      state.snackbar.severity = action.payload.severity;
      state.snackbar.message = action.payload.message;
    },
    closeSnackBar(state) {
      state.snackbar.open = false;
      state.snackbar.message = null;
    },

    updateUsers(state, action) {
      state.users = action.payload.users;
    },
    updateAllUsers(state, action) {
      state.all_users = action.payload.users;
    },
    updateFriends(state, action) {
      state.friends = action.payload.friends;
    },
    updateFriendRequests(state, action) {
      state.friendRequests = action.payload.requests;
    },

    // 🆕 Cập nhật để hỗ trợ cả direct và group chat
    selectConversation(state, action) {
      const {
        room_id,
        chat_type = "individual",
        chat_info = {},
      } = action.payload;
      state.chat_type = chat_type;
      state.room_id = room_id;
      state.current_chat_info = chat_info;
      console.log("🔄 Selected conversation:", {
        room_id,
        chat_type,
        chat_info,
      });
    },

    // 🆕 Cập nhật thông tin chat hiện tại
    updateCurrentChatInfo(state, action) {
      state.current_chat_info = {
        ...state.current_chat_info,
        ...action.payload,
      };
    },

    setMessages(state, action) {
      state.messages = action.payload.messages;
    },

    resetAppState(state) {
      return initialState;
    },
  },
});

// ----------------------------------------------------------------------

export default slice.reducer;

// ----------------------------------------------------------------------
// Snackbar actions

export const closeSnackBar = () => (dispatch) => {
  dispatch(slice.actions.closeSnackBar());
};

export const showSnackbar =
  ({ severity, message }) =>
  (dispatch) => {
    dispatch(slice.actions.openSnackBar({ message, severity }));
    setTimeout(() => {
      dispatch(slice.actions.closeSnackBar());
    }, 4000);
  };

// ----------------------------------------------------------------------
// Sidebar / Tab controls

export const ToggleSidebar = () => (dispatch) => {
  dispatch(slice.actions.toggleSideBar());
};

export const UpdateSidebarType = (type) => (dispatch) => {
  dispatch(slice.actions.updateSideBarType({ type }));
};

export const UpdateTab = (tab) => (dispatch) => {
  dispatch(slice.actions.updateTab(tab));
};

// ----------------------------------------------------------------------
// API CALLS

export const FetchUsers = () => async (dispatch) => {
  try {
    const res = await api.get("/users/get-users");
    dispatch(slice.actions.updateUsers({ users: res.data.data }));
  } catch (err) {
    console.error("FetchUsers error:", err);
  }
};

export const FetchAllUsers = () => async (dispatch) => {
  try {
    const res = await api.get("/users/get-all-verified-users");
    dispatch(slice.actions.updateAllUsers({ users: res.data.data }));
  } catch (err) {
    console.error("FetchAllUsers error:", err);
  }
};

export const FetchFriends = (keycloakId) => async (dispatch) => {
  try {
    console.log("🔍 Fetching friends for:", keycloakId);

    const res = await api.post("/users/get-friends", { keycloakId });

    console.log("✅ Friends fetched:", res.data.data);
    dispatch(slice.actions.updateFriends({ friends: res.data.data }));
  } catch (err) {
    console.error("FetchFriends error:", err);
    // Có thể dispatch action error nếu cần
    dispatch(
      showSnackbar({
        severity: "error",
        message: "Failed to fetch friends",
      })
    );
  }
};

export const FetchFriendRequests = (keycloakId) => async (dispatch) => {
  try {
    console.log("🔍 Fetching friend requests for:", keycloakId);

    const res = await api.post("/users/get-requests", { keycloakId });

    console.log("✅ Friend requests fetched:", res.data.data);
    dispatch(slice.actions.updateFriendRequests({ requests: res.data.data }));
  } catch (err) {
    console.error("FetchFriendRequests error:", err);
    dispatch(
      showSnackbar({
        severity: "error",
        message: "Failed to fetch friend requests",
      })
    );
  }
};

export const SendFriendRequest =
  (senderKeycloakId, receiverKeycloakId) => async (dispatch) => {
    try {
      console.log("📨 Sending friend request:", {
        senderKeycloakId,
        receiverKeycloakId,
      });

      const res = await api.post("/users/send-friend-request", {
        senderKeycloakId,
        receiverKeycloakId,
      });

      console.log("✅ Friend request sent:", res.data.data);

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Friend request sent successfully",
        })
      );

      return res.data;
    } catch (err) {
      console.error("SendFriendRequest error:", err);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to send friend request",
        })
      );
      throw err;
    }
  };

export const CancelFriendRequest =
  (senderKeycloakId, recipientKeycloakId) => async (dispatch) => {
    try {
      console.log("🗑️ Canceling friend request:", {
        senderKeycloakId,
        recipientKeycloakId,
      });

      const res = await api.post("/users/cancel-friend-request", {
        senderKeycloakId,
        recipientKeycloakId,
      });

      console.log("✅ Friend request canceled:", res.data);

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Friend request canceled",
        })
      );

      return res.data;
    } catch (err) {
      console.error("CancelFriendRequest error:", err);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to cancel friend request",
        })
      );
      throw err;
    }
  };

export const RespondToFriendRequest =
  (requestId, keycloakId, action) => async (dispatch) => {
    try {
      console.log("📨 Responding to friend request:", {
        requestId,
        keycloakId,
        action,
      });

      const res = await api.post("/users/respond-friend-request", {
        requestId,
        keycloakId,
        action, // 'accept' or 'reject'
      });

      console.log("✅ Friend request responded:", res.data.data);

      // Cập nhật state
      if (action === "accept") {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Friend request accepted",
          })
        );
        // Có thể fetch lại danh sách bạn bè
        dispatch(FetchFriends(keycloakId));
      } else {
        dispatch(
          showSnackbar({
            severity: "info",
            message: "Friend request rejected",
          })
        );
      }

      return res.data;
    } catch (err) {
      console.error("RespondToFriendRequest error:", err);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to respond to friend request",
        })
      );
      throw err;
    }
  };

// 🆕 Cập nhật SelectConversation để hỗ trợ cả group
export const SelectConversation =
  ({ room_id, chat_type = "individual", chat_info = {} }) =>
  (dispatch) => {
    console.log("🔍 Selecting conversation:", {
      room_id,
      chat_type,
      chat_info,
    });
    dispatch(
      slice.actions.selectConversation({ room_id, chat_type, chat_info })
    );
  };

// call logs
export const FetchCallLogs = () => async (dispatch) => {
  try {
    const res = await api.get("/users/call/history");
    dispatch(slice.actions.fetchCallLogs({ call_logs: res.data.data }));
  } catch (err) {
    console.error("FetchCallLogs error:", err);
    dispatch(
      showSnackbar({
        severity: "error",
        message: "Failed to fetch call logs",
      })
    );
  }
};

// user profile
export const FetchUserProfile = () => async (dispatch) => {
  try {
    const res = await api.get("/users/me");
    dispatch(slice.actions.fetchUser({ user: res.data.data }));
  } catch (err) {
    console.error("FetchUserProfile error:", err);
    dispatch(
      showSnackbar({
        severity: "error",
        message: "Failed to fetch user profile",
      })
    );
  }
};

// SỬA: UpdateUserProfile với uploadToS3
export const UpdateUserProfile = (formValues) => async (dispatch) => {
  const file = formValues.avatar;

  try {
    if (file) {
      console.log("📤 Uploading avatar...");

      // Sử dụng hàm uploadToS3 từ utils/s3
      const uploadResult = await uploadToS3(file);

      console.log("✅ Avatar uploaded:", uploadResult);

      // Gọi API update user với avatar fileKey
      const res = await api.patch("/users/update-me", {
        ...formValues,
        avatar: uploadResult.fileKey, // Lưu fileKey vào database
      });

      dispatch(slice.actions.updateUser({ user: res.data.data }));
      dispatch(
        showSnackbar({
          severity: "success",
          message: "Profile updated successfully",
        })
      );
    } else {
      // Nếu không có file avatar, chỉ update thông tin khác
      const res = await api.patch("/users/update-me", formValues);
      dispatch(slice.actions.updateUser({ user: res.data.data }));
      dispatch(
        showSnackbar({
          severity: "success",
          message: "Profile updated successfully",
        })
      );
    }
  } catch (err) {
    console.error("UpdateUserProfile error:", err);
    dispatch(
      showSnackbar({
        severity: "error",
        message: "Failed to update profile",
      })
    );
  }
};

// ----------------------------------------------------------------------
// 👉 EXPORT ACTION SetMessages
// ----------------------------------------------------------------------

export const SetMessages =
  ({ messages }) =>
  (dispatch) => {
    dispatch(slice.actions.setMessages({ messages }));
  };

export const { resetAppState } = slice.actions;
