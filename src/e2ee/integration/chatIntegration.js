import React from "react";
import { useDispatch } from "react-redux";
import { showSnackbar } from "../../redux/slices/app";
import useAutoE2EE from "../hooks/useAutoE2EE";
import { useEncryptedMessaging } from "../hooks/useEncryptedMessaging";
import { getSocket, safeEmit } from "../../socket";

// 🎯 MAIN INTEGRATION HOOK
export const useChatE2EEIntegration = (chatId, peerId, isGroup = false) => {
  const dispatch = useDispatch();
  const { isReady, myFingerprint } = useAutoE2EE();
  const {
    sendMessage: sendEncryptedMessage,
    receiveMessage,
    encryptionStats,
  } = useEncryptedMessaging(chatId, peerId, isGroup);

  // Auto-initialize E2EE when component mounts
  React.useEffect(() => {
    if (!isReady) {
      console.log("🔄 [chatIntegration] Auto-initializing E2EE...");
      // The autoE2EE service will auto-initialize on its own
    }
  }, [isReady]);

  // Enhanced send message function
  const sendMessage = async (content, options = {}) => {
    console.log(
      `💬 [chatIntegration] Sending message to ${peerId || "group"}:`,
      {
        contentLength: content.length,
        chatId,
        isGroup,
      }
    );

    try {
      // Check if content is empty
      if (!content || content.trim().length === 0) {
        console.warn("⚠️ [chatIntegration] Empty message content");
        return { success: false, error: "Message content is empty" };
      }

      // Check if E2EE is ready
      if (!isReady) {
        console.warn(
          "⚠️ [chatIntegration] E2EE not ready, sending as plaintext"
        );
        return await sendPlainMessage(content, options);
      }

      // Check for special commands that shouldn't be encrypted
      if (content.startsWith("/") || content.startsWith("!")) {
        console.log(
          "🔧 [chatIntegration] Special command detected, sending as plaintext"
        );
        return await sendPlainMessage(content, options);
      }

      // Check attachments
      if (options.attachments && options.attachments.length > 0) {
        console.warn(
          "⚠️ [chatIntegration] Attachments not supported for E2EE, sending as plaintext"
        );
        return await sendPlainMessage(content, options);
      }

      // Send with auto-encryption
      const result = await sendEncryptedMessage(content, options);

      if (result.success) {
        if (result.encrypted) {
          console.log(
            "✅ [chatIntegration] Message encrypted and sent successfully"
          );

          // Show encryption indicator
          dispatch(
            showSnackbar({
              severity: "info",
              message: "Message encrypted and sent",
              autoHideDuration: 2000,
            })
          );
        } else {
          console.log(
            "📝 [chatIntegration] Message sent as plaintext (fallback)"
          );
        }

        return result;
      } else {
        console.error(
          "❌ [chatIntegration] Failed to send message:",
          result.error
        );

        // Try fallback to plaintext
        if (result.shouldFallback) {
          console.log("🔄 [chatIntegration] Falling back to plaintext...");
          return await sendPlainMessage(content, options);
        }

        return result;
      }
    } catch (error) {
      console.error("❌ [chatIntegration] Send message exception:", error);

      dispatch(
        showSnackbar({
          severity: "error",
          message: `Failed to send message: ${error.message}`,
        })
      );

      return {
        success: false,
        error: error.message,
      };
    }
  };

  // Plain message fallback
  const sendPlainMessage = async (content, options = {}) => {
    try {
      console.log(`📤 [chatIntegration] Sending plain message to ${chatId}`);

      const eventName = isGroup ? "new_group_message" : "text_message";
      const data = {
        roomId: chatId,
        content,
        to: peerId,
        attachments: options.attachments || [],
        replyTo: options.replyTo,
        type: "text",
      };

      const result = await safeEmit(eventName, data, { retry: 2 });

      return {
        success: result,
        encrypted: false,
        fallback: true,
      };
    } catch (error) {
      console.error("❌ [chatIntegration] Plain message send failed:", error);
      throw error;
    }
  };

  // Process incoming message (auto-decrypt if encrypted)
  const processIncomingMessage = async (messageData) => {
    console.log(`📨 [chatIntegration] Processing incoming message:`, {
      messageId: messageData.id,
      isEncrypted: messageData.isEncrypted,
      from: messageData.sender?.username || messageData.from,
    });

    try {
      // If not encrypted, return as-is
      if (!messageData.isEncrypted && !messageData.ciphertext) {
        console.log("📝 [chatIntegration] Not an encrypted message");
        return {
          ...messageData,
          isDecrypted: false,
          encryptionStatus: "not_encrypted",
        };
      }

      // Auto-decrypt encrypted message
      const decrypted = await receiveMessage(messageData);

      if (decrypted.isDecrypted) {
        console.log("✅ [chatIntegration] Message decrypted successfully");

        // Show decryption indicator (only first few times)
        if (encryptionStats.totalEncrypted < 5) {
          dispatch(
            showSnackbar({
              severity: "success",
              message: "Encrypted message decrypted",
              autoHideDuration: 2000,
            })
          );
        }

        return decrypted;
      } else {
        console.warn(
          "⚠️ [chatIntegration] Could not decrypt message:",
          decrypted.decryptionError
        );

        // Show error for undecryptable messages
        dispatch(
          showSnackbar({
            severity: "warning",
            message: "Unable to decrypt message",
            autoHideDuration: 3000,
            action: "RETRY",
            onAction: () => retryDecryption(messageData),
          })
        );

        return decrypted;
      }
    } catch (error) {
      console.error(
        "❌ [chatIntegration] Error processing incoming message:",
        error
      );

      return {
        ...messageData,
        isDecrypted: false,
        decryptionError: error.message,
        encryptionStatus: "error",
      };
    }
  };

  // Retry decryption
  const retryDecryption = async (messageData) => {
    console.log(
      `🔄 [chatIntegration] Retrying decryption for message: ${messageData.id}`
    );

    try {
      const result = await processIncomingMessage(messageData);

      if (result.isDecrypted) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Message decrypted on retry",
          })
        );
      }

      return result;
    } catch (error) {
      console.error("❌ [chatIntegration] Retry decryption failed:", error);
      throw error;
    }
  };

  // Get encryption status for this chat
  const getEncryptionStatus = () => {
    return {
      isReady,
      myFingerprint,
      stats: encryptionStats,
      canEncrypt: isReady && !isGroup, // Groups need special handling
      isGroup,
    };
  };

  // Manual encryption trigger (for testing/debugging)
  const manualEncryptAndSend = async (content, options = {}) => {
    console.log("🔧 [chatIntegration] Manual encrypt and send triggered");

    try {
      // Force encryption even if not ready
      const result = await sendEncryptedMessage(content, {
        ...options,
        forceEncryption: true,
      });

      if (result.success) {
        dispatch(
          showSnackbar({
            severity: "info",
            message: "Manually encrypted and sent",
          })
        );
      }

      return result;
    } catch (error) {
      console.error("❌ [chatIntegration] Manual encryption failed:", error);
      throw error;
    }
  };

  return {
    // Core functions
    sendMessage,
    processIncomingMessage,
    sendPlainMessage,

    // Status and info
    getEncryptionStatus,
    isReady,
    myFingerprint,

    // Advanced functions
    manualEncryptAndSend,
    retryDecryption,

    // Stats
    encryptionStats,
  };
};

// 🎭 HOC FOR CHAT COMPONENTS

export const withAutoEncryption = (WrappedComponent) => {
  return function WithAutoEncryptionWrapper(props) {
    const chatIntegration = useChatE2EEIntegration(
      props.chatId,
      props.peerId,
      props.isGroup
    );

    // Merge props with encryption functions
    const enhancedProps = {
      ...props,
      sendMessage: chatIntegration.sendMessage,
      processIncomingMessage: chatIntegration.processIncomingMessage,
      encryptionStatus: chatIntegration.getEncryptionStatus(),
      isEncryptionReady: chatIntegration.isReady,
    };

    return <WrappedComponent {...enhancedProps} />;
  };
};

export const withAutoDecryption = (WrappedComponent) => {
  return function WithAutoDecryptionWrapper(props) {
    const { processIncomingMessage } = useChatE2EEIntegration(
      props.chatId,
      props.peerId,
      props.isGroup
    );

    // Enhance message processing
    const enhancedProcessMessage = async (message) => {
      const processed = await processIncomingMessage(message);

      // Add encryption badge data
      return {
        ...processed,
        showEncryptionBadge: processed.isEncrypted,
        encryptionBadgeText: processed.isDecrypted
          ? "Decrypted"
          : processed.encryptionStatus === "encrypted_undecryptable"
          ? "Encrypted (key needed)"
          : "Encrypted",
      };
    };

    const enhancedProps = {
      ...props,
      processMessage: enhancedProcessMessage,
    };

    return <WrappedComponent {...enhancedProps} />;
  };
};

// 🚀 QUICK INTEGRATION FOR COMMON COMPONENTS

export const integrateChatFooter = (
  footerComponent,
  chatId,
  peerId,
  isGroup = false
) => {
  const EnhancedFooter = withAutoEncryption(footerComponent);
  return function IntegratedChatFooter(props) {
    return (
      <EnhancedFooter
        chatId={chatId}
        peerId={peerId}
        isGroup={isGroup}
        {...props}
      />
    );
  };
};

export const integrateMessageList = (
  messageListComponent,
  chatId,
  peerId,
  isGroup = false
) => {
  const EnhancedMessageList = withAutoDecryption(messageListComponent);
  return function IntegratedMessageList(props) {
    return (
      <EnhancedMessageList
        chatId={chatId}
        peerId={peerId}
        isGroup={isGroup}
        {...props}
      />
    );
  };
};

// 📊 DEBUG UTILITIES

export const debugEncryptionSystem = () => {
  console.group("🔐 E2EE DEBUG INFO");

  // Check localStorage
  const keyPair = localStorage.getItem("e2ee_keypair");
  const peerKeys = localStorage.getItem("e2ee_peer_keys");
  const cache = localStorage.getItem("e2ee_encryption_cache");

  console.log("📦 Storage:");
  console.log("  Key Pair:", keyPair ? "✅ Present" : "❌ Missing");
  console.log(
    "  Peer Keys:",
    peerKeys ? `✅ ${JSON.parse(peerKeys).length} keys` : "❌ Missing"
  );
  console.log(
    "  Cache:",
    cache ? `✅ ${Object.keys(JSON.parse(cache)).length} entries` : "❌ Missing"
  );

  // Check Web Crypto support
  console.log("🔧 Web Crypto API:");
  console.log(
    "  Supported:",
    window.crypto && window.crypto.subtle ? "✅ Yes" : "❌ No"
  );

  // Check socket connection
  const socket = getSocket();
  console.log("🔌 Socket:");
  console.log("  Connected:", socket?.connected ? "✅ Yes" : "❌ No");
  console.log("  ID:", socket?.id || "N/A");

  // Get autoE2EE status from global
  if (window.autoE2EEService) {
    console.log("🚀 Auto E2EE Service:");
    console.log(
      "  Initialized:",
      window.autoE2EEService.initialized ? "✅ Yes" : "❌ No"
    );
    console.log("  Status:", window.autoE2EEService.status);
    console.log("  My Fingerprint:", window.autoE2EEService.myFingerprint);
  }

  console.groupEnd();

  return {
    hasKeyPair: !!keyPair,
    peerKeysCount: peerKeys ? JSON.parse(peerKeys).length : 0,
    webCryptoSupported: !!(window.crypto && window.crypto.subtle),
    socketConnected: socket?.connected || false,
    autoE2EEInitialized: window.autoE2EEService?.initialized || false,
  };
};

// 🎯 AUTO-SETUP FUNCTION

export const setupChatE2EE = () => {
  console.log("🚀 [chatIntegration] Setting up chat E2EE system...");

  // Make services globally available for debugging
  if (typeof window !== "undefined") {
    import("../services/autoEncryptionService")
      .then((module) => {
        window.autoE2EEService = module.default;
        console.log(
          "✅ [chatIntegration] Auto encryption service made globally available"
        );
      })
      .catch((error) => {
        console.error(
          "❌ [chatIntegration] Failed to load auto encryption service:",
          error
        );
      });
  }

  // Start background cleanup
  setInterval(() => {
    try {
      import("../utils/encryptionHelpers").then((module) => {
        module.default.cleanupOldSessions(24); // Clean sessions older than 24h
      });
    } catch (error) {
      console.error("❌ [chatIntegration] Background cleanup failed:", error);
    }
  }, 60 * 60 * 1000); // Run every hour

  console.log("✅ [chatIntegration] Chat E2EE system setup complete");

  return {
    version: "1.0",
    timestamp: new Date().toISOString(),
    features: [
      "auto-encryption",
      "auto-decryption",
      "key-exchange",
      "background-sync",
    ],
  };
};
