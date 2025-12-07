// App.js - HOÀN THIỆN VỚI E2EE INTEGRATION
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
  Tooltip,
  CircularProgress,
  Badge,
} from "@mui/material";
import {
  Close,
  Security as SecurityIcon,
  VpnKey as KeyIcon,
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Sync as SyncIcon,
} from "@mui/icons-material";
import ThemeSettings from "./components/settings";
import ThemeProvider from "./theme";
import Router from "./routes";
import { closeSnackBar } from "./redux/slices/app";
import { setKeycloakUser, signOut, setUserInfo } from "./redux/slices/auth";
import { AuthProvider } from "./contexts/AuthContext";
import { showSnackbar } from "./redux/slices/app";
import { getSocket } from "./socket";
import LoadingScreen from "./components/LoadingScreen";

// 🆕 IMPORT E2EE SYSTEM
import {
  setupE2EESystem,
  quickStartE2EE,
  useAutoE2EE,
  E2EEStatusIndicator,
  EncryptionBadge,
  debugE2EESystem,
} from "./e2ee";

const vertical = "top";
const horizontal = "center";

const Alert = React.forwardRef((props, ref) => (
  <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));

// 🆕 Tạo global notification handlers với E2EE support
const setupGlobalNotificationHandlers = (dispatch) => {
  window.showNotification = (notification) => {
    dispatch(showSnackbar(notification));
  };

  window.showKeyExchangeRequest = (data) => {
    dispatch(
      showSnackbar({
        severity: "info",
        message: `🔐 Key exchange request from ${data.username || "friend"}`,
        action: "key_exchange",
        data: data,
        autoHideDuration: 10000,
      })
    );
  };

  // 🆕 Debug function
  window.debugE2EE = debugE2EESystem;

  // 🆕 Quick access to E2EE functions
  window.e2ee = {
    showSettings: null, // Will be set later
    regenerateKeys: null, // Will be set later
    status: null, // Will be set later
  };
};

// 🆕 Component cho E2EE Status Floating Button
const E2EEStatusFloatingButton = ({ onOpenSettings, onDebug }) => {
  const { status, isReady, myFingerprint, isInitializing } = useAutoE2EE();
  const [hover, setHover] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const getButtonConfig = () => {
    switch (status) {
      case "ready":
        return {
          icon: <LockIcon />,
          color: "#4caf50",
          bgColor: "#e8f5e9",
          tooltip: "End-to-end encryption active",
          pulse: true,
        };
      case "initializing":
        return {
          icon: <SyncIcon className="spin" />,
          color: "#ff9800",
          bgColor: "#fff3e0",
          tooltip: "Initializing encryption...",
          pulse: false,
        };
      case "error":
        return {
          icon: <ErrorIcon />,
          color: "#f44336",
          bgColor: "#ffebee",
          tooltip: "Encryption error - Click to debug",
          pulse: true,
        };
      default:
        return {
          icon: <LockOpenIcon />,
          color: "#9e9e9e",
          bgColor: "#f5f5f5",
          tooltip: "Encryption disabled",
          pulse: false,
        };
    }
  };

  const config = getButtonConfig();

  // Thêm CSS cho animation
  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(76, 175, 80, 0); }
        100% { box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
      }
      .spin {
        animation: spin 2s linear infinite;
      }
      .pulse {
        animation: pulse 2s infinite;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <>
      <Tooltip
        title={
          <Box sx={{ p: 1 }}>
            <Box sx={{ fontWeight: "bold", mb: 0.5 }}>{config.tooltip}</Box>
            {myFingerprint && (
              <Box sx={{ fontSize: "0.75rem", fontFamily: "monospace" }}>
                Fingerprint: {myFingerprint}
              </Box>
            )}
            <Box sx={{ fontSize: "0.75rem", mt: 0.5 }}>
              Status: {status}
              {isInitializing && " (Initializing...)"}
            </Box>
          </Box>
        }
        arrow
        open={showTooltip || hover}
        onOpen={() => setShowTooltip(true)}
        onClose={() => setShowTooltip(false)}
        placement="left"
      >
        <Box
          sx={{
            position: "fixed",
            top: "200px",
            right: "20px",
            zIndex: 1200,
          }}
        >
          <IconButton
            onClick={status === "error" ? onDebug : onOpenSettings}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            sx={{
              width: 56,
              height: 56,
              backgroundColor: config.bgColor,
              color: config.color,
              border: `2px solid ${config.color}`,
              boxShadow: 3,
              "&:hover": {
                backgroundColor: config.color,
                color: "white",
                transform: "scale(1.1)",
              },
              transition: "all 0.3s ease",
              animation: config.pulse ? "pulse 2s infinite" : "none",
            }}
          >
            {isInitializing ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              config.icon
            )}
          </IconButton>

          {/* Badge cho trạng thái */}
          {status === "ready" && (
            <Badge
              color="success"
              variant="dot"
              sx={{
                position: "absolute",
                top: 5,
                right: 5,
                "& .MuiBadge-dot": {
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                },
              }}
            />
          )}
        </Box>
      </Tooltip>

      {/* Debug button */}
      {process.env.NODE_ENV === "development" && (
        <IconButton
          onClick={onDebug}
          sx={{
            position: "fixed",
            top: "270px",
            right: "20px",
            zIndex: 1200,
            backgroundColor: "#333",
            color: "white",
            width: 40,
            height: 40,
            fontSize: "0.75rem",
            "&:hover": {
              backgroundColor: "#555",
            },
          }}
          title="Debug E2EE"
        >
          🐛
        </IconButton>
      )}
    </>
  );
};

function App() {
  const dispatch = useDispatch();
  const { keycloak, initialized } = useKeycloak();
  const [keyExchangeDialogOpen, setKeyExchangeDialogOpen] = useState(false);
  const [keyExchangeRequest, setKeyExchangeRequest] = useState(null);
  const [showE2EESettings, setShowE2EESettings] = useState(false);
  const [e2eeInitialized, setE2eeInitialized] = useState(false);
  const [e2eeError, setE2eeError] = useState(null);

  const { severity, message, open, action, snackbarData } = useSelector(
    (state) => state.app?.snackbar ?? {}
  );

  // 🆕 Get E2EE status
  const { status: e2eeStatus, isReady: e2eeReady } = useAutoE2EE();

  // 🆕 Setup global notification handlers với E2EE functions
  useEffect(() => {
    setupGlobalNotificationHandlers(dispatch);

    // Set E2EE functions to window
    window.e2ee.showSettings = () => setShowE2EESettings(true);
    window.e2ee.regenerateKeys = async () => {
      const { default: autoEncryptionService } = await import(
        "./e2ee/services/autoEncryptionService"
      );
      return autoEncryptionService.initializeKeyPair();
    };
    window.e2ee.status = e2eeStatus;

    // Cleanup on unmount
    return () => {
      window.showNotification = null;
      window.showKeyExchangeRequest = null;
      window.e2ee = {};
    };
  }, [dispatch, e2eeStatus]);

  // 🆕 INITIALIZE E2EE SYSTEM
  // Trong App.js, sửa phần E2EE initialization:

  // 🆕 INITIALIZE E2EE SYSTEM
  // App.js - Sửa phần E2EE initialization

  // 🆕 INITIALIZE E2EE SYSTEM
  useEffect(() => {
    if (initialized && keycloak.authenticated && !e2eeInitialized) {
      console.log("🚀 App - Initializing E2EE system...");

      const initE2EE = async () => {
        try {
          // 🆕 Chờ socket connection trước
          const socket = await waitForSocketConnection();

          if (!socket) {
            console.warn(
              "⚠️ Socket not available, will retry E2EE initialization"
            );
            // Retry sau 2 giây
            setTimeout(initE2EE, 2000);
            return;
          }

          // Option 1: Quick start (recommended)
          const result = await quickStartE2EE();

          if (result.success) {
            console.log("✅ App - E2EE system initialized successfully");
            setE2eeInitialized(true);

            // Show welcome notification
            dispatch(
              showSnackbar({
                severity: "success",
                message: "End-to-end encryption enabled",
                autoHideDuration: 3000,
              })
            );
          } else {
            console.error("❌ App - E2EE quick start failed:", result.error);
            setE2eeError(result.error);

            // Option 2: Try full setup
            await setupE2EESystem();

            // Set initialized anyway
            setE2eeInitialized(true);
          }
        } catch (error) {
          console.error("❌ App - E2EE initialization error:", error);
          setE2eeError(error.message);

          // Still mark as initialized to avoid infinite retry
          setE2eeInitialized(true);

          // Setup anyway in degraded mode
          await setupE2EESystem();
        }
      };

      // 🆕 Giảm timeout để bắt đầu sớm hơn
      const timer = setTimeout(() => {
        initE2EE();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [initialized, keycloak.authenticated, e2eeInitialized, dispatch]);

  // 🆕 Hàm chờ socket connection (thêm vào App.js)
  const waitForSocketConnection = () => {
    return new Promise((resolve) => {
      const maxAttempts = 30; // 3 seconds
      let attempts = 0;

      const checkSocket = () => {
        const socket = window.socket;

        if (socket && socket.connected) {
          console.log("✅ Socket connected for E2EE");
          resolve(socket);
        } else if (attempts >= maxAttempts) {
          console.warn("⚠️ Socket connection timeout for E2EE");
          resolve(null);
        } else {
          attempts++;
          setTimeout(checkSocket, 100);
        }
      };

      checkSocket();
    });
  };

  // 🆕 Handle snackbar actions (for key exchange requests)
  useEffect(() => {
    if (open && action === "key_exchange" && snackbarData) {
      setKeyExchangeRequest(snackbarData);
      setKeyExchangeDialogOpen(true);
    }

    // 🆕 Handle E2EE-related notifications
    if (message && (message.includes("encrypt") || message.includes("key"))) {
      console.log("🔐 App - E2EE related notification:", message);
    }
  }, [open, action, snackbarData, message]);

  // 🆕 Sync Redux với Keycloak + UserInfo + E2EE
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

            // Auto-setup E2EE socket integration
            import("./e2ee/integration/socketIntegration").then(
              ({ setupSocketE2EEIntegration }) => {
                setupSocketE2EEIntegration(sock);
              }
            );
          });

          // Listen for E2EE events
          sock.on("encrypted_message", (data) => {
            console.log("🔐 App - Received encrypted message:", {
              from: data.sender?.username,
              messageId: data.id,
            });
          });

          sock.on("key_exchange_request", (data) => {
            console.log("🤝 App - Key exchange request:", data);
            window.showKeyExchangeRequest(data);
          });

          sock.on("key_exchange_confirmed", (data) => {
            console.log("✅ App - Key exchange confirmed:", data);
            dispatch(
              showSnackbar({
                severity: "success",
                message: `Encryption established with ${
                  data.username || "friend"
                }`,
              })
            );
          });
        }
      } else if (!keycloak.authenticated) {
        console.log("🚪 App - User logged out, clearing Redux");
        dispatch(signOut());

        // 🆕 Clear E2EE keys from localStorage
        const e2eeKeys = [
          "e2ee_keypair",
          "e2ee_peer_keys",
          "e2ee_encryption_cache",
          "e2ee_sessions",
          "e2ee_error_log",
          "e2ee_master_hash",
          "auto_encryption_enabled",
        ];

        e2eeKeys.forEach((key) => localStorage.removeItem(key));

        console.log("🧹 App - Cleared all E2EE data");
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
      // Ctrl+Shift+D to debug E2EE
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        debugE2EESystem();
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

  // 🆕 Handle debug click
  const handleDebugClick = () => {
    debugE2EESystem();
    dispatch(
      showSnackbar({
        severity: "info",
        message: "E2EE debug info logged to console",
      })
    );
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
          {/* 🆕 Add Redux E2EE Middleware */}
          {keycloak.authenticated && (
            <script>
              {`
                  // Auto-setup Redux E2EE middleware
                  (async () => {
                    try {
                      const { setupReduxE2EEIntegration } = await import('./e2ee/integration/reduxIntegration');
                      setupReduxE2EEIntegration();
                      console.log('✅ Redux E2EE middleware setup');
                    } catch (error) {
                      console.error('❌ Redux E2EE middleware setup failed:', error);
                    }
                  })();
                `}
            </script>
          )}

          <ThemeSettings>
            <Router />
          </ThemeSettings>

          {/* 🆕 Key Exchange Dialog */}

          {/* 🆕 E2EE Settings Dialog */}
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
              zIndex: 1300,
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
                <SecurityIcon />
                End-to-End Encryption Settings
                {e2eeReady && (
                  <Badge color="success" variant="dot" sx={{ ml: 1 }} />
                )}
              </Box>
              <IconButton
                onClick={handleE2EESettingsClose}
                sx={{ color: "white" }}
                size="small"
              >
                <Close />
              </IconButton>
            </DialogTitle>
          </Dialog>
        </AuthProvider>
      </ThemeProvider>

      {/* 🆕 E2EE Status Floating Button */}
      {keycloak.authenticated && (
        <E2EEStatusFloatingButton
          onOpenSettings={() => setShowE2EESettings(true)}
          onDebug={handleDebugClick}
        />
      )}

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
            zIndex: 1400,
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

      {/* 🆕 E2EE Initialization Error Alert */}
      {e2eeError && (
        <Snackbar
          open={true}
          autoHideDuration={10000}
          onClose={() => setE2eeError(null)}
          sx={{
            top: "150px",
            zIndex: 1400,
          }}
        >
          <Alert severity="warning" onClose={() => setE2eeError(null)}>
            E2EE Initialization Warning: {e2eeError}
            <div style={{ marginTop: "8px", fontSize: "0.9rem" }}>
              Chat will continue with basic encryption.
            </div>
          </Alert>
        </Snackbar>
      )}
    </>
  );
}

export default React.memo(App);
