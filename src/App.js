// App.js - HOÀN THIỆN VỚI FIX E2EE SETTINGS MODAL
import React, { useEffect, useCallback, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useKeycloak } from "@react-keycloak/web";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import ThemeSettings from "./components/settings";
import ThemeProvider from "./theme";
import Router from "./routes";
import { closeSnackBar } from "./redux/slices/app";
import { setKeycloakUser, signOut, setUserInfo } from "./redux/slices/auth";
import { AuthProvider } from "./contexts/AuthContext";
import { E2EEProvider } from "./contexts/E2EEContext";
import KeyExchangeDialog from "./pages/roles/components/dialogs/KeyExchangeDialog";
import E2EESettings from "./sections/dashboard/Settings/E2EESettings";
import { socket } from "./socket";
import LoadingScreen from "./components/LoadingScreen";
import { showSnackbar } from "./redux/slices/app";
import { getSocket } from "./socket";

const vertical = "top";
const horizontal = "center";

const Alert = React.forwardRef((props, ref) => (
  <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));

// 🆕 Tạo global notification handlers
const setupGlobalNotificationHandlers = (dispatch) => {
  window.showNotification = (notification) => {
    dispatch(showSnackbar(notification));
  };

  window.showKeyExchangeRequest = (data) => {
    dispatch(
      showSnackbar({
        severity: "info",
        message: `Key exchange request from ${data.username}`,
        action: "key_exchange",
        data: data,
      })
    );
  };
};

function App() {
  const dispatch = useDispatch();
  const { keycloak, initialized } = useKeycloak();
  const [keyExchangeDialogOpen, setKeyExchangeDialogOpen] = useState(false);
  const [keyExchangeRequest, setKeyExchangeRequest] = useState(null);
  const [showE2EESettings, setShowE2EESettings] = useState(false);

  const { severity, message, open, action, snackbarData } = useSelector(
    (state) => state.app?.snackbar ?? {}
  );

  // 🆕 Setup global notification handlers
  useEffect(() => {
    setupGlobalNotificationHandlers(dispatch);

    // Cleanup on unmount
    return () => {
      window.showNotification = null;
      window.showKeyExchangeRequest = null;
    };
  }, [dispatch]);

  // 🆕 Handle snackbar actions (for key exchange requests)
  useEffect(() => {
    if (open && action === "key_exchange" && snackbarData) {
      setKeyExchangeRequest(snackbarData);
      setKeyExchangeDialogOpen(true);
    }
  }, [open, action, snackbarData]);

  // 🆕 HOÀN THIỆN: Sync Redux với Keycloak + UserInfo + E2EE
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
            userInfo: userInfo,
          })
        );

        // 🆕 Initialize socket connection for E2EE
        const sock = getSocket();
        if (sock) {
          console.log("🔌 App - Socket connected for E2EE");

          // Listen for E2EE-related socket events
          sock.on("connect_error", (error) => {
            console.error("❌ Socket connection error:", error);
            dispatch(
              showSnackbar({
                severity: "error",
                message: "Connection error. Some features may not work.",
              })
            );
          });

          sock.on("connect", () => {
            console.log("✅ Socket connected successfully");
          });
        }
      } else if (!keycloak.authenticated) {
        console.log("🚪 App - User logged out, clearing Redux");
        dispatch(signOut());

        // 🆕 Clear E2EE keys from localStorage
        localStorage.removeItem("e2ee_public_key");
        localStorage.removeItem("e2ee_private_key");
        localStorage.removeItem("e2ee_fingerprint");
        localStorage.removeItem("e2ee_peer_keys");
      }
    }
  }, [
    initialized,
    keycloak.authenticated,
    keycloak.token,
    keycloak.tokenParsed,
    dispatch,
  ]);

  // 🆕 Keyboard shortcuts for E2EE
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Shift+E to open E2EE settings
      if (e.ctrlKey && e.shiftKey && e.key === "E") {
        e.preventDefault();
        setShowE2EESettings(true);
      }
      // Ctrl+Shift+K to open key exchange dialog
      if (e.ctrlKey && e.shiftKey && e.key === "K") {
        e.preventDefault();
        if (keyExchangeRequest) {
          setKeyExchangeDialogOpen(true);
        }
      }
      // ESC to close dialogs
      if (e.key === "Escape") {
        if (showE2EESettings) {
          setShowE2EESettings(false);
        }
        if (keyExchangeDialogOpen) {
          setKeyExchangeDialogOpen(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [keyExchangeRequest, showE2EESettings, keyExchangeDialogOpen]);

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

  // 🆕 Handle key exchange dialog close
  const handleKeyExchangeDialogClose = () => {
    setKeyExchangeDialogOpen(false);
    setKeyExchangeRequest(null);
  };

  // 🆕 Handle E2EE settings dialog close
  const handleE2EESettingsClose = () => {
    setShowE2EESettings(false);
  };

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
          <E2EEProvider>
            <ThemeSettings>
              <Router />
            </ThemeSettings>

            {/* 🆕 Key Exchange Dialog */}
            {keyExchangeRequest && (
              <KeyExchangeDialog
                open={keyExchangeDialogOpen}
                onClose={handleKeyExchangeDialogClose}
                exchangeRequest={keyExchangeRequest}
              />
            )}

            {/* 🆕 E2EE Settings Dialog - SỬA LẠI DÙNG MUI DIALOG */}
            <Dialog
              open={showE2EESettings}
              onClose={handleE2EESettingsClose}
              maxWidth="md"
              fullWidth
              PaperProps={{
                sx: {
                  maxHeight: "90vh",
                  borderRadius: 2,
                  boxShadow: 24,
                },
              }}
              sx={{
                zIndex: 1300, // Cao hơn các component khác
                "& .MuiBackdrop-root": {
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                },
              }}
            >
              <DialogTitle
                sx={{
                  bgcolor: "primary.main",
                  color: "white",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 2,
                  px: 3,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span style={{ fontSize: "1.5rem" }}>🔒</span>
                  End-to-End Encryption Settings
                </Box>
                <IconButton
                  onClick={handleE2EESettingsClose}
                  sx={{ color: "white" }}
                  size="small"
                >
                  <Close />
                </IconButton>
              </DialogTitle>
              <DialogContent sx={{ p: 0 }}>
                <E2EESettings />
              </DialogContent>
            </Dialog>
          </E2EEProvider>
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
            zIndex: 1400, // Cao hơn cả dialog
          },
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
          {action === "key_exchange" && snackbarData && (
            <div style={{ marginTop: "8px" }}>
              <button
                onClick={() => {
                  setKeyExchangeRequest(snackbarData);
                  setKeyExchangeDialogOpen(true);
                  dispatch(closeSnackBar());
                }}
                style={{
                  background: "none",
                  border: "1px solid white",
                  color: "white",
                  padding: "4px 8px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                View Request
              </button>
            </div>
          )}
        </Alert>
      </Snackbar>

      {/* 🆕 E2EE Status Indicator - DI CHUYỂN LÊN TRÊN */}
      {keycloak.authenticated && (
        <div
          style={{
            position: "fixed",
            top: "200px", // Thay bottom thành top
            right: "20px",
            zIndex: 1200, // Thấp hơn dialog nhưng cao hơn các element khác
          }}
        >
          <button
            onClick={() => setShowE2EESettings(true)}
            style={{
              backgroundColor: "#1976d2",
              color: "white",
              border: "none",
              borderRadius: "50%",
              width: "50px",
              height: "50px",
              fontSize: "24px",
              cursor: "pointer",
              boxShadow: "0 2px 10px rgba(0,0,0,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.3s ease",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "scale(1.1)";
              e.target.style.boxShadow = "0 4px 15px rgba(0,0,0,0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "scale(1)";
              e.target.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
            }}
            title="E2EE Settings (Ctrl+Shift+E)"
          >
            🔒
          </button>

          {/* Thêm tooltip nhỏ */}
          <div
            style={{
              position: "absolute",
              top: "55px",
              right: "0",
              backgroundColor: "#333",
              color: "white",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "12px",
              opacity: 0,
              transition: "opacity 0.3s",
              pointerEvents: "none",
              whiteSpace: "nowrap",
            }}
            id="e2ee-tooltip"
          >
            E2EE Settings (Ctrl+Shift+E)
          </div>
        </div>
      )}
    </>
  );
}

export default React.memo(App);
