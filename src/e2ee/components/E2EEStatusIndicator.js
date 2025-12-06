import React from "react";
import useAutoE2EE from "../hooks/useAutoE2EE";
import { ENCRYPTION_STATUS } from "../constants/e2eeConfig";
import {
  Tooltip,
  IconButton,
  CircularProgress,
  Box,
  Typography,
} from "@mui/material";
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  LockClock as LockClockIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Sync as SyncIcon,
} from "@mui/icons-material";

const E2EEStatusIndicator = ({ showLabel = false, size = "small" }) => {
  const { status, isReady, isInitializing, isError, myFingerprint } =
    useAutoE2EE();

  console.log("🔍 [E2EEStatusIndicator] Component render:", {
    status,
    isReady,
    isInitializing,
    isError,
    myFingerprint,
    showLabel,
    time: new Date().toLocaleTimeString(),
  });

  const getStatusConfig = () => {
    console.log(
      `🔄 [E2EEStatusIndicator] getStatusConfig called: status=${status}`
    );

    switch (status) {
      case ENCRYPTION_STATUS.READY:
        console.log("✅ [E2EEStatusIndicator] Status: READY");
        return {
          icon: <LockIcon color="success" />,
          color: "success.main",
          tooltip: "End-to-end encryption is active",
          label: "Encryption Active",
        };

      case ENCRYPTION_STATUS.INITIALIZING:
        console.log("🔄 [E2EEStatusIndicator] Status: INITIALIZING");
        return {
          icon: <CircularProgress size={20} />,
          color: "warning.main",
          tooltip: "Initializing encryption...",
          label: "Initializing...",
        };

      case ENCRYPTION_STATUS.EXCHANGING_KEYS:
        console.log("🔑 [E2EEStatusIndicator] Status: EXCHANGING_KEYS");
        return {
          icon: <SyncIcon color="warning" />,
          color: "warning.main",
          tooltip: "Exchanging encryption keys",
          label: "Exchanging Keys",
        };

      case ENCRYPTION_STATUS.ERROR:
        console.log("❌ [E2EEStatusIndicator] Status: ERROR");
        return {
          icon: <ErrorIcon color="error" />,
          color: "error.main",
          tooltip: "Encryption error",
          label: "Error",
        };

      case ENCRYPTION_STATUS.DISABLED:
      default:
        console.log("🔓 [E2EEStatusIndicator] Status: DISABLED");
        return {
          icon: <LockOpenIcon color="disabled" />,
          color: "text.disabled",
          tooltip: "Encryption disabled",
          label: "Disabled",
        };
    }
  };

  const statusConfig = getStatusConfig();

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2">{statusConfig.tooltip}</Typography>
          {myFingerprint && (
            <Typography variant="caption" sx={{ mt: 0.5, display: "block" }}>
              Your fingerprint: {myFingerprint}
            </Typography>
          )}
        </Box>
      }
      arrow
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          color: statusConfig.color,
        }}
        onClick={() =>
          console.log("🖱️ [E2EEStatusIndicator] Clicked:", statusConfig)
        }
      >
        <IconButton size={size} sx={{ color: "inherit" }}>
          {statusConfig.icon}
        </IconButton>

        {showLabel && (
          <Typography variant="caption" sx={{ color: "inherit" }}>
            {statusConfig.label}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
};

export default E2EEStatusIndicator;
