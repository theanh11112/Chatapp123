import {
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
  Link,
  Alert,
} from "@mui/material";
import { MagnifyingGlass, Phone } from "phosphor-react";
import React, { useEffect, useState } from "react";
import {
  Search,
  SearchIconWrapper,
  StyledInputBase,
} from "../../components/Search";

import { useTheme } from "@mui/material/styles";
import { SimpleBarStyle } from "../../components/Scrollbar";
import { CallLogElement } from "../../components/CallElement";
import StartCall from "../../sections/dashboard/StartCall";
import { useDispatch, useSelector } from "react-redux";
import { FetchCallLogs, showSnackbar } from "../../redux/slices/app"; // Đã import showSnackbar
import { useKeycloak } from "@react-keycloak/web";
import CallPlaceholder from "./CallPlaceholder";
import {
  StartAudioCall,
  PushToAudioCallQueue,
} from "../../redux/slices/audioCall";
import AudioCallDialog from "../../sections/dashboard/Audio/AudioCallDialog";
import VideoCallDialog from "../../sections/dashboard/video/VideoCallDialog";
import {
  StartVideoCall,
  PushToVideoCallQueue,
} from "../../redux/slices/videoCall";

const Call = () => {
  const dispatch = useDispatch();
  const { call_logs } = useSelector((state) => state.app);
  const audioCallState = useSelector((state) => state.audioCall);
  const videoCallState = useSelector((state) => state.videoCall);

  // Lấy keycloakId từ Keycloak
  const { keycloak, initialized } = useKeycloak();
  const currentUserId =
    initialized && keycloak?.authenticated ? keycloak?.subject : null;

  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [socketConnected, setSocketConnected] = useState(false);

  // Fetch call logs khi user đăng nhập
  useEffect(() => {
    if (currentUserId) {
      console.log("📋 Fetching call logs for user:", currentUserId);
      dispatch(FetchCallLogs(currentUserId));
    }
  }, [dispatch, currentUserId]);

  // Monitor socket connection
  useEffect(() => {
    let socket;

    const initSocket = async () => {
      try {
        // Dynamic import để tránh circular dependencies
        const socketModule = await import("../../socket");
        socket = socketModule.socket || socketModule.default;

        if (socket) {
          setSocketConnected(socket.connected);

          const handleConnect = () => {
            console.log("✅ Socket connected");
            setSocketConnected(true);
          };

          const handleDisconnect = () => {
            console.log("❌ Socket disconnected");
            setSocketConnected(false);
          };

          socket.on("connect", handleConnect);
          socket.on("disconnect", handleDisconnect);
        }
      } catch (error) {
        console.error("❌ Failed to initialize socket:", error);
      }
    };

    initSocket();

    return () => {
      if (socket) {
        socket.off("connect");
        socket.off("disconnect");
      }
    };
  }, []);

  // 🆕 Socket Event Listeners
  useEffect(() => {
    let socket;
    let cleanupFunctions = [];

    const setupSocketListeners = async () => {
      try {
        const socketModule = await import("../../socket");
        socket = socketModule.socket || socketModule.default;

        if (!socket) {
          console.warn("Socket not available");
          return;
        }

        console.log("🔌 Setting up socket listeners for call...");

        // Listen for incoming audio calls
        const handleAudioCallNotification = (data) => {
          console.log("📞 Incoming audio call received:", data);
          dispatch(PushToAudioCallQueue(data));
        };

        // Listen for incoming video calls
        const handleVideoCallNotification = (data) => {
          console.log("📹 Incoming video call received:", data);
          dispatch(PushToVideoCallQueue(data));
        };

        // Listen for call ended
        const handleCallEnded = (data) => {
          console.log("📴 Call ended:", data);
          // Refresh call logs khi call kết thúc
          if (currentUserId) {
            setTimeout(() => {
              console.log("🔄 Refreshing call logs after call ended");
              dispatch(FetchCallLogs(currentUserId));
            }, 1500);
          }
        };

        // Listen for call_status_update
        const handleCallStatusUpdate = (data) => {
          console.log("📞 Call status update:", data);
          if (data.status === "ended" && currentUserId) {
            setTimeout(() => {
              dispatch(FetchCallLogs(currentUserId));
            }, 1000);
          }
        };

        // Listen for call_logs_updated
        const handleCallLogsUpdated = () => {
          console.log("📝 Call logs updated event received");
          if (currentUserId) {
            setTimeout(() => {
              dispatch(FetchCallLogs(currentUserId));
            }, 500);
          }
        };

        // Đăng ký listeners
        socket.on("audio_call_notification", handleAudioCallNotification);
        socket.on("video_call_notification", handleVideoCallNotification);
        socket.on("audio_call_ended", handleCallEnded);
        socket.on("video_call_ended", handleCallEnded);
        socket.on("call_status_update", handleCallStatusUpdate);
        socket.on("call_logs_updated", handleCallLogsUpdated);

        // Store cleanup functions
        cleanupFunctions = [
          () =>
            socket.off("audio_call_notification", handleAudioCallNotification),
          () =>
            socket.off("video_call_notification", handleVideoCallNotification),
          () => socket.off("audio_call_ended", handleCallEnded),
          () => socket.off("video_call_ended", handleCallEnded),
          () => socket.off("call_status_update", handleCallStatusUpdate),
          () => socket.off("call_logs_updated", handleCallLogsUpdated),
        ];
      } catch (error) {
        console.error("❌ Failed to setup socket listeners:", error);
      }
    };

    setupSocketListeners();

    return () => {
      console.log("🧹 Cleaning up socket listeners...");
      cleanupFunctions.forEach((cleanup) => cleanup());
    };
  }, [dispatch, currentUserId]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  // 🆕 Hàm gọi thực tế với WebRTC
  const startRealCall = (toUserId, callType = "direct", isVideo = false) => {
    if (!currentUserId) {
      console.error("❌ User not authenticated");
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Please login to make calls",
        })
      );
      return;
    }

    if (!socketConnected) {
      console.error("❌ Socket not connected");
      dispatch(
        showSnackbar({
          severity: "warning",
          message: "Connecting... Please wait",
        })
      );
      return;
    }

    console.log(
      `📞 Starting ${isVideo ? "video" : "audio"} ${callType} call to:`,
      toUserId
    );

    if (isVideo) {
      dispatch(StartVideoCall(toUserId, callType));
    } else {
      dispatch(StartAudioCall(toUserId, callType));
    }
  };

  // Lọc call logs theo search query
  const filteredCallLogs = call_logs.filter((call) => {
    if (!searchQuery) return true;

    const searchLower = searchQuery.toLowerCase();

    // Tìm kiếm theo tên người tham gia
    if (call.participantDetails && Array.isArray(call.participantDetails)) {
      const hasMatch = call.participantDetails.some(
        (participant) =>
          participant.userName?.toLowerCase().includes(searchLower) ||
          participant.firstName?.toLowerCase().includes(searchLower) ||
          participant.lastName?.toLowerCase().includes(searchLower)
      );
      if (hasMatch) return true;
    }

    // Tìm kiếm theo call type
    if (call.callType?.toLowerCase().includes(searchLower)) return true;

    // Tìm kiếm theo status
    if (call.status?.toLowerCase().includes(searchLower)) return true;

    // Tìm kiếm theo room name (cho group calls)
    if (call.room?.name?.toLowerCase().includes(searchLower)) return true;

    return false;
  });

  const theme = useTheme();

  return (
    <>
      <Stack direction="row" sx={{ width: "100%", height: "100vh" }}>
        {/* Left Sidebar - Call Log */}
        <Box
          sx={{
            overflowY: "scroll",
            height: "100vh",
            width: 340,
            backgroundColor: (theme) =>
              theme.palette.mode === "light"
                ? "#F8FAFF"
                : theme.palette.background,
            boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
            borderRight: `1px solid ${theme.palette.divider}`,
          }}
        >
          <Stack p={3} spacing={2} sx={{ maxHeight: "100vh" }}>
            {/* Header */}
            <Stack
              alignItems={"center"}
              justifyContent="space-between"
              direction="row"
            >
              <Typography variant="h5">Call Log</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: socketConnected
                      ? theme.palette.success.main
                      : theme.palette.error.main,
                  }}
                />
                <Typography variant="caption" color="text.secondary">
                  {socketConnected ? "Connected" : "Disconnected"}
                </Typography>
              </Stack>
            </Stack>

            {/* Socket Connection Alert */}
            {!socketConnected && (
              <Alert
                severity="warning"
                sx={{
                  py: 0.5,
                  fontSize: "0.75rem",
                }}
              >
                Connection lost. Calls may not work properly.
              </Alert>
            )}

            {/* Search */}
            <Stack sx={{ width: "100%" }}>
              <Search>
                <SearchIconWrapper>
                  <MagnifyingGlass color="#709CE6" />
                </SearchIconWrapper>
                <StyledInputBase
                  placeholder="Search calls..."
                  inputProps={{ "aria-label": "search" }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </Search>
            </Stack>

            {/* Start Call Button */}
            <Stack
              justifyContent={"space-between"}
              alignItems={"center"}
              direction={"row"}
            >
              <Typography variant="subtitle2" component={Link}>
                Start a conversation
              </Typography>
              <IconButton
                onClick={handleOpenDialog}
                disabled={!currentUserId || !socketConnected}
                sx={{
                  backgroundColor:
                    currentUserId && socketConnected
                      ? theme.palette.primary.main + "08"
                      : "transparent",
                  border: `1px solid ${
                    currentUserId && socketConnected
                      ? theme.palette.primary.main + "20"
                      : theme.palette.divider
                  }`,
                  "&:hover": {
                    backgroundColor:
                      currentUserId && socketConnected
                        ? theme.palette.primary.main + "15"
                        : "transparent",
                  },
                  "&:disabled": {
                    cursor: "not-allowed",
                  },
                }}
              >
                <Phone
                  style={{
                    color:
                      currentUserId && socketConnected
                        ? theme.palette.primary.main
                        : theme.palette.text.disabled,
                  }}
                />
              </IconButton>
            </Stack>

            <Divider />

            {/* Call Logs List */}
            <Stack sx={{ flexGrow: 1, overflow: "hidden", height: "100%" }}>
              <SimpleBarStyle timeout={500} clickOnTrack={false}>
                <Stack spacing={1.5}>
                  {filteredCallLogs.length > 0 && currentUserId ? (
                    filteredCallLogs.map((call) => (
                      <CallLogElement
                        key={call._id}
                        call={call}
                        currentUserId={currentUserId}
                        onCallAgain={startRealCall}
                      />
                    ))
                  ) : (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        height: "200px",
                        flexDirection: "column",
                        gap: 1,
                      }}
                    >
                      <Typography variant="h6" color="text.secondary">
                        {!currentUserId
                          ? "Please login"
                          : searchQuery
                          ? "No matching calls"
                          : "No call history"}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        textAlign="center"
                      >
                        {!currentUserId
                          ? "You need to be logged in to view call history"
                          : searchQuery
                          ? "Try adjusting your search terms"
                          : "Your call logs will appear here"}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </SimpleBarStyle>
            </Stack>
          </Stack>
        </Box>

        {/* Right Content Area - Placeholder */}
        <CallPlaceholder />
      </Stack>

      {/* Audio Call Dialog */}
      {audioCallState.open_audio_dialog && <AudioCallDialog />}

      {/* Video Call Dialog */}
      {videoCallState.open_video_dialog && <VideoCallDialog />}

      {/* Start Call Dialog */}
      {openDialog && (
        <StartCall
          open={openDialog}
          handleClose={handleCloseDialog}
          onStartCall={startRealCall}
        />
      )}
    </>
  );
};

export default Call;
