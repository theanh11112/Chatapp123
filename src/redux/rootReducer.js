import { combineReducers } from "redux";
import storage from "redux-persist/lib/storage";
// slices
import appReducer from "./slices/app";
import audioCallReducer from "./slices/audioCall";
import videoCallReducer from "./slices/videoCall";
import authReducer from "./slices/auth";
import conversationReducer from "./slices/conversation";
import chatboxReducer from "./slices/chatboxSlice";
import settingsReducer from "./slices/settingsSlice";
import taskChatReducer from "./slices/taskChat";

// 🆕 IMPORT E2EE SLICE
import e2eeReducer from "./slices/e2eeSlice";

// ----------------------------------------------------------------------

const rootPersistConfig = {
  key: "root",
  storage,
  keyPrefix: "redux-",
  // 🆕 Cập nhật whitelist để bao gồm e2ee
  whitelist: [
    "auth", // User authentication
    "conversation", // Chat data
    "settings", // App settings
    "e2ee", // 🆕 E2EE keys và settings
  ],
  blacklist: [
    "app", // Snackbar, loading states
    "audioCall", // Call states
    "videoCall", // Video call states
    "chatbox", // Chatbox UI states
    "taskChat", // Task chat
  ],
};

const rootReducer = combineReducers({
  app: appReducer,
  auth: authReducer,
  conversation: conversationReducer,
  audioCall: audioCallReducer,
  videoCall: videoCallReducer,
  chatbox: chatboxReducer,
  settings: settingsReducer,
  taskChat: taskChatReducer,
  e2ee: e2eeReducer, // 🆕 THÊM E2EE REDUCER
});

// 🆕 Transform để xử lý Set objects trong E2EE state
const e2eeTransform = {
  in: (state) => {
    if (
      state?.e2ee?.encryptedChats &&
      Array.isArray(state.e2ee.encryptedChats)
    ) {
      // Chuyển Array back thành Set khi rehydrate
      return {
        ...state,
        e2ee: {
          ...state.e2ee,
          encryptedChats: new Set(state.e2ee.encryptedChats),
        },
      };
    }
    return state;
  },
  out: (state) => {
    if (state?.e2ee?.encryptedChats instanceof Set) {
      // Chuyển Set thành Array khi persist
      return {
        ...state,
        e2ee: {
          ...state.e2ee,
          encryptedChats: Array.from(state.e2ee.encryptedChats),
        },
      };
    }
    return state;
  },
};

// 🆕 Custom persist config với transform
const persistedReducer = (state, action) => {
  // Handle reset actions
  if (action.type === "auth/signOut" || action.type === "RESET") {
    // Giữ lại một số thông tin E2EE khi reset
    const { e2ee } = state || {};

    return rootReducer(
      {
        // 🆕 Giữ lại E2EE settings nhưng clear sensitive data
        e2ee: e2ee
          ? {
              ...e2ee,
              peerKeys: {},
              encryptedChats: new Set(),
              pendingEncryptions: {},
              cache: { canEncryptCache: {}, keyExchangeStatus: {} },
              ui: {
                showKeyManagement: false,
                showSettings: false,
                showExchangeRequests: false,
                activeTab: "status",
              },
            }
          : undefined,
      },
      action
    );
  }

  return rootReducer(state, action);
};

export {
  rootPersistConfig,
  persistedReducer as rootReducer,
  e2eeTransform, // Export transform để dùng trong store
};
