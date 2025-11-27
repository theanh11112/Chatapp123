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
} from "@mui/material";
import { Add, Edit, CheckCircle, Group, Refresh } from "@mui/icons-material";

const RecentActivity = ({ activities = [], loading = false, onRefresh }) => {
  const getTimeAgo = (timestamp) => {
    if (!timestamp) return "Vừa xong";

    const now = new Date();
    const activityTime = new Date(timestamp);
    const diff = now - activityTime;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return `${minutes} phút trước`;
    } else if (hours < 24) {
      return `${hours} giờ trước`;
    } else {
      return `${days} ngày trước`;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case "success":
        return "success";
      case "warning":
        return "warning";
      case "info":
        return "info";
      case "error":
        return "error";
      default:
        return "default";
    }
  };

  const getActivityIcon = (action) => {
    switch (action) {
      case "task_completed":
        return <CheckCircle color="success" />;
      case "task_assigned":
        return <Add color="primary" />;
      case "task_updated":
        return <Edit color="warning" />;
      case "meeting_created":
        return <Group color="info" />;
      default:
        return <CheckCircle color="info" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography textAlign="center">Đang tải hoạt động...</Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <Card>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Typography
              variant="h6"
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              📈 Hoạt động gần đây
            </Typography>
            <Button
              startIcon={<Refresh />}
              onClick={onRefresh}
              size="small"
              variant="outlined"
            >
              Làm mới
            </Button>
          </Box>

          <List>
            {activities.map((activity, index) => (
              <div key={activity._id || activity.id || index}>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon>
                    {getActivityIcon(activity.action || activity.type)}
                  </ListItemIcon>
                  <ListItemText
                    primary={
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
                          component="div"
                        >
                          {activity.title}
                        </Typography>
                        <Chip
                          label={getTimeAgo(
                            activity.timestamp || activity.createdAt
                          )}
                          size="small"
                          color={getTypeColor(activity.type || "info")}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        component="div"
                      >
                        {activity.description || activity.message}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < activities.length - 1 && (
                  <Divider variant="inset" component="li" />
                )}
              </div>
            ))}
          </List>

          {activities.length === 0 && (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <Typography variant="body2" color="text.secondary">
                Chưa có hoạt động nào gần đây.
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecentActivity;
