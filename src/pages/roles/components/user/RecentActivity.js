// src/pages/roles/components/user/RecentActivity.js
import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
  Button,
  Avatar,
  useTheme,
  Tooltip,
} from "@mui/material";
import {
  Refresh,
  CheckCircle,
  Assignment,
  BugReport,
  Notifications,
  Schedule,
  Group,
  Edit,
  Add,
  PriorityHigh,
  DoneAll,
} from "@mui/icons-material";

const RecentActivity = ({ activities = [], loading = false, onRefresh }) => {
  const theme = useTheme();

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Vừa xong";

    try {
      const now = new Date();
      const activityTime = new Date(timestamp);
      const diff = now - activityTime;
      const minutes = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));

      if (minutes < 1) return "Vừa xong";
      if (minutes < 60) return `${minutes} phút trước`;
      if (hours < 24) return `${hours} giờ trước`;
      if (days === 1) return "1 ngày trước";
      return `${days} ngày trước`;
    } catch (error) {
      return "Vừa xong";
    }
  };

  const getActivityIcon = (activity) => {
    const type = activity.type || activity.action;

    switch (type) {
      case "task_completed":
      case "completed":
        return <CheckCircle sx={{ color: theme.palette.success.main }} />;
      case "task_created":
      case "task_assigned":
      case "assigned":
        return <Assignment sx={{ color: theme.palette.primary.main }} />;
      case "report_created":
      case "bug_reported":
        return <BugReport sx={{ color: theme.palette.error.main }} />;
      case "report_resolved":
      case "issue_resolved":
        return <DoneAll sx={{ color: theme.palette.success.main }} />;
      case "notification":
      case "alert":
        return <Notifications sx={{ color: theme.palette.warning.main }} />;
      case "reminder":
      case "schedule":
        return <Schedule sx={{ color: theme.palette.info.main }} />;
      case "meeting":
      case "group":
        return <Group sx={{ color: theme.palette.secondary.main }} />;
      case "update":
      case "edited":
        return <Edit sx={{ color: theme.palette.warning.main }} />;
      case "created":
      case "added":
        return <Add sx={{ color: theme.palette.success.main }} />;
      case "priority":
      case "urgent":
        return <PriorityHigh sx={{ color: theme.palette.error.main }} />;
      default:
        return <CheckCircle sx={{ color: theme.palette.info.main }} />;
    }
  };

  const getActivityColor = (activity) => {
    const type = activity.type || activity.action;

    switch (type) {
      case "task_completed":
      case "completed":
      case "report_resolved":
        return "success";
      case "task_created":
      case "task_assigned":
      case "assigned":
        return "primary";
      case "report_created":
      case "bug_reported":
      case "priority":
        return "error";
      case "notification":
      case "alert":
      case "update":
        return "warning";
      case "reminder":
      case "schedule":
      case "meeting":
        return "info";
      default:
        return "default";
    }
  };

  // Hàm mới để lấy màu border an toàn
  const getBorderColor = (activity) => {
    const colorType = getActivityColor(activity);

    // Kiểm tra xem colorType có tồn tại trong palette không
    if (
      colorType &&
      theme.palette[colorType] &&
      theme.palette[colorType].main
    ) {
      return theme.palette[colorType].main;
    }

    // Fallback colors nếu colorType không hợp lệ
    const fallbackColors = {
      success: theme.palette.success.main,
      primary: theme.palette.primary.main,
      error: theme.palette.error.main,
      warning: theme.palette.warning.main,
      info: theme.palette.info.main,
      secondary: theme.palette.secondary.main,
      default: theme.palette.divider,
    };

    return fallbackColors[colorType] || theme.palette.primary.main;
  };

  const getActivityText = (activity) => {
    if (activity.title) return activity.title;

    const type = activity.type || activity.action;
    const user = activity.user || activity.by || "Bạn";

    switch (type) {
      case "task_completed":
        return `${user} đã hoàn thành công việc`;
      case "task_created":
        return `${user} đã tạo công việc mới`;
      case "task_assigned":
        return `${user} được giao công việc mới`;
      case "report_created":
        return `${user} đã gửi báo cáo mới`;
      case "report_resolved":
        return `Báo cáo đã được giải quyết`;
      case "notification":
        return `Thông báo mới từ hệ thống`;
      case "reminder":
        return `Nhắc nhở sắp đến hạn`;
      default:
        return activity.message || activity.description || "Hoạt động mới";
    }
  };

  const getActivityDetails = (activity) => {
    if (activity.description) return activity.description;
    if (activity.message) return activity.message;

    const type = activity.type || activity.action;

    switch (type) {
      case "task_completed":
        return "Công việc đã được đánh dấu hoàn thành";
      case "task_created":
        return "Một công việc mới đã được tạo";
      case "task_assigned":
        return "Bạn có công việc mới cần thực hiện";
      case "report_created":
        return "Báo cáo đã được gửi đến đội ngũ hỗ trợ";
      case "report_resolved":
        return "Báo cáo của bạn đã được xử lý";
      case "notification":
        return "Có thông báo mới cần bạn xem xét";
      case "reminder":
        return "Nhắc nhở quan trọng sắp đến hạn";
      default:
        return "Cập nhật trạng thái mới";
    }
  };

  const getPriorityBadge = (activity) => {
    const priority = activity.priority || activity.urgency;
    if (!priority) return null;

    const priorityConfig = {
      high: { label: "Cao", color: "error" },
      medium: { label: "Trung bình", color: "warning" },
      low: { label: "Thấp", color: "success" },
      critical: { label: "Khẩn cấp", color: "error" },
    };

    const config = priorityConfig[priority] || {
      label: priority,
      color: "default",
    };

    return (
      <Chip
        label={config.label}
        size="small"
        color={config.color}
        variant="outlined"
        sx={{ ml: 1 }}
      />
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
            <Typography variant="body2" color="text.secondary">
              Đang tải hoạt động...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // Tạo dữ liệu mẫu nếu không có activities
  const displayActivities =
    activities.length > 0
      ? activities
      : [
          {
            _id: "1",
            type: "task_completed",
            title: "Hoàn thành báo cáo tuần",
            description: "Báo cáo công việc tuần đã được nộp",
            timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
            priority: "high",
          },
          {
            _id: "2",
            type: "report_created",
            title: "Báo cáo lỗi mới",
            description: "Đã gửi báo cáo lỗi đăng nhập",
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
            priority: "medium",
          },
          {
            _id: "3",
            type: "notification",
            title: "Thông báo hệ thống",
            description: "Hệ thống sẽ bảo trì vào cuối tuần",
            timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          },
          {
            _id: "4",
            type: "reminder",
            title: "Nhắc nhở cuộc họp",
            description: "Cuộc họp team sắp diễn ra",
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            priority: "high",
          },
        ];

  return (
    <Card
      sx={{
        borderRadius: 3,
        background: `linear-gradient(135deg, ${theme.palette.background.paper} 0%, ${theme.palette.background.default} 100%)`,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardContent>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 3,
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              color: "transparent",
            }}
          >
            📈 Hoạt động gần đây
          </Typography>
          <Tooltip title="Làm mới danh sách hoạt động" arrow>
            <Button
              startIcon={<Refresh />}
              onClick={onRefresh}
              size="small"
              variant="outlined"
              sx={{
                borderRadius: 2,
                textTransform: "none",
                fontWeight: 600,
              }}
            >
              Làm mới
            </Button>
          </Tooltip>
        </Box>

        <List sx={{ py: 0 }}>
          {displayActivities.slice(0, 6).map((activity, index) => (
            <Box key={activity._id || activity.id || index}>
              <ListItem
                sx={{
                  px: 0,
                  py: 2,
                  transition: "all 0.2s ease-in-out",
                  "&:hover": {
                    backgroundColor: theme.palette.action.hover,
                    borderRadius: 2,
                    transform: "translateX(4px)",
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 48 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      backgroundColor: theme.palette.background.paper,
                      border: `2px solid ${getBorderColor(activity)}`, // Sử dụng hàm mới
                    }}
                  >
                    {getActivityIcon(activity)}
                  </Avatar>
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <Typography
                        variant="subtitle1"
                        fontWeight="600"
                        sx={{
                          color: theme.palette.text.primary,
                          flex: 1,
                          minWidth: 0,
                          mr: 1,
                        }}
                      >
                        {getActivityText(activity)}
                      </Typography>
                      {getPriorityBadge(activity)}
                      <Chip
                        label={getTimeAgo(
                          activity.timestamp || activity.createdAt
                        )}
                        size="small"
                        color={getActivityColor(activity)}
                        variant="filled"
                        sx={{
                          ml: "auto",
                          fontWeight: 600,
                          fontSize: "0.75rem",
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mt: 0.5,
                        lineHeight: 1.4,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {getActivityDetails(activity)}
                    </Typography>
                  }
                />
              </ListItem>
              {index < displayActivities.length - 1 && index < 5 && (
                <Divider
                  variant="inset"
                  component="li"
                  sx={{
                    backgroundColor: theme.palette.divider,
                    marginLeft: 6,
                  }}
                />
              )}
            </Box>
          ))}
        </List>

        {displayActivities.length === 0 && (
          <Box sx={{ textAlign: "center", py: 4 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              📝
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Chưa có hoạt động nào
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Các hoạt động của bạn sẽ xuất hiện ở đây
            </Typography>
          </Box>
        )}

        {displayActivities.length > 6 && (
          <Box sx={{ textAlign: "center", pt: 2 }}>
            <Button
              variant="text"
              size="small"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                color: theme.palette.primary.main,
              }}
            >
              Xem thêm {displayActivities.length - 6} hoạt động
            </Button>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivity;
