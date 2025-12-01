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
// ----------------------------------------------------------------------

const rootPersistConfig = {
  key: "root",
  storage,
  keyPrefix: "redux-",
  //   whitelist: [],
  //   blacklist: [],
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
});

export { rootPersistConfig, rootReducer };
