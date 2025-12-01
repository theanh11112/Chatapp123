// src/pages/roles/components/user/ReminderSystem.js - ĐÃ CẬP NHẬT
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Avatar,
  AvatarGroup,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Badge,
  Tabs,
  Tab,
} from "@mui/material";
import {
  Add,
  AccessTime,
  Notifications,
  Delete,
  Refresh,
  Visibility,
  People,
  CheckCircle,
  NotificationsActive,
  Done,
} from "@mui/icons-material";

// 🆕 Import CreateReminderDialog
import CreateReminderDialog from "../dialogs/CreateReminderDialog";

const ReminderSystem = ({
  loading = false,
  reminders = [],
  tasks = [], // 🆕 THÊM PROP TASKS
  currentUser,
  onRefresh,
  onDeleteReminder,
  onCreateReminder,
  onViewReminder,
  onCompleteReminder, // 🆕 Thêm prop hoàn thành reminder
}) => {
  const [filter, setFilter] = useState("active");
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false); // 🆕 State cho dialog tạo reminder

  // 🆕 CẬP NHẬT: Thêm tabs state
  const [activeTab, setActiveTab] = useState(0);

  // 🆕 CẬP NHẬT: Thêm các reminder type mới
  const getReminderTypeColor = (type) => {
    switch (type) {
      case "meeting":
        return "primary";
      case "deadline":
        return "error";
      case "task_reminder":
        return "warning";
      case "due_date":
        return "error";
      case "start_date":
        return "success";
      case "personal":
        return "info";
      case "birthday":
        return "secondary";
      case "appointment":
        return "primary";
      default:
        return "default";
    }
  };

  const getReminderTypeIcon = (type) => {
    switch (type) {
      case "meeting":
        return "👥";
      case "deadline":
        return "⏰";
      case "task_reminder":
        return "✅";
      case "due_date":
        return "⏳";
      case "start_date":
        return "🚀";
      case "personal":
        return "👤";
      case "birthday":
        return "🎂";
      case "appointment":
        return "📅";
      default:
        return "🔔";
    }
  };

  const getReminderTypeText = (type) => {
    switch (type) {
      case "meeting":
        return "Cuộc họp";
      case "deadline":
        return "Hạn chót";
      case "task_reminder":
        return "Công việc";
      case "due_date":
        return "Hạn task";
      case "start_date":
        return "Bắt đầu task";
      case "personal":
        return "Cá nhân";
      case "birthday":
        return "Sinh nhật";
      case "appointment":
        return "Lịch hẹn";
      default:
        return "Nhắc nhở";
    }
  };

  const getTimeDifference = (remindAt) => {
    if (!remindAt) return "Không có thời gian";

    const now = new Date();
    const reminderTime = new Date(remindAt);
    const diff = reminderTime - now;

    if (diff < 0) {
      return "Đã quá hạn";
    }

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `Còn ${hours} giờ ${minutes} phút`;
    } else if (minutes > 0) {
      return `Còn ${minutes} phút`;
    } else {
      return "Sắp đến hạn";
    }
  };

  const handleDeleteReminder = (reminderId) => {
    if (onDeleteReminder) {
      onDeleteReminder(reminderId);
    }
  };

  // 🆕 CẬP NHẬT: Hàm mở dialog tạo reminder
  const handleCreateReminder = () => {
    setCreateDialogOpen(true);
  };

  // 🆕 Hàm đóng dialog tạo reminder
  const handleCloseCreateDialog = () => {
    setCreateDialogOpen(false);
  };

  // 🆕 Hàm xử lý tạo reminder mới
  const handleCreateNewReminder = (reminderData) => {
    if (onCreateReminder) {
      onCreateReminder(reminderData);
      handleCloseCreateDialog();
    }
  };

  // 🆕 Hàm xử lý hoàn thành reminder
  const handleCompleteReminder = (reminderId) => {
    if (onCompleteReminder) {
      onCompleteReminder(reminderId);
    }
  };

  // 🆕 Hàm xử lý xem chi tiết reminder
  const handleViewReminder = (reminder) => {
    setSelectedReminder(reminder);
    setDetailDialogOpen(true);

    if (onViewReminder) {
      onViewReminder(reminder);
    }
  };

  const handleCloseDetailDialog = () => {
    setDetailDialogOpen(false);
    setSelectedReminder(null);
  };

  // 🆕 TÍNH TOÁN REMINDERS THEO TAB
  const activeReminders = reminders.filter(
    (r) => !r.isCompleted && r.isActive !== false && !r.isSent
  );
  const completedReminders = reminders.filter((r) => r.isCompleted || r.isSent);
  const allReminders = reminders.filter((r) => r.isActive !== false);

  // 🆕 LẤY REMINDERS THEO TAB ĐANG CHỌN
  const getDisplayReminders = () => {
    switch (activeTab) {
      case 0: // Tất cả
        return allReminders;
      case 1: // Đang hoạt động
        return activeReminders;
      case 2: // Đã hoàn thành
        return completedReminders;
      default:
        return allReminders;
    }
  };

  const displayReminders = getDisplayReminders();

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography textAlign="center">Đang tải nhắc nhở...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <CardContent>
          {/* Header */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
            }}
          >
            <Typography variant="h5" fontWeight="bold">
              ⏰ Hệ thống Nhắc nhở
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                startIcon={<Add />}
                variant="contained"
                onClick={handleCreateReminder}
              >
                Thêm nhắc nhở
              </Button>
              <Button
                startIcon={<Refresh />}
                onClick={onRefresh}
                variant="outlined"
              >
                Làm mới
              </Button>
            </Box>
          </Box>

          {/* Statistics */}
          <Box sx={{ display: "flex", gap: 3, mb: 3, flexWrap: "wrap" }}>
            <Box
              sx={{
                textAlign: "center",
                p: 2,
                minWidth: 120,
                bgcolor: "primary.50",
                borderRadius: 2,
              }}
            >
              <Typography variant="h4" fontWeight="bold" color="primary.main">
                {allReminders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Tổng số
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: "center",
                p: 2,
                minWidth: 120,
                bgcolor: "success.50",
                borderRadius: 2,
              }}
            >
              <Typography variant="h4" fontWeight="bold" color="success.main">
                {activeReminders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đang hoạt động
              </Typography>
            </Box>
            <Box
              sx={{
                textAlign: "center",
                p: 2,
                minWidth: 120,
                bgcolor: "grey.100",
                borderRadius: 2,
              }}
            >
              <Typography variant="h4" fontWeight="bold" color="text.secondary">
                {completedReminders.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Đã hoàn thành
              </Typography>
            </Box>
          </Box>

          {/* Tabs Navigation */}
          <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
            <Tabs
              value={activeTab}
              onChange={(e, newValue) => setActiveTab(newValue)}
            >
              <Tab
                icon={<Notifications />}
                label={`Tất cả (${allReminders.length})`}
              />
              <Tab
                icon={<NotificationsActive />}
                label={`Đang hoạt động (${activeReminders.length})`}
              />
              <Tab
                icon={<CheckCircle />}
                label={`Đã hoàn thành (${completedReminders.length})`}
              />
            </Tabs>
          </Box>

          {/* Reminders List */}
          {displayReminders.length > 0 ? (
            <List>
              {displayReminders.map((reminder, index) => (
                <div key={reminder._id || reminder.id || index}>
                  <ListItem
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      mb: 1,
                      bgcolor:
                        reminder.isCompleted || reminder.isSent
                          ? "success.50"
                          : "background.paper",
                      opacity: reminder.isCompleted ? 0.7 : 1,
                    }}
                  >
                    <ListItemIcon>
                      <Box sx={{ fontSize: 24 }}>
                        {getReminderTypeIcon(
                          reminder.reminderType || reminder.type
                        )}
                      </Box>
                    </ListItemIcon>

                    <Box sx={{ flex: 1, mr: 2 }}>
                      {/* Primary content */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight="medium"
                          color={
                            reminder.isCompleted || reminder.isSent
                              ? "text.secondary"
                              : "text.primary"
                          }
                          sx={{
                            textDecoration:
                              reminder.isCompleted || reminder.isSent
                                ? "line-through"
                                : "none",
                          }}
                        >
                          {reminder.title}
                        </Typography>
                        <Chip
                          label={getReminderTypeText(
                            reminder.reminderType || reminder.type
                          )}
                          size="small"
                          color={getReminderTypeColor(
                            reminder.reminderType || reminder.type
                          )}
                          variant="filled"
                        />
                        {(reminder.isCompleted || reminder.isSent) && (
                          <Chip
                            label="Đã hoàn thành"
                            size="small"
                            color="success"
                            variant="outlined"
                          />
                        )}
                      </Box>

                      {/* Secondary content */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {reminder.description}
                      </Typography>

                      {/* 🆕 Hiển thị recipients */}
                      {reminder.recipientIds &&
                        reminder.recipientIds.length > 0 && (
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1,
                              mb: 1,
                            }}
                          >
                            <People fontSize="small" color="action" />
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {reminder.recipientIds.length} người nhận
                            </Typography>
                            <AvatarGroup
                              max={3}
                              sx={{
                                "& .MuiAvatar-root": {
                                  width: 24,
                                  height: 24,
                                  fontSize: "0.7rem",
                                },
                              }}
                            >
                              {reminder.recipientsInfo
                                ?.slice(0, 3)
                                .map((recipient, idx) => (
                                  <Tooltip
                                    key={idx}
                                    title={`${recipient.firstName} ${recipient.lastName}`}
                                  >
                                    <Avatar>
                                      {recipient.firstName?.[0]}
                                      {recipient.lastName?.[0]}
                                    </Avatar>
                                  </Tooltip>
                                )) ||
                                reminder.recipientIds
                                  .slice(0, 3)
                                  .map((id, idx) => (
                                    <Tooltip key={idx} title={id}>
                                      <Avatar>{id[0]}</Avatar>
                                    </Tooltip>
                                  ))}
                            </AvatarGroup>
                          </Box>
                        )}

                      {/* Timestamp and status */}
                      <Box
                        sx={{
                          display: "flex",
                          gap: 2,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                          }}
                        >
                          <AccessTime fontSize="small" />
                          <Typography variant="caption" color="text.secondary">
                            {reminder.remindAt
                              ? new Date(reminder.remindAt).toLocaleString(
                                  "vi-VN"
                                )
                              : "Không có thời gian"}
                          </Typography>
                        </Box>
                        <Chip
                          label={getTimeDifference(reminder.remindAt)}
                          size="small"
                          variant="outlined"
                          color={
                            getTimeDifference(reminder.remindAt).includes(
                              "quá hạn"
                            )
                              ? "error"
                              : getTimeDifference(reminder.remindAt).includes(
                                  "Sắp đến"
                                )
                              ? "warning"
                              : "primary"
                          }
                        />
                      </Box>
                    </Box>

                    <ListItemSecondaryAction>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        {/* 🆕 NÚT HOÀN THÀNH - CHỈ HIỆN KHI CHƯA HOÀN THÀNH */}
                        {!reminder.isCompleted && !reminder.isSent && (
                          <IconButton
                            size="small"
                            onClick={() =>
                              handleCompleteReminder(
                                reminder._id || reminder.id
                              )
                            }
                            color="success"
                            title="Đánh dấu đã hoàn thành"
                          >
                            <Done />
                          </IconButton>
                        )}

                        {/* 🆕 NÚT XEM - GIỐNG NHƯ TRONG ADMIN */}
                        <IconButton
                          size="small"
                          onClick={() => handleViewReminder(reminder)}
                          color="info"
                          title="Xem chi tiết"
                          sx={{
                            bgcolor: "primary.main",
                            color: "white",
                            "&:hover": {
                              bgcolor: "primary.dark",
                            },
                          }}
                        >
                          <Visibility />
                        </IconButton>

                        <IconButton
                          size="small"
                          onClick={() =>
                            handleDeleteReminder(reminder._id || reminder.id)
                          }
                          color="error"
                          title="Xóa nhắc nhở"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {index < displayReminders.length - 1 && <Divider />}
                </div>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              {activeTab === 0
                ? "Không có nhắc nhở nào."
                : activeTab === 1
                ? "Không có nhắc nhở nào đang hoạt động."
                : "Không có nhắc nhở nào đã hoàn thành."}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* 🆕 Dialog xem chi tiết reminder */}
      <Dialog
        open={detailDialogOpen}
        onClose={handleCloseDetailDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ fontSize: 24 }}>
              {selectedReminder &&
                getReminderTypeIcon(
                  selectedReminder.reminderType || selectedReminder.type
                )}
            </Box>
            <Typography variant="h6">Chi tiết nhắc nhở</Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedReminder && (
            <Box sx={{ mt: 2 }}>
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Tiêu đề
                </Typography>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {selectedReminder.title}
                </Typography>
                <Chip
                  label={getReminderTypeText(
                    selectedReminder.reminderType || selectedReminder.type
                  )}
                  color={getReminderTypeColor(
                    selectedReminder.reminderType || selectedReminder.type
                  )}
                  sx={{ mb: 2 }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Mô tả
                </Typography>
                <Typography variant="body1">
                  {selectedReminder.description || "Không có mô tả"}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Thời gian nhắc nhở
                </Typography>
                <Typography variant="body1">
                  {selectedReminder.remindAt
                    ? new Date(selectedReminder.remindAt).toLocaleString(
                        "vi-VN"
                      )
                    : "Không có thời gian"}
                </Typography>
                <Chip
                  label={getTimeDifference(selectedReminder.remindAt)}
                  variant="outlined"
                  color={
                    getTimeDifference(selectedReminder.remindAt).includes(
                      "quá hạn"
                    )
                      ? "error"
                      : getTimeDifference(selectedReminder.remindAt).includes(
                          "Sắp đến"
                        )
                      ? "warning"
                      : "primary"
                  }
                  sx={{ mt: 1 }}
                />
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Trạng thái
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {selectedReminder.isSent && (
                    <Chip label="Đã gửi" color="success" size="small" />
                  )}
                  {selectedReminder.isCompleted && (
                    <Chip label="Đã hoàn thành" color="success" size="small" />
                  )}
                  {selectedReminder.isActive === false && (
                    <Chip label="Đã tắt" color="default" size="small" />
                  )}
                  {!selectedReminder.isSent &&
                    !selectedReminder.isCompleted &&
                    selectedReminder.isActive !== false && (
                      <Chip
                        label="Đang hoạt động"
                        color="primary"
                        size="small"
                      />
                    )}
                </Box>
              </Box>

              {selectedReminder.taskId && (
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="subtitle2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Liên kết với Task
                  </Typography>
                  <Typography variant="body1">
                    {selectedReminder.taskId.title || selectedReminder.taskId}
                  </Typography>
                </Box>
              )}

              {selectedReminder.recipientIds &&
                selectedReminder.recipientIds.length > 0 && (
                  <Box sx={{ mb: 3 }}>
                    <Typography
                      variant="subtitle2"
                      color="text.secondary"
                      gutterBottom
                    >
                      Người nhận ({selectedReminder.recipientIds.length})
                    </Typography>
                    <AvatarGroup max={5}>
                      {selectedReminder.recipientsInfo?.map(
                        (recipient, idx) => (
                          <Tooltip
                            key={idx}
                            title={`${recipient.firstName} ${recipient.lastName}`}
                          >
                            <Avatar>
                              {recipient.firstName?.[0]}
                              {recipient.lastName?.[0]}
                            </Avatar>
                          </Tooltip>
                        )
                      ) ||
                        selectedReminder.recipientIds.map((id, idx) => (
                          <Tooltip key={idx} title={id}>
                            <Avatar>{id[0]}</Avatar>
                          </Tooltip>
                        ))}
                    </AvatarGroup>
                  </Box>
                )}

              <Box>
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  gutterBottom
                >
                  Thông tin khác
                </Typography>
                <Typography variant="body2">
                  ID: {selectedReminder._id || selectedReminder.id}
                </Typography>
                <Typography variant="body2">
                  Ngày tạo:{" "}
                  {selectedReminder.createdAt
                    ? new Date(selectedReminder.createdAt).toLocaleString(
                        "vi-VN"
                      )
                    : "Không có"}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetailDialog}>Đóng</Button>
        </DialogActions>
      </Dialog>

      {/* 🆕 Dialog tạo reminder */}
      <CreateReminderDialog
        open={createDialogOpen}
        onClose={handleCloseCreateDialog}
        currentUser={currentUser}
        isAdmin={false}
        onCreateReminder={handleCreateNewReminder}
        tasks={tasks} // 🆕 TRUYỀN TASKS VÀO ĐÂY
        loading={loading}
      />
    </div>
  );
};

export default ReminderSystem;
