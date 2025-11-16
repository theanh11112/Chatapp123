// src/socket.js
import { io } from "socket.io-client";
import { EventEmitter } from "events";
import { store } from "./redux/store";
import { updateUserPresence } from "./redux/slices/conversation";

let socket = null;
export const socketEvents = new EventEmitter(); // dùng để emit "ready"

export const connectSocket = (token) => {
  if (!socket || socket.disconnected) {
    console.log("🟡 Creating new socket connection...");

    socket = io("http://localhost:3001", {
      auth: { token },
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 500,
    });

    socket.on("connect", () => {
      console.log("✅ Socket connected → id:", socket.id);
      socketEvents.emit("socket_ready", socket); // phát event khi connect
    });

    socket.on("presence_update", ({ userId, status, lastSeen }) => {
      store.dispatch(updateUserPresence({ userId, status, lastSeen }));
    });

    socket.on("disconnect", (reason) => {
      console.warn("❌ Socket disconnected:", reason);
    });

    socket.on("connect_error", (err) => {
      console.error("⚠️ Socket connection error:", err.message);
    });
  }

  return new Promise((resolve) => {
    if (socket.connected) resolve(socket);
    else socket.once("connect", () => resolve(socket));
  });
};

export const getSocket = () => socket;
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export default socket;
export { socket };
