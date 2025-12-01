// src/pages/roles/components/UsersTab.js
import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemIcon,
  Avatar,
  Chip,
  IconButton,
  Button,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  Alert,
} from "@mui/material";
import {
  Person,
  Block,
  Check,
  Refresh,
  MoreVert,
  AdminPanelSettings,
  Security,
} from "@mui/icons-material";

export default function UsersTab({
  loading,
  usersList,
  currentUser, // 🆕 NHẬN currentUser từ parent
  onRefresh,
  onUserStatusChange,
  onRoleChange,
  onRemoveRole,
}) {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const [selectedUser, setSelectedUser] = React.useState(null);

  // 🆕 FILTER: Loại bỏ user hiện tại khỏi danh sách hiển thị
  const filteredUsersList = React.useMemo(() => {
    if (!currentUser || !currentUser.user_id) {
      console.log(
        "🔄 No current user info, showing all users:",
        usersList.length
      );
      return usersList;
    }

    const filtered = usersList.filter((user) => {
      // So sánh với cả keycloakId và _id để đảm bảo filter chính xác
      const isCurrentUser =
        user.keycloakId === currentUser.user_id ||
        user._id === currentUser.user_id ||
        user.keycloakId === currentUser.keycloakId;

      return !isCurrentUser;
    });

    console.log("🔄 Filtered users:", {
      totalUsers: usersList.length,
      filteredUsers: filtered.length,
      currentUserId: currentUser.user_id,
      currentUserKeycloakId: currentUser.keycloakId,
      currentUserName: `${currentUser.firstName} ${currentUser.lastName}`,
    });

    return filtered;
  }, [usersList, currentUser]);

  const handleMenuOpen = (event, user) => {
    setAnchorEl(event.currentTarget);
    setSelectedUser(user);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedUser(null);
  };

  const handleRoleChange = async (newRole) => {
    if (selectedUser) {
      await onRoleChange(selectedUser._id, newRole);
      handleMenuClose();
    }
  };

  const handleRemoveRole = async (roleToRemove) => {
    if (selectedUser) {
      await onRemoveRole(selectedUser._id, roleToRemove);
      handleMenuClose();
    }
  };

  const handleStatusChange = async () => {
    if (selectedUser) {
      await onUserStatusChange(selectedUser._id, !selectedUser.isActive);
      handleMenuClose();
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: "error",
      moderator: "warning",
      user: "primary",
    };
    return colors[role] || "default";
  };

  const getRoleText = (role) => {
    const roleMap = {
      admin: "Quản trị viên",
      moderator: "Điều hành viên",
      user: "Người dùng",
    };
    return roleMap[role] || role;
  };

  const getStatusIcon = (isActive) => {
    return isActive ? (
      <Check sx={{ color: "success.main" }} />
    ) : (
      <Block sx={{ color: "error.main" }} />
    );
  };

  const formatLastSeen = (lastSeen) => {
    if (!lastSeen) return "Chưa đăng nhập";

    const now = new Date();
    const lastSeenDate = new Date(lastSeen);
    const diffMs = now - lastSeenDate;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return lastSeenDate.toLocaleDateString("vi-VN");
  };

  const isUserOnline = (lastSeen) => {
    if (!lastSeen) return false;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    return new Date(lastSeen) > fifteenMinutesAgo;
  };

  // Hàm kiểm tra role nào user chưa có để hiển thị option thêm
  const getAvailableRolesToAdd = (user) => {
    const allRoles = ["admin", "moderator", "user"];
    return allRoles.filter((role) => !user.roles?.includes(role));
  };

  // Hàm kiểm tra role nào user đã có để hiển thị option xóa (trừ role 'user')
  const getRolesToRemove = (user) => {
    return user.roles?.filter((role) => role !== "user") || [];
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h5" component="h2">
                Quản lý Người dùng
              </Typography>
              <Box sx={{ display: "flex", gap: 1, alignItems: "center" }}>
                <Typography variant="body2" color="text.secondary">
                  Tổng số: {filteredUsersList.length} người dùng{" "}
                  {/* 🆕 SỬA: dùng filteredUsersList */}
                </Typography>
                <Button
                  startIcon={<Refresh />}
                  onClick={onRefresh}
                  variant="outlined"
                  size="small"
                >
                  Làm mới
                </Button>
              </Box>
            </Box>

            {/* 🆕 THÔNG BÁO FILTER */}
            {currentUser && usersList.length !== filteredUsersList.length && (
              <Alert severity="info" sx={{ mb: 2 }}>
                Đang ẩn tài khoản của bạn ({currentUser.firstName}{" "}
                {currentUser.lastName}) khỏi danh sách
              </Alert>
            )}

            {filteredUsersList.length === 0 ? ( // 🆕 SỬA: dùng filteredUsersList
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  Không có người dùng nào
                </Typography>
              </Box>
            ) : (
              <List>
                {console.log(
                  "🔄 Displaying filtered users:",
                  filteredUsersList
                )}
                {filteredUsersList.map(
                  (
                    user // 🆕 SỬA: dùng filteredUsersList
                  ) => (
                    <ListItem
                      key={user._id}
                      sx={{
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 2,
                        mb: 1,
                        bgcolor: "background.default",
                        transition: "all 0.2s ease-in-out",
                        "&:hover": {
                          bgcolor: "action.hover",
                          boxShadow: 1,
                        },
                      }}
                      secondaryAction={
                        <Box
                          sx={{
                            display: "flex",
                            gap: 1,
                            alignItems: "center",
                          }}
                        >
                          {/* Trạng thái online/offline */}
                          <Tooltip
                            title={
                              isUserOnline(user.lastSeen)
                                ? "Đang online"
                                : "Đang offline"
                            }
                          >
                            <Chip
                              icon={getStatusIcon(isUserOnline(user.lastSeen))}
                              label={
                                isUserOnline(user.lastSeen)
                                  ? "Online"
                                  : "Offline"
                              }
                              color={
                                isUserOnline(user.lastSeen)
                                  ? "success"
                                  : "default"
                              }
                              variant="outlined"
                              size="small"
                            />
                          </Tooltip>

                          {/* Trạng thái hoạt động */}
                          <Tooltip
                            title={
                              user.isActive
                                ? "Tài khoản đang hoạt động"
                                : "Tài khoản đã bị khóa"
                            }
                          >
                            <Chip
                              label={
                                user.isActive ? "Đang hoạt động" : "Đã khóa"
                              }
                              color={user.isActive ? "success" : "error"}
                              size="small"
                            />
                          </Tooltip>

                          {/* Menu thao tác */}
                          <Box>
                            <IconButton
                              onClick={(e) => handleMenuOpen(e, user)}
                              size="small"
                              aria-label="menu"
                              aria-controls={
                                anchorEl ? `user-menu-${user._id}` : undefined
                              }
                              aria-haspopup="true"
                              aria-expanded={anchorEl ? "true" : undefined}
                            >
                              <MoreVert />
                            </IconButton>
                          </Box>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        <Tooltip title={user.roles?.join(", ") || "User"}>
                          <Avatar
                            sx={{
                              bgcolor: user.isActive
                                ? "primary.main"
                                : "grey.500",
                              border: isUserOnline(user.lastSeen)
                                ? "2px solid #4caf50"
                                : "none",
                            }}
                            src={user.avatar}
                          >
                            {!user.avatar && <Person />}
                          </Avatar>
                        </Tooltip>
                      </ListItemIcon>

                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flexWrap: "wrap",
                            mb: 1,
                          }}
                        >
                          <Typography
                            variant="h6"
                            component="div"
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                            }}
                          >
                            {user.firstName} {user.lastName}
                            {user.roles?.includes("admin") && (
                              <AdminPanelSettings
                                color="error"
                                fontSize="small"
                              />
                            )}
                            {user.roles?.includes("moderator") && (
                              <Security color="warning" fontSize="small" />
                            )}
                          </Typography>

                          {/* Hiển thị các role */}
                          <Box
                            sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                          >
                            {user.roles?.map((role) => (
                              <Chip
                                key={role}
                                label={getRoleText(role)}
                                size="small"
                                color={getRoleColor(role)}
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>

                        <Box
                          sx={{
                            display: "flex",
                            gap: 3,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography variant="body2" component="span">
                            <strong>Email:</strong> {user.email}
                          </Typography>
                          <Typography variant="body2" component="span">
                            <strong>Username:</strong> {user.username}
                          </Typography>
                          <Typography variant="body2" component="span">
                            <strong>Ngày tham gia:</strong>{" "}
                            {new Date(user.createdAt).toLocaleDateString(
                              "vi-VN"
                            )}
                          </Typography>
                          <Typography variant="body2" component="span">
                            <strong>Lần cuối online:</strong>{" "}
                            {formatLastSeen(user.lastSeen)}
                          </Typography>
                          {user.lastLoginAt && (
                            <Typography variant="body2" component="span">
                              <strong>Đăng nhập cuối:</strong>{" "}
                              {new Date(user.lastLoginAt).toLocaleDateString(
                                "vi-VN"
                              )}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </ListItem>
                  )
                )}
              </List>
            )}

            {/* Menu thao tác */}
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleMenuClose}
              anchorOrigin={{
                vertical: "bottom",
                horizontal: "right",
              }}
              transformOrigin={{
                vertical: "top",
                horizontal: "right",
              }}
              sx={{
                "& .MuiPaper-root": {
                  minWidth: 200,
                },
              }}
              disableScrollLock={true}
              keepMounted
            >
              {/* Option khóa/mở khóa tài khoản */}
              <MenuItem
                onClick={handleStatusChange}
                sx={{
                  color: selectedUser?.isActive ? "error.main" : "success.main",
                }}
              >
                {selectedUser?.isActive ? (
                  <>
                    <Block sx={{ mr: 1 }} />
                    Khóa tài khoản
                  </>
                ) : (
                  <>
                    <Check sx={{ mr: 1 }} />
                    Mở khóa tài khoản
                  </>
                )}
              </MenuItem>

              {/* Các role có thể thêm */}
              {selectedUser &&
                getAvailableRolesToAdd(selectedUser).map((role) => (
                  <MenuItem
                    key={`add-${role}`}
                    onClick={() => handleRoleChange(role)}
                  >
                    {role === "admin" && <AdminPanelSettings sx={{ mr: 1 }} />}
                    {role === "moderator" && <Security sx={{ mr: 1 }} />}
                    {role === "user" && <Person sx={{ mr: 1 }} />}
                    Đặt làm {getRoleText(role)}
                  </MenuItem>
                ))}

              {/* Các role có thể xóa (trừ role 'user') */}
              {selectedUser &&
                getRolesToRemove(selectedUser).map((role) => (
                  <MenuItem
                    key={`remove-${role}`}
                    onClick={() => handleRemoveRole(role)}
                    sx={{ color: "error.main" }}
                  >
                    <Block sx={{ mr: 1 }} />
                    Xóa vai trò {getRoleText(role)}
                  </MenuItem>
                ))}
            </Menu>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
