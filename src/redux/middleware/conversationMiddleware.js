// src/redux/middleware/conversationMiddleware.js
import { addDirectMessage } from "../slices/conversationSlice";

export const conversationMiddleware =
  (socket) => (store) => (next) => (action) => {
    if (action.type === "conversation/addDirectMessage") {
      const msg = action.payload;
      socket.emit("send_message", msg); // gửi realtime
    }

    socket.on("receive_message", (msg) => {
      store.dispatch(addDirectMessage(msg));
    });

    return next(action);
  };
