// src/pages/roles/components/admin/TasksTab.js - ĐÃ SỬA LỖI HIỂN THỊ TRÙNG LẶP
import React, { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  IconButton,
  Stack,
  Tooltip,
  Divider,
  CircularProgress,
} from "@mui/material";
import {
  Add,
  Search,
  FilterList,
  Refresh,
  Visibility,
  Edit,
  Delete,
  Clear,
  People,
} from "@mui/icons-material";

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

// Utility functions
const getStatusColor = (status) => {
  const colors = {
    todo: "#ff6b6b",
    in_progress: "#4ecdc4",
    review: "#ffa726",
    done: "#96ceb4",
    cancelled: "#666666",
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
    cancelled: "Đã hủy",
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
  onCreateTask,
  isAdminView = false,
  onFilterTasks,
  onSearchTasks,
  totalTasks = 0,
  currentFilters = {},
}) {
  const [searchTerm, setSearchTerm] = useState(currentFilters.search || "");
  const [statusFilter, setStatusFilter] = useState(
    currentFilters.status || "all"
  );
  const [priorityFilter, setPriorityFilter] = useState(
    currentFilters.priority || "all"
  );

  const handleSearch = (value) => {
    setSearchTerm(value);
    if (onSearchTasks) {
      onSearchTasks(value, {
        status: statusFilter !== "all" ? statusFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
      });
    }
  };

  const handleFilter = () => {
    if (onFilterTasks) {
      onFilterTasks({
        status: statusFilter !== "all" ? statusFilter : undefined,
        priority: priorityFilter !== "all" ? priorityFilter : undefined,
        search: searchTerm || undefined,
      });
    }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setPriorityFilter("all");
    if (onFilterTasks) {
      onFilterTasks({});
    }
  };

  const getTaskStats = () => {
    const stats = {
      total: recentTasks.length,
      todo: recentTasks.filter((task) => task.status === "todo").length,
      inProgress: recentTasks.filter((task) => task.status === "in_progress")
        .length,
      review: recentTasks.filter((task) => task.status === "review").length,
      done: recentTasks.filter((task) => task.status === "done").length,
    };
    return stats;
  };

  const taskStats = getTaskStats();

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
              <Box>
                <Typography variant="h5" component="h2">
                  {isAdminView
                    ? "🎯 Quản lý Tasks Hệ Thống"
                    : "🎯 Quản lý Tasks"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {isAdminView
                    ? `Tổng số: ${totalTasks} tasks trong hệ thống`
                    : `Bạn có ${recentTasks.length} tasks`}
                </Typography>
              </Box>

              <Box sx={{ display: "flex", gap: 1 }}>
                <Button
                  startIcon={<Refresh />}
                  onClick={onRefresh}
                  variant="outlined"
                  disabled={loading}
                >
                  Làm mới
                </Button>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={onCreateTask}
                  disabled={!currentUser}
                >
                  Tạo Task
                </Button>
              </Box>
            </Box>

            {isAdminView && (
              <Paper sx={{ p: 2, mb: 3, bgcolor: "background.default" }}>
                <Typography variant="h6" component="h3" gutterBottom>
                  <FilterList sx={{ verticalAlign: "middle", mr: 1 }} />
                  Bộ lọc & Tìm kiếm
                </Typography>

                <Grid container spacing={2} alignItems="center">
                  <Grid item xs={12} md={4}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="Tìm kiếm theo tiêu đề, mô tả, tags..."
                      value={searchTerm}
                      onChange={(e) => handleSearch(e.target.value)}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                        ),
                        endAdornment: searchTerm && (
                          <InputAdornment position="end">
                            <IconButton
                              size="small"
                              onClick={() => handleSearch("")}
                            >
                              <Clear />
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Trạng thái</InputLabel>
                      <Select
                        value={statusFilter}
                        label="Trạng thái"
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <MenuItem value="all">Tất cả trạng thái</MenuItem>
                        <MenuItem value="todo">Cần làm</MenuItem>
                        <MenuItem value="in_progress">Đang làm</MenuItem>
                        <MenuItem value="review">Chờ duyệt</MenuItem>
                        <MenuItem value="done">Hoàn thành</MenuItem>
                        <MenuItem value="cancelled">Đã hủy</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={3}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Độ ưu tiên</InputLabel>
                      <Select
                        value={priorityFilter}
                        label="Độ ưu tiên"
                        onChange={(e) => setPriorityFilter(e.target.value)}
                      >
                        <MenuItem value="all">Tất cả độ ưu tiên</MenuItem>
                        <MenuItem value="high">Cao</MenuItem>
                        <MenuItem value="medium">Trung bình</MenuItem>
                        <MenuItem value="low">Thấp</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid item xs={12} md={2}>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="contained"
                        onClick={handleFilter}
                        fullWidth
                      >
                        Lọc
                      </Button>
                      <Button
                        variant="outlined"
                        onClick={handleResetFilters}
                        title="Reset bộ lọc"
                      >
                        <Clear />
                      </Button>
                    </Box>
                  </Grid>
                </Grid>

                {recentTasks.length > 0 && (
                  <>
                    <Divider sx={{ my: 2 }} />
                    <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                      <Chip
                        label={`Tổng: ${taskStats.total}`}
                        color="primary"
                        variant="outlined"
                      />
                      <Chip
                        label={`Cần làm: ${taskStats.todo}`}
                        sx={{ bgcolor: getStatusColor("todo"), color: "white" }}
                      />
                      <Chip
                        label={`Đang làm: ${taskStats.inProgress}`}
                        sx={{
                          bgcolor: getStatusColor("in_progress"),
                          color: "white",
                        }}
                      />
                      <Chip
                        label={`Chờ duyệt: ${taskStats.review}`}
                        sx={{
                          bgcolor: getStatusColor("review"),
                          color: "white",
                        }}
                      />
                      <Chip
                        label={`Hoàn thành: ${taskStats.done}`}
                        sx={{ bgcolor: getStatusColor("done"), color: "white" }}
                      />
                    </Box>
                  </>
                )}
              </Paper>
            )}

            {recentTasks.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {isAdminView
                    ? "Không tìm thấy task nào phù hợp"
                    : "Chưa có task nào"}
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2}>
                {recentTasks.map((task) => (
                  <Paper
                    key={task._id}
                    sx={{
                      p: 2,
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      bgcolor: "background.default",
                      "&:hover": {
                        boxShadow: 2,
                        borderColor: "primary.main",
                      },
                      transition: "all 0.2s",
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            mb: 1,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography
                            variant="h6"
                            component="h4"
                            sx={{ fontWeight: 600 }}
                          >
                            {task.title}
                          </Typography>

                          <Box
                            sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}
                          >
                            <Chip
                              label={getPriorityText(task.priority)}
                              size="small"
                              sx={{
                                bgcolor: getPriorityColor(task.priority),
                                color: "white",
                                fontWeight: 600,
                              }}
                            />
                            <Chip
                              label={getStatusText(task.status)}
                              size="small"
                              sx={{
                                bgcolor: getStatusColor(task.status),
                                color: "white",
                                fontWeight: 600,
                              }}
                            />

                            {task.assigneeIds &&
                              task.assigneeIds.length > 1 && (
                                <Tooltip
                                  title={`${task.assigneeIds.length} người được giao`}
                                >
                                  <Chip
                                    icon={<People />}
                                    label={`${task.assigneeIds.length} người`}
                                    size="small"
                                    color="secondary"
                                    variant="outlined"
                                  />
                                </Tooltip>
                              )}
                          </Box>
                        </Box>

                        {/* 🆕 SỬA LỖI DOM NESTING VÀ HIỂN THỊ TRÙNG LẶP */}
                        <Box sx={{ mt: 1 }}>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={6}>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 1,
                                }}
                              >
                                {/* Người giao */}
                                <Box>
                                  <Typography
                                    variant="body2"
                                    component="span"
                                    color="text.secondary"
                                  >
                                    <strong>Người giao:</strong>{" "}
                                    {getDisplayName(task.assignerInfo)}
                                  </Typography>
                                </Box>

                                {/* Người nhận - CHỈ HIỂN THỊ 1 LẦN */}
                                <Box>
                                  <Typography
                                    variant="body2"
                                    component="span"
                                    color="text.secondary"
                                  >
                                    <strong>Người nhận:</strong>{" "}
                                    {task.assigneesInfo &&
                                    task.assigneesInfo.length > 0 ? (
                                      <>
                                        {task.assigneesInfo
                                          .slice(0, 3)
                                          .map((assignee) =>
                                            getDisplayName(assignee)
                                          )
                                          .join(", ")}
                                        {task.assigneesInfo.length > 3 &&
                                          ` và ${
                                            task.assigneesInfo.length - 3
                                          } người khác`}
                                      </>
                                    ) : task.assigneeId ? (
                                      getDisplayName(task.assigneeId)
                                    ) : (
                                      "Chưa có người nhận"
                                    )}
                                  </Typography>
                                </Box>
                              </Box>
                            </Grid>

                            <Grid item xs={12} md={6}>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 1,
                                }}
                              >
                                {task.dueDate && (
                                  <Box>
                                    <Typography
                                      variant="body2"
                                      component="span"
                                      color="text.secondary"
                                    >
                                      <strong>Hạn hoàn thành:</strong>{" "}
                                      {new Date(
                                        task.dueDate
                                      ).toLocaleDateString("vi-VN")}
                                      {new Date(task.dueDate) < new Date() &&
                                        task.status !== "done" && (
                                          <Chip
                                            label="QUÁ HẠN"
                                            size="small"
                                            color="error"
                                            sx={{ ml: 1, fontSize: "0.7rem" }}
                                          />
                                        )}
                                    </Typography>
                                  </Box>
                                )}

                                {task.estimatedHours &&
                                  task.estimatedHours > 0 && (
                                    <Box>
                                      <Typography
                                        variant="body2"
                                        component="span"
                                        color="text.secondary"
                                      >
                                        <strong>Giờ ước tính:</strong>{" "}
                                        {task.estimatedHours}h
                                      </Typography>
                                    </Box>
                                  )}

                                {task.tags && task.tags.length > 0 && (
                                  <Box
                                    sx={{
                                      display: "flex",
                                      gap: 0.5,
                                      flexWrap: "wrap",
                                    }}
                                  >
                                    {task.tags.slice(0, 3).map((tag, index) => (
                                      <Chip
                                        key={index}
                                        label={tag}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                      />
                                    ))}
                                    {task.tags.length > 3 && (
                                      <Chip
                                        label={`+${task.tags.length - 3}`}
                                        size="small"
                                        variant="outlined"
                                      />
                                    )}
                                  </Box>
                                )}
                              </Box>
                            </Grid>
                          </Grid>
                        </Box>

                        {task.description && (
                          <Box sx={{ mt: 1 }}>
                            <Typography
                              variant="body2"
                              sx={{
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                              }}
                            >
                              {task.description}
                            </Typography>
                          </Box>
                        )}
                      </Box>

                      <Box sx={{ display: "flex", gap: 1, ml: 2 }}>
                        <Tooltip title="Xem chi tiết">
                          <IconButton
                            color="info"
                            onClick={() => onViewTask(task)}
                            size="small"
                          >
                            <Visibility />
                          </IconButton>
                        </Tooltip>

                        {task.status !== "done" && (
                          <Tooltip title="Đánh dấu hoàn thành">
                            <IconButton
                              color="success"
                              onClick={() =>
                                onUpdateTaskStatus(task._id, "done")
                              }
                              size="small"
                            >
                              <Edit />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Xóa task">
                          <IconButton
                            color="error"
                            onClick={() => onDeleteTask(task)}
                            size="small"
                          >
                            <Delete />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  </Paper>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
