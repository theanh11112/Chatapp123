import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  Slide,
  Stack,
  Typography,
  Box,
  IconButton,
  Avatar,
  Chip,
  CircularProgress,
  Button,
} from "@mui/material";
import {
  PhoneSlash,
  VideoCamera,
  VideoCameraSlash,
  Microphone,
  MicrophoneSlash,
  User,
  Phone,
  PhoneDisconnect,
  DesktopTower, // Thay thế ScreenShare (icon màn hình)
  StopCircle, // Thay thế ScreenShareSlash
} from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import {
  EndVideoCall,
  AcceptVideoCall,
  RejectVideoCall,
  toggleMute,
  toggleVideo,
  CloseVideoNotificationDialog,
  UpdateVideoCallDialog,
} from "../../../redux/slices/videoCall";
import { useTheme } from "@mui/material/styles";
import {
  getSocket,
  acceptSocketCall,
  declineSocketCall,
  endSocketCall,
} from "../../../socket";
import webRTCService from "../../../services/webRTCService";
import { showSnackbar } from "../../../redux/slices/app";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const VideoCallDialog = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const videoCall = useSelector((state) => state.videoCall);
  const { user } = useSelector((state) => state.auth);
  const currentCall = videoCall.call_queue[0];

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);
  const [callStatus, setCallStatus] = useState("Initializing...");
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isEnding, setIsEnding] = useState(false);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState(null);

  const callTimerRef = useRef(null);
  const screenStreamRef = useRef(null);

  // ✅ Format time
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // ✅ Start call timer
  const startCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
    }

    callTimerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1);
    }, 1000);
  }, []);

  // ✅ Stop call timer
  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = null;
    }
  }, []);

  // ✅ Setup WebRTC event listeners
  const setupWebRTCEventListeners = useCallback(() => {
    // Local stream event
    webRTCService.on("localStream", (stream) => {
      console.log("🎥 Local video stream received");
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    });

    // Remote stream event
    webRTCService.on("remoteStream", (stream) => {
      console.log("📹 Remote video stream received");
      setRemoteStream(stream);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
      }
    });

    // Call connected event
    webRTCService.on("callConnected", () => {
      console.log("✅ WebRTC call connected");
      setCallStatus("Connected");
      setIsConnecting(false);
      startCallTimer();
    });

    // Call ended event
    webRTCService.on("callEnded", () => {
      console.log("📞 Call ended from WebRTC service");
      handleEndCall();
    });

    // Connection state change
    webRTCService.on("connectionStateChange", (state) => {
      console.log("🔗 Connection state:", state);
      if (state === "connected") {
        setCallStatus("Connected");
        setIsConnecting(false);
        startCallTimer();
      } else if (
        state === "disconnected" ||
        state === "failed" ||
        state === "closed"
      ) {
        setCallStatus("Disconnected");
      }
    });

    // Error event
    webRTCService.on("error", (error) => {
      console.error("❌ WebRTC error:", error);
      setError(error.message);
      setCallStatus(`Error: ${error.message}`);
      setIsConnecting(false);
    });

    // Microphone toggle event
    webRTCService.on("microphoneToggled", (isEnabled) => {
      setIsMuted(!isEnabled);
    });

    // Camera toggle event
    webRTCService.on("cameraToggled", (isEnabled) => {
      setIsVideoOff(!isEnabled);
    });
  }, [startCallTimer]);

  // ✅ Initialize WebRTC video call
  const setupWebRTCVideoCall = useCallback(
    async (isIncoming = false) => {
      try {
        console.log("🎥 Setting up WebRTC video call...", { isIncoming });

        setIsConnecting(true);
        setCallStatus("Initializing...");
        setError(null);

        const socket = getSocket();
        if (!socket || !socket.connected) {
          throw new Error("Socket not connected");
        }

        if (!currentCall) {
          throw new Error("No active call");
        }

        const roomID = currentCall.roomID;
        const userID = user?.user_id || user?.keycloakId || user?.id;
        const callId = currentCall.callId || currentCall.id;
        const targetUserId = isIncoming ? currentCall.from : currentCall.to;

        if (!roomID || !userID) {
          throw new Error("Missing roomID or userID");
        }

        // Initialize WebRTC service
        await webRTCService.initialize({
          userId: userID,
          username: user?.username || "User",
          socket: socket,
          roomId: roomID,
          callId: callId,
          targetUserId: targetUserId,
          isVideoCall: true,
          isInitiator: !isIncoming,
        });

        // Setup event listeners
        setupWebRTCEventListeners();

        // Start call based on type
        if (isIncoming) {
          // For incoming calls, wait for offer
          setCallStatus("Waiting for call...");
        } else {
          // For outgoing calls, initiate call
          setCallStatus("Starting call...");
          await webRTCService.startCall();
        }

        return true;
      } catch (error) {
        console.error("❌ Failed to setup video call:", error);
        setError(error.message);
        setCallStatus(`Error: ${error.message}`);
        setIsConnecting(false);
        return false;
      }
    },
    [currentCall, user, setupWebRTCEventListeners]
  );

  // ✅ Setup socket listeners for WebRTC signaling
  const setupSocketListeners = useCallback(() => {
    const socket = getSocket();
    if (!socket || !currentCall?.roomID) return () => {};

    const handleWebRTCOffer = async (data) => {
      console.log("📨 Received WebRTC offer:", data);
      if (data.roomID === currentCall.roomID) {
        try {
          setCallStatus("Receiving call...");
          await webRTCService.handleOffer(data.offer);
          setCallStatus("Connected");
          setIsConnecting(false);
          startCallTimer();
        } catch (error) {
          console.error("❌ Failed to handle offer:", error);
          setError(error.message);
        }
      }
    };

    const handleWebRTCAnswer = async (data) => {
      console.log("📨 Received WebRTC answer:", data);
      if (data.roomID === currentCall.roomID) {
        try {
          await webRTCService.handleAnswer(data.answer);
        } catch (error) {
          console.error("❌ Failed to handle answer:", error);
        }
      }
    };

    const handleWebRTCIceCandidate = async (data) => {
      console.log("📨 Received ICE candidate:", data);
      if (data.roomID === currentCall.roomID) {
        try {
          await webRTCService.addIceCandidate(data.candidate);
        } catch (error) {
          console.error("❌ Failed to add ICE candidate:", error);
        }
      }
    };

    const handleCallEnded = (data) => {
      console.log("📞 Call ended remotely:", data);
      if (data.roomID === currentCall.roomID) {
        handleEndCall();
      }
    };

    socket.on("webrtc_offer", handleWebRTCOffer);
    socket.on("webrtc_answer", handleWebRTCAnswer);
    socket.on("webrtc_ice_candidate", handleWebRTCIceCandidate);
    socket.on("video_call_ended", handleCallEnded);
    socket.on("call_ended", handleCallEnded);

    return () => {
      socket.off("webrtc_offer", handleWebRTCOffer);
      socket.off("webrtc_answer", handleWebRTCAnswer);
      socket.off("webrtc_ice_candidate", handleWebRTCIceCandidate);
      socket.off("video_call_ended", handleCallEnded);
      socket.off("call_ended", handleCallEnded);
    };
  }, [currentCall, startCallTimer]);

  // ✅ Handle accept call
  const handleAccept = useCallback(async () => {
    try {
      console.log("✅ Accepting video call");

      setCallStatus("Accepting call...");
      setIsConnecting(true);

      // Send accept event via socket
      if (currentCall?.callId && currentCall?.roomID) {
        await acceptSocketCall(currentCall.callId, currentCall.roomID);
      }

      // Setup WebRTC call
      const success = await setupWebRTCVideoCall(true);

      if (success) {
        // Update Redux state
        dispatch(AcceptVideoCall());
        dispatch(UpdateVideoCallDialog(true));
        dispatch(CloseVideoNotificationDialog());

        dispatch(
          showSnackbar({
            severity: "success",
            message: "Video call accepted",
          })
        );
      } else {
        throw new Error("Failed to setup WebRTC");
      }
    } catch (error) {
      console.error("❌ Failed to accept call:", error);
      setError(error.message);
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Failed to accept call: ${error.message}`,
        })
      );
      handleReject();
    }
  }, [currentCall, setupWebRTCVideoCall, dispatch]);

  // ✅ Handle reject call
  const handleReject = useCallback(async () => {
    try {
      console.log("❌ Rejecting video call");

      if (currentCall?.callId && currentCall?.roomID) {
        await declineSocketCall(currentCall.callId, currentCall.roomID);
      }

      dispatch(RejectVideoCall());
      cleanupCall();
    } catch (error) {
      console.error("❌ Error rejecting call:", error);
    }
  }, [currentCall, dispatch]);

  // ✅ Handle end call
  const handleEndCall = useCallback(async () => {
    if (isEnding) return;

    setIsEnding(true);
    console.log("📞 Ending video call...");

    try {
      // Stop screen sharing if active
      if (isScreenSharing && screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((track) => track.stop());
        setIsScreenSharing(false);
        screenStreamRef.current = null;
      }

      // Stop call timer
      stopCallTimer();

      // Send end call event via socket
      if (currentCall?.roomID) {
        await endSocketCall(currentCall.callId, currentCall.roomID);
      }

      // End WebRTC call
      await webRTCService.endCall();

      // Update Redux state
      dispatch(EndVideoCall());

      // Cleanup
      cleanupCall();

      dispatch(
        showSnackbar({
          severity: "info",
          message: `Video call ended (${formatDuration(callDuration)})`,
        })
      );
    } catch (error) {
      console.error("❌ Error ending call:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Error ending call: ${error.message}`,
        })
      );
    } finally {
      setIsEnding(false);
    }
  }, [
    currentCall,
    callDuration,
    isEnding,
    isScreenSharing,
    stopCallTimer,
    dispatch,
  ]);

  // ✅ Toggle microphone
  const handleToggleMute = useCallback(() => {
    try {
      const newMutedState = webRTCService.toggleMicrophone();
      setIsMuted(!newMutedState);
      dispatch(toggleMute());
    } catch (error) {
      console.error("❌ Failed to toggle microphone:", error);
      setError(error.message);
    }
  }, [dispatch]);

  // ✅ Toggle video
  const handleToggleVideo = useCallback(() => {
    try {
      if (!webRTCService.isVideoCall) return;

      const newVideoState = webRTCService.toggleCamera();
      setIsVideoOff(!newVideoState);
      dispatch(toggleVideo());
    } catch (error) {
      console.error("❌ Failed to toggle video:", error);
      setError(error.message);
    }
  }, [dispatch]);

  // ✅ Toggle screen sharing
  const handleToggleScreenShare = useCallback(async () => {
    try {
      if (isScreenSharing) {
        // Stop screen sharing
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((track) => track.stop());
          screenStreamRef.current = null;
        }
        setIsScreenSharing(false);

        // Restore camera
        if (localStream && localStream.getVideoTracks().length > 0) {
          const videoTrack = localStream.getVideoTracks()[0];
          videoTrack.enabled = true;
        }
      } else {
        // Start screen sharing
        const screenStream = await webRTCService.startScreenShare();
        screenStreamRef.current = screenStream;
        setIsScreenSharing(true);
      }
    } catch (error) {
      console.error("❌ Failed to toggle screen share:", error);
      setError(error.message);
    }
  }, [isScreenSharing, localStream]);

  // ✅ Cleanup function
  const cleanupCall = useCallback(() => {
    console.log("🧹 Cleaning up video call");

    // Stop timers
    stopCallTimer();

    // Stop streams
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach((track) => track.stop());
      setRemoteStream(null);
    }

    // Stop screen sharing
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
    }

    // End WebRTC call
    webRTCService.endCall().catch(console.error);
    webRTCService.removeAllListeners();

    // Reset states
    setIsConnecting(false);
    setCallStatus("Ended");
    setCallDuration(0);
    setError(null);
  }, [localStream, remoteStream, stopCallTimer]);

  // ✅ Setup socket listeners when dialog opens
  useEffect(() => {
    if (!videoCall.open_video_dialog || !currentCall) return;

    const cleanupSocketListeners = setupSocketListeners();

    return () => {
      if (cleanupSocketListeners) cleanupSocketListeners();
    };
  }, [videoCall.open_video_dialog, currentCall, setupSocketListeners]);

  // ✅ Auto-start outgoing calls
  useEffect(() => {
    if (videoCall.open_video_dialog && !videoCall.incoming && currentCall) {
      setupWebRTCVideoCall(false);
    }
  }, [
    videoCall.open_video_dialog,
    videoCall.incoming,
    currentCall,
    setupWebRTCVideoCall,
  ]);

  // ✅ Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupCall();
    };
  }, [cleanupCall]);

  // ✅ Auto-reject incoming call after 30 seconds
  useEffect(() => {
    if (videoCall.open_video_notification_dialog && videoCall.incoming) {
      const timeout = setTimeout(() => {
        console.log("⏰ Auto-rejecting incoming video call after 30 seconds");
        handleReject();
      }, 30000);

      return () => clearTimeout(timeout);
    }
  }, [
    videoCall.open_video_notification_dialog,
    videoCall.incoming,
    handleReject,
  ]);

  if (!currentCall) return null;

  const isIncoming = videoCall.incoming;
  const isActive = videoCall.isCallActive;

  return (
    <>
      {/* Incoming Call Notification */}
      {videoCall.open_video_notification_dialog && (
        <Dialog
          open={true}
          onClose={handleReject}
          TransitionComponent={Transition}
          PaperProps={{
            sx: {
              borderRadius: 3,
              maxWidth: 400,
              width: "100%",
              background: "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)",
              boxShadow: "0 10px 30px rgba(255, 65, 108, 0.3)",
            },
          }}
        >
          <DialogContent>
            <Stack spacing={3} alignItems="center" p={3}>
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={currentCall.avatar || currentCall.from_user?.avatar}
                  sx={{
                    width: 100,
                    height: 100,
                    mb: 2,
                    border: "3px solid white",
                  }}
                >
                  <User size={50} />
                </Avatar>

                {/* Video Icon */}
                <Box
                  sx={{
                    position: "absolute",
                    bottom: 5,
                    right: 5,
                    backgroundColor: "#FF416C",
                    borderRadius: "50%",
                    p: 0.5,
                    border: "2px solid white",
                  }}
                >
                  <VideoCamera size={20} color="white" />
                </Box>
              </Box>

              <Box textAlign="center">
                <Typography variant="h6" fontWeight="bold" color="white">
                  {currentCall.name ||
                    currentCall.from_user?.name ||
                    "Incoming Video Call"}
                </Typography>
                <Typography
                  variant="body2"
                  color="rgba(255,255,255,0.9)"
                  sx={{ mt: 1 }}
                >
                  Incoming video call...
                </Typography>
              </Box>

              {error && (
                <Chip
                  label={error}
                  color="error"
                  size="small"
                  sx={{ color: "white" }}
                />
              )}

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<PhoneSlash size={20} />}
                  onClick={handleReject}
                  disabled={isConnecting || isEnding}
                  sx={{
                    minWidth: 120,
                    borderRadius: 2,
                    fontWeight: "bold",
                  }}
                >
                  Decline
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  startIcon={
                    isConnecting ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <VideoCamera size={20} />
                    )
                  }
                  onClick={handleAccept}
                  disabled={isConnecting || isEnding}
                  sx={{
                    minWidth: 120,
                    borderRadius: 2,
                    fontWeight: "bold",
                  }}
                >
                  {isConnecting ? "Answering..." : "Answer"}
                </Button>
              </Stack>
            </Stack>
          </DialogContent>
        </Dialog>
      )}
      {/* Active Call Dialog */}
      {videoCall.open_video_dialog && (
        <Dialog
          open={true}
          fullWidth
          maxWidth="lg"
          onClose={handleEndCall}
          TransitionComponent={Transition}
          PaperProps={{
            sx: {
              borderRadius: 3,
              height: "85vh",
              overflow: "hidden",
              bgcolor: "black",
              position: "relative",
            },
          }}
        >
          <DialogContent sx={{ p: 0, height: "100%", position: "relative" }}>
            {/* Remote Video */}
            <Box
              ref={remoteVideoRef}
              sx={{
                width: "100%",
                height: "100%",
                bgcolor: "grey.900",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                objectFit: "cover",
                position: "relative",
              }}
              component="video"
              autoPlay
              playsInline
            />

            {/* Local Video Preview */}
            {localStream && (
              <Box
                ref={localVideoRef}
                sx={{
                  position: "absolute",
                  bottom: 120,
                  right: 20,
                  width: 180,
                  height: 135,
                  borderRadius: 2,
                  overflow: "hidden",
                  border: `3px solid ${theme.palette.primary.main}`,
                  bgcolor: "grey.800",
                  zIndex: 10,
                }}
                component="video"
                autoPlay
                playsInline
                muted
              />
            )}

            {/* Call Info Overlay */}
            <Box
              sx={{
                position: "absolute",
                top: 20,
                left: 20,
                color: "white",
                bgcolor: "rgba(0,0,0,0.5)",
                p: 1.5,
                borderRadius: 2,
                backdropFilter: "blur(10px)",
                display: "flex",
                alignItems: "center",
                gap: 1,
                zIndex: 10,
              }}
            >
              <Chip
                label="WebRTC Video"
                color="primary"
                size="small"
                sx={{ color: "white" }}
              />
              <Typography variant="subtitle2">
                {currentCall.name ||
                  currentCall.from_user?.name ||
                  "Video Call"}
              </Typography>
              <Typography variant="caption" sx={{ ml: 1 }}>
                {isActive ? formatDuration(callDuration) : callStatus}
              </Typography>
            </Box>

            {/* Error Display */}
            {error && (
              <Box
                sx={{
                  position: "absolute",
                  top: 70,
                  left: 20,
                  color: "white",
                  bgcolor: "rgba(244, 67, 54, 0.8)",
                  p: 1.5,
                  borderRadius: 2,
                  backdropFilter: "blur(10px)",
                  zIndex: 10,
                  maxWidth: "80%",
                }}
              >
                <Typography variant="caption">Error: {error}</Typography>
              </Box>
            )}

            {/* Loading State */}
            {isConnecting && (
              <Box
                sx={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  textAlign: "center",
                  color: "white",
                  bgcolor: "rgba(0,0,0,0.7)",
                  p: 4,
                  borderRadius: 3,
                  zIndex: 20,
                }}
              >
                <CircularProgress size={60} sx={{ color: "white", mb: 2 }} />
                <Typography variant="h6">Connecting...</Typography>
                <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
                  {callStatus}
                </Typography>
              </Box>
            )}

            {/* Call Controls */}
            <Stack
              direction="row"
              spacing={2}
              sx={{
                position: "absolute",
                bottom: 20,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
              }}
            >
              <IconButton
                onClick={handleToggleMute}
                sx={{
                  backgroundColor: isMuted
                    ? theme.palette.error.main
                    : "rgba(255,255,255,0.1)",
                  color: "white",
                  width: 56,
                  height: 56,
                  "&:hover": {
                    backgroundColor: isMuted
                      ? theme.palette.error.dark
                      : "rgba(255,255,255,0.2)",
                  },
                }}
                disabled={isEnding}
              >
                {isMuted ? (
                  <MicrophoneSlash size={24} />
                ) : (
                  <Microphone size={24} />
                )}
              </IconButton>

              <IconButton
                onClick={handleToggleVideo}
                sx={{
                  backgroundColor: isVideoOff
                    ? theme.palette.error.main
                    : "rgba(255,255,255,0.1)",
                  color: "white",
                  width: 56,
                  height: 56,
                  "&:hover": {
                    backgroundColor: isVideoOff
                      ? theme.palette.error.dark
                      : "rgba(255,255,255,0.2)",
                  },
                }}
                disabled={isEnding}
              >
                {isVideoOff ? (
                  <VideoCameraSlash size={24} />
                ) : (
                  <VideoCamera size={24} />
                )}
              </IconButton>

              <IconButton
                onClick={handleToggleScreenShare}
                sx={{
                  backgroundColor: isScreenSharing
                    ? theme.palette.warning.main
                    : "rgba(255,255,255,0.1)",
                  color: "white",
                  width: 56,
                  height: 56,
                  "&:hover": {
                    backgroundColor: isScreenSharing
                      ? theme.palette.warning.dark
                      : "rgba(255,255,255,0.2)",
                  },
                }}
                disabled={isEnding}
              >
                {isScreenSharing ? (
                  <StopCircle size={24} />
                ) : (
                  <DesktopTower size={24} />
                )}
              </IconButton>

              <IconButton
                onClick={handleEndCall}
                sx={{
                  backgroundColor: theme.palette.error.main,
                  color: "white",
                  width: 56,
                  height: 56,
                  "&:hover": {
                    backgroundColor: theme.palette.error.dark,
                  },
                }}
                disabled={isEnding}
              >
                {isEnding ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  <PhoneDisconnect size={24} />
                )}
              </IconButton>
            </Stack>

            {/* End Call Button (Mobile friendly) */}
            <Box
              sx={{
                position: "absolute",
                bottom: 90,
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 10,
                display: { xs: "block", md: "none" },
              }}
            >
              <Button
                variant="contained"
                color="error"
                startIcon={<PhoneSlash size={20} />}
                onClick={handleEndCall}
                disabled={isEnding}
                sx={{
                  borderRadius: 2,
                  fontWeight: "bold",
                }}
              >
                {isEnding ? "Ending..." : "End Call"}
              </Button>
            </Box>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default VideoCallDialog;
