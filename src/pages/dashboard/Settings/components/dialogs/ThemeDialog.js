// src/pages/dashboard/Settings/components/dialogs/ThemeDialog.js
import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Box,
  RadioGroup,
  FormControlLabel as MuiFormControlLabel,
  Radio,
} from "@mui/material";
import { Palette, Sun, Moon, Check, Desktop } from "phosphor-react";
import { useDispatch, useSelector } from "react-redux";
import { closeDialog } from "../../../../../redux/slices/settingsSlice"; // ✅ CHỈ import closeDialog
import { showSnackbar } from "../../../../../redux/slices/app";
import useSettings from "../../../../../hooks/useSettings"; // ✅ THÊM useSettings

const ThemeDialog = () => {
  const dispatch = useDispatch();
  const { dialogs } = useSelector((state) => state.settings);

  // ✅ SỬA: Sử dụng useSettings thay vì Redux theme
  const {
    themeMode,
    themeColorPresets,
    onToggleMode,
    onChangeColor,
    colorOption,
  } = useSettings();

  const handleClose = () => {
    dispatch(closeDialog({ type: "theme" }));
  };

  const handleThemeChange = (mode) => {
    // ✅ SỬA: Sử dụng useSettings method thay vì Redux dispatch
    // Giả sử useSettings có method để thay đổi theme mode
    // Nếu không có, bạn cần thêm vào hook
    console.log("🎨 Theme changed to:", mode);

    // Tạm thời sử dụng onToggleMode nếu chỉ có toggle
    // Nếu cần set cụ thể mode, bạn cần thêm setThemeMode vào useSettings
    if (mode !== themeMode) {
      // Nếu useSettings chỉ có toggle, bạn cần thêm setThemeMode
      // Đây là giải pháp tạm thời - bạn cần cập nhật useSettings
      onToggleMode(); // This toggles, not sets specific mode
    }
  };

  const handleColorChange = (color) => {
    // ✅ SỬA: Sử dụng useSettings method
    onChangeColor({ target: { value: color } });
    console.log("🎨 Primary color changed to:", color);
  };

  const handleSave = () => {
    dispatch(
      showSnackbar({
        severity: "success",
        message: "Cài đặt giao diện đã được lưu!",
      })
    );
    handleClose();
  };

  const themeOptions = [
    {
      value: "light",
      label: "Sáng",
      icon: <Sun size={20} />,
      description: "Giao diện sáng, phù hợp ban ngày",
    },
    {
      value: "dark",
      label: "Tối",
      icon: <Moon size={20} />,
      description: "Giao diện tối, dễ chịu cho mắt",
    },
    {
      value: "system",
      label: "Hệ thống",
      icon: <Desktop size={20} />,
      description: "Theo cài đặt thiết bị",
    },
  ];

  // ✅ SỬA: Sử dụng colorOption từ useSettings hoặc define mặc định
  const colorOptions = colorOption || [
    { value: "#0162C4", label: "Xanh dương" },
    { value: "#00AB55", label: "Xanh lá" },
    { value: "#FFC107", label: "Vàng" },
    { value: "#FF4842", label: "Đỏ" },
    { value: "#7635DC", label: "Tím" },
    { value: "#00B8D9", label: "Xanh ngọc" },
  ];

  return (
    <Dialog
      open={dialogs?.theme || false}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={2}>
          <Palette size={24} />
          <Typography variant="h6" fontWeight={600}>
            Cài đặt giao diện
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={4} sx={{ mt: 1 }}>
          {/* Theme Mode Selection */}
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Chế độ hiển thị
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Chọn chế độ hiển thị phù hợp với bạn
            </Typography>

            <RadioGroup
              value={themeMode || "light"} // ✅ SỬA: Sử dụng themeMode từ useSettings
              onChange={(e) => handleThemeChange(e.target.value)}
            >
              <Stack spacing={2}>
                {themeOptions.map((option) => (
                  <Box
                    key={option.value}
                    sx={{
                      border: 2,
                      borderColor:
                        themeMode === option.value // ✅ SỬA: Sử dụng themeMode
                          ? "primary.main"
                          : "divider",
                      borderRadius: 2,
                      p: 2,
                      cursor: "pointer",
                      backgroundColor:
                        themeMode === option.value // ✅ SỬA: Sử dụng themeMode
                          ? "action.selected"
                          : "background.paper",
                      "&:hover": {
                        backgroundColor: "action.hover",
                      },
                      transition: "all 0.2s ease",
                    }}
                    onClick={() => handleThemeChange(option.value)}
                  >
                    <Stack direction="row" alignItems="center" spacing={2}>
                      <MuiFormControlLabel
                        value={option.value}
                        control={
                          <Radio
                            checked={themeMode === option.value} // ✅ SỬA: Sử dụng themeMode
                            icon={
                              <Box
                                sx={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  border: 2,
                                  borderColor: "text.secondary",
                                }}
                              />
                            }
                            checkedIcon={
                              <Check
                                size={16}
                                color="white"
                                style={{
                                  backgroundColor:
                                    themeColorPresets || "#0162C4", // ✅ SỬA: Sử dụng themeColorPresets
                                  borderRadius: "50%",
                                  padding: 2,
                                }}
                              />
                            }
                          />
                        }
                        label={
                          <Stack
                            direction="row"
                            alignItems="center"
                            spacing={2}
                            flex={1}
                          >
                            <Box sx={{ color: "primary.main" }}>
                              {option.icon}
                            </Box>
                            <Stack flex={1}>
                              <Typography variant="body1" fontWeight={500}>
                                {option.label}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                              >
                                {option.description}
                              </Typography>
                            </Stack>
                          </Stack>
                        }
                        sx={{ margin: 0, flex: 1 }}
                      />
                    </Stack>
                  </Box>
                ))}
              </Stack>
            </RadioGroup>
          </Box>

          {/* Color Selection */}
          <Box>
            <Typography variant="h6" gutterBottom color="primary">
              Màu chủ đề
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Chọn màu sắc chủ đề cho ứng dụng
            </Typography>

            <Stack direction="row" spacing={1} flexWrap="wrap">
              {colorOptions.map((color) => (
                <Box
                  key={color.value}
                  sx={{
                    position: "relative",
                    cursor: "pointer",
                  }}
                  onClick={() => handleColorChange(color.value)}
                >
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: color.value,
                      border: 4,
                      borderColor:
                        themeColorPresets === color.value // ✅ SỬA: Sử dụng themeColorPresets
                          ? "primary.main"
                          : "transparent",
                      "&:hover": {
                        transform: "scale(1.1)",
                      },
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {themeColorPresets === color.value && ( // ✅ SỬA: Sử dụng themeColorPresets
                      <Check size={16} color="white" />
                    )}
                  </Box>
                  <Typography
                    variant="caption"
                    display="block"
                    textAlign="center"
                    sx={{ mt: 0.5 }}
                  >
                    {color.label}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Preview Section */}
          <Box sx={{ p: 2, bgcolor: "background.neutral", borderRadius: 2 }}>
            <Typography variant="body2" fontWeight={500} gutterBottom>
              Xem trước
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Chế độ:{" "}
              {
                themeOptions.find((t) => t.value === (themeMode || "light"))
                  ?.label
              }{" "}
              • Màu:{" "}
              {
                colorOptions.find(
                  (c) => c.value === (themeColorPresets || "#0162C4")
                )?.label
              }
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined">
          Hủy
        </Button>
        <Button variant="contained" onClick={handleSave}>
          Áp dụng thay đổi
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ThemeDialog;
