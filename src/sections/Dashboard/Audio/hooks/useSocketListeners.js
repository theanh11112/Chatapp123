import { useCallback, useRef, useMemo } from "react";
import { getSocket } from "../../../../socket";
import { createMethodLogger } from "../utils/audioCallLogger";
import {
  SOCKET_EVENTS,
  DEBUG_SOCKET_EVENTS,
} from "../constants/audioCallConstants";

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

  // 🔴 FIX: Thêm ref để tracking roomID hiện tại
  const currentRoomIdRef = useRef(null);

  // Cache handlers trong ref để tránh dependency cycle
  const handlersRef = useRef({});

  // 🔴 FIX: Sử dụng useMemo đúng cách
  const memoizedHandlers = useMemo(
    () => ({
      handleWebRTCOffer: dependencies.handleWebRTCOffer,
      handleWebRTCAnswer: dependencies.handleWebRTCAnswer,
      handleWebRTCIceCandidate: dependencies.handleWebRTCIceCandidate,
      handleAudioCallAccepted: dependencies.handleAudioCallAccepted,
      handleCallEnded: dependencies.handleCallEnded,
    }),
    [
      dependencies.handleWebRTCOffer,
      dependencies.handleWebRTCAnswer,
      dependencies.handleWebRTCIceCandidate,
      dependencies.handleAudioCallAccepted,
      dependencies.handleCallEnded,
    ]
  );

  // Update ref khi memoizedHandlers thay đổi
  useMemo(() => {
    handlersRef.current = memoizedHandlers;
  }, [memoizedHandlers]);

  const setupSocketListeners = useCallback(
    (handlers = {}) => {
      const socket = getSocket();

      if (socketListenersRef.current.length > 0) {
        logger.warn("Listeners already set up, skipping");
        return () => {};
      }

      if (!socket || !currentCall?.roomID) {
        logger.warn("No socket or roomID for listeners");
        return () => {};
      }

      // 🔴 FIX: Update current room ID
      currentRoomIdRef.current = currentCall.roomID;

      logger.info("Adding WebRTC signaling listeners", {
        roomID: currentCall.roomID,
        socketId: socket.id,
        callId: currentCall.id,
        incoming: currentCall.incoming,
        isInitiator: !currentCall.incoming,
      });

      // Debug logging for socket emits
      if (DEBUG_SOCKET_EVENTS) {
        originalEmitRef.current = socket.emit.bind(socket);
        socket.emit = (eventName, ...args) => {
          if (
            eventName.includes("call") ||
            eventName.includes("audio") ||
            eventName.includes("webrtc")
          ) {
            logger.debug(`EMIT: ${eventName}`, args);
          }
          return originalEmitRef.current(eventName, ...args);
        };
      }

      // Event handlers với roomID checking
      const onWebRTCOffer = async (data) => {
        const currentLogger = loggerRef.current;
        const currentRoomID = currentRoomIdRef.current;

        currentLogger.info("Received WebRTC offer", {
          roomID: data.roomID,
          targetRoomID: currentRoomID,
          match: data.roomID === currentRoomID,
          callId: data.callId,
          from: data.to,
          hasOffer: !!data.offer,
        });

        if (data.roomID === currentRoomID) {
          try {
            const handler =
              handlers.onWebRTCOffer || handlersRef.current.handleWebRTCOffer;
            if (handler) {
              await handler(data);
            }
          } catch (error) {
            currentLogger.error("Failed to handle WebRTC offer", error);
          }
        } else {
          currentLogger.warn("Offer not for current room", {
            offerRoomID: data.roomID,
            currentRoomID,
          });
        }
      };

      const onWebRTCAnswer = async (data) => {
        const currentLogger = loggerRef.current;
        const currentRoomID = currentRoomIdRef.current;

        currentLogger.info("Received WebRTC answer", {
          roomID: data.roomID,
          targetRoomID: currentRoomID,
          callId: data.callId,
          answerType: data.answer?.type,
          hasAnswer: !!data.answer,
        });

        if (data.roomID === currentRoomID) {
          try {
            const handler =
              handlers.onWebRTCAnswer || handlersRef.current.handleWebRTCAnswer;
            if (handler) {
              await handler(data);
            }
          } catch (error) {
            currentLogger.error("Failed to handle WebRTC answer", error);
          }
        } else {
          currentLogger.warn("Answer not for current room", {
            answerRoomID: data.roomID,
            currentRoomID,
          });
        }
      };

      const onWebRTCIceCandidate = async (data) => {
        const currentLogger = loggerRef.current;
        const currentRoomID = currentRoomIdRef.current;

        currentLogger.debug("Received ICE candidate", {
          roomID: data.roomID,
          targetRoomID: currentRoomID,
          candidate: data.candidate?.candidate?.substring(0, 30) + "...",
        });

        if (data.roomID === currentRoomID) {
          try {
            const handler =
              handlers.onWebRTCIceCandidate ||
              handlersRef.current.handleWebRTCIceCandidate;
            if (handler) {
              await handler(data);
            }
          } catch (error) {
            currentLogger.error("Failed to handle ICE candidate", error);
          }
        }
      };

      const onAudioCallAccepted = (data) => {
        const currentLogger = loggerRef.current;
        const currentRoomID = currentRoomIdRef.current;

        currentLogger.info("Audio call accepted event", {
          roomID: data.roomID,
          currentRoomID,
          callId: data.callId,
          acceptedBy: data.acceptedBy,
        });

        if (data.roomID === currentRoomID) {
          const handler =
            handlers.onAudioCallAccepted ||
            handlersRef.current.handleAudioCallAccepted;
          if (handler) {
            handler(data);
          }
        }
      };

      const onCallEnded = (data) => {
        const currentLogger = loggerRef.current;
        const currentRoomID = currentRoomIdRef.current;

        currentLogger.info("Call ended remotely", {
          roomID: data.roomID,
          callId: data.callId,
          currentRoomID,
          currentCallId: currentCall?.id,
        });

        if (data.roomID === currentRoomID || data.callId === currentCall?.id) {
          const handler =
            handlers.onCallEnded || handlersRef.current.handleCallEnded;
          if (handler) {
            handler(data);
          }
        }
      };

      // Register listeners
      socket.on(SOCKET_EVENTS.WEBRTC_OFFER, onWebRTCOffer);
      socket.on(SOCKET_EVENTS.WEBRTC_ANSWER, onWebRTCAnswer);
      socket.on(SOCKET_EVENTS.WEBRTC_ICE_CANDIDATE, onWebRTCIceCandidate);
      socket.on(SOCKET_EVENTS.AUDIO_CALL_ACCEPTED, onAudioCallAccepted);
      socket.on(SOCKET_EVENTS.CALL_ACCEPTED, onAudioCallAccepted);
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
        {
          event: SOCKET_EVENTS.CALL_ACCEPTED,
          handler: onAudioCallAccepted,
        },
        { event: SOCKET_EVENTS.AUDIO_CALL_ENDED, handler: onCallEnded },
        { event: SOCKET_EVENTS.CALL_ENDED, handler: onCallEnded },
      ];

      logger.success("Socket listeners registered", {
        count: socketListenersRef.current.length,
        roomID: currentRoomIdRef.current,
      });

      // Return cleanup function
      return () => {
        logger.info("Removing socket listeners", {
          roomID: currentRoomIdRef.current,
        });

        socketListenersRef.current.forEach(({ event, handler }) => {
          socket.off(event, handler);
        });
        socketListenersRef.current = [];
        currentRoomIdRef.current = null;

        if (DEBUG_SOCKET_EVENTS && originalEmitRef.current) {
          socket.emit = originalEmitRef.current;
        }
      };
    },
    [currentCall?.roomID, currentCall?.id, currentCall?.incoming, logger]
  );

  const cleanupSocketListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;

    logger.info("Cleaning up socket listeners");

    socketListenersRef.current.forEach(({ event, handler }) => {
      socket.off(event, handler);
    });
    socketListenersRef.current = [];
    currentRoomIdRef.current = null;

    if (DEBUG_SOCKET_EVENTS && originalEmitRef.current) {
      socket.emit = originalEmitRef.current;
    }
  }, [logger]);

  return {
    setupSocketListeners,
    cleanupSocketListeners,
    socketListenersRef,
  };
};
