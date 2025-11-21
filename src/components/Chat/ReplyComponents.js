// components/Chat/ReplyComponents.js - CẬP NHẬT
import React from "react";
import { Box, Typography, IconButton } from "@mui/material";
import { Close, Reply } from "@mui/icons-material";

// 🆕 Component hiển thị reply preview (khi đang reply)
export const ReplyPreview = ({ replyTo, onCancel }) => {
  if (!replyTo) return null;

  // 🆕 XÁC ĐỊNH ICON THEO LOẠI MESSAGE
  const getReplyIcon = () => {
    switch (replyTo.type) {
      case "img":
        return "📷";
      case "doc":
        return "📄";
      case "Link":
        return "🔗";
      case "reply":
        return "↩️";
      default:
        return "💬";
    }
  };

  // 🆕 XÁC ĐỊNH PREVIEW TEXT THEO LOẠI MESSAGE
  const getPreviewText = () => {
    if (replyTo.content) return replyTo.content;
    if (replyTo.type === "img") return "Photo";
    if (replyTo.type === "doc") return "Document";
    if (replyTo.type === "Link") return "Link";
    return replyTo.message || "Message";
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        p: 1.5,
        backgroundColor: "background.paper",
        borderLeft: "4px solid",
        borderLeftColor: "primary.main",
        borderTop: "1px solid",
        borderTopColor: "divider",
        mx: 1,
        mb: 1,
        borderRadius: 1,
      }}
    >
      <Box sx={{ flex: 1, mr: 1 }}>
        <Typography variant="caption" color="primary.main" fontWeight="500">
          {getReplyIcon()} Replying to {replyTo.sender?.username || "Unknown"}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontSize: "0.8rem",
            mt: 0.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {getPreviewText()}
        </Typography>
      </Box>
      <IconButton size="small" onClick={onCancel}>
        <Close fontSize="small" />
      </IconButton>
    </Box>
  );
};

// 🆕 Component hiển thị reply info trong message
export const ReplyInfo = ({ replyTo, onClick }) => {
  if (!replyTo) return null;

  // 🆕 XÁC ĐỊNH ICON THEO LOẠI MESSAGE
  const getReplyIcon = () => {
    switch (replyTo.type) {
      case "img":
        return "📷";
      case "doc":
        return "📄";
      case "Link":
        return "🔗";
      case "reply":
        return "↩️";
      default:
        return "💬";
    }
  };

  // 🆕 XÁC ĐỊNH PREVIEW TEXT THEO LOẠI MESSAGE
  const getPreviewText = () => {
    if (replyTo.content) return replyTo.content;
    if (replyTo.type === "img") return "Photo";
    if (replyTo.type === "doc") return "Document";
    if (replyTo.type === "Link") return "Link";
    return replyTo.message || "Message";
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "flex-start",
        cursor: onClick ? "pointer" : "default",
        p: 1,
        mb: 1,
        backgroundColor: "action.hover",
        borderRadius: 1,
        borderLeft: "3px solid",
        borderLeftColor: "primary.main",
      }}
      onClick={onClick}
    >
      <Reply sx={{ fontSize: 16, mr: 1, color: "primary.main", mt: 0.25 }} />
      <Box sx={{ flex: 1 }}>
        <Typography variant="caption" color="primary.main" fontWeight="500">
          {getReplyIcon()} {replyTo.sender?.username || "Unknown"}
        </Typography>
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            fontSize: "0.8rem",
            mt: 0.25,
            overflow: "hidden",
            textOverflow: "ellipsis",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
          }}
        >
          {getPreviewText()}
        </Typography>
      </Box>
    </Box>
  );
};
