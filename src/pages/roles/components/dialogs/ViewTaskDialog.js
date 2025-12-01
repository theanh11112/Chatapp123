// src/pages/roles/components/dialogs/ViewTaskDialog.js - ĐÃ HOÀN THIỆN VỚI CHAT
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Grid,
  Divider,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Avatar,
  AvatarGroup,
  Tooltip,
  Tabs,
  Tab,
  Badge,
} from "@mui/material";
import {
  Task,
  Description,
  Person,
  Warning,
  CalendarToday,
  AccessTime,
  CheckCircle,
  People,
  Edit,
  Info,
  History,
  Chat,
} from "@mui/icons-material";
import taskService from "../../../../services/taskService";
import TaskChat from "../../../../components/Task/TaskChat";

// 🆕 Utility function để lấy display name
const getDisplayName = (user) => {
  if (!user) return "Unknown User";

  // Ưu tiên fullName, sau đó đến firstName + lastName, cuối cùng là username
  if (user.fullName && user.fullName.trim() !== "") {
    return user.fullName;
  }

  if (user.firstName && user.lastName) {
    return `${user.firstName} ${user.lastName}`;
  }

  return user.username || "Unknown User";
};

// 🆕 Utility function để lấy avatar initials
const getAvatarInitials = (user) => {
  if (!user) return "UU";

  if (user.fullName) {
    const names = user.fullName.split(" ");
    if (names.length >= 2) {
      return (names[0][0] + names[names.length - 1][0]).toUpperCase();
    }
    return user.fullName.substring(0, 2).toUpperCase();
  }

  if (user.firstName && user.lastName) {
    return (user.firstName[0] + user.lastName[0]).toUpperCase();
  }

  if (user.username) {
    return user.username.substring(0, 2).toUpperCase();
  }

  return "UU";
};

// Utility functions
const getStatusColor = (status) => {
  const colors = {
    todo: "#ff6b6b",
    in_progress: "#4ecdc4",
    review: "#45b7d1",
    done: "#96ceb4",
  };
  return colors[status] || "#666";
};

const getPriorityColor = (priority) => {
  const colors = {
    low: "#66bb6a",
    medium: "#ffa726",
    high: "#ef5350",
  };
  return colors[priority] || "#666";
};

const getStatusText = (status) => {
  const statusMap = {
    todo: "Cần làm",
    in_progress: "Đang làm",
    review: "Chờ duyệt",
    done: "Hoàn thành",
  };
  return statusMap[status] || status;
};

const getPriorityText = (priority) => {
  const priorityMap = {
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
  };
  return priorityMap[priority] || priority;
};

const formatDate = (dateString) => {
  if (!dateString) return "Không có";
  return new Date(dateString).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ViewTaskDialog({
  open,
  onClose,
  task,
  currentUser,
  onUpdateTaskStatus,
  onEditTask,
  socket, // 🆕 THÊM SOCKET PROP
}) {
  const [taskDetail, setTaskDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // 🆕 STATE CHO TABS
  const [messageCount, setMessageCount] = useState(0); // 🆕 ĐẾM TIN NHẮN

  useEffect(() => {
    const loadTaskDetail = async () => {
      if (!task || !currentUser) return;

      setDetailLoading(true);
      try {
        const response = await taskService.getTaskDetail(
          task._id,
          currentUser.keycloakId || currentUser.user_id
        );

        if (response.status === "success") {
          setTaskDetail(response.data);
        } else {
          setTaskDetail(task); // Fallback to basic task info
        }
      } catch (error) {
        console.error("Error loading task detail:", error);
        setTaskDetail(task); // Fallback to basic task info
      } finally {
        setDetailLoading(false);
      }
    };

    if (open && task) {
      loadTaskDetail();
      setActiveTab(0); // 🆕 RESET TAB KHI MỞ DIALOG
    }
  }, [open, task, currentUser]);

  // 🆕 EFFECT ĐỂ THEO DÕI SỐ LƯỢNG TIN NHẮN
  useEffect(() => {
    if (socket && taskDetail) {
      // Lắng nghe tin nhắn mới để cập nhật badge count
      socket.on("new_task_message", (data) => {
        if (data.taskId === taskDetail._id) {
          setMessageCount((prev) => prev + 1);
        }
      });

      return () => {
        socket.off("new_task_message");
      };
    }
  }, [socket, taskDetail]);

  const handleClose = () => {
    setTaskDetail(null);
    setActiveTab(0); // 🆕 RESET TAB KHI ĐÓNG
    setMessageCount(0); // 🆕 RESET MESSAGE COUNT
    onClose();
  };

  const handleMarkAsDone = async () => {
    if (!taskDetail) return;
    await onUpdateTaskStatus(taskDetail._id, "done");
  };

  // 🆕 Hàm xử lý chỉnh sửa task
  const handleEditTask = () => {
    if (!taskDetail) return;
    onEditTask(taskDetail);
    handleClose(); // Đóng dialog xem sau khi mở dialog chỉnh sửa
  };

  // 🆕 Kiểm tra quyền chỉnh sửa - chỉ cho phép người tạo task hoặc admin chỉnh sửa
  const canEditTask = () => {
    if (!taskDetail || !currentUser) return false;

    // Người tạo task có thể chỉnh sửa
    if (
      taskDetail.assignerId === currentUser.user_id ||
      taskDetail.assignerId === currentUser.keycloakId
    ) {
      return true;
    }

    // Admin có thể chỉnh sửa mọi task
    if (currentUser.roles && currentUser.roles.includes("admin")) {
      return true;
    }

    return false;
  };

  // 🆕 Hàm render assignees info - ĐÃ SỬA
  const renderAssigneesInfo = () => {
    if (!taskDetail) return null;

    // 🆕 Xử lý cả assigneeIds và assigneesInfo
    const assignees =
      taskDetail.assigneesInfo ||
      (taskDetail.assigneeIds
        ? taskDetail.assigneeIds.map((id) => ({
            keycloakId: id,
            fullName: "Unknown User",
            username: "unknown",
          }))
        : []);

    if (assignees.length === 0) {
      return (
        <Grid item xs={12}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <People color="action" />
            <Typography variant="subtitle2" fontWeight="bold">
              Người nhận:
            </Typography>
          </Box>
          <Typography sx={{ ml: 3 }} color="text.secondary">
            Chưa có người nhận
          </Typography>
        </Grid>
      );
    }

    return (
      <Grid item xs={12}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <People color="action" />
          <Typography variant="subtitle2" fontWeight="bold">
            Người nhận ({assignees.length}):
          </Typography>
        </Box>
        <Box sx={{ ml: 3 }}>
          {/* Avatar Group cho nhiều assignees */}
          <AvatarGroup max={4} sx={{ mb: 1 }}>
            {assignees.map((assignee, index) => (
              <Tooltip
                key={assignee.keycloakId || index}
                title={getDisplayName(assignee)}
              >
                <Avatar
                  sx={{ width: 32, height: 32 }}
                  alt={getDisplayName(assignee)}
                >
                  {getAvatarInitials(assignee)}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>

          {/* Danh sách tên assignees */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {assignees.map((assignee, index) => (
              <Box
                key={assignee.keycloakId || index}
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                <Avatar sx={{ width: 24, height: 24, fontSize: "0.8rem" }}>
                  {getAvatarInitials(assignee)}
                </Avatar>
                <Typography variant="body2">
                  {getDisplayName(assignee)}
                  {assignee.username &&
                    assignee.username !== "unknown" &&
                    ` (@${assignee.username})`}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </Grid>
    );
  };

  // 🆕 RENDER CONTENT THEO TAB
  const renderTabContent = () => {
    switch (activeTab) {
      case 0: // Tab Thông tin
        return renderTaskInfo();
      case 1: // Tab Chat
        return (
          <TaskChat
            task={taskDetail}
            currentUser={currentUser}
            socket={socket}
            onClose={() => setActiveTab(0)}
          />
        );
      case 2: // Tab Lịch sử
        return renderActivityLog();
      default:
        return renderTaskInfo();
    }
  };

  // 🆕 RENDER TASK INFO
  const renderTaskInfo = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        {taskDetail.title}
      </Typography>

      {taskDetail.description && (
        <>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1,
            }}
          >
            <Description color="action" />
            <Typography variant="subtitle1" fontWeight="bold">
              Mô tả:
            </Typography>
          </Box>
          <Typography
            variant="body1"
            color="text.secondary"
            paragraph
            sx={{ ml: 3 }}
          >
            {taskDetail.description}
          </Typography>
        </>
      )}

      <Divider sx={{ my: 2 }} />

      <Grid container spacing={3}>
        {/* Status */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1,
            }}
          >
            <Warning color="action" />
            <Typography variant="subtitle2" fontWeight="bold">
              Trạng thái:
            </Typography>
          </Box>
          <Chip
            label={getStatusText(taskDetail.status)}
            sx={{
              bgcolor: getStatusColor(taskDetail.status),
              color: "white",
              ml: 3,
            }}
          />
        </Grid>

        {/* Priority */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1,
            }}
          >
            <Warning color="action" />
            <Typography variant="subtitle2" fontWeight="bold">
              Độ ưu tiên:
            </Typography>
          </Box>
          <Chip
            label={getPriorityText(taskDetail.priority)}
            sx={{
              bgcolor: getPriorityColor(taskDetail.priority),
              color: "white",
              ml: 3,
            }}
          />
        </Grid>

        {/* Assigner */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1,
            }}
          >
            <Person color="action" />
            <Typography variant="subtitle2" fontWeight="bold">
              Người giao:
            </Typography>
          </Box>
          <Box
            sx={{
              ml: 3,
              display: "flex",
              alignItems: "center",
              gap: 1,
            }}
          >
            <Avatar sx={{ width: 24, height: 24, fontSize: "0.8rem" }}>
              {getAvatarInitials(taskDetail.assignerInfo)}
            </Avatar>
            <Typography>
              {getDisplayName(taskDetail.assignerInfo)}
              {taskDetail.assignerInfo?.username &&
                taskDetail.assignerInfo.username !== "unknown" &&
                ` (@${taskDetail.assignerInfo.username})`}
            </Typography>
          </Box>
        </Grid>

        {/* Assignees - Multiple */}
        {renderAssigneesInfo()}

        {/* Created Date */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1,
            }}
          >
            <CalendarToday color="action" />
            <Typography variant="subtitle2" fontWeight="bold">
              Ngày tạo:
            </Typography>
          </Box>
          <Typography sx={{ ml: 3 }}>
            {formatDate(taskDetail.createdAt)}
          </Typography>
        </Grid>

        {/* Due Date */}
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1,
            }}
          >
            <AccessTime color="action" />
            <Typography variant="subtitle2" fontWeight="bold">
              Hạn hoàn thành:
            </Typography>
          </Box>
          <Typography sx={{ ml: 3 }}>
            {taskDetail.dueDate ? formatDate(taskDetail.dueDate) : "Không có"}
          </Typography>
        </Grid>

        {/* Estimated Hours */}
        {taskDetail.estimatedHours > 0 && (
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <AccessTime color="action" />
              <Typography variant="subtitle2" fontWeight="bold">
                Giờ ước tính:
              </Typography>
            </Box>
            <Typography sx={{ ml: 3 }}>
              {taskDetail.estimatedHours} giờ
            </Typography>
          </Grid>
        )}

        {/* Tags */}
        {taskDetail.tags && taskDetail.tags.length > 0 && (
          <Grid item xs={12}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mb: 1,
              }}
            >
              <Typography variant="subtitle2" fontWeight="bold">
                Tags:
              </Typography>
            </Box>
            <Box sx={{ ml: 3, display: "flex", gap: 1, flexWrap: "wrap" }}>
              {taskDetail.tags.map((tag, index) => (
                <Chip
                  key={index}
                  label={tag}
                  size="small"
                  variant="outlined"
                  color="primary"
                />
              ))}
            </Box>
          </Grid>
        )}

        {/* Total Assignees Summary */}
        {taskDetail.assigneeIds && taskDetail.assigneeIds.length > 1 && (
          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: "success.50", borderRadius: 1 }}>
              <Typography variant="body2" color="success.main">
                👥 Task này được giao cho{" "}
                <strong>{taskDetail.assigneeIds.length} người</strong> cùng thực
                hiện
              </Typography>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );

  // 🆕 RENDER ACTIVITY LOG
  const renderActivityLog = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        📋 Lịch sử hoạt động
      </Typography>

      {taskDetail.activityLog && taskDetail.activityLog.length > 0 ? (
        <List dense>
          {taskDetail.activityLog.slice(0, 10).map((activity, index) => (
            <ListItem key={index}>
              <ListItemText
                primary={
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 24,
                        height: 24,
                        fontSize: "0.7rem",
                      }}
                    >
                      {getAvatarInitials(activity.userInfo)}
                    </Avatar>
                    <Typography variant="body2">
                      <strong>{getDisplayName(activity.userInfo)}</strong> -{" "}
                      {activity.action} - {formatDate(activity.timestamp)}
                    </Typography>
                  </Box>
                }
                secondary={
                  activity.details ? (
                    <Box sx={{ mt: 0.5 }}>
                      {activity.details.from && activity.details.to && (
                        <Typography variant="caption" color="text.secondary">
                          Từ: <strong>{activity.details.from}</strong> → Đến:{" "}
                          <strong>{activity.details.to}</strong>
                        </Typography>
                      )}
                      {activity.details.comment && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          💬 {activity.details.comment}
                        </Typography>
                      )}
                      {activity.details.assigneeCount && (
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          👥 {activity.details.assigneeCount} người được giao
                        </Typography>
                      )}
                    </Box>
                  ) : null
                }
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
          <Typography>Chưa có hoạt động nào</Typography>
        </Box>
      )}
    </Box>
  );

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      sx={{
        "& .MuiDialog-paper": {
          height: "80vh",
          maxHeight: "800px",
        },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Task color="primary" />
          <Typography variant="h6">🎯 Chi tiết Task</Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 0, display: "flex", flexDirection: "column" }}>
        {/* 🆕 TABS NAVIGATION */}
        <Box sx={{ borderBottom: 1, borderColor: "divider", px: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(e, newValue) => setActiveTab(newValue)}
            sx={{
              "& .MuiTab-root": {
                minWidth: "auto",
                px: 2,
                fontSize: "0.875rem",
              },
            }}
          >
            <Tab icon={<Info />} label="Thông tin" iconPosition="start" />
            <Tab
              icon={
                <Badge badgeContent={messageCount} color="error" max={99}>
                  <Chat />
                </Badge>
              }
              label="Chat"
              iconPosition="start"
            />
            <Tab icon={<History />} label="Lịch sử" iconPosition="start" />
          </Tabs>
        </Box>

        {/* 🆕 TAB CONTENT */}
        <Box sx={{ flex: 1, overflow: "auto", p: activeTab === 1 ? 0 : 2 }}>
          {detailLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : taskDetail ? (
            renderTabContent()
          ) : (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <Typography color="text.secondary">
                Không thể tải thông tin task
              </Typography>
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Đóng</Button>

        {/* NÚT EDIT - CHỈ HIỆN KHI CÓ QUYỀN VÀ Ở TAB THÔNG TIN */}
        {canEditTask() && activeTab === 0 && (
          <Button
            variant="outlined"
            color="primary"
            startIcon={<Edit />}
            onClick={handleEditTask}
          >
            Chỉnh sửa
          </Button>
        )}

        {/* NÚT HOÀN THÀNH - CHỈ HIỆN KHI Ở TAB THÔNG TIN VÀ TASK CHƯA HOÀN THÀNH */}
        {taskDetail && taskDetail.status !== "done" && activeTab === 0 && (
          <Button
            variant="contained"
            color="success"
            startIcon={<CheckCircle />}
            onClick={handleMarkAsDone}
          >
            Đánh dấu hoàn thành
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
