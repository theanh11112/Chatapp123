import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import {
  Stack,
  Box,
  Typography,
  CircularProgress,
  Avatar,
  IconButton,
  Chip,
  Button,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ReplayIcon from "@mui/icons-material/Replay";
import LockIcon from "@mui/icons-material/Lock";
import LockOpenIcon from "@mui/icons-material/LockOpen";
import { useTheme } from "@mui/material/styles";
import { SimpleBarStyle } from "../../components/Scrollbar";
import { ChatHeader, ChatFooter } from "../../components/Chat";
import useResponsive from "../../hooks/useResponsive";

import {
  DocMsg,
  LinkMsg,
  MediaMsg,
  ReplyMsg,
  TextMsg,
  Timeline,
} from "../../sections/dashboard/Conversation";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCurrentMessages,
  setCurrentConversation,
  setCurrentGroupRoom,
  fetchGroupMessages,
  pinMessage,
  unpinMessage,
  clearPinnedMessages,
  setPinnedMessages,
  fetchPinnedMessages as fetchPinnedMessagesAction,
  addDirectMessage,
  addGroupMessage,
  updateEncryptionStatus,
  updateDecryptedMessage,
  decryptMessageThunk,
  decryptPendingMessages as decryptPendingMessagesAction,
} from "../../redux/slices/conversation";
import PinnedMessages from "../../components/Chat/PinnedMessages";
import { useKeycloak } from "@react-keycloak/web";
import api from "../../utils/axios";

// ============================================
// IMPORT HOOK MỚI THAY THẾ CONTEXT
// ============================================
import { useE2EEDecryption } from "../../hooks/useE2EEDecryption";
import { useAutoE2EE, useE2EEStatus } from "../../e2ee";

// ============================================
// Utility Functions
// ============================================

// Hàm shallowEqual custom
const shallowEqual = (objA, objB) => {
  if (Object.is(objA, objB)) return true;

  if (
    typeof objA !== "object" ||
    objA === null ||
    typeof objB !== "object" ||
    objB === null
  ) {
    return false;
  }

  const keysA = Object.keys(objA);
  const keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) return false;

  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (
      !Object.prototype.hasOwnProperty.call(objB, key) ||
      !Object.is(objA[key], objB[key])
    ) {
      return false;
    }
  }

  return true;
};

// ============================================
// Custom Hooks
// ============================================

// Hook quản lý Conversation Messages - OPTIMIZED VERSION
const useConversationMessages = () => {
  const dispatch = useDispatch();
  const { keycloak } = useKeycloak();

  // OPTIMIZATION: Select chỉ những field cần thiết
  const conversations = useSelector(
    (state) => state.conversation.direct_chat.conversations
  );
  const current_conversation = useSelector(
    (state) => state.conversation.direct_chat.current_conversation
  );
  const current_messages = useSelector(
    (state) => state.conversation.direct_chat.current_messages
  );

  console.log("111111", current_messages);
  const rooms = useSelector((state) => state.conversation.group_chat.rooms);
  const current_room = useSelector(
    (state) => state.conversation.group_chat.current_room
  );
  const room_id = useSelector((state) => state.app.room_id);
  const chat_type = useSelector((state) => state.app.chat_type);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const currentUserId = useMemo(() => keycloak?.subject, [keycloak?.subject]);

  // Memoize để tránh re-render không cần thiết
  const memoizedConversations = useMemo(() => conversations, [conversations]);
  const memoizedRooms = useMemo(() => rooms, [rooms]);
  const memoizedCurrentConversation = useMemo(
    () => current_conversation,
    [current_conversation]
  );
  const memoizedCurrentRoom = useMemo(() => current_room, [current_room]);

  const getCurrentChatInfo = useCallback(() => {
    if (chat_type === "group") {
      return memoizedCurrentRoom;
    } else {
      return memoizedCurrentConversation;
    }
  }, [chat_type, memoizedCurrentRoom, memoizedCurrentConversation]);

  const getCurrentMessages = useCallback(() => {
    if (chat_type === "group") {
      return memoizedCurrentRoom?.messages || [];
    } else {
      return current_messages || [];
    }
  }, [chat_type, memoizedCurrentRoom, current_messages]);

  const currentChatInfo = useMemo(
    () => getCurrentChatInfo(),
    [getCurrentChatInfo]
  );

  const currentMessages = useMemo(
    () => getCurrentMessages(),
    [getCurrentMessages]
  );

  const displayMessages = useMemo(() => {
    return currentMessages || [];
  }, [currentMessages]);

  const setCurrentChatFromRoomId = useCallback(() => {
    if (!room_id) return null;

    if (chat_type === "group") {
      const currentRoom = memoizedRooms.find((el) => el?.id === room_id);
      if (!currentRoom) return null;

      const shouldSetNewRoom =
        !memoizedCurrentRoom ||
        memoizedCurrentRoom.id !== room_id ||
        (!memoizedCurrentRoom.messages?.length && currentRoom.messages?.length);

      if (shouldSetNewRoom) {
        dispatch(setCurrentGroupRoom(currentRoom));

        if (!currentRoom.messages || currentRoom.messages.length === 0) {
          setIsLoadingMessages(true);
          dispatch(fetchGroupMessages(room_id))
            .then(() => setIsLoadingMessages(false))
            .catch(() => setIsLoadingMessages(false));
        }
      }
      return currentRoom;
    } else {
      const currentConv = memoizedConversations.find(
        (el) => el?.id === room_id
      );
      if (!currentConv) return null;

      dispatch(setCurrentConversation(currentConv));

      if (
        currentConv.messages &&
        currentConv.messages.length > 0 &&
        currentUserId
      ) {
        dispatch(
          fetchCurrentMessages({
            messages: currentConv.messages,
            currentUserId,
          })
        );
      }

      return currentConv;
    }
  }, [
    room_id,
    chat_type,
    memoizedConversations,
    memoizedRooms,
    currentUserId,
    dispatch,
    memoizedCurrentRoom,
  ]);

  // Fetch group messages khi cần
  useEffect(() => {
    if (
      room_id &&
      chat_type === "group" &&
      memoizedCurrentRoom?.id === room_id
    ) {
      const shouldFetch =
        !memoizedCurrentRoom.messages ||
        memoizedCurrentRoom.messages.length === 0;

      if (shouldFetch) {
        setIsLoadingMessages(true);
        dispatch(fetchGroupMessages(room_id))
          .then(() => setIsLoadingMessages(false))
          .catch(() => setIsLoadingMessages(false));
      } else {
        setIsLoadingMessages(false);
      }
    }
  }, [room_id, chat_type, memoizedCurrentRoom, dispatch]);

  // Auto set current chat
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentChatFromRoomId();
    }, 100);

    return () => clearTimeout(timer);
  }, [room_id, chat_type, setCurrentChatFromRoomId]);

  return useMemo(
    () => ({
      isLoadingMessages,
      currentChatInfo,
      currentMessages,
      displayMessages,
      setCurrentChatFromRoomId,
    }),
    [
      isLoadingMessages,
      currentChatInfo,
      currentMessages,
      displayMessages,
      setCurrentChatFromRoomId,
    ]
  );
};

// Hook xử lý Socket Handlers
const useSocketHandlers = (room_id, chat_type, currentUserId) => {
  const dispatch = useDispatch();

  const handleReceiveEncryptedMessage = useCallback(
    async (data) => {
      const messageData = Array.isArray(data) ? data[0] : data;

      const isForCurrentConversation =
        messageData.conversationId === room_id ||
        messageData.roomId === room_id;

      if (!isForCurrentConversation) return;

      const timestamp = messageData.timestamp || new Date().toISOString();
      const messageObject = {
        id: messageData.messageId,
        _id: messageData.messageId,
        type: "encrypted",
        subtype: "text",
        message: "🔒 Encrypted message",
        content: "🔒 Encrypted message",
        sender: {
          keycloakId: messageData.senderId,
          username: messageData.senderName || "Unknown",
        },
        isEncrypted: true,
        encryptionData: {
          ciphertext: messageData.ciphertext,
          iv: messageData.iv,
          keyId: messageData.keyId,
          algorithm: messageData.algorithm || "AES-GCM-256",
          metadata: messageData.metadata,
        },
        createdAt: timestamp,
        time: new Date(timestamp).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        incoming: messageData.senderId !== currentUserId,
        outgoing: messageData.senderId === currentUserId,
        encryptionStatus: "encrypted",
        isDecrypted: false,
        decryptedContent: null,
      };

      if (chat_type === "group") {
        dispatch(
          addGroupMessage({
            message: messageObject,
            room_id: messageData.roomId || messageData.conversationId,
            isOptimistic: false,
          })
        );
      } else {
        dispatch(
          addDirectMessage({
            message: messageObject,
            conversation_id: messageData.conversationId,
            currentUserId: currentUserId,
            isGroup: false,
            isOptimistic: false,
          })
        );
      }
    },
    [room_id, chat_type, currentUserId, dispatch]
  );

  useEffect(() => {
    const socket = window.socket;
    if (!socket) return;

    const handleMessageDecrypted = (data) => {
      console.log("Message decrypted:", data);
    };

    const handleNewMessageNotification = (data) => {
      console.log("New message notification:", data);
    };

    socket.on("receive_encrypted_message", handleReceiveEncryptedMessage);
    socket.on("message_decrypted", handleMessageDecrypted);
    socket.on("new_message", handleNewMessageNotification);
    socket.on("message_received", handleNewMessageNotification);

    return () => {
      socket.off("receive_encrypted_message", handleReceiveEncryptedMessage);
      socket.off("message_decrypted", handleMessageDecrypted);
      socket.off("new_message", handleNewMessageNotification);
      socket.off("message_received", handleNewMessageNotification);
    };
  }, [handleReceiveEncryptedMessage]);

  return { handleReceiveEncryptedMessage };
};

// ============================================
// Components
// ============================================

// Component: MessageWrapper
const MessageWrapper = React.memo(
  ({
    message,
    showSenderName,
    isStartOfGroup,
    chat_type,
    onRetryDecrypt,
    children,
  }) => {
    const isOutgoing = message.outgoing;
    const isEncrypted = message.isEncrypted || false;
    const [displayContent, setDisplayContent] = useState(
      message.decryptedContent || message.message || ""
    );

    useEffect(() => {
      if (message.decryptedContent) {
        setDisplayContent(message.decryptedContent);
      } else if (message.message) {
        setDisplayContent(message.message);
      }
    }, [message.decryptedContent, message.message]);

    const renderMessageContent = () => {
      if (!isEncrypted) return children;

      if (message.isDecrypted && message.decryptedContent) {
        return (
          <Box>
            <Typography
              component="span"
              sx={{
                color: isOutgoing ? "white" : "text.primary",
                wordBreak: "break-word",
                whiteSpace: "pre-wrap",
              }}
            >
              {displayContent}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.5,
                color: isOutgoing ? "rgba(255,255,255,0.7)" : "text.secondary",
                fontSize: "0.65rem",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <LockOpenIcon fontSize="inherit" />
              End-to-end encrypted
            </Typography>
          </Box>
        );
      }

      if (message.encryptionStatus === "decrypting") {
        return (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <CircularProgress size={16} />
            <Typography
              component="span"
              sx={{
                color: isOutgoing ? "white" : "text.primary",
                fontStyle: "italic",
              }}
            >
              Decrypting...
            </Typography>
          </Box>
        );
      }

      if (message.encryptionStatus === "decryption_failed") {
        return (
          <Box>
            <Typography
              component="span"
              sx={{
                color: isOutgoing ? "white" : "text.primary",
                wordBreak: "break-word",
              }}
            >
              🔒 Encrypted message
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                mt: 0.5,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  color: "error.main",
                  fontSize: "0.65rem",
                }}
              >
                Decryption failed
              </Typography>
              {!isOutgoing && (
                <IconButton
                  size="small"
                  onClick={() => onRetryDecrypt?.(message)}
                  sx={{ p: 0.25 }}
                >
                  <ReplayIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
          </Box>
        );
      }

      if (message.encryptionStatus === "needs_key") {
        return (
          <Box>
            <Typography
              component="span"
              sx={{
                color: isOutgoing ? "white" : "text.primary",
                wordBreak: "break-word",
              }}
            >
              🔒 Encrypted message
            </Typography>
            <Typography
              variant="caption"
              sx={{
                display: "block",
                mt: 0.5,
                color: "warning.main",
                fontSize: "0.65rem",
              }}
            >
              Waiting for encryption key...
            </Typography>
          </Box>
        );
      }

      return (
        <Box>
          <Typography
            component="span"
            sx={{
              color: isOutgoing ? "white" : "text.primary",
              wordBreak: "break-word",
            }}
          >
            🔒 Encrypted message
          </Typography>
          <Typography
            variant="caption"
            sx={{
              display: "block",
              mt: 0.5,
              color: isOutgoing ? "rgba(255,255,255,0.7)" : "text.secondary",
              fontSize: "0.65rem",
              display: "flex",
              alignItems: "center",
              gap: 0.5,
            }}
          >
            <LockIcon fontSize="inherit" />
            {!isOutgoing && (
              <IconButton
                size="small"
                onClick={() => onRetryDecrypt?.(message)}
                sx={{ p: 0, minWidth: "auto" }}
              >
                <ReplayIcon fontSize="inherit" />
              </IconButton>
            )}
            Tap to decrypt
          </Typography>
        </Box>
      );
    };

    const handleDecryptClick = useCallback(() => {
      if (message.isEncrypted && !message.isDecrypted) {
        onRetryDecrypt?.(message);
      }
    }, [message, onRetryDecrypt]);

    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: isOutgoing ? "flex-end" : "flex-start",
          alignItems: "flex-end",
          mb: isStartOfGroup ? 1 : 0.25,
          px: 1,
          position: "relative",
          cursor:
            message.isEncrypted && !message.isDecrypted ? "pointer" : "default",
          "&:hover": {
            backgroundColor:
              message.isEncrypted && !message.isDecrypted
                ? "rgba(0,0,0,0.02)"
                : "transparent",
          },
        }}
        onClick={
          message.isEncrypted && !message.isDecrypted
            ? handleDecryptClick
            : undefined
        }
      >
        {!isOutgoing && chat_type === "group" && (
          <Box
            sx={{
              width: 28,
              height: 28,
              mr: 1,
              visibility: isStartOfGroup ? "visible" : "hidden",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              order: 1,
            }}
          >
            {isStartOfGroup && (
              <Avatar
                sx={{
                  width: 24,
                  height: 24,
                }}
                src={message.sender?.avatar}
                alt={message.sender?.username}
              />
            )}
          </Box>
        )}

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "70%",
            minWidth: isOutgoing ? "auto" : "50px",
            ...(isOutgoing && {
              alignItems: "flex-end",
            }),
            order: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: isOutgoing ? "flex-end" : "flex-start",
              width: "100%",
              position: "relative",
            }}
          >
            {isEncrypted ? renderMessageContent() : children}
          </Box>
        </Box>

        {isOutgoing && (
          <Box
            sx={{
              width: 28,
              ml: 1,
              flexShrink: 0,
              order: 3,
            }}
          />
        )}
      </Box>
    );
  }
);

// Component: SenderName
const SenderName = React.memo(({ message, chat_type }) => {
  if (!message.sender || chat_type === "individual") return null;

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        mb: 0.5,
        ml: message.outgoing ? "auto" : 0,
        mr: message.outgoing ? 0 : "auto",
        justifyContent: message.outgoing ? "flex-end" : "flex-start",
        maxWidth: "100%",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          color: "text.secondary",
          fontWeight: 500,
          fontSize: "0.75rem",
          textAlign: message.outgoing ? "right" : "left",
        }}
      >
        {message.outgoing ? "You" : message.sender.username}
      </Typography>
    </Box>
  );
});

// Component: DateDivider
const DateDivider = React.memo(({ date }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        my: 2,
        px: 2,
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 0.5,
          backgroundColor:
            theme.palette.mode === "light"
              ? "#E8EDF5"
              : "rgba(255,255,255,0.1)",
          borderRadius: 2,
          border: `1px solid ${
            theme.palette.mode === "light" ? "#D1D9E8" : "rgba(255,255,255,0.2)"
          }`,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            color: "text.secondary",
            fontWeight: 500,
            fontSize: "0.7rem",
          }}
        >
          {date}
        </Typography>
      </Box>
    </Box>
  );
});

// ============================================
// Main Conversation Component
// ============================================

const Conversation = ({ isMobile, menu }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { keycloak } = useKeycloak();
  const { room_id, chat_type } = useSelector((state) => state.app);
  const { conversations } = useSelector(
    (state) => state.conversation.direct_chat
  );

  const currentUserId = keycloak?.subject;

  // Custom hooks - ĐÃ SỬA: Sử dụng useMemo để tránh re-render
  const {
    isLoadingMessages,
    currentChatInfo,
    currentMessages,
    displayMessages,
    setCurrentChatFromRoomId,
  } = useConversationMessages();

  // SỬ DỤNG HOOK MỚI THAY VÌ CONTEXT
  const {
    isReady: e2eeReady,
    status: e2eeStatus,
    myFingerprint,
    error: e2eeError,
    encryptMessage,
    decryptMessage,
    canEncryptTo,
    getService: getE2EEService, // Lấy service từ hook
  } = useAutoE2EE();

  // Lấy E2EE status cho peer hiện tại - FIX: Thêm memoization
  const peerId = useMemo(
    () => (chat_type === "individual" ? currentChatInfo?.user_id : null),
    [chat_type, currentChatInfo?.user_id]
  );

  const e2eeStatusData = useE2EEStatus(peerId, {
    autoCheck: true,
    checkInterval: 30000,
  });

  const {
    isEncrypted: isE2EEEncrypted,
    hasPeerKey,
    status: peerE2EEStatus,
    needsDerivation,
    needsKeyExchange,
  } = e2eeStatusData;

  // Lấy current_conversation từ displayMessages hoặc redux
  const current_conversation = useMemo(() => {
    if (chat_type === "individual" && room_id) {
      return conversations.find((conv) => conv.id === room_id) || null;
    }
    return null;
  }, [chat_type, room_id, conversations]);

  // FIX QUAN TRỌNG: Lấy E2EE service từ hook useAutoE2EE
  const e2eeService = useMemo(() => {
    return getE2EEService ? getE2EEService() : null;
  }, [getE2EEService]);

  // DÙNG HOOK DECRYPTION MỚI - FIX: Truyền service đúng cách
  const {
    autoDecryptInProgress,
    e2eeMethods,
    handleRetryDecrypt,
    autoDecryptAllMessages,
    checkE2EEService,
    isValidEncryptedMessage,
    extractEncryptionData,
    decryptMessageDirectly,
  } = useE2EEDecryption(e2eeService, chat_type);

  // ============================================
  // 🆕 THÊM PHẦN NÀY: useEffect để sync secrets khi load
  // ============================================
  useEffect(() => {
    const syncSecrets = async () => {
      if (e2eeService && currentChatInfo) {
        console.log("🔄 Syncing E2EE secrets for conversation...");

        try {
          // Gọi syncSecretsWithPeers nếu tồn tại
          if (typeof e2eeService.syncSecretsWithPeers === "function") {
            await e2eeService.syncSecretsWithPeers();
          }

          // Đảm bảo có decryption secret cho peer
          if (currentChatInfo.user_id) {
            if (typeof e2eeService.ensureDecryptionSecret === "function") {
              await e2eeService.ensureDecryptionSecret(currentChatInfo.user_id);
            }
          }
        } catch (error) {
          console.error("Error syncing secrets:", error);
        }
      }
    };

    syncSecrets();
  }, [e2eeService, currentChatInfo]);

  // ============================================
  // 🆕 THÊM PHẦN NÀY: Hàm handleDecryptMessage
  // ============================================
  const handleDecryptMessage = useCallback(
    async (message) => {
      try {
        console.log(`🔓 Attempting to decrypt message ${message.id}`);

        const encryptedData = {
          ciphertext: message.ciphertext,
          iv: message.iv,
          keyId: message.keyId,
          algorithm: message.algorithm || "AES-GCM-256",
        };

        const senderId = message.sender?.keycloakId || message.from;

        // Truyền recipientId cho outgoing messages
        const options = {};
        if (senderId === currentUserId && currentChatInfo?.user_id) {
          options.recipientId = currentChatInfo.user_id;
          console.log(`📤 Outgoing message to ${currentChatInfo.user_id}`);
        }

        let result;
        if (e2eeService && typeof e2eeService.decryptMessage === "function") {
          // Sử dụng decryptMessage của e2eeService nếu có options
          result = await e2eeService.decryptMessage(
            encryptedData,
            senderId,
            options
          );
        } else {
          // Fallback: sử dụng hook decryption
          result = await decryptMessageDirectly(message);
        }

        if (result.success) {
          console.log(
            `✅ Decrypted message ${message.id}: ${result.content.substring(
              0,
              50
            )}...`
          );

          dispatch(
            updateDecryptedMessage({
              messageId: message.id,
              decryptedContent: result.content,
              chatType: "individual",
              peerId: currentChatInfo?.user_id,
            })
          );

          return result;
        } else {
          console.error(
            `❌ Failed to decrypt message ${message.id}:`,
            result.error
          );

          // Thử sync secrets và thử lại
          if (e2eeService && currentChatInfo?.user_id) {
            console.log("🔄 Syncing secrets and retrying...");
            if (typeof e2eeService.ensureDecryptionSecret === "function") {
              await e2eeService.ensureDecryptionSecret(currentChatInfo.user_id);
            }

            // Thử lại sau 500ms
            setTimeout(() => {
              handleDecryptMessage(message);
            }, 500);
          }

          return result;
        }
      } catch (error) {
        console.error(`🔥 Error in handleDecryptMessage:`, error);
        return {
          success: false,
          error: error.message,
        };
      }
    },
    [
      e2eeService,
      currentUserId,
      currentChatInfo,
      dispatch,
      decryptMessageDirectly,
    ]
  );

  // ============================================
  // 🆕 THÊM PHẦN NÀY: Cập nhật handleRetryDecrypt để sử dụng handleDecryptMessage
  // ============================================
  const handleRetryDecryptWrapper = useCallback(
    async (message) => {
      // Cập nhật status thành decrypting
      dispatch(
        updateEncryptionStatus({
          messageId: message.id,
          status: "decrypting",
          chatType: chat_type,
        })
      );

      const result = await handleDecryptMessage(message);

      if (!result.success) {
        // Cập nhật status thành failed
        dispatch(
          updateEncryptionStatus({
            messageId: message.id,
            status: "decryption_failed",
            chatType: chat_type,
          })
        );
      }

      return result;
    },
    [handleDecryptMessage, dispatch, chat_type]
  );

  useSocketHandlers(room_id, chat_type, currentUserId);

  // STATE ĐỂ THEO DÕI AUTO-DECRYPT
  const [hasAutoDecrypted, setHasAutoDecrypted] = useState(false);
  const autoDecryptTimeoutRef = useRef(null);

  // LOGIC AUTO-DECRYPT CHÍNH - TỐI ƯU: Sử dụng useCallback
  const triggerAutoDecrypt = useCallback(async () => {
    console.log(
      "🔐 [DEBUG triggerAutoDecrypt] START ========================="
    );

    const conditions = {
      hasRoom: !!room_id,
      isIndividual: chat_type === "individual",
      hasPeerId: !!current_conversation?.user_id,
      e2eeReady: e2eeReady,
      hasMessages: displayMessages?.length > 0,
      notInProgress: !autoDecryptInProgress,
      notAutoDecrypted: !hasAutoDecrypted,
      isEncrypted: isE2EEEncrypted,
      hasPeerKey: hasPeerKey,
    };

    console.table(conditions);

    // Debug chi tiết từng điều kiện
    console.log("🔍 [DETAILED DEBUG]:", {
      room_id,
      chat_type,
      peerId: current_conversation?.user_id,
      e2eeReady,
      displayMessagesCount: displayMessages?.length,
      displayMessagesSample: displayMessages?.slice(0, 2),
      autoDecryptInProgress,
      hasAutoDecrypted,
      isE2EEEncrypted,
      hasPeerKey,
    });

    if (!conditions.hasRoom) {
      console.log("❌ FAIL: No room_id");
      return;
    }

    if (!conditions.isIndividual) {
      console.log("❌ FAIL: Not individual chat");
      return;
    }

    if (!conditions.hasPeerId) {
      console.log("❌ FAIL: No peer ID");
      return;
    }

    if (!conditions.e2eeReady) {
      console.log("❌ FAIL: E2EE not ready");
      return;
    }

    if (!conditions.hasMessages) {
      console.log("❌ FAIL: No messages");
      return;
    }

    if (!conditions.notInProgress) {
      console.log("❌ FAIL: Already in progress");
      return;
    }

    if (!conditions.notAutoDecrypted) {
      console.log("❌ FAIL: Already auto-decrypted");
      return;
    }

    if (!conditions.isEncrypted) {
      console.log("❌ FAIL: Not encrypted");
      return;
    }

    if (!conditions.hasPeerKey) {
      console.log("❌ FAIL: No peer key");
      return;
    }

    console.log("✅ ALL CONDITIONS PASSED!");

    const encryptedMessages = displayMessages.filter((msg) => {
      const isValid = isValidEncryptedMessage(msg);
      const isDecrypted = msg.isDecrypted;
      console.log(
        `📝 Message ${msg.id}: valid=${isValid}, decrypted=${isDecrypted}`
      );
      return isValid && !isDecrypted;
    });

    console.log("🔍 Encrypted messages found:", {
      count: encryptedMessages.length,
      ids: encryptedMessages.map((m) => m.id),
    });

    if (encryptedMessages.length === 0) {
      console.log("✅ No encrypted messages to decrypt");
      setHasAutoDecrypted(true);
      return;
    }

    if (autoDecryptTimeoutRef.current) {
      clearTimeout(autoDecryptTimeoutRef.current);
    }

    console.log("⏰ Setting timeout for auto-decrypt...");
    autoDecryptTimeoutRef.current = setTimeout(() => {
      console.log("🚀 [triggerAutoDecrypt] CALLING autoDecryptAllMessages");
      console.log("📤 Params:", {
        messagesCount: displayMessages.length,
        peerId,
      });

      // Gọi hàm autoDecryptAllMessages từ hook
      autoDecryptAllMessages(displayMessages, peerId)
        .then((result) => {
          console.log("✅ Auto-decrypt completed:", result);
          setHasAutoDecrypted(true);
        })
        .catch((error) => {
          console.error("❌ Auto-decrypt failed:", error);
        });
    }, 1000);
  }, [
    room_id,
    chat_type,
    current_conversation,
    e2eeReady,
    displayMessages,
    autoDecryptInProgress,
    hasAutoDecrypted,
    isE2EEEncrypted,
    hasPeerKey,
    isValidEncryptedMessage,
    autoDecryptAllMessages,
    peerId,
  ]);

  // ============================================
  // 🆕 THÊM PHẦN NÀY: useEffect để trigger auto-decrypt
  // ============================================
  useEffect(() => {
    console.log("🔄 [useEffect triggerAutoDecrypt] displayMessages changed:", {
      count: displayMessages?.length,
      hasMessages: displayMessages?.length > 0,
    });

    triggerAutoDecrypt();

    return () => {
      if (autoDecryptTimeoutRef.current) {
        clearTimeout(autoDecryptTimeoutRef.current);
      }
    };
  }, [triggerAutoDecrypt, displayMessages]);

  // Reset hasAutoDecrypted khi thay đổi conversation
  useEffect(() => {
    if (room_id && current_conversation?.id) {
      setHasAutoDecrypted(false);
    }
  }, [room_id, current_conversation?.id]);

  // Cleanup timeout khi unmount
  useEffect(() => {
    return () => {
      if (autoDecryptTimeoutRef.current) {
        clearTimeout(autoDecryptTimeoutRef.current);
      }
    };
  }, []);

  // Kiểm tra E2EE service khi thay đổi - TỐI ƯU: Giảm tần suất check
  useEffect(() => {
    const timer = setTimeout(() => {
      checkE2EEService();
    }, 2000); // Check sau 2 giây

    return () => clearTimeout(timer);
  }, [checkE2EEService]);

  // Format và group messages
  const groupedMessages = useMemo(() => {
    const formatMessageDate = (timestamp) => {
      if (!timestamp) return "";
      const date = new Date(timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const isToday = date.toDateString() === today.toDateString();
      const isYesterday = date.toDateString() === yesterday.toDateString();

      if (isToday) return "Today";
      if (isYesterday) return "Yesterday";

      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    };

    const groupMessagesByDate = (messages) => {
      if (!messages || messages.length === 0) return [];

      const groupedMessages = [];
      let currentDateGroup = null;

      messages.forEach((message) => {
        const messageDate = new Date(message.createdAt || message.time);
        const dateKey = messageDate.toDateString();

        if (!currentDateGroup || currentDateGroup.dateKey !== dateKey) {
          if (currentDateGroup) {
            groupedMessages.push(currentDateGroup);
          }

          currentDateGroup = {
            type: "date_group",
            dateKey: dateKey,
            date: messageDate,
            displayDate: formatMessageDate(messageDate),
            messages: [],
          };
        }

        currentDateGroup.messages.push(message);
      });

      if (currentDateGroup) {
        groupedMessages.push(currentDateGroup);
      }

      return groupedMessages;
    };

    return groupMessagesByDate(displayMessages || []);
  }, [displayMessages]);

  // Helper functions - Memoize để tránh re-render
  const shouldShowSenderName = useCallback(
    (currentMessage, previousMessage) => {
      if (!previousMessage) return true;
      if (chat_type === "individual") return false;
      if (currentMessage.subtype === "system") return false;

      if (
        currentMessage.sender?.keycloakId !== previousMessage.sender?.keycloakId
      ) {
        return true;
      }

      const currentTime = new Date(
        currentMessage.createdAt || currentMessage.time
      );
      const previousTime = new Date(
        previousMessage.createdAt || previousMessage.time
      );
      const timeDiff = Math.abs(currentTime - previousTime) / (1000 * 60 * 60);

      return timeDiff > 24;
    },
    [chat_type]
  );

  const isStartOfMessageGroup = useCallback(
    (currentMessage, nextMessage) => {
      if (!nextMessage) return true;
      if (chat_type === "individual") return true;

      if (
        currentMessage.sender?.keycloakId !== nextMessage.sender?.keycloakId
      ) {
        return true;
      }

      const currentTime = new Date(
        currentMessage.createdAt || currentMessage.time
      );
      const nextTime = new Date(nextMessage.createdAt || nextMessage.time);
      const timeDiff = Math.abs(nextTime - currentTime) / (1000 * 60 * 60);

      return timeDiff > 24;
    },
    [chat_type]
  );

  // Tính toán số tin nhắn cần giải mã
  const encryptedMessagesCount = useMemo(() => {
    if (!displayMessages) return 0;
    return displayMessages.filter(
      (m) => isValidEncryptedMessage(m) && !m.isDecrypted
    ).length;
  }, [displayMessages, isValidEncryptedMessage]);

  // Lấy E2EE status cho chat hiện tại
  const e2eeChatStatus = useMemo(() => {
    if (chat_type !== "individual") return null;

    return {
      e2eeEnabled: e2eeReady && e2eeStatus === "ready",
      friendE2EEEnabled: hasPeerKey,
      allEnabled:
        e2eeReady && e2eeStatus === "ready" && hasPeerKey && isE2EEEncrypted,
      isEncrypted: isE2EEEncrypted,
      needsDerivation,
      needsKeyExchange,
      peerE2EEStatus,
    };
  }, [
    chat_type,
    e2eeReady,
    e2eeStatus,
    hasPeerKey,
    isE2EEEncrypted,
    needsDerivation,
    needsKeyExchange,
    peerE2EEStatus,
  ]);

  // Fetch pinned messages
  useEffect(() => {
    const fetchPinnedMessagesFromAPI = async () => {
      if (!room_id || !currentUserId) return;

      try {
        const response = await api.post("/users/messages/pinned", {
          roomId: room_id,
          keycloakId: currentUserId,
        });

        if (response.data.status === "success") {
          dispatch(
            setPinnedMessages({
              messages: response.data.data,
              chatType: chat_type,
            })
          );
        }
      } catch (error) {
        console.error("❌ Error fetching pinned messages:", error);
      }
    };

    fetchPinnedMessagesFromAPI();
  }, [room_id, chat_type, currentUserId, dispatch]);

  useEffect(() => {
    if (room_id && chat_type) {
      dispatch(fetchPinnedMessagesAction(room_id, chat_type));
    }
  }, [room_id, chat_type, dispatch]);

  // Render loading
  if (isLoadingMessages) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          flexDirection: "column",
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          Loading messages...
        </Typography>
      </Box>
    );
  }

  // Render no conversation
  if (!room_id || !currentChatInfo) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          flexDirection: "column",
          gap: 2,
          p: 3,
        }}
      >
        <Typography variant="h6" color="text.secondary">
          {!room_id ? "Select a conversation" : "Loading conversation..."}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {!room_id
            ? "Choose a conversation from the list to start chatting"
            : "Please wait while we load the conversation..."}
        </Typography>
      </Box>
    );
  }

  return (
    <Box p={isMobile ? 0.5 : 2}>
      {/* E2EE Status Banner */}
      {chat_type === "individual" && e2eeChatStatus && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
            px: 2,
          }}
        >
          {e2eeChatStatus.allEnabled ? (
            <Chip
              icon={<LockOpenIcon />}
              label="End-to-End Encrypted"
              color="success"
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            />
          ) : e2eeChatStatus.e2eeEnabled &&
            !e2eeChatStatus.friendE2EEEnabled ? (
            <Chip
              icon={<LockIcon />}
              label="Friend doesn't have E2EE enabled"
              color="warning"
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            />
          ) : !e2eeChatStatus.e2eeEnabled ? (
            <Chip
              icon={<LockIcon />}
              label="E2EE disabled"
              color="error"
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            />
          ) : e2eeChatStatus.needsDerivation ? (
            <Chip
              icon={<LockIcon />}
              label="Needs key derivation"
              color="warning"
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            />
          ) : e2eeChatStatus.needsKeyExchange ? (
            <Chip
              icon={<LockIcon />}
              label="Needs key exchange"
              color="warning"
              size="small"
              variant="outlined"
              sx={{ fontSize: "0.75rem" }}
            />
          ) : null}
        </Box>
      )}

      {/* Decrypt Button */}
      {encryptedMessagesCount > 0 && e2eeReady && !autoDecryptInProgress && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            mb: 2,
            px: 2,
          }}
        >
          <Button
            variant="outlined"
            size="small"
            startIcon={<LockOpenIcon />}
            onClick={() => {
              setHasAutoDecrypted(false);
              autoDecryptAllMessages(displayMessages, peerId);
            }}
            disabled={autoDecryptInProgress}
            sx={{
              fontSize: "0.75rem",
              py: 0.5,
            }}
          >
            {autoDecryptInProgress ? (
              <>
                <CircularProgress size={12} sx={{ mr: 1 }} />
                Decrypting...
              </>
            ) : (
              `Decrypt ${encryptedMessagesCount} message${
                encryptedMessagesCount > 1 ? "s" : ""
              }`
            )}
          </Button>
        </Box>
      )}

      {/* Messages */}
      <Stack spacing={0.5}>
        {groupedMessages.length === 0 ? (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "200px",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No messages yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start the conversation with {currentChatInfo?.name}!
            </Typography>
          </Box>
        ) : (
          groupedMessages.map((dateGroup, groupIndex) => (
            <React.Fragment
              key={`date-group-${dateGroup.dateKey}-${groupIndex}`}
            >
              <DateDivider date={dateGroup.displayDate} />

              {dateGroup.messages.map((el, index) => {
                if (!el) return null;

                if (el.type === "divider") {
                  return <Timeline key={el.id || `divider-${index}`} el={el} />;
                }

                if (el.type === "msg" || el.type === "encrypted") {
                  const previousMessage =
                    index > 0 ? dateGroup.messages[index - 1] : null;
                  const nextMessage =
                    index < dateGroup.messages.length - 1
                      ? dateGroup.messages[index + 1]
                      : null;

                  const showSenderName = shouldShowSenderName(
                    el,
                    previousMessage
                  );
                  const isStartOfGroup = isStartOfMessageGroup(el, nextMessage);

                  const MsgComponent = (() => {
                    switch (el.subtype) {
                      case "img":
                        return MediaMsg;
                      case "doc":
                        return DocMsg;
                      case "Link":
                        return LinkMsg;
                      case "reply":
                        return ReplyMsg;
                      default:
                        return TextMsg;
                    }
                  })();

                  return (
                    <MessageWrapper
                      key={el.id || `msg-${groupIndex}-${index}`}
                      message={el}
                      showSenderName={showSenderName}
                      isStartOfGroup={isStartOfGroup}
                      chat_type={chat_type}
                      onRetryDecrypt={handleRetryDecryptWrapper} // 🆕 Sử dụng wrapper mới
                    >
                      {showSenderName && chat_type === "group" && (
                        <SenderName message={el} chat_type={chat_type} />
                      )}
                      <MsgComponent
                        el={{
                          ...el,
                          message: el.decryptedContent || el.message,
                          isDecrypted: el.isDecrypted || false,
                        }}
                        menu={menu}
                        isGroup={chat_type === "group"}
                        roomId={chat_type === "group" ? room_id : null}
                      />
                    </MessageWrapper>
                  );
                }

                return null;
              })}
            </React.Fragment>
          ))
        )}
      </Stack>
    </Box>
  );
};

// ============================================
// ChatComponent - TỐI ƯU: Dùng React.memo
// ============================================

const ChatComponent = React.memo(() => {
  const isMobile = useResponsive("between", "md", "xs", "sm");
  const theme = useTheme();
  const messageListRef = useRef(null);
  const isAutoScrolling = useRef(true);
  const { current_messages, current_conversation } = useSelector(
    (state) => state.conversation.direct_chat
  );
  const { current_room } = useSelector(
    (state) => state.conversation.group_chat
  );
  const { chat_type, room_id } = useSelector((state) => state.app);
  const dispatch = useDispatch();

  const currentChatInfo =
    chat_type === "group" ? current_room : current_conversation;

  useEffect(() => {
    if (!messageListRef.current) return;

    const scrollContainer = messageListRef.current;

    const handleScroll = () => {
      const isAtBottom =
        scrollContainer.scrollHeight -
          scrollContainer.scrollTop -
          scrollContainer.clientHeight <
        100;

      isAutoScrolling.current = isAtBottom;
    };

    scrollContainer.addEventListener("scroll", handleScroll);

    return () => {
      scrollContainer.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    if (!messageListRef.current || !isAutoScrolling.current) return;

    const scrollToBottom = () => {
      const scrollContainer = messageListRef.current;
      if (scrollContainer) {
        scrollContainer.scrollTo({
          top: scrollContainer.scrollHeight,
          behavior: "smooth",
        });
      }
    };

    const timeoutId = setTimeout(scrollToBottom, 150);
    return () => clearTimeout(timeoutId);
  }, [current_messages, current_room?.messages]);

  useEffect(() => {
    if (messageListRef.current && room_id) {
      isAutoScrolling.current = true;

      const timeoutId = setTimeout(() => {
        if (messageListRef.current) {
          messageListRef.current.scrollTop =
            messageListRef.current.scrollHeight;
        }
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [room_id]);

  const scrollToBottom = useCallback(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTo({
        top: messageListRef.current.scrollHeight,
        behavior: "smooth",
      });
      isAutoScrolling.current = true;
    }
  }, []);

  useEffect(() => {
    if (room_id) {
      dispatch(clearPinnedMessages({ chatType: chat_type }));
    }
  }, [room_id, chat_type, dispatch]);

  useEffect(() => {
    if (window.socket) {
      const handleMessageDeleted = (data) => {
        console.log("📡 Socket: Message deleted by others", data);
      };

      const handleNewMessage = () => {
        if (isAutoScrolling.current) {
          setTimeout(scrollToBottom, 100);
        }
      };

      window.socket.on("message_deleted", handleMessageDeleted);
      window.socket.on("new_message", handleNewMessage);
      window.socket.on("new_group_message", handleNewMessage);

      window.socket.on("encrypted_message", handleNewMessage);
      window.socket.on("encrypted_message_reply", handleNewMessage);

      return () => {
        if (window.socket) {
          window.socket.off("message_deleted", handleMessageDeleted);
          window.socket.off("new_message", handleNewMessage);
          window.socket.off("new_group_message", handleNewMessage);
          window.socket.off("encrypted_message", handleNewMessage);
          window.socket.off("encrypted_message_reply", handleNewMessage);
        }
      };
    }
  }, [dispatch, scrollToBottom]);

  return (
    <Stack height="100%" maxHeight="100vh" width={isMobile ? "100vw" : "auto"}>
      <ChatHeader />

      {/* Pinned Messages */}
      <PinnedMessages />

      <Box
        ref={messageListRef}
        width="100%"
        sx={{
          position: "relative",
          flexGrow: 1,
          overflow: "auto",
          backgroundColor:
            theme.palette.mode === "light"
              ? "#F0F4FA"
              : theme.palette.background.paper,
          boxShadow: "0px 0px 2px rgba(0, 0, 0, 0.25)",
        }}
      >
        <SimpleBarStyle timeout={500} clickOnTrack={false}>
          <Conversation menu={true} isMobile={isMobile} />
        </SimpleBarStyle>

        <Box
          sx={{
            position: "absolute",
            bottom: 16,
            right: 16,
            opacity: isAutoScrolling.current ? 0 : 1,
            transition: "opacity 0.3s ease",
            pointerEvents: isAutoScrolling.current ? "none" : "all",
          }}
        >
          <IconButton
            onClick={scrollToBottom}
            sx={{
              backgroundColor: "primary.main",
              color: "white",
              "&:hover": {
                backgroundColor: "primary.dark",
              },
              boxShadow: 2,
            }}
            size="small"
          >
            <ExpandMoreIcon />
          </IconButton>
        </Box>
      </Box>
      <ChatFooter />
    </Stack>
  );
});

export default ChatComponent;
export { Conversation };
