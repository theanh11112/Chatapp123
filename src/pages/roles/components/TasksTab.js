// src/pages/roles/components/TasksTab.js
import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Chip,
  IconButton,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  Task,
  Visibility,
  CheckCircle,
  Delete,
  Refresh,
  Add,
} from "@mui/icons-material";

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

export default function TasksTab({
  loading,
  recentTasks,
  currentUser,
  onRefresh,
  onViewTask,
  onUpdateTaskStatus,
  onDeleteTask,
}) {
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
              <Typography variant="h5">Quản lý Tasks</Typography>
              <Box sx={{ display: "flex", gap: 1 }}>
                <Button startIcon={<Refresh />} onClick={onRefresh}>
                  Refresh
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => {
                    /* This will be handled by parent */
                  }}
                  disabled={!currentUser}
                >
                  Tạo Task
                </Button>
              </Box>
            </Box>

            {recentTasks.length === 0 ? (
              <Typography
                variant="body1"
                color="text.secondary"
                sx={{ textAlign: "center", py: 4 }}
              >
                Chưa có task nào
              </Typography>
            ) : (
              <List>
                {recentTasks.map((task) => (
                  <ListItem
                    key={task._id}
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: "background.default",
                    }}
                    secondaryAction={
                      <Box sx={{ display: "flex", gap: 1 }}>
                        <IconButton
                          color="info"
                          onClick={() => onViewTask(task)}
                          title="Xem chi tiết"
                        >
                          <Visibility />
                        </IconButton>
                        {task.status !== "done" && (
                          <IconButton
                            color="success"
                            onClick={() => onUpdateTaskStatus(task._id, "done")}
                            title="Đánh dấu hoàn thành"
                          >
                            <CheckCircle />
                          </IconButton>
                        )}
                        <IconButton
                          color="error"
                          onClick={() => onDeleteTask(task)}
                          title="Xóa task"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      <Avatar sx={{ bgcolor: getPriorityColor(task.priority) }}>
                        <Task />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                          }}
                        >
                          <Typography variant="h6">{task.title}</Typography>
                          <Chip
                            label={getPriorityText(task.priority)}
                            size="small"
                            sx={{
                              bgcolor: getPriorityColor(task.priority),
                              color: "white",
                            }}
                          />
                          <Chip
                            label={getStatusText(task.status)}
                            size="small"
                            sx={{
                              bgcolor: getStatusColor(task.status),
                              color: "white",
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: "flex", gap: 3, mt: 1 }}>
                          <Typography variant="body2">
                            Người giao:{" "}
                            <strong>
                              {task.assignerId?.username || "Unknown User"}
                            </strong>
                          </Typography>
                          <Typography variant="body2">
                            Người nhận:{" "}
                            <strong>
                              {task.assigneeId?.username || "Unknown User"}
                            </strong>
                          </Typography>
                          {task.dueDate && (
                            <Typography variant="body2">
                              Hạn:{" "}
                              <strong>
                                {new Date(task.dueDate).toLocaleDateString(
                                  "vi-VN"
                                )}
                              </strong>
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
