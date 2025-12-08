// useAudioCall.js - FILE HOÀN CHỈNH ĐÃ FIX
import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { log, createMethodLogger } from "../utils/audioCallLogger";
import { useCallTimer } from "./useCallTimer";
import { useWebRTCSetup } from "./useWebRTCSetup";
import { useSocketListeners } from "./useSocketListeners";
import { useCallControls } from "./useCallControls";
import { formatCallName, formatCallAvatar } from "../utils/callFormatters";
import { CALL_STATUS, CALL_TIMEOUTS } from "../constants/audioCallConstants";
import { shallowEqual } from "react-redux";

export const useAudioCall = () => {
  const logger = createMethodLogger("useAudioCall");
  const dispatch = useDispatch();

  // Redux state

  // Selector tối ưu
  const audioCallState = useSelector((state) => state.audioCall, shallowEqual);
  const authState = useSelector((state) => state.auth, shallowEqual);
  // User info
  const userID = useMemo(
    () => authState.user_id || authState.user?.keycloakId || authState.user?.id,
    [authState.user_id, authState.user?.keycloakId, authState.user?.id]
  );
  const username = useMemo(
    () => authState.user?.username || "User",
    [authState.user?.username]
  );

  // Current call
  const currentCall = useMemo(() => {
    const call =
      audioCallState.call_queue && audioCallState.call_queue.length > 0
        ? audioCallState.call_queue[0]
        : null;

    logger.debug("Memoized current call", {
      callId: call?.id,
      roomID: call?.roomID,
      incoming: call?.incoming,
      status: call?.status,
    });

    return call;
  }, [audioCallState.call_queue, logger]);

  // Refs
  const isMountedRef = useRef(true);
  const outgoingCallSetupRef = useRef(false);
  const incomingCallSetupRef = useRef(false);
  const socketListenersSetupRef = useRef(false);
  const prevCallStatusRef = useRef(null);

  // 🔴 THÊM REF ĐỂ TRACK SETUP ATTEMPTS
  const setupAttemptsRef = useRef(new Set());
  const lastSetupTimeRef = useRef(0);

  // Custom hooks
  const callTimer = useCallTimer();
  const webRTCSetup = useWebRTCSetup(currentCall, userID, username);
  const socketListeners = useSocketListeners(currentCall, userID, username);

  // Call controls với joinCallRoom từ socketListeners
  const callControls = useCallControls(currentCall, {
    ...webRTCSetup,
    ...callTimer,
    userID,
    username,
    joinCallRoom: socketListeners.joinCallRoom,
  });

  // Derived state
  const shouldOpenDialog = useMemo(() => {
    return audioCallState.open_audio_dialog && currentCall;
  }, [audioCallState.open_audio_dialog, currentCall]);

  const shouldOpenNotification = useMemo(() => {
    return audioCallState.open_audio_notification_dialog && currentCall;
  }, [audioCallState.open_audio_notification_dialog, currentCall]);

  const callName = useMemo(() => formatCallName(currentCall), [currentCall]);
  const callAvatar = useMemo(
    () => formatCallAvatar(currentCall),
    [currentCall]
  );

  // Event handlers
  const eventHandlers = useMemo(
    () => ({
      handleAudioCallAccepted: (data) => {
        logger.info("🎉 Audio call accepted event in useAudioCall", {
          roomID: data.roomID,
          currentRoomID: currentCall?.roomID,
          acceptedBy: data.acceptedBy,
          isIncomingCall: currentCall?.incoming,
        });

        if (data.roomID === currentCall?.roomID && !currentCall?.incoming) {
          logger.success("✅ Our outgoing call was accepted!");
          webRTCSetup.setCallStatus(CALL_STATUS.CONNECTING);
          webRTCSetup.setIsConnecting(true);
          callTimer.startCallTimer();
        }
      },
      handleWebRTCOffer: async (data) => {
        logger.info("📨 WebRTC offer received in useAudioCall", {
          roomID: data.roomID,
          currentRoomID: currentCall?.roomID,
        });
      },
      handleWebRTCAnswer: async (data) => {
        logger.info("📨 WebRTC answer received in useAudioCall", {
          roomID: data.roomID,
          currentRoomID: currentCall?.roomID,
        });
      },
      handleCallRoomJoined: (data) => {
        logger.info("🚪 Call room joined in useAudioCall", {
          roomID: data.roomID,
          success: data.success,
          currentRoomID: currentCall?.roomID,
        });
      },
      handleCallEnded: (data) => {
        logger.info("📴 Call ended remotely in useAudioCall", {
          roomID: data.roomID,
          callId: data.callId,
          currentRoomID: currentCall?.roomID,
        });

        if (
          data.roomID === currentCall?.roomID ||
          data.callId === currentCall?.id
        ) {
          logger.info("Our call was ended remotely, ending locally");
          setTimeout(() => {
            if (isMountedRef.current) {
              callControls.handleEndCall();
            }
          }, 100);
        }
      },
    }),
    [
      currentCall?.roomID,
      currentCall?.id,
      currentCall?.incoming,
      webRTCSetup.setCallStatus,
      webRTCSetup.setIsConnecting,
      callTimer.startCallTimer,
      callControls.handleEndCall,
      logger,
    ]
  );

  // 🔴 FIX: Setup outgoing call effect VỚI DEBOUNCE
  useEffect(() => {
    if (!shouldOpenDialog || !currentCall || currentCall?.incoming) {
      return;
    }

    const roomID = currentCall.roomID;
    const now = Date.now();

    // 🔴 DEBOUNCE: CHỈ SETUP SAU 500ms KỂ TỪ LẦN CUỐI
    if (now - lastSetupTimeRef.current < 500) {
      logger.debug("Debouncing outgoing call setup", {
        roomID,
        timeSinceLast: now - lastSetupTimeRef.current,
      });
      return;
    }

    // 🔴 KIỂM TRA ĐÃ SETUP ROOM NÀY CHƯA
    const setupKey = `audio_call_setup_${roomID}`;
    if (sessionStorage.getItem(setupKey) === "true") {
      logger.debug("Outgoing call already setup for this room", { roomID });
      return;
    }

    // 🔴 KIỂM TRA SỐ LẦN SETUP
    if (setupAttemptsRef.current.has(roomID)) {
      logger.debug("Already attempted setup for this room", { roomID });
      return;
    }

    logger.info("🚀 Setting up outgoing call", {
      roomID,
      callId: currentCall.id,
      userID,
    });

    // 🔴 ĐÁNH DẤU ĐANG SETUP
    setupAttemptsRef.current.add(roomID);
    lastSetupTimeRef.current = now;
    sessionStorage.setItem(setupKey, "true");

    const setupCall = async () => {
      try {
        await callControls.setupOutgoingCall?.();
        logger.success("Outgoing call setup initiated");
      } catch (error) {
        logger.error("Failed to setup outgoing call", error);
        // 🔴 XÓA FLAG NẾU LỖI ĐỂ CÓ THỂ RETRY
        sessionStorage.removeItem(setupKey);
        setupAttemptsRef.current.delete(roomID);
      }
    };

    setupCall();

    // 🔴 CLEANUP SETUP ATTEMPT SAU 30s
    const cleanupTimer = setTimeout(() => {
      setupAttemptsRef.current.delete(roomID);
    }, 30000);

    return () => {
      clearTimeout(cleanupTimer);
    };
  }, [
    shouldOpenDialog,
    currentCall?.roomID, // 🔴 CHỈ THEO DÕI roomID
    currentCall?.id,
    currentCall?.incoming,
    userID,
    callControls.setupOutgoingCall,
    logger,
  ]);

  // Setup socket listeners
  useEffect(() => {
    if (!shouldOpenDialog || !currentCall || !isMountedRef.current) {
      return;
    }

    if (socketListenersSetupRef.current) {
      logger.debug("Socket listeners already set up");
      return;
    }

    logger.info("Setting up socket listeners for active call", {
      roomID: currentCall.roomID,
      callId: currentCall.id,
      incoming: currentCall.incoming,
    });

    const cleanupSocketListeners = socketListeners.setupSocketListeners({
      handleAudioCallAccepted: eventHandlers.handleAudioCallAccepted,
      handleWebRTCOffer: eventHandlers.handleWebRTCOffer,
      handleWebRTCAnswer: eventHandlers.handleWebRTCAnswer,
      handleCallRoomJoined: eventHandlers.handleCallRoomJoined,
      handleCallEnded: eventHandlers.handleCallEnded,
    });

    socketListenersSetupRef.current = true;

    return () => {
      logger.debug("Cleaning up socket listeners");
      cleanupSocketListeners?.();
      socketListenersSetupRef.current = false;
    };
  }, [
    shouldOpenDialog,
    currentCall?.roomID,
    currentCall?.id,
    currentCall?.incoming,
    logger,
    eventHandlers,
    socketListeners.setupSocketListeners,
  ]);

  // Auto-reject incoming call timeout
  useEffect(() => {
    if (shouldOpenNotification && currentCall?.incoming) {
      logger.info("Setting up auto-reject timeout for incoming call", {
        timeout: CALL_TIMEOUTS.AUTO_REJECT,
        callId: currentCall.id,
      });

      const timeout = setTimeout(() => {
        if (isMountedRef.current && currentCall?.incoming) {
          logger.warn("Auto-rejecting incoming call after timeout");
          callControls.handleReject();
        }
      }, CALL_TIMEOUTS.AUTO_REJECT);

      return () => {
        logger.debug("Clearing auto-reject timeout");
        clearTimeout(timeout);
      };
    }
  }, [
    shouldOpenNotification,
    currentCall?.id,
    currentCall?.incoming,
    callControls.handleReject,
    logger,
  ]);

  // 🔴 FIX: Update call status với DEBOUNCE
  useEffect(() => {
    if (!currentCall) {
      // Reset khi không có call
      webRTCSetup.setCallStatus(CALL_STATUS.IDLE);
      webRTCSetup.setIsConnecting(false);
      callTimer.stopCallTimer();
      callTimer.resetCallTimer();
      prevCallStatusRef.current = null;
      return;
    }

    const currentStatus = currentCall.status;

    // 🔴 DEBOUNCE STATUS UPDATES
    if (prevCallStatusRef.current === currentStatus) {
      return;
    }

    // 🔴 GHI LOG CHỈ KHI THAY ĐỔI QUAN TRỌNG
    const importantStatuses = [
      "ongoing",
      "joined",
      "ringing",
      "ended",
      "rejected",
    ];
    if (importantStatuses.includes(currentStatus)) {
      logger.info("Call status changed", {
        from: prevCallStatusRef.current,
        to: currentStatus,
        incoming: currentCall.incoming,
      });
    }

    // 🔴 XỬ LÝ STATUS VỚI DEBOUNCE
    const handleStatusUpdate = () => {
      switch (currentStatus) {
        case "ongoing":
        case "joined":
          if (webRTCSetup.callStatus !== CALL_STATUS.CONNECTED) {
            webRTCSetup.setCallStatus(CALL_STATUS.CONNECTED);
          }
          if (webRTCSetup.isConnecting !== false) {
            webRTCSetup.setIsConnecting(false);
          }
          if (callTimer.callDuration === 0) {
            callTimer.startCallTimer();
          }
          break;

        case "ringing":
          const newCallStatus = currentCall.incoming
            ? CALL_STATUS.INCOMING
            : CALL_STATUS.RINGING;
          if (webRTCSetup.callStatus !== newCallStatus) {
            webRTCSetup.setCallStatus(newCallStatus);
          }
          if (webRTCSetup.isConnecting !== false) {
            webRTCSetup.setIsConnecting(false);
          }
          break;

        case "ended":
        case "rejected":
          if (webRTCSetup.callStatus !== CALL_STATUS.DISCONNECTED) {
            webRTCSetup.setCallStatus(CALL_STATUS.DISCONNECTED);
          }
          if (webRTCSetup.isConnecting !== false) {
            webRTCSetup.setIsConnecting(false);
          }
          callTimer.stopCallTimer();
          break;

        default:
          break;
      }
    };

    // 🔴 DEBOUNCE STATUS UPDATE (100ms)
    const timeoutId = setTimeout(handleStatusUpdate, 100);

    prevCallStatusRef.current = currentStatus;

    return () => {
      clearTimeout(timeoutId);
    };
  }, [
    currentCall?.status,
    currentCall?.incoming,
    webRTCSetup.callStatus,
    webRTCSetup.isConnecting,
    webRTCSetup.setCallStatus,
    webRTCSetup.setIsConnecting,
    callTimer.startCallTimer,
    callTimer.stopCallTimer,
    callTimer.resetCallTimer,
    callTimer.callDuration,
    logger,
  ]);

  // Component mount/unmount
  useEffect(() => {
    isMountedRef.current = true;
    logger.info("useAudioCall hook mounting", {
      userID,
      hasCurrentCall: !!currentCall,
    });

    return () => {
      isMountedRef.current = false;
      logger.info("useAudioCall hook unmounting - performing cleanup");

      if (currentCall) {
        logger.info("Cleaning up active call on unmount", {
          roomID: currentCall.roomID,
          callId: currentCall.id,
        });

        callTimer.stopCallTimer();

        if (socketListenersSetupRef.current) {
          socketListeners.cleanupSocketListeners();
          socketListenersSetupRef.current = false;
        }

        webRTCSetup.cleanupWebRTC().catch((err) => {
          logger.error("Error during WebRTC cleanup on unmount", err);
        });

        // 🔴 CLEANUP SESSION STORAGE
        const roomID = currentCall.roomID;
        sessionStorage.removeItem(`outgoing_setup_${roomID}`);
        sessionStorage.removeItem(`room_joined_${roomID}`);
        sessionStorage.removeItem(`audio_call_setup_${roomID}`);
        setupAttemptsRef.current.delete(roomID);
      }

      // Reset refs
      outgoingCallSetupRef.current = null;
      incomingCallSetupRef.current = null;
      prevCallStatusRef.current = null;
      lastSetupTimeRef.current = 0;
      setupAttemptsRef.current.clear();

      logger.info("Cleanup completed");
    };
  }, [currentCall?.roomID, currentCall?.id, logger]);

  // 🔴 Optimized formatted duration
  const formattedDuration = useMemo(() => {
    return callTimer.getFormattedDuration?.() || "00:00";
  }, [callTimer.getFormattedDuration]);

  // 🔴 Optimized call state
  const memoizedCallState = useMemo(
    () => ({
      callStatus: webRTCSetup.callStatus,
      isConnecting: webRTCSetup.isConnecting,
      error: webRTCSetup.error,
      isCallActive: audioCallState.isCallActive,
    }),
    [
      webRTCSetup.callStatus,
      webRTCSetup.isConnecting,
      webRTCSetup.error,
      audioCallState.isCallActive,
    ]
  );

  return useMemo(
    () => ({
      currentCall,
      callState: memoizedCallState,
      callControls: {
        handleAccept: callControls.handleAccept,
        handleReject: callControls.handleReject,
        handleEndCall: callControls.handleEndCall,
        handleToggleMute: callControls.handleToggleMute,
        handleToggleSpeaker: callControls.handleToggleSpeaker,
        setupOutgoingCall: callControls.setupOutgoingCall,
        isMuted: callControls.isMuted,
        isSpeakerOn: callControls.isSpeakerOn,
        isEnding: callControls.isEnding,
        isAccepting: callControls.isAccepting,
      },
      uiState: {
        callName,
        callAvatar,
        formattedDuration,
        isIncoming: currentCall?.incoming || false,
        shouldOpenDialog,
        shouldOpenNotification,
        incoming: audioCallState.incoming,
      },
    }),
    [
      currentCall,
      memoizedCallState,
      callControls.handleAccept,
      callControls.handleReject,
      callControls.handleEndCall,
      callControls.handleToggleMute,
      callControls.handleToggleSpeaker,
      callControls.setupOutgoingCall,
      callControls.isMuted,
      callControls.isSpeakerOn,
      callControls.isEnding,
      callControls.isAccepting,
      callName,
      callAvatar,
      formattedDuration,
      shouldOpenDialog,
      shouldOpenNotification,
      audioCallState.incoming,
    ]
  );
};
