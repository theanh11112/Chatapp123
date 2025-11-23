// src/socket.js - SỬA NGAY LẬP TỨC
import { io } from "socket.io-client";
import { EventEmitter } from "events";
import { store } from "./redux/store";
import { updateUserPresence } from "./redux/slices/conversation";

let socket = null;
export const socketEvents = new EventEmitter();

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

      // 🆕 QUAN TRỌNG: GÁN SOCKET VÀO WINDOW NGAY TẠI ĐÂY
      window.socket = socket;
      console.log("🔗 Socket assigned to window.socket");

      socketEvents.emit("socket_ready", socket);
    });

    socket.on("presence_update", ({ userId, status, lastSeen }) => {
      store.dispatch(updateUserPresence({ userId, status, lastSeen }));
    });

    socket.on("disconnect", (reason) => {
      console.warn("❌ Socket disconnected:", reason);
      window.socket = null; // 🆕 XÓA KHI DISCONNECT
    });

    socket.on("connect_error", (err) => {
      console.error("⚠️ Socket connection error:", err.message);
    });

    // 🆕 THÊM: Socket events cho pin/unpin
    socket.on("message_pinned", (data) => {
      console.log("📌 Socket: Message pinned", data);
    });

    socket.on("message_unpinned", (data) => {
      console.log("📌 Socket: Message unpinned", data);
    });
  }

  return new Promise((resolve) => {
    if (socket.connected) {
      window.socket = socket; // 🆕 ĐẢM BẢO GÁN VÀO WINDOW
      resolve(socket);
    } else {
      socket.once("connect", () => {
        window.socket = socket; // 🆕 ĐẢM BẢO GÁN VÀO WINDOW
        resolve(socket);
      });
    }
  });
};

// 🆕 THÊM: Hàm kiểm tra socket availability
export const isSocketAvailable = () => {
  return window.socket && window.socket.connected;
};

// 🆕 THÊM: Hàm lấy socket an toàn
export const getSocket = () => {
  return window.socket || socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    window.socket = null;
  }
};

export default socket;
export { socket };
