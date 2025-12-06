// Footer.js - PHIÊN BẢN FIXED
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Box,
  Fab,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Badge,
} from "@mui/material";
import {
  Camera,
  File,
  Image,
  LinkSimple,
  PaperPlaneTilt,
  Smiley,
  Sticker,
  User,
  Lock,
  LockOpen,
  Key,
  Warning,
  CheckCircle,
  Shield,
} from "phosphor-react";
import { useTheme, styled } from "@mui/material/styles";
import useResponsive from "../../hooks/useResponsive";
import { useKeycloak } from "@react-keycloak/web";
import data from "@emoji-mart/data";
import Picker from "@emoji-mart/react";
import { getSocket } from "../../socket";
import { useSelector, useDispatch } from "react-redux";
import {
  addDirectMessage,
  addGroupMessage,
  updateDirectMessage,
} from "../../redux/slices/conversation";
import { v4 as uuidv4 } from "uuid";
import { ReplyPreview } from "./ReplyComponents";
import { showSnackbar } from "../../redux/slices/app";

// 🆕 IMPORT E2EE HOOKS AND COMPONENTS
import EncryptionBadge from "../../e2ee/components/EncryptionBadge";
import useE2EEStatus from "../../e2ee/hooks/useE2EEStatus";
import { useE2EE } from "../../contexts/E2EEContext";

const StyledInput = styled(TextField)(({ theme }) => ({
  "& .MuiInputBase-input": {
    paddingTop: "12px !important",
    paddingBottom: "12px !important",
  },
}));

const Actions = [
  { color: "#4da5fe", icon: <Image size={24} />, y: 102, title: "Photo/Video" },
  { color: "#1b8cfe", icon: <Sticker size={24} />, y: 172, title: "Stickers" },
  { color: "#0172e4", icon: <Camera size={24} />, y: 242, title: "Image" },
  { color: "#0159b2", icon: <File size={24} />, y: 312, title: "Document" },
  { color: "#013f7f", icon: <User size={24} />, y: 382, title: "Contact" },
];

// ----------------------------- CHAT INPUT COMPONENT -----------------------------
const ChatInput = React.memo(
  ({
    openPicker,
    setOpenPicker,
    setValue,
    value,
    inputRef,
    handleSendMessage,
    replyTo,
    onCancelReply,
    // 🆕 E2EE Props
    isEncrypted,
    isEncryptionReady,
    isEncrypting,
    encryptionStatus,
    peerName,
    onInitiateKeyExchange,
    canEncrypt,
    isKeyExchangeNeeded,
  }) => {
    const [openActions, setOpenActions] = useState(false);
    const theme = useTheme();

    return (
      <>
        {replyTo && <ReplyPreview replyTo={replyTo} onCancel={onCancelReply} />}

        <StyledInput
          inputRef={inputRef}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
          fullWidth
          placeholder={replyTo ? "Type your reply..." : "Write a message..."}
          variant="filled"
          InputProps={{
            disableUnderline: true,
            startAdornment: (
              <InputAdornment position="start">
                <Stack sx={{ width: "max-content" }}>
                  <Stack
                    sx={{
                      position: "relative",
                      display: openActions ? "inline-block" : "none",
                    }}
                  >
                    {Actions.map((el, idx) => (
                      <Tooltip placement="right" title={el.title} key={idx}>
                        <Fab
                          sx={{
                            position: "absolute",
                            top: -el.y,
                            backgroundColor: el.color,
                          }}
                          onClick={() => setOpenActions(false)}
                        >
                          {el.icon}
                        </Fab>
                      </Tooltip>
                    ))}
                  </Stack>
                  <IconButton onClick={() => setOpenActions(!openActions)}>
                    <LinkSimple />
                  </IconButton>
                </Stack>
              </InputAdornment>
            ),
            endAdornment: (
              <InputAdornment position="end">
                {/* 🆕 Encryption Status Badge */}
                {!isEncryptionReady && encryptionStatus !== "unknown" && (
                  <Tooltip title="Encryption not ready">
                    <Box sx={{ mr: 1 }}>
                      <EncryptionBadge status="unavailable" size="small" />
                    </Box>
                  </Tooltip>
                )}

                {isEncrypting && <CircularProgress size={20} sx={{ mr: 1 }} />}

                <IconButton onClick={() => setOpenPicker(!openPicker)}>
                  <Smiley />
                </IconButton>
              </InputAdornment>
            ),
          }}
          sx={{
            "& .MuiFilledInput-root": {
              backgroundColor:
                isEncrypted && isEncryptionReady
                  ? theme.palette.mode === "light"
                    ? "#e8f5e9"
                    : "rgba(76, 175, 80, 0.1)"
                  : theme.palette.mode === "light"
                  ? "#FFF"
                  : "rgba(255, 255, 255, 0.05)",
              border:
                isEncrypted && isEncryptionReady
                  ? `1px solid ${theme.palette.success.main}`
                  : "1px solid transparent",
            },
          }}
          disabled={isEncrypting}
        />
      </>
    );
  }
);

// ----------------------------- FOOTER MAIN COMPONENT -----------------------------
const Footer = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { keycloak, initialized } = useKeycloak();
  const { autoEncryption } = useE2EE();

  const { current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { current_room } = useSelector(
    (state) => state.conversation.group_chat
  );

  const { room_id, chat_type } = useSelector((state) => state.app);
  const { sideBar } = useSelector((state) => state.app);
  const isMobile = useResponsive("between", "md", "xs", "sm");

  const [openPicker, setOpenPicker] = useState(false);
  const [value, setValue] = useState("");
  const [replyTo, setReplyTo] = useState(null);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const inputRef = useRef(null);

  // 🆕 E2EE INTEGRATION HOOKS
  const user_id =
    initialized && keycloak?.authenticated ? keycloak?.subject : null;

  const isGroupChat = chat_type === "group";
  const isDirectChat = chat_type === "individual";

  // 🆕 FIXED: Xác định peerId cho direct chat
  const getPeerId = () => {
    console.log("🔍 [Footer] getPeerId called:", {
      isDirectChat,
      current_conversation_id: current_conversation?.id,
      room_id,
      conversation_user_id: current_conversation?.user_id,
      current_user_id: user_id,
    });

    if (isDirectChat && current_conversation?.id === room_id) {
      const peerUserId = current_conversation?.user_id;

      // 🚨 QUAN TRỌNG: peerId phải khác userId của mình
      if (peerUserId && peerUserId !== user_id) {
        console.log("✅ [Footer] Valid peerId found:", peerUserId);
        return peerUserId;
      } else {
        console.warn("⚠️ [Footer] Invalid peerId:", {
          peerUserId,
          user_id,
          areSame: peerUserId === user_id,
        });
        return null;
      }
    }

    console.log("❌ [Footer] No valid peerId found");
    return null;
  };

  const peerId = getPeerId();

  // 🆕 Sử dụng useE2EEStatus với peerId đúng
  const {
    status: e2eeStatus,
    isEncrypted,
    canEncrypt,
    initiateKeyExchange,
    isEstablishing,
    isKeyExchangeNeeded,
    peerFingerprint,
    checkEncryptionStatus,
    hasPeerKey,
    error: e2eeError,
    isReady: e2eeStatusReady,
  } = useE2EEStatus(peerId, room_id);

  // 🆕 Kiểm tra encryption status khi chat thay đổi
  useEffect(() => {
    console.log("🔄 [Footer] useEffect - Checking encryption status", {
      peerId,
      room_id,
      e2eeStatusReady,
      isDirectChat,
    });

    if (peerId && isDirectChat) {
      // Đợi một chút để autoEncryption sẵn sàng
      const timer = setTimeout(() => {
        console.log("🔐 [Footer] Checking encryption status for peer:", peerId);
        checkEncryptionStatus();
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [peerId, room_id, isDirectChat, checkEncryptionStatus]);

  // 🆕 Debug: Log tất cả thông tin khi có thay đổi
  useEffect(() => {
    console.log("📊 [Footer] State update:", {
      peerId,
      isDirectChat,
      isGroupChat,
      current_conversation: current_conversation?.name,
      user_id,
      room_id,
      e2eeStatus,
      isEncrypted,
      canEncrypt,
      hasPeerKey,
      autoEncryptionReady: autoEncryption?.isReady?.(),
      autoEncryptionHasPeerKey: autoEncryption?.hasPeerKey?.(peerId),
    });
  }, [peerId, e2eeStatus, isEncrypted, canEncrypt, hasPeerKey, autoEncryption]);

  const getCurrentChat = useCallback(() => {
    if (isGroupChat && current_room?.id === room_id) {
      return {
        type: "group",
        id: current_room.id,
        name: current_room.name,
        data: current_room,
      };
    } else if (isDirectChat && current_conversation?.id === room_id) {
      return {
        type: "direct",
        id: current_conversation.id,
        name: current_conversation.name,
        user_id: current_conversation.user_id,
        data: current_conversation,
      };
    }
    return null;
  }, [isGroupChat, isDirectChat, current_room, current_conversation, room_id]);

  // 🆕 Setup reply listener từ parent component
  useEffect(() => {
    const handleSetReply = (message) => {
      console.log("🔄 Setting reply to:", message);
      setReplyTo(message);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 100);
    };

    window.setMessageReply = handleSetReply;

    return () => {
      window.setMessageReply = null;
    };
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  // 🆕 Handle initiate key exchange
  const handleInitiateKeyExchange = useCallback(async () => {
    if (!peerId) {
      console.error("❌ [Footer] No peer ID available");
      dispatch(
        showSnackbar({
          severity: "error",
          message: "No peer available for key exchange",
        })
      );
      return;
    }

    try {
      setIsEncrypting(true);
      console.log("🔄 [Footer] Initiating key exchange with:", peerId);

      const success = await initiateKeyExchange();

      if (success) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Key exchange initiated successfully",
          })
        );

        // Kiểm tra lại status sau khi exchange
        setTimeout(() => {
          checkEncryptionStatus();
        }, 1500);
      } else {
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Failed to initiate key exchange",
          })
        );
      }
    } catch (error) {
      console.error("❌ [Footer] Error initiating key exchange:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Key exchange error: ${error.message}`,
        })
      );
    } finally {
      setIsEncrypting(false);
    }
  }, [peerId, initiateKeyExchange, dispatch, checkEncryptionStatus]);

  // 🆕 Enhanced handleSendMessage với E2EE - VERSION FIXED
  // 🆕 Enhanced handleSendMessage với E2EE - VERSION FIXED
  const handleSendMessage = useCallback(async () => {
    console.log("📤 [Footer] Attempting to send message...", {
      peerId,
      room_id,
      isDirectChat,
      isGroupChat,
      current_conversation_name: current_conversation?.name,
      user_id,
      e2eeStatus,
      isEncrypted,
      canEncrypt,
      hasPeerKey,
      autoEncryptionReady: autoEncryption?.isReady?.(),
      valueLength: value.length,
    });

    const currentChat = getCurrentChat();

    if (!value.trim()) {
      console.log("❌ Message is empty");
      return;
    }

    if (!currentChat?.id) {
      console.log("❌ No valid chat found");
      return;
    }

    if (!user_id) {
      console.log("❌ No user_id available");
      return;
    }

    const msgId = uuidv4();
    const timestamp = new Date().toISOString();
    const isReply = !!replyTo;

    // 🆕 XÁC ĐỊNH outgoing NGAY TỪ ĐẦU
    const isOutgoing = true; // Tin nhắn từ chính mình gửi đi

    // 🆕 QUYẾT ĐỊNH CÓ GỬI ENCRYPTED MESSAGE HAY KHÔNG
    const shouldSendEncrypted =
      isDirectChat && // Chỉ cho direct messages
      peerId && // Có peerId hợp lệ
      peerId !== user_id && // PeerId phải khác userId của mình
      canEncrypt && // Có thể mã hóa cho peer này
      hasPeerKey && // Có public key của peer
      autoEncryption?.isReady?.(); // Auto encryption ready

    console.log("🔐 [Footer] Encryption decision:", {
      shouldSendEncrypted,
      isDirectChat,
      peerId,
      peerIdValid: peerId && peerId !== user_id,
      canEncrypt,
      hasPeerKey,
      autoEncryptionReady: autoEncryption?.isReady?.(),
    });

    try {
      setIsEncrypting(true);

      if (shouldSendEncrypted) {
        console.log("🔐 [Footer] Sending encrypted message...");

        // THỬ MÃ HÓA TRƯỚC KHI GỬI
        let encryptionResult = null;
        let fallbackToPlaintext = false;

        try {
          console.log(`🔐 [Footer] Encrypting message for peer ${peerId}...`);
          encryptionResult = await autoEncryption.encryptMessage(
            value.trim(),
            peerId
          );

          if (!encryptionResult.success) {
            console.warn(
              `⚠️ [Footer] Encryption failed, falling back to plaintext:`,
              encryptionResult.error
            );
            fallbackToPlaintext = true;
          } else {
            console.log(`✅ [Footer] Message encrypted successfully:`, {
              ciphertextLength: encryptionResult.ciphertext?.length,
              keyId: encryptionResult.keyId,
              algorithm: encryptionResult.algorithm,
              peerFingerprint: encryptionResult.peerFingerprint,
            });
          }
        } catch (encryptError) {
          console.error(
            `❌ [Footer] Encryption error, falling back to plaintext:`,
            encryptError
          );
          fallbackToPlaintext = true;
        }

        if (fallbackToPlaintext || !encryptionResult) {
          console.log(`📝 [Footer] Falling back to plaintext message...`);
          sendNormalMessage();
          return;
        }

        // Tạo optimistic encrypted message - THÊM outgoing
        const optimisticEncryptedMessage = {
          _id: msgId,
          id: msgId,
          type: "msg",
          subtype: isReply ? "reply" : "text",
          message: "🔒 Encrypted message",
          content: "🔒 Encrypted message",
          from: user_id,
          to: peerId,
          createdAt: timestamp,
          updatedAt: timestamp,
          attachments: [],
          isOptimistic: true,
          tempId: msgId,
          isEncrypted: true,
          encryptionStatus: "encrypting",
          ciphertext: encryptionResult.ciphertext,
          iv: encryptionResult.iv,
          keyId: encryptionResult.keyId,
          algorithm: encryptionResult.algorithm,
          peerFingerprint: encryptionResult.peerFingerprint,
          encryptionData: {
            ciphertext: encryptionResult.ciphertext,
            iv: encryptionResult.iv,
            keyId: encryptionResult.keyId,
            algorithm: encryptionResult.algorithm,
          },
          // 🆕 THÊM outgoing property
          outgoing: isOutgoing,
          sender: {
            keycloakId: user_id,
            username: keycloak?.tokenParsed?.preferred_username || "You",
          },
          ...(isReply && {
            replyTo: {
              id: replyTo.id || replyTo._id,
              content: replyTo.content || replyTo.message,
              sender: replyTo.sender,
            },
          }),
        };

        // Thêm vào Redux
        dispatch(
          addDirectMessage({
            message: optimisticEncryptedMessage,
            conversation_id: currentChat.id,
            currentUserId: user_id,
            isGroup: false,
            isOptimistic: true,
            tempId: msgId,
          })
        );

        // Gửi thông qua socket với dữ liệu đã mã hóa
        const socket = getSocket();
        const socketEvent = isReply
          ? "send_encrypted_message_reply"
          : "send_encrypted_message";

        const socketData = {
          id: msgId,
          conversation_id: currentChat.id,
          from: user_id,
          to: peerId,
          ciphertext: encryptionResult.ciphertext,
          iv: encryptionResult.iv,
          keyId: encryptionResult.keyId,
          algorithm: encryptionResult.algorithm,
          peerFingerprint: encryptionResult.peerFingerprint,
          timestamp: timestamp,
          type: "text",
          isEncrypted: true,
          ...(isReply && {
            replyTo: replyTo.id || replyTo._id,
            replyContent: replyTo.content || replyTo.message,
            replySender: processReplySender(replyTo.sender),
          }),
        };

        console.log(`📤 [Footer] Sending encrypted message via socket:`, {
          roomId: currentChat.id,
          event: socketEvent,
          to: peerId,
          ciphertextLength: encryptionResult.ciphertext?.length,
          hasIV: !!encryptionResult.iv,
          keyId: encryptionResult.keyId,
        });

        socket.emit(socketEvent, socketData, (response) => {
          console.log("📥 [Footer] Socket response:", response);

          if (response?.status === "success") {
            // Update message in Redux với response từ server
            dispatch(
              updateDirectMessage({
                tempId: msgId,
                update: {
                  isOptimistic: false,
                  _id: response.data?._id || msgId,
                  encryptionStatus: "encrypted",
                  delivered: true,
                  // 🆕 GIỮ LẠI outgoing property
                  outgoing: isOutgoing,
                },
                conversation_id: currentChat.id,
              })
            );
          }
        });

        // Show success notification
        dispatch(
          showSnackbar({
            severity: "success",
            message: "🔒 Encrypted message sent",
            autoHideDuration: 2000,
          })
        );
      } else {
        // GỬI NORMAL MESSAGE (plaintext hoặc group)
        console.log("📝 [Footer] Sending normal message...");
        sendNormalMessage();
      }

      // Reset state
      setReplyTo(null);
      setValue("");
    } catch (error) {
      console.error("❌ [Footer] Send message error:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Failed to send message: ${error.message}`,
        })
      );
    } finally {
      setIsEncrypting(false);
    }

    // 🆕 Hàm helper để gửi tin nhắn bình thường - CẬP NHẬT
    function sendNormalMessage() {
      const optimisticMessage = {
        _id: msgId,
        id: msgId,
        type: "msg",
        subtype: isReply ? "reply" : "text",
        message: value,
        content: value,
        from: user_id,
        to: isGroupChat ? null : currentChat.user_id,
        createdAt: timestamp,
        updatedAt: timestamp,
        attachments: [],
        isOptimistic: true,
        tempId: msgId,
        isEncrypted: false,
        // 🆕 THÊM outgoing và sender properties
        outgoing: isOutgoing,
        sender: {
          keycloakId: user_id,
          username: keycloak?.tokenParsed?.preferred_username || "You",
        },
        ...(isReply && {
          replyTo: {
            id: replyTo.id || replyTo._id,
            content: replyTo.content || replyTo.message,
            sender: replyTo.sender,
          },
        }),
      };

      // Thêm vào Redux
      if (isGroupChat) {
        dispatch(
          addGroupMessage({
            message: optimisticMessage,
            room_id: currentChat.id,
            isOptimistic: true,
            tempId: msgId,
          })
        );
      } else {
        dispatch(
          addDirectMessage({
            message: optimisticMessage,
            conversation_id: currentChat.id,
            currentUserId: user_id,
            isGroup: false,
            isOptimistic: true,
            tempId: msgId,
          })
        );
      }

      // Gửi qua socket
      const socket = getSocket();
      if (isGroupChat) {
        const socketEvent = isReply ? "group_message_reply" : "group_message";
        const socketData = isReply
          ? {
              roomId: currentChat.id,
              message: value,
              sender: {
                keycloakId: user_id,
                username:
                  keycloak?.tokenParsed?.preferred_username || "Unknown",
              },
              type: "text",
              timestamp: timestamp,
              messageId: msgId,
              replyTo: replyTo.id || replyTo._id,
              replyContent: replyTo.content || replyTo.message,
              replySender: processReplySender(replyTo.sender),
            }
          : {
              roomId: currentChat.id,
              message: value,
              sender: {
                keycloakId: user_id,
                username:
                  keycloak?.tokenParsed?.preferred_username || "Unknown",
              },
              type: "text",
              timestamp: timestamp,
              messageId: msgId,
            };

        socket.emit(socketEvent, socketData);
        console.log(`✅ [Footer] Group ${isReply ? "reply " : ""}message sent`);
      } else {
        const socketEvent = isReply ? "text_message_reply" : "text_message";
        const socketData = isReply
          ? {
              id: msgId,
              message: linkify(value),
              from: user_id,
              to: currentChat.user_id,
              conversation_id: currentChat.id,
              type: "text",
              replyTo: replyTo.id || replyTo._id,
              replyContent: replyTo.content || replyTo.message,
              replySender: processReplySender(replyTo.sender),
            }
          : {
              id: msgId,
              message: linkify(value),
              from: user_id,
              to: currentChat.user_id,
              conversation_id: currentChat.id,
              type: "text",
            };

        socket.emit(socketEvent, socketData);
        console.log(
          `✅ [Footer] Direct ${isReply ? "reply " : ""}message sent`
        );
      }
    }
  }, [
    value,
    replyTo,
    getCurrentChat,
    dispatch,
    user_id,
    isGroupChat,
    isDirectChat,
    keycloak,
    peerId,
    autoEncryption,
    canEncrypt,
    hasPeerKey,
    current_conversation,
  ]);

  const handleEmojiClick = useCallback(
    (emoji) => {
      const input = inputRef.current;
      if (!input) return;

      const start = input.selectionStart;
      const end = input.selectionEnd;
      const newValue = value.slice(0, start) + emoji + value.slice(end);

      setValue(newValue);

      setTimeout(() => {
        input.selectionStart = input.selectionEnd = start + emoji.length;
      }, 1);
    },
    [value]
  );

  const formatMessageTime = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch (error) {
      console.error("❌ Error formatting time:", error);
      return new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  };

  const containsUrl = (text) => {
    return /(https?:\/\/[^\s]+)/g.test(text);
  };

  const linkify = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlRegex,
      (url) => `<a href="${url}" target="_blank">${url}</a>`
    );
  };

  const processReplySender = (sender) => {
    if (typeof sender === "string") {
      return {
        keycloakId: sender,
        username: "Unknown",
      };
    }
    if (sender && typeof sender === "object") {
      return {
        keycloakId: sender.keycloakId || sender.id || "unknown",
        username: sender.username || "Unknown",
        ...sender,
      };
    }
    return {
      keycloakId: "unknown",
      username: "Unknown",
    };
  };

  if (!getCurrentChat()) {
    return (
      <Box
        sx={{
          width: "100%",
          backgroundColor: theme.palette.background.paper,
          padding: 2,
          textAlign: "center",
          color: theme.palette.text.secondary,
        }}
      >
        Select a conversation to start messaging
      </Box>
    );
  }

  const currentChat = getCurrentChat();

  // 🆕 Render E2EE status indicator - UPDATED
  const renderE2EEStatus = () => {
    if (isGroupChat) {
      return (
        <Tooltip title="Group chats use server-side encryption">
          <Box sx={{ mb: 1 }}>
            <EncryptionBadge
              status="unavailable"
              peerName={currentChat.name}
              size="small"
            />
          </Box>
        </Tooltip>
      );
    }

    // For direct chats
    if (!peerId || peerId === user_id) {
      return (
        <Alert severity="info" sx={{ mb: 1, py: 0 }}>
          Select a conversation to enable encryption
        </Alert>
      );
    }

    if (isKeyExchangeNeeded) {
      return (
        <Alert
          severity="warning"
          sx={{ mb: 1, py: 0 }}
          action={
            <Button
              size="small"
              onClick={handleInitiateKeyExchange}
              disabled={isEncrypting}
              startIcon={<Key size={14} />}
            >
              {isEncrypting ? "Exchanging..." : "Exchange Keys"}
            </Button>
          }
        >
          Key exchange needed for end-to-end encryption
          {e2eeError && (
            <Box
              component="span"
              sx={{
                fontSize: "0.85em",
                display: "block",
                mt: 0.5,
                color: "warning.dark",
              }}
            >
              {e2eeError}
            </Box>
          )}
        </Alert>
      );
    }

    if (isEstablishing) {
      return (
        <Alert severity="info" sx={{ mb: 1, py: 0 }}>
          Establishing secure connection...
          <CircularProgress size={16} sx={{ ml: 1 }} />
        </Alert>
      );
    }

    if (canEncrypt && isEncrypted) {
      return (
        <Tooltip
          title={`End-to-end encrypted with ${currentChat.name} (${peerFingerprint})`}
        >
          <Box sx={{ mb: 1 }}>
            <EncryptionBadge
              status="encrypted"
              peerName={currentChat.name}
              fingerprint={peerFingerprint}
              size="small"
            />
          </Box>
        </Tooltip>
      );
    }

    if (canEncrypt && !isEncrypted) {
      return (
        <Alert severity="info" sx={{ mb: 1, py: 0 }}>
          Ready to encrypt messages with {currentChat.name}
          <Button
            size="small"
            sx={{ ml: 1 }}
            onClick={checkEncryptionStatus}
            startIcon={<Shield size={14} />}
          >
            Check Status
          </Button>
        </Alert>
      );
    }

    return (
      <Alert severity="info" sx={{ mb: 1, py: 0 }}>
        Encryption not available for this chat
        {e2eeError && (
          <Box
            component="span"
            sx={{ fontSize: "0.85em", display: "block", mt: 0.5 }}
          >
            Error: {e2eeError}
          </Box>
        )}
      </Alert>
    );
  };

  // 🆕 Debug log
  console.log("🔐 [Footer] E2EE Debug:", {
    peerId,
    user_id,
    areSame: peerId === user_id,
    isEncrypted,
    canEncrypt,
    hasPeerKey,
    e2eeStatus,
    isKeyExchangeNeeded,
    e2eeError,
    autoEncryptionReady: autoEncryption?.isReady?.(),
    currentChatName: currentChat?.name,
  });

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        p={isMobile ? 1 : 2}
        sx={{
          width: "100%",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F8FAFF"
              : theme.palette.background.paper,
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
          borderTop:
            canEncrypt && isEncrypted
              ? `2px solid ${theme.palette.success.main}`
              : "none",
        }}
      >
        {/* 🆕 E2EE Status Indicator */}
        {renderE2EEStatus()}

        <Stack direction="row" alignItems="center" spacing={isMobile ? 1 : 3}>
          <Stack sx={{ width: "100%" }}>
            {openPicker && (
              <Box
                sx={{
                  zIndex: 10,
                  position: "fixed",
                  bottom: 81,
                  right: isMobile ? 20 : sideBar.open ? 420 : 100,
                }}
              >
                <Picker
                  theme={theme.palette.mode}
                  data={data}
                  onEmojiSelect={(e) => handleEmojiClick(e.native)}
                />
              </Box>
            )}

            <ChatInput
              inputRef={inputRef}
              value={value}
              setValue={setValue}
              openPicker={openPicker}
              setOpenPicker={setOpenPicker}
              handleSendMessage={handleSendMessage}
              replyTo={replyTo}
              onCancelReply={handleCancelReply}
              // 🆕 E2EE Props
              isEncrypted={isEncrypted}
              isEncryptionReady={e2eeStatusReady}
              isEncrypting={isEncrypting}
              encryptionStatus={e2eeStatus}
              peerName={currentChat?.name}
              onInitiateKeyExchange={handleInitiateKeyExchange}
              canEncrypt={canEncrypt}
              isKeyExchangeNeeded={isKeyExchangeNeeded}
            />
          </Stack>

          <Box
            sx={{
              height: 48,
              width: 48,
              backgroundColor: theme.palette.primary.main,
              borderRadius: 1.5,
              opacity: canEncrypt && isEncrypted ? 1 : 0.8,
              position: "relative",
            }}
          >
            {canEncrypt && isEncrypted && (
              <Badge
                color="success"
                variant="dot"
                sx={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  zIndex: 1,
                }}
              />
            )}

            <Stack
              sx={{ height: "100%" }}
              alignItems="center"
              justifyContent="center"
            >
              <Tooltip
                title={
                  canEncrypt && isEncrypted
                    ? `Send encrypted message to ${currentChat.name}`
                    : "Send message"
                }
              >
                <span>
                  <IconButton
                    onClick={handleSendMessage}
                    disabled={
                      !currentChat || !user_id || !value.trim() || isEncrypting
                    }
                  >
                    {isEncrypting ? (
                      <CircularProgress size={24} color="inherit" />
                    ) : (
                      <PaperPlaneTilt color="#fff" />
                    )}
                  </IconButton>
                </span>
              </Tooltip>
            </Stack>
          </Box>
        </Stack>
      </Box>
    </Box>
  );
};

export default React.memo(Footer);
