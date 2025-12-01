// src/pages/roles/components/admin/ReportsTab.js - ĐÃ SỬA LỖI DOM NESTING
import React, { useState } from "react";
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
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";
import {
  Report,
  Visibility,
  CheckCircle,
  Refresh,
  Assignment,
} from "@mui/icons-material";

// Utility functions cho reports
const getStatusColor = (status) => {
  const colors = {
    pending: "#ff9800",
    in_progress: "#2196f3",
    resolved: "#4caf50",
    rejected: "#f44336",
    closed: "#9e9e9e",
  };
  return colors[status] || "#666";
};

const getPriorityColor = (priority) => {
  const colors = {
    low: "#66bb6a",
    medium: "#ffa726",
    high: "#ef5350",
    critical: "#d32f2f",
  };
  return colors[priority] || "#666";
};

const getStatusText = (status) => {
  const statusMap = {
    pending: "Đang chờ",
    in_progress: "Đang xử lý",
    resolved: "Đã giải quyết",
    rejected: "Đã từ chối",
    closed: "Đã đóng",
  };
  return statusMap[status] || status;
};

const getPriorityText = (priority) => {
  const priorityMap = {
    low: "Thấp",
    medium: "Trung bình",
    high: "Cao",
    critical: "Khẩn cấp",
  };
  return priorityMap[priority] || priority;
};

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("vi-VN");
};

export default function ReportsTab({
  loading,
  reports,
  reportStats,
  currentUser,
  onRefresh,
  onViewReport,
  onUpdateReportStatus,
  onAssignReport,
}) {
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    priority: "all",
    category: "all",
    search: "",
  });

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // Lọc reports theo filters
  const filteredReports = reports.filter((report) => {
    if (filters.status !== "all" && report.status !== filters.status)
      return false;
    if (filters.type !== "all" && report.type !== filters.type) return false;
    if (filters.priority !== "all" && report.priority !== filters.priority)
      return false;
    if (filters.category !== "all" && report.category !== filters.category)
      return false;
    if (
      filters.search &&
      !report.title.toLowerCase().includes(filters.search.toLowerCase()) &&
      !report.description?.toLowerCase().includes(filters.search.toLowerCase())
    )
      return false;
    return true;
  });

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Grid container spacing={3}>
      {/* Statistics Cards */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Tổng số báo cáo
            </Typography>
            <Typography variant="h4">
              {reportStats.total || reports.length || 0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Đang chờ xử lý
            </Typography>
            <Typography variant="h4" color="orange">
              {reportStats.byStatus?.pending ||
                reports.filter((r) => r.status === "pending").length ||
                0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Đang xử lý
            </Typography>
            <Typography variant="h4" color="blue">
              {reportStats.byStatus?.in_progress ||
                reports.filter((r) => r.status === "in_progress").length ||
                0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom variant="body2">
              Đã giải quyết
            </Typography>
            <Typography variant="h4" color="green">
              {reportStats.byStatus?.resolved ||
                reports.filter((r) => r.status === "resolved").length ||
                0}
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Main Content */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Typography variant="h5" component="h2">
                Quản lý Báo cáo
              </Typography>
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Button
                  startIcon={<Refresh />}
                  onClick={onRefresh}
                  variant="outlined"
                >
                  Làm mới
                </Button>
              </Box>
            </Box>

            {/* Filters */}
            <Box sx={{ mb: 3, display: "flex", gap: 2, flexWrap: "wrap" }}>
              <TextField
                label="Tìm kiếm theo tiêu đề"
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                size="small"
                sx={{ minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Trạng thái</InputLabel>
                <Select
                  value={filters.status}
                  label="Trạng thái"
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="pending">Đang chờ</MenuItem>
                  <MenuItem value="in_progress">Đang xử lý</MenuItem>
                  <MenuItem value="resolved">Đã giải quyết</MenuItem>
                  <MenuItem value="rejected">Đã từ chối</MenuItem>
                  <MenuItem value="closed">Đã đóng</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Loại</InputLabel>
                <Select
                  value={filters.type}
                  label="Loại"
                  onChange={(e) => handleFilterChange("type", e.target.value)}
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="bug">Lỗi</MenuItem>
                  <MenuItem value="feature">Tính năng</MenuItem>
                  <MenuItem value="complaint">Khiếu nại</MenuItem>
                  <MenuItem value="suggestion">Góp ý</MenuItem>
                  <MenuItem value="other">Khác</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Độ ưu tiên</InputLabel>
                <Select
                  value={filters.priority}
                  label="Độ ưu tiên"
                  onChange={(e) =>
                    handleFilterChange("priority", e.target.value)
                  }
                >
                  <MenuItem value="all">Tất cả</MenuItem>
                  <MenuItem value="low">Thấp</MenuItem>
                  <MenuItem value="medium">Trung bình</MenuItem>
                  <MenuItem value="high">Cao</MenuItem>
                  <MenuItem value="critical">Khẩn cấp</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {filteredReports.length === 0 ? (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  {reports.length === 0
                    ? "Chưa có báo cáo nào"
                    : "Không tìm thấy báo cáo phù hợp"}
                </Typography>
              </Box>
            ) : (
              <List>
                {filteredReports.map((report) => (
                  <ListItem
                    key={report._id}
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
                          onClick={() => onViewReport(report)}
                          title="Xem chi tiết"
                        >
                          <Visibility />
                        </IconButton>
                        {report.status === "pending" && (
                          <IconButton
                            color="primary"
                            onClick={() =>
                              onAssignReport(
                                report._id,
                                currentUser?.keycloakId || currentUser?.user_id
                              )
                            }
                            title="Nhận xử lý"
                          >
                            <Assignment />
                          </IconButton>
                        )}
                        {report.status === "in_progress" && (
                          <IconButton
                            color="success"
                            onClick={() =>
                              onUpdateReportStatus(
                                report._id,
                                "resolved",
                                "Đã xử lý thành công"
                              )
                            }
                            title="Đánh dấu đã giải quyết"
                          >
                            <CheckCircle />
                          </IconButton>
                        )}
                      </Box>
                    }
                  >
                    <ListItemIcon>
                      <Avatar
                        sx={{
                          bgcolor: getPriorityColor(report.priority),
                        }}
                      >
                        <Report />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flexWrap: "wrap",
                            mb: 1,
                          }}
                        >
                          <Typography variant="h6" component="span">
                            {report.title}
                          </Typography>
                          <Chip
                            label={getPriorityText(report.priority)}
                            size="small"
                            sx={{
                              bgcolor: getPriorityColor(report.priority),
                              color: "white",
                            }}
                          />
                          <Chip
                            label={getStatusText(report.status)}
                            size="small"
                            sx={{
                              bgcolor: getStatusColor(report.status),
                              color: "white",
                            }}
                          />
                          <Chip
                            label={report.type}
                            size="small"
                            variant="outlined"
                          />
                        </Box>
                      }
                      secondary={
                        <Box
                          component="div" // 🆕 SỬA LỖI DOM NESTING Ở ĐÂY
                          sx={{
                            display: "flex",
                            gap: 3,
                            flexWrap: "wrap",
                          }}
                        >
                          <Typography variant="body2" component="span">
                            Người báo cáo:{" "}
                            <strong>
                              {report.reportedByEmail ||
                                report.reportedBy ||
                                "Unknown User"}
                            </strong>
                          </Typography>
                          <Typography variant="body2" component="span">
                            Danh mục:{" "}
                            <strong>{report.category || "N/A"}</strong>
                          </Typography>
                          {report.assignedTo && (
                            <Typography variant="body2" component="span">
                              Người xử lý: <strong>{report.assignedTo}</strong>
                            </Typography>
                          )}
                          <Typography variant="body2" component="span">
                            Ngày tạo:{" "}
                            <strong>{formatDate(report.createdAt)}</strong>
                          </Typography>
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
