// src/sections/dashboard/Conversation/index.js
// VERSION MỚI KHÔNG DÙNG E2EE CONTEXT
import React, { memo, useCallback, useRef, useState, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Stack,
  Box,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  Divider,
  Snackbar,
  Alert,
  Tooltip,
  Chip,
  CircularProgress,
  Button,
} from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import {
  DotsThreeVertical,
  DownloadSimple,
  Image,
  Lock,
  LockOpen,
  Key,
  WarningCircle,
  ArrowClockwise,
} from "phosphor-react";
import { Message_options } from "../../data";
import Embed from "react-embed";
import { ReplyInfo } from "../../components/Chat/ReplyComponents";
import {
  deleteMessageThunk,
  pinMessage,
  unpinMessage,
} from "../../redux/slices/conversation";
import { getSocket } from "../../socket";
import { showSnackbar } from "../../redux/slices/app";

// 🆕 IMPORT HOOKS THAY THẾ CONTEXT
import { useAutoE2EE } from "../../e2ee";
import { decryptFromPeer } from "../../e2ee/services/autoEncryptionService";

// 🆕 Custom hook để quản lý pin/unpin messages
const usePinMessage = () => {
  const dispatch = useDispatch();
  const { chat_type, room_id } = useSelector((state) => state.app);
  const { pinned_messages: directPinned = [] } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { pinned_messages: groupPinned = [] } = useSelector(
    (state) => state.conversation.group_chat
  );

  const pinnedMessages = chat_type === "group" ? groupPinned : directPinned;

  const pinMessage = useCallback(
    (messageId) => {
      const socket = getSocket();
      if (socket) {
        console.log("📌 Attempting to pin message:", {
          messageId,
          room_id,
          chat_type,
        });

        const socketEvent =
          chat_type === "group" ? "pin_group_message" : "pin_direct_message";

        const socketData =
          chat_type === "group"
            ? { messageId, roomId: room_id }
            : { messageId };

        socket.emit(socketEvent, socketData, (response) => {
          console.log("📌 Pin message response:", response);
          if (response.status === "success") {
            dispatch(
              showSnackbar({
                severity: "success",
                message: "Message pinned successfully",
              })
            );
          } else {
            dispatch(
              showSnackbar({
                severity: "error",
                message: response.message || "Failed to pin message",
              })
            );
          }
        });
      } else {
        console.error("❌ Socket not available");
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Socket connection not available",
          })
        );
      }
    },
    [chat_type, room_id, dispatch]
  );

  const unpinMessage = useCallback(
    (messageId) => {
      const socket = getSocket();
      if (socket) {
        console.log("📌 Attempting to unpin message:", {
          messageId,
          room_id,
          chat_type,
        });

        const socketEvent =
          chat_type === "group"
            ? "unpin_group_message"
            : "unpin_direct_message";

        const socketData =
          chat_type === "group"
            ? { messageId, roomId: room_id }
            : { messageId };

        socket.emit(socketEvent, socketData, (response) => {
          console.log("📌 Unpin message response:", response);
          if (response.status === "success") {
            dispatch(
              showSnackbar({
                severity: "success",
                message: "Message unpinned",
              })
            );
          } else {
            dispatch(
              showSnackbar({
                severity: "error",
                message: response.message || "Failed to unpin message",
              })
            );
          }
        });
      } else {
        console.error("❌ Socket not available");
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Socket connection not available",
          })
        );
      }
    },
    [chat_type, room_id, dispatch]
  );

  const isMessagePinned = useCallback(
    (messageId) => {
      return pinnedMessages.some((msg) => msg.id === messageId);
    },
    [pinnedMessages]
  );

  return {
    pinMessage,
    unpinMessage,
    isMessagePinned,
    pinnedMessages,
  };
};

// 🆕 Hook để quản lý snackbar
const useMessageSnackbar = () => {
  const [snackbar, setSnackbar] = React.useState({
    open: false,
    message: "",
    severity: "success",
  });

  const showSnackbar = useCallback((message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
  }, []);

  const hideSnackbar = useCallback(() => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  }, []);

  return { snackbar, showSnackbar, hideSnackbar };
};

// 🆕 Component để hiển thị encrypted message content (VERSION MỚI)
const EncryptedContent = memo(({ el, isOwnMessage, onDecryptSuccess }) => {
  const theme = useTheme();
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState(null);
  const [decryptAttempted, setDecryptAttempted] = useState(false);

  // 🆕 Sử dụng hook auto E2EE
  const { isReady: e2eeReady, decryptMessage: decryptWithHook } = useAutoE2EE();

  // Helper function để kiểm tra base64
  const isValidBase64 = (str) => {
    if (typeof str !== "string") return false;
    try {
      return btoa(atob(str)) === str;
    } catch (err) {
      return false;
    }
  };

  // Trong component EncryptedContent, sửa phần decrypt logic:
  const performDecryption = useCallback(async () => {
    if (
      !el.isEncrypted ||
      !el.encryptionData?.ciphertext ||
      !el.encryptionData?.iv
    ) {
      console.log("🔍 [EncryptedContent] Not encrypted or missing data:", {
        isEncrypted: el.isEncrypted,
        hasEncryptionData: !!el.encryptionData,
        ciphertext: !!el.encryptionData?.ciphertext,
        iv: !!el.encryptionData?.iv,
      });
      return;
    }

    // Kiểm tra sender
    const senderId = el.sender?.keycloakId || el.senderId || el.from_user_id;
    if (!senderId) {
      setError("Cannot identify sender");
      return;
    }

    try {
      setIsDecrypting(true);
      setError(null);
      setDecryptAttempted(true);

      console.log("🔐 Starting decryption...", {
        messageId: el.id || el._id,
        senderId,
        hasCiphertext: !!el.encryptionData.ciphertext,
        hasIV: !!el.encryptionData.iv,
        keyId: el.encryptionData.keyId,
        algorithm: el.encryptionData.algorithm,
      });

      // Kiểm tra base64
      const ciphertextValid = isValidBase64(el.encryptionData.ciphertext);
      const ivValid = isValidBase64(el.encryptionData.iv);

      if (!ciphertextValid || !ivValid) {
        throw new Error("Invalid encryption data format");
      }

      let result;

      // Phương thức 1: Sử dụng hook decryptMessage
      if (e2eeReady && decryptWithHook) {
        console.log("🔄 Using hook decryptMessage...");

        // Chuẩn bị dữ liệu theo định dạng hook mong đợi
        const encryptedData = {
          ciphertext: el.encryptionData.ciphertext,
          iv: el.encryptionData.iv,
          keyId: el.encryptionData.keyId,
          algorithm: el.encryptionData.algorithm,
          metadata: el.encryptionData.metadata,
        };

        result = await decryptWithHook(encryptedData, senderId);
      }
      // Phương thức 2: Sử dụng autoEncryptionService từ window
      else if (
        window.autoEncryptionService &&
        window.autoEncryptionService.isReady?.()
      ) {
        console.log("🔄 Using window.autoEncryptionService...");

        // Chuẩn bị dữ liệu
        const encryptedData = {
          ciphertext: el.encryptionData.ciphertext,
          iv: el.encryptionData.iv,
          keyId: el.encryptionData.keyId,
          algorithm: el.encryptionData.algorithm,
          metadata: el.encryptionData.metadata,
        };

        result = await window.autoEncryptionService.decryptMessage(
          encryptedData,
          senderId
        );
      }
      // Phương thức 3: Sử dụng decryptFromPeer từ service
      else {
        console.log("🔄 Using service decryptFromPeer...");

        // Chuẩn bị dữ liệu
        const encryptedData = {
          ciphertext: el.encryptionData.ciphertext,
          iv: el.encryptionData.iv,
          keyId: el.encryptionData.keyId,
          algorithm: el.encryptionData.algorithm,
          metadata: el.encryptionData.metadata,
        };

        result = await decryptFromPeer(encryptedData, senderId);
      }

      console.log("📥 Decryption result:", {
        success: result.success,
        hasContent: !!result.content,
        error: result.error,
      });

      if (result.success && result.content) {
        setDecryptedContent(result.content);
        onDecryptSuccess?.(result.content);
      } else {
        throw new Error(result.error || "Decryption failed");
      }
    } catch (err) {
      console.error("❌ Error decrypting message:", err);
      setError(err.message || "Decryption failed");
    } finally {
      setIsDecrypting(false);
    }
  }, [el, e2eeReady, decryptWithHook, onDecryptSuccess]);

  // Auto decrypt khi component mount (chỉ một lần)
  useEffect(() => {
    if (el.isEncrypted && !decryptAttempted && !isOwnMessage) {
      // Chờ một chút để đảm bảo mọi thứ đã sẵn sàng
      const timer = setTimeout(() => {
        performDecryption();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [el.isEncrypted, decryptAttempted, isOwnMessage, performDecryption]);

  const handleManualDecrypt = useCallback(() => {
    performDecryption();
  }, [performDecryption]);

  if (el.encryptionStatus === "encrypting") {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 0.5,
        }}
      >
        <CircularProgress size={12} />
        <Typography
          variant="caption"
          sx={{
            fontStyle: "italic",
            color: isOwnMessage
              ? "rgba(255,255,255,0.7)"
              : theme.palette.text.secondary,
          }}
        >
          Encrypting...
        </Typography>
      </Box>
    );
  }

  if (isDecrypting) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          py: 0.5,
        }}
      >
        <CircularProgress size={12} />
        <Typography
          variant="caption"
          sx={{
            fontStyle: "italic",
            color: isOwnMessage
              ? "rgba(255,255,255,0.7)"
              : theme.palette.text.secondary,
          }}
        >
          Decrypting...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1,
          py: 0.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <WarningCircle size={14} color={theme.palette.error.main} />
          <Typography
            variant="caption"
            sx={{
              color: theme.palette.error.main,
              fontStyle: "italic",
            }}
          >
            Decryption failed
          </Typography>
        </Box>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArrowClockwise size={12} />}
          onClick={handleManualDecrypt}
          sx={{
            fontSize: "0.7rem",
            py: 0.25,
            px: 1,
            alignSelf: "flex-start",
          }}
        >
          Retry Decryption
        </Button>
      </Box>
    );
  }

  if (decryptedContent) {
    return (
      <Typography
        variant="body2"
        sx={{
          wordBreak: "break-word",
          color: isOwnMessage ? "#fff" : theme.palette.text.primary,
        }}
      >
        {decryptedContent}
      </Typography>
    );
  }

  // Default encrypted placeholder với nút decrypt
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 1,
        py: 0.5,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Lock size={14} color={theme.palette.warning.main} />
        <Typography
          variant="body2"
          sx={{
            fontStyle: "italic",
            color: isOwnMessage
              ? "rgba(255,255,255,0.7)"
              : theme.palette.text.secondary,
          }}
        >
          🔒 Encrypted message
        </Typography>
      </Box>
      {!isOwnMessage && (
        <Button
          size="small"
          variant="outlined"
          startIcon={<LockOpen size={12} />}
          onClick={handleManualDecrypt}
          sx={{
            fontSize: "0.7rem",
            py: 0.25,
            px: 1,
            alignSelf: "flex-start",
          }}
        >
          Decrypt Message
        </Button>
      )}
    </Box>
  );
});

// =======================
//  MESSAGE OPTION MENU - VERSION MỚI KHÔNG CONTEXT
// =======================
const MessageOption = memo(({ onAction, messageId, isEncrypted = false }) => {
  const [anchorEl, setAnchorEl] = React.useState(null);
  const open = Boolean(anchorEl);
  const buttonRef = useRef(null);
  const { isMessagePinned } = usePinMessage();

  const isPinned = isMessagePinned(messageId);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    setAnchorEl(e.currentTarget);
  }, []);

  const handleClose = useCallback(() => {
    setAnchorEl(null);
    setTimeout(() => {
      if (buttonRef.current) {
        buttonRef.current.focus();
      }
    }, 100);
  }, []);

  const handleMenuItemClick = useCallback(
    (action) => {
      handleClose();
      if (action && onAction) {
        onAction(action);
      }
    },
    [handleClose, onAction]
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "Escape") {
        handleClose();
      }
    },
    [handleClose]
  );

  // 🆕 Message options với pin/unpin dynamic và E2EE options
  const getMessageOptions = useCallback(() => {
    const baseOptions = Message_options.filter(
      (opt) => opt.action !== "pin" && opt.action !== "unpin"
    );

    const options = [...baseOptions];

    if (isPinned) {
      options.push({
        id: "unpin",
        title: "Unpin Message",
        action: "unpin",
      });
    } else {
      options.push({
        id: "pin",
        title: "Pin Message",
        action: "pin",
      });
    }

    // 🆕 Thêm option để hiển thị encryption info
    if (isEncrypted) {
      options.push({
        id: "encryption_info",
        title: "Encryption Details",
        action: "encryption_info",
      });
    }

    return options;
  }, [isPinned, isEncrypted]);

  const messageOptions = getMessageOptions();

  return (
    <>
      <Tooltip title="Message options">
        <IconButton
          ref={buttonRef}
          size="small"
          onClick={handleClick}
          sx={{
            opacity: 0,
            transition: "opacity 0.2s ease",
            "&:hover, &:focus": {
              opacity: 1,
            },
          }}
        >
          <DotsThreeVertical size={20} />
        </IconButton>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        disableAutoFocusItem={true}
        disableEnforceFocus={false}
        disableRestoreFocus={false}
        keepMounted={false}
        transitionDuration={200}
        transformOrigin={{ horizontal: "right", vertical: "top" }}
        anchorOrigin={{ horizontal: "right", vertical: "bottom" }}
        sx={{
          "& .MuiPaper-root": {
            pointerEvents: "auto",
          },
        }}
      >
        <Stack spacing={1} px={1}>
          {messageOptions.map((el) => (
            <MenuItem
              key={el.id}
              onClick={() => handleMenuItemClick(el.action)}
              autoFocus={false}
              sx={
                el.action === "delete"
                  ? {
                      color: "error.main",
                      "&:hover": {
                        backgroundColor: "error.light",
                        color: "error.contrastText",
                      },
                    }
                  : el.action === "pin" || el.action === "unpin"
                  ? {
                      color: "warning.main",
                      "&:hover": {
                        backgroundColor: "warning.light",
                        color: "warning.contrastText",
                      },
                    }
                  : el.action === "encryption_info"
                  ? {
                      color: "info.main",
                      "&:hover": {
                        backgroundColor: "info.light",
                        color: "info.contrastText",
                      },
                    }
                  : {}
              }
            >
              {el.title}
            </MenuItem>
          ))}
        </Stack>
      </Menu>
    </>
  );
});

// =======================
//  MESSAGE CONTAINER - VERSION MỚI KHÔNG CONTEXT
// =======================
const MessageContainer = memo(
  ({
    children,
    el,
    menu,
    onMenuAction,
    onDelete,
    isGroup = false,
    roomId = null,
  }) => {
    const [showMenu, setShowMenu] = React.useState(false);
    const theme = useTheme();

    const handleMouseEnter = useCallback(() => {
      setShowMenu(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
      setShowMenu(false);
    }, []);

    const handleMenuAction = useCallback(
      (action) => {
        if (action === "delete" && onDelete) {
          onDelete(el, isGroup, roomId);
        } else if (action === "encryption_info") {
          // 🆕 Handle encryption info click
          if (window.showNotification) {
            window.showNotification({
              severity: "info",
              message: `Encrypted message\nKey ID: ${
                el.encryptionData?.keyId || "Unknown"
              }`,
            });
          }
        } else if (onMenuAction) {
          onMenuAction(action, el);
        }
      },
      [el, onMenuAction, onDelete, isGroup, roomId]
    );

    const handleContainerClick = useCallback((e) => {
      e.stopPropagation();
    }, []);

    // 🆕 Kiểm tra nếu message là encrypted
    const isEncrypted = el.isEncrypted || false;

    return (
      <Stack
        direction="row"
        justifyContent={el.incoming ? "start" : "end"}
        alignItems="flex-start"
        gap={1}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleContainerClick}
        sx={{
          "&:hover .message-actions": {
            opacity: 1,
          },
          position: "relative",
        }}
      >
        {/* 🆕 Encryption badge */}
        {isEncrypted && (
          <Tooltip
            title={
              el.encryptionStatus === "encrypting"
                ? "Encrypting..."
                : "End-to-End Encrypted"
            }
            arrow
          >
            <Box
              sx={{
                position: "absolute",
                top: -6,
                [el.incoming ? "left" : "right"]: 40,
                backgroundColor: theme.palette.warning.main,
                borderRadius: "50%",
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: theme.palette.warning.contrastText,
                fontSize: "0.7rem",
                fontWeight: "bold",
                border: `2px solid ${theme.palette.background.paper}`,
                zIndex: 1,
              }}
            >
              {el.encryptionStatus === "encrypting" ? "⏳" : "🔒"}
            </Box>
          </Tooltip>
        )}

        {menu && el.outgoing && (
          <Box
            className="message-actions"
            sx={{
              opacity: showMenu ? 1 : 0,
              transition: "opacity 0.2s ease",
              minWidth: "32px",
            }}
          >
            <MessageOption
              onAction={handleMenuAction}
              messageId={el.id || el._id}
              isEncrypted={isEncrypted}
            />
          </Box>
        )}

        {children}

        {menu && !el.outgoing && (
          <Box
            className="message-actions"
            sx={{
              opacity: showMenu ? 1 : 0,
              transition: "opacity 0.2s ease",
              minWidth: "32px",
            }}
          >
            <MessageOption
              onAction={handleMenuAction}
              messageId={el.id || el._id}
              isEncrypted={isEncrypted}
            />
          </Box>
        )}
      </Stack>
    );
  }
);

// =======================
//  TEXT MESSAGE - VERSION MỚI KHÔNG CONTEXT
// =======================
const TextMsg = memo(
  ({ el, menu, onDelete, isGroup = false, roomId = null }) => {
    const theme = useTheme();
    const { snackbar, showSnackbar, hideSnackbar } = useMessageSnackbar();
    const dispatch = useDispatch();
    const { pinMessage, unpinMessage } = usePinMessage();

    // 🆕 Kiểm tra xem message có encrypted không
    const isEncrypted = el.isEncrypted || false;
    const isOwnMessage = el.outgoing;

    const handleMenuAction = useCallback(
      (action, messageEl) => {
        const messageId = messageEl.id || messageEl._id;

        switch (action) {
          case "reply":
            if (window.setMessageReply) {
              window.setMessageReply({
                id: messageId,
                content: messageEl.message || messageEl.content,
                sender: messageEl.sender,
                type: messageEl.subtype || "text",
                isEncrypted: messageEl.isEncrypted,
              });
            }
            break;
          case "pin":
            pinMessage(messageId);
            break;
          case "unpin":
            unpinMessage(messageId);
            break;
          case "forward":
            showSnackbar("Message forwarded", "info");
            break;
          default:
            break;
        }
      },
      [pinMessage, unpinMessage, showSnackbar]
    );

    const handleDelete = useCallback(
      (messageEl, messageIsGroup = false, messageRoomId = null) => {
        console.log("🗑️ Deleting message:", {
          messageId: messageEl.id || messageEl._id,
          isGroup: messageIsGroup,
          roomId: messageRoomId,
          isEncrypted: messageEl.isEncrypted,
        });

        const socket = getSocket();
        dispatch(
          deleteMessageThunk(
            messageEl.id || messageEl._id,
            messageIsGroup,
            messageRoomId,
            socket
          )
        );

        showSnackbar("Message deleted", "success");
      },
      [dispatch, showSnackbar]
    );

    const handleReplyClick = useCallback(() => {
      if (el.replyTo && window.setMessageReply) {
        // Handle reply click
      }
    }, [el.replyTo]);

    // 🆕 Handle decryption success
    const handleDecryptSuccess = useCallback((decryptedContent) => {
      console.log("✅ Message decrypted successfully:", decryptedContent);
      // Có thể dispatch action để cập nhật message trong store nếu cần
    }, []);

    // 🆕 Get message content based on encryption status
    const getMessageContent = () => {
      if (isEncrypted) {
        return (
          <EncryptedContent
            el={el}
            isOwnMessage={isOwnMessage}
            onDecryptSuccess={handleDecryptSuccess}
          />
        );
      }

      // Regular message
      return (
        <Typography
          variant="body2"
          color={isOwnMessage ? "#fff" : theme.palette.text.primary}
          sx={{ wordBreak: "break-word" }}
        >
          {el.message || el.content}
        </Typography>
      );
    };

    return (
      <>
        <MessageContainer
          el={el}
          menu={menu}
          onMenuAction={handleMenuAction}
          onDelete={handleDelete}
          isGroup={isGroup}
          roomId={roomId}
        >
          <Box
            px={1.5}
            py={1.5}
            sx={{
              backgroundColor: isOwnMessage
                ? theme.palette.primary.main
                : alpha(theme.palette.background.default, 1),
              borderRadius: 1.5,
              width: "max-content",
              maxWidth: "400px",
              border: isEncrypted
                ? `1px solid ${
                    isOwnMessage
                      ? theme.palette.warning.light
                      : theme.palette.warning.main
                  }`
                : "none",
              position: "relative",
            }}
          >
            {el.replyTo && (
              <ReplyInfo replyTo={el.replyTo} onClick={handleReplyClick} />
            )}

            {/* Message content */}
            {getMessageContent()}

            {/* Message time */}
            <Typography
              variant="caption"
              sx={{
                display: "block",
                textAlign: isOwnMessage ? "right" : "left",
                color: isOwnMessage
                  ? "rgba(255,255,255,0.7)"
                  : theme.palette.text.secondary,
                marginTop: 0.5,
                fontSize: "0.7rem",
              }}
            >
              {el.time}
            </Typography>
          </Box>
        </MessageContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={hideSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
);

// =======================
//  MEDIA MESSAGE - VERSION MỚI KHÔNG CONTEXT
// =======================
const MediaMsg = memo(
  ({ el, menu, onDelete, isGroup = false, roomId = null }) => {
    const theme = useTheme();
    const { snackbar, showSnackbar, hideSnackbar } = useMessageSnackbar();
    const dispatch = useDispatch();
    const { pinMessage, unpinMessage } = usePinMessage();

    const isEncrypted = el.isEncrypted || false;
    const isOwnMessage = el.outgoing;

    const handleMenuAction = useCallback(
      (action, messageEl) => {
        const messageId = messageEl.id || messageEl._id;

        switch (action) {
          case "reply":
            if (window.setMessageReply) {
              window.setMessageReply({
                id: messageId,
                content: messageEl.message || "📷 Media",
                sender: messageEl.sender,
                type: "img",
                isEncrypted: messageEl.isEncrypted,
              });
            }
            break;
          case "pin":
            pinMessage(messageId);
            break;
          case "unpin":
            unpinMessage(messageId);
            break;
          case "download":
            showSnackbar("Media downloaded", "info");
            break;
          case "forward":
            showSnackbar("Media forwarded", "info");
            break;
          default:
            break;
        }
      },
      [pinMessage, unpinMessage, showSnackbar]
    );

    const handleDelete = useCallback(
      (messageEl, messageIsGroup = false, messageRoomId = null) => {
        console.log("🗑️ Deleting media message:", {
          messageId: messageEl.id || messageEl._id,
          isGroup: messageIsGroup,
          roomId: messageRoomId,
          isEncrypted: messageEl.isEncrypted,
        });

        const socket = getSocket();
        dispatch(
          deleteMessageThunk(
            messageEl.id || messageEl._id,
            messageIsGroup,
            messageRoomId,
            socket
          )
        );
        showSnackbar("Media message deleted", "success");
      },
      [dispatch, showSnackbar]
    );

    const handleReplyClick = useCallback(() => {
      if (el.replyTo && window.setMessageReply) {
        // Handle reply click
      }
    }, [el.replyTo]);

    return (
      <>
        <MessageContainer
          el={el}
          menu={menu}
          onMenuAction={handleMenuAction}
          onDelete={handleDelete}
          isGroup={isGroup}
          roomId={roomId}
        >
          <Box
            px={1.5}
            py={1.5}
            sx={{
              backgroundColor: isOwnMessage
                ? theme.palette.primary.main
                : alpha(theme.palette.background.default, 1),
              borderRadius: 1.5,
              width: "max-content",
              border: isEncrypted
                ? `1px solid ${
                    isOwnMessage
                      ? theme.palette.warning.light
                      : theme.palette.warning.main
                  }`
                : "none",
            }}
          >
            {el.replyTo && (
              <ReplyInfo replyTo={el.replyTo} onClick={handleReplyClick} />
            )}

            <Stack spacing={1}>
              {isEncrypted ? (
                <Box
                  sx={{
                    width: 300,
                    height: 210,
                    backgroundColor: isOwnMessage
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.05)",
                    borderRadius: "10px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    border: `2px dashed ${
                      isOwnMessage
                        ? theme.palette.warning.light
                        : theme.palette.warning.main
                    }`,
                  }}
                >
                  <Lock size={48} color={theme.palette.warning.main} />
                  <Typography
                    variant="caption"
                    sx={{
                      mt: 1,
                      color: isOwnMessage
                        ? "rgba(255,255,255,0.7)"
                        : theme.palette.text.secondary,
                      fontStyle: "italic",
                    }}
                  >
                    Encrypted image
                  </Typography>
                </Box>
              ) : (
                <img
                  src={el.img}
                  alt={el.message}
                  style={{
                    maxHeight: 210,
                    borderRadius: "10px",
                    maxWidth: "300px",
                  }}
                  loading="lazy"
                />
              )}

              {el.message && (
                <Typography
                  variant="body2"
                  color={isOwnMessage ? "#fff" : theme.palette.text.primary}
                >
                  {el.message}
                </Typography>
              )}

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: isOwnMessage ? "right" : "left",
                  color: isOwnMessage
                    ? "rgba(255,255,255,0.7)"
                    : theme.palette.text.secondary,
                  fontSize: "0.7rem",
                }}
              >
                {el.time}
              </Typography>
            </Stack>
          </Box>
        </MessageContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={hideSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
);

// =======================
//  DOCUMENT MESSAGE - VERSION MỚI KHÔNG CONTEXT
// =======================
const DocMsg = memo(
  ({ el, menu, onDelete, isGroup = false, roomId = null }) => {
    const theme = useTheme();
    const { snackbar, showSnackbar, hideSnackbar } = useMessageSnackbar();
    const dispatch = useDispatch();
    const { pinMessage, unpinMessage } = usePinMessage();

    const isEncrypted = el.isEncrypted || false;
    const isOwnMessage = el.outgoing;

    const handleMenuAction = useCallback(
      (action, messageEl) => {
        const messageId = messageEl.id || messageEl._id;

        switch (action) {
          case "reply":
            if (window.setMessageReply) {
              window.setMessageReply({
                id: messageId,
                content: messageEl.message || "📄 Document",
                sender: messageEl.sender,
                type: "doc",
                isEncrypted: messageEl.isEncrypted,
              });
            }
            break;
          case "pin":
            pinMessage(messageId);
            break;
          case "unpin":
            unpinMessage(messageId);
            break;
          case "download":
            showSnackbar("Document downloaded", "info");
            break;
          case "forward":
            showSnackbar("Document forwarded", "info");
            break;
          default:
            break;
        }
      },
      [pinMessage, unpinMessage, showSnackbar]
    );

    const handleDelete = useCallback(
      (messageEl, messageIsGroup = false, messageRoomId = null) => {
        console.log("🗑️ Deleting document message:", {
          messageId: messageEl.id || messageEl._id,
          isGroup: messageIsGroup,
          roomId: messageRoomId,
          isEncrypted: messageEl.isEncrypted,
        });

        const socket = getSocket();
        dispatch(
          deleteMessageThunk(
            messageEl.id || messageEl._id,
            messageIsGroup,
            messageRoomId,
            socket
          )
        );
        showSnackbar("Document message deleted", "success");
      },
      [dispatch, showSnackbar]
    );

    const handleReplyClick = useCallback(() => {
      if (el.replyTo && window.setMessageReply) {
        // Handle reply click
      }
    }, [el.replyTo]);

    return (
      <>
        <MessageContainer
          el={el}
          menu={menu}
          onMenuAction={handleMenuAction}
          onDelete={handleDelete}
          isGroup={isGroup}
          roomId={roomId}
        >
          <Box
            px={1.5}
            py={1.5}
            sx={{
              backgroundColor: isOwnMessage
                ? theme.palette.primary.main
                : alpha(theme.palette.background.default, 1),
              borderRadius: 1.5,
              width: "max-content",
              border: isEncrypted
                ? `1px solid ${
                    isOwnMessage
                      ? theme.palette.warning.light
                      : theme.palette.warning.main
                  }`
                : "none",
            }}
          >
            {el.replyTo && (
              <ReplyInfo replyTo={el.replyTo} onClick={handleReplyClick} />
            )}

            <Stack spacing={2}>
              <Stack
                p={2}
                direction="row"
                spacing={3}
                alignItems="center"
                sx={{
                  backgroundColor: isOwnMessage
                    ? "rgba(255,255,255,0.1)"
                    : theme.palette.background.paper,
                  borderRadius: 1,
                  border: isEncrypted
                    ? `1px dashed ${theme.palette.warning.main}`
                    : "none",
                }}
              >
                {isEncrypted ? (
                  <Lock size={48} color={theme.palette.warning.main} />
                ) : (
                  <Image size={48} />
                )}
                <Typography
                  variant="caption"
                  sx={{
                    color: isOwnMessage
                      ? "rgba(255,255,255,0.9)"
                      : theme.palette.text.primary,
                  }}
                >
                  {isEncrypted ? "Encrypted Document" : "Abstract.png"}
                </Typography>
                <IconButton>
                  <DownloadSimple />
                </IconButton>
              </Stack>

              {el.message && (
                <Typography
                  variant="body2"
                  color={isOwnMessage ? "#fff" : theme.palette.text.primary}
                >
                  {el.message}
                </Typography>
              )}

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: isOwnMessage ? "right" : "left",
                  color: isOwnMessage
                    ? "rgba(255,255,255,0.7)"
                    : theme.palette.text.secondary,
                  fontSize: "0.7rem",
                }}
              >
                {el.time}
              </Typography>
            </Stack>
          </Box>
        </MessageContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={hideSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
);

// =======================
//  LINK MESSAGE - VERSION MỚI KHÔNG CONTEXT
// =======================
const LinkMsg = memo(
  ({ el, menu, onDelete, isGroup = false, roomId = null }) => {
    const theme = useTheme();
    const { snackbar, showSnackbar, hideSnackbar } = useMessageSnackbar();
    const dispatch = useDispatch();
    const { pinMessage, unpinMessage } = usePinMessage();

    const isEncrypted = el.isEncrypted || false;
    const isOwnMessage = el.outgoing;

    const handleMenuAction = useCallback(
      (action, messageEl) => {
        const messageId = messageEl.id || messageEl._id;

        switch (action) {
          case "reply":
            if (window.setMessageReply) {
              window.setMessageReply({
                id: messageId,
                content: messageEl.message || "🔗 Link",
                sender: messageEl.sender,
                type: "Link",
                isEncrypted: messageEl.isEncrypted,
              });
            }
            break;
          case "pin":
            pinMessage(messageId);
            break;
          case "unpin":
            unpinMessage(messageId);
            break;
          case "copy":
            showSnackbar("Link copied to clipboard", "info");
            break;
          case "forward":
            showSnackbar("Link forwarded", "info");
            break;
          default:
            break;
        }
      },
      [pinMessage, unpinMessage, showSnackbar]
    );

    const handleDelete = useCallback(
      (messageEl, messageIsGroup = false, messageRoomId = null) => {
        console.log("🗑️ Deleting link message:", {
          messageId: messageEl.id || messageEl._id,
          isGroup: messageIsGroup,
          roomId: messageRoomId,
          isEncrypted: messageEl.isEncrypted,
        });

        const socket = getSocket();
        dispatch(
          deleteMessageThunk(
            messageEl.id || messageEl._id,
            messageIsGroup,
            messageRoomId,
            socket
          )
        );
        showSnackbar("Link message deleted", "success");
      },
      [dispatch, showSnackbar]
    );

    const handleReplyClick = useCallback(() => {
      if (el.replyTo && window.setMessageReply) {
        // Handle reply click
      }
    }, [el.replyTo]);

    return (
      <>
        <MessageContainer
          el={el}
          menu={menu}
          onMenuAction={handleMenuAction}
          onDelete={handleDelete}
          isGroup={isGroup}
          roomId={roomId}
        >
          <Box
            px={1.5}
            py={1.5}
            sx={{
              backgroundColor: isOwnMessage
                ? theme.palette.primary.main
                : alpha(theme.palette.background.default, 1),
              borderRadius: 1.5,
              width: "max-content",
              border: isEncrypted
                ? `1px solid ${
                    isOwnMessage
                      ? theme.palette.warning.light
                      : theme.palette.warning.main
                  }`
                : "none",
            }}
          >
            {el.replyTo && (
              <ReplyInfo replyTo={el.replyTo} onClick={handleReplyClick} />
            )}

            <Stack spacing={2}>
              {isEncrypted ? (
                <Stack
                  p={2}
                  direction="column"
                  alignItems="center"
                  justifyContent="center"
                  spacing={2}
                  sx={{
                    backgroundColor: isOwnMessage
                      ? "rgba(255,255,255,0.1)"
                      : theme.palette.background.paper,
                    borderRadius: 1,
                    border: `2px dashed ${theme.palette.warning.main}`,
                    minHeight: 100,
                  }}
                >
                  <Lock size={32} color={theme.palette.warning.main} />
                  <Typography
                    variant="caption"
                    sx={{
                      color: isOwnMessage
                        ? "rgba(255,255,255,0.7)"
                        : theme.palette.text.secondary,
                      fontStyle: "italic",
                    }}
                  >
                    Encrypted link content
                  </Typography>
                </Stack>
              ) : (
                <Stack
                  p={2}
                  direction="column"
                  spacing={3}
                  sx={{
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: 1,
                  }}
                >
                  <Embed
                    width="300px"
                    isDark={theme.palette.mode === "dark"}
                    url={`https://youtu.be/xoWxBR34qLE`}
                  />
                </Stack>
              )}

              {el.message && (
                <Typography
                  variant="body2"
                  color={isOwnMessage ? "#fff" : theme.palette.text.primary}
                >
                  <div dangerouslySetInnerHTML={{ __html: el.message }} />
                </Typography>
              )}

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: isOwnMessage ? "right" : "left",
                  color: isOwnMessage
                    ? "rgba(255,255,255,0.7)"
                    : theme.palette.text.secondary,
                  fontSize: "0.7rem",
                }}
              >
                {el.time}
              </Typography>
            </Stack>
          </Box>
        </MessageContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={hideSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
);

// =======================
//  REPLY MESSAGE - VERSION MỚI KHÔNG CONTEXT
// =======================
const ReplyMsg = memo(
  ({ el, menu, onDelete, isGroup = false, roomId = null }) => {
    const theme = useTheme();
    const { snackbar, showSnackbar, hideSnackbar } = useMessageSnackbar();
    const dispatch = useDispatch();
    const { pinMessage, unpinMessage } = usePinMessage();

    const isEncrypted = el.isEncrypted || false;
    const isOwnMessage = el.outgoing;

    const handleMenuAction = useCallback(
      (action, messageEl) => {
        const messageId = messageEl.id || messageEl._id;

        switch (action) {
          case "reply":
            if (window.setMessageReply) {
              window.setMessageReply({
                id: messageId,
                content: messageEl.content || messageEl.message,
                sender: messageEl.sender,
                type: "reply",
                isEncrypted: messageEl.isEncrypted,
              });
            }
            break;
          case "pin":
            pinMessage(messageId);
            break;
          case "unpin":
            unpinMessage(messageId);
            break;
          case "forward":
            showSnackbar("Message forwarded", "info");
            break;
          default:
            break;
        }
      },
      [pinMessage, unpinMessage, showSnackbar]
    );

    const handleDelete = useCallback(
      (messageEl, messageIsGroup = false, messageRoomId = null) => {
        console.log("🗑️ Deleting reply message:", {
          messageId: messageEl.id || messageEl._id,
          isGroup: messageIsGroup,
          roomId: messageRoomId,
          isEncrypted: messageEl.isEncrypted,
        });

        const socket = getSocket();
        dispatch(
          deleteMessageThunk(
            messageEl.id || messageEl._id,
            messageIsGroup,
            messageRoomId,
            socket
          )
        );
        showSnackbar("Reply message deleted", "success");
      },
      [dispatch, showSnackbar]
    );

    const handleReplyClick = useCallback(() => {
      if (el.replyTo && window.setMessageReply) {
        // Handle reply click
      }
    }, [el.replyTo]);

    // Hàm xử lý dữ liệu reply an toàn
    const getReplyData = () => {
      if (!el.replyTo) {
        return null;
      }

      const replyTo = el.replyTo;

      if (typeof replyTo === "string") {
        return null;
      }

      if (!replyTo.content && !replyTo.message) {
        return null;
      }

      return replyTo;
    };

    const replyData = getReplyData();

    const getOriginalSenderName = () => {
      if (!replyData?.sender) return "Unknown";

      if (typeof replyData.sender === "string") {
        return "User";
      }

      const senderName = replyData.sender.name || replyData.sender.username;

      if (replyData.sender.keycloakId && el.sender?.keycloakId) {
        if (replyData.sender.keycloakId === el.sender.keycloakId) {
          return "You";
        }
      }

      return senderName || "Unknown";
    };

    const getOriginalContent = () => {
      return replyData?.content || replyData?.message || "No content";
    };

    // 🆕 Check if reply is encrypted
    const isReplyEncrypted = replyData?.isEncrypted || false;

    // 🆕 Handle decryption success
    const handleDecryptSuccess = useCallback((decryptedContent) => {
      console.log("✅ Reply message decrypted successfully:", decryptedContent);
    }, []);

    if (!replyData) {
      return (
        <>
          <MessageContainer
            el={el}
            menu={menu}
            onMenuAction={handleMenuAction}
            onDelete={handleDelete}
            isGroup={isGroup}
            roomId={roomId}
          >
            <Box
              px={1.5}
              py={1.5}
              sx={{
                backgroundColor: isOwnMessage
                  ? theme.palette.primary.main
                  : alpha(theme.palette.background.paper, 1),
                borderRadius: 1.5,
                width: "max-content",
                maxWidth: "400px",
                border: isEncrypted
                  ? `1px solid ${
                      isOwnMessage
                        ? theme.palette.warning.light
                        : theme.palette.warning.main
                    }`
                  : "none",
              }}
            >
              {isEncrypted ? (
                <EncryptedContent
                  el={el}
                  isOwnMessage={isOwnMessage}
                  onDecryptSuccess={handleDecryptSuccess}
                />
              ) : (
                <Typography
                  variant="body2"
                  color={isOwnMessage ? "#fff" : theme.palette.text.primary}
                  sx={{ wordBreak: "break-word" }}
                >
                  {el.content || el.message}
                </Typography>
              )}

              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  textAlign: isOwnMessage ? "right" : "left",
                  color: isOwnMessage
                    ? "rgba(255,255,255,0.7)"
                    : theme.palette.text.secondary,
                  marginTop: 0.5,
                  fontSize: "0.7rem",
                }}
              >
                {el.time}
              </Typography>
            </Box>
          </MessageContainer>

          <Snackbar
            open={snackbar.open}
            autoHideDuration={3000}
            onClose={hideSnackbar}
            anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          >
            <Alert onClose={hideSnackbar} severity={snackbar.severity}>
              {snackbar.message}
            </Alert>
          </Snackbar>
        </>
      );
    }

    return (
      <>
        <MessageContainer
          el={el}
          menu={menu}
          onMenuAction={handleMenuAction}
          onDelete={handleDelete}
          isGroup={isGroup}
          roomId={roomId}
        >
          <Box
            px={1.5}
            py={1.5}
            sx={{
              backgroundColor: isOwnMessage
                ? theme.palette.primary.main
                : alpha(theme.palette.background.paper, 1),
              borderRadius: 1.5,
              width: "max-content",
              maxWidth: "400px",
              border: isEncrypted
                ? `1px solid ${
                    isOwnMessage
                      ? theme.palette.warning.light
                      : theme.palette.warning.main
                  }`
                : "none",
            }}
          >
            {/* REPLY PREVIEW SECTION */}
            <Box
              sx={{
                padding: 1,
                backgroundColor: isOwnMessage
                  ? "rgba(255,255,255,0.2)"
                  : "rgba(0,0,0,0.05)",
                borderRadius: 0.5,
                marginBottom: 1,
                borderLeft: `3px solid ${
                  isOwnMessage
                    ? "rgba(255,255,255,0.5)"
                    : theme.palette.primary.main
                }`,
                cursor: "pointer",
                "&:hover": {
                  backgroundColor: isOwnMessage
                    ? "rgba(255,255,255,0.3)"
                    : "rgba(0,0,0,0.08)",
                },
              }}
              onClick={handleReplyClick}
            >
              <Stack spacing={0.5}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 600,
                    color: isOwnMessage
                      ? "rgba(255,255,255,0.9)"
                      : theme.palette.primary.main,
                    fontSize: "0.7rem",
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  {isReplyEncrypted && (
                    <Lock size={10} color={theme.palette.warning.main} />
                  )}
                  {getOriginalSenderName()}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    color: isOwnMessage
                      ? "rgba(255,255,255,0.8)"
                      : theme.palette.text.secondary,
                    fontSize: "0.8rem",
                    lineHeight: 1.2,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                  }}
                >
                  {isReplyEncrypted
                    ? "🔒 Encrypted message"
                    : getOriginalContent()}
                </Typography>
              </Stack>
            </Box>

            {/* MAIN REPLY CONTENT */}
            {isEncrypted ? (
              <EncryptedContent
                el={el}
                isOwnMessage={isOwnMessage}
                onDecryptSuccess={handleDecryptSuccess}
              />
            ) : (
              <Typography
                variant="body2"
                sx={{
                  color: isOwnMessage ? "#fff" : theme.palette.text.primary,
                  wordBreak: "break-word",
                }}
              >
                {el.content || el.message}
              </Typography>
            )}

            {/* THỜI GIAN */}
            <Typography
              variant="caption"
              sx={{
                display: "block",
                textAlign: isOwnMessage ? "right" : "left",
                color: isOwnMessage
                  ? "rgba(255,255,255,0.7)"
                  : theme.palette.text.secondary,
                marginTop: 0.5,
                fontSize: "0.7rem",
              }}
            >
              {el.time}
            </Typography>
          </Box>
        </MessageContainer>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={3000}
          onClose={hideSnackbar}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        >
          <Alert onClose={hideSnackbar} severity={snackbar.severity}>
            {snackbar.message}
          </Alert>
        </Snackbar>
      </>
    );
  }
);

// =======================
//  TIMELINE
// =======================
const Timeline = memo(({ el }) => {
  const theme = useTheme();

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between">
      <Divider width="46%" />
      <Typography variant="caption" sx={{ color: theme.palette.text }}>
        {el.text}
      </Typography>
      <Divider width="46%" />
    </Stack>
  );
});

export {
  Timeline,
  MediaMsg,
  LinkMsg,
  DocMsg,
  TextMsg,
  ReplyMsg,
  MessageContainer,
  usePinMessage,
  useMessageSnackbar,
  EncryptedContent,
};
