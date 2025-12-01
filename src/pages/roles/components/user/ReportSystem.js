// src/pages/roles/components/user/ReportSystem.js
import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Menu,
  MenuItem,
} from "@mui/material";
import {
  Add,
  Report,
  Edit,
  Delete,
  MoreVert,
  Visibility,
  Refresh,
} from "@mui/icons-material";

// Import utility functions từ reportService
import reportService from "../../../../services/reportService";

const ReportSystem = ({
  loading = false,
  reports = [],
  currentUser,
  onRefresh,
  onCreateReport,
  onUpdateReport,
  onDeleteReport,
}) => {
  const [filter, setFilter] = useState("all"); // all, pending, in_progress, resolved
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);

  const handleMenuOpen = (event, report) => {
    setAnchorEl(event.currentTarget);
    setSelectedReport(report);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedReport(null);
  };

  const handleEditReport = () => {
    if (selectedReport && onUpdateReport) {
      // Chỉ cho phép edit khi report còn pending
      if (selectedReport.status === "pending") {
        // Ở đây bạn có thể mở dialog edit hoặc xử lý theo cách khác
        console.log("Edit report:", selectedReport);
        showSnackbarMessage("Chức năng chỉnh sửa đang được phát triển", "info");
      } else {
        showSnackbarMessage(
          "Chỉ có thể chỉnh sửa báo cáo đang chờ xử lý",
          "warning"
        );
      }
    }
    handleMenuClose();
  };

  const handleDeleteReport = () => {
    if (selectedReport && onDeleteReport) {
      // Chỉ cho phép delete khi report còn pending
      if (selectedReport.status === "pending") {
        onDeleteReport(selectedReport._id);
      } else {
        showSnackbarMessage("Chỉ có thể xóa báo cáo đang chờ xử lý", "warning");
      }
    }
    handleMenuClose();
  };

  const handleViewReport = () => {
    if (selectedReport) {
      // Ở đây bạn có thể mở dialog xem chi tiết
      console.log("View report:", selectedReport);
      showSnackbarMessage(
        "Chức năng xem chi tiết đang được phát triển",
        "info"
      );
    }
    handleMenuClose();
  };

  const showSnackbarMessage = (message, severity = "info") => {
    // Ở đây bạn có thể sử dụng snackbar context hoặc truyền từ parent
    console.log(`${severity}: ${message}`);
  };

  // Filter reports based on status
  const filteredReports = reports.filter((report) => {
    if (filter === "all") return true;
    return report.status === filter;
  });

  const pendingReports = reports.filter((r) => r.status === "pending");
  const inProgressReports = reports.filter((r) => r.status === "in_progress");
  const resolvedReports = reports.filter((r) =>
    ["resolved", "rejected", "closed"].includes(r.status)
  );

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Typography textAlign="center">Đang tải báo cáo...</Typography>
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
              📊 Hệ thống Báo cáo
            </Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                startIcon={<Add />}
                variant="contained"
                onClick={onCreateReport}
              >
                Tạo báo cáo
              </Button>
              <Button
                startIcon={<Refresh />}
                onClick={onRefresh}
                variant="outlined"
              >
                Làm mới
              </Button>
            </Box>
          </Box>

          {/* Filter Buttons */}
          <Box sx={{ display: "flex", gap: 1, mb: 3, flexWrap: "wrap" }}>
            <Button
              size="small"
              onClick={() => setFilter("all")}
              variant={filter === "all" ? "contained" : "outlined"}
            >
              Tất cả ({reports.length})
            </Button>
            <Button
              size="small"
              onClick={() => setFilter("pending")}
              variant={filter === "pending" ? "contained" : "outlined"}
            >
              Đang chờ ({pendingReports.length})
            </Button>
            <Button
              size="small"
              onClick={() => setFilter("in_progress")}
              variant={filter === "in_progress" ? "contained" : "outlined"}
            >
              Đang xử lý ({inProgressReports.length})
            </Button>
            <Button
              size="small"
              onClick={() => setFilter("resolved")}
              variant={filter === "resolved" ? "contained" : "outlined"}
            >
              Đã giải quyết ({resolvedReports.length})
            </Button>
          </Box>

          {/* Reports List */}
          {filteredReports.length > 0 ? (
            <List>
              {filteredReports.map((report, index) => (
                <div key={report._id || report.id || index}>
                  <ListItem
                    sx={{
                      border: "1px solid",
                      borderColor: "divider",
                      borderRadius: 2,
                      mb: 1,
                      bgcolor: "background.paper",
                    }}
                  >
                    <ListItemIcon>
                      <Box sx={{ fontSize: 24 }}>
                        <Report />
                      </Box>
                    </ListItemIcon>

                    <Box sx={{ flex: 1, mr: 2 }}>
                      {/* Primary content */}
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          mb: 0.5,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight="medium"
                          color="text.primary"
                        >
                          {report.title}
                        </Typography>
                        <Chip
                          label={reportService.getTypeText(report.type)}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={reportService.getPriorityText(report.priority)}
                          size="small"
                          sx={{
                            bgcolor: reportService.getPriorityColor(
                              report.priority
                            ),
                            color: "white",
                          }}
                        />
                        <Chip
                          label={reportService.getStatusText(report.status)}
                          size="small"
                          sx={{
                            bgcolor: reportService.getStatusColor(
                              report.status
                            ),
                            color: "white",
                          }}
                        />
                      </Box>

                      {/* Secondary content */}
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                      >
                        {report.description}
                      </Typography>

                      {/* Metadata */}
                      <Box
                        sx={{
                          display: "flex",
                          gap: 2,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          📅 {reportService.formatDate(report.createdAt)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          🏷️ {report.category}
                        </Typography>
                        {report.assignedTo && (
                          <Typography variant="caption" color="text.secondary">
                            👤 Đang xử lý: {report.assignedTo}
                          </Typography>
                        )}
                        {report.resolution?.resolvedAt && (
                          <Typography variant="caption" color="text.secondary">
                            ✅ Giải quyết:{" "}
                            {reportService.formatDate(
                              report.resolution.resolvedAt
                            )}
                          </Typography>
                        )}
                      </Box>
                    </Box>

                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={(e) => handleMenuOpen(e, report)}
                        size="small"
                      >
                        <MoreVert />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>

                  {index < filteredReports.length - 1 && <Divider />}
                </div>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              {filter === "pending"
                ? "Không có báo cáo nào đang chờ xử lý."
                : filter === "in_progress"
                ? "Không có báo cáo nào đang được xử lý."
                : filter === "resolved"
                ? "Không có báo cáo nào đã giải quyết."
                : "Chưa có báo cáo nào."}
            </Alert>
          )}

          {/* Statistics */}
          <Box
            sx={{ mt: 3, p: 2, bgcolor: "background.default", borderRadius: 2 }}
          >
            <Typography variant="subtitle2" gutterBottom>
              📈 Thống kê báo cáo
            </Typography>
            <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Tổng số
                </Typography>
                <Typography variant="h6">{reports.length}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Đang chờ
                </Typography>
                <Typography variant="h6" color="warning.main">
                  {pendingReports.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Đang xử lý
                </Typography>
                <Typography variant="h6" color="info.main">
                  {inProgressReports.length}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Đã giải quyết
                </Typography>
                <Typography variant="h6" color="success.main">
                  {resolvedReports.length}
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleViewReport}>
          <ListItemIcon>
            <Visibility fontSize="small" />
          </ListItemIcon>
          Xem chi tiết
        </MenuItem>
        {selectedReport?.status === "pending" && (
          <MenuItem onClick={handleEditReport}>
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            Chỉnh sửa
          </MenuItem>
        )}
        {selectedReport?.status === "pending" && (
          <MenuItem onClick={handleDeleteReport}>
            <ListItemIcon>
              <Delete fontSize="small" />
            </ListItemIcon>
            Xóa báo cáo
          </MenuItem>
        )}
      </Menu>
    </div>
  );
};

export default ReportSystem;
