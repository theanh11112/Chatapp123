import { useCallback, useRef, useMemo } from "react";
import { getSocket } from "../../../../socket";
import { createMethodLogger } from "../utils/audioCallLogger";
import {
  SOCKET_EVENTS,
  DEBUG_SOCKET_EVENTS,
} from "../constants/audioCallConstants";
import webRTCService from "../../../../services/webRTCService";

export const useSocketListeners = (
  currentCall,
  userID,
  username,
  dependencies = {}
) => {
  const logger = createMethodLogger("useSocketListeners");
  const loggerRef = useRef(logger);

  const socketListenersRef = useRef([]);
  const originalEmitRef = useRef(null);
  const currentRoomIdRef = useRef(null);
  const handlersRef = useRef({});

  // Memoize handlers
  const memoizedHandlers = useMemo(
    () => ({
      handleWebRTCOffer: dependencies.handleWebRTCOffer,
      handleWebRTCAnswer: dependencies.handleWebRTCAnswer,
      handleWebRTCIceCandidate: dependencies.handleWebRTCIceCandidate,
      handleAudioCallAccepted: dependencies.handleAudioCallAccepted,
      handleCallEnded: dependencies.handleCallEnded,
      handleCallRoomJoined: dependencies.handleCallRoomJoined,
      handleUserJoinedCall: dependencies.handleUserJoinedCall,
    }),
    [
      dependencies.handleWebRTCOffer,
      dependencies.handleWebRTCAnswer,
      dependencies.handleWebRTCIceCandidate,
      dependencies.handleAudioCallAccepted,
      dependencies.handleCallEnded,
      dependencies.handleCallRoomJoined,
      dependencies.handleUserJoinedCall,
    ]
  );

  // Update ref khi handlers thay đổi
  useMemo(() => {
    handlersRef.current = memoizedHandlers;
  }, [memoizedHandlers]);

  // WebRTC signaling handler
  const handleWebRTCSignaling = useCallback(async (data, type) => {
    const currentLogger = loggerRef.current;

    try {
      currentLogger.info(`📞 Handling ${type}`, {
        roomID: data.roomID,
        currentRoomID: currentRoomIdRef.current,
        match: data.roomID === currentRoomIdRef.current,
        from: data.from,
        hasData: !!data[type],
      });

      if (data.roomID !== currentRoomIdRef.current) {
        currentLogger.warn(`⚠️ ${type} not for current room`, {
          targetRoom: data.roomID,
          ourRoom: currentRoomIdRef.current,
        });
        return;
      }

      if (!webRTCService.hasActiveRoom()) {
        currentLogger.warn(`⚠️ No active WebRTC room for ${type}`);
        return;
      }

      switch (type) {
        case "offer":
          await webRTCService.handleOffer(data.offer);
          currentLogger.success("✅ WebRTC offer handled");
          break;

        case "answer":
          await webRTCService.handleAnswer(data.answer);
          currentLogger.success("✅ WebRTC answer handled");
          break;

        case "ice-candidate":
          await webRTCService.addIceCandidate(data.candidate);
          currentLogger.debug("✅ ICE candidate added");
          break;

        default:
          currentLogger.warn(`Unknown signaling type: ${type}`);
      }
    } catch (error) {
      loggerRef.current.error(`❌ Failed to handle ${type}`, error);
    }
  }, []);

  // 🔴 QUAN TRỌNG: onAudioCallAccepted handler đã sửa
  const onAudioCallAccepted = useCallback(
    (data) => {
      const currentLogger = loggerRef.current;

      currentLogger.info("🎉 Audio call accepted event received", {
        roomID: data.roomID,
        currentRoomID: currentRoomIdRef.current,
        acceptedBy: data.acceptedBy,
        isIncomingCall: currentCall?.incoming,
        callerId: data.callerId,
        shouldHandle: !currentCall?.incoming,
      });

      // QUAN TRỌNG: Chỉ xử lý nếu là outgoing call (người gọi)
      if (data.roomID === currentRoomIdRef.current && !currentCall?.incoming) {
        currentLogger.success("✅ Our call was accepted by the recipient!");

        // Cập nhật UI thông qua callbacks
        const handler = handlersRef.current.handleAudioCallAccepted;
        if (handler) {
          handler(data);
        }

        // Auto-send WebRTC offer sau khi accepted
        setTimeout(async () => {
          try {
            if (webRTCService.hasActiveRoom()) {
              currentLogger.info("Sending WebRTC offer after acceptance...");
              await webRTCService.createAndSendOffer();
              currentLogger.success("✅ WebRTC offer sent after acceptance");
            } else {
              currentLogger.warn("No active WebRTC room to send offer");
            }
          } catch (error) {
            currentLogger.error(
              "❌ Failed to send offer after acceptance",
              error
            );
          }
        }, 500);
      } else if (
        data.roomID === currentRoomIdRef.current &&
        currentCall?.incoming
      ) {
        currentLogger.info("👂 We accepted the call, waiting for WebRTC offer");
      } else {
        currentLogger.warn("Audio call accepted event not for us", {
          eventRoom: data.roomID,
          ourRoom: currentRoomIdRef.current,
          ourCallType: currentCall?.incoming ? "incoming" : "outgoing",
        });
      }
    },
    [currentCall?.incoming]
  );

  // WebRTC offer handler
  const onWebRTCOffer = useCallback(
    async (data) => {
      const currentLogger = loggerRef.current;

      currentLogger.info("📨 Received WebRTC offer", {
        roomID: data.roomID,
        currentRoomID: currentRoomIdRef.current,
        from: data.from,
        hasOffer: !!data.offer,
      });

      if (data.roomID === currentRoomIdRef.current) {
        try {
          await handleWebRTCSignaling(data, "offer");

          // Notify parent component
          const handler = handlersRef.current.handleWebRTCOffer;
          if (handler) {
            handler(data);
          }
        } catch (error) {
          currentLogger.error("Failed to handle WebRTC offer", error);
        }
      }
    },
    [handleWebRTCSignaling]
  );

  // WebRTC answer handler
  const onWebRTCAnswer = useCallback(
    async (data) => {
      const currentLogger = loggerRef.current;

      currentLogger.info("📨 Received WebRTC answer", {
        roomID: data.roomID,
        currentRoomID: currentRoomIdRef.current,
        from: data.from,
        hasAnswer: !!data.answer,
      });

      if (data.roomID === currentRoomIdRef.current) {
        try {
          await handleWebRTCSignaling(data, "answer");

          // QUAN TRỌNG: Khi nhận answer, call đã connected
          currentLogger.success("🎉 Call connected - WebRTC answer received!");

          const handler = handlersRef.current.handleWebRTCAnswer;
          if (handler) {
            handler(data);
          }
        } catch (error) {
          currentLogger.error("Failed to handle WebRTC answer", error);
        }
      }
    },
    [handleWebRTCSignaling]
  );

  // ICE candidate handler
  const onWebRTCIceCandidate = useCallback(
    async (data) => {
      const currentLogger = loggerRef.current;

      currentLogger.debug("Received ICE candidate", {
        roomID: data.roomID,
        currentRoomID: currentRoomIdRef.current,
        from: data.from,
        hasCandidate: !!data.candidate,
      });

      if (data.roomID === currentRoomIdRef.current) {
        try {
          await handleWebRTCSignaling(data, "ice-candidate");

          const handler = handlersRef.current.handleWebRTCIceCandidate;
          if (handler) {
            handler(data);
          }
        } catch (error) {
          currentLogger.error("Failed to handle ICE candidate", error);
        }
      }
    },
    [handleWebRTCSignaling]
  );

  // Call room joined handler
  const onCallRoomJoined = useCallback((data) => {
    const currentLogger = loggerRef.current;

    currentLogger.info("🚪 Joined call room", {
      roomID: data.roomID,
      success: data.success,
      action: data.action,
      currentRoomID: currentRoomIdRef.current,
    });

    // Khi join room thành công, cập nhật current room
    if (data.roomID === currentRoomIdRef.current && data.success) {
      currentLogger.success("✅ Successfully joined call room");

      const handler = handlersRef.current.handleCallRoomJoined;
      if (handler) {
        handler(data);
      }
    }
  }, []);

  // User joined call handler
  const onUserJoinedCall = useCallback((data) => {
    const currentLogger = loggerRef.current;

    currentLogger.info("👤 User joined call", {
      userId: data.userId,
      roomID: data.roomID,
      currentRoomID: currentRoomIdRef.current,
    });

    if (data.roomID === currentRoomIdRef.current) {
      currentLogger.debug("Another user joined our call room");

      const handler = handlersRef.current.handleUserJoinedCall;
      if (handler) {
        handler(data);
      }
    }
  }, []);

  // Call ended handler
  const onCallEnded = useCallback(
    (data) => {
      const currentLogger = loggerRef.current;

      currentLogger.info("📴 Call ended remotely", {
        roomID: data.roomID,
        callId: data.callId,
        currentRoomID: currentRoomIdRef.current,
        currentCallId: currentCall?.id,
        endedBy: data.endedBy,
      });

      if (
        data.roomID === currentRoomIdRef.current ||
        data.callId === currentCall?.id
      ) {
        currentLogger.info("Our call was ended remotely");

        const handler = handlersRef.current.handleCallEnded;
        if (handler) {
          handler(data);
        }
      }
    },
    [currentCall?.id]
  );

  const setupSocketListeners = useCallback(
    (handlers = {}) => {
      const socket = getSocket();

      if (socketListenersRef.current.length > 0) {
        logger.warn("Listeners already set up, cleaning up first");
        cleanupSocketListeners();
      }

      if (!socket || !currentCall?.roomID) {
        logger.warn("No socket or roomID for listeners");
        return () => {};
      }

      // Cập nhật current room ID
      currentRoomIdRef.current = currentCall.roomID;

      logger.info("Setting up socket listeners for call", {
        roomID: currentCall.roomID,
        socketId: socket.id,
        callId: currentCall.id,
        incoming: currentCall.incoming,
        isInitiator: !currentCall.incoming,
        userId: userID,
      });

      // Debug logging for socket emits
      if (DEBUG_SOCKET_EVENTS) {
        originalEmitRef.current = socket.emit.bind(socket);
        socket.emit = (eventName, ...args) => {
          if (
            eventName.includes("call") ||
            eventName.includes("audio") ||
            eventName.includes("webrtc") ||
            eventName.includes("join") ||
            eventName.includes("leave")
          ) {
            logger.debug(`EMIT: ${eventName}`, args);
          }
          return originalEmitRef.current(eventName, ...args);
        };
      }

      // Update handlers ref với custom handlers
      if (handlers) {
        handlersRef.current = { ...handlersRef.current, ...handlers };
      }

      // Register all listeners
      socket.on(SOCKET_EVENTS.WEBRTC_OFFER, onWebRTCOffer);
      socket.on(SOCKET_EVENTS.WEBRTC_ANSWER, onWebRTCAnswer);
      socket.on(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, onWebRTCIceCandidate);
      socket.on(SOCKET_EVENTS.AUDIO_CALL_ACCEPTED, onAudioCallAccepted);
      socket.on(SOCKET_EVENTS.CALL_ACCEPTED, onAudioCallAccepted);
      socket.on("call_room_joined", onCallRoomJoined);
      socket.on("user_joined_call", onUserJoinedCall);
      socket.on(SOCKET_EVENTS.AUDIO_CALL_ENDED, onCallEnded);
      socket.on(SOCKET_EVENTS.CALL_ENDED, onCallEnded);

      // Store listeners for cleanup
      socketListenersRef.current = [
        { event: SOCKET_EVENTS.WEBRTC_OFFER, handler: onWebRTCOffer },
        { event: SOCKET_EVENTS.WEBRTC_ANSWER, handler: onWebRTCAnswer },
        {
          event: SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE,
          handler: onWebRTCIceCandidate,
        },
        {
          event: SOCKET_EVENTS.AUDIO_CALL_ACCEPTED,
          handler: onAudioCallAccepted,
        },
        { event: SOCKET_EVENTS.CALL_ACCEPTED, handler: onAudioCallAccepted },
        { event: "call_room_joined", handler: onCallRoomJoined },
        { event: "user_joined_call", handler: onUserJoinedCall },
        { event: SOCKET_EVENTS.AUDIO_CALL_ENDED, handler: onCallEnded },
        { event: SOCKET_EVENTS.CALL_ENDED, handler: onCallEnded },
      ];

      logger.success("Socket listeners registered", {
        count: socketListenersRef.current.length,
        roomID: currentRoomIdRef.current,
        events: socketListenersRef.current.map((l) => l.event),
      });

      // Return cleanup function
      return () => {
        logger.info("Cleaning up socket listeners", {
          roomID: currentRoomIdRef.current,
        });
        cleanupSocketListeners();
      };
    },
    [
      currentCall?.roomID,
      currentCall?.id,
      currentCall?.incoming,
      userID,
      logger,
      onWebRTCOffer,
      onWebRTCAnswer,
      onWebRTCIceCandidate,
      onAudioCallAccepted,
      onCallRoomJoined,
      onUserJoinedCall,
      onCallEnded,
    ]
  );

  const cleanupSocketListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;

    logger.info("Cleaning up all socket listeners");

    // Remove all listeners
    socketListenersRef.current.forEach(({ event, handler }) => {
      try {
        socket.off(event, handler);
        logger.debug(`Removed listener for: ${event}`);
      } catch (error) {
        logger.error(`Error removing listener for ${event}`, error);
      }
    });

    socketListenersRef.current = [];
    currentRoomIdRef.current = null;

    // Restore original emit
    if (DEBUG_SOCKET_EVENTS && originalEmitRef.current) {
      socket.emit = originalEmitRef.current;
    }

    logger.success("Socket listeners cleaned up");
  }, [logger]);

  // Join call room function
  const joinCallRoom = useCallback(
    async (roomID) => {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }

      logger.info("Joining call room", { roomID });

      return new Promise((resolve, reject) => {
        socket
          .timeout(5000)
          .emit("join_call_room", { roomID }, (err, response) => {
            if (err) {
              logger.error("Failed to join room", err);
              reject(new Error(`Failed to join room: ${err.message}`));
            } else {
              logger.success("✅ Joined call room", { roomID, response });
              currentRoomIdRef.current = roomID;
              resolve(response);
            }
          });
      });
    },
    [logger]
  );

  // Leave call room function
  const leaveCallRoom = useCallback(
    async (roomID) => {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        return;
      }

      logger.info("Leaving call room", { roomID });

      return new Promise((resolve) => {
        socket.timeout(3000).emit("leave_call_room", { roomID }, () => {
          if (currentRoomIdRef.current === roomID) {
            currentRoomIdRef.current = null;
          }
          logger.debug("Left call room", { roomID });
          resolve();
        });
      });
    },
    [logger]
  );

  return {
    setupSocketListeners,
    cleanupSocketListeners,
    joinCallRoom,
    leaveCallRoom,
    socketListenersRef,
    currentRoomIdRef,
  };
};
