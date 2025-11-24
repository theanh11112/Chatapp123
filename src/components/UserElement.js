import React, { useState } from "react";
import {
  Box,
  Badge,
  Stack,
  Avatar,
  Typography,
  IconButton,
  Button,
  CircularProgress,
} from "@mui/material";
import { styled, useTheme } from "@mui/material/styles";
import { Chat } from "phosphor-react";
import { socket } from "../socket";
import { useKeycloak } from "@react-keycloak/web";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../redux/slices/app";

const StyledChatBox = styled(Box)(({ theme }) => ({
  "&:hover": {
    cursor: "pointer",
  },
}));

const StyledBadge = styled(Badge)(({ theme }) => ({
  "& .MuiBadge-badge": {
    backgroundColor: "#44b700",
    color: "#44b700",
    boxShadow: `0 0 0 2px ${theme.palette.background.paper}`,
    "&::after": {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      borderRadius: "50%",
      animation: "ripple 1.2s infinite ease-in-out",
      border: "1px solid currentColor",
      content: '""',
    },
  },
  "@keyframes ripple": {
    "0%": {
      transform: "scale(.8)",
      opacity: 1,
    },
    "100%": {
      transform: "scale(2.4)",
      opacity: 0,
    },
  },
}));

const UserElement = ({
  keycloakId,
  name,
  username,
  avatar,
  img,
  online,
  status,
  friendRequestStatus = "none",
  onSendRequest,
  onCancelRequest,
}) => {
  const theme = useTheme();
  const [isLoading, setIsLoading] = useState(false);

  const userId = keycloakId;

  const handleSendRequest = async () => {
    if (onSendRequest && userId) {
      setIsLoading(true);
      try {
        await onSendRequest(userId);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleCancelRequest = async () => {
    if (onCancelRequest && userId) {
      setIsLoading(true);
      try {
        await onCancelRequest(userId);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const displayName = name || username || "Unknown User";
  const displayAvatar = avatar || img;
  const displayStatus = status || (online ? "Online" : "Offline");

  return (
    <StyledChatBox
      sx={{
        width: "100%",
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
        p: 2,
      }}
    >
      <Stack
        direction="row"
        alignItems={"center"}
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems={"center"} spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
            >
              <Avatar alt={displayName} src={displayAvatar} />
            </StyledBadge>
          ) : (
            <Avatar alt={displayName} src={displayAvatar} />
          )}
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{displayName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {displayStatus}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
          {friendRequestStatus === "pending" ? (
            <Button
              onClick={handleCancelRequest}
              disabled={isLoading}
              variant="outlined"
              color="error"
              size="small"
              startIcon={isLoading ? <CircularProgress size={16} /> : null}
            >
              {isLoading ? "Canceling..." : "Cancel Request"}
            </Button>
          ) : (
            <Button
              onClick={handleSendRequest}
              disabled={isLoading}
              variant="contained"
              size="small"
              startIcon={isLoading ? <CircularProgress size={16} /> : null}
            >
              {isLoading ? "Sending..." : "Send Request"}
            </Button>
          )}
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

const FriendRequestElement = ({
  img,
  username,
  incoming,
  missed,
  online,
  id,
  sender,
}) => {
  const theme = useTheme();
  const { keycloak } = useKeycloak();
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(false);

  const name = username || sender?.username || "Unknown User";
  const userAvatar = img || sender?.avatar;
  const userOnline = online || sender?.online;

  const handleAcceptRequest = async () => {
    try {
      setIsLoading(true);

      // Gọi API chấp nhận friend request
      const response = await fetch("/users/accept-friend-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keycloak.token}`,
        },
        body: JSON.stringify({
          requestId: id,
          keycloakId: keycloak.subject,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Friend request accepted successfully! 🎉",
          })
        );

        // Emit socket event để cập nhật real-time
        socket.emit("accept_request", { request_id: id });
      } else {
        dispatch(
          showSnackbar({
            severity: "error",
            message: data.message || "Failed to accept friend request",
          })
        );
      }
    } catch (error) {
      console.error("Error accepting friend request:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to accept friend request",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectRequest = async () => {
    try {
      setIsLoading(true);

      // Gọi API từ chối friend request
      const response = await fetch("/users/reject-friend-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${keycloak.token}`,
        },
        body: JSON.stringify({
          requestId: id,
          keycloakId: keycloak.subject,
        }),
      });

      const data = await response.json();

      if (data.status === "success") {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Friend request rejected",
          })
        );

        // Emit socket event để cập nhật real-time
        socket.emit("reject_request", { request_id: id });
      } else {
        dispatch(
          showSnackbar({
            severity: "error",
            message: data.message || "Failed to reject friend request",
          })
        );
      }
    } catch (error) {
      console.error("Error rejecting friend request:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to reject friend request",
        })
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <StyledChatBox
      sx={{
        width: "100%",
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
        p: 2,
      }}
    >
      <Stack
        direction="row"
        alignItems={"center"}
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems={"center"} spacing={2}>
          {userOnline ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
            >
              <Avatar alt={name} src={userAvatar} />
            </StyledBadge>
          ) : (
            <Avatar alt={name} src={userAvatar} />
          )}
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{name}</Typography>
            <Typography variant="caption" color="text.secondary">
              Sent you a friend request
            </Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={1} alignItems={"center"}>
          <Button
            onClick={handleAcceptRequest}
            disabled={isLoading}
            variant="contained"
            size="small"
            startIcon={isLoading ? <CircularProgress size={16} /> : null}
          >
            Accept
          </Button>
          <Button
            onClick={handleRejectRequest}
            disabled={isLoading}
            variant="outlined"
            color="error"
            size="small"
          >
            Reject
          </Button>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

const FriendElement = ({
  img,
  username,
  online,
  _id,
  keycloakId,
  name,
  avatar,
}) => {
  const theme = useTheme();
  const { keycloak } = useKeycloak();
  const dispatch = useDispatch();

  const displayName = name || username || "Unknown User";
  const displayAvatar = avatar || img;

  const handleStartConversation = () => {
    try {
      // start a new conversation
      socket.emit("start_conversation", {
        to: keycloakId || _id,
        from: keycloak.subject,
      });

      dispatch(
        showSnackbar({
          severity: "success",
          message: "Starting conversation...",
        })
      );
    } catch (error) {
      console.error("Error starting conversation:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: "Failed to start conversation",
        })
      );
    }
  };

  return (
    <StyledChatBox
      sx={{
        width: "100%",
        borderRadius: 1,
        backgroundColor: theme.palette.background.paper,
        p: 2,
      }}
    >
      <Stack
        direction="row"
        alignItems={"center"}
        justifyContent="space-between"
      >
        <Stack direction="row" alignItems={"center"} spacing={2}>
          {online ? (
            <StyledBadge
              overlap="circular"
              anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
              variant="dot"
            >
              <Avatar alt={displayName} src={displayAvatar} />
            </StyledBadge>
          ) : (
            <Avatar alt={displayName} src={displayAvatar} />
          )}
          <Stack spacing={0.3}>
            <Typography variant="subtitle2">{displayName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {online ? "Online" : "Offline"}
            </Typography>
          </Stack>
        </Stack>
        <Stack direction={"row"} spacing={2} alignItems={"center"}>
          <IconButton onClick={handleStartConversation}>
            <Chat />
          </IconButton>
        </Stack>
      </Stack>
    </StyledChatBox>
  );
};

export { UserElement, FriendRequestElement, FriendElement };
