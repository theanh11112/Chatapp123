import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLoggedIn: false,
  token: "",
  user_id: null,
  role: "user",
  isLoading: false,
  error: false,
  userInfo: null,
};

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setKeycloakUser(state, action) {
      const { user_id, role, token, userInfo } = action.payload;
      state.isLoggedIn = true;
      state.user_id = user_id;
      state.role = role || "user";
      state.token = token || "";
      state.userInfo = userInfo || null;
    },
    setUserInfo(state, action) {
      state.userInfo = action.payload;
    },
    updateUserInfo(state, action) {
      if (state.userInfo) {
        state.userInfo = { ...state.userInfo, ...action.payload };
      } else {
        state.userInfo = action.payload;
      }
    },

    signOut(state) {
      state.isLoggedIn = false;
      state.token = "";
      state.user_id = null;
      state.role = "user";
      state.userInfo = null;
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
      state.error = false;
    },
  },
});

export default slice.reducer;
export const {
  setKeycloakUser,
  signOut,
  setLoading,
  setUserInfo,
  updateUserInfo,
} = slice.actions;
