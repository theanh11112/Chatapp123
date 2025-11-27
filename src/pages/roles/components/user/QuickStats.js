// src/pages/roles/components/user/QuickStats.js
import React from "react";
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
} from "@mui/material";
import {
  TrendingUp,
  Schedule,
  CheckCircle,
  AccessTime,
} from "@mui/icons-material";

const StatCard = ({ title, value, subtitle, icon, color, progress }) => (
  <Card
    sx={{
      height: "100%",
      background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
      border: `1px solid ${color}30`,
      transition: "transform 0.2s ease-in-out",
      "&:hover": {
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
        <Box>
          <Typography variant="h4" fontWeight="bold" color={`${color}.main`}>
            {value}
          </Typography>
          <Typography variant="h6" fontWeight="medium" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {subtitle}
          </Typography>
        </Box>
        <Box
          sx={{
            p: 1,
            borderRadius: 2,
            bgcolor: `${color}.main`,
            color: "white",
          }}
        >
          {icon}
        </Box>
      </Box>

      {progress !== undefined && (
        <Box sx={{ mt: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: `${color}.light`,
              "& .MuiLinearProgress-bar": {
                bgcolor: `${color}.main`,
              },
            }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 0.5, display: "block" }}
          >
            {progress}% hoàn thành
          </Typography>
        </Box>
      )}
    </CardContent>
  </Card>
);

const QuickStats = ({ data = {} }) => {
  const stats = [
    {
      title: "Hiệu suất",
      value: `${data.productivity || 0}%`,
      subtitle: "Hiệu suất làm việc",
      icon: <TrendingUp />,
      color: "success",
      progress: data.productivity || 0,
    },
    {
      title: "Tỷ lệ hoàn thành",
      value: data.completionRate || "0%",
      subtitle: "Công việc đã hoàn thành",
      icon: <CheckCircle />,
      color: "primary",
    },
    {
      title: "Thời gian phản hồi",
      value: data.responseTime || "0h",
      subtitle: "Trung bình phản hồi",
      icon: <AccessTime />,
      color: "info",
    },
    {
      title: "Công việc đang làm",
      value: `${data.inProgressTasks || 0}/${data.totalTasks || 0}`,
      subtitle: "Tiến độ hiện tại",
      icon: <Schedule />,
      color: "warning",
      progress: data.totalTasks
        ? Math.round(((data.inProgressTasks || 0) / data.totalTasks) * 100)
        : 0,
    },
  ];

  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <StatCard {...stat} />
        </Grid>
      ))}
    </Grid>
  );
};

export default QuickStats;
