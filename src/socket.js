// src/socket.js - FIXED VERSION
import { io } from "socket.io-client";
import { EventEmitter } from "events";
import { store } from "./redux/store";
import { updateUserPresence } from "./redux/slices/conversation";
import {
  PushToVideoCallQueue,
  ResetVideoCallQueue,
  CloseVideoNotificationDialog,
  setCallActive,
  updateCallDuration,
} from "./redux/slices/videoCall";
import {
  PushToAudioCallQueue,
  resetAudioCallQueue,
  CloseAudioNotificationDialog,
  setCallActive as setAudioCallActive,
  updateCallDuration as updateAudioCallDuration,
} from "./redux/slices/audioCall";
import { FetchCallLogs } from "./redux/slices/app";

let socket = null;
export const socketEvents = new EventEmitter();

const DEBUG = true;
const LOG_PREFIX = "🔌 [SOCKET]";

const callMonitoring = {
  activeCalls: new Map(),
  lastCallUpdate: new Map(),
  eventDebounce: new Map(), // Thêm debounce để tránh duplicate events
};

// ==================== DEBUG UTILITIES ====================
const log = {
  info: (message, data = null) => {
    if (DEBUG) console.log(`${LOG_PREFIX} ℹ️ ${message}`, data ? data : "");
  },

  success: (message, data = null) => {
    if (DEBUG) console.log(`${LOG_PREFIX} ✅ ${message}`, data ? data : "");
  },

  error: (message, error = null) => {
    console.error(`${LOG_PREFIX} ❌ ${message}`, error ? error : "");
  },

  warn: (message, data = null) => {
    console.warn(`${LOG_PREFIX} ⚠️ ${message}`, data ? data : "");
  },

  debug: (message, data = null) => {
    if (DEBUG) console.debug(`${LOG_PREFIX} 🔍 ${message}`, data ? data : "");
  },

  socketEvent: (event, data = null) => {
    if (DEBUG) {
      console.group(`${LOG_PREFIX} 📨 ${event}`);
      console.log("📊 Data:", data);
      console.groupEnd();
    }
  },
};

// ==================== DEBOUNCE UTILITY ====================
const debounceEvent = (eventName, data, timeout = 1000) => {
  const key = `${eventName}_${data.roomID || data.callId || "global"}`;
  const now = Date.now();
  const lastEvent = callMonitoring.eventDebounce.get(key);

  if (lastEvent && now - lastEvent < timeout) {
    log.warn(`Debounced duplicate event: ${eventName}`, { key });
    return true; // Event bị debounce
  }

  callMonitoring.eventDebounce.set(key, now);
  setTimeout(() => callMonitoring.eventDebounce.delete(key), timeout + 100);
  return false; // Event được xử lý
};

// ==================== LAZY IMPORT FOR CIRCULAR DEPENDENCY ====================
let notificationService = null;
const getNotificationService = async () => {
  if (!notificationService) {
    try {
      const module = await import("./services/notificationService");
      notificationService = module.default;
    } catch (error) {
      log.error("Failed to load notification service", error);
      notificationService = {
        showMessageNotification: () => {
          log.warn("Notification service not available");
        },
      };
    }
  }
  return notificationService;
};

// ==================== CONNECTION ====================
export const connectSocket = (token) => {
  log.info("connectSocket called", {
    hasToken: !!token,
    tokenLength: token?.length,
  });

  if (!socket || socket.disconnected) {
    log.info("Creating new socket connection...");

    try {
      socket = io("http://localhost:3001", {
        auth: { token },
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        timeout: 20000,
        forceNew: true,
        query: {
          clientType: "web",
          timestamp: Date.now(),
        },
      });

      log.info("Socket instance created", {
        socketId: socket?.id,
        connected: socket?.connected,
      });
    } catch (err) {
      log.error("Failed to create socket", err);
      throw err;
    }

    // ==================== SOCKET EVENT HANDLERS ====================

    // CONNECT
    socket.on("connect", () => {
      log.success("Socket connected", {
        id: socket.id,
        connected: socket.connected,
      });

      socket.emit("client_info", {
        platform: "web",
        version: "1.0.0",
        userAgent: navigator.userAgent,
      });

      window.socket = socket;
      log.success("Socket assigned to window.socket");

      socketEvents.removeAllListeners("socket_ready");
      socketEvents.emit("socket_ready", socket);

      window.dispatchEvent(
        new CustomEvent("socket:connected", {
          detail: { socketId: socket.id },
        })
      );
    });

    // PRESENCE
    socket.on("presence_update", (data) => {
      log.socketEvent("presence_update", data);
      store.dispatch(updateUserPresence(data));
    });

    // MESSAGES - FIXED: Sử dụng lazy import
    const setupMessageHandler = (event, type) => {
      socket.on(event, async (data) => {
        log.socketEvent(event, { type, data });

        const { notifications } = store.getState().settings;
        const { user } = store.getState().auth;
        const user_id = user?.keycloakId;

        if (!data || !user_id) {
          log.warn("Invalid data or user not authenticated");
          return;
        }

        const isOwnMessage =
          data.from === user_id || data.sender?.keycloakId === user_id;
        if (!isOwnMessage) {
          log.info(`Showing notification for ${type} message`);
          try {
            const notificationService = await getNotificationService();
            notificationService.showMessageNotification(
              data,
              notifications,
              type === "group"
            );
          } catch (error) {
            log.error("Failed to show notification", error);
          }
        }

        socketEvents.emit("new_message", { type, data });
      });
    };

    setupMessageHandler("text_message", "direct");
    setupMessageHandler("text_message_reply", "reply");
    setupMessageHandler("new_group_message", "group");

    // ==================== CALL EVENT HANDLERS ====================

    // AUDIO CALL NOTIFICATION - FIXED: Improved duplicate detection
    socket.on("audio_call_notification", (data) => {
      // Debounce check
      if (debounceEvent("audio_call_notification", data)) {
        return;
      }

      log.socketEvent("audio_call_notification", data);

      if (!data || typeof data !== "object") {
        log.error("Invalid notification data", data);
        return;
      }

      const currentUser = store.getState().auth.user;
      const currentUserId =
        currentUser?.keycloakId || store.getState().auth.user_id;
      log.debug("Current user check", { currentUserId, dataTo: data.to });

      // Check if call is for me
      const isForMe =
        data.to === currentUserId ||
        (data.toUser && data.toUser.keycloakId === currentUserId);

      if (!isForMe) {
        log.warn("Call not for me", { expected: currentUserId, got: data.to });
        return;
      }

      log.success("This call is for me!");

      // IMPROVED duplicate detection
      const existingCalls = store.getState().audioCall.call_queue;
      const callId = data.callId;
      const roomID = data.roomID;
      const fromUserId = data.fromUser?.keycloakId || data.from;

      const isDuplicate = existingCalls.some((call) => {
        // Check multiple criteria
        if (call.id === callId || call.callId === callId) return true;
        if (call.roomID === roomID && call.from === fromUserId) {
          // Check if recent (within 5 seconds)
          const callTime = new Date(call.timestamp).getTime();
          const now = Date.now();
          if (now - callTime < 5000) return true;
        }
        return false;
      });

      if (isDuplicate) {
        log.warn("Duplicate call detected", {
          callId,
          roomID,
          from: fromUserId,
        });
        return;
      }

      // Prepare call data for Redux
      const callData = {
        id: data.callId,
        callId: data.callId,
        roomID: data.roomID,
        from: data.fromUser?.keycloakId || data.from,
        to: data.toUser?.keycloakId || data.to,
        fromUser: data.fromUser || {
          keycloakId: data.from,
          username: data.fromUser?.username || data.fromUsername || "Unknown",
          name: data.fromUser?.name || data.fromUsername || "Unknown Caller",
        },
        toUser: data.toUser || {
          keycloakId: data.to,
          username: currentUser?.username || "Me",
        },
        type: data.type || "audio",
        timestamp: data.timestamp || new Date().toISOString(),
        status: "ringing",
        incoming: true,
      };

      log.info("Dispatching call to Redux", callData);

      // Sử dụng action creator thay vì raw action
      store.dispatch(
        PushToAudioCallQueue({
          call: callData,
          incoming: true,
        })
      );

      log.success("Call notification handled");
    });

    // AUDIO CALL STARTED
    socket.on("audio_call_started", (data) => {
      log.socketEvent("audio_call_started", data);

      const currentUser = store.getState().auth.user;
      if (data.from === currentUser?.keycloakId) {
        log.success("I'm the caller, call is ringing...");
        if (data.callId && data.roomID) {
          log.info("Caller received callId", data.callId);
        }
      }

      socketEvents.emit("audio_call_started", data);
    });

    // COMBINED CALL ACCEPTED HANDLER - FIXED: Tránh duplicate dispatch
    let callAcceptedHandled = new Set();

    const handleCallAccepted = (eventName, data, isAudioCall = true) => {
      // Debounce check
      if (debounceEvent(eventName, data)) {
        return;
      }

      log.socketEvent(eventName, data);

      const callKey = `${data.roomID}_${data.callId || "nocallid"}`;
      if (callAcceptedHandled.has(callKey)) {
        log.warn(`Call already accepted: ${callKey}`);
        return;
      }

      callAcceptedHandled.add(callKey);
      setTimeout(() => callAcceptedHandled.delete(callKey), 5000);

      log.success(
        `${isAudioCall ? "Audio " : ""}Call accepted by other party!`
      );

      // Chỉ dispatch một lần
      if (isAudioCall) {
        store.dispatch(setAudioCallActive(true));
      } else {
        store.dispatch(setCallActive(true));
      }

      // Cập nhật call duration timer (chỉ một timer)
      if (data.roomID) {
        // Clear existing timer nếu có
        if (callMonitoring.activeCalls.has(data.roomID)) {
          const existingCall = callMonitoring.activeCalls.get(data.roomID);
          if (existingCall.interval) {
            clearInterval(existingCall.interval);
          }
        }

        callMonitoring.lastCallUpdate.set(data.roomID, Date.now());

        const interval = setInterval(() => {
          const lastUpdate = callMonitoring.lastCallUpdate.get(data.roomID);
          if (lastUpdate) {
            const duration = Math.floor((Date.now() - lastUpdate) / 1000);
            if (isAudioCall) {
              store.dispatch(updateAudioCallDuration(duration));
            } else {
              store.dispatch(updateCallDuration(duration));
            }
          }
        }, 1000);

        callMonitoring.activeCalls.set(data.roomID, {
          interval,
          status: "connected",
          isAudioCall,
          lastUpdate: Date.now(),
        });
      }

      socketEvents.emit("call_accepted", data);
    };

    // Đăng ký handlers với logic chống duplicate
    socket.on("audio_call_accepted", (data) => {
      handleCallAccepted("audio_call_accepted", data, true);
    });

    socket.on("call_accepted", (data) => {
      handleCallAccepted("call_accepted", data, false);
    });

    // CALL DECLINED HANDLERS
    const handleCallDeclined = (eventName, data) => {
      if (debounceEvent(eventName, data)) {
        return;
      }

      log.socketEvent(eventName, data);
      log.warn("Call declined");

      store.dispatch(resetAudioCallQueue());
      cleanupCallMonitoring(data.roomID);
      socketEvents.emit("audio_call_declined", data);
    };

    socket.on(
      "audio_call_declined",
      handleCallDeclined.bind(null, "audio_call_declined")
    );
    socket.on("call_declined", handleCallDeclined.bind(null, "call_declined"));

    // CALL ENDED HANDLERS - FIXED: Combined cleanup
    const handleCallEnded = (eventName, data) => {
      if (debounceEvent(eventName, data)) {
        return;
      }

      log.socketEvent(eventName, data);
      log.info("Call ended");

      // Cleanup monitoring
      cleanupCallMonitoring(data.roomID);

      // Reset queue
      store.dispatch(resetAudioCallQueue());

      // Fetch call logs
      const { user } = store.getState().auth;
      if (user?.keycloakId) {
        setTimeout(() => {
          store.dispatch(FetchCallLogs(user.keycloakId));
        }, 1000);
      }

      socketEvents.emit("call_ended", data);
    };

    socket.on(
      "audio_call_ended",
      handleCallEnded.bind(null, "audio_call_ended")
    );
    socket.on("call_ended", handleCallEnded.bind(null, "call_ended"));

    // CALL ERROR
    socket.on("call_error", (data) => {
      log.socketEvent("call_error", data);
      log.error("Call error received", data);
      socketEvents.emit("call_error", data);
    });

    // JOIN EXISTING CALL
    socket.on("join_existing_call", (data) => {
      log.socketEvent("join_existing_call", data);
      log.warn("There's already an active call");
      socketEvents.emit("join_existing_call", data);
    });

    // USER BUSY
    socket.on("user_is_busy_audio_call", (data) => {
      log.socketEvent("user_is_busy_audio_call", data);
      log.warn("User is busy for audio call");
      store.dispatch(CloseAudioNotificationDialog());
      socketEvents.emit("user_is_busy_audio_call", data);
    });

    // CALL ROOM
    socket.on("call_room_joined", (data) => {
      log.socketEvent("call_room_joined", data);
      log.success("Joined call room");
      socketEvents.emit("call_room_joined", data);
    });

    socket.on("user_joined_call", (data) => {
      log.socketEvent("user_joined_call", data);
      log.info("User joined call");
      socketEvents.emit("user_joined_call", data);
    });

    // WEBRTC SIGNALING
    socket.on("webrtc_offer", (data) => {
      log.socketEvent("webrtc_offer", {
        roomID: data.roomID,
        callId: data.callId,
        offerType: data.offer?.type,
      });
      socketEvents.emit("webrtc_offer", data);
    });

    socket.on("webrtc_answer", (data) => {
      log.socketEvent("webrtc_answer", {
        roomID: data.roomID,
        callId: data.callId,
        answerType: data.answer?.type,
      });
      socketEvents.emit("webrtc_answer", data);
    });

    socket.on("webrtc_ice_candidate", (data) => {
      log.socketEvent("webrtc_ice_candidate", {
        roomID: data.roomID,
        hasCandidate: !!data.candidate,
      });
      socketEvents.emit("webrtc_ice_candidate", data);
    });

    // CALL FEATURES
    socket.on("user_audio_mute_changed", (data) => {
      log.socketEvent("user_audio_mute_changed", data);
      socketEvents.emit("user_audio_mute_changed", data);
    });

    socket.on("user_video_changed", (data) => {
      log.socketEvent("user_video_changed", data);
      socketEvents.emit("user_video_changed", data);
    });

    socket.on("user_call_ready", (data) => {
      log.socketEvent("user_call_ready", data);
      socketEvents.emit("user_call_ready", data);
    });

    // VIDEO CALLS
    socket.on("video_call_notification", (data) => {
      log.socketEvent("video_call_notification", data);
      // Video call handling logic here
    });

    // ==================== CONNECTION EVENTS ====================

    socket.on("disconnect", (reason) => {
      log.error("Socket disconnected", { reason });

      // Cleanup all monitoring
      callMonitoring.activeCalls.forEach((call, roomID) => {
        cleanupCallMonitoring(roomID);
      });

      // Clear debounce map
      callMonitoring.eventDebounce.clear();
      callAcceptedHandled.clear();

      window.socket = null;
      socketEvents.emit("socket_disconnected", { reason });
    });

    socket.on("connect_error", (err) => {
      log.error("Socket connection error", err.message);
      socketEvents.emit("socket_error", { error: err });

      setTimeout(() => {
        if (!socket.connected) {
          log.info("Attempting to reconnect socket...");
          socket.connect();
        }
      }, 5000);
    });

    socket.on("reconnect", (attemptNumber) => {
      log.success(`Socket reconnected after ${attemptNumber} attempts`);
      socketEvents.emit("socket_reconnected", { attemptNumber });
    });

    socket.on("error", (error) => {
      log.error("Socket error", error);
      socketEvents.emit("socket_error", { error });
    });
  }

  return new Promise((resolve, reject) => {
    if (socket.connected) {
      log.success("Socket already connected");
      window.socket = socket;
      resolve(socket);
    } else {
      const timeout = setTimeout(() => {
        log.error("Socket connection timeout");
        reject(new Error("Socket connection timeout"));
        socketEvents.emit("socket_connect_timeout");
      }, 10000);

      socket.once("connect", () => {
        clearTimeout(timeout);
        log.success("Socket connected in promise");
        window.socket = socket;
        resolve(socket);
      });

      socket.once("connect_error", (error) => {
        clearTimeout(timeout);
        log.error("Socket connect error in promise", error);
        reject(error);
        socketEvents.emit("socket_connect_error", { error });
      });
    }
  });
};

// ==================== HELPER FUNCTIONS ====================
const cleanupCallMonitoring = (roomID) => {
  if (roomID && callMonitoring.activeCalls.has(roomID)) {
    const call = callMonitoring.activeCalls.get(roomID);
    if (call.interval) {
      clearInterval(call.interval);
    }
    callMonitoring.activeCalls.delete(roomID);
    callMonitoring.lastCallUpdate.delete(roomID);
    log.info(`Cleaned up monitoring for room ${roomID}`);
  }
};

export const isSocketAvailable = () => {
  const available = window.socket && window.socket.connected;
  log.debug(`isSocketAvailable: ${available}`);
  return available;
};

export const getSocket = () => {
  if (window.socket && window.socket.connected) {
    return window.socket;
  }
  if (socket && socket.connected) {
    window.socket = socket;
    return socket;
  }
  log.warn("getSocket: No connected socket found");
  return null;
};

export const safeEmit = (event, data, options = {}) => {
  const { retry = 2, timeout = 5000 } = options;
  const currentSocket = getSocket();

  if (!currentSocket || !currentSocket.connected) {
    log.error(`Cannot emit ${event}: Socket not connected`);
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    let attempts = 0;

    const tryEmit = () => {
      attempts++;
      log.info(`Emitting ${event} (attempt ${attempts}/${retry})`, data);

      const timeoutId = setTimeout(() => {
        if (attempts < retry) {
          log.warn(`${event} timeout, retrying...`);
          tryEmit();
        } else {
          log.error(`${event} failed after ${retry} attempts`);
          resolve(false);
        }
      }, timeout);

      currentSocket.emit(event, data, (ack) => {
        clearTimeout(timeoutId);
        log.success(`${event} acknowledged`, ack);
        resolve(true);
      });
    };

    tryEmit();
  });
};

// ==================== CALL FUNCTIONS ====================
export const startSocketAudioCall = (toUserId, roomID = null) => {
  log.info("startSocketAudioCall called", { toUserId, roomID });

  const currentUser = store.getState().auth.user;
  if (!currentUser) {
    log.error("No user logged in");
    return Promise.resolve(false);
  }

  const callData = {
    to: toUserId,
    roomID:
      roomID ||
      `audio_room_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
  };

  log.info("Emitting start_audio_call", callData);
  return safeEmit("start_audio_call", callData, { retry: 2 });
};

export const acceptSocketCall = (callId, roomID) => {
  log.info("acceptSocketCall called", { callId, roomID });

  // LUÔN LUÔN chỉ gửi roomID cho audio_call_accepted
  return safeEmit("audio_call_accepted", { roomID: roomID });
};

export const declineSocketCall = (callId, roomID) => {
  log.info("declineSocketCall called", { callId, roomID });

  // Chỉ gửi roomID cho audio_call_declined
  return safeEmit("audio_call_declined", { roomID: roomID });
};

export const endSocketCall = (callId, roomID) => {
  log.info("endSocketCall called", { callId, roomID });

  // Kiểm tra nếu callId là ObjectId hợp lệ
  const isValidObjectId = (id) =>
    id &&
    typeof id === "string" &&
    id.length === 24 &&
    /^[0-9a-fA-F]{24}$/.test(id);

  if (isValidObjectId(callId)) {
    return safeEmit("end_call", { roomID: roomID, callId: callId });
  } else {
    log.warn("Invalid ObjectId format, sending only roomID");
    return safeEmit("end_call", { roomID: roomID });
  }
};

export const joinCallRoom = (roomID, callId = null) => {
  log.info("joinCallRoom called", { roomID, callId });

  if (!callId || typeof callId !== "string") {
    return safeEmit("join_call_room", { roomID: roomID });
  }

  return safeEmit("join_call_room", { roomID, callId });
};

// ==================== UTILITY FUNCTIONS ====================
export const disconnectSocket = () => {
  if (socket) {
    log.info("Disconnecting socket...");

    // Cleanup tất cả monitoring
    callMonitoring.activeCalls.forEach((call, roomID) => {
      cleanupCallMonitoring(roomID);
    });

    // Clear maps
    callMonitoring.eventDebounce.clear();

    socket.disconnect();
    socket = null;
    window.socket = null;
    socketEvents.emit("socket_disconnected", { reason: "manual" });
  }
};

export const getSocketStatus = () => {
  const currentSocket = getSocket();
  const status = {
    status: "disconnected",
    connected: false,
    id: null,
  };

  if (currentSocket) {
    status.status = currentSocket.connected ? "connected" : "disconnected";
    status.connected = currentSocket.connected;
    status.id = currentSocket.id;
  }

  log.debug("Socket status", status);
  return status;
};

export const isValidCallId = (id) => {
  const valid =
    id &&
    typeof id === "string" &&
    id.length === 24 &&
    /^[0-9a-fA-F]{24}$/.test(id);
  log.debug(`isValidCallId: ${id} -> ${valid}`);
  return valid;
};

export const getCurrentCallId = () => {
  const state = store.getState();
  const callQueue = state.audioCall.call_queue;
  const callId =
    callQueue && callQueue.length > 0 ? callQueue[0]?.callId : null;
  log.debug(`getCurrentCallId: ${callId}`);
  return callId;
};

// Debug function
export const debugSocket = () => {
  console.group("🔍 SOCKET DEBUG INFO");
  console.log("Socket instance:", socket);
  console.log("Window.socket:", window.socket);
  console.log("Connected:", socket?.connected);
  console.log("ID:", socket?.id);
  console.log(
    "Active calls:",
    Array.from(callMonitoring.activeCalls.entries())
  );
  console.log("Event debounce map size:", callMonitoring.eventDebounce.size);
  console.groupEnd();
};

export default socket;
export { socket };
