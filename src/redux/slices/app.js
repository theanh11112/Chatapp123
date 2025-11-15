// src/redux/slices/app.js
import { createSlice } from "@reduxjs/toolkit";
import api from "../../utils/axios";
import { v4 } from "uuid";
import S3 from "../../utils/s3";
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
  chat_type: null,
  room_id: null,
  call_logs: [],
  messages: [], // <-- thêm dòng này
};

// ----------------------------------------------------------------------

const slice = createSlice({
  name: "app",
  initialState,
  reducers: {
    fetchCallLogs(state, action) {
      state.call_logs = action.payload.call_logs;
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

    selectConversation(state, action) {
      state.chat_type = "individual";
      state.room_id = action.payload.room_id;
    },

    // --------------------------------------------------------
    // 👉 Thêm reducer SetMessages (dùng khi click vào 1 chat)
    // --------------------------------------------------------
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

export const FetchFriends = () => async (dispatch) => {
  try {
    const res = await api.get("/users/get-friends");
    dispatch(slice.actions.updateFriends({ friends: res.data.data }));
  } catch (err) {
    console.error("FetchFriends error:", err);
  }
};

export const FetchFriendRequests = () => async (dispatch) => {
  try {
    const res = await api.get("/users/get-requests");
    dispatch(slice.actions.updateFriendRequests({ requests: res.data.data }));
  } catch (err) {
    console.error("FetchFriendRequests error:", err);
  }
};

// select conversation
export const SelectConversation =
  ({ room_id }) =>
  (dispatch) => {
    console.log("888", room_id);
    dispatch(slice.actions.selectConversation({ room_id }));
  };

// call logs
export const FetchCallLogs = () => async (dispatch) => {
  try {
    const res = await api.get("/users/get-call-logs");
    dispatch(slice.actions.fetchCallLogs({ call_logs: res.data.data }));
  } catch (err) {
    console.error("FetchCallLogs error:", err);
  }
};

// user profile
export const FetchUserProfile = () => async (dispatch) => {
  try {
    const res = await api.get("/users/me");
    dispatch(slice.actions.fetchUser({ user: res.data.data }));
  } catch (err) {
    console.error("FetchUserProfile error:", err);
  }
};

export const UpdateUserProfile = (formValues) => async (dispatch) => {
  const file = formValues.avatar;
  const key = v4();

  try {
    S3.getSignedUrl(
      "putObject",
      { Bucket: S3_BUCKET_NAME, Key: key, ContentType: `image/${file.type}` },
      async (_err, presignedURL) => {
        if (presignedURL) {
          await fetch(presignedURL, {
            method: "PUT",
            body: file,
            headers: { "Content-Type": file.type },
          });
        }
      }
    );

    const res = await api.put("/users/update-me", {
      ...formValues,
      avatar: key,
    });

    dispatch(slice.actions.updateUser({ user: res.data.data }));
  } catch (err) {
    console.error("UpdateUserProfile error:", err);
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
