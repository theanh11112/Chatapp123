// src/socket.js - COMPLETE FIXED VERSION
import { io } from "socket.io-client";
import { EventEmitter } from "events";
import { store } from "./redux/store";
import { updateUserPresence } from "./redux/slices/conversation";
import {
  PushToVideoCallQueue,
  ResetVideoCallQueue,
  CloseVideoNotificationDialog,
} from "./redux/slices/videoCall";
import {
  PushToAudioCallQueue,
  ResetAudioCallQueue,
  CloseAudioNotificationDialog,
} from "./redux/slices/audioCall";

let socket = null;
export const socketEvents = new EventEmitter();

export const connectSocket = (token) => {
  if (!socket || socket.disconnected) {
    console.log("🟡 Creating new socket connection...");

    socket = io("http://localhost:3001", {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      timeout: 20000,
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

    // 🆕 THÊM: Audio Call Events
    socket.on("audio_call_notification", (data) => {
      console.log("📞 Incoming audio call:", data);
      store.dispatch(PushToAudioCallQueue(data));
    });

    socket.on("audio_call_accepted", (data) => {
      console.log("✅ Audio call accepted:", data);
      // Có thể dispatch action để cập nhật trạng thái call
    });

    socket.on("audio_call_rejected", (data) => {
      console.log("❌ Audio call rejected:", data);
      store.dispatch(ResetAudioCallQueue());
    });

    socket.on("audio_call_ended", (data) => {
      console.log("📴 Audio call ended:", data);
      store.dispatch(ResetAudioCallQueue());
    });

    socket.on("user_is_busy_audio_call", (data) => {
      console.log("🚫 User is busy for audio call:", data);
      store.dispatch(CloseAudioNotificationDialog());
    });

    // 🆕 THÊM: Video Call Events
    socket.on("video_call_notification", (data) => {
      console.log("🎥 Incoming video call:", data);
      store.dispatch(PushToVideoCallQueue(data));
    });

    socket.on("video_call_accepted", (data) => {
      console.log("✅ Video call accepted:", data);
      // Có thể dispatch action để cập nhật trạng thái call
    });

    socket.on("video_call_rejected", (data) => {
      console.log("❌ Video call rejected:", data);
      store.dispatch(ResetVideoCallQueue());
    });

    socket.on("video_call_ended", (data) => {
      console.log("📴 Video call ended:", data);
      store.dispatch(ResetVideoCallQueue());
    });

    socket.on("user_is_busy_video_call", (data) => {
      console.log("🚫 User is busy for video call:", data);
      store.dispatch(CloseVideoNotificationDialog());
    });

    // 🆕 THÊM: Call Status Events
    socket.on("call_status_updated", (data) => {
      console.log("🔄 Call status updated:", data);
    });

    socket.on("call_ended", (data) => {
      console.log("📴 Call ended:", data);
      store.dispatch(ResetVideoCallQueue());
      store.dispatch(ResetAudioCallQueue());
    });

    // 🆕 THÊM: Real-time call events
    socket.on("user_joined_call", (data) => {
      console.log("👤 User joined call:", data);
    });

    socket.on("user_left_call", (data) => {
      console.log("👤 User left call:", data);
    });

    socket.on("call_participants_updated", (data) => {
      console.log("👥 Call participants updated:", data);
    });

    // 🆕 THÊM: Socket events cho pin/unpin
    socket.on("message_pinned", (data) => {
      console.log("📌 Socket: Message pinned", data);
    });

    socket.on("message_unpinned", (data) => {
      console.log("📌 Socket: Message unpinned", data);
    });

    socket.on("disconnect", (reason) => {
      console.warn("❌ Socket disconnected:", reason);
      window.socket = null; // 🆕 XÓA KHI DISCONNECT
    });

    socket.on("connect_error", (err) => {
      console.error("⚠️ Socket connection error:", err.message);
      // 🆕 THÊM: Tự động thử kết nối lại sau 5 giây
      setTimeout(() => {
        if (!socket.connected) {
          console.log("🔄 Attempting to reconnect socket...");
          socket.connect();
        }
      }, 5000);
    });

    // 🆕 THÊM: Socket events khác
    socket.on("reconnect", (attemptNumber) => {
      console.log("🔁 Socket reconnected after", attemptNumber, "attempts");
    });

    socket.on("reconnect_attempt", (attemptNumber) => {
      console.log("🔄 Socket reconnection attempt:", attemptNumber);
    });

    socket.on("reconnect_error", (error) => {
      console.error("❌ Socket reconnection error:", error);
    });

    socket.on("reconnect_failed", () => {
      console.error("💥 Socket reconnection failed");
    });

    // 🆕 THÊM: Ping/Pong để kiểm tra kết nối
    socket.on("ping", () => {
      socket.emit("pong");
    });
  }

  return new Promise((resolve, reject) => {
    if (socket.connected) {
      window.socket = socket; // 🆕 ĐẢM BẢO GÁN VÀO WINDOW
      resolve(socket);
    } else {
      const timeout = setTimeout(() => {
        reject(new Error("Socket connection timeout"));
      }, 10000);

      socket.once("connect", () => {
        clearTimeout(timeout);
        window.socket = socket; // 🆕 ĐẢM BẢO GÁN VÀO WINDOW
        resolve(socket);
      });

      socket.once("connect_error", (error) => {
        clearTimeout(timeout);
        reject(error);
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
  if (window.socket && window.socket.connected) {
    return window.socket;
  }
  if (socket && socket.connected) {
    window.socket = socket;
    return socket;
  }
  return null;
};

// 🆕 THÊM: Hàm emit event an toàn
export const safeEmit = (event, data) => {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected) {
    console.log(`📤 Emitting ${event}:`, data);
    currentSocket.emit(event, data);
    return true;
  } else {
    console.error(`❌ Cannot emit ${event}: Socket not connected`);
    return false;
  }
};

// 🆕 THÊM: Hàm emit event với callback
export const safeEmitWithCallback = (
  event,
  data,
  callback,
  timeout = 10000
) => {
  const currentSocket = getSocket();
  if (currentSocket && currentSocket.connected) {
    console.log(`📤 Emitting ${event} with callback:`, data);

    const timeoutId = setTimeout(() => {
      console.error(`❌ ${event} callback timeout`);
      callback(new Error("Socket timeout"));
    }, timeout);

    currentSocket.emit(event, data, (response) => {
      clearTimeout(timeoutId);
      callback(null, response);
    });

    return true;
  } else {
    console.error(`❌ Cannot emit ${event}: Socket not connected`);
    callback(new Error("Socket not connected"));
    return false;
  }
};

// 🆕 THÊM: Hàm join room
export const joinRoom = (roomId) => {
  return safeEmit("join_room", { roomId });
};

// 🆕 THÊM: Hàm leave room
export const leaveRoom = (roomId) => {
  return safeEmit("leave_room", { roomId });
};

// 🆕 THÊM: Hàm cho audio/video call
export const startAudioCall = (callData) => {
  return safeEmit("start_audio_call", callData);
};

export const startVideoCall = (callData) => {
  return safeEmit("start_video_call", callData);
};

export const acceptCall = (callData) => {
  return safeEmit("accept_call", callData);
};

export const rejectCall = (callData) => {
  return safeEmit("reject_call", callData);
};

export const endCall = (callData) => {
  return safeEmit("end_call", callData);
};

export const disconnectSocket = () => {
  if (socket) {
    console.log("🔌 Disconnecting socket...");
    socket.disconnect();
    socket = null;
    window.socket = null;
  }
};

// 🆕 THÊM: Hàm reconnect socket
export const reconnectSocket = (token) => {
  if (socket) {
    socket.disconnect();
    socket = null;
    window.socket = null;
  }
  return connectSocket(token);
};

// 🆕 THÊM: Hàm get socket status
export const getSocketStatus = () => {
  const currentSocket = getSocket();
  if (!currentSocket) {
    return "disconnected";
  }
  return currentSocket.connected ? "connected" : "disconnected";
};

export default socket;
export { socket };
