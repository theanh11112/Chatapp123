// src/pages/roles/components/OverviewTab.js
import React from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  CircularProgress,
} from "@mui/material";
import { People, Task, Notifications, TrendingUp } from "@mui/icons-material";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

export default function OverviewTab({
  loading,
  systemStats,
  userActivityData,
  taskStatusData,
  notificationStats,
}) {
  // 🆕 Dữ liệu mẫu cho biểu đồ thông báo
  const notificationChartData = [
    { name: "T2", info: 12, warning: 4, error: 2, success: 8 },
    { name: "T3", info: 8, warning: 2, error: 1, success: 10 },
    { name: "T4", info: 15, warning: 5, error: 3, success: 12 },
    { name: "T5", info: 10, warning: 3, error: 1, success: 9 },
    { name: "T6", info: 18, warning: 6, error: 4, success: 14 },
    { name: "T7", info: 14, warning: 4, error: 2, success: 11 },
    { name: "CN", info: 9, warning: 2, error: 1, success: 7 },
  ];

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* System Stats Cards */}
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: "primary.main", color: "white" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <People sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {systemStats.totalUsers}
                </Typography>
                <Typography variant="body2">Tổng người dùng</Typography>
                <Chip
                  label={`${systemStats.onlineUsers} online`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    mt: 1,
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: "secondary.main", color: "white" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Task sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {systemStats.totalTasks}
                </Typography>
                <Typography variant="body2">Tổng tasks</Typography>
                <Chip
                  label={`${systemStats.completedTasks} hoàn thành`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    mt: 1,
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Thống kê thông báo Card */}
      <Grid item xs={12} md={3}>
        <Card sx={{ bgcolor: "info.main", color: "white" }}>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <Notifications sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {notificationStats.totalNotifications || 0}
                </Typography>
                <Typography variant="body2">Tổng thông báo</Typography>
                <Chip
                  label={`${notificationStats.unreadCount || 0} chưa đọc`}
                  size="small"
                  sx={{
                    bgcolor: "rgba(255,255,255,0.2)",
                    color: "white",
                    mt: 1,
                  }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Hiệu suất hệ thống Card */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <TrendingUp color="success" sx={{ fontSize: 40 }} />
              <Box>
                <Typography variant="h4" fontWeight="bold" color="success.main">
                  {systemStats.systemLoad}%
                </Typography>
                <Typography variant="body2">Hiệu suất hệ thống</Typography>
                <LinearProgress
                  variant="determinate"
                  value={systemStats.systemLoad}
                  sx={{ mt: 1 }}
                  color={systemStats.systemLoad > 80 ? "error" : "success"}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Charts */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Hoạt động hệ thống (7 ngày)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userActivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="messages"
                  stroke="#8884d8"
                  name="Tin nhắn"
                />
                <Line
                  type="monotone"
                  dataKey="tasks"
                  stroke="#82ca9d"
                  name="Tasks"
                />
                <Line
                  type="monotone"
                  dataKey="online"
                  stroke="#ffc658"
                  name="Online"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Phân bổ Task
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={taskStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name} ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {taskStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>

      {/* 🆕 Biểu đồ thông báo */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Phân tích Thông báo (7 ngày gần nhất)
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={notificationChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="info" fill="#2196f3" name="Thông tin" />
                <Bar dataKey="success" fill="#4caf50" name="Thành công" />
                <Bar dataKey="warning" fill="#ff9800" name="Cảnh báo" />
                <Bar dataKey="error" fill="#f44336" name="Lỗi" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
