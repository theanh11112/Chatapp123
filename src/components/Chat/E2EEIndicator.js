// src/components/Chat/E2EEIndicator.js
import React from "react";
import { Box, Tooltip, Typography, Badge } from "@mui/material";
import { Lock, LockOpen, Key, Shield } from "phosphor-react";
import { useE2EE } from "../../contexts/E2EEContext";
import { useSelector } from "react-redux";
import { useTheme } from "@mui/material/styles";

const E2EEIndicator = () => {
  const { e2eeEnabled, friendsE2EEStatus, getFriendKey } = useE2EE();
  const theme = useTheme();

  const { chat_type } = useSelector((state) => state.app);
  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );

  if (chat_type !== "individual" || !current_conversation?.user_id) {
    return null;
  }

  const friendId = current_conversation.user_id;
  const isFriendE2EEEnabled = friendsE2EEStatus[friendId] || false;
  const friendKey = getFriendKey ? getFriendKey(friendId) : null;

  const bothEnabled = e2eeEnabled && isFriendE2EEEnabled;
  const hasKey = bothEnabled && friendKey;

  const getIndicatorStatus = () => {
    if (!e2eeEnabled) return "disabled";
    if (!isFriendE2EEEnabled) return "friend_disabled";
    if (!friendKey) return "no_key";
    return "active";
  };

  const status = getIndicatorStatus();

  const getTooltipText = () => {
    switch (status) {
      case "disabled":
        return "E2EE is disabled for your account";
      case "friend_disabled":
        return "Your friend has E2EE disabled";
      case "no_key":
        return "Key exchange required for E2EE";
      case "active":
        return "End-to-End Encrypted: Messages are encrypted and can only be read by you and the recipient";
      default:
        return "E2EE status unknown";
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "active":
        return theme.palette.success.main;
      case "no_key":
        return theme.palette.warning.main;
      case "friend_disabled":
        return theme.palette.warning.main;
      case "disabled":
        return theme.palette.error.main;
      default:
        return theme.palette.text.secondary;
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case "active":
        return <Lock size={18} color={theme.palette.success.main} />;
      case "no_key":
        return <Key size={18} color={theme.palette.warning.main} />;
      case "friend_disabled":
      case "disabled":
        return <LockOpen size={18} color={theme.palette.warning.main} />;
      default:
        return <Shield size={18} />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case "active":
        return "E2EE";
      case "no_key":
        return "Need Key";
      case "friend_disabled":
        return "Friend Off";
      case "disabled":
        return "Disabled";
      default:
        return "Unknown";
    }
  };

  // Nếu có fingerprint của friend, hiển thị badge
  const showBadge = status === "active" && friendKey?.fingerprint;

  return (
    <Tooltip
      title={
        <Box>
          <Typography variant="body2">{getTooltipText()}</Typography>
          {friendKey?.fingerprint && (
            <Typography variant="caption" sx={{ display: "block", mt: 0.5 }}>
              Fingerprint: <strong>{friendKey.fingerprint}</strong>
            </Typography>
          )}
        </Box>
      }
      arrow
      placement="bottom"
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 1,
          py: 0.5,
          borderRadius: 1,
          backgroundColor: "background.paper",
          border: `1px solid ${getStatusColor()}`,
          position: "relative",
          minWidth: 60,
          justifyContent: "center",
        }}
      >
        {showBadge ? (
          <Badge
            color="success"
            variant="dot"
            anchorOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            sx={{
              "& .MuiBadge-badge": {
                right: -4,
                top: -4,
              },
            }}
          >
            {getStatusIcon()}
          </Badge>
        ) : (
          getStatusIcon()
        )}

        <Typography
          variant="caption"
          sx={{
            color: getStatusColor(),
            fontWeight: 500,
            fontSize: "0.7rem",
          }}
        >
          {getStatusText()}
        </Typography>
      </Box>
    </Tooltip>
  );
};

export default E2EEIndicator;
