// useAudioCall.js - FILE ĐÃ FIX VÒNG LẶP HOÀN TOÀN
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

  // Refs - ĐƠN GIẢN HÓA
  const isMountedRef = useRef(true);
  const socketListenersSetupRef = useRef(false);
  const prevCallStatusRef = useRef(null);

  // 🔴 QUAN TRỌNG: Thêm ref mới để track outgoing call
  const outgoingCallProcessedRef = useRef(new Set());
  const lastOutgoingCallTimeRef = useRef(0);
  const isSettingUpOutgoingRef = useRef(false);

  // Custom hooks
  const callTimer = useCallTimer();
  const webRTCSetup = useWebRTCSetup(currentCall, userID, username);
  const socketListeners = useSocketListeners(currentCall, userID, username);

  // Call controls
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

  // 🔴🔴🔴 QUAN TRỌNG: SỬA HOÀN TOÀN useEffect GÂY VÒNG LẶP
  useEffect(() => {
    // Thêm log để debug
    console.log("🎯 OUTGOING CALL EFFECT TRIGGERED", {
      time: new Date().toISOString(),
      shouldOpenDialog,
      hasCall: !!currentCall,
      isIncoming: currentCall?.incoming,
      roomID: currentCall?.roomID,
      isSettingUp: isSettingUpOutgoingRef.current,
      hasProcessed: outgoingCallProcessedRef.current.has(currentCall?.roomID),
    });

    // 🔴 ĐIỀU KIỆN ĐƠN GIẢN
    if (!shouldOpenDialog || !currentCall || currentCall?.incoming) {
      console.log("⏭️ SKIP: Not outgoing call");
      return;
    }

    const roomID = currentCall.roomID;
    const now = Date.now();

    // 🔴 CHẶN VÒNG LẶP - QUAN TRỌNG NHẤT
    if (isSettingUpOutgoingRef.current) {
      console.log("⛔ BLOCKED: Already setting up outgoing call");
      return;
    }

    // 🔴 DEBOUNCE: Chỉ cho phép mỗi 2 giây
    if (now - lastOutgoingCallTimeRef.current < 2000) {
      console.log("⏳ DEBOUNCE: Too soon since last call");
      return;
    }

    // 🔴 KIỂM TRA ĐÃ XỬ LÝ ROOM NÀY CHƯA
    if (outgoingCallProcessedRef.current.has(roomID)) {
      console.log("✅ SKIP: Already processed this room", { roomID });
      return;
    }

    console.log("🚀 STARTING outgoing call setup for room:", roomID);

    // 🔴 ĐÁNH DẤU ĐANG XỬ LÝ
    isSettingUpOutgoingRef.current = true;
    outgoingCallProcessedRef.current.add(roomID);
    lastOutgoingCallTimeRef.current = now;

    // 🔴 XỬ LÝ BẤT ĐỒNG BỘ - KHÔNG BLOCK
    const setupCall = async () => {
      try {
        console.log("⚡ Executing setupOutgoingCall...");
        await callControls.setupOutgoingCall?.();
        console.log("✅ setupOutgoingCall completed");
      } catch (error) {
        console.error("❌ setupOutgoingCall failed:", error);
        // Nếu lỗi, cho phép retry
        outgoingCallProcessedRef.current.delete(roomID);
      } finally {
        // 🔴 QUAN TRỌNG: Reset flag sau 3 giây
        setTimeout(() => {
          isSettingUpOutgoingRef.current = false;
          console.log("🔄 Ready for next call setup");
        }, 3000);
      }
    };

    // Chạy ngay
    setupCall();

    // 🔴 CLEANUP: Xóa room khỏi processed set sau 1 phút
    const cleanupTimer = setTimeout(() => {
      outgoingCallProcessedRef.current.delete(roomID);
      console.log("🧹 Cleaned up processed room:", roomID);
    }, 60000);

    return () => {
      clearTimeout(cleanupTimer);
    };
  }, [
    shouldOpenDialog,
    currentCall?.roomID, // 🔴 CHỈ THEO DÕI roomID
    currentCall?.incoming, // 🔴 VÀ incoming status
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

  // Update call status với DEBOUNCE
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

    // DEBOUNCE STATUS UPDATES
    if (prevCallStatusRef.current === currentStatus) {
      return;
    }

    // GHI LOG CHỈ KHI THAY ĐỔI QUAN TRỌNG
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

    // XỬ LÝ STATUS VỚI DEBOUNCE
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

    // DEBOUNCE STATUS UPDATE (100ms)
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

        // Cleanup processed rooms
        outgoingCallProcessedRef.current.clear();
      }

      // Reset refs
      isSettingUpOutgoingRef.current = false;
      lastOutgoingCallTimeRef.current = 0;
      prevCallStatusRef.current = null;

      logger.info("Cleanup completed");
    };
  }, [currentCall?.roomID, currentCall?.id, logger]);

  // Optimized formatted duration
  const formattedDuration = useMemo(() => {
    return callTimer.getFormattedDuration?.() || "00:00";
  }, [callTimer.getFormattedDuration]);

  // Optimized call state
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
