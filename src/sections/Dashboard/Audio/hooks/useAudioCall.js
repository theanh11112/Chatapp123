import { useEffect, useRef, useMemo, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { log, createMethodLogger } from "../utils/audioCallLogger";
import { useCallTimer } from "./useCallTimer";
import { useWebRTCSetup } from "./useWebRTCSetup";
import { useSocketListeners } from "./useSocketListeners";
import { useCallControls } from "./useCallControls";
import { formatCallName, formatCallAvatar } from "../utils/callFormatters";
import { CALL_STATUS, CALL_TIMEOUTS } from "../constants/audioCallConstants";

export const useAudioCall = () => {
  const logger = createMethodLogger("useAudioCall");
  const dispatch = useDispatch();

  // Redux state
  const audioCallState = useSelector((state) => state.audioCall);
  const authState = useSelector((state) => state.auth);

  // User info - STABLE
  const userID = useMemo(
    () => authState.user_id || authState.user?.keycloakId || authState.user?.id,
    [authState.user_id, authState.user?.keycloakId, authState.user?.id]
  );
  const username = useMemo(
    () => authState.user?.username || "User",
    [authState.user?.username]
  );

  // Current call from queue - STABLE
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
      queueLength: audioCallState.call_queue?.length || 0,
    });

    return call;
  }, [audioCallState.call_queue, logger]);

  // Refs - FIXED: Thêm refs để tracking state
  const isMountedRef = useRef(true);
  const lastCallEndedEventRef = useRef(null);
  const prevOpenDialogRef = useRef(false);
  const prevOpenNotificationRef = useRef(false);
  const outgoingCallStartedRef = useRef(null);
  const webRTCSetupCompleteRef = useRef(false);
  const socketListenersSetupRef = useRef(false);

  // Custom hooks - FIXED: Tạo stable dependencies
  const callTimer = useCallTimer();

  // WebRTCSetup với dependencies ổn định
  const webRTCSetup = useWebRTCSetup(currentCall, userID, username);

  // SocketListeners với dependencies ổn định
  const socketListeners = useSocketListeners(currentCall, userID, username);

  // CallControls với stable dependencies
  const callControlsDeps = useMemo(
    () => ({
      ...webRTCSetup,
      ...callTimer,
      userID,
      username,
    }),
    [
      webRTCSetup.callStatus,
      webRTCSetup.isConnecting,
      webRTCSetup.error,
      webRTCSetup.setupWebRTCAudioCall,
      webRTCSetup.cleanupWebRTC,
      webRTCSetup.toggleMicrophone,
      webRTCSetup.toggleAudioVolume,
      webRTCSetup.setCallStatus,
      webRTCSetup.setIsConnecting,
      webRTCSetup.setError,
      callTimer.callDuration,
      callTimer.startCallTimer,
      callTimer.stopCallTimer,
      callTimer.resetCallTimer,
      callTimer.getFormattedDuration,
      userID,
      username,
    ]
  );

  const callControls = useCallControls(currentCall, callControlsDeps);

  // Derived state - STABLE
  const shouldOpenDialog = useMemo(() => {
    const open = audioCallState.open_audio_dialog && currentCall;
    if (open !== prevOpenDialogRef.current) {
      logger.debug("Dialog open changed", {
        prev: prevOpenDialogRef.current,
        new: open,
        hasCurrentCall: !!currentCall,
        dialogState: audioCallState.open_audio_dialog,
      });
      prevOpenDialogRef.current = open;
    }
    return open;
  }, [audioCallState.open_audio_dialog, currentCall, logger]);

  const shouldOpenNotification = useMemo(() => {
    const open = audioCallState.open_audio_notification_dialog && currentCall;
    if (open !== prevOpenNotificationRef.current) {
      logger.debug("Notification open changed", {
        prev: prevOpenNotificationRef.current,
        new: open,
        hasCurrentCall: !!currentCall,
        notificationState: audioCallState.open_audio_notification_dialog,
      });
      prevOpenNotificationRef.current = open;
    }
    return open;
  }, [audioCallState.open_audio_notification_dialog, currentCall, logger]);

  const callName = useMemo(() => formatCallName(currentCall), [currentCall]);
  const callAvatar = useMemo(
    () => formatCallAvatar(currentCall),
    [currentCall]
  );

  // Socket event handlers - FIXED: Tạo stable callbacks với useMemo
  const eventHandlers = useMemo(
    () => ({
      handleWebRTCOffer: async (data) => {
        try {
          logger.info("handleWebRTCOffer called", {
            roomID: data.roomID,
            currentRoomID: currentCall?.roomID,
            match: data.roomID === currentCall?.roomID,
          });

          if (data.roomID === currentCall?.roomID) {
            webRTCSetup.setCallStatus(CALL_STATUS.CONNECTING);
            logger.success("WebRTC offer handled for current room");
          }
        } catch (error) {
          logger.error("Failed to handle WebRTC offer", error);
          webRTCSetup.setError(error.message);
        }
      },
      handleCallEnded: (data) => {
        logger.info("Remote call ended event", {
          roomID: data.roomID,
          callId: data.callId,
          currentRoomID: currentCall?.roomID,
          currentCallId: currentCall?.id,
          isEnding: callControls.isEnding,
        });

        const now = Date.now();
        if (
          lastCallEndedEventRef.current &&
          now - lastCallEndedEventRef.current.timestamp < 2000
        ) {
          logger.warn("Recent call ended event, skipping duplicate");
          return;
        }

        lastCallEndedEventRef.current = { timestamp: now, data };

        if (
          (data.roomID === currentCall?.roomID ||
            data.callId === currentCall?.id) &&
          !callControls.isEnding
        ) {
          logger.info("Call ended matches current call, ending locally");
          setTimeout(() => {
            if (isMountedRef.current && !callControls.isEnding) {
              callControls.handleEndCall();
            }
          }, 100);
        }
      },
    }),
    [currentCall, webRTCSetup, callControls, logger]
  );

  // FIXED: Setup outgoing call effect với dependencies tối ưu
  useEffect(() => {
    if (shouldOpenDialog && currentCall && !currentCall?.incoming) {
      // KIỂM TRA NẾU ĐÃ START RỒI THÌ KHÔNG START LẠI
      if (outgoingCallStartedRef.current === currentCall.roomID) {
        logger.warn("Outgoing call already started for this room, skipping");
        return;
      }

      // KIỂM TRA NẾU WEBRTC ĐÃ SETUP COMPLETE
      if (webRTCSetupCompleteRef.current === currentCall.roomID) {
        logger.info("WebRTC already setup for this room");
        return;
      }

      logger.info("Starting outgoing call setup", {
        roomID: currentCall.roomID,
        callId: currentCall.id,
        status: currentCall.status,
      });

      const setupCall = async () => {
        try {
          outgoingCallStartedRef.current = currentCall.roomID;

          const success = await webRTCSetup.setupWebRTCAudioCall(false, {
            onCallConnected: () => {
              logger.success("Outgoing call connected");
              callTimer.startCallTimer();
              webRTCSetupCompleteRef.current = currentCall.roomID;
            },
            onError: (error) => {
              logger.error("Outgoing call setup failed", error);
              outgoingCallStartedRef.current = null;
              webRTCSetupCompleteRef.current = null;
            },
          });

          if (!success) {
            logger.error("WebRTC setup returned false");
            outgoingCallStartedRef.current = null;
            webRTCSetupCompleteRef.current = null;
          }
        } catch (error) {
          logger.error("Failed to setup outgoing call", error);
          outgoingCallStartedRef.current = null;
          webRTCSetupCompleteRef.current = null;
        }
      };

      setupCall();
    } else if (!shouldOpenDialog && outgoingCallStartedRef.current) {
      // RESET KHI DIALOG ĐÓNG
      logger.debug("Dialog closed, resetting outgoing call refs");
      outgoingCallStartedRef.current = null;
      webRTCSetupCompleteRef.current = null;
    }
  }, [
    shouldOpenDialog,
    currentCall?.roomID,
    currentCall?.id,
    currentCall?.incoming,
    currentCall?.status,
    logger,
  ]);

  // FIXED: Setup socket listeners effect với dependencies tối ưu
  useEffect(() => {
    if (!shouldOpenDialog || !currentCall || !isMountedRef.current) {
      return;
    }

    // Chỉ setup socket listeners nếu chưa có
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
      onWebRTCOffer: eventHandlers.handleWebRTCOffer,
      onWebRTCAnswer: (data) => {
        logger.info("WebRTC answer received", data);
        // Xử lý answer nếu cần
      },
      onWebRTCIceCandidate: (data) => {
        logger.debug("ICE candidate received", {
          candidate: data.candidate?.candidate?.substring(0, 30) + "...",
        });
        // Xử lý ICE candidate nếu cần
      },
      onAudioCallAccepted: (data) => {
        logger.info("Audio call accepted event received", data);
        if (!currentCall?.incoming) {
          webRTCSetup.setCallStatus(CALL_STATUS.CONNECTING);
          webRTCSetup.setIsConnecting(true);
        }
      },
      onCallEnded: eventHandlers.handleCallEnded,
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

  // FIXED: Component mount/unmount effect - Tối ưu cleanup
  useEffect(() => {
    isMountedRef.current = true;
    logger.info("useAudioCall hook mounting", {
      userID,
      hasCurrentCall: !!currentCall,
    });

    return () => {
      isMountedRef.current = false;
      logger.info("useAudioCall hook unmounting - performing cleanup");

      // Cleanup chỉ khi thực sự cần
      if (currentCall) {
        logger.info("Cleaning up active call on unmount", {
          roomID: currentCall.roomID,
          callId: currentCall.id,
        });

        callTimer.stopCallTimer();

        // Cleanup socket listeners
        if (socketListenersSetupRef.current) {
          socketListeners.cleanupSocketListeners();
          socketListenersSetupRef.current = false;
        }

        // WebRTC cleanup với error handling
        webRTCSetup.cleanupWebRTC().catch((err) => {
          logger.error("Error during WebRTC cleanup on unmount", err);
        });
      }

      // RESET TẤT CẢ REFS
      outgoingCallStartedRef.current = null;
      webRTCSetupCompleteRef.current = null;
      lastCallEndedEventRef.current = null;
      prevOpenDialogRef.current = false;
      prevOpenNotificationRef.current = false;

      logger.info("Cleanup completed");
    };
  }, [currentCall?.roomID, currentCall?.id, logger]);

  // Update call status khi currentCall changes
  useEffect(() => {
    if (currentCall) {
      logger.info("Current call updated", {
        callId: currentCall.id,
        roomID: currentCall.roomID,
        status: currentCall.status,
        isIncoming: currentCall.incoming,
        from: currentCall.from,
        to: currentCall.to,
      });

      // Update call status dựa trên currentCall status
      if (currentCall.status === "ongoing" || currentCall.status === "joined") {
        webRTCSetup.setCallStatus(CALL_STATUS.CONNECTED);
        webRTCSetup.setIsConnecting(false);

        // Chỉ start timer nếu chưa start
        if (callTimer.callDuration === 0) {
          callTimer.startCallTimer();
        }
      } else if (currentCall.status === "ringing") {
        webRTCSetup.setCallStatus(
          currentCall.incoming ? CALL_STATUS.INCOMING : CALL_STATUS.RINGING
        );
        webRTCSetup.setIsConnecting(false);
      } else if (
        currentCall.status === "ended" ||
        currentCall.status === "rejected"
      ) {
        webRTCSetup.setCallStatus(CALL_STATUS.DISCONNECTED);
        webRTCSetup.setIsConnecting(false);
        callTimer.stopCallTimer();
      }
    } else {
      // No current call, reset status
      webRTCSetup.setCallStatus(CALL_STATUS.IDLE);
      webRTCSetup.setIsConnecting(false);
      callTimer.stopCallTimer();
      callTimer.resetCallTimer();
    }
  }, [
    currentCall?.status,
    currentCall?.incoming,
    webRTCSetup.setCallStatus,
    webRTCSetup.setIsConnecting,
    callTimer.startCallTimer,
    callTimer.stopCallTimer,
    callTimer.resetCallTimer,
    callTimer.callDuration,
  ]);

  // FIXED: Debug effect - chỉ chạy khi cần thiết
  useEffect(() => {
    if (DEBUG && (shouldOpenDialog || shouldOpenNotification)) {
      logger.debug("Audio call state update", {
        shouldOpenDialog,
        shouldOpenNotification,
        callStatus: webRTCSetup.callStatus,
        isConnecting: webRTCSetup.isConnecting,
        error: webRTCSetup.error,
        callDuration: callTimer.callDuration,
        currentCallId: currentCall?.id,
      });
    }
  }, [
    shouldOpenDialog,
    shouldOpenNotification,
    webRTCSetup.callStatus,
    webRTCSetup.isConnecting,
    webRTCSetup.error,
    callTimer.callDuration,
    currentCall?.id,
    logger,
  ]);

  // Memoize return value để tránh re-render không cần thiết
  return useMemo(
    () => ({
      currentCall,
      callState: {
        callDuration: callTimer.callDuration,
        callStatus: webRTCSetup.callStatus,
        isConnecting: webRTCSetup.isConnecting,
        error: webRTCSetup.error,
        isCallActive: audioCallState.isCallActive,
        getFormattedDuration: callTimer.getFormattedDuration,
      },
      callControls: {
        handleAccept: callControls.handleAccept,
        handleReject: callControls.handleReject,
        handleEndCall: callControls.handleEndCall,
        handleToggleMute: callControls.handleToggleMute,
        handleToggleSpeaker: callControls.handleToggleSpeaker,
        isMuted: callControls.isMuted,
        isSpeakerOn: callControls.isSpeakerOn,
        isEnding: callControls.isEnding,
      },
      uiState: {
        callName,
        callAvatar,
        isIncoming: currentCall?.incoming || false,
        shouldOpenDialog,
        shouldOpenNotification,
        incoming: audioCallState.incoming,
      },
    }),
    [
      currentCall,
      callTimer.callDuration,
      webRTCSetup.callStatus,
      webRTCSetup.isConnecting,
      webRTCSetup.error,
      audioCallState.isCallActive,
      callTimer.getFormattedDuration,
      callControls.handleAccept,
      callControls.handleReject,
      callControls.handleEndCall,
      callControls.handleToggleMute,
      callControls.handleToggleSpeaker,
      callControls.isMuted,
      callControls.isSpeakerOn,
      callControls.isEnding,
      callName,
      callAvatar,
      shouldOpenDialog,
      shouldOpenNotification,
      audioCallState.incoming,
    ]
  );
};

// Debug flag
const DEBUG = process.env.NODE_ENV === "development";
