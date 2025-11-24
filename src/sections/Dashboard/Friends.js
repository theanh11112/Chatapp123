import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  Slide,
  Stack,
  Tab,
  Tabs,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { FetchFriendRequests, FetchFriends } from "../../redux/slices/app";
import {
  FriendElement,
  FriendRequestElement,
  UserElement,
} from "../../components/UserElement";
import { useKeycloak } from "@react-keycloak/web";
import api from "../../utils/axios";
import { showSnackbar } from "../../redux/slices/app";

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const UsersList = () => {
  const { keycloak } = useKeycloak();
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [error, setError] = useState(null);
  const dispatch = useDispatch();

  const fetchUsers = async () => {
    try {
      setIsLoadingUsers(true);
      setError(null);

      const response = await api.post("/users/get-nonfriends");

      if (!response.data) {
        throw new Error("Invalid response from server");
      }

      if (response.data.status === "success") {
        const usersData = response.data.data || [];

        if (usersData.length === 0) {
          setUsers([]);
          dispatch(
            showSnackbar({
              severity: "info",
              message: "No new users found to add as friends",
            })
          );
          return;
        }

        // Xử lý users
        const processedUsers = usersData.map((user) => {
          const processedUser = { ...user };

          // Đảm bảo ID consistency
          processedUser.id = user.id || user._id || user.keycloakId;
          processedUser.keycloakId = user.keycloakId || user.id;

          // Format tên đầy đủ
          if (user.firstName && user.lastName) {
            processedUser.name = `${user.firstName} ${user.lastName}`;
          } else if (user.fullName) {
            processedUser.name = user.fullName;
          } else {
            processedUser.name = user.username || user.email || "Unknown User";
          }

          // Đảm bảo các trường UI cần thiết
          processedUser.email = user.email || "";
          processedUser.avatar =
            user.avatar || `https://i.pravatar.cc/150?u=${user.keycloakId}`;
          processedUser.status = user.status || "Offline";
          processedUser.lastSeen = user.lastSeen || new Date().toISOString();
          processedUser.friendRequestStatus = "none";

          return processedUser;
        });

        setUsers(processedUsers);

        dispatch(
          showSnackbar({
            severity: "success",
            message: `Found ${processedUsers.length} users to connect with`,
          })
        );
      } else {
        const errorMsg =
          response.data.message || "Failed to load non-friend users";
        setError(errorMsg);
        setUsers([]);

        dispatch(
          showSnackbar({
            severity: "error",
            message: errorMsg,
          })
        );
      }
    } catch (error) {
      let errorMessage = "Cannot connect to server";
      if (error.response) {
        errorMessage =
          error.response.data?.message ||
          `Server error: ${error.response.status}`;
      } else if (error.request) {
        errorMessage = "No response from server";
      }

      setError(errorMessage);

      dispatch(
        showSnackbar({
          severity: "error",
          message: errorMessage,
        })
      );

      // Fallback data chỉ khi thực sự cần
      const mockUsers = [
        {
          id: "1",
          _id: "1",
          keycloakId: "user1",
          name: "John Doe",
          email: "john@example.com",
          avatar: "https://i.pravatar.cc/150?img=1",
          status: "Online",
          lastSeen: new Date().toISOString(),
          friendRequestStatus: "none",
        },
        {
          id: "2",
          _id: "2",
          keycloakId: "user2",
          name: "Jane Smith",
          email: "jane@example.com",
          avatar: "https://i.pravatar.cc/150?img=2",
          status: "Offline",
          lastSeen: new Date().toISOString(),
          friendRequestStatus: "none",
        },
      ];
      setUsers(mockUsers);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Hàm xử lý gửi friend request
  const handleSendFriendRequest = async (recipientKeycloakId) => {
    try {
      const response = await api.post("/users/send-friend-request", {
        senderKeycloakId: keycloak.subject,
        recipientKeycloakId: recipientKeycloakId,
      });

      if (response.data.status === "success") {
        // Cập nhật UI: thay đổi trạng thái của user đã gửi request
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.keycloakId === recipientKeycloakId
              ? { ...user, friendRequestStatus: "pending" }
              : user
          )
        );

        dispatch(
          showSnackbar({
            severity: "success",
            message: "Friend request sent successfully! 🎉",
          })
        );
      } else {
        dispatch(
          showSnackbar({
            severity: "error",
            message: response.data.message || "Failed to send friend request",
          })
        );
      }
    } catch (error) {
      let errorMessage = "Failed to send friend request";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      dispatch(
        showSnackbar({
          severity: "error",
          message: errorMessage,
        })
      );
    }
  };

  // Hàm xử lý hủy friend request
  const handleCancelFriendRequest = async (recipientKeycloakId) => {
    try {
      const response = await api.post("/users/cancel-friend-request", {
        senderKeycloakId: keycloak.subject,
        recipientKeycloakId: recipientKeycloakId,
      });

      if (response.data.status === "success") {
        // Cập nhật UI: chuyển trạng thái về "none"
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user.keycloakId === recipientKeycloakId
              ? { ...user, friendRequestStatus: "none" }
              : user
          )
        );

        dispatch(
          showSnackbar({
            severity: "success",
            message: "Friend request canceled successfully",
          })
        );
      } else {
        dispatch(
          showSnackbar({
            severity: "error",
            message: response.data.message || "Failed to cancel friend request",
          })
        );
      }
    } catch (error) {
      let errorMessage = "Failed to cancel friend request";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      }

      dispatch(
        showSnackbar({
          severity: "error",
          message: errorMessage,
        })
      );
    }
  };

  // Hàm refresh danh sách users
  const handleRefreshUsers = () => {
    fetchUsers();
  };

  useEffect(() => {
    if (keycloak.authenticated) {
      fetchUsers();
    }
  }, [keycloak.authenticated]);

  if (isLoadingUsers) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={30} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading users...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Refresh button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          onClick={handleRefreshUsers}
          variant="outlined"
          size="small"
          disabled={isLoadingUsers}
        >
          Refresh
        </Button>
      </Box>

      {error && (
        <Alert
          severity="warning"
          sx={{
            mb: 2,
            fontSize: "0.8rem",
            py: 0.5,
          }}
          action={
            <Button color="inherit" size="small" onClick={handleRefreshUsers}>
              RETRY
            </Button>
          }
        >
          {error} - Using demo data
        </Alert>
      )}

      {users && users.length > 0 ? (
        <Stack spacing={1}>
          {users.map((user, idx) => (
            <UserElement
              key={user.keycloakId || user._id || user.id || idx}
              {...user}
              onSendRequest={handleSendFriendRequest}
              onCancelRequest={handleCancelFriendRequest}
            />
          ))}
        </Stack>
      ) : (
        !isLoadingUsers && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              No users found
            </Typography>
            <Typography variant="caption" color="text.secondary">
              All users are already your friends or have pending requests
            </Typography>
          </Box>
        )
      )}
    </Box>
  );
};

const FriendsList = () => {
  const dispatch = useDispatch();
  const { keycloak } = useKeycloak();

  const { friends, isLoading } = useSelector((state) => state.app);

  const handleRefreshFriends = () => {
    if (keycloak.authenticated && keycloak.tokenParsed?.sub) {
      const keycloakId = keycloak.tokenParsed.sub;
      dispatch(FetchFriends(keycloakId));
    }
  };

  useEffect(() => {
    if (keycloak.authenticated && keycloak.tokenParsed?.sub) {
      const keycloakId = keycloak.tokenParsed.sub;
      dispatch(FetchFriends(keycloakId));
    }
  }, [dispatch, keycloak.authenticated, keycloak.tokenParsed?.sub]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={30} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading friends...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Refresh button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          onClick={handleRefreshFriends}
          variant="outlined"
          size="small"
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      {friends && friends.length > 0 ? (
        <Stack spacing={1}>
          {friends.map((friend, idx) => (
            <FriendElement key={friend._id || friend.id || idx} {...friend} />
          ))}
        </Stack>
      ) : (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No friends yet
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Add some friends to get started!
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const RequestsList = () => {
  const dispatch = useDispatch();
  const { keycloak } = useKeycloak();

  const { friendRequests, isLoading } = useSelector((state) => state.app);

  const handleRefreshRequests = () => {
    if (keycloak.authenticated && keycloak.tokenParsed?.sub) {
      const keycloakId = keycloak.tokenParsed.sub;
      dispatch(FetchFriendRequests(keycloakId));
    }
  };

  useEffect(() => {
    if (keycloak.authenticated && keycloak.tokenParsed?.sub) {
      const keycloakId = keycloak.tokenParsed.sub;
      dispatch(FetchFriendRequests(keycloakId));
    }
  }, [dispatch, keycloak.authenticated, keycloak.tokenParsed?.sub]);

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress size={30} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading requests...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Refresh button */}
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
        <Button
          onClick={handleRefreshRequests}
          variant="outlined"
          size="small"
          disabled={isLoading}
        >
          Refresh
        </Button>
      </Box>

      {friendRequests && friendRequests.length > 0 ? (
        <Stack spacing={1}>
          {friendRequests.map((request, idx) => (
            <FriendRequestElement
              key={request._id || request.id || idx}
              {...request}
              id={request._id || request.id}
              sender={request.sender}
            />
          ))}
        </Stack>
      ) : (
        <Box sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            No friend requests
          </Typography>
        </Box>
      )}
    </Box>
  );
};

const Friends = ({ open, handleClose }) => {
  const [value, setValue] = React.useState(0);
  const { keycloak } = useKeycloak();

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleCloseDialog = () => {
    handleClose();
  };

  return (
    <Dialog
      fullWidth
      maxWidth="xs"
      open={open}
      TransitionComponent={Transition}
      keepMounted
      onClose={handleCloseDialog}
      sx={{ p: 4 }}
    >
      <Stack p={2} sx={{ width: "100%" }}>
        <Tabs value={value} onChange={handleChange} centered>
          <Tab label="Explore" />
          <Tab label="Friends" />
          <Tab label="Requests" />
        </Tabs>
      </Stack>
      <DialogContent>
        <Stack sx={{ height: "100%", minHeight: 400 }}>
          <Stack spacing={2.4}>
            {(() => {
              switch (value) {
                case 0:
                  return <UsersList />;
                case 1:
                  return <FriendsList />;
                case 2:
                  return <RequestsList />;
                default:
                  return <UsersList />;
              }
            })()}
          </Stack>
        </Stack>
      </DialogContent>
    </Dialog>
  );
};

export default Friends;
