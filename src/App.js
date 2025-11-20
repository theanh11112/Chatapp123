// App.js - ĐÃ SỬA (CHỈ MỘT AuthProvider)
import React, { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useKeycloak } from "@react-keycloak/web";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import ThemeSettings from "./components/settings";
import ThemeProvider from "./theme";
import Router from "./routes";
import { closeSnackBar } from "./redux/slices/app";
import { setKeycloakUser, signOut } from "./redux/slices/auth";
import { AuthProvider } from "./contexts/AuthContext";
import { socket } from "./socket";
import LoadingScreen from "./components/LoadingScreen";

const vertical = "bottom";
const horizontal = "center";

const Alert = React.forwardRef((props, ref) => (
  <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));

function App() {
  const dispatch = useDispatch();
  const { keycloak, initialized } = useKeycloak();

  const { severity, message, open } = useSelector(
    (state) => state.app?.snackbar ?? {}
  );

  // 🆕 THÊM: Sync Redux với Keycloak
  useEffect(() => {
    if (initialized) {
      console.log("🔑 App - Keycloak initialized:", {
        authenticated: keycloak.authenticated,
        user_id: keycloak.tokenParsed?.sub,
      });

      if (keycloak.authenticated && keycloak.token) {
        const userInfo = {
          user_id: keycloak.tokenParsed?.sub,
          role: keycloak.tokenParsed?.realm_access?.roles?.[0] || "user",
          token: keycloak.token,
        };

        console.log("👤 App - Setting Redux state:", userInfo);
        dispatch(setKeycloakUser(userInfo));
      } else if (!keycloak.authenticated) {
        console.log("🚪 App - User logged out, clearing Redux");
        dispatch(signOut());
      }
    }
  }, [
    initialized,
    keycloak.authenticated,
    keycloak.token,
    keycloak.tokenParsed,
    dispatch,
  ]);

  // Xử lý đóng snackbar
  const handleCloseSnackbar = useCallback(
    (event, reason) => {
      if (reason === "clickaway") {
        return;
      }
      dispatch(closeSnackBar());
    },
    [dispatch]
  );

  // Hiển thị loading screen khi chưa khởi tạo xong Keycloak
  if (!initialized) {
    return (
      <ThemeProvider>
        <LoadingScreen />
      </ThemeProvider>
    );
  }

  return (
    <>
      <ThemeProvider>
        {/* 🆕 SỬA: Chỉ còn một AuthProvider duy nhất */}
        <AuthProvider>
          <ThemeSettings>
            <Router />
          </ThemeSettings>
        </AuthProvider>
      </ThemeProvider>

      {/* Snackbar for notifications */}
      <Snackbar
        anchorOrigin={{ vertical, horizontal }}
        open={open}
        autoHideDuration={4000}
        key={vertical + horizontal}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={severity}
          sx={{
            width: "100%",
            "& .MuiAlert-message": {
              overflow: "hidden",
              textOverflow: "ellipsis",
            },
          }}
        >
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}

export default React.memo(App);
