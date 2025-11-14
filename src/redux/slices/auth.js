import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  isLoggedIn: false,
  token: "",
  user_id: null,
  role: "user",
  isLoading: false,
  error: false,
};

const slice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setKeycloakUser(state, action) {
      const { user_id, role, token } = action.payload;
      state.isLoggedIn = true;
      state.user_id = user_id;
      state.role = role || "user";
      state.token = token || "";
    },
    signOut(state) {
      state.isLoggedIn = false;
      state.token = "";
      state.user_id = null;
      state.role = "user";
    },
    setLoading(state, action) {
      state.isLoading = action.payload;
      state.error = false;
    },
  },
});

export default slice.reducer;
export const { setKeycloakUser, signOut, setLoading } = slice.actions;
