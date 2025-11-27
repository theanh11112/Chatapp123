// src/pages/roles/components/dialogs/ViewTaskDialog.js
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
} from "@mui/material";
import {
  Task,
  Description,
  Person,
  Warning,
  CalendarToday,
  AccessTime,
  CheckCircle,
} from "@mui/icons-material";
import taskService from "../../../../services/taskService";

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
    todo: "Chưa làm",
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
}) {
  const [taskDetail, setTaskDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    const loadTaskDetail = async () => {
      if (!task || !currentUser) return;

      setDetailLoading(true);
      try {
        const response = await taskService.getTaskDetail(
          task._id,
          currentUser.keycloakId
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
    }
  }, [open, task, currentUser]);

  const handleClose = () => {
    setTaskDetail(null);
    onClose();
  };

  const handleMarkAsDone = async () => {
    if (!taskDetail) return;
    await onUpdateTaskStatus(taskDetail._id, "done");
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Task color="primary" />
          <Typography variant="h6">Chi tiết Task</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        {detailLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : (
          taskDetail && (
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
                  <Typography sx={{ ml: 3 }}>
                    {taskDetail.assignerId?.username || "Unknown User"}
                  </Typography>
                </Grid>

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
                      Người nhận:
                    </Typography>
                  </Box>
                  <Typography sx={{ ml: 3 }}>
                    {taskDetail.assigneeId?.username || "Unknown User"}
                  </Typography>
                </Grid>

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
                    {taskDetail.dueDate
                      ? formatDate(taskDetail.dueDate)
                      : "Không có"}
                  </Typography>
                </Grid>

                {taskDetail.estimatedHours > 0 && (
                  <Grid item xs={12}>
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
                    <Box
                      sx={{
                        ml: 3,
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      {taskDetail.tags.map((tag, index) => (
                        <Chip
                          key={index}
                          label={tag}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Grid>
                )}
              </Grid>

              {/* Activity Log Section */}
              {taskDetail.activityLog && taskDetail.activityLog.length > 0 && (
                <>
                  <Divider sx={{ my: 3 }} />
                  <Typography variant="h6" gutterBottom>
                    Lịch sử hoạt động
                  </Typography>
                  <List dense>
                    {taskDetail.activityLog
                      .slice(0, 5)
                      .map((activity, index) => (
                        <ListItem key={index}>
                          <ListItemText
                            primary={`${
                              activity.username || "Unknown User"
                            } - ${activity.action} - ${formatDate(
                              activity.timestamp
                            )}`}
                            secondary={
                              activity.details
                                ? `Từ: ${
                                    activity.details.from || "N/A"
                                  } → Đến: ${activity.details.to || "N/A"}`
                                : ""
                            }
                          />
                        </ListItem>
                      ))}
                  </List>
                </>
              )}
            </Box>
          )
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Đóng</Button>
        {taskDetail && taskDetail.status !== "done" && (
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
