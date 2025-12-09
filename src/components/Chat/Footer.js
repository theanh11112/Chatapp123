// Footer.js - PHIÊN BẢN ĐÃ SỬA: CLICK GHIMM TRỰC TIẾP MỞ UPLOAD
import React, { useRef, useState, useCallback, useEffect } from "react";
import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Button,
  CircularProgress,
  Alert,
  Badge,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
} from "@mui/material";
import {
  File,
  LinkSimple,
  PaperPlaneTilt,
  Smiley,
  X,
  UploadSimple,
  FileText,
  MusicNote,
  VideoCamera,
  Image,
  Shield,
  Key,
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

// 🆕 IMPORT E2EE HOOKS AND SERVICES (THAY VÌ CONTEXT)
import EncryptionBadge from "../../e2ee/components/EncryptionBadge";
import useAutoE2EE from "../../e2ee/hooks/useAutoE2EE";
import useE2EEStatus from "../../e2ee/hooks/useE2EEStatus";
import useEncryptedMessaging from "../../e2ee/hooks/useEncryptedMessaging";

// 🆕 IMPORT SERVICES TRỰC TIẾP (CHO ADVANCED FUNCTIONS)
import keyExchangeService from "../../e2ee/services/keyExchangeService";
import { throttle } from "lodash";

const StyledInput = styled(TextField)(({ theme }) => ({
  "& .MuiInputBase-input": {
    paddingTop: "12px !important",
    paddingBottom: "12px !important",
  },
}));

// 🆕 File Upload Dialog Component
const FileUploadDialog = React.memo(
  ({ open, onClose, onUpload, isEncrypting, canEncrypt, isEncrypted }) => {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploadProgress, setUploadProgress] = useState({});
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const theme = useTheme();
    const dispatch = useDispatch();

    const handleFileSelect = (event) => {
      const files = Array.from(event.target.files);
      const validFiles = files.filter((file) => {
        // Kiểm tra kích thước file (tối đa 50MB)
        if (file.size > 50 * 1024 * 1024) {
          dispatch(
            showSnackbar({
              severity: "error",
              message: `File ${file.name} vượt quá 50MB giới hạn`,
            })
          );
          return false;
        }
        return true;
      });

      if (validFiles.length > 0) {
        setSelectedFiles((prev) => [...prev, ...validFiles]);
      }
    };

    const handleRemoveFile = (index) => {
      setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
      setUploadProgress((prev) => {
        const newProgress = { ...prev };
        delete newProgress[index];
        return newProgress;
      });
    };

    const simulateUpload = (file, index) => {
      return new Promise((resolve) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += 10;
          setUploadProgress((prev) => ({ ...prev, [index]: progress }));

          if (progress >= 100) {
            clearInterval(interval);
            setTimeout(() => resolve(file), 300);
          }
        }, 200);
      });
    };

    const handleUpload = async () => {
      if (selectedFiles.length === 0) return;

      setIsUploading(true);

      try {
        // Simulate upload progress for each file
        for (let i = 0; i < selectedFiles.length; i++) {
          await simulateUpload(selectedFiles[i], i);
        }

        // Call parent upload handler with all files
        await onUpload(selectedFiles);

        // Reset state
        setSelectedFiles([]);
        setUploadProgress({});
        onClose();

        dispatch(
          showSnackbar({
            severity: "success",
            message: `Đã upload ${selectedFiles.length} file thành công`,
          })
        );
      } catch (error) {
        console.error("Upload error:", error);
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Upload thất bại: " + error.message,
          })
        );
      } finally {
        setIsUploading(false);
      }
    };

    const getFileIcon = (fileType) => {
      if (fileType.startsWith("image/")) return <Image size={20} />;
      if (fileType.startsWith("video/")) return <VideoCamera size={20} />;
      if (fileType.startsWith("audio/")) return <MusicNote size={20} />;
      return <FileText size={20} />;
    };

    const formatFileSize = (bytes) => {
      if (bytes === 0) return "0 Bytes";
      const k = 1024;
      const sizes = ["Bytes", "KB", "MB", "GB"];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <span>Tải lên tệp tin</span>
            <IconButton onClick={onClose} size="small">
              <X size={20} />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Upload Area */}
            <Box
              sx={{
                border: "2px dashed",
                borderColor: theme.palette.divider,
                borderRadius: 2,
                p: 4,
                textAlign: "center",
                cursor: "pointer",
                "&:hover": {
                  borderColor: theme.palette.primary.main,
                  backgroundColor: theme.palette.action.hover,
                },
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadSimple size={48} color={theme.palette.primary.main} />
              <Box sx={{ mt: 2 }}>
                <Button variant="outlined">Chọn tệp tin</Button>
                <Box
                  sx={{
                    mt: 1,
                    color: theme.palette.text.secondary,
                    fontSize: "0.875rem",
                  }}
                >
                  Hoặc kéo thả tệp vào đây
                </Box>
              </Box>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                multiple
                style={{ display: "none" }}
              />
            </Box>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Box sx={{ mb: 1, fontWeight: 500 }}>
                  Tệp đã chọn ({selectedFiles.length})
                </Box>
                <Stack spacing={1}>
                  {selectedFiles.map((file, index) => (
                    <Box
                      key={index}
                      sx={{
                        border: "1px solid",
                        borderColor: theme.palette.divider,
                        borderRadius: 1,
                        p: 2,
                      }}
                    >
                      <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{ color: theme.palette.primary.main }}>
                          {getFileIcon(file.type)}
                        </Box>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ fontWeight: 500, fontSize: "0.875rem" }}>
                            {file.name}
                          </Box>
                          <Box
                            sx={{
                              fontSize: "0.75rem",
                              color: theme.palette.text.secondary,
                            }}
                          >
                            {formatFileSize(file.size)} • {file.type}
                          </Box>
                        </Box>
                        <IconButton
                          size="small"
                          onClick={() => handleRemoveFile(index)}
                          disabled={isUploading}
                        >
                          <X size={16} />
                        </IconButton>
                      </Stack>

                      {uploadProgress[index] !== undefined && (
                        <Box sx={{ mt: 1 }}>
                          <LinearProgress
                            variant="determinate"
                            value={uploadProgress[index]}
                            sx={{ height: 6, borderRadius: 3 }}
                          />
                          <Box
                            sx={{
                              fontSize: "0.75rem",
                              textAlign: "right",
                              mt: 0.5,
                            }}
                          >
                            {uploadProgress[index]}%
                          </Box>
                        </Box>
                      )}
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* Encryption Status */}
            {canEncrypt && isEncrypted && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Tệp tin sẽ được mã hóa end-to-end khi gửi
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isUploading}>
            Hủy
          </Button>
          <Button
            variant="contained"
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading || isEncrypting}
            startIcon={
              isUploading ? (
                <CircularProgress size={16} />
              ) : (
                <UploadSimple size={16} />
              )
            }
          >
            {isUploading
              ? "Đang tải lên..."
              : `Tải lên (${selectedFiles.length})`}
          </Button>
        </DialogActions>
      </Dialog>
    );
  }
);

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
    // 🆕 File Upload Props
    onOpenFileUpload,
  }) => {
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
                <Tooltip title="Gửi file">
                  <IconButton onClick={() => onOpenFileUpload("document")}>
                    <LinkSimple />
                  </IconButton>
                </Tooltip>
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

                <Tooltip title="Emoji">
                  <IconButton onClick={() => setOpenPicker(!openPicker)}>
                    <Smiley />
                  </IconButton>
                </Tooltip>
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

  // 🆕 THAY VÌ CONTEXT: SỬ DỤNG HOOKS
  const {
    isReady: autoE2EEReady,
    myFingerprint,
    isLoading: isAutoE2EELoading,
    initialize: initializeAutoE2EE,
    syncKeys,
    getStats: getAutoE2EEStats,
    getService: getAutoEncryptionService,
  } = useAutoE2EE();

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
  const [showEncryptionOptions, setShowEncryptionOptions] = useState(false);
  const inputRef = useRef(null);

  // 🆕 File Upload States
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [fileUploadType, setFileUploadType] = useState("document");

  // 🆕 Lấy user ID từ Keycloak
  const user_id =
    initialized && keycloak?.authenticated ? keycloak?.subject : null;

  const isGroupChat = chat_type === "group";
  const isDirectChat = chat_type === "individual";

  // 🆕 Xác định peerId cho direct chat
  const getPeerId = useCallback(() => {
    if (isDirectChat && current_conversation?.id === room_id) {
      const peerUserId = current_conversation?.user_id;
      if (peerUserId && peerUserId !== user_id) {
        return peerUserId;
      }
    }
    return null;
  }, [isDirectChat, current_conversation, room_id, user_id]);

  const peerId = getPeerId();

  // 🆕 Sử dụng E2EE status hook
  const {
    status: e2eeStatus,
    isEncrypted,
    canEncrypt,
    isEstablishing,
    isKeyExchangeNeeded,
    peerFingerprint,
    checkStatus: checkE2EEStatus,
    hasPeerKey,
    error: e2eeError,
    isReady: e2eeStatusReady,
  } = useE2EEStatus(peerId, {
    autoCheck: true,
    checkInterval: 30000,
  });

  // 🆕 Sử dụng encrypted messaging hook
  const {
    sendMessage: sendEncryptedMessage,
    encryptionStats,
    isProcessing: isMessageProcessing,
    hasQueue: hasMessageQueue,
    clearQueue: clearMessageQueue,
  } = useEncryptedMessaging(room_id, peerId, {
    autoEncrypt: true,
    maxQueueSize: 10,
    isGroup: isGroupChat,
  });

  // 🆕 Khởi tạo auto E2EE khi component mount
  useEffect(() => {
    if (initialized && keycloak.authenticated) {
      console.log("🔄 [Footer] Auto-initializing E2EE...");
      initializeAutoE2EE().catch((error) => {
        console.warn("⚠️ [Footer] Auto E2EE init warning:", error.message);
      });
    }
  }, [initialized, keycloak.authenticated, initializeAutoE2EE]);

  // 🆕 Kiểm tra encryption status khi chat thay đổi
  // 🆕 Sử dụng useCallback để memoize check function
  const throttledCheckE2EEStatus = useCallback(
    throttle(() => {
      console.log("🔐 [Footer] Throttled E2EE status check for peer:", peerId);
      checkE2EEStatus();
    }, 10000), // Chỉ check mỗi 10 giây
    [peerId, checkE2EEStatus]
  );

  // 🆕 Kiểm tra encryption status khi chat thay đổi
  useEffect(() => {
    if (peerId && isDirectChat && autoE2EEReady) {
      console.log("🔐 [Footer] Initial E2EE status check for peer:", peerId);

      // Check ngay lập tức
      checkE2EEStatus();

      // Setup interval check (mỗi 30 giây)
      const intervalId = setInterval(() => {
        console.log("🔐 [Footer] Periodic E2EE status check");
        throttledCheckE2EEStatus();
      }, 30000);

      return () => {
        console.log("🔐 [Footer] Cleaning up E2EE status interval");
        clearInterval(intervalId);
      };
    }
  }, [peerId, isDirectChat, autoE2EEReady]);

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

  // 🆕 Setup reply listener
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

  // 🆕 Handle open file upload dialog
  const handleOpenFileUpload = (type = "document") => {
    setFileUploadType(type);
    setShowFileUpload(true);
  };

  // 🆕 Handle file upload
  const handleFileUpload = useCallback(
    async (files) => {
      const currentChat = getCurrentChat();

      if (!currentChat?.id || !user_id) {
        console.error("❌ No chat selected or user not authenticated");
        dispatch(
          showSnackbar({
            severity: "error",
            message: "Vui lòng chọn cuộc trò chuyện để gửi file",
          })
        );
        return;
      }

      setIsEncrypting(true);

      try {
        // Process each file
        for (const file of files) {
          const msgId = uuidv4();
          const timestamp = new Date().toISOString();

          // 🆕 Create file message object
          const fileMessage = {
            _id: msgId,
            id: msgId,
            type: "msg",
            subtype: "file",
            message: `📎 ${file.name}`,
            content: `Đã gửi một tệp tin: ${file.name}`,
            from: user_id,
            to: isGroupChat ? null : currentChat.user_id,
            createdAt: timestamp,
            updatedAt: timestamp,
            attachments: [
              {
                id: uuidv4(),
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file), // Temporary URL for preview
                uploaded: true,
                isEncrypted: canEncrypt && isEncrypted,
                fileObject: file, // Keep file object for actual upload
              },
            ],
            isOptimistic: true,
            tempId: msgId,
            isEncrypted: canEncrypt && isEncrypted,
            outgoing: true,
            sender: {
              keycloakId: user_id,
              username: keycloak?.tokenParsed?.preferred_username || "You",
            },
          };

          // Add to Redux
          if (isGroupChat) {
            dispatch(
              addGroupMessage({
                message: fileMessage,
                room_id: currentChat.id,
                isOptimistic: true,
                tempId: msgId,
              })
            );
          } else {
            dispatch(
              addDirectMessage({
                message: fileMessage,
                conversation_id: currentChat.id,
                currentUserId: user_id,
                isGroup: false,
                isOptimistic: true,
                tempId: msgId,
              })
            );
          }

          // 🆕 TODO: Handle actual file upload to server here
          console.log("Uploading file:", {
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            chatId: currentChat.id,
            isEncrypted: canEncrypt && isEncrypted,
          });

          // Simulate server upload
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Update message status after upload
          if (isGroupChat) {
            dispatch(
              updateDirectMessage({
                messageId: msgId,
                updates: {
                  isOptimistic: false,
                  status: "sent",
                  attachments: [
                    {
                      ...fileMessage.attachments[0],
                      url: `https://your-server.com/uploads/${msgId}/${file.name}`,
                    },
                  ],
                },
              })
            );
          }
        }

        dispatch(
          showSnackbar({
            severity: "success",
            message: `Đã gửi ${files.length} file thành công`,
          })
        );
      } catch (error) {
        console.error("❌ File upload error:", error);
        dispatch(
          showSnackbar({
            severity: "error",
            message: `Upload thất bại: ${error.message}`,
          })
        );
      } finally {
        setIsEncrypting(false);
      }
    },
    [
      getCurrentChat,
      user_id,
      isGroupChat,
      dispatch,
      canEncrypt,
      isEncrypted,
      keycloak,
    ]
  );

  // 🆕 Handle initiate key exchange với service trực tiếp
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

      // 🆕 Sử dụng service trực tiếp thay vì context
      const result = await keyExchangeService.initiateExchange(peerId);

      if (result.success) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Key exchange initiated successfully",
          })
        );

        // Kiểm tra lại status sau khi exchange
        setTimeout(() => {
          checkE2EEStatus();
        }, 2000);
      } else {
        dispatch(
          showSnackbar({
            severity: "error",
            message: result.error || "Failed to initiate key exchange",
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
  }, [peerId, dispatch, checkE2EEStatus]);

  // 🆕 Enhanced handleSendMessage sử dụng hook (giữ nguyên logic hiện có)
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
      autoE2EEReady,
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
    const isOutgoing = true;

    // 🆕 QUYẾT ĐỊNH CÓ GỬI ENCRYPTED MESSAGE HAY KHÔNG
    const shouldSendEncrypted =
      isDirectChat &&
      peerId &&
      peerId !== user_id &&
      canEncrypt &&
      hasPeerKey &&
      autoE2EEReady;

    try {
      setIsEncrypting(true);

      if (shouldSendEncrypted) {
        console.log("🔐 [Footer] Using encrypted messaging hook...");

        // 🆕 Sử dụng hook để gửi tin nhắn mã hóa
        const result = await sendEncryptedMessage(value.trim(), {
          onSuccess: (data) => {
            console.log("✅ [Footer] Encrypted message sent via hook:", data);
          },
          onError: (error) => {
            console.error("❌ [Footer] Hook send failed:", error);
          },
          replyTo: isReply ? replyTo : null,
          forcePlaintext: false,
          showNotifications: true,
        });

        if (result.success) {
          setReplyTo(null);
          setValue("");
        }
      } else {
        // GỬI NORMAL MESSAGE (plaintext hoặc group)
        console.log("📝 [Footer] Sending normal message...");

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
          console.log(
            `✅ [Footer] Group ${isReply ? "reply " : ""}message sent`
          );
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

        // Reset state
        setReplyTo(null);
        setValue("");
      }
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
    canEncrypt,
    hasPeerKey,
    autoE2EEReady,
    sendEncryptedMessage,
    current_conversation,
    room_id,
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

  const linkify = (text) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(
      urlRegex,
      (url) => `<a href="${url}" target="_blank">${url}</a>`
    );
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

  // 🆕 Render E2EE status indicator
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

    if (!autoE2EEReady) {
      return (
        <Alert severity="info" sx={{ mb: 1, py: 0 }}>
          <CircularProgress size={16} sx={{ mr: 1 }} />
          Initializing encryption system...
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
            onClick={checkE2EEStatus}
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

  // Debug log
  console.log("🔐 [Footer] State:", {
    peerId,
    user_id,
    isEncrypted,
    canEncrypt,
    hasPeerKey,
    e2eeStatus,
    isKeyExchangeNeeded,
    e2eeError,
    autoE2EEReady,
    currentChatName: currentChat?.name,
    isDirectChat,
  });

  return (
    <Box sx={{ position: "relative" }}>
      {/* 🆕 File Upload Dialog */}
      <FileUploadDialog
        open={showFileUpload}
        onClose={() => setShowFileUpload(false)}
        onUpload={handleFileUpload}
        isEncrypting={isEncrypting}
        canEncrypt={canEncrypt}
        isEncrypted={isEncrypted}
      />

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
              isEncrypting={isEncrypting || isMessageProcessing}
              encryptionStatus={e2eeStatus}
              peerName={currentChat?.name}
              onInitiateKeyExchange={handleInitiateKeyExchange}
              canEncrypt={canEncrypt}
              isKeyExchangeNeeded={isKeyExchangeNeeded}
              // 🆕 File Upload Props
              onOpenFileUpload={handleOpenFileUpload}
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
                      !currentChat ||
                      !user_id ||
                      !value.trim() ||
                      isEncrypting ||
                      isMessageProcessing
                    }
                  >
                    {isEncrypting || isMessageProcessing ? (
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
