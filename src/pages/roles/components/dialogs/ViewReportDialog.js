// src/pages/roles/components/dialogs/ViewReportDialog.js - ĐÃ CẬP NHẬT
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Divider,
  Avatar,
} from "@mui/material";
import {
  Report,
  Person,
  Category,
  PriorityHigh,
  Schedule,
  Assignment,
} from "@mui/icons-material";

import reportService from "../../../../services/reportService";

export default function ViewReportDialog({
  open,
  onClose,
  report,
  currentUser,
  onUpdateReportStatus,
  onAssignReport,
}) {
  const [status, setStatus] = useState(report?.status || "");
  const [resolutionNote, setResolutionNote] = useState(
    report?.resolution?.resolutionNote || ""
  );

  if (!report) return null;

  const handleStatusUpdate = () => {
    if (status !== report.status) {
      onUpdateReportStatus(report._id, status, resolutionNote);
    }
  };

  const handleAssignToMe = () => {
    onAssignReport(report._id, currentUser?.keycloakId || currentUser?.user_id);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Report />
          <Typography variant="h6">📊 Chi tiết Báo cáo</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Report Information */}
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" gutterBottom>
            {report.title}
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            {report.description}
          </Typography>
        </Box>

        {/* Metadata */}
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, mb: 3 }}>
          <Chip
            icon={<Category />}
            label={`Loại: ${
              reportService
                .getTypeOptions()
                .find((t) => t.value === report.type)?.label || report.type
            }`}
            variant="outlined"
          />
          <Chip
            icon={<PriorityHigh />}
            label={`Độ ưu tiên: ${reportService.getPriorityText(
              report.priority
            )}`}
            sx={{
              bgcolor: reportService.getPriorityColor(report.priority),
              color: "white",
            }}
          />
          <Chip
            icon={<Schedule />}
            label={`Trạng thái: ${reportService.getStatusText(report.status)}`}
            sx={{
              bgcolor: reportService.getStatusColor(report.status),
              color: "white",
            }}
          />
          {report.category && (
            <Chip label={`Danh mục: ${report.category}`} variant="outlined" />
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Reporter Information */}
        <Box sx={{ mb: 3 }}>
          <Typography
            variant="subtitle2"
            gutterBottom
            sx={{ display: "flex", alignItems: "center", gap: 1 }}
          >
            <Person />
            👤 Thông tin người báo cáo
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <Avatar sx={{ width: 32, height: 32, fontSize: "0.8rem" }}>
              {report.reporterInfo?.firstName?.[0]}
              {report.reporterInfo?.lastName?.[0]}
            </Avatar>
            <Box>
              <Typography variant="body2">
                <strong>
                  {report.reporterInfo?.firstName}{" "}
                  {report.reporterInfo?.lastName}
                </strong>
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {report.reportedByEmail || report.reportedBy}
              </Typography>
            </Box>
          </Box>
          <Typography variant="body2">
            📅 Ngày tạo:{" "}
            <strong>{reportService.formatDate(report.createdAt)}</strong>
          </Typography>
        </Box>

        {/* Assignment Information */}
        {report.assignedTo && (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="subtitle2"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <Assignment />
              Người được assign
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: "0.8rem" }}>
                {report.assignedToInfo?.firstName?.[0]}
                {report.assignedToInfo?.lastName?.[0]}
              </Avatar>
              <Typography variant="body2">
                <strong>
                  {report.assignedToInfo?.firstName}{" "}
                  {report.assignedToInfo?.lastName}
                </strong>
              </Typography>
            </Box>
          </Box>
        )}

        {/* Resolution Information */}
        {report.resolution && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              ✅ Thông tin giải quyết
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
              <Avatar sx={{ width: 32, height: 32, fontSize: "0.8rem" }}>
                {report.resolution.resolvedByInfo?.firstName?.[0]}
                {report.resolution.resolvedByInfo?.lastName?.[0]}
              </Avatar>
              <Typography variant="body2">
                Người giải quyết:{" "}
                <strong>
                  {report.resolution.resolvedByInfo?.firstName}{" "}
                  {report.resolution.resolvedByInfo?.lastName}
                </strong>
              </Typography>
            </Box>
            <Typography variant="body2">
              Thời gian:{" "}
              <strong>
                {reportService.formatDate(report.resolution.resolvedAt)}
              </strong>
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              Ghi chú: {report.resolution.resolutionNote}
            </Typography>
          </Box>
        )}

        {/* Admin Actions */}
        {(currentUser?.roles?.includes("admin") ||
          currentUser?.roles?.includes("moderator")) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" gutterBottom>
              ⚡ Hành động quản lý
            </Typography>

            {/* Assign to me button for pending reports */}
            {report.status === "pending" && (
              <Box sx={{ mb: 2 }}>
                <Button
                  variant="outlined"
                  onClick={handleAssignToMe}
                  fullWidth
                  startIcon={<Assignment />}
                >
                  Nhận xử lý báo cáo này
                </Button>
              </Box>
            )}

            {/* Status update */}
            <Box sx={{ mb: 2 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Cập nhật trạng thái</InputLabel>
                <Select
                  value={status}
                  label="Cập nhật trạng thái"
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <MenuItem value="pending">🕒 Đang chờ</MenuItem>
                  <MenuItem value="in_progress">🔄 Đang xử lý</MenuItem>
                  <MenuItem value="resolved">✅ Đã giải quyết</MenuItem>
                  <MenuItem value="rejected">❌ Đã từ chối</MenuItem>
                  <MenuItem value="closed">🔒 Đã đóng</MenuItem>
                </Select>
              </FormControl>
            </Box>

            {/* Resolution note */}
            {(status === "resolved" ||
              status === "rejected" ||
              status === "closed") && (
              <Box sx={{ mb: 2 }}>
                <TextField
                  label="Ghi chú giải quyết"
                  multiline
                  rows={3}
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  fullWidth
                  placeholder="Nhập ghi chú về cách giải quyết báo cáo..."
                />
              </Box>
            )}

            {/* Update button */}
            {status !== report.status && (
              <Button
                variant="contained"
                onClick={handleStatusUpdate}
                fullWidth
              >
                Cập nhật trạng thái
              </Button>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Đóng</Button>
      </DialogActions>
    </Dialog>
  );
}
