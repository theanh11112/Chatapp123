// src/theme/index.js - CẬP NHẬT để tích hợp với Redux
import PropTypes from "prop-types";
import { useMemo } from "react";
import { CssBaseline } from "@mui/material";
import {
  createTheme,
  ThemeProvider as MUIThemeProvider,
  StyledEngineProvider,
} from "@mui/material/styles";
// hooks
import useSettings from "../hooks/useSettings.js";
//
import palette from "./palette";
import typography from "./typography";
import breakpoints from "./breakpoints";
import componentsOverride from "./overrides";
import shadows, { customShadows } from "./shadows";

// ----------------------------------------------------------------------

ThemeProvider.propTypes = {
  children: PropTypes.node,
};

// 🆕 HÀM TẠO THEME DỰA TRÊN REDUX SETTINGS
export const createAppTheme = (settings = {}) => {
  const { themeMode = "light", themeDirection = "ltr" } = settings;
  const isLight = themeMode === "light";

  const themeOptions = {
    palette: isLight
      ? {
          ...palette.light,
          primary: {
            main: settings.primaryColor || palette.light.primary.main,
          },
        }
      : {
          ...palette.dark,
          primary: {
            main: settings.primaryColor || palette.dark.primary.main,
          },
        },
    typography,
    breakpoints,
    shape: { borderRadius: 8 },
    direction: themeDirection,
    shadows: isLight ? shadows.light : shadows.dark,
    customShadows: isLight ? customShadows.light : customShadows.dark,
  };

  const theme = createTheme(themeOptions);
  theme.components = componentsOverride(theme);

  return theme;
};

export default function ThemeProvider({ children }) {
  const { themeMode, themeDirection } = useSettings();

  // 🆕 LẤY SETTINGS TỪ REDUX (nếu có)
  const reduxSettings = {}; // Có thể lấy từ Redux store ở đây

  const themeOptions = {
    themeMode: reduxSettings.theme?.mode || themeMode,
    themeDirection,
    primaryColor: reduxSettings.theme?.primaryColor,
  };

  const theme = useMemo(
    () => createAppTheme(themeOptions),
    [
      themeOptions.themeMode,
      themeOptions.themeDirection,
      themeOptions.primaryColor,
    ]
  );

  return (
    <StyledEngineProvider injectFirst>
      <MUIThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MUIThemeProvider>
    </StyledEngineProvider>
  );
}
