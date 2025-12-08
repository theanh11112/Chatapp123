// src/socket.js - COMPLETE FIXED VERSION WITH E2EE INTEGRATION
import { io } from "socket.io-client";
import { EventEmitter } from "events";
import { store } from "./redux/store";
import {
  updateUserPresence,
  addDirectMessage,
  addGroupMessage,
  updateDirectMessage,
  processEncryptedMessage,
  updateDecryptedMessage,
} from "./redux/slices/conversation";
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
import { FetchCallLogs, showSnackbar } from "./redux/slices/app";

let socket = null;
export const socketEvents = new EventEmitter();

const DEBUG = true;
const LOG_PREFIX = "🔌 [SOCKET]";

const callMonitoring = {
  activeCalls: new Map(),
  lastCallUpdate: new Map(),
  eventDebounce: new Map(),
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

// ==================== E2EE UTILITIES ====================
let e2eeService = null;

// Lazy load E2EE service
const getE2EEService = async () => {
  if (!e2eeService) {
    try {
      const module = await import("./e2ee/utils/e2ee.js");
      e2eeService = module.default;
      log.success("E2EE service loaded");
    } catch (error) {
      log.error("Failed to load E2EE service", error);
      e2eeService = {
        hasKeyPair: () => false,
        decryptMessage: () =>
          Promise.reject(new Error("E2EE service not available")),
      };
    }
  }
  return e2eeService;
};

// Helper: Xử lý encrypted message
const handleEncryptedMessage = async (data, messageType = "direct") => {
  try {
    log.info(`🔐 Handling encrypted ${messageType} message`, {
      messageId: data._id || data.id,
      from: data.sender?.username || data.from,
      hasCiphertext: !!data.ciphertext,
      hasKeyId: !!data.keyId,
    });

    // 1. Chuẩn bị message data
    const currentUser = store.getState().auth.user;
    const currentUserId =
      currentUser?.keycloakId || store.getState().auth.user_id;
    const isOwnMessage =
      data.from === currentUserId || data.sender?.keycloakId === currentUserId;

    // 2. Tạo message object
    const messageData = {
      id: data._id || data.id,
      _id: data._id || data.id,
      type: "msg",
      subtype: data.type || "text",
      message: "🔒 Encrypted message",
      content: "🔒 Encrypted message",
      incoming: !isOwnMessage,
      outgoing: isOwnMessage,
      time: formatMessageTime(data.createdAt || new Date()),
      createdAt: data.createdAt || new Date(),
      attachments: data.attachments || [],
      sender: data.sender || {
        keycloakId: data.from,
        username: data.senderName || "Unknown",
      },
      replyTo: data.replyTo,
      isEncrypted: true,
      ciphertext: data.ciphertext,
      iv: data.iv,
      keyId: data.keyId,
      encryptionStatus: "encrypted",
      isDecrypted: false,
      isOptimistic: false,
    };

    // 3. Dispatch vào Redux
    if (messageType === "group") {
      store.dispatch(
        addGroupMessage({
          message: messageData,
          room_id: data.room || data.roomId,
          isOptimistic: false,
        })
      );
    } else {
      const conversation_id = data.conversation_id || data.room || data.roomId;
      if (conversation_id) {
        store.dispatch(
          addDirectMessage({
            message: messageData,
            conversation_id,
            currentUserId,
            isGroup: false,
            isOptimistic: false,
          })
        );
      }
    }

    // 4. TỰ ĐỘNG decrypt nếu có thể
    if (!isOwnMessage && data.ciphertext && data.iv && data.keyId) {
      setTimeout(async () => {
        try {
          const service = await getE2EEService();

          // Chỉ decrypt nếu đã có key pair
          if (service.hasKeyPair()) {
            log.info("🔓 Auto-decrypting message...");

            // TODO: Thực hiện decryption
            // const decrypted = await service.decryptMessage(...);
            // store.dispatch(updateDecryptedMessage(...));
          }
        } catch (decryptError) {
          log.warn("⚠️ Auto-decryption failed:", decryptError.message);
        }
      }, 1000);
    }

    // 5. Emit event cho components
    socketEvents.emit("encrypted_message_received", {
      message: messageData,
      type: messageType,
      shouldDecrypt: !isOwnMessage,
    });
  } catch (error) {
    log.error("❌ Error handling encrypted message:", error);
  }
};

// ==================== DEBOUNCE UTILITY ====================
const debounceEvent = (eventName, data, timeout = 1000) => {
  const key = `${eventName}_${
    data.roomID || data.callId || data._id || "global"
  }`;
  const now = Date.now();
  const lastEvent = callMonitoring.eventDebounce.get(key);

  if (lastEvent && now - lastEvent < timeout) {
    log.warn(`Debounced duplicate event: ${eventName}`, { key });
    return true;
  }

  callMonitoring.eventDebounce.set(key, now);
  setTimeout(() => callMonitoring.eventDebounce.delete(key), timeout + 100);
  return false;
};

// ==================== LAZY IMPORT FOR NOTIFICATION SERVICE ====================
let notificationService = null;
const getNotificationService = async () => {
  if (!notificationService) {
    try {
      const module = await import("./services/notificationService");
      notificationService = module.default;
      log.success("Notification service loaded");
    } catch (error) {
      log.error("Failed to load notification service", error);
      notificationService = {
        showMessageNotification: () =>
          log.warn("Notification service not available"),
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
          features: "e2ee_enabled",
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

    // 1. CONNECT EVENT
    socket.on("connect", () => {
      log.success("Socket connected", {
        id: socket.id,
        connected: socket.connected,
      });

      // Emit client info
      socket.emit("client_info", {
        platform: "web",
        version: "1.0.0",
        userAgent: navigator.userAgent,
        e2eeSupported: true,
      });

      // Assign to window
      window.socket = socket;
      log.success("Socket assigned to window.socket");

      // Emit ready event
      socketEvents.removeAllListeners("socket_ready");
      socketEvents.emit("socket_ready", socket);

      // Dispatch custom event
      window.dispatchEvent(
        new CustomEvent("socket:connected", {
          detail: { socketId: socket.id },
        })
      );

      // Auto-initialize E2EE sau khi connect
      setTimeout(() => {
        socketEvents.emit("socket_connected_for_e2ee");
      }, 500);
    });

    // 2. PRESENCE UPDATES
    socket.on("presence_update", (data) => {
      if (debounceEvent("presence_update", data)) return;

      log.socketEvent("presence_update", data);
      store.dispatch(updateUserPresence(data));
    });

    // 3. DIRECT MESSAGES
    const setupMessageHandler = (event, type) => {
      socket.on(event, async (data) => {
        if (debounceEvent(event, data)) return;

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

        // Hiển thị notification nếu không phải tin nhắn của mình
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

        // Emit new message event
        socketEvents.emit("new_message", { type, data });
      });
    };

    // Register message handlers
    setupMessageHandler("text_message", "direct");
    setupMessageHandler("text_message_reply", "reply");
    setupMessageHandler("new_group_message", "group");

    // 4. E2EE SPECIFIC EVENTS - QUAN TRỌNG!

    // 4.1 Encrypted direct message
    socket.on("encrypted_message", (data) => {
      if (debounceEvent("encrypted_message", data)) return;

      log.socketEvent("encrypted_message", data);
      handleEncryptedMessage(data, "direct");
    });

    // 4.2 Encrypted group message
    socket.on("encrypted_group_message", (data) => {
      if (debounceEvent("encrypted_group_message", data)) return;

      log.socketEvent("encrypted_group_message", data);
      handleEncryptedMessage(data, "group");
    });

    // 4.3 Key exchange request
    socket.on("key_exchange_request", (data) => {
      if (debounceEvent("key_exchange_request", data)) return;

      log.socketEvent("key_exchange_request", data);

      // Store trong Redux hoặc local state
      store.dispatch(
        showSnackbar({
          severity: "info",
          message: `🔐 Key exchange request from ${data.username || "friend"}`,
          autoHideDuration: 8000,
          action: (
            <button
              onClick={() => {
                socket.emit("confirm_key_exchange", {
                  exchangeId: data.exchangeId,
                  peerId: data.from,
                  verified: true,
                });
              }}
              style={{
                color: "#fff",
                background: "none",
                border: "none",
                cursor: "pointer",
                marginLeft: "8px",
                fontWeight: "bold",
              }}
            >
              ACCEPT
            </button>
          ),
        })
      );

      socketEvents.emit("e2ee_key_exchange_request", data);
    });

    // 4.4 Key exchange confirmed
    socket.on("key_exchange_confirmed", (data) => {
      if (debounceEvent("key_exchange_confirmed", data)) return;

      log.socketEvent("key_exchange_confirmed", data);

      store.dispatch(
        showSnackbar({
          severity: "success",
          message: `✅ End-to-end encryption established with ${
            data.username || "friend"
          }`,
        })
      );

      socketEvents.emit("e2ee_key_exchange_confirmed", data);
    });

    // 4.5 Friend E2EE status changed
    socket.on("friend_e2ee_status_changed", (data) => {
      if (debounceEvent("friend_e2ee_status_changed", data)) return;

      log.socketEvent("friend_e2ee_status_changed", data);

      const message = data.enabled
        ? `🔐 ${data.username} enabled end-to-end encryption`
        : `🔓 ${data.username} disabled end-to-end encryption`;

      store.dispatch(
        showSnackbar({
          severity: data.enabled ? "info" : "warning",
          message,
        })
      );

      socketEvents.emit("e2ee_friend_status_changed", data);
    });

    // 4.6 Friend key updated
    socket.on("friend_e2ee_key_updated", (data) => {
      if (debounceEvent("friend_e2ee_key_updated", data)) return;

      log.socketEvent("friend_e2ee_key_updated", data);

      store.dispatch(
        showSnackbar({
          severity: "info",
          message: `🔑 ${data.username} updated encryption key`,
        })
      );

      socketEvents.emit("e2ee_friend_key_updated", data);
    });

    // 4.7 E2EE error events
    socket.on("e2ee_error", (data) => {
      log.socketEvent("e2ee_error", data);

      store.dispatch(
        showSnackbar({
          severity: "error",
          message: `🔐 Encryption error: ${data.message || "Unknown error"}`,
        })
      );

      socketEvents.emit("e2ee_error", data);
    });

    // 5. CALL EVENT HANDLERS (giữ nguyên)

    // 5.1 Audio call notification
    socket.on("audio_call_notification", (data) => {
      if (debounceEvent("audio_call_notification", data)) return;

      log.socketEvent("audio_call_notification", data);

      if (!data || typeof data !== "object") {
        log.error("Invalid notification data", data);
        return;
      }

      const currentUser = store.getState().auth.user;
      const currentUserId =
        currentUser?.keycloakId || store.getState().auth.user_id;

      const isForMe =
        data.to === currentUserId ||
        (data.toUser && data.toUser.keycloakId === currentUserId);

      if (!isForMe) {
        log.warn("Call not for me", { expected: currentUserId, got: data.to });
        return;
      }

      log.success("This call is for me!");

      // Prepare call data
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

      store.dispatch(
        PushToAudioCallQueue({
          call: callData,
          incoming: true,
        })
      );
    });

    // ==================== SOCKET EVENT HANDLERS ====================

    // Thêm vào phần audio call notification

    // 🔴 THÊM: Khi người gọi nhận được thông báo caller đã bắt máy
    // socket.on("call_accepted_by_callee", (data) => {
    //   if (debounceEvent("call_accepted_by_callee", data)) return;

    //   log.socketEvent("call_accepted_by_callee", data);

    //   // Emit event cho component xử lý
    //   socketEvents.emit("call_accepted_by_callee", data);

    //   // Show notification
    //   store.dispatch(
    //     showSnackbar({
    //       severity: "success",
    //       message: `${data.calleeId} accepted your call`,
    //     })
    //   );
    // });

    // // 🔴 THÊM: Khi người nhận xác nhận đã gửi answer thành công
    // socket.on("call_answer_complete", (data) => {
    //   if (debounceEvent("call_answer_complete", data)) return;

    //   log.socketEvent("call_answer_complete", data);

    //   // Emit event cho component
    //   socketEvents.emit("call_answer_complete", data);

    //   if (data.success) {
    //     log.success("Call answer sent successfully");
    //   }
    // });

    // 🔴 THÊM: Event mới - khi caller tạo cuộc gọi thành công
    socket.on("audio_call_started", (data) => {
      if (debounceEvent("audio_call_started", data)) return;

      log.socketEvent("audio_call_started", data);

      // Emit event để component AudioCallDialog cập nhật callId
      socketEvents.emit("audio_call_started_from_server", data);
    });

    // 🔴 THÊM: WebRTC answer (đã có nhưng cần log chi tiết)
    socket.on("webrtc_answer", (data) => {
      log.socketEvent("webrtc_answer", {
        roomID: data.roomID,
        callId: data.callId,
        answerType: data.answer?.type,
        from: data.from,
        hasAnswer: !!data.answer,
      });

      // QUAN TRỌNG: Check if answer is for current call
      const currentCall = store.getState().audioCall.call_queue[0];
      if (currentCall && data.roomID === currentCall.roomID) {
        log.success("✅ Received WebRTC answer for current call!");

        // Emit cho WebRTC handler
        socketEvents.emit("webrtc_answer", data);

        // Also show notification
        store.dispatch(
          showSnackbar({
            severity: "success",
            message: "Connected to callee",
          })
        );
      } else {
        log.warn("⚠️ WebRTC answer not for current call", {
          answerRoomID: data.roomID,
          currentRoomID: currentCall?.roomID,
        });
      }
    });
    // 5.2 Audio call started
    socket.on("audio_call_started", (data) => {
      log.socketEvent("audio_call_started", data);
      socketEvents.emit("audio_call_started", data);
    });

    // ==================== FIX: THÊM EVENT HANDLERS BỊ THIẾU ====================

    // 1. Audio call accepted success (server confirmation)
    socket.on("audio_call_accepted_success", (data) => {
      if (debounceEvent("audio_call_accepted_success", data)) return;

      log.socketEvent("audio_call_accepted_success", data);
      console.log("✅ Audio call accept confirmed by server", data);

      // Emit để component biết accept đã thành công
      socketEvents.emit("audio_call_accepted_success", data);
    });

    // 2. Video call accepted success
    socket.on("video_call_accepted_success", (data) => {
      if (debounceEvent("video_call_accepted_success", data)) return;

      log.socketEvent("video_call_accepted_success", data);
      log.success("✅ Video call accept confirmed by server", data);

      socketEvents.emit("video_call_accepted_success", data);
    });

    // 3. Call metrics (server gửi thông tin metrics)
    socket.on("call_metrics", (data) => {
      log.socketEvent("call_metrics", data);

      // Log metrics cho debug
      if (DEBUG) {
        console.log(`📊 Call Metrics: ${data.action} - ${data.type} call`, {
          callId: data.callId,
          from: data.from,
          to: data.to,
          roomID: data.roomID,
          success: data.success,
        });
      }

      socketEvents.emit("call_metrics", data);
    });

    // 4. Video call started
    socket.on("video_call_started", (data) => {
      if (debounceEvent("video_call_started", data)) return;

      log.socketEvent("video_call_started", data);
      log.success("🎬 Video call started", data);

      // Emit event cho component VideoCallDialog
      socketEvents.emit("video_call_started_from_server", data);
    });

    // 5. Video call accepted
    socket.on("video_call_accepted", (data) => {
      handleCallAccepted("video_call_accepted", data, false); // false = not audio call
    });

    // 6. Video call declined
    socket.on("video_call_declined", (data) => {
      handleCallDeclined("video_call_declined", data);
    });

    // 7. Video call ended
    socket.on("video_call_ended", (data) => {
      handleCallEnded("video_call_ended", data);
    });

    // 5.3 Call accepted handlers
    let callAcceptedHandled = new Set();

    const handleCallAccepted = (eventName, data, isAudioCall = true) => {
      if (debounceEvent(eventName, data)) return;

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

      if (isAudioCall) {
        store.dispatch(setAudioCallActive(true));
      } else {
        store.dispatch(setCallActive(true));
      }

      // 🎯 FIX: CHỈ tạo interval nếu chưa có
      if (data.roomID && !callMonitoring.activeCalls.has(data.roomID)) {
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

    socket.on("audio_call_accepted", (data) => {
      handleCallAccepted("audio_call_accepted", data, true);
    });

    socket.on("call_accepted", (data) => {
      handleCallAccepted("call_accepted", data, false);
    });

    // 5.4 Call declined handlers
    const handleCallDeclined = (eventName, data) => {
      if (debounceEvent(eventName, data)) return;

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

    // 5.5 Call ended handlers
    const handleCallEnded = (eventName, data) => {
      if (debounceEvent(eventName, data)) return;

      log.socketEvent(eventName, data);
      log.info("Call ended");

      cleanupCallMonitoring(data.roomID);
      store.dispatch(resetAudioCallQueue());

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

    // 5.6 Other call events (giữ nguyên)
    socket.on("call_error", (data) => {
      log.socketEvent("call_error", data);
      socketEvents.emit("call_error", data);
    });

    socket.on("join_existing_call", (data) => {
      log.socketEvent("join_existing_call", data);
      socketEvents.emit("join_existing_call", data);
    });

    socket.on("user_is_busy_audio_call", (data) => {
      log.socketEvent("user_is_busy_audio_call", data);
      store.dispatch(CloseAudioNotificationDialog());
      socketEvents.emit("user_is_busy_audio_call", data);
    });

    socket.on("call_room_joined", (data) => {
      log.socketEvent("call_room_joined", data);
      socketEvents.emit("call_room_joined", data);
    });

    socket.on("user_joined_call", (data) => {
      log.socketEvent("user_joined_call", data);
      socketEvents.emit("user_joined_call", data);
    });

    // WebRTC signaling
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

    // Call features
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

    // Video calls
    socket.on("video_call_notification", (data) => {
      log.socketEvent("video_call_notification", data);
      // Video call handling logic
    });

    // 6. CONNECTION EVENTS

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

      // Auto-reinitialize E2EE after reconnect
      setTimeout(() => {
        socketEvents.emit("socket_reconnected_for_e2ee");
      }, 1000);
    });

    socket.on("error", (error) => {
      log.error("Socket error", error);
      socketEvents.emit("socket_error", { error });
    });

    // 7. E2EE HEALTH CHECK
    socket.on("e2ee_health_check", (data) => {
      log.socketEvent("e2ee_health_check", data);
      socketEvents.emit("e2ee_health_status", data);
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

const formatMessageTime = (timestamp) => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch (error) {
    return new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }
};

// ==================== EXPORTED FUNCTIONS ====================
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

// ==================== E2EE SPECIFIC EMITTERS ====================

/**
 * Gửi encrypted message
 */
export const emitEncryptedMessage = (data) => {
  return safeEmit("send_encrypted_message", data, {
    retry: 3,
    timeout: 8000,
  });
};

/**
 * Initiate key exchange
 */
export const emitKeyExchange = (peerId) => {
  return safeEmit("initiate_key_exchange", { peerId });
};

/**
 * Confirm key exchange
 */
export const emitConfirmKeyExchange = (exchangeId, peerId, verified = true) => {
  return safeEmit("confirm_key_exchange", {
    exchangeId,
    peerId,
    verified,
  });
};

/**
 * Update E2EE key
 */
export const emitUpdateE2EEKey = (publicKey, keyType = "ecdh") => {
  return safeEmit("update_e2ee_key", {
    publicKey,
    keyType,
  });
};

/**
 * Toggle E2EE status
 */
export const emitToggleE2EE = (enabled) => {
  return safeEmit("toggle_e2ee", { enabled });
};

/**
 * Get E2EE info
 */
export const emitGetE2EEInfo = () => {
  return new Promise((resolve) => {
    const currentSocket = getSocket();
    if (!currentSocket) {
      resolve({ success: false, error: "No socket" });
      return;
    }

    currentSocket.emit("get_e2ee_info", {}, (response) => {
      resolve(response);
    });
  });
};

// ==================== CALL FUNCTIONS (giữ nguyên) ====================
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
  return safeEmit("audio_call_accepted", { roomID: roomID });
};

export const declineSocketCall = (callId, roomID) => {
  log.info("declineSocketCall called", { callId, roomID });
  return safeEmit("audio_call_declined", { roomID: roomID });
};

export const endSocketCall = (callId, roomID) => {
  log.info("endSocketCall called", { callId, roomID });

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

    callMonitoring.activeCalls.forEach((call, roomID) => {
      cleanupCallMonitoring(roomID);
    });

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

// ==================== E2EE SPECIFIC FUNCTIONS ====================

/**
 * Check if socket is ready for E2EE operations
 */
export const isSocketReadyForE2EE = () => {
  const currentSocket = getSocket();
  const ready = currentSocket && currentSocket.connected;

  if (!ready) {
    log.warn("Socket not ready for E2EE operations");
  }

  return ready;
};

/**
 * Get E2EE socket events emitter
 */
export const getE2EESocketEvents = () => {
  return {
    on: (event, handler) => socketEvents.on(`e2ee_${event}`, handler),
    off: (event, handler) => socketEvents.off(`e2ee_${event}`, handler),
    emit: (event, data) => socketEvents.emit(`e2ee_${event}`, data),
  };
};

export default socket;
export { socket };
