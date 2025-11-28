// src/hooks/useSettings.js
import { useContext } from "react";
import { SettingsContext } from "../contexts/SettingsContext";

// ✅ THÊM: Color map để chuyển đổi
const COLOR_MAP = {
  default: "#00AB55",
  purple: "#7635DC",
  cyan: "#00B8D9",
  blue: "#006C9C",
  orange: "#FF9800",
  red: "#FF3030",
};

const useSettings = () => {
  const context = useContext(SettingsContext);

  // ✅ THÊM: Chuyển đổi themeColorPresets thành hex value nếu cần
  const getColorValue = (color) => {
    if (!color) return "#00AB55"; // default color
    if (color.startsWith("#")) return color; // already hex
    return COLOR_MAP[color] || "#00AB55"; // map name to hex
  };

  return {
    ...context,
    // Trả về cả name và value để components có thể sử dụng
    themeColorPresets: context.themeColorPresets,
    themeColorValue: getColorValue(context.themeColorPresets),
  };
};

export default useSettings;
