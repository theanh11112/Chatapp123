// App.js - HOÀN THIỆN VỚI USERINFO
import React, { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useKeycloak } from "@react-keycloak/web";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import ThemeSettings from "./components/settings";
import ThemeProvider from "./theme";
import Router from "./routes";
import { closeSnackBar } from "./redux/slices/app";
import { setKeycloakUser, signOut, setUserInfo } from "./redux/slices/auth"; // ✅ THÊM setUserInfo
import { AuthProvider } from "./contexts/AuthContext";
import { socket } from "./socket";
import LoadingScreen from "./components/LoadingScreen";

const vertical = "top";
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

  // 🆕 HOÀN THIỆN: Sync Redux với Keycloak + UserInfo
  useEffect(() => {
    if (initialized) {
      console.log("🔑 App - Keycloak initialized:", {
        authenticated: keycloak.authenticated,
        user_id: keycloak.tokenParsed?.sub,
      });

      if (keycloak.authenticated && keycloak.token) {
        const tokenData = keycloak.tokenParsed || {};

        // ✅ TẠO userInfo CHUẨN cho chatbot
        const userInfo = {
          user_id: tokenData.sub || "user001",
          employee_id:
            tokenData.employee_id || `EMP${tokenData.sub?.slice(-4) || "001"}`,
          department: tokenData.department || "General",
          role:
            tokenData.role || tokenData.realm_access?.roles?.[0] || "employee",
          permission_level: parseInt(tokenData.permission_level) || 2,
        };

        console.log("👤 App - Setting Redux state with userInfo:", userInfo);

        // ✅ SET USERINFO RIÊNG trước
        dispatch(setUserInfo(userInfo));

        // ✅ SET KEYCLOAK USER với userInfo
        dispatch(
          setKeycloakUser({
            user_id: userInfo.user_id,
            role: userInfo.role,
            token: keycloak.token,
            userInfo: userInfo, // ✅ TRUYỀN userInfo vào đây
          })
        );
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
        <AuthProvider>
          <ThemeSettings>
            <Router />
          </ThemeSettings>
        </AuthProvider>
      </ThemeProvider>

      <Snackbar
        anchorOrigin={{ vertical, horizontal }}
        open={open}
        autoHideDuration={4000}
        key={vertical + horizontal}
        onClose={handleCloseSnackbar}
        sx={{
          "&.MuiSnackbar-root": {
            top: "80px",
            marginLeft: "100px",
          },
          zIndex: 9999,
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={severity}
          sx={{
            width: "100%",
            minWidth: "300px",
            "& .MuiAlert-message": {
              overflow: "hidden",
              textOverflow: "ellipsis",
              textAlign: "center",
              flex: 1,
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
