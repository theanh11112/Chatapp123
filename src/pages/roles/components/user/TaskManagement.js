// src/pages/roles/components/user/TaskManagement.js
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
} from "@mui/material";
import {
  FilterList,
  Add,
  CheckCircle,
  Pending,
  Schedule,
  Cancel,
  Visibility,
  Refresh,
} from "@mui/icons-material";

const TaskManagement = ({
  loading = false,
  tasks = [],
  currentUser,
  onRefresh,
  onUpdateTaskStatus,
  onCreateTask,
}) => {
  const [filter, setFilter] = useState("all");
  const [filterAnchor, setFilterAnchor] = useState(null);
  const [viewDialog, setViewDialog] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const getStatusIcon = (status) => {
    switch (status) {
      case "done":
        return <CheckCircle color="success" />;
      case "in_progress":
        return <Schedule color="warning" />;
      case "pending":
        return <Pending color="info" />;
      default:
        return <Cancel color="error" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "done":
        return "success";
      case "in_progress":
        return "warning";
      case "pending":
        return "info";
      default:
        return "error";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high":
        return "error";
      case "medium":
        return "warning";
      case "low":
        return "success";
      default:
        return "default";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "done":
        return "Hoàn thành";
      case "in_progress":
        return "Đang thực hiện";
      case "pending":
        return "Chờ xử lý";
      default:
        return "Đã hủy";
    }
  };

  const getPriorityText = (priority) => {
    switch (priority) {
      case "high":
        return "cao";
      case "medium":
        return "trung bình";
      case "low":
        return "thấp";
      default:
        return priority;
    }
  };

  const calculateProgress = (task) => {
    switch (task.status) {
      case "done":
        return 100;
      case "in_progress":
        return task.progress || 50;
      case "pending":
        return 0;
      default:
        return 0;
    }
  };

  const handleFilterClose = () => {
    setFilterAnchor(null);
  };

  const handleFilterSelect = (newFilter) => {
    setFilter(newFilter);
    setFilterAnchor(null);
  };

  const handleViewDialogClose = () => {
    setViewDialog(false);
    setSelectedTask(null);
  };

  const handleViewTask = (task) => {
    setSelectedTask(task);
    setViewDialog(true);
  };

  const handleUpdateStatus = (taskId, newStatus) => {
    if (onUpdateTaskStatus) {
      onUpdateTaskStatus(taskId, newStatus);
    }
  };

  const handleCreateTask = () => {
    if (onCreateTask) {
      onCreateTask();
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    return task.status === filter;
  });

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography textAlign="center">Đang tải công việc...</Typography>
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
              📝 Quản lý Công việc
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                startIcon={<FilterList />}
                onClick={(e) => setFilterAnchor(e.currentTarget)}
                variant="outlined"
              >
                Lọc:{" "}
                {filter === "all"
                  ? "Tất cả"
                  : filter === "pending"
                  ? "Chờ xử lý"
                  : filter === "in_progress"
                  ? "Đang thực hiện"
                  : "Hoàn thành"}
              </Button>
              <Button
                startIcon={<Add />}
                variant="contained"
                onClick={handleCreateTask}
              >
                Thêm công việc
              </Button>
              <Button
                startIcon={<Refresh />}
                onClick={handleRefresh}
                variant="outlined"
              >
                Làm mới
              </Button>
            </Box>
          </Box>

          {/* Filter Menu */}
          <Menu
            anchorEl={filterAnchor}
            open={Boolean(filterAnchor)}
            onClose={handleFilterClose}
          >
            <MenuItem onClick={() => handleFilterSelect("all")}>
              Tất cả công việc
            </MenuItem>
            <MenuItem onClick={() => handleFilterSelect("pending")}>
              Chờ xử lý
            </MenuItem>
            <MenuItem onClick={() => handleFilterSelect("in_progress")}>
              Đang thực hiện
            </MenuItem>
            <MenuItem onClick={() => handleFilterSelect("done")}>
              Đã hoàn thành
            </MenuItem>
          </Menu>

          {/* Tasks Grid */}
          <Grid container spacing={3}>
            {filteredTasks.map((task) => (
              <Grid item xs={12} md={6} key={task._id || task.id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      boxShadow: 3,
                      transform: "translateY(-2px)",
                    },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 2,
                      }}
                    >
                      <Typography variant="h6" fontWeight="medium">
                        {task.title}
                      </Typography>
                      <Box sx={{ display: "flex", gap: 0.5 }}>
                        <IconButton
                          size="small"
                          onClick={() => handleViewTask(task)}
                        >
                          <Visibility />
                        </IconButton>
                      </Box>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ mb: 2 }}
                    >
                      {task.description}
                    </Typography>

                    {/* Progress Bar */}
                    <Box sx={{ mb: 2 }}>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          mb: 1,
                        }}
                      >
                        <Typography variant="caption">Tiến độ</Typography>
                        <Typography variant="caption" fontWeight="bold">
                          {calculateProgress(task)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={calculateProgress(task)}
                        color={
                          calculateProgress(task) === 100
                            ? "success"
                            : "primary"
                        }
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                    </Box>

                    {/* Chips */}
                    <Box
                      sx={{
                        display: "flex",
                        gap: 1,
                        flexWrap: "wrap",
                        mb: 2,
                      }}
                    >
                      <Chip
                        icon={getStatusIcon(task.status)}
                        label={getStatusText(task.status)}
                        size="small"
                        color={getStatusColor(task.status)}
                        variant="outlined"
                      />
                      <Chip
                        label={`Ưu tiên: ${getPriorityText(task.priority)}`}
                        size="small"
                        color={getPriorityColor(task.priority)}
                        variant="outlined"
                      />
                    </Box>

                    {/* Footer */}
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <Typography variant="caption" color="text.secondary">
                        Hạn:{" "}
                        {task.dueDate
                          ? new Date(task.dueDate).toLocaleDateString("vi-VN")
                          : "Không có hạn"}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Giao bởi: {task.assigner || "System"}
                      </Typography>
                    </Box>

                    {/* Action Buttons */}
                    <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
                      {task.status !== "done" && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() =>
                            handleUpdateStatus(
                              task._id || task.id,
                              task.status === "pending" ? "in_progress" : "done"
                            )
                          }
                        >
                          {task.status === "pending" ? "Bắt đầu" : "Hoàn thành"}
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {filteredTasks.length === 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              Không có công việc nào phù hợp với bộ lọc đã chọn.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Task Detail Dialog */}
      <Dialog
        open={viewDialog}
        onClose={handleViewDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Chi tiết công việc</DialogTitle>
        <DialogContent>
          {selectedTask && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedTask.title}
              </Typography>
              <Typography variant="body1" paragraph>
                {selectedTask.description}
              </Typography>

              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Trạng thái
                  </Typography>
                  <Chip
                    icon={getStatusIcon(selectedTask.status)}
                    label={getStatusText(selectedTask.status)}
                    color={getStatusColor(selectedTask.status)}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Mức độ ưu tiên
                  </Typography>
                  <Chip
                    label={getPriorityText(selectedTask.priority)}
                    color={getPriorityColor(selectedTask.priority)}
                    sx={{ mt: 0.5 }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Hạn hoàn thành
                  </Typography>
                  <Typography variant="body2">
                    {selectedTask.dueDate
                      ? new Date(selectedTask.dueDate).toLocaleDateString(
                          "vi-VN"
                        )
                      : "Không có hạn"}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="caption" color="text.secondary">
                    Người giao việc
                  </Typography>
                  <Typography variant="body2">
                    {selectedTask.assigner || "System"}
                  </Typography>
                </Grid>
                <Grid item xs={12}>
                  <Typography variant="caption" color="text.secondary">
                    Tiến độ
                  </Typography>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mt: 0.5,
                    }}
                  >
                    <LinearProgress
                      variant="determinate"
                      value={calculateProgress(selectedTask)}
                      sx={{ flexGrow: 1, height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" fontWeight="bold">
                      {calculateProgress(selectedTask)}%
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleViewDialogClose}>Đóng</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default TaskManagement;
