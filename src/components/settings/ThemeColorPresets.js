// ThemeColorPresets.js
import PropTypes from "prop-types";
import { useMemo } from "react";
// @mui
import {
  alpha,
  ThemeProvider,
  createTheme,
  useTheme,
} from "@mui/material/styles";
// hooks
import useSettings from "../../hooks/useSettings";
//
import componentsOverride from "../../theme/overrides";

// ----------------------------------------------------------------------

// ✅ THÊM: Map color names to hex values
const COLOR_MAP = {
  default: "#00AB55",
  purple: "#7635DC",
  cyan: "#00B8D9",
  blue: "#006C9C",
  orange: "#FF9800", // hoặc '#FF6C00'
  red: "#FF3030",
  green: "#00AB55",
};

ThemeColorPresets.propTypes = {
  children: PropTypes.node,
};

export default function ThemeColorPresets({ children }) {
  const defaultTheme = useTheme();
  const { themeColorPresets } = useSettings();

  const themeOptions = useMemo(() => {
    // ✅ SỬA: Chuyển đổi color name thành hex value nếu cần
    let primaryColor = themeColorPresets || defaultTheme.palette.primary.main;

    // Nếu là color name (string), chuyển thành hex value
    if (typeof primaryColor === "string" && !primaryColor.startsWith("#")) {
      primaryColor =
        COLOR_MAP[primaryColor] || defaultTheme.palette.primary.main;
    }

    // ✅ ĐẢM BẢO: primaryColor luôn là hex value hợp lệ
    const isValidColor = primaryColor && primaryColor.startsWith("#");
    const safePrimaryColor = isValidColor
      ? primaryColor
      : defaultTheme.palette.primary.main;

    return {
      ...defaultTheme,
      palette: {
        ...defaultTheme.palette,
        primary: {
          main: safePrimaryColor,
          light: alpha(safePrimaryColor, 0.48),
          dark: alpha(safePrimaryColor, 0.8),
          contrastText: "#fff",
        },
      },
      customShadows: {
        ...defaultTheme.customShadows,
        primary: `0 8px 16px 0 ${alpha(safePrimaryColor, 0.24)}`,
      },
    };
  }, [themeColorPresets, defaultTheme]);

  const theme = createTheme(themeOptions);
  theme.components = componentsOverride(theme);

  return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}
