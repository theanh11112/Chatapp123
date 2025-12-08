// EncryptionBadge.js - COMPLETE OPTIMIZED VERSION
import React from "react";
import { Badge, Tooltip, Box, Typography } from "@mui/material";
import { Lock, LockOpen, Shield, ShieldWarning, XCircle } from "phosphor-react";
import { useTheme } from "@mui/material/styles";

const getBadgeConfig = (status) => {
  const configs = {
    encrypted: {
      icon: <LockOpen size={14} />,
      color: "success",
      tooltip: "End-to-end encrypted",
      text: "Encrypted",
    },
    decrypting: {
      icon: <Lock size={14} />,
      color: "info",
      tooltip: "Decrypting...",
      text: "Decrypting",
    },
    unavailable: {
      icon: <Shield size={14} />,
      color: "default",
      tooltip: "Encryption not available",
      text: "Unavailable",
    },
    needs_key: {
      icon: <ShieldWarning size={14} />,
      color: "warning",
      tooltip: "Waiting for encryption key",
      text: "Needs Key",
    },
    error: {
      icon: <XCircle size={14} />,
      color: "error",
      tooltip: "Encryption error",
      text: "Error",
    },
    unknown: {
      icon: <Shield size={14} />,
      color: "default",
      tooltip: "Encryption status unknown",
      text: "Unknown",
    },
  };

  return configs[status] || configs.unknown;
};

const EncryptionBadge = React.memo(
  ({
    status = "unknown",
    peerName = "",
    fingerprint = "",
    showTooltip = true,
    size = "medium",
    onClick,
  }) => {
    const theme = useTheme();
    const config = getBadgeConfig(status);

    const sizeConfig = {
      small: {
        iconSize: 12,
        padding: "2px 6px",
        fontSize: "0.65rem",
        gap: 2,
      },
      medium: {
        iconSize: 14,
        padding: "3px 8px",
        fontSize: "0.75rem",
        gap: 4,
      },
      large: {
        iconSize: 16,
        padding: "4px 10px",
        fontSize: "0.85rem",
        gap: 6,
      },
    };

    const currentSize = sizeConfig[size] || sizeConfig.medium;

    const badgeContent = (
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: currentSize.gap,
          padding: currentSize.padding,
          borderRadius: 1,
          backgroundColor:
            status === "encrypted"
              ? theme.palette.success.light
              : status === "error"
              ? theme.palette.error.light
              : status === "needs_key"
              ? theme.palette.warning.light
              : theme.palette.grey[200],
          color:
            status === "encrypted"
              ? theme.palette.success.dark
              : status === "error"
              ? theme.palette.error.dark
              : status === "needs_key"
              ? theme.palette.warning.dark
              : theme.palette.grey[700],
          border: `1px solid ${
            status === "encrypted"
              ? theme.palette.success.main
              : status === "error"
              ? theme.palette.error.main
              : status === "needs_key"
              ? theme.palette.warning.main
              : theme.palette.grey[300]
          }`,
          cursor: onClick ? "pointer" : "default",
          transition: "all 0.2s ease",
          "&:hover": onClick
            ? {
                opacity: 0.9,
                transform: "translateY(-1px)",
              }
            : {},
        }}
        onClick={onClick}
      >
        <Box sx={{ display: "flex", alignItems: "center" }}>
          {React.cloneElement(config.icon, { size: currentSize.iconSize })}
        </Box>
        <Typography
          variant="caption"
          sx={{
            fontSize: currentSize.fontSize,
            fontWeight: 500,
            lineHeight: 1,
          }}
        >
          {config.text}
        </Typography>
      </Box>
    );

    if (!showTooltip) {
      return badgeContent;
    }

    let tooltipTitle = config.tooltip;
    if (peerName && status === "encrypted") {
      tooltipTitle = `End-to-end encrypted with ${peerName}`;
      if (fingerprint) {
        tooltipTitle += ` (${fingerprint.substring(0, 8)})`;
      }
    } else if (peerName) {
      tooltipTitle += ` with ${peerName}`;
    }

    return (
      <Tooltip title={tooltipTitle} arrow placement="top">
        {badgeContent}
      </Tooltip>
    );
  }
);

// 🆕 Custom comparison function để tránh re-render không cần thiết
const arePropsEqual = (prevProps, nextProps) => {
  return (
    prevProps.status === nextProps.status &&
    prevProps.peerName === nextProps.peerName &&
    prevProps.fingerprint === nextProps.fingerprint &&
    prevProps.showTooltip === nextProps.showTooltip &&
    prevProps.size === nextProps.size &&
    prevProps.onClick === nextProps.onClick
  );
};

EncryptionBadge.displayName = "EncryptionBadge";

export default React.memo(EncryptionBadge, arePropsEqual);
