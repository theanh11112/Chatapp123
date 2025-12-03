import React from "react";
import {
  Box,
  Stack,
  Avatar,
  Typography,
  IconButton,
  Chip,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import {
  Phone,
  VideoCamera,
  CheckCircle,
  XCircle,
  Clock,
} from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { StartAudioCall } from "../redux/slices/audioCall";
import { StartVideoCall } from "../redux/slices/videoCall";
import { showSnackbar } from "../redux/slices/app";
import { timeAgo } from "../utils/timeAgo";

const CallCard = styled(Box)(({ theme }) => ({
  borderRadius: 12,
  backgroundColor: theme.palette.background.paper,
  border: `1px solid ${theme.palette.divider}`,
  transition: "all 0.2s ease-in-out",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: theme.shadows[4],
    borderColor: theme.palette.primary.light,
  },
}));

const StatusBadge = styled(Box)(({ theme, status }) => ({
  width: 8,
  height: 8,
  borderRadius: "50%",
  backgroundColor:
    status === "ongoing" || status === "Ongoing"
      ? theme.palette.success.main
      : theme.palette.text.disabled,
  animation:
    status === "ongoing" || status === "Ongoing" ? "pulse 2s infinite" : "none",
  "@keyframes pulse": {
    "0%": {
      transform: "scale(0.95)",
      opacity: 0.7,
    },
    "50%": {
      transform: "scale(1.1)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(0.95)",
      opacity: 0.7,
    },
  },
}));

const CallLogElement = ({ call, currentUserId, onCallAgain }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  // 🆕 FIX: Lấy thông tin người tham gia
  const getOtherParticipant = () => {
    if (!call.participants || !Array.isArray(call.participants)) return null;
    return call.participants.find((p) => p !== currentUserId);
  };

  // 🆕 FIX: Lấy display name
  const getDisplayName = () => {
    // For group calls
    if (call.callType === "group") {
      return call.callTitle || "Group Call";
    }

    const otherParticipantId = getOtherParticipant();

    // Cấu trúc mới: participantDetails là array
    if (call.participantDetails && Array.isArray(call.participantDetails)) {
      const otherUser = call.participantDetails.find(
        (p) => p.keycloakId !== currentUserId
      );
      return otherUser?.userName || otherUser?.firstName || "Unknown User";
    }

    // Cấu trúc cũ: participantsDetails là object
    if (call.participantsDetails) {
      const otherUser = Object.values(call.participantsDetails).find(
        (p) => p.keycloakId !== currentUserId
      );
      return otherUser?.username || otherUser?.fullName || "Unknown User";
    }

    // Fallback to startedBy info
    if (call.startedBy) {
      if (typeof call.startedBy === "object") {
        if (call.startedBy._id !== currentUserId) {
          return call.startedBy.userName || call.startedBy.firstName || "User";
        }
      } else if (call.startedBy !== currentUserId) {
        return "Other User";
      }
    }

    return "Unknown User";
  };

  // 🆕 FIX: Lấy avatar
  const getAvatar = () => {
    if (call.callType === "group") {
      return call.avatar || null;
    }

    // Cấu trúc mới: participantDetails là array
    if (call.participantDetails && Array.isArray(call.participantDetails)) {
      const otherUser = call.participantDetails.find(
        (p) => p.keycloakId !== currentUserId
      );
      return otherUser?.avatar;
    }

    // Cấu trúc cũ: participantsDetails là object
    if (call.participantsDetails) {
      const otherUser = Object.values(call.participantsDetails).find(
        (p) => p.keycloakId !== currentUserId
      );
      return otherUser?.avatar;
    }

    // Fallback to startedBy avatar
    if (call.startedBy && typeof call.startedBy === "object") {
      if (call.startedBy._id !== currentUserId) {
        return call.startedBy.avatar;
      }
    }

    return null;
  };

  // 🆕 FIX: Tính duration
  const getCallDuration = () => {
    // Ưu tiên duration từ backend trước
    if (call.duration) {
      const minutes = Math.floor(call.duration / 60);
      const seconds = call.duration % 60;
      return `${minutes}m ${seconds}s`;
    }

    // Fallback: tính từ startedAt và endedAt
    const startedAt = call.startedAt || call.createdAt;
    const endedAt = call.endedAt;

    if (!endedAt || call.status === "ongoing" || call.status === "Ongoing")
      return null;

    try {
      const duration = new Date(endedAt) - new Date(startedAt);
      const minutes = Math.floor(duration / 60000);
      const seconds = Math.floor((duration % 60000) / 1000);
      return `${minutes}m ${seconds}s`;
    } catch (error) {
      return null;
    }
  };

  // 🆕 FIX: Xác định call direction
  const isIncoming = () => {
    if (call.startedBy) {
      if (typeof call.startedBy === "object") {
        return call.startedBy._id !== currentUserId;
      } else {
        return call.startedBy !== currentUserId;
      }
    }

    // Fallback: check participants array
    if (call.participants && call.participants.length > 0) {
      return call.participants[0] !== currentUserId;
    }

    return false;
  };

  // 🆕 FIX: Status info
  const getStatusInfo = () => {
    const status = call.status || "";
    const statusLower = status.toLowerCase();

    switch (statusLower) {
      case "ongoing":
        return { label: "Ongoing", color: "success", icon: Clock };
      case "completed":
        return { label: "Completed", color: "primary", icon: CheckCircle };
      case "missed":
        return { label: "Missed", color: "error", icon: XCircle };
      case "declined":
        return { label: "Declined", color: "warning", icon: XCircle };
      case "ringing":
        return { label: "Ringing", color: "info", icon: Clock };
      default:
        return { label: status || "Unknown", color: "default", icon: Clock };
    }
  };

  // 🆕 FIX: Call type info
  const getCallTypeInfo = () => {
    const isAudio = call.type === "audio" || !call.type; // Mặc định là audio
    const CallIcon = isAudio ? Phone : VideoCamera;
    const callTypeColor = isAudio
      ? theme.palette.primary.main
      : theme.palette.error.main;
    const callTypeLabel = isAudio ? "Audio" : "Video";

    return { isAudio, CallIcon, callTypeColor, callTypeLabel };
  };

  const statusInfo = getStatusInfo();
  const callTypeInfo = getCallTypeInfo();
  const StatusIcon = statusInfo.icon;
  const duration = getCallDuration();
  const incoming = isIncoming();

  // 🆕 FIX: Sửa hàm handleCallAgain cho video call
  const handleCallAgain = (type = "audio") => {
    const otherParticipant = getOtherParticipant();
    if (otherParticipant) {
      if (type === "audio") {
        dispatch(StartAudioCall(otherParticipant, call.callType || "direct"))
          .then(() => {
            console.log("✅ Audio call started");
          })
          .catch((error) => {
            console.error("❌ Failed to start audio call:", error);
            dispatch(
              showSnackbar({
                severity: "error",
                message: "Failed to start call. Please try again.",
              })
            );
          });
      } else {
        // 🆕 SỬA: Sử dụng StartVideoCall thay vì StartDirectVideoCall
        dispatch(StartVideoCall(otherParticipant, call.callType || "direct"))
          .then(() => {
            console.log("✅ Video call started");
          })
          .catch((error) => {
            console.error("❌ Failed to start video call:", error);
            dispatch(
              showSnackbar({
                severity: "error",
                message: "Failed to start video call. Please try again.",
              })
            );
          });
      }
    } else {
      console.error("❌ Cannot find other participant for call again");
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Cannot start call - participant not found",
        })
      );
    }
  };

  // 🆕 FIX: Format timestamp an toàn
  const getSafeTimestamp = () => {
    try {
      return timeAgo(new Date(call.startedAt || call.createdAt || Date.now()));
    } catch (error) {
      return "Recently";
    }
  };

  return (
    <CallCard sx={{ p: 2, mb: 1.5 }}>
      <Stack direction="row" spacing={2} alignItems="flex-start">
        {/* Avatar với status */}
        <Box position="relative">
          <Avatar
            src={getAvatar()}
            sx={{
              width: 50,
              height: 50,
              borderRadius: 2,
              backgroundColor: theme.palette.action.hover,
            }}
          >
            {getDisplayName().charAt(0).toUpperCase()}
          </Avatar>
          <StatusBadge
            status={call.status}
            sx={{
              position: "absolute",
              bottom: 2,
              right: 2,
              border: `2px solid ${theme.palette.background.paper}`,
            }}
          />
        </Box>

        {/* Call Info */}
        <Stack sx={{ flexGrow: 1 }} spacing={0.5}>
          {/* Header - Name và Time */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="flex-start"
          >
            <Typography variant="subtitle1" fontWeight={600}>
              {getDisplayName()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {getSafeTimestamp()}
            </Typography>
          </Stack>

          {/* Call Type và Direction */}
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              icon={<callTypeInfo.CallIcon size={14} />}
              label={callTypeInfo.callTypeLabel}
              size="small"
              variant="outlined"
              sx={{
                borderColor: callTypeInfo.callTypeColor,
                color: callTypeInfo.callTypeColor,
                "& .MuiChip-icon": { color: callTypeInfo.callTypeColor },
                height: 24,
              }}
            />
            <Chip
              label={
                call.callType === "group"
                  ? "Group"
                  : incoming
                  ? "Incoming"
                  : "Outgoing"
              }
              size="small"
              variant="filled"
              sx={{
                backgroundColor:
                  call.callType === "group"
                    ? theme.palette.secondary.main + "20"
                    : incoming
                    ? theme.palette.info.main + "20"
                    : theme.palette.warning.main + "20",
                color:
                  call.callType === "group"
                    ? theme.palette.secondary.main
                    : incoming
                    ? theme.palette.info.main
                    : theme.palette.warning.main,
                height: 24,
              }}
            />
          </Stack>

          {/* Status và Duration */}
          <Stack direction="row" spacing={1} alignItems="center">
            <StatusIcon
              size={14}
              color={
                theme.palette[statusInfo.color]?.main ||
                theme.palette.text.secondary
              }
            />
            <Typography
              variant="caption"
              color={statusInfo.color}
              fontWeight={500}
            >
              {statusInfo.label} {duration ? `• ${duration}` : ""}
            </Typography>
          </Stack>

          {/* Participants count for group calls */}
          {call.callType === "group" && call.participants && (
            <Typography variant="caption" color="text.secondary">
              {call.participants.length} participants
            </Typography>
          )}

          {/* Room Info (nếu có) - Cho cả 2 cấu trúc */}
          {call.room?.name && (
            <Typography variant="caption" color="text.secondary">
              In {call.room.name}
            </Typography>
          )}
        </Stack>

        {/* Call Again Buttons */}
        <Stack direction="column" spacing={0.5}>
          <IconButton
            size="small"
            onClick={() => handleCallAgain("audio")}
            disabled={!getOtherParticipant()}
            sx={{
              backgroundColor: theme.palette.primary.main + "08",
              border: `1px solid ${theme.palette.primary.main + "20"}`,
              "&:hover": {
                backgroundColor: theme.palette.primary.main + "15",
              },
              "&:disabled": {
                backgroundColor: theme.palette.action.disabledBackground,
                borderColor: theme.palette.action.disabled,
              },
              width: 36,
              height: 36,
            }}
          >
            <Phone
              size={18}
              color={
                getOtherParticipant()
                  ? theme.palette.primary.main
                  : theme.palette.action.disabled
              }
            />
          </IconButton>

          <IconButton
            size="small"
            onClick={() => handleCallAgain("video")}
            disabled={!getOtherParticipant()}
            sx={{
              backgroundColor: theme.palette.error.main + "08",
              border: `1px solid ${theme.palette.error.main + "20"}`,
              "&:hover": {
                backgroundColor: theme.palette.error.main + "15",
              },
              "&:disabled": {
                backgroundColor: theme.palette.action.disabledBackground,
                borderColor: theme.palette.action.disabled,
              },
              width: 36,
              height: 36,
            }}
          >
            <VideoCamera
              size={18}
              color={
                getOtherParticipant()
                  ? theme.palette.error.main
                  : theme.palette.action.disabled
              }
            />
          </IconButton>
        </Stack>
      </Stack>

      {/* 🆕 FIX: Missed/Declined Call Indicator */}
      {(call.status === "missed" ||
        call.status === "declined" ||
        call.missed) && (
        <Box
          sx={{
            mt: 1,
            p: 1,
            borderRadius: 1,
            backgroundColor: theme.palette.error.main + "08",
            border: `1px solid ${theme.palette.error.main + "20"}`,
          }}
        >
          <Stack direction="row" spacing={1} alignItems="center">
            <XCircle size={16} color={theme.palette.error.main} />
            <Typography variant="caption" color={theme.palette.error.main}>
              {call.status === "missed" || call.missed
                ? "Missed call"
                : "Call declined"}
            </Typography>
          </Stack>
        </Box>
      )}
    </CallCard>
  );
};

// 🆕 FIX: CallElement cho start call với video call đã sửa
const CallElement = ({ img, name, id, handleClose }) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const { user } = useSelector((state) => state.auth);

  const handleAudioCall = () => {
    dispatch(StartAudioCall(id, "direct"))
      .then(() => {
        console.log("✅ Audio call started");
        if (handleClose) handleClose();
      })
      .catch((error) => {
        console.error("❌ Failed to start audio call:", error);
      });
  };

  const handleVideoCall = () => {
    dispatch(StartVideoCall(id, "direct"))
      .then(() => {
        console.log("✅ Video call started");
        if (handleClose) handleClose();
      })
      .catch((error) => {
        console.error("❌ Failed to start video call:", error);
      });
  };

  return (
    <CallCard sx={{ p: 2, mb: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={img}
            sx={{
              width: 45,
              height: 45,
              borderRadius: 2,
            }}
          />
          <Typography variant="subtitle1" fontWeight={500}>
            {name}
          </Typography>
        </Stack>

        <Stack direction="row" spacing={1}>
          <IconButton
            onClick={handleAudioCall}
            sx={{
              backgroundColor: theme.palette.primary.main + "08",
              border: `1px solid ${theme.palette.primary.main + "20"}`,
              "&:hover": {
                backgroundColor: theme.palette.primary.main + "15",
              },
            }}
          >
            <Phone size={20} color={theme.palette.primary.main} />
          </IconButton>

          <IconButton
            onClick={handleVideoCall}
            sx={{
              backgroundColor: theme.palette.error.main + "08",
              border: `1px solid ${theme.palette.error.main + "20"}`,
              "&:hover": {
                backgroundColor: theme.palette.error.main + "15",
              },
            }}
          >
            <VideoCamera size={20} color={theme.palette.error.main} />
          </IconButton>
        </Stack>
      </Stack>
    </CallCard>
  );
};

export { CallLogElement, CallElement };
