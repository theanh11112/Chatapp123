import { configureStore } from "@reduxjs/toolkit";
import {
  useDispatch as useAppDispatch,
  useSelector as useAppSelector,
} from "react-redux";
import { persistStore, persistReducer } from "redux-persist";
import { rootPersistConfig, rootReducer } from "./rootReducer";

// ----------------------------------------------------------------------

// Hàm để lấy E2EE middleware với error handling
const getE2EEMiddleware = () => {
  try {
    // Dynamic import để tránh lỗi nếu module không tồn tại
    const {
      e2eeReduxMiddleware,
    } = require("../e2ee/integration/reduxIntegration");
    return e2eeReduxMiddleware;
  } catch (error) {
    console.warn("⚠️ E2EE middleware not available:", error.message);

    // Trả về một middleware dummy nếu không tìm thấy
    return (storeAPI) => (next) => (action) => {
      return next(action);
    };
  }
};

const store = configureStore({
  reducer: persistReducer(rootPersistConfig, rootReducer),
  middleware: (getDefaultMiddleware) => {
    const defaultMiddleware = getDefaultMiddleware({
      serializableCheck: false,
      immutableCheck: false,
    });

    // Thêm E2EE middleware nếu có
    const e2eeMiddleware = getE2EEMiddleware();

    return defaultMiddleware.concat(e2eeMiddleware);
  },
});

const persistor = persistStore(store);

const { dispatch } = store;

const useSelector = useAppSelector;

const useDispatch = () => useAppDispatch();

export { store, persistor, dispatch, useSelector, useDispatch };
