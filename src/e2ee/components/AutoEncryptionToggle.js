import React, { useState } from "react";
import {
  Box,
  Typography,
  Switch,
  FormControlLabel,
  Paper,
  Alert,
  Tooltip,
  IconButton,
  Collapse,
} from "@mui/material";
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  Info as InfoIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import useAutoE2EE from "../hooks/useAutoE2EE";
import { getSocket } from "../../socket";

const AutoEncryptionToggle = () => {
  const { isReady, status } = useAutoE2EE();
  const [autoEncrypt, setAutoEncrypt] = useState(() => {
    const saved = localStorage.getItem("auto_encryption_enabled");
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  console.log("🔍 [AutoEncryptionToggle] Component mounted:", {
    isReady,
    status,
    autoEncrypt,
    updating,
  });

  const handleToggle = async (event) => {
    const newValue = event.target.checked;
    console.log(
      `🔄 [AutoEncryptionToggle] Toggling auto-encryption: ${newValue}`
    );
    console.log(`📊 [AutoEncryptionToggle] Current state:`, {
      currentValue: autoEncrypt,
      newValue,
      isReady,
      hasSocket: !!getSocket(),
    });

    try {
      setUpdating(true);

      // Save preference
      localStorage.setItem("auto_encryption_enabled", JSON.stringify(newValue));
      setAutoEncrypt(newValue);
      console.log(
        `💾 [AutoEncryptionToggle] Saved to localStorage: ${newValue}`
      );

      // Update on server if needed
      const socket = getSocket();
      if (socket) {
        console.log(
          `📡 [AutoEncryptionToggle] Socket found, emitting toggle_e2ee...`
        );

        await new Promise((resolve, reject) => {
          socket.emit("toggle_e2ee", { enabled: newValue }, (response) => {
            console.log("✅ [AutoEncryptionToggle] Server response:", {
              response,
              type: typeof response,
              isString: typeof response === "string",
              isObject: typeof response === "object",
              hasSuccess: response?.success,
              hasMessage: response?.message,
            });

            // 🆕 FIX: Kiểm tra response đúng cách
            if (response) {
              // Case 1: Response là string success
              if (
                typeof response === "string" &&
                response.includes("success")
              ) {
                console.log(
                  "✅ [AutoEncryptionToggle] Accepting string success message"
                );
                resolve({ success: true, message: response });
              }
              // Case 2: Response là object với success: true
              else if (response.success === true) {
                console.log(
                  "✅ [AutoEncryptionToggle] Accepting success object"
                );
                resolve(response);
              }
              // Case 3: Response là object với message success
              else if (
                response.message &&
                response.message.includes("success")
              ) {
                console.log(
                  "✅ [AutoEncryptionToggle] Accepting object with success message"
                );
                resolve({ ...response, success: true });
              }
              // Case 4: Response là error
              else if (response.success === false) {
                console.log(
                  "❌ [AutoEncryptionToggle] Server returned error:",
                  response.error
                );
                reject(new Error(response.error || "Server error"));
                return;
              }
              // Case 5: Response không rõ ràng
              else {
                console.warn(
                  "⚠️ [AutoEncryptionToggle] Ambiguous response, rejecting"
                );
                reject(
                  new Error(
                    "Invalid server response: " + JSON.stringify(response)
                  )
                );
                return;
              }
            } else {
              console.warn("⚠️ [AutoEncryptionToggle] No response from server");
              reject(new Error("No response from server"));
              return;
            }

            console.log("✅ [AutoEncryptionToggle] Promise resolved");
          });
        });

        console.log(`✅ [AutoEncryptionToggle] Server update complete`);
      } else {
        console.warn(
          "⚠️ [AutoEncryptionToggle] No socket available, skipping server update"
        );
      }

      // Show feedback
      if (newValue) {
        console.log(
          "🔐 [AutoEncryptionToggle] Auto-encryption enabled successfully"
        );
      } else {
        console.log(
          "🔓 [AutoEncryptionToggle] Auto-encryption disabled successfully"
        );
        alert("Auto-encryption disabled. Messages will be sent as plaintext.");
      }
    } catch (error) {
      console.error(
        "❌ [AutoEncryptionToggle] Error toggling encryption:",
        error.message,
        error.stack
      );
      alert(`Error: ${error.message}`);
      // Revert on error
      console.log(
        `↩️ [AutoEncryptionToggle] Reverting to previous value: ${!newValue}`
      );
      setAutoEncrypt(!newValue);
      localStorage.setItem(
        "auto_encryption_enabled",
        JSON.stringify(!newValue)
      );
    } finally {
      setUpdating(false);
      console.log(`🏁 [AutoEncryptionToggle] Toggle operation completed`);
    }
  };

  const getStatusMessage = () => {
    console.log(`📊 [AutoEncryptionToggle] getStatusMessage called:`, {
      isReady,
      autoEncrypt,
    });

    if (!isReady) {
      return {
        severity: "warning",
        message: "Encryption system initializing...",
        icon: <LockIcon />,
      };
    }

    if (autoEncrypt) {
      return {
        severity: "success",
        message:
          "Auto-encryption is enabled. All messages will be encrypted automatically.",
        icon: <LockIcon />,
      };
    } else {
      return {
        severity: "info",
        message:
          "Auto-encryption is disabled. Messages will be sent as plaintext.",
        icon: <LockOpenIcon />,
      };
    }
  };

  const statusConfig = getStatusMessage();

  return (
    <Paper sx={{ p: 2 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={1}
      >
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Automatic End-to-End Encryption</Typography>
          <Tooltip title="Learn more about encryption">
            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <FormControlLabel
          control={
            <Switch
              checked={autoEncrypt}
              onChange={handleToggle}
              disabled={!isReady || updating}
              color="primary"
            />
          }
          label={
            <Typography variant="body2">
              {autoEncrypt ? "Enabled" : "Disabled"}
            </Typography>
          }
        />
      </Box>

      <Alert
        severity={statusConfig.severity}
        icon={statusConfig.icon}
        sx={{ mb: 2 }}
      >
        {statusConfig.message}
      </Alert>

      <Collapse in={expanded}>
        <Box sx={{ bgcolor: "grey.50", p: 2, borderRadius: 1, mt: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            How auto-encryption works:
          </Typography>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            <li>
              <Typography variant="body2">
                <strong>Automatic key exchange:</strong> Keys are exchanged
                automatically when you start chatting with a friend
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Background encryption:</strong> Messages are encrypted
                before sending and decrypted when received
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>No user action required:</strong> Everything happens
                automatically in the background
              </Typography>
            </li>
            <li>
              <Typography variant="body2">
                <strong>Fallback protection:</strong> If encryption fails,
                you'll be notified but can still send messages
              </Typography>
            </li>
          </ul>

          {!isReady && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Encryption system status: <strong>{status}</strong>
              </Typography>
            </Alert>
          )}

          <Box display="flex" justifyContent="flex-end" mt={2}>
            <Tooltip title="View encryption keys">
              <IconButton size="small">
                <InfoIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Collapse>

      {updating && (
        <Alert severity="info" sx={{ mt: 2 }}>
          Updating encryption settings...
        </Alert>
      )}
    </Paper>
  );
};

export default AutoEncryptionToggle;
