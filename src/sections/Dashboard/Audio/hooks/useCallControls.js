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
import { CALL_STATUS, ERROR_MESSAGES } from "../constants/audioCallConstants";
import { formatDuration } from "../utils/callFormatters";
import webRTCService from "../../../../services/webRTCService";

export const useCallControls = (currentCall, dependencies = {}) => {
  const logger = createMethodLogger("useCallControls");
  const loggerRef = useRef(logger);
  const dispatch = useDispatch();

  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [isEnding, setIsEnding] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [acceptRetryCount, setAcceptRetryCount] = useState(0);
  const [endRetryCount, setEndRetryCount] = useState(0);

  // 🔴 FIX: Tách handleReject ra đầu tiên để tránh circular dependency
  const handleReject = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const { cleanupWebRTC } = dependencies;

    currentLogger.info("❌ Rejecting audio call", {
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
      if (cleanupWebRTC) {
        await cleanupWebRTC();
      }

      // Reset states
      setIsMuted(false);
      setIsSpeakerOn(true);

      currentLogger.success("Call rejected successfully");
    } catch (error) {
      currentLogger.error("Error rejecting call", error);
      // Vẫn reject ngay cả khi cleanup failed
      dispatch(RejectAudioCall());
    }
  }, [
    currentCall?.id,
    currentCall?.roomID,
    dependencies?.cleanupWebRTC,
    dispatch,
  ]);

  // Join call room function
  const joinCallRoom = useCallback(async (roomID) => {
    const currentLogger = loggerRef.current;
    const socket = getSocket();

    if (!socket || !socket.connected) {
      throw new Error("Socket not connected");
    }

    currentLogger.info("Joining call room", { roomID });

    return new Promise((resolve, reject) => {
      socket
        .timeout(5000)
        .emit("join_call_room", { roomID }, (err, response) => {
          if (err) {
            currentLogger.error("Failed to join room", err);
            reject(new Error(`Failed to join room: ${err.message}`));
          } else {
            currentLogger.success("✅ Joined call room", { roomID, response });
            resolve(response);
          }
        });
    });
  }, []);

  // Retry với backoff
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

  // 🔴 QUAN TRỌNG: handleAccept - ĐÃ SỬA VỚI ROOM JOINING
  const handleAccept = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const {
      setupWebRTCAudioCall,
      startCallTimer,
      userID,
      setCallStatus,
      setIsConnecting,
      setError,
    } = dependencies;

    currentLogger.info("🎯 Accepting audio call", {
      callId: currentCall?.id,
      roomID: currentCall?.roomID,
      isTempCallId: currentCall?.id?.startsWith?.("temp_"),
      userID,
    });

    if (isAccepting) {
      currentLogger.warn("Already accepting call, skipping");
      return;
    }

    setIsAccepting(true);
    setAcceptRetryCount((prev) => prev + 1);

    try {
      // 1. Cập nhật UI status
      if (setCallStatus) setCallStatus(CALL_STATUS.CONNECTING);
      if (setIsConnecting) setIsConnecting(true);

      // 2. JOIN ROOM TRƯỚC
      currentLogger.info("Step 1: Joining call room...");
      await retryWithBackoff(
        async () => {
          const joinResult = await joinCallRoom(currentCall.roomID);
          if (!joinResult?.success) {
            throw new Error("Failed to join room");
          }
          return joinResult;
        },
        "Join call room",
        2
      );

      // 3. Gửi accept qua socket
      currentLogger.info("Step 2: Sending audio_call_accepted...");
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

      currentLogger.success("✅ audio_call_accepted sent successfully");

      // 4. Setup WebRTC (incoming mode)
      currentLogger.info("Step 3: Setting up WebRTC (incoming mode)...");
      const webRTCSetupSuccess = await retryWithBackoff(
        async () => {
          if (!setupWebRTCAudioCall) {
            throw new Error("setupWebRTCAudioCall function not available");
          }

          const success = await setupWebRTCAudioCall(true, {
            onCallConnected: () => {
              currentLogger.success("✅ WebRTC call connected!");
              if (startCallTimer) startCallTimer();

              // Auto-send WebRTC answer khi nhận được offer
              currentLogger.info("Ready to receive WebRTC offer...");
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
        // 5. Cập nhật Redux state
        dispatch(AcceptAudioCall());
        dispatch(UpdateAudioCallDialog(true));
        dispatch(CloseAudioNotificationDialog());

        // 6. Show success notification
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Audio call accepted",
            autoHideDuration: 2000,
          })
        );

        currentLogger.success("🎉 Call accepted successfully!", {
          roomID: currentCall?.roomID,
          callId: currentCall?.id,
          userID,
        });
      } else {
        throw new Error("WebRTC setup failed");
      }
    } catch (error) {
      const currentAttempt = acceptRetryCount + 1;
      currentLogger.error("❌ Failed to accept call", error, {
        attempt: currentAttempt,
        roomID: currentCall?.roomID,
      });

      if (setError) setError(error.message);

      // Show error to user
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Failed to accept call: ${error.message}`,
          autoHideDuration: 4000,
        })
      );

      // Auto-reject nếu thất bại nhiều lần
      if (currentAttempt >= 3) {
        currentLogger.warn("Max accept attempts reached, auto-rejecting");
        setTimeout(() => {
          if (currentCall) {
            handleReject();
          }
        }, 1000);
      }
    } finally {
      setIsAccepting(false);
    }
  }, [
    currentCall?.id,
    currentCall?.roomID,
    currentCall?.id?.startsWith?.("temp_"),
    isAccepting,
    acceptRetryCount,
    dependencies,
    joinCallRoom,
    retryWithBackoff,
    dispatch,
    handleReject, // 🔴 Đã được định nghĩa trước
  ]);

  const handleEndCall = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const { stopCallTimer, cleanupWebRTC, userID, callDuration } = dependencies;

    currentLogger.info("📴 End call requested", {
      isEnding,
      currentCallId: currentCall?.id,
      currentRoomID: currentCall?.roomID,
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
      if (stopCallTimer) stopCallTimer();

      // Gửi socket end_call nếu call hợp lệ
      const shouldSendSocketEnd =
        currentCall?.roomID &&
        currentCall?.id &&
        !currentCall.id.startsWith("temp_");

      if (shouldSendSocketEnd) {
        const socket = getSocket();
        if (socket && socket.connected) {
          currentLogger.info("Sending socket end_call", {
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

      // Cleanup WebRTC
      if (currentCall?.roomID && cleanupWebRTC) {
        await retryWithBackoff(
          async () => {
            currentLogger.info("Cleaning up WebRTC");
            await cleanupWebRTC();
          },
          "WebRTC cleanup",
          2
        );
      }

      // Reset states
      setIsMuted(false);
      setIsSpeakerOn(true);

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

      currentLogger.success("✅ Call ended successfully", {
        duration: callDuration,
        roomID: currentCall?.roomID,
      });
    } catch (error) {
      currentLogger.error("Error ending call", error, {
        roomID: currentCall?.roomID,
        callId: currentCall?.id,
        attempt: attemptNumber,
      });

      // Vẫn end call ngay cả khi cleanup failed
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
    dependencies,
    retryWithBackoff,
    dispatch,
  ]);

  const handleToggleMute = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const { toggleMicrophone, setError } = dependencies;

    currentLogger.info("Toggling microphone", {
      currentMuted: isMuted,
      callId: currentCall?.id,
    });

    const newMutedState = !isMuted;

    try {
      const success = await retryWithBackoff(
        async () => {
          if (!toggleMicrophone) {
            throw new Error("toggleMicrophone function not available");
          }
          const result = toggleMicrophone(newMutedState);
          if (!result) {
            throw new Error("Toggle microphone returned false");
          }
          return result;
        },
        "Toggle microphone",
        1
      );

      if (success) {
        setIsMuted(newMutedState);
        dispatch(ToggleMuteAudio());

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
      } else {
        currentLogger.warn("toggleMicrophone returned false");
        if (setError) setError("Failed to toggle microphone");
      }
    } catch (error) {
      currentLogger.error("Failed to toggle microphone", error);
      if (setError) setError(error.message);

      dispatch(
        showSnackbar({
          severity: "error",
          message: `Failed to toggle microphone: ${error.message}`,
          autoHideDuration: 3000,
        })
      );
    }
  }, [isMuted, currentCall?.id, dependencies, retryWithBackoff, dispatch]);

  const handleToggleSpeaker = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const { toggleAudioVolume, setError } = dependencies;

    currentLogger.info("Toggling speaker", {
      currentSpeakerOn: isSpeakerOn,
      callId: currentCall?.id,
    });

    try {
      const newSpeakerState = !isSpeakerOn;
      setIsSpeakerOn(newSpeakerState);

      await retryWithBackoff(
        async () => {
          if (toggleAudioVolume) {
            toggleAudioVolume(newSpeakerState);
          }
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
      if (setError) setError(error.message);
      currentLogger.error("Failed to toggle speaker", error);
    }
  }, [isSpeakerOn, currentCall?.id, dependencies, retryWithBackoff, dispatch]);

  // Setup outgoing call
  const setupOutgoingCall = useCallback(async () => {
    const currentLogger = loggerRef.current;
    const { setupWebRTCAudioCall, startCallTimer } = dependencies;

    if (!currentCall || currentCall?.incoming) {
      return;
    }

    currentLogger.info("🚀 Setting up outgoing call", {
      roomID: currentCall.roomID,
      callId: currentCall.id,
      userID: dependencies.userID,
    });

    try {
      // 1. Join room
      currentLogger.info("Step 1: Joining call room...");
      await retryWithBackoff(
        async () => {
          const joinResult = await joinCallRoom(currentCall.roomID);
          if (!joinResult?.success) {
            throw new Error("Failed to join room");
          }
          return joinResult;
        },
        "Join call room for outgoing",
        2
      );

      // 2. Setup WebRTC (outgoing mode)
      currentLogger.info("Step 2: Setting up WebRTC (outgoing mode)...");
      await retryWithBackoff(
        async () => {
          if (!setupWebRTCAudioCall) {
            throw new Error("setupWebRTCAudioCall function not available");
          }

          const success = await setupWebRTCAudioCall(false, {
            onCallConnected: () => {
              currentLogger.success("✅ Outgoing call WebRTC connected!");
              if (startCallTimer) startCallTimer();
            },
            onLocalStream: (stream) => {
              currentLogger.debug("Local stream ready for outgoing call");
            },
            onError: (error) => {
              currentLogger.error("Outgoing WebRTC setup error", error);
              throw error;
            },
          });

          if (!success) {
            throw new Error("WebRTC setup returned false");
          }

          return success;
        },
        "WebRTC setup for outgoing",
        2
      );

      // 3. Send initial WebRTC offer
      currentLogger.info("Step 3: Sending initial WebRTC offer...");
      setTimeout(async () => {
        try {
          if (webRTCService.hasActiveRoom()) {
            await webRTCService.createAndSendOffer();
            currentLogger.success("✅ Initial WebRTC offer sent");
          } else {
            currentLogger.warn("No active WebRTC room to send offer");
          }
        } catch (error) {
          currentLogger.error("❌ Failed to send initial offer", error);
        }
      }, 1000);

      currentLogger.success("Outgoing call setup completed");
    } catch (error) {
      currentLogger.error("❌ Failed to setup outgoing call", error);
    }
  }, [
    currentCall?.roomID,
    currentCall?.id,
    currentCall?.incoming,
    dependencies,
    joinCallRoom,
    retryWithBackoff,
  ]);

  // Memoize return value
  return useMemo(
    () => ({
      isMuted,
      isSpeakerOn,
      isEnding,
      isAccepting,
      handleEndCall,
      handleReject,
      handleAccept,
      handleToggleMute,
      handleToggleSpeaker,
      setupOutgoingCall,
      acceptRetryCount,
      endRetryCount,
      joinCallRoom,
    }),
    [
      isMuted,
      isSpeakerOn,
      isEnding,
      isAccepting,
      handleEndCall,
      handleReject,
      handleAccept,
      handleToggleMute,
      handleToggleSpeaker,
      setupOutgoingCall,
      acceptRetryCount,
      endRetryCount,
      joinCallRoom,
    ]
  );
};
