// src/redux/slices/settingsSlice.js
import { createSlice } from "@reduxjs/toolkit";

const settingsSlice = createSlice({
  name: "settings",
  initialState: {
    // Profile data
    profile: {
      firstName: "",
      lastName: "",
      email: "",
      avatar: "",
      status: "Online",
      about: "",
      username: "",
    },
    // Cài đặt thông báo
    notifications: {
      message: true,
      preview: true,
      sound: true,
      desktop: true,
      mobile: false,
    },
    // Cài đặt bảo mật
    privacy: {
      lastSeen: "everyone",
      profilePhoto: "everyone",
      status: "everyone",
      readReceipts: true,
      typingIndicators: true,
    },
    // Cài đặt chung
    general: {
      language: "vi",
      theme: "system",
      fontSize: "medium",
    },
    // Cài đặt chat
    chat: {
      enterToSend: true,
      emojiPicker: true,
      mediaAutoDownload: true,
      saveToCameraRoll: false,
    },
    dialogs: {
      profile: false,
      theme: false,
      notifications: false,
      privacy: false,
      general: false,
      chat: false,
      help: false,
    },
    loading: false,
    error: null,
  },
  reducers: {
    // Dialog management
    openDialog: (state, action) => {
      const { type } = action.payload;
      state.dialogs[type] = true;
    },
    closeDialog: (state, action) => {
      const { type } = action.payload;
      state.dialogs[type] = false;
    },

    // Profile management
    updateProfile: (state, action) => {
      state.profile = { ...state.profile, ...action.payload };
    },
    syncProfileWithApp: (state, action) => {
      const { user, userInfo } = action.payload;
      if (user || userInfo) {
        const source = user || userInfo;
        state.profile = {
          firstName: source?.firstName || source?.fullName?.split(" ")[0] || "",
          lastName:
            source?.lastName ||
            source?.fullName?.split(" ").slice(1).join(" ") ||
            "",
          email: source?.email || "",
          avatar: source?.avatar || "",
          status: source?.status || "Online",
          about: source?.about || "",
          username: source?.username || "",
        };
      }
    },

    // Settings management
    updateNotifications: (state, action) => {
      state.notifications = { ...state.notifications, ...action.payload };
    },
    updatePrivacy: (state, action) => {
      state.privacy = { ...state.privacy, ...action.payload };
    },
    updateGeneral: (state, action) => {
      state.general = { ...state.general, ...action.payload };
    },
    updateChat: (state, action) => {
      state.chat = { ...state.chat, ...action.payload };
    },

    // UI states
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },

    // Reset actions
    resetSettings: (state) => {
      state.notifications = {
        message: true,
        preview: true,
        sound: true,
        desktop: true,
        mobile: false,
      };
      state.privacy = {
        lastSeen: "everyone",
        profilePhoto: "everyone",
        status: "everyone",
        readReceipts: true,
        typingIndicators: true,
      };
      state.general = {
        language: "vi",
        theme: "system",
        fontSize: "medium",
      };
      state.chat = {
        enterToSend: true,
        emojiPicker: true,
        mediaAutoDownload: true,
        saveToCameraRoll: false,
      };
    },

    // API integration
    setSettingsFromAPI: (state, action) => {
      const { profile, notifications, privacy, general, chat } = action.payload;
      if (profile) state.profile = { ...state.profile, ...profile };
      if (notifications) state.notifications = notifications;
      if (privacy) state.privacy = privacy;
      if (general) state.general = general;
      if (chat) state.chat = chat;
    },
  },
});

export const {
  openDialog,
  closeDialog,
  updateProfile,
  syncProfileWithApp,
  updateNotifications,
  updatePrivacy,
  updateGeneral,
  updateChat,
  setLoading,
  setError,
  resetSettings,
  setSettingsFromAPI,
} = settingsSlice.actions;

export default settingsSlice.reducer;
