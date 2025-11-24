import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  Slide,
  Stack,
  Typography,
  CircularProgress,
  Box,
} from "@mui/material";
import { ZegoExpressEngine } from "zego-express-engine-webrtc";
import { useDispatch, useSelector } from "react-redux";
import axiosInstance from "../../../utils/axios";
import { socket } from "../../../socket";
import { ResetVideoCallQueue } from "../../../redux/slices/videoCall";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const CallDialog = ({ open, handleClose }) => {
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);
  const [callStatus, setCallStatus] = useState("Connecting...");
  const [zg, setZg] = useState(null);

  const audioStreamRef = useRef(null);
  const videoStreamRef = useRef(null);
  const timerRef = useRef(null);

  const [call_details] = useSelector((state) => state.videoCall.call_queue);
  const { incoming } = useSelector((state) => state.videoCall);

  const appID = 1642584767;
  const server = "wss://webliveroom1642584767-api.coolzcloud.com/ws";

  const roomID = call_details?.roomID;
  const userID = call_details?.userID;
  const userName = call_details?.userName;

  const audioStreamID = `audio_${call_details?.streamID}`;
  const videoStreamID = `video_${call_details?.streamID}`;

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Clean up socket listeners
    socket?.off("video_call_accepted");
    socket?.off("video_call_denied");
    socket?.off("video_call_missed");
    socket?.off("video_call_not_picked");

    if (zg) {
      try {
        // Stop publishing streams
        await zg.stopPublishingStream(audioStreamID);
        await zg.stopPublishingStream(videoStreamID);

        // Stop playing remote streams
        await zg.stopPlayingStream(`audio_${userID}`);
        await zg.stopPlayingStream(`video_${userID}`);

        // Destroy local streams
        if (audioStreamRef.current) {
          await zg.destroyStream(audioStreamRef.current);
        }
        if (videoStreamRef.current) {
          await zg.destroyStream(videoStreamRef.current);
        }

        // Logout from room
        await zg.logoutRoom(roomID);
      } catch (error) {
        console.error("Error during cleanup:", error);
      }
    }

    // Clean up video/audio elements
    const cleanMediaElement = (elementId) => {
      const element = document.getElementById(elementId);
      if (element) {
        element.srcObject = null;
        element.pause();
      }
    };

    cleanMediaElement("local-video");
    cleanMediaElement("local-audio");
    cleanMediaElement("remote-video");
    cleanMediaElement("remote-audio");
  }, [zg, audioStreamID, videoStreamID, userID, roomID]);

  const handleDisconnect = useCallback(
    async (event, reason) => {
      if (reason && reason === "backdropClick") {
        return;
      }

      await cleanup();
      dispatch(ResetVideoCallQueue());
      handleClose();
    },
    [cleanup, dispatch, handleClose]
  );

  // Fetch Zego token
  const fetchToken = useCallback(async () => {
    try {
      setIsLoading(true);
      setCallStatus("Getting token...");

      const response = await axiosInstance.post("/user/generate-zego-token", {
        userId: userID,
        room_id: roomID,
      });

      if (response.data.token) {
        return response.data.token;
      } else {
        throw new Error("No token received");
      }
    } catch (error) {
      console.error("Error fetching Zego token:", error);
      setCallStatus("Failed to get token");
      throw error;
    }
  }, [userID, roomID]);

  // Initialize Zego engine and join room
  const initializeCall = useCallback(async () => {
    try {
      setIsLoading(true);
      setCallStatus("Initializing call...");

      // Check system requirements
      const systemRequirements = await zg.checkSystemRequirements();
      console.log("System requirements:", systemRequirements);

      const { webRTC, microphone, camera } = systemRequirements;

      if (!webRTC || !microphone || !camera) {
        throw new Error("Browser doesn't meet system requirements");
      }

      // Get token
      const token = await fetchToken();
      setCallStatus("Joining room...");

      // Login to room
      await zg.loginRoom(
        roomID,
        token,
        { userID, userName },
        { userUpdate: true }
      );

      setCallStatus("Connected");
      setIsLoading(false);

      // Create and publish local streams
      const localAudioStream = await zg.createStream({
        camera: { audio: true, video: false },
      });
      const localVideoStream = await zg.createStream({
        camera: { audio: false, video: true },
      });

      audioStreamRef.current = localAudioStream;
      videoStreamRef.current = localVideoStream;

      // Setup local video/audio elements
      const localVideo = document.getElementById("local-video");
      const localAudio = document.getElementById("local-audio");

      if (localVideo) localVideo.srcObject = localVideoStream;
      if (localAudio) localAudio.srcObject = localAudioStream;

      localVideo.play().catch(console.error);

      // Start publishing streams
      await zg.startPublishingStream(audioStreamID, localAudioStream);
      await zg.startPublishingStream(videoStreamID, localVideoStream);
    } catch (error) {
      console.error("Error initializing call:", error);
      setCallStatus("Failed to initialize call");
      setIsLoading(false);
    }
  }, [zg, roomID, userID, userName, audioStreamID, videoStreamID, fetchToken]);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    if (!zg) return;

    // Room state updates
    zg.on("roomStateUpdate", (roomID, state, errorCode, extendedData) => {
      console.log("Room state update:", state, errorCode);

      switch (state) {
        case "CONNECTING":
          setCallStatus("Connecting...");
          break;
        case "CONNECTED":
          setCallStatus("Connected");
          setIsLoading(false);
          break;
        case "DISCONNECTED":
          setCallStatus("Disconnected");
          handleDisconnect();
          break;
        case "LOGIN_FAILED":
          setCallStatus("Login failed");
          break;
        default:
          setCallStatus(state);
      }
    });

    // Room user updates
    zg.on("roomUserUpdate", async (roomID, updateType, userList) => {
      console.log(`Room user update: ${updateType}`, userList);

      if (updateType === "ADD") {
        try {
          // Start playing remote streams
          const remoteAudioStream = await zg.startPlayingStream(
            `audio_${userID}`
          );
          const remoteVideoStream = await zg.startPlayingStream(
            `video_${userID}`
          );

          const remoteVideo = document.getElementById("remote-video");
          const remoteAudio = document.getElementById("remote-audio");

          if (remoteVideo) remoteVideo.srcObject = remoteVideoStream;
          if (remoteAudio) remoteAudio.srcObject = remoteAudioStream;

          remoteVideo.play().catch(console.error);
          remoteAudio.play().catch(console.error);
        } catch (error) {
          console.error("Error playing remote streams:", error);
        }
      } else if (updateType === "DELETE") {
        setCallStatus("User left the call");
      }
    });

    // Room stream updates
    zg.on("roomStreamUpdate", async (roomID, updateType, streamList) => {
      console.log("Room stream update:", updateType, streamList);
    });

    // Publisher state updates
    zg.on("publisherStateUpdate", (result) => {
      console.log("Publisher state update:", result);
    });

    // Player state updates
    zg.on("playerStateUpdate", (result) => {
      console.log("Player state update:", result);
    });
  }, [zg, userID, handleDisconnect]);

  // Socket event handlers
  const setupSocketListeners = useCallback(() => {
    // Call accepted
    socket.on("video_call_accepted", () => {
      setCallStatus("Call accepted");
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    });

    // Call denied
    socket.on("video_call_denied", () => {
      setCallStatus("Call denied");
      handleDisconnect();
    });

    // Call missed
    socket.on("video_call_missed", () => {
      setCallStatus("Call missed");
      handleDisconnect();
    });

    // Call not picked
    socket.on("video_call_not_picked", () => {
      setCallStatus("Call not picked");
      handleDisconnect();
    });
  }, [handleDisconnect]);

  useEffect(() => {
    if (!open || !roomID || !userID) return;

    // Initialize Zego engine
    const zegoEngine = new ZegoExpressEngine(appID, server);
    setZg(zegoEngine);

    // Setup socket listeners
    setupSocketListeners();

    // Set timeout for unanswered call (30 seconds)
    timerRef.current = setTimeout(() => {
      if (socket && call_details?.streamID) {
        socket.emit("video_call_not_picked", {
          to: call_details.streamID,
          from: userID,
        });
      }
    }, 30000);

    // Start call if outgoing
    if (!incoming && call_details?.streamID) {
      socket.emit("start_video_call", {
        to: call_details.streamID,
        from: userID,
        roomID,
      });
    }

    return () => {
      cleanup();
    };
  }, [
    open,
    roomID,
    userID,
    incoming,
    call_details,
    setupSocketListeners,
    cleanup,
  ]);

  useEffect(() => {
    if (zg && open) {
      setupEventListeners();
      initializeCall();
    }
  }, [zg, open, setupEventListeners, initializeCall]);

  return (
    <Dialog
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleDisconnect}
      maxWidth="md"
      fullWidth
    >
      <DialogContent>
        <Stack
          direction="row"
          spacing={2}
          p={2}
          alignItems="center"
          justifyContent="center"
        >
          {/* Local Video */}
          <Stack alignItems="center" spacing={1}>
            <Typography variant="subtitle2" color="primary">
              You
            </Typography>
            <Box position="relative">
              <video
                style={{
                  height: 200,
                  width: 200,
                  borderRadius: 8,
                  backgroundColor: "#000",
                }}
                id="local-video"
                muted
                playsInline
              />
              {isLoading && (
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  sx={{ transform: "translate(-50%, -50%)" }}
                >
                  <CircularProgress />
                </Box>
              )}
            </Box>
            <audio id="local-audio" muted />
          </Stack>

          {/* Call Status */}
          <Stack alignItems="center" justifyContent="center" flex={1}>
            <Typography
              variant="h6"
              color={
                callStatus === "Connected" ? "success.main" : "text.primary"
              }
              textAlign="center"
            >
              {callStatus}
            </Typography>
            {isLoading && <CircularProgress size={20} sx={{ mt: 1 }} />}
          </Stack>

          {/* Remote Video */}
          <Stack alignItems="center" spacing={1}>
            <Typography variant="subtitle2" color="secondary">
              {userName || "Remote"}
            </Typography>
            <Box position="relative">
              <video
                style={{
                  height: 200,
                  width: 200,
                  borderRadius: 8,
                  backgroundColor: "#000",
                }}
                id="remote-video"
                playsInline
              />
              {!isLoading && callStatus === "Connected" && (
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  sx={{ transform: "translate(-50%, -50%)" }}
                >
                  <Typography variant="body2" color="white">
                    Waiting for user...
                  </Typography>
                </Box>
              )}
            </Box>
            <audio id="remote-audio" />
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ justifyContent: "center", pb: 2 }}>
        <Button
          onClick={handleDisconnect}
          variant="contained"
          color="error"
          size="large"
          startIcon={<>📞</>}
        >
          End Call
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CallDialog;
