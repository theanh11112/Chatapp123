import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import useAutoE2EE from "./useAutoE2EE";
import { showSnackbar } from "../../redux/slices/app";

/**
 * Hook for encrypted messaging operations with queue management
 */

export const useEncryptedMessaging = (chatId, peerId, options = {}) => {
  const {
    isGroup = false,
    autoEncrypt = true,
    maxQueueSize = 10,
    retryAttempts = 2,
    retryDelay = 1000,
  } = options;

  const [queue, setQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [stats, setStats] = useState({
    sent: 0,
    encrypted: 0,
    failed: 0,
    retried: 0,
    lastError: null,
    lastSuccess: null,
  });

  const queueRef = useRef([]);
  const processingRef = useRef(false);
  const dispatch = useDispatch();

  const { isReady, encryptMessage, decryptMessage, getService } = useAutoE2EE();

  // Process the next item in queue
  const processNext = useCallback(async () => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }

    processingRef.current = true;
    setIsProcessing(true);

    const item = queueRef.current[0];

    try {
      console.log(`🔄 [useEncryptedMessaging] Processing:`, {
        id: item.id,
        peerId: item.peerId,
        retryCount: item.retryCount || 0,
      });

      let result;

      if (item.type === "encrypt_and_send") {
        // Encrypt and send
        result = await handleEncryptAndSend(item);
      } else if (item.type === "decrypt") {
        // Decrypt only
        result = await handleDecrypt(item);
      } else {
        // Unknown type, remove from queue
        queueRef.current = queueRef.current.slice(1);
        setQueue(queueRef.current);
        processingRef.current = false;
        setIsProcessing(false);
        processNext();
        return;
      }

      // Handle result
      if (result.success) {
        // Success - remove from queue
        queueRef.current = queueRef.current.slice(1);

        // Update stats
        setStats((prev) => ({
          ...prev,
          sent: prev.sent + 1,
          encrypted:
            item.type === "encrypt_and_send"
              ? prev.encrypted + 1
              : prev.encrypted,
          lastSuccess: new Date(),
        }));

        // Call success callback
        if (item.onSuccess) {
          item.onSuccess(result);
        }

        // Show success notification for encryption
        if (
          item.type === "encrypt_and_send" &&
          item.showNotifications !== false
        ) {
          dispatch(
            showSnackbar({
              severity: "success",
              message: "Message encrypted and sent",
              autoHideDuration: 2000,
            })
          );
        }
      } else {
        // Failed - handle retry
        const retryCount = item.retryCount || 0;

        if (retryCount < retryAttempts) {
          // Retry after delay
          console.log(`🔄 Retrying (${retryCount + 1}/${retryAttempts})...`);

          queueRef.current[0] = {
            ...item,
            retryCount: retryCount + 1,
            lastAttempt: new Date(),
          };

          setTimeout(() => {
            processingRef.current = false;
            setIsProcessing(false);
            processNext();
          }, retryDelay * (retryCount + 1));

          // Update stats
          setStats((prev) => ({
            ...prev,
            retried: prev.retried + 1,
          }));

          return;
        } else {
          // Max retries reached - remove from queue
          queueRef.current = queueRef.current.slice(1);

          // Update stats
          setStats((prev) => ({
            ...prev,
            failed: prev.failed + 1,
            lastError: result.error || "Max retries reached",
          }));

          // Call error callback
          if (item.onError) {
            item.onError(result.error || "Failed after retries");
          }

          // Show error notification
          if (item.showNotifications !== false) {
            dispatch(
              showSnackbar({
                severity: "error",
                message: `Failed to send message: ${
                  result.error || "Unknown error"
                }`,
                autoHideDuration: 4000,
              })
            );
          }
        }
      }

      // Update queue state
      setQueue(queueRef.current);
    } catch (error) {
      console.error(
        "❌ [useEncryptedMessaging] Queue processing error:",
        error
      );

      // Remove failed item
      queueRef.current = queueRef.current.slice(1);
      setQueue(queueRef.current);

      // Update stats
      setStats((prev) => ({
        ...prev,
        failed: prev.failed + 1,
        lastError: error.message,
      }));

      // Show error
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Processing error: ${error.message}`,
          autoHideDuration: 4000,
        })
      );
    } finally {
      processingRef.current = false;
      setIsProcessing(false);

      // Process next item if any
      if (queueRef.current.length > 0) {
        setTimeout(processNext, 100);
      }
    }
  }, [retryAttempts, retryDelay, dispatch]);

  // Encrypt and send message
  const handleEncryptAndSend = useCallback(
    async (item) => {
      const {
        content,
        peerId,
        roomId,
        socketEvent = "send_encrypted_message",
      } = item;

      try {
        // Step 1: Encrypt message
        console.log(`🔐 [useEncryptedMessaging] Encrypting for ${peerId}`);
        const encryptionResult = await encryptMessage(content, peerId);

        if (!encryptionResult.success) {
          throw new Error(`Encryption failed: ${encryptionResult.error}`);
        }

        // Step 2: Prepare socket data
        const socketData = {
          roomId: roomId || chatId,
          ciphertext: encryptionResult.ciphertext,
          iv: encryptionResult.iv,
          keyId: encryptionResult.keyId,
          algorithm: encryptionResult.algorithm,
          peerFingerprint: encryptionResult.peerFingerprint,
          type: "encrypted",
          timestamp: new Date().toISOString(),
        };

        // Step 3: Send via socket
        console.log(`📤 [useEncryptedMessaging] Sending encrypted message`);

        // Get socket from global or import
        let socket;
        try {
          const socketModule = await import("../../socket");
          socket = socketModule.getSocket();
        } catch (error) {
          console.warn("⚠️ Failed to get socket module:", error);
          throw new Error("Socket not available");
        }

        if (!socket || !socket.connected) {
          throw new Error("Socket not connected");
        }

        // Emit with callback
        const socketResult = await new Promise((resolve) => {
          socket.emit(socketEvent, socketData, (response) => {
            resolve(response);
          });

          // Timeout after 10 seconds
          setTimeout(() => {
            resolve({ success: false, error: "Socket timeout" });
          }, 10000);
        });

        if (socketResult?.success) {
          return {
            success: true,
            encrypted: true,
            socketResult,
            encryptionResult,
          };
        } else {
          throw new Error(socketResult?.error || "Socket send failed");
        }
      } catch (error) {
        console.error(
          "❌ [useEncryptedMessaging] Encrypt and send failed:",
          error
        );
        return {
          success: false,
          error: error.message,
          encrypted: false,
        };
      }
    },
    [chatId, encryptMessage]
  );

  // Decrypt message
  const handleDecrypt = useCallback(
    async (item) => {
      const { encryptedData, senderId } = item;

      try {
        if (!encryptedData || !senderId) {
          throw new Error("Missing encrypted data or senderId");
        }

        console.log(`🔓 [useEncryptedMessaging] Decrypting from ${senderId}`);

        const decryptionResult = await decryptMessage(encryptedData, senderId);

        if (decryptionResult.success) {
          return {
            success: true,
            decrypted: true,
            content: decryptionResult.content,
            originalData: encryptedData,
          };
        } else {
          throw new Error(`Decryption failed: ${decryptionResult.error}`);
        }
      } catch (error) {
        console.error("❌ [useEncryptedMessaging] Decryption failed:", error);
        return {
          success: false,
          error: error.message,
          decrypted: false,
        };
      }
    },
    [decryptMessage]
  );

  // Send message (main API)
  const sendMessage = useCallback(
    async (content, sendOptions = {}) => {
      const {
        onSuccess,
        onError,
        forcePlaintext = false,
        replyTo = null,
        attachments = [],
        showNotifications = true,
        socketEvent = "send_encrypted_message",
      } = sendOptions;

      if (!content) {
        const error = "No content provided";
        onError?.(error);
        return { success: false, error };
      }

      // Check if queue is full
      if (queueRef.current.length >= maxQueueSize) {
        const error = "Encryption queue is full";
        onError?.(error);
        return { success: false, error };
      }

      // Determine target peer/room
      const targetPeerId = sendOptions.peerId || peerId;
      const targetRoomId = sendOptions.roomId || chatId;

      if (!targetPeerId && !targetRoomId) {
        const error = "No recipient specified";
        onError?.(error);
        return { success: false, error };
      }

      // Create queue item
      const queueItem = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        type:
          forcePlaintext || !autoEncrypt || !isReady
            ? "plain_send"
            : "encrypt_and_send",
        content,
        peerId: targetPeerId,
        roomId: targetRoomId,
        isGroup: sendOptions.isGroup || isGroup,
        replyTo,
        attachments,
        showNotifications,
        socketEvent,
        createdAt: new Date(),
        onSuccess,
        onError,
      };

      // Add to queue
      queueRef.current = [...queueRef.current, queueItem];
      setQueue(queueRef.current);

      // Start processing if not already
      if (!processingRef.current) {
        processNext();
      }

      return {
        success: true,
        queued: true,
        queueId: queueItem.id,
        position: queueRef.current.length,
        estimatedTime: queueRef.current.length * 2000, // Rough estimate
      };
    },
    [peerId, chatId, isGroup, autoEncrypt, isReady, maxQueueSize, processNext]
  );

  // Send plain message (no encryption)
  const sendPlainMessage = useCallback(
    async (content, options = {}) => {
      return sendMessage(content, { ...options, forcePlaintext: true });
    },
    [sendMessage]
  );

  // Queue encrypted message for decryption
  const queueDecryption = useCallback(
    async (encryptedData, senderId, options = {}) => {
      const { onSuccess, onError } = options;

      if (!encryptedData || !senderId) {
        const error = "Missing encrypted data or senderId";
        onError?.(error);
        return { success: false, error };
      }

      // Create decryption queue item
      const queueItem = {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        type: "decrypt",
        encryptedData,
        senderId,
        createdAt: new Date(),
        onSuccess,
        onError,
      };

      // Add to queue
      queueRef.current = [...queueRef.current, queueItem];
      setQueue(queueRef.current);

      // Start processing if not already
      if (!processingRef.current) {
        processNext();
      }

      return {
        success: true,
        queued: true,
        queueId: queueItem.id,
        position: queueRef.current.length,
      };
    },
    [processNext]
  );

  // Clear queue
  const clearQueue = useCallback(() => {
    console.log(
      `🗑️ [useEncryptedMessaging] Clearing queue (${queueRef.current.length} items)`
    );

    // Call error callbacks for pending items
    queueRef.current.forEach((item) => {
      if (item.onError) {
        item.onError("Queue cleared");
      }
    });

    queueRef.current = [];
    setQueue([]);
    processingRef.current = false;
    setIsProcessing(false);
  }, []);

  // Get queue status
  const getQueueStatus = useCallback(
    () => ({
      total: queue.length,
      processing: isProcessing,
      pending: queue.length - (isProcessing ? 1 : 0),
      stats,
      estimatedTime: queue.length * 2000, // Rough estimate in ms
    }),
    [queue, isProcessing, stats]
  );

  // Get detailed stats
  const getStats = useCallback(
    () => ({
      ...stats,
      queueSize: queue.length,
      isProcessing,
      isReady,
      successRate:
        stats.sent > 0 ? (stats.sent - stats.failed) / stats.sent : 0,
      encryptionRate: stats.sent > 0 ? stats.encrypted / stats.sent : 0,
    }),
    [stats, queue.length, isProcessing, isReady]
  );

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (queueRef.current.length > 0) {
        console.warn(
          `⚠️ [useEncryptedMessaging] Unmounting with ${queueRef.current.length} items in queue`
        );
        clearQueue();
      }
    };
  }, [clearQueue]);

  // Listen for E2EE service readiness
  useEffect(() => {
    if (isReady && queue.length > 0 && !isProcessing) {
      // Service became ready, process queue
      setTimeout(processNext, 500);
    }
  }, [isReady, queue.length, isProcessing, processNext]);

  return {
    // State
    queue,
    isProcessing,
    stats: getStats(),

    // Methods
    sendMessage,
    sendPlainMessage,
    queueDecryption,
    clearQueue,
    getQueueStatus,

    // Status
    isReady,
    hasQueue: queue.length > 0,

    // Helpers
    canEncrypt: isReady && autoEncrypt,
    estimatedWaitTime: queue.length * 2000,

    // Debug
    debugInfo: {
      chatId,
      peerId,
      isGroup,
      queueSize: queue.length,
      isProcessing,
      isReady,
    },
  };
};

export default useEncryptedMessaging;
