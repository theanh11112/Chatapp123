// src/components/settings/index.js
import PropTypes from "prop-types";
import { useSelector } from "react-redux";
//
import SettingsDrawer from "./drawer";
//
import ThemeContrast from "./ThemeContrast";
import ThemeRtlLayout from "./ThemeRtlLayout";
import ThemeColorPresets from "./ThemeColorPresets";
import ThemeLocalization from "./ThemeLocalization";

// ----------------------------------------------------------------------

ThemeSettings.propTypes = {
  children: PropTypes.node.isRequired,
};

export default function ThemeSettings({ children }) {
  const { theme: settingsTheme } = useSelector((state) => state.settings);

  return (
    <ThemeColorPresets
      primaryColor={settingsTheme?.primaryColor} // ✅ TRUYỀN MÀU TỪ REDUX
    >
      <ThemeContrast>
        <ThemeLocalization>
          <ThemeRtlLayout>
            {children}
            <SettingsDrawer />
          </ThemeRtlLayout>
        </ThemeLocalization>
      </ThemeContrast>
    </ThemeColorPresets>
  );
}
