// src/sections/dashboard/Conversation/index.js
// HOÀN CHỈNH VỚI E2EE INTEGRATION
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
import { useE2EE } from "../../contexts/E2EEContext";
import e2eeService from "../../e2ee/utils/e2ee";
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

// 🆕 Component để hiển thị encrypted message content
const EncryptedContent = memo(({ el, isOwnMessage }) => {
  const theme = useTheme();
  const { decryptMessage, getFriendKey } = useE2EE();
  const [decryptedContent, setDecryptedContent] = useState(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const decryptMessageContent = async () => {
      if (!el.isEncrypted || !el.ciphertext || !el.iv) {
        console.log("🔍 [EncryptedContent] Not encrypted or missing data:", {
          isEncrypted: el.isEncrypted,
          hasCiphertext: !!el.ciphertext,
          hasIV: !!el.iv,
          ciphertextType: typeof el.ciphertext,
          ivType: typeof el.iv,
        });
        return;
      }

      // KIỂM TRA BASE64
      const isValidCiphertext = window.e2eeService?.isValidBase64?.(
        el.ciphertext
      );
      const isValidIV = window.e2eeService?.isValidBase64?.(el.iv);

      console.log("🔍 [EncryptedContent] Base64 Validation:", {
        ciphertextValid: isValidCiphertext,
        ivValid: isValidIV,
        ciphertextLength: el.ciphertext.length,
        ivLength: el.iv.length,
        ciphertextSample: el.ciphertext.substring(0, 30),
        ivSample: el.iv.substring(0, 20),
      });

      if (!isValidCiphertext || !isValidIV) {
        setError("Dữ liệu mã hóa không hợp lệ");
        setIsDecrypting(false);
        return;
      }
      // Chỉ giải mã nếu tin nhắn được mã hóa và có đủ thông tin
      if (!el.isEncrypted || !el.ciphertext || !el.iv) return;

      try {
        setIsDecrypting(true);
        setError(null);

        const senderId = el.sender?.keycloakId || el.from_user_id;

        console.log("🔐 Starting decryption...", {
          messageId: el.message_id,
          senderId,
          hasCiphertext: !!el.ciphertext,
          hasIV: !!el.iv,
          keyId: el.key_id,
          algorithm: el.algorithm,
        });

        // 1. Ưu tiên sử dụng autoEncryptionService
        if (window.autoEncryptionService) {
          console.log("🔄 Using window.autoEncryptionService...");

          const autoEncryption = window.autoEncryptionService;

          // Kiểm tra service đã sẵn sàng chưa
          if (autoEncryption.isReady && !autoEncryption.isReady()) {
            console.warn("⚠️ Auto encryption service not ready yet");
            setError("Decryption service initializing...");
            return;
          }

          try {
            const result = await autoEncryption.decryptMessage(
              el.ciphertext,
              el.iv,
              el.key_id || el.sender_fingerprint, // keyId
              senderId
            );

            console.log("📥 Decryption result:", {
              success: result.success,
              hasContent: !!result.content,
              error: result.error,
            });

            if (result.success && result.content) {
              setDecryptedContent(result.content);
              return;
            } else {
              console.warn("⚠️ Auto encryption service failed:", result.error);
              setError(result.error || "Decryption failed");
            }
          } catch (autoError) {
            console.error("❌ Auto encryption error:", autoError);
          }
        }

        // 2. Fallback: Sử dụng E2EE service từ context
        if (e2eeService && e2eeService.decryptMessage) {
          console.log("🔄 Using e2eeService fallback...");

          try {
            const result = await e2eeService.decryptMessage({
              ciphertext: el.ciphertext,
              iv: el.iv,
              keyId: el.key_id,
              senderId: senderId,
            });

            if (result.success) {
              setDecryptedContent(result.content);
              return;
            }
          } catch (e2eeError) {
            console.error("❌ E2EE service error:", e2eeError);
          }
        }

        // 3. Fallback: Giải mã thủ công
        console.log("🔄 Using manual decryption...");

        // Lấy private key của chính mình
        const ownPrivateKeyStr = localStorage.getItem("e2ee_private_key");
        if (!ownPrivateKeyStr || ownPrivateKeyStr === "{}") {
          throw new Error("Your private key not found");
        }

        const ownPrivateKeyJwk = JSON.parse(ownPrivateKeyStr);

        // Lấy public key của người gửi
        const friendKey = getFriendKey(senderId);
        if (!friendKey?.publicKey) {
          throw new Error(`No public key for sender: ${senderId}`);
        }

        const peerPublicKeyJwk = JSON.parse(friendKey.publicKey);

        // Sử dụng keyUtils
        const keyUtils = require("../utils/keyUtils").default;

        const sharedSecret = await keyUtils.deriveSharedSecret(
          ownPrivateKeyJwk,
          peerPublicKeyJwk
        );

        // Helper function để chuyển base64 sang ArrayBuffer
        const base64ToArrayBuffer = (base64) => {
          const binary = window.atob(base64);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
          }
          return bytes.buffer;
        };

        const decrypted = await window.crypto.subtle.decrypt(
          {
            name: "AES-GCM",
            iv: base64ToArrayBuffer(el.iv),
          },
          sharedSecret,
          base64ToArrayBuffer(el.ciphertext)
        );

        const decoded = new TextDecoder().decode(decrypted);
        setDecryptedContent(decoded);
      } catch (err) {
        console.error("❌ Error decrypting message:", err);
        setError(err.message || "Decryption failed");

        // Debug thêm
        console.debug("Message details:", {
          messageId: el.message_id,
          sender: el.sender,
          ciphertextLength: el.ciphertext?.length,
          ivLength: el.iv?.length,
          keyId: el.key_id,
          algorithm: el.algorithm,
        });
      } finally {
        setIsDecrypting(false);
      }
    };

    // Chỉ chạy giải mã một lần khi component mount
    decryptMessageContent();
  }, [
    el.isEncrypted,
    el.ciphertext,
    el.iv,
    el.key_id,
    el.algorithm,
    el.sender,
    el.message_id,
    el.from_user_id,
    el.sender_fingerprint,
    getFriendKey,
    e2eeService,
  ]);

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
          alignItems: "center",
          gap: 1,
          py: 0.5,
        }}
      >
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

  // Default encrypted placeholder
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        py: 0.5,
      }}
    >
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
  );
});

// =======================
//  MESSAGE OPTION MENU - HOÀN CHỈNH VỚI PIN/UNPIN VÀ E2EE
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

  // 🆕 CẬP NHẬT: Message options với pin/unpin dynamic và E2EE options
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
//  MESSAGE CONTAINER - HOÀN CHỈNH VỚI E2EE SUPPORT
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
              message: `Encrypted message\nKey ID: ${el.keyId || "Unknown"}`,
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
//  TEXT MESSAGE - HOÀN CHỈNH VỚI E2EE SUPPORT
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

    // 🆕 Get message content based on encryption status
    const getMessageContent = () => {
      if (isEncrypted) {
        return <EncryptedContent el={el} isOwnMessage={isOwnMessage} />;
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
//  MEDIA MESSAGE - HOÀN CHỈNH VỚI E2EE SUPPORT
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
//  DOCUMENT MESSAGE - HOÀN CHỈNH VỚI E2EE SUPPORT
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
//  LINK MESSAGE - HOÀN CHỈNH VỚI E2EE SUPPORT
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
//  REPLY MESSAGE - HOÀN CHỈNH VỚI E2EE SUPPORT
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
              <Typography
                variant="body2"
                color={isOwnMessage ? "#fff" : theme.palette.text.primary}
                sx={{ wordBreak: "break-word" }}
              >
                {el.content || el.message}
              </Typography>

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
              <EncryptedContent el={el} isOwnMessage={isOwnMessage} />
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
};
