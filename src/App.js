// App.js
import React, { useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useKeycloak } from "@react-keycloak/web";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import ThemeSettings from "./components/settings";
import ThemeProvider from "./theme";
import Router from "./routes";
import { closeSnackBar } from "./redux/slices/app";
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

  // Khởi tạo socket connection khi user đã authenticated
  useEffect(() => {
    if (initialized && keycloak.authenticated && keycloak.token) {
      console.log("🔌 Initializing socket connection...");
      // Socket sẽ tự động kết nối khi import, nhưng có thể thêm logic init ở đây nếu cần
    }
  }, [initialized, keycloak.authenticated, keycloak.token]);

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
        <ThemeSettings>
          <Router />
        </ThemeSettings>
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
