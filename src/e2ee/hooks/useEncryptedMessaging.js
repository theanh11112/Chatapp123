import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { getSocket, safeEmit } from "../../socket";
import useAutoE2EE from "./useAutoE2EE";
import { showSnackbar } from "../../redux/slices/app";

export const useEncryptedMessaging = (
  chatId = null,
  peerId = null,
  isGroup = false
) => {
  const [pendingEncryption, setPendingEncryption] = useState(0);
  const [encryptionQueue, setEncryptionQueue] = useState([]);
  const [lastEncryptedAt, setLastEncryptedAt] = useState(null);
  const [encryptionStats, setEncryptionStats] = useState({
    totalEncrypted: 0,
    totalFailed: 0,
    lastError: null,
  });

  const queueRef = useRef([]);
  const dispatch = useDispatch();
  const socket = getSocket();

  const {
    isReady,
    sendEncryptedMessage: autoSendEncrypted,
    encryptMessage,
    decryptMessage,
  } = useAutoE2EE();

  // Process encryption queue
  const processQueue = useCallback(async () => {
    if (queueRef.current.length === 0 || !isReady) return;

    console.log(
      `🔄 [useEncryptedMessaging] Processing queue: ${queueRef.current.length} items`
    );

    const item = queueRef.current[0];
    try {
      setPendingEncryption((prev) => prev + 1);

      const result = await autoSendEncrypted({
        content: item.content,
        peerId: item.peerId,
        roomId: item.roomId,
        messageType: item.messageType,
      });

      if (result.success) {
        console.log(
          `✅ [useEncryptedMessaging] Message encrypted and sent:`,
          result
        );
        setEncryptionStats((prev) => ({
          ...prev,
          totalEncrypted: prev.totalEncrypted + 1,
        }));
        setLastEncryptedAt(new Date());

        // Call success callback if provided
        if (item.onSuccess) {
          item.onSuccess(result);
        }
      } else {
        console.error(
          `❌ [useEncryptedMessaging] Failed to encrypt:`,
          result.error
        );
        setEncryptionStats((prev) => ({
          ...prev,
          totalFailed: prev.totalFailed + 1,
          lastError: result.error,
        }));

        // Call error callback if provided
        if (item.onError) {
          item.onError(result.error);
        } else {
          // Show error notification
          dispatch(
            showSnackbar({
              severity: "error",
              message: `Encryption failed: ${result.error}`,
            })
          );
        }
      }
    } catch (error) {
      console.error(
        `❌ [useEncryptedMessaging] Queue processing error:`,
        error
      );
      setEncryptionStats((prev) => ({
        ...prev,
        totalFailed: prev.totalFailed + 1,
        lastError: error.message,
      }));
    } finally {
      // Remove from queue
      queueRef.current = queueRef.current.slice(1);
      setEncryptionQueue(queueRef.current);
      setPendingEncryption((prev) => prev - 1);

      // Process next item if any
      if (queueRef.current.length > 0) {
        setTimeout(processQueue, 100);
      }
    }
  }, [isReady, autoSendEncrypted, dispatch]);

  // Send message with auto-encryption
  const sendMessage = useCallback(
    async (content, options = {}) => {
      const {
        onSuccess,
        onError,
        forcePlaintext = false,
        replyTo = null,
        attachments = [],
      } = options;

      if (!content || !chatId) {
        console.error("❌ [useEncryptedMessaging] Missing content or chatId");
        return { success: false, error: "Missing parameters" };
      }

      console.log(
        `💬 [useEncryptedMessaging] Sending message to ${peerId || chatId}:`,
        {
          contentLength: content.length,
          forcePlaintext,
          isGroup,
        }
      );

      // If not ready or force plaintext, send as plaintext
      if (!isReady || forcePlaintext || attachments.length > 0) {
        console.log("📝 [useEncryptedMessaging] Sending as plaintext");
        return sendPlainMessage(content, { replyTo, attachments });
      }

      // Add to encryption queue
      const queueItem = {
        id: Date.now() + Math.random(),
        content,
        peerId,
        roomId: chatId,
        messageType: isGroup ? "group" : "direct",
        onSuccess,
        onError,
        timestamp: new Date(),
      };

      queueRef.current = [...queueRef.current, queueItem];
      setEncryptionQueue(queueRef.current);

      // Start processing if not already
      if (pendingEncryption === 0) {
        setTimeout(processQueue, 0);
      }

      return {
        success: true,
        queued: true,
        queueId: queueItem.id,
        position: queueRef.current.length,
      };
    },
    [chatId, peerId, isGroup, isReady, pendingEncryption, processQueue]
  );

  // Send plain message (fallback)
  const sendPlainMessage = useCallback(
    async (content, options = {}) => {
      const { replyTo, attachments = [] } = options;

      try {
        console.log(
          `📤 [useEncryptedMessaging] Sending plain message to ${chatId}`
        );

        const eventName = isGroup ? "new_group_message" : "text_message";
        const data = {
          roomId: chatId,
          content,
          to: peerId,
          attachments,
          replyTo,
          type: "text",
        };

        const result = await safeEmit(eventName, data, { retry: 2 });

        if (result) {
          console.log(
            "✅ [useEncryptedMessaging] Plain message sent successfully"
          );
          return { success: true, encrypted: false };
        } else {
          console.error(
            "❌ [useEncryptedMessaging] Failed to send plain message"
          );
          return { success: false, error: "Failed to send message" };
        }
      } catch (error) {
        console.error(
          "❌ [useEncryptedMessaging] Plain message exception:",
          error
        );
        return { success: false, error: error.message };
      }
    },
    [chatId, peerId, isGroup]
  );

  // Receive and decrypt message
  const receiveMessage = useCallback(
    async (messageData) => {
      if (!messageData.isEncrypted || !messageData.ciphertext) {
        console.log("📨 [useEncryptedMessaging] Not an encrypted message");
        return { ...messageData, isDecrypted: false };
      }

      console.log(`🔐 [useEncryptedMessaging] Received encrypted message:`, {
        messageId: messageData.id,
        from: messageData.sender?.keycloakId,
        hasCiphertext: !!messageData.ciphertext,
      });

      try {
        const senderId = messageData.sender?.keycloakId || messageData.from;

        const decrypted = await decryptMessage(
          messageData.ciphertext,
          messageData.iv,
          messageData.keyId,
          senderId
        );

        if (decrypted.success) {
          console.log(
            `✅ [useEncryptedMessaging] Message decrypted successfully`
          );

          // Update encryption stats
          setEncryptionStats((prev) => ({
            ...prev,
            totalEncrypted: prev.totalEncrypted + 1,
          }));

          return {
            ...messageData,
            content: decrypted.content,
            originalContent: messageData.content || messageData.message,
            isDecrypted: true,
            decryptedAt: new Date(),
            encryptionStatus: "decrypted",
          };
        } else {
          console.warn(
            `⚠️ [useEncryptedMessaging] Failed to decrypt:`,
            decrypted.error
          );

          // Show notification for decryption failure
          dispatch(
            showSnackbar({
              severity: "warning",
              message: "Unable to decrypt message",
              autoHideDuration: 3000,
            })
          );

          return {
            ...messageData,
            isDecrypted: false,
            decryptionError: decrypted.error,
            encryptionStatus: "encrypted_undecryptable",
          };
        }
      } catch (error) {
        console.error(
          `❌ [useEncryptedMessaging] Decryption exception:`,
          error
        );
        return {
          ...messageData,
          isDecrypted: false,
          decryptionError: error.message,
          encryptionStatus: "error",
        };
      }
    },
    [decryptMessage, dispatch]
  );

  // Encrypt before send (manual control)
  const encryptBeforeSend = useCallback(
    async (content, targetPeerId = peerId) => {
      if (!isReady || !targetPeerId) {
        console.warn(
          "⚠️ [useEncryptedMessaging] Cannot encrypt: not ready or no peerId"
        );
        return { success: false, error: "Encryption not ready" };
      }

      console.log(
        `🔐 [useEncryptedMessaging] Encrypting content for ${targetPeerId}`
      );

      try {
        const result = await encryptMessage(content, targetPeerId);

        if (result.success) {
          console.log(
            "✅ [useEncryptedMessaging] Content encrypted successfully"
          );
          return result;
        } else {
          console.error(
            "❌ [useEncryptedMessaging] Encryption failed:",
            result.error
          );
          return result;
        }
      } catch (error) {
        console.error(
          "❌ [useEncryptedMessaging] Encryption exception:",
          error
        );
        return { success: false, error: error.message };
      }
    },
    [isReady, peerId, encryptMessage]
  );

  // Clear queue
  const clearQueue = useCallback(() => {
    console.log(`🗑️ [useEncryptedMessaging] Clearing encryption queue`);
    queueRef.current = [];
    setEncryptionQueue([]);
    setPendingEncryption(0);
  }, []);

  // Get queue status
  const getQueueStatus = useCallback(
    () => ({
      pending: pendingEncryption,
      queued: encryptionQueue.length,
      totalProcessed:
        encryptionStats.totalEncrypted + encryptionStats.totalFailed,
      successRate:
        encryptionStats.totalEncrypted /
        (encryptionStats.totalEncrypted + encryptionStats.totalFailed || 1),
      lastEncryptedAt,
      lastError: encryptionStats.lastError,
    }),
    [
      pendingEncryption,
      encryptionQueue.length,
      encryptionStats,
      lastEncryptedAt,
    ]
  );

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(`🧹 [useEncryptedMessaging] Cleaning up`);
      if (queueRef.current.length > 0) {
        console.warn(
          `⚠️ [useEncryptedMessaging] ${queueRef.current.length} items still in queue`
        );
      }
    };
  }, []);

  return {
    // State
    pendingEncryption,
    encryptionQueue,
    encryptionStats,
    lastEncryptedAt,

    // Methods
    sendMessage,
    receiveMessage,
    encryptBeforeSend,
    sendPlainMessage,
    clearQueue,
    getQueueStatus,

    // Status
    isReady,
    isProcessing: pendingEncryption > 0,
    hasQueue: encryptionQueue.length > 0,

    // Event emitters (for integration)
    onEncryptionStart: (callback) => {
      // Implementation for encryption start events
    },
    onEncryptionComplete: (callback) => {
      // Implementation for encryption complete events
    },
  };
};

export default useEncryptedMessaging;
