// src/pages/roles/components/user/CreateReportDialog.js
import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  Alert,
  Grid,
  Stepper,
  Step,
  StepLabel,
} from "@mui/material";

const CreateReportDialog = ({ open, onClose, currentUser, onCreateReport }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "bug",
    priority: "medium",
    category: "technical",
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [activeStep, setActiveStep] = useState(0);

  const steps = ["Thông tin cơ bản", "Chi tiết báo cáo", "Xác nhận"];

  const handleChange = (field) => (event) => {
    const value = event.target ? event.target.value : event;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Mark field as touched
    setTouched((prev) => ({
      ...prev,
      [field]: true,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({
        ...prev,
        [field]: "",
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 0) {
      if (!formData.title.trim()) {
        newErrors.title = "Tiêu đề không được để trống";
      }
      if (formData.title.length > 200) {
        newErrors.title = "Tiêu đề không được vượt quá 200 ký tự";
      }
    }

    if (step === 1) {
      if (!formData.description.trim()) {
        newErrors.description = "Mô tả không được để trống";
      }
      if (formData.description.length > 2000) {
        newErrors.description = "Mô tả không được vượt quá 2000 ký tự";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    if (validateStep(activeStep)) {
      onCreateReport(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      title: "",
      description: "",
      type: "bug",
      priority: "medium",
      category: "technical",
    });
    setErrors({});
    setTouched({});
    setActiveStep(0);
    onClose();
  };

  const reportTypes = [
    { value: "bug", label: "Lỗi hệ thống", emoji: "🐛" },
    { value: "feature", label: "Đề xuất tính năng", emoji: "💡" },
    { value: "complaint", label: "Khiếu nại", emoji: "😠" },
    { value: "suggestion", label: "Góp ý", emoji: "👍" },
    { value: "other", label: "Khác", emoji: "📝" },
  ];

  const priorityLevels = [
    { value: "low", label: "Thấp", emoji: "🟢" },
    { value: "medium", label: "Trung bình", emoji: "🟡" },
    { value: "high", label: "Cao", emoji: "🟠" },
    { value: "critical", label: "Khẩn cấp", emoji: "🔴" },
  ];

  const categories = [
    { value: "technical", label: "Kỹ thuật", emoji: "🔧" },
    { value: "content", label: "Nội dung", emoji: "📄" },
    { value: "user_behavior", label: "Hành vi người dùng", emoji: "👥" },
    { value: "payment", label: "Thanh toán", emoji: "💳" },
    { value: "general", label: "Chung", emoji: "📋" },
  ];

  const getStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              💡 Cung cấp thông tin cơ bản về báo cáo của bạn
            </Alert>

            <TextField
              label="Tiêu đề báo cáo"
              value={formData.title}
              onChange={handleChange("title")}
              error={!!errors.title}
              helperText={
                errors.title || "Mô tả ngắn gọn vấn đề (tối đa 200 ký tự)"
              }
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Loại báo cáo</InputLabel>
              <Select
                value={formData.type}
                label="Loại báo cáo"
                onChange={handleChange("type")}
              >
                {reportTypes.map((type) => (
                  <MenuItem key={type.value} value={type.value}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span>{type.emoji}</span>
                      <span>{type.label}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Độ ưu tiên</InputLabel>
              <Select
                value={formData.priority}
                label="Độ ưu tiên"
                onChange={handleChange("priority")}
              >
                {priorityLevels.map((priority) => (
                  <MenuItem key={priority.value} value={priority.value}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span>{priority.emoji}</span>
                      <span>{priority.label}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );

      case 1:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="info" sx={{ mb: 2 }}>
              📝 Mô tả chi tiết vấn đề bạn gặp phải
            </Alert>

            <TextField
              label="Mô tả chi tiết"
              value={formData.description}
              onChange={handleChange("description")}
              error={!!errors.description}
              helperText={
                errors.description ||
                "Mô tả chi tiết vấn đề, cách tái hiện lỗi, và ảnh hưởng (tối đa 2000 ký tự)"
              }
              multiline
              rows={6}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Danh mục</InputLabel>
              <Select
                value={formData.category}
                label="Danh mục"
                onChange={handleChange("category")}
              >
                {categories.map((category) => (
                  <MenuItem key={category.value} value={category.value}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <span>{category.emoji}</span>
                      <span>{category.label}</span>
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        );

      case 2:
        return (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ Kiểm tra lại thông tin trước khi gửi
            </Alert>

            <Box sx={{ p: 2, bgcolor: "background.default", borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                {formData.title}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Loại báo cáo:
                  </Typography>
                  <Chip
                    label={
                      reportTypes.find((t) => t.value === formData.type)?.label
                    }
                    size="small"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Độ ưu tiên:
                  </Typography>
                  <Chip
                    label={
                      priorityLevels.find((p) => p.value === formData.priority)
                        ?.label
                    }
                    size="small"
                    sx={{
                      bgcolor:
                        formData.priority === "critical"
                          ? "#f44336"
                          : formData.priority === "high"
                          ? "#ff9800"
                          : formData.priority === "medium"
                          ? "#ffc107"
                          : "#4caf50",
                      color: "white",
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Danh mục:
                  </Typography>
                  <Chip
                    label={
                      categories.find((c) => c.value === formData.category)
                        ?.label
                    }
                    size="small"
                    variant="outlined"
                  />
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Người báo cáo:
                  </Typography>
                  <Typography variant="body2">
                    {currentUser?.firstName} {currentUser?.lastName}
                  </Typography>
                </Grid>
              </Grid>

              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 2, mb: 1 }}
              >
                Mô tả:
              </Typography>
              <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                {formData.description}
              </Typography>
            </Box>

            <Alert severity="warning">
              ⚠️ Sau khi gửi, báo cáo sẽ được chuyển đến đội ngũ hỗ trợ và bạn
              có thể theo dõi trạng thái trong mục Báo cáo.
            </Alert>
          </Box>
        );

      default:
        return "Unknown step";
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" component="div" fontWeight="bold">
          📤 Gửi Báo cáo Mới
        </Typography>
        <Stepper activeStep={activeStep} sx={{ mt: 2 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ mt: 2 }}>{getStepContent(activeStep)}</Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose}>Hủy</Button>
        <Box sx={{ flex: "1 1 auto" }} />
        {activeStep > 0 && <Button onClick={handleBack}>Quay lại</Button>}
        {activeStep < steps.length - 1 ? (
          <Button onClick={handleNext} variant="contained">
            Tiếp theo
          </Button>
        ) : (
          <Button onClick={handleSubmit} variant="contained" color="success">
            Gửi Báo cáo
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreateReportDialog;
