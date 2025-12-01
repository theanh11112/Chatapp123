// src/pages/roles/components/user/QuickStats.js
import React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Tooltip,
} from "@mui/material";
import {
  TrendingUp,
  Schedule,
  CheckCircle,
  AccessTime,
  TaskAlt,
  Notifications,
  Report,
  BugReport,
  Timer,
  Speed,
} from "@mui/icons-material";

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  color,
  progress,
  tooltip,
}) => (
  <Tooltip title={tooltip || subtitle} arrow>
    <Card
      sx={{
        height: "100%",
        background: `linear-gradient(135deg, ${color}.light 0%, ${color}.lighter 100%)`,
        border: `1px solid ${color}.main`,
        borderRadius: 3,
        transition: "all 0.3s ease-in-out",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: `0 8px 25px ${color}.main30`,
        },
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            mb: progress !== undefined ? 2 : 1,
          }}
        >
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h3"
              fontWeight="bold"
              color={`${color}.dark`}
              sx={{
                fontSize: { xs: "2rem", sm: "2.5rem", md: "3rem" },
                background: `linear-gradient(135deg, ${color}.main, ${color}.dark)`,
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                color: "transparent",
              }}
            >
              {value}
            </Typography>
            <Typography
              variant="h6"
              fontWeight="600"
              gutterBottom
              sx={{ color: `${color}.dark` }}
            >
              {title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: "0.875rem" }}
            >
              {subtitle}
            </Typography>
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 3,
              background: `linear-gradient(135deg, ${color}.main, ${color}.dark)`,
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 48,
              minHeight: 48,
            }}
          >
            {icon}
          </Box>
        </Box>

        {progress !== undefined && (
          <Box sx={{ mt: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography
                variant="caption"
                fontWeight="medium"
                color="text.secondary"
              >
                Tiến độ
              </Typography>
              <Typography
                variant="caption"
                fontWeight="bold"
                color={`${color}.dark`}
              >
                {progress}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 8,
                borderRadius: 4,
                backgroundColor: `${color}.light`,
                "& .MuiLinearProgress-bar": {
                  background: `linear-gradient(90deg, ${color}.main, ${color}.dark)`,
                  borderRadius: 4,
                },
              }}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  </Tooltip>
);

const QuickStats = ({ data = {} }) => {
  // Tính toán các chỉ số từ data
  const completionRate = data.totalTasks
    ? Math.round(((data.completedTasks || 0) / data.totalTasks) * 100)
    : 0;

  const inProgressRate = data.totalTasks
    ? Math.round(((data.inProgressTasks || 0) / data.totalTasks) * 100)
    : 0;

  const reportResolutionRate = data.totalReports
    ? Math.round(((data.resolvedReports || 0) / data.totalReports) * 100)
    : 0;

  const stats = [
    {
      title: "Hiệu suất",
      value: `${data.productivity || 0}%`,
      subtitle: "Hiệu suất làm việc tổng thể",
      icon: <Speed sx={{ fontSize: 24 }} />,
      color: "success",
      progress: data.productivity || 0,
      tooltip: "Dựa trên tỷ lệ hoàn thành công việc và thời gian phản hồi",
    },
    {
      title: "Hoàn thành",
      value: `${data.completedTasks || 0}`,
      subtitle: `trên ${data.totalTasks || 0} công việc`,
      icon: <CheckCircle sx={{ fontSize: 24 }} />,
      color: "primary",
      progress: completionRate,
      tooltip: `Tỷ lệ hoàn thành: ${completionRate}%`,
    },
    {
      title: "Đang thực hiện",
      value: `${data.inProgressTasks || 0}`,
      subtitle: "công việc đang làm",
      icon: <Timer sx={{ fontSize: 24 }} />,
      color: "warning",
      progress: inProgressRate,
      tooltip: `Chiếm ${inProgressRate}% tổng số công việc`,
    },
    {
      title: "Báo cáo",
      value: `${data.pendingReports || 0}`,
      subtitle: `đang chờ / ${data.totalReports || 0} tổng số`,
      icon: <BugReport sx={{ fontSize: 24 }} />,
      color: "error",
      progress: data.totalReports
        ? 100 -
          Math.round(((data.pendingReports || 0) / data.totalReports) * 100)
        : 0,
      tooltip: `${data.resolvedReports || 0} báo cáo đã được giải quyết`,
    },
    {
      title: "Thông báo",
      value: `${data.unreadNotifications || 0}`,
      subtitle: "thông báo chưa đọc",
      icon: <Notifications sx={{ fontSize: 24 }} />,
      color: "info",
      tooltip: "Tổng số thông báo bạn chưa đọc",
    },
    {
      title: "Tỷ lệ giải quyết",
      value: `${reportResolutionRate}%`,
      subtitle: "báo cáo đã xử lý",
      icon: <TrendingUp sx={{ fontSize: 24 }} />,
      color: "secondary",
      progress: reportResolutionRate,
      tooltip: "Tỷ lệ báo cáo đã được giải quyết",
    },
    {
      title: "Nhắc nhở",
      value: `${data.totalReminders || 0}`,
      subtitle: "nhắc nhở đang hoạt động",
      icon: <AccessTime sx={{ fontSize: 24 }} />,
      color: "info",
      tooltip: "Số lượng nhắc nhở đang theo dõi",
    },
    {
      title: "Hiệu quả",
      value: `${Math.round((completionRate + (data.productivity || 0)) / 2)}%`,
      subtitle: "hiệu quả tổng hợp",
      icon: <TaskAlt sx={{ fontSize: 24 }} />,
      color: "success",
      progress: Math.round((completionRate + (data.productivity || 0)) / 2),
      tooltip: "Kết hợp hiệu suất và tỷ lệ hoàn thành",
    },
  ];

  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} lg={3} key={index}>
          <StatCard {...stat} />
        </Grid>
      ))}
    </Grid>
  );
};

export default QuickStats;
