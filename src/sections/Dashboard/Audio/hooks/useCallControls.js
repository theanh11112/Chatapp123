import { useState, useCallback, useRef, useMemo } from "react";
import { useDispatch } from "react-redux";
import {
  EndAudioCall,
  AcceptAudioCall,
  RejectAudioCall,
  ToggleMuteAudio,
  ToggleSpeakerAudio,
  CloseAudioNotificationDialog,
  UpdateAudioCallDialog,
} from "../../../../redux/slices/audioCall";
import { showSnackbar } from "../../../../redux/slices/app";
import { getSocket } from "../../../../socket";
import { createMethodLogger } from "../utils/audioCallLogger";
import { CALL_STATUS } from "../constants/audioCallConstants";
import { formatDuration } from "../utils/callFormatters";

export const useCallControls = (currentCall, dependencies = {}) => {
  const logger = createMethodLogger("useCallControls");
  const loggerRef = useRef(logger);
  const dispatch = useDispatch();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [acceptRetryCount, setAcceptRetryCount] = useState(0);
  const [endRetryCount, setEndRetryCount] = useState(0);

  // 🔴 FIX: Thêm state để tracking microphone status từ WebRTC
  const [microphoneStatus, setMicrophoneStatus] = useState({
    muted: false,
    canToggle: false,
    available: false,
  });

  // Tạo stable dependencies với useMemo
  const stableDependencies = useMemo(
    () => ({
      setupWebRTCAudioCall: dependencies.setupWebRTCAudioCall,
      cleanupWebRTC: dependencies.cleanupWebRTC,
      toggleMicrophone: dependencies.toggleMicrophone,
      toggleAudioVolume: dependencies.toggleAudioVolume,
      startCallTimer: dependencies.startCallTimer,
      stopCallTimer: dependencies.stopCallTimer,
      callDuration: dependencies.callDuration,
      userID: dependencies.userID,
      username: dependencies.username,
      callStatus: dependencies.callStatus,
      setCallStatus: dependencies.setCallStatus,
      setIsConnecting: dependencies.setIsConnecting,
      setError: dependencies.setError,
      webrtcService: dependencies.webrtcService, // 🔴 THÊM WEBRTC SERVICE
    }),
    [
      dependencies.setupWebRTCAudioCall,
      dependencies.cleanupWebRTC,
      dependencies.toggleMicrophone,
      dependencies.toggleAudioVolume,
      dependencies.startCallTimer,
      dependencies.stopCallTimer,
      dependencies.callDuration,
      dependencies.userID,
      dependencies.username,
      dependencies.callStatus,
      dependencies.setCallStatus,
      dependencies.setIsConnecting,
      dependencies.setError,
      dependencies.webrtcService,
    ]
  );

  // Cache trong ref để tránh re-render
  const depsRef = useRef(stableDependencies);
  depsRef.current = stableDependencies;

  // Tạo stable retry function với useMemo
  const retryWithBackoff = useMemo(
    () =>
      async (fn, operationName, maxRetries = 3) => {
        let lastError;
        const currentLogger = loggerRef.current;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
              currentLogger.warn(
                `${operationName} attempt ${attempt} failed, retrying in ${delay}ms...`,
                { error: lastError?.message }
              );
              await new Promise((resolve) => setTimeout(resolve, delay));
            }

            const result = await fn();
            if (attempt > 0) {
              currentLogger.success(
                `${operationName} succeeded on attempt ${attempt + 1}`
              );
            }
            return result;
          } catch (error) {
            lastError = error;
            currentLogger.error(
              `${operationName} attempt ${attempt + 1} failed`,
              error
            );

            if (attempt === maxRetries) {
              currentLogger.error(
                `${operationName} failed after ${maxRetries + 1} attempts`,
                error
              );
              throw error;
            }
          }
        }
      },
    []
  );

  // 🔴 FIX: Hàm check microphone status từ WebRTC
  const updateMicrophoneStatus = useCallback(() => {
    try {
      const webrtcService = depsRef.current.webrtcService;
      if (
        webrtcService &&
        typeof webrtcService.getMicrophoneStatus === "function"
      ) {
        const status = webrtcService.getMicrophoneStatus();
        logger.debug("Microphone status from WebRTC", status);

        setMicrophoneStatus((prev) => ({
          ...prev,
          muted: status.muted,
          canToggle: status.canToggle,
          available: status.available,
          streamActive: status.streamActive,
          hasAudio: status.hasAudio,
        }));

        // Sync với local state isMuted
        if (status.muted !== isMuted) {
          setIsMuted(status.muted);
          logger.debug("Syncing mute state with WebRTC", {
            webRTCMuted: status.muted,
            localMuted: isMuted,
          });
        }
      }
    } catch (error) {
      logger.error("Failed to get microphone status", error);
    }
  }, [isMuted, logger]);

  const handleEndCall = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const { stopCallTimer, cleanupWebRTC, userID, callDuration } =
      depsRef.current;

    currentLogger.info("End call requested", {
      isEnding,
      currentCallId: currentCall?.id,
      currentRoomID: currentCall?.roomID,
      callIdType: currentCall?.id?.startsWith?.("temp_") ? "temp" : "valid",
      userID,
    });

    if (isEnding) {
      currentLogger.warn("Already ending call, skipping");
      return;
    }

    setIsEnding(true);
    const attemptNumber = endRetryCount + 1;

    try {
      // Stop timer first
      stopCallTimer?.();

      // Send socket end_call if valid call
      const shouldSendSocketEnd =
        currentCall?.roomID &&
        currentCall?.id &&
        !currentCall.id.startsWith("temp_");

      if (shouldSendSocketEnd) {
        const socket = getSocket();
        if (socket && socket.connected) {
          currentLogger.info("Sending socket end_call with retry", {
            callId: currentCall.id,
            roomID: currentCall.roomID,
            attempt: attemptNumber,
          });

          await retryWithBackoff(
            () => {
              return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  reject(new Error("Socket timeout after 5s"));
                }, 5000);

                socket.emit(
                  "end_call",
                  {
                    callId: currentCall.id,
                    roomID: currentCall.roomID,
                    userId: userID,
                  },
                  (response) => {
                    clearTimeout(timeout);
                    if (response?.error) {
                      reject(new Error(response.error));
                    } else {
                      resolve(response);
                    }
                  }
                );
              });
            },
            "Socket end_call",
            2
          );

          currentLogger.success("Socket end_call acknowledged");
        } else {
          currentLogger.warn("Socket not connected, skipping end_call");
        }
      } else {
        currentLogger.info(
          "Skipping socket end_call for temp callId or no call"
        );
      }

      // Cleanup WebRTC with retry
      if (currentCall?.roomID) {
        await retryWithBackoff(
          async () => {
            currentLogger.info("Cleaning up WebRTC");
            await cleanupWebRTC?.();
          },
          "WebRTC cleanup",
          2
        );
      }

      // Reset microphone status
      setMicrophoneStatus({
        muted: false,
        canToggle: false,
        available: false,
      });
      setIsMuted(false);

      // Dispatch to Redux
      dispatch(EndAudioCall());

      // Show notification
      const durationText = formatDuration(callDuration || 0);
      dispatch(
        showSnackbar({
          severity: "info",
          message: `Audio call ended (${durationText})`,
          autoHideDuration: 3000,
        })
      );

      currentLogger.success("Call ended successfully", {
        duration: callDuration,
        roomID: currentCall?.roomID,
      });
    } catch (error) {
      currentLogger.error("Error ending call", error, {
        roomID: currentCall?.roomID,
        callId: currentCall?.id,
        attempt: attemptNumber,
      });

      // Even if cleanup failed, still show ended
      dispatch(EndAudioCall());

      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Call ended (cleanup may have issues)",
          autoHideDuration: 3000,
        })
      );
    } finally {
      setIsEnding(false);
      setEndRetryCount(0);
    }
  }, [
    currentCall?.id,
    currentCall?.roomID,
    currentCall?.id?.startsWith?.("temp_"),
    isEnding,
    endRetryCount,
    retryWithBackoff,
    dispatch,
  ]);

  const handleReject = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const { cleanupWebRTC } = depsRef.current;

    currentLogger.info("Rejecting audio call", {
      callId: currentCall?.id,
      roomID: currentCall?.roomID,
    });

    try {
      if (currentCall?.id && currentCall?.roomID) {
        const socket = getSocket();
        if (socket && socket.connected) {
          await retryWithBackoff(
            () => {
              return new Promise((resolve, reject) => {
                socket.emit(
                  "decline_call",
                  {
                    callId: currentCall.id,
                    roomID: currentCall.roomID,
                  },
                  (response) => {
                    if (response?.error) {
                      reject(new Error(response.error));
                    } else {
                      resolve(response);
                    }
                  }
                );
              });
            },
            "Socket decline_call",
            1
          );
        }
      }

      dispatch(RejectAudioCall());

      // Cleanup WebRTC
      await retryWithBackoff(
        async () => {
          await cleanupWebRTC?.();
        },
        "WebRTC cleanup on reject",
        1
      );

      // Reset microphone status
      setMicrophoneStatus({
        muted: false,
        canToggle: false,
        available: false,
      });
      setIsMuted(false);

      currentLogger.success("Call rejected successfully");
    } catch (error) {
      currentLogger.error("Error rejecting call", error);
      // Still reject even if cleanup fails
      dispatch(RejectAudioCall());
    }
  }, [currentCall?.id, currentCall?.roomID, retryWithBackoff, dispatch]);

  const handleAccept = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const {
      setupWebRTCAudioCall,
      startCallTimer,
      userID,
      setCallStatus,
      setIsConnecting,
      setError,
    } = depsRef.current;

    currentLogger.info("Accepting audio call", {
      callId: currentCall?.id,
      roomID: currentCall?.roomID,
      isTempCallId: currentCall?.id?.startsWith?.("temp_"),
      userID,
    });

    setAcceptRetryCount((prev) => {
      const currentAttempt = prev + 1;

      // Thực hiện async logic bên trong functional update
      const performAccept = async () => {
        try {
          // Update status
          setCallStatus?.(CALL_STATUS.CONNECTING);
          setIsConnecting?.(true);

          // Send accept via socket with retry
          if (
            currentCall?.roomID &&
            currentCall?.id &&
            !currentCall.id.startsWith("temp_")
          ) {
            await retryWithBackoff(
              async () => {
                const socket = getSocket();
                if (!socket || !socket.connected) {
                  throw new Error("Socket not connected");
                }

                return new Promise((resolve, reject) => {
                  const timeout = setTimeout(() => {
                    reject(new Error("Socket timeout"));
                  }, 3000);

                  socket.emit(
                    "audio_call_accepted",
                    {
                      roomID: currentCall.roomID,
                      callId: currentCall.id,
                      userId: userID,
                    },
                    (response) => {
                      clearTimeout(timeout);
                      if (response?.error) {
                        reject(new Error(response.error));
                      } else {
                        resolve(response);
                      }
                    }
                  );
                });
              },
              "Socket audio_call_accepted",
              2
            );

            currentLogger.success("audio_call_accepted sent");
          }

          // Setup WebRTC with retry
          const webRTCSetupSuccess = await retryWithBackoff(
            async () => {
              currentLogger.info(
                `Setting up WebRTC (attempt ${currentAttempt})`
              );
              const success = await setupWebRTCAudioCall?.(true, {
                onCallConnected: () => {
                  currentLogger.success("WebRTC connected");
                  startCallTimer?.();

                  // Update microphone status khi call connected
                  setTimeout(() => {
                    updateMicrophoneStatus();
                  }, 500);
                },
                onError: (error) => {
                  currentLogger.error("WebRTC setup error", error);
                  throw error;
                },
              });

              if (!success) {
                throw new Error("WebRTC setup returned false");
              }

              return success;
            },
            "WebRTC setup",
            2
          );

          if (webRTCSetupSuccess) {
            // Update microphone status
            setTimeout(() => {
              updateMicrophoneStatus();
            }, 1000);

            // Update Redux state
            dispatch(AcceptAudioCall());
            dispatch(UpdateAudioCallDialog(true));
            dispatch(CloseAudioNotificationDialog());

            // Show success notification
            dispatch(
              showSnackbar({
                severity: "success",
                message: "Audio call accepted",
                autoHideDuration: 2000,
              })
            );

            currentLogger.success("Call accepted successfully", {
              roomID: currentCall?.roomID,
              callId: currentCall?.id,
            });
          }
        } catch (error) {
          currentLogger.error("Failed to accept call", error, {
            attempt: currentAttempt,
            roomID: currentCall?.roomID,
          });

          setError?.(error.message);

          // Show error to user
          dispatch(
            showSnackbar({
              severity: "error",
              message: `Failed to accept call: ${error.message}`,
              autoHideDuration: 4000,
            })
          );

          // Auto-reject if acceptance fails
          if (currentAttempt >= 3) {
            currentLogger.warn("Max accept attempts reached, auto-rejecting");
            setTimeout(() => {
              if (currentCall) {
                handleReject();
              }
            }, 1000);
          }
        }
      };

      // Chạy async logic
      performAccept();

      return currentAttempt;
    });
  }, [
    currentCall?.id,
    currentCall?.roomID,
    currentCall?.id?.startsWith?.("temp_"),
    retryWithBackoff,
    dispatch,
    handleReject,
    updateMicrophoneStatus,
  ]);

  // 🔴 FIX COMPLETE: handleToggleMute với đúng flow
  const handleToggleMute = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const { toggleMicrophone, setError, webrtcService } = depsRef.current;

    currentLogger.info("Toggling microphone", {
      currentMuted: isMuted,
      callId: currentCall?.id,
      microphoneStatus,
    });

    // Check if we can toggle
    if (!microphoneStatus.canToggle || !microphoneStatus.available) {
      currentLogger.warn("Cannot toggle microphone", {
        canToggle: microphoneStatus.canToggle,
        available: microphoneStatus.available,
      });
      return;
    }

    const newMutedState = !isMuted;

    try {
      // 🔴 QUAN TRỌNG: Gọi WebRTCService trước khi update UI state
      const success = await retryWithBackoff(
        async () => {
          const result = toggleMicrophone?.(newMutedState);
          if (!result) {
            throw new Error("Toggle microphone returned false");
          }
          return result;
        },
        "Toggle microphone",
        1
      );

      if (success) {
        // 🔴 Chỉ update UI state sau khi WebRTC thành công
        setIsMuted(newMutedState);

        // Update microphone status
        setMicrophoneStatus((prev) => ({
          ...prev,
          muted: newMutedState,
        }));

        // Dispatch Redux action
        dispatch(ToggleMuteAudio());

        // Show notification
        dispatch(
          showSnackbar({
            severity: "info",
            message: newMutedState ? "Microphone muted" : "Microphone unmuted",
            autoHideDuration: 1500,
          })
        );

        currentLogger.success(
          `Microphone ${newMutedState ? "muted" : "unmuted"} successfully`
        );

        // 🔴 Listen to WebRTC microphoneToggled event để sync
        if (webrtcService) {
          const handleMicrophoneToggled = (data) => {
            if (data.success && data.muted !== newMutedState) {
              currentLogger.debug("Syncing mute state from WebRTC event", {
                eventMuted: data.muted,
                localMuted: newMutedState,
              });
              setIsMuted(data.muted);
              setMicrophoneStatus((prev) => ({
                ...prev,
                muted: data.muted,
              }));
            }
          };

          webrtcService.on("microphoneToggled", handleMicrophoneToggled);

          // Cleanup listener sau 2 giây
          setTimeout(() => {
            webrtcService.off("microphoneToggled", handleMicrophoneToggled);
          }, 2000);
        }
      } else {
        currentLogger.warn("toggleMicrophone returned false");
        setError?.("Failed to toggle microphone");
      }
    } catch (error) {
      currentLogger.error("Failed to toggle microphone", error);
      setError?.(error.message);

      // Show error to user
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Failed to toggle microphone: ${error.message}`,
          autoHideDuration: 3000,
        })
      );

      // Không revert UI state - giữ nguyên state cũ
      // Người dùng có thể thấy nút không thay đổi nếu thất bại
    }
  }, [
    isMuted,
    currentCall?.id,
    microphoneStatus,
    retryWithBackoff,
    dispatch,
    setMicrophoneStatus,
    setIsMuted,
  ]);

  const handleToggleSpeaker = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const { toggleAudioVolume, setError } = depsRef.current;

    currentLogger.info("Toggling speaker", {
      currentSpeakerOn: isSpeakerOn,
      callId: currentCall?.id,
    });

    try {
      const newSpeakerState = !isSpeakerOn;

      // Update UI state ngay lập tức cho feedback tốt hơn
      setIsSpeakerOn(newSpeakerState);

      await retryWithBackoff(
        async () => {
          toggleAudioVolume?.(newSpeakerState);
          return true;
        },
        "Toggle speaker volume",
        1
      );

      dispatch(ToggleSpeakerAudio());
      dispatch(
        showSnackbar({
          severity: "info",
          message: newSpeakerState ? "Speaker on" : "Speaker off",
          autoHideDuration: 1500,
        })
      );
      currentLogger.success(`Speaker ${newSpeakerState ? "on" : "off"}`);
    } catch (error) {
      // Revert UI state on failure
      setIsSpeakerOn(!isSpeakerOn);
      setError?.(error.message);
      currentLogger.error("Failed to toggle speaker", error);
    }
  }, [isSpeakerOn, currentCall?.id, retryWithBackoff, dispatch]);

  // 🔴 FIX: Thêm useEffect để sync microphone status khi call status thay đổi
  const syncMicrophoneStatus = useCallback(() => {
    if (depsRef.current.callStatus === CALL_STATUS.CONNECTED) {
      // Wait a bit for WebRTC to be fully ready
      setTimeout(() => {
        updateMicrophoneStatus();
      }, 1000);
    }
  }, [updateMicrophoneStatus]);

  // Memoize return value để tránh unnecessary re-renders
  return useMemo(
    () => ({
      isMuted,
      isSpeakerOn,
      isEnding,
      handleEndCall,
      handleReject,
      handleAccept,
      handleToggleMute,
      handleToggleSpeaker,
      setIsEnding,
      acceptRetryCount,
      endRetryCount,
      microphoneStatus,
      updateMicrophoneStatus,
      syncMicrophoneStatus,
    }),
    [
      isMuted,
      isSpeakerOn,
      isEnding,
      handleEndCall,
      handleReject,
      handleAccept,
      handleToggleMute,
      handleToggleSpeaker,
      acceptRetryCount,
      endRetryCount,
      microphoneStatus,
      updateMicrophoneStatus,
      syncMicrophoneStatus,
    ]
  );
};
