import React from "react";
import { Tooltip, Box, Typography, Chip, IconButton } from "@mui/material";
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  VpnKey as KeyIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Sync as SyncIcon,
  Warning as WarningIcon,
} from "@mui/icons-material";

const EncryptionBadge = ({
  status = "unknown",
  peerName = "",
  showTooltip = true,
  size = "small",
  onClick,
}) => {
  console.log("🔍 [EncryptionBadge] Component render:", {
    status,
    peerName,
    showTooltip,
    size,
    hasOnClick: !!onClick,
  });

  const getBadgeConfig = () => {
    console.log(`🔄 [EncryptionBadge] getBadgeConfig called: status=${status}`);

    switch (status) {
      case "encrypted":
        console.log("✅ [EncryptionBadge] Status: encrypted");
        return {
          icon: <LockIcon fontSize={size} />,
          color: "success.main",
          bgcolor: "success.lighter",
          text: "End-to-end encrypted",
          tooltip: `Messages with ${
            peerName || "this chat"
          } are end-to-end encrypted`,
        };

      case "establishing":
        console.log("🔄 [EncryptionBadge] Status: establishing");
        return {
          icon: <SyncIcon fontSize={size} />,
          color: "warning.main",
          bgcolor: "warning.lighter",
          text: "Establishing encryption...",
          tooltip: "Setting up secure connection...",
        };

      case "unavailable":
        console.log("🔓 [EncryptionBadge] Status: unavailable");
        return {
          icon: <LockOpenIcon fontSize={size} />,
          color: "text.disabled",
          bgcolor: "grey.100",
          text: "Not encrypted",
          tooltip: "Encryption not available for this chat",
        };

      case "error":
        console.log("❌ [EncryptionBadge] Status: error");
        return {
          icon: <ErrorIcon fontSize={size} />,
          color: "error.main",
          bgcolor: "error.lighter",
          text: "Encryption error",
          tooltip: "There was an error with encryption",
        };

      case "key_exchange_pending":
        console.log("🔑 [EncryptionBadge] Status: key_exchange_pending");
        return {
          icon: <KeyIcon fontSize={size} />,
          color: "info.main",
          bgcolor: "info.lighter",
          text: "Exchanging keys...",
          tooltip: "Waiting for key exchange confirmation",
        };

      default:
        console.log("❓ [EncryptionBadge] Status: unknown");
        return {
          icon: <WarningIcon fontSize={size} />,
          color: "text.secondary",
          bgcolor: "grey.100",
          text: "Unknown",
          tooltip: "Encryption status unknown",
        };
    }
  };

  const config = getBadgeConfig();

  const badgeContent = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        px: 1,
        py: 0.5,
        borderRadius: 1,
        bgcolor: config.bgcolor,
        color: config.color,
        cursor: onClick ? "pointer" : "default",
        "&:hover": onClick ? { bgcolor: "action.hover" } : {},
      }}
      onClick={(e) => {
        console.log("🖱️ [EncryptionBadge] Clicked:", { status, peerName });
        if (onClick) {
          onClick(e);
        }
      }}
    >
      {config.icon}
      <Typography variant="caption" sx={{ fontWeight: 500 }}>
        {config.text}
      </Typography>
    </Box>
  );

  if (showTooltip) {
    return (
      <Tooltip title={config.tooltip} arrow placement="top">
        {badgeContent}
      </Tooltip>
    );
  }

  console.log("✅ [EncryptionBadge] Rendering badge");
  return badgeContent;
};

// Additional component for message-level badge
export const MessageEncryptionBadge = ({
  isEncrypted,
  isDecrypted,
  algorithm,
  onClick,
}) => {
  console.log("🔍 [MessageEncryptionBadge] Component render:", {
    isEncrypted,
    isDecrypted,
    algorithm,
    hasOnClick: !!onClick,
  });

  if (!isEncrypted) {
    console.log("🔓 [MessageEncryptionBadge] Not encrypted, returning null");
    return null;
  }

  const getMessageBadgeConfig = () => {
    console.log(`🔄 [MessageEncryptionBadge] getMessageBadgeConfig called:`, {
      isDecrypted,
      algorithm,
    });

    if (isDecrypted) {
      console.log("✅ [MessageEncryptionBadge] Message is decrypted");
      return {
        icon: <LockIcon fontSize="10px" />,
        text: "Decrypted",
        color: "success.main",
        tooltip: `This message was decrypted using ${algorithm || "AES-GCM"}`,
      };
    } else {
      console.log(
        "🔐 [MessageEncryptionBadge] Message is encrypted (not decrypted)"
      );
      return {
        icon: <LockIcon fontSize="10px" />,
        text: "Encrypted",
        color: "warning.main",
        tooltip: "Encrypted message - tap to decrypt",
      };
    }
  };

  const config = getMessageBadgeConfig();

  console.log("✅ [MessageEncryptionBadge] Rendering chip");
  return (
    <Tooltip title={config.tooltip} arrow>
      <Chip
        icon={config.icon}
        label={config.text}
        size="extra-small"
        sx={{
          height: "16px",
          fontSize: "0.6rem",
          color: config.color,
          borderColor: config.color,
          "& .MuiChip-icon": { fontSize: "10px" },
        }}
        variant="outlined"
        onClick={(e) => {
          console.log("🖱️ [MessageEncryptionBadge] Chip clicked:", {
            isEncrypted,
            isDecrypted,
          });
          if (onClick) {
            onClick(e);
          }
        }}
      />
    </Tooltip>
  );
};

export default EncryptionBadge;
