import {
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
  Link,
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
import { FetchCallLogs } from "../../redux/slices/app";
import { useKeycloak } from "@react-keycloak/web";
import CallPlaceholder from "./CallPlaceholder";
import {
  StartAudioCall,
  PushToAudioCallQueue,
} from "../../redux/slices/audioCall";
import AudioCallDialog from "../../sections/dashboard/Audio/AudioCallDialog";
import { socket } from "../../socket";

const Call = () => {
  const dispatch = useDispatch();
  const { call_logs } = useSelector((state) => state.app);
  const audioCallState = useSelector((state) => state.audioCall);

  // Lấy keycloakId từ Keycloak
  const { keycloak, initialized } = useKeycloak();
  const currentUserId =
    initialized && keycloak?.authenticated ? keycloak?.subject : null;

  const [openDialog, setOpenDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (currentUserId) {
      dispatch(FetchCallLogs(currentUserId));
    }
  }, [dispatch, currentUserId]);

  // Socket Event Listeners cho call thực tế
  useEffect(() => {
    if (!socket) return;

    console.log("🔌 Setting up socket listeners for call...");

    // Listen for incoming audio calls
    socket.on("audio_call_notification", (data) => {
      console.log("📞 Incoming audio call received:", data);
      dispatch(PushToAudioCallQueue(data));
    });

    // Listen for incoming video calls
    socket.on("video_call_notification", (data) => {
      console.log("📹 Incoming video call received:", data);
      // Xử lý video call notification nếu cần
    });

    // Listen for call ended
    socket.on("call_ended", (data) => {
      console.log("📴 Call ended:", data);
      // Refresh call logs khi call kết thúc
      if (currentUserId) {
        dispatch(FetchCallLogs(currentUserId));
      }
    });

    // Listen for audio_call_ended
    socket.on("audio_call_ended", (data) => {
      console.log("📴 Audio call ended:", data);
      if (currentUserId) {
        dispatch(FetchCallLogs(currentUserId));
      }
    });

    // Listen for video_call_ended
    socket.on("video_call_ended", (data) => {
      console.log("📴 Video call ended:", data);
      if (currentUserId) {
        dispatch(FetchCallLogs(currentUserId));
      }
    });

    return () => {
      console.log("🧹 Cleaning up socket listeners...");
      socket.off("audio_call_notification");
      socket.off("video_call_notification");
      socket.off("call_ended");
      socket.off("audio_call_ended");
      socket.off("video_call_ended");
    };
  }, [dispatch, currentUserId]);

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  // Hàm gọi thực tế
  const startRealCall = (toUserId, callType = "direct", isVideo = false) => {
    if (!currentUserId) {
      console.error("❌ User not authenticated");
      return;
    }

    console.log(
      `📞 Starting ${isVideo ? "video" : "audio"} ${callType} call to:`,
      toUserId
    );

    if (isVideo) {
      // Video call logic sẽ được xử lý trong StartCall component
      console.log("Video call initiated");
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
              <Stack direction="row" spacing={1}>
                {/* Socket Status Indicator */}
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: socket?.connected
                      ? "success.main"
                      : "error.main",
                    mt: 1,
                  }}
                />
              </Stack>
            </Stack>

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
              <Typography variant="subtitle2" sx={{}} component={Link}>
                Start a conversation
              </Typography>
              <IconButton
                onClick={handleOpenDialog}
                disabled={!currentUserId}
                sx={{
                  backgroundColor: currentUserId
                    ? theme.palette.primary.main + "08"
                    : "transparent",
                  border: `1px solid ${
                    currentUserId
                      ? theme.palette.primary.main + "20"
                      : theme.palette.divider
                  }`,
                  "&:hover": {
                    backgroundColor: currentUserId
                      ? theme.palette.primary.main + "15"
                      : "transparent",
                  },
                }}
              >
                <Phone
                  style={{
                    color: currentUserId
                      ? theme.palette.primary.main
                      : theme.palette.text.disabled,
                  }}
                />
              </IconButton>
            </Stack>

            <Divider />

            {/* Call Logs List */}
            <Stack sx={{ flexGrow: 1, overflow: "scroll", height: "100%" }}>
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
      <AudioCallDialog />

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
