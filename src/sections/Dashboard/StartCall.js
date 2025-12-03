// frontend/src/components/dialogs/StartCall.js
import React, { useEffect, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Slide,
  Stack,
  Avatar,
  Typography,
  Box,
  IconButton,
  Chip,
  Divider,
  InputAdornment,
  TextField,
  Badge,
  Tooltip,
  CircularProgress,
} from "@mui/material";
import {
  MagnifyingGlass,
  Phone,
  UserPlus,
  X,
  Funnel,
  VideoCamera,
  UserCircle,
  Clock,
  CheckCircle,
  XCircle,
} from "phosphor-react";
import { useTheme } from "@mui/material/styles";
import { useDispatch, useSelector } from "react-redux";
import { FetchAllUsers } from "../../redux/slices/app";
import { SimpleBarStyle } from "../../components/Scrollbar";
import { startSocketAudioCall } from "../../socket";
import { showSnackbar } from "../../redux/slices/app";
import webRTCService from "../../services/webRTCService";
import { getSocket } from "../../socket";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const StartCall = ({ open, handleClose, isVideoCall = false }) => {
  const theme = useTheme();
  const { all_users } = useSelector((state) => state.app);
  const { user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const [searchTerm, setSearchTerm] = useState("");
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  // Lấy danh sách người dùng
  useEffect(() => {
    dispatch(FetchAllUsers());
  }, [dispatch]);

  // Theo dõi trạng thái online
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handlePresenceUpdate = (data) => {
      if (data.status === "online") {
        setOnlineUsers((prev) => new Set([...prev, data.userId]));
      } else {
        setOnlineUsers((prev) => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    socket.on("presence_update", handlePresenceUpdate);

    return () => {
      socket.off("presence_update", handlePresenceUpdate);
    };
  }, []);

  // Lọc người dùng
  useEffect(() => {
    if (all_users.length > 0) {
      const filtered = all_users
        .filter((userItem) => userItem.keycloakId !== user?.keycloakId) // Loại bỏ chính mình
        .filter(
          (userItem) =>
            `${userItem?.firstName} ${userItem?.lastName}`
              .toLowerCase()
              .includes(searchTerm.toLowerCase()) ||
            userItem?.email?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
          // Sắp xếp: online trước, offline sau
          const aOnline = onlineUsers.has(a.keycloakId);
          const bOnline = onlineUsers.has(b.keycloakId);
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;
          return 0;
        });

      setFilteredUsers(filtered);
    }
  }, [all_users, searchTerm, user, onlineUsers]);

  // Xử lý bắt đầu cuộc gọi
  const handleStartCall = useCallback(
    async (targetUser) => {
      if (!user || !targetUser) {
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Cannot start call: User information missing",
          })
        );
        return;
      }

      if (targetUser.keycloakId === user.keycloakId) {
        dispatch(
          showSnackbar({
            severity: "warning",
            message: "Cannot call yourself",
          })
        );
        return;
      }

      setLoading(true);
      setSelectedUserId(targetUser.keycloakId);

      try {
        const socket = getSocket();
        if (!socket || !socket.connected) {
          throw new Error("Socket not connected. Please refresh the page.");
        }

        // Tạo room ID duy nhất
        const roomID = `${
          isVideoCall ? "video" : "audio"
        }_room_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        console.log("📞 Starting call:", {
          from: user.keycloakId,
          to: targetUser.keycloakId,
          roomID,
          isVideoCall,
        });

        // Gửi yêu cầu gọi qua socket
        const success = await startSocketAudioCall(
          targetUser.keycloakId,
          roomID
        );

        if (success) {
          // Khởi tạo WebRTC service
          await webRTCService.initialize({
            userId: user.keycloakId,
            username: user.username,
            socket: socket,
            roomId: roomID,
            callId: null,
            targetUserId: targetUser.keycloakId,
            isVideoCall: isVideoCall,
            isInitiator: true,
          });

          // Bắt đầu cuộc gọi
          await webRTCService.startCall();

          dispatch(
            showSnackbar({
              severity: "success",
              message: `${isVideoCall ? "Video" : "Audio"} call started with ${
                targetUser.firstName
              } ${targetUser.lastName}`,
            })
          );

          // Đóng dialog
          handleClose();
        } else {
          throw new Error("Failed to start call");
        }
      } catch (error) {
        console.error("❌ Failed to start call:", error);
        dispatch(
          showSnackbar({
            severity: "error",
            message: error.message || "Failed to start call. Please try again.",
          })
        );
      } finally {
        setLoading(false);
        setSelectedUserId(null);
      }
    },
    [user, isVideoCall, dispatch, handleClose]
  );

  // Xử lý click user
  const handleUserClick = useCallback(
    (userItem) => {
      if (loading) return;

      console.log("📞 Starting call with:", userItem);
      handleStartCall(userItem);
    },
    [loading, handleStartCall]
  );

  // Lấy avatar URL
  const getAvatarUrl = (userItem) => {
    if (userItem?.avatar) return userItem.avatar;

    // Fallback to avatar based on name
    const name = `${userItem?.firstName} ${userItem?.lastName}`;
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name
    )}&background=random&color=fff&size=128`;
  };

  // Lấy trạng thái user
  const getUserStatus = (userId) => {
    if (onlineUsers.has(userId)) {
      return { status: "online", label: "Online", color: "success" };
    }
    return { status: "offline", label: "Offline", color: "default" };
  };

  const userList = filteredUsers.map((userItem) => {
    const status = getUserStatus(userItem.keycloakId);
    const fullName = `${userItem?.firstName || ""} ${
      userItem?.lastName || ""
    }`.trim();

    return {
      id: userItem.keycloakId,
      name: fullName || userItem?.email,
      email: userItem?.email,
      avatar: getAvatarUrl(userItem),
      status: status.status,
      statusLabel: status.label,
      statusColor: status.color,
      isCurrentUser: userItem.keycloakId === user?.keycloakId,
      userData: userItem,
    };
  });

  return (
    <Dialog
      fullWidth
      maxWidth="sm"
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleClose}
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          height: "80vh",
          background: theme.palette.background.paper,
          overflow: "hidden",
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          p: 3,
          pb: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          background: isVideoCall
            ? "linear-gradient(135deg, #FF416C 0%, #FF4B2B 100%)"
            : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Stack direction="row" alignItems="center" spacing={2}>
            {isVideoCall ? (
              <VideoCamera size={24} weight="bold" />
            ) : (
              <Phone size={24} weight="bold" />
            )}
            <Typography variant="h5" fontWeight="bold">
              Start New {isVideoCall ? "Video" : "Audio"} Call
            </Typography>
          </Stack>
          <IconButton
            onClick={handleClose}
            sx={{
              color: "white",
              "&:hover": {
                background: "rgba(255,255,255,0.1)",
              },
            }}
            disabled={loading}
          >
            <X size={20} />
          </IconButton>
        </Stack>

        <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
          Select a contact to start {isVideoCall ? "video" : "audio"} call
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: "100%" }}>
        <Stack sx={{ height: "100%" }}>
          {/* Search Bar */}
          <Box sx={{ p: 2, pb: 1 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search contacts by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <MagnifyingGlass
                      size={20}
                      color={theme.palette.text.secondary}
                    />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={() => setSearchTerm("")}
                      disabled={loading}
                    >
                      <X size={16} />
                    </IconButton>
                  </InputAdornment>
                ),
                sx: {
                  borderRadius: 2,
                  background: theme.palette.background.default,
                },
              }}
            />

            {/* Filter Chips */}
            <Stack
              direction="row"
              spacing={1}
              sx={{ mt: 2, flexWrap: "wrap", gap: 1 }}
            >
              <Chip
                label="All Contacts"
                size="small"
                color="primary"
                variant="filled"
                onClick={() => setSearchTerm("")}
              />
              <Chip
                label="Online"
                size="small"
                variant={searchTerm === "" ? "outlined" : "filled"}
                icon={<CheckCircle size={14} />}
                onClick={() => {
                  const onlineIds = Array.from(onlineUsers);
                  const onlineUsersList = all_users.filter(
                    (u) =>
                      onlineIds.includes(u.keycloakId) &&
                      u.keycloakId !== user?.keycloakId
                  );
                  setFilteredUsers(onlineUsersList);
                }}
              />
              <Chip
                label="Recent"
                size="small"
                variant="outlined"
                icon={<Clock size={14} />}
              />
            </Stack>
          </Box>

          <Divider />

          {/* User List */}
          <Box sx={{ flexGrow: 1, overflow: "hidden" }}>
            {loading && (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100px",
                }}
              >
                <CircularProgress />
                <Typography sx={{ ml: 2 }}>Starting call...</Typography>
              </Box>
            )}

            <SimpleBarStyle style={{ height: "100%" }}>
              <Stack spacing={0.5} sx={{ p: 2 }}>
                {userList.length > 0 ? (
                  userList.map((userItem, index) => (
                    <Box key={userItem.id}>
                      <Stack
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        sx={{
                          p: 2,
                          borderRadius: 2,
                          cursor: loading ? "not-allowed" : "pointer",
                          transition: "all 0.2s",
                          opacity:
                            loading && selectedUserId !== userItem.id ? 0.5 : 1,
                          "&:hover": {
                            background: loading
                              ? "transparent"
                              : theme.palette.action.hover,
                            transform: loading ? "none" : "translateY(-1px)",
                            boxShadow: loading ? "none" : theme.shadows[1],
                          },
                        }}
                        onClick={() =>
                          !loading && handleUserClick(userItem.userData)
                        }
                      >
                        {/* Avatar with Status */}
                        <Badge
                          color={userItem.statusColor}
                          variant="dot"
                          anchorOrigin={{
                            vertical: "bottom",
                            horizontal: "right",
                          }}
                          overlap="circular"
                        >
                          <Avatar
                            src={userItem.avatar}
                            sx={{
                              width: 50,
                              height: 50,
                              border: `2px solid ${theme.palette.background.paper}`,
                            }}
                          >
                            {!userItem.avatar && <UserCircle size={24} />}
                          </Avatar>
                        </Badge>

                        {/* User Info */}
                        <Stack sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography
                            variant="subtitle1"
                            fontWeight="600"
                            noWrap
                          >
                            {userItem.name}
                            {userItem.isCurrentUser && (
                              <Typography
                                component="span"
                                variant="caption"
                                sx={{ ml: 1, color: "text.secondary" }}
                              >
                                (You)
                              </Typography>
                            )}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                          >
                            {userItem.email}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Status: {userItem.statusLabel}
                          </Typography>
                        </Stack>

                        {/* Call Button */}
                        <Tooltip
                          title={`Start ${
                            isVideoCall ? "video" : "audio"
                          } call`}
                        >
                          <IconButton
                            sx={{
                              background: isVideoCall
                                ? theme.palette.error.main
                                : theme.palette.primary.main,
                              color: "white",
                              "&:hover": {
                                background: isVideoCall
                                  ? theme.palette.error.dark
                                  : theme.palette.primary.dark,
                                transform: loading ? "none" : "scale(1.1)",
                              },
                              transition: "all 0.2s",
                              opacity:
                                loading && selectedUserId !== userItem.id
                                  ? 0.5
                                  : 1,
                            }}
                            disabled={loading}
                          >
                            {loading && selectedUserId === userItem.id ? (
                              <CircularProgress size={20} color="inherit" />
                            ) : isVideoCall ? (
                              <VideoCamera size={20} weight="bold" />
                            ) : (
                              <Phone size={20} weight="bold" />
                            )}
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      {index < userList.length - 1 && (
                        <Divider sx={{ mx: 2 }} />
                      )}
                    </Box>
                  ))
                ) : (
                  /* Empty State */
                  <Stack
                    spacing={2}
                    alignItems="center"
                    justifyContent="center"
                    sx={{
                      height: 200,
                      textAlign: "center",
                    }}
                  >
                    <UserPlus size={48} color={theme.palette.text.secondary} />
                    <Typography variant="h6" color="text.secondary">
                      No contacts found
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {searchTerm
                        ? `No results for "${searchTerm}"`
                        : "Your contacts will appear here"}
                    </Typography>
                  </Stack>
                )}
              </Stack>
            </SimpleBarStyle>
          </Box>

          {/* Footer */}
          <Box
            sx={{
              p: 2,
              borderTop: `1px solid ${theme.palette.divider}`,
              background: theme.palette.background.default,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              textAlign="center"
              display="block"
            >
              {userList.length} contacts • {onlineUsers.size} online • Tap to
              start {isVideoCall ? "video" : "audio"} call
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default StartCall;
