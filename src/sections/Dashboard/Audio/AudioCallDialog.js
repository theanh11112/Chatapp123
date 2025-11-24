// components/AudioCallDialog.js - FIXED VERSION
import React, { useRef, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  Box,
  Stack,
  IconButton,
  Typography,
  Avatar,
  Chip,
  CircularProgress,
} from "@mui/material";
import { Phone, Microphone, MicrophoneSlash, User } from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";
import { useKeycloak } from "@react-keycloak/web";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";

// Import Redux actions
import {
  CloseAudioNotificationDialog,
  UpdateAudioCallDialog,
  toggleMute,
  resetCallState,
  setCallActive,
  updateCallDuration,
  EndAudioCall,
  AcceptAudioCall,
  RejectAudioCall,
  ToggleMuteAudio,
} from "../../../redux/slices/audioCall";

import { socket } from "../../../socket";
import axios from "../../../utils/axios";
import { AWS_S3_REGION, S3_BUCKET_NAME } from "../../../config";

const AudioCallDialog = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { keycloak, initialized } = useKeycloak();

  const {
    open_audio_dialog,
    open_audio_notification_dialog,
    call_queue,
    incoming,
    isCallActive,
    callType,
    participants,
    callDuration,
    isMuted,
  } = useSelector((state) => state.audioCall);

  const { user } = useSelector((state) => state.app);

  const currentCall = call_queue[0];
  const audioStreamRef = useRef(null);
  const zgRef = useRef(null);
  const [callTimer, setCallTimer] = useState(0);
  const [isInitializing, setIsInitializing] = useState(false);

  // 🆕 FIX: Đặt tất cả hooks TRƯỚC các điều kiện return
  const keycloakToken = keycloak?.token;
  const keycloakUserId = keycloak?.tokenParsed?.sub;
  const keycloakUserName =
    keycloak?.tokenParsed?.preferred_username ||
    keycloak?.tokenParsed?.name ||
    "User";

  // ZegoCloud config
  const appID = process.env.REACT_APP_ZEGO_APP_ID || 1642584767;
  const server =
    process.env.REACT_APP_ZEGO_SERVER ||
    "wss://webliveroom1642584767-api.coolzcloud.com/ws";

  const roomID = currentCall?.roomID;
  const userID = keycloakUserId || user?.keycloakId;
  const userName =
    keycloakUserName || user?.userName || user?.firstName || "User";
  const streamID = currentCall?.streamID || `stream-${roomID}-${userID}`;

  // Format duration
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Generate Zego token
  const generateZegoToken = async () => {
    try {
      if (!keycloakToken) {
        throw new Error("Keycloak token not available");
      }

      const response = await axios.post(
        "/call/generate-zego-token",
        {
          userId: userID,
          room_id: roomID,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keycloakToken}`,
          },
        }
      );
      return response.data.token;
    } catch (error) {
      console.error("Failed to generate Zego token:", error);
      throw error;
    }
  };

  // Initialize ZegoEngine
  const initializeZego = async () => {
    if (!roomID || !userID || isInitializing || !keycloakToken) return;

    setIsInitializing(true);

    try {
      const zg = new ZegoExpressEngine(appID, server);
      zgRef.current = zg;

      const result = await zg.checkSystemRequirements();
      console.log("System requirements:", result);

      if (!result.webRTC || !result.microphone) {
        throw new Error("Browser doesn't support WebRTC or microphone");
      }

      const zegoToken = await generateZegoToken();

      await zg.loginRoom(
        roomID,
        zegoToken,
        { userID, userName },
        { userUpdate: true }
      );

      const localStream = await zg.createStream({
        camera: { audio: true, video: false },
      });

      audioStreamRef.current = localStream;

      const localAudio = document.getElementById("local-audio");
      if (localAudio) {
        localAudio.srcObject = localStream;
        localAudio.muted = true;
      }

      await zg.startPublishingStream(streamID, localStream);
      setupZegoEventListeners(zg);

      dispatch(setCallActive(true));
      console.log("✅ Zego engine initialized successfully");
    } catch (error) {
      console.error("❌ Zego initialization error:", error);
      handleEndCall();
    } finally {
      setIsInitializing(false);
    }
  };

  // Setup Zego event listeners
  const setupZegoEventListeners = (zg) => {
    zg.on("roomUserUpdate", async (roomID, updateType, userList) => {
      console.log("roomUserUpdate:", updateType, userList);

      if (updateType === "ADD") {
        for (const user of userList) {
          if (user.userID !== userID) {
            try {
              const remoteStream = await zg.startPlayingStream(user.userID);
              const remoteAudio = document.getElementById("remote-audio");
              if (remoteAudio) {
                remoteAudio.srcObject = remoteStream;
                await remoteAudio.play();
              }
            } catch (error) {
              console.error("Error playing remote stream:", error);
            }
          }
        }
      } else if (updateType === "DELETE") {
        if (userList.length === 0) {
          handleEndCall();
        }
      }
    });

    zg.on("roomStateUpdate", (roomID, state, errorCode, extendedData) => {
      console.log("Room state update:", state, errorCode, extendedData);
      if (state === "DISCONNECTED" || state === "LOGIN_FAILED") {
        handleEndCall();
      }
    });

    zg.on("roomStreamUpdate", async (roomID, updateType, streamList) => {
      console.log("Room stream update:", updateType, streamList);

      if (updateType === "ADD") {
        for (const stream of streamList) {
          if (stream.streamID !== streamID) {
            try {
              const remoteStream = await zg.startPlayingStream(stream.streamID);
              const remoteAudio = document.getElementById("remote-audio");
              if (remoteAudio) {
                remoteAudio.srcObject = remoteStream;
                await remoteAudio.play();
              }
            } catch (error) {
              console.error("Error playing remote stream:", error);
            }
          }
        }
      }
    });
  };

  // Cleanup Zego resources
  const cleanupZego = async () => {
    const zg = zgRef.current;
    if (!zg) return;

    try {
      await zg.stopPublishingStream(streamID);
      await zg.stopPlayingStream(streamID);

      if (audioStreamRef.current) {
        await zg.destroyStream(audioStreamRef.current);
      }

      await zg.logoutRoom(roomID);

      zgRef.current = null;
      audioStreamRef.current = null;

      console.log("✅ Zego resources cleaned up");
    } catch (error) {
      console.error("Error during Zego cleanup:", error);
    }
  };

  // Handle end call
  const handleEndCall = () => {
    cleanupZego();
    dispatch(EndAudioCall());
  };

  // Handle reject call
  const handleRejectCall = () => {
    dispatch(RejectAudioCall());
  };

  // Handle accept call
  const handleAcceptCall = () => {
    dispatch(AcceptAudioCall());
    setTimeout(() => {
      initializeZego();
    }, 500);
  };

  // Handle toggle mute
  const handleToggleMute = () => {
    dispatch(ToggleMuteAudio());
  };

  // 🆕 FIX: Đặt tất cả useEffect TRƯỚC các điều kiện return
  // Socket event handlers
  useEffect(() => {
    if (!socket || !currentCall) return;

    let autoDeclineTimer;
    if (open_audio_notification_dialog && incoming) {
      autoDeclineTimer = setTimeout(() => {
        console.log("⏰ Auto declining unanswered call");
        handleRejectCall();
      }, 30000);
    }

    socket.on("audio_call_accepted", (data) => {
      console.log("Call accepted by remote user:", data);
      if (autoDeclineTimer) clearTimeout(autoDeclineTimer);
    });

    socket.on("audio_call_rejected", (data) => {
      console.log("Call rejected by remote user:", data);
      if (autoDeclineTimer) clearTimeout(autoDeclineTimer);
      handleEndCall();
    });

    socket.on("audio_call_ended", (data) => {
      console.log("Call ended by remote user:", data);
      handleEndCall();
    });

    return () => {
      if (autoDeclineTimer) clearTimeout(autoDeclineTimer);
      socket.off("audio_call_accepted");
      socket.off("audio_call_rejected");
      socket.off("audio_call_ended");
    };
  }, [currentCall, incoming, open_audio_notification_dialog]);

  // Initialize call for outgoing calls
  useEffect(() => {
    if (
      open_audio_dialog &&
      !incoming &&
      !isCallActive &&
      roomID &&
      userID &&
      !isInitializing &&
      keycloakToken
    ) {
      console.log("Initializing outgoing call...");
      initializeZego();
    }
  }, [
    open_audio_dialog,
    incoming,
    isCallActive,
    roomID,
    userID,
    isInitializing,
    keycloakToken,
  ]);

  // Call timer
  useEffect(() => {
    let interval;
    if (isCallActive) {
      interval = setInterval(() => {
        setCallTimer((prev) => {
          const newDuration = prev + 1;
          dispatch(updateCallDuration(newDuration));
          return newDuration;
        });
      }, 1000);
    } else {
      setCallTimer(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isCallActive, dispatch]);

  // 🆕 FIX: Đặt các điều kiện return SAU tất cả hooks
  if (!currentCall) {
    console.log("🔇 No current call found, skipping AudioCallDialog render");
    return null;
  }

  if (!open_audio_dialog && !open_audio_notification_dialog) {
    return null;
  }

  const getCallerInfo = () => {
    if (callType === "group") {
      return {
        name: currentCall?.name || "Group Call",
        avatar: currentCall?.avatar || "",
      };
    }

    return {
      name: currentCall?.name || "User",
      avatar: currentCall?.avatar || "",
    };
  };

  const callerInfo = getCallerInfo();

  if (!initialized || !keycloak.authenticated) {
    return (
      <Dialog
        open={open_audio_dialog || open_audio_notification_dialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ p: 4, textAlign: "center" }}>
          <Stack spacing={3} alignItems="center">
            <CircularProgress size={40} />
            <Typography variant="h6">Authenticating...</Typography>
          </Stack>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open_audio_dialog || open_audio_notification_dialog}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          background:
            theme.palette.mode === "light"
              ? "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              : "linear-gradient(135deg, #2c3e50 0%, #3498db 100%)",
          color: "white",
          borderRadius: 3,
        },
      }}
    >
      <DialogContent sx={{ p: 4, textAlign: "center" }}>
        <Stack spacing={3} alignItems="center">
          {/* Avatar */}
          <Avatar
            sx={{
              width: 120,
              height: 120,
              border: "4px solid rgba(255,255,255,0.2)",
            }}
            src={
              callerInfo.avatar
                ? `https://${S3_BUCKET_NAME}.s3.${AWS_S3_REGION}.amazonaws.com/${callerInfo.avatar}`
                : ""
            }
          >
            <User size={48} />
          </Avatar>

          {/* Call Info */}
          <Stack spacing={1}>
            <Typography variant="h4" fontWeight="bold">
              {callerInfo.name}
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.8 }}>
              {isCallActive
                ? "On call"
                : incoming
                ? "Incoming call"
                : "Calling..."}
            </Typography>
            {callType === "group" && (
              <Chip
                label={`${participants?.length || 1} participants`}
                sx={{ background: "rgba(255,255,255,0.2)", color: "white" }}
              />
            )}
          </Stack>

          {/* Call Duration */}
          {isCallActive && (
            <Typography variant="h5" fontWeight="bold">
              {formatDuration(callTimer)}
            </Typography>
          )}

          {/* Mute Status */}
          {isCallActive && (
            <Chip
              icon={
                isMuted ? (
                  <MicrophoneSlash size={16} />
                ) : (
                  <Microphone size={16} />
                )
              }
              label={isMuted ? "Muted" : "Unmuted"}
              color={isMuted ? "error" : "success"}
              variant="outlined"
              sx={{ color: "white", borderColor: "white" }}
            />
          )}

          {/* Loading Animation */}
          {!isCallActive && (isInitializing || !incoming) && (
            <Stack alignItems="center" spacing={1}>
              <CircularProgress size={40} sx={{ color: "white" }} />
              <Typography variant="caption" sx={{ opacity: 0.8 }}>
                {isInitializing ? "Initializing..." : "Connecting..."}
              </Typography>
            </Stack>
          )}

          {/* Hidden audio elements */}
          <audio
            id="local-audio"
            controls={false}
            style={{ display: "none" }}
          />
          <audio
            id="remote-audio"
            controls={false}
            autoPlay
            style={{ display: "none" }}
          />

          {/* Call Controls */}
          <Stack direction="row" spacing={2}>
            {/* Mute Toggle - Only show when call is active */}
            {isCallActive && (
              <IconButton
                onClick={handleToggleMute}
                sx={{
                  background: isMuted
                    ? theme.palette.error.main
                    : "rgba(255,255,255,0.2)",
                  color: "white",
                  "&:hover": {
                    background: isMuted
                      ? theme.palette.error.dark
                      : "rgba(255,255,255,0.3)",
                  },
                  width: 56,
                  height: 56,
                }}
              >
                {isMuted ? (
                  <MicrophoneSlash size={24} />
                ) : (
                  <Microphone size={24} />
                )}
              </IconButton>
            )}

            {/* End/Reject Call */}
            <IconButton
              onClick={open_audio_dialog ? handleEndCall : handleRejectCall}
              sx={{
                background: theme.palette.error.main,
                color: "white",
                "&:hover": {
                  background: theme.palette.error.dark,
                },
                width: 56,
                height: 56,
              }}
            >
              <Phone
                size={24}
                weight="fill"
                style={{ transform: "rotate(135deg)" }}
              />
            </IconButton>

            {/* Accept Call - Only for incoming calls */}
            {open_audio_notification_dialog && (
              <IconButton
                onClick={handleAcceptCall}
                disabled={isInitializing || !keycloakToken}
                sx={{
                  background: theme.palette.success.main,
                  color: "white",
                  "&:hover": {
                    background: theme.palette.success.dark,
                  },
                  "&:disabled": {
                    background: theme.palette.action.disabled,
                  },
                  width: 56,
                  height: 56,
                }}
              >
                <Phone size={24} weight="fill" />
              </IconButton>
            )}
          </Stack>

          {/* Debug Info */}
          {process.env.NODE_ENV === "development" && (
            <Box
              sx={{
                mt: 2,
                p: 1,
                background: "rgba(0,0,0,0.3)",
                borderRadius: 1,
              }}
            >
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Debug: {roomID} | {userID} | {callType} |{" "}
                {isCallActive ? "Active" : "Inactive"} |{" "}
                {keycloakToken ? "Token OK" : "No Token"}
              </Typography>
            </Box>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default AudioCallDialog;
