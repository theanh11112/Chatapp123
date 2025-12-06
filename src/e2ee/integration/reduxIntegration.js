import { store } from "../../redux/store";
import autoEncryptionService from "../services/autoEncryptionService";
import keyExchangeService from "../services/keyExchangeService";
import { showSnackbar } from "../../redux/slices/app";

// 🎯 REDUX MIDDLEWARE FOR AUTO-DECRYPTION
export const e2eeReduxMiddleware = (storeAPI) => (next) => (action) => {
  const result = next(action);

  // 🎭 HANDLE INCOMING ENCRYPTED MESSAGES
  if (
    action.type === "conversation/addMessage" ||
    action.type === "conversation/addGroupMessage"
  ) {
    const message = action.payload.message;

    if (message.isEncrypted || message.ciphertext) {
      console.log(
        `🔐 [reduxIntegration] Detected encrypted message: ${message.id}`
      );

      // Schedule auto-decryption
      setTimeout(async () => {
        try {
          const senderId = message.sender?.keycloakId || message.from;

          if (!senderId) {
            console.warn(
              "⚠️ [reduxIntegration] No sender ID for encrypted message"
            );
            return;
          }

          const decrypted = await autoEncryptionService.decryptMessage(
            message.ciphertext,
            message.iv,
            message.keyId,
            senderId
          );

          if (decrypted.success) {
            console.log(
              `✅ [reduxIntegration] Auto-decrypted message ${message.id}`
            );

            // Dispatch update action
            storeAPI.dispatch({
              type: "conversation/updateMessageDecryption",
              payload: {
                messageId: message.id,
                chatId:
                  message.conversation_id || message.room || message.roomId,
                updates: {
                  content: decrypted.content,
                  isDecrypted: true,
                  encryptionStatus: "decrypted",
                  decryptedAt: new Date().toISOString(),
                  originalCiphertext: message.ciphertext, // Keep original for verification
                },
              },
            });

            // Show success notification (only first few times)
            const state = storeAPI.getState();
            const decryptedCount =
              state.conversation?.e2eeStats?.decryptedCount || 0;

            if (decryptedCount < 3) {
              storeAPI.dispatch(
                showSnackbar({
                  severity: "success",
                  message: "Encrypted message decrypted",
                  autoHideDuration: 2000,
                })
              );
            }
          } else {
            console.warn(
              `⚠️ [reduxIntegration] Failed to auto-decrypt:`,
              decrypted.error
            );

            // Mark as needing manual decryption
            storeAPI.dispatch({
              type: "conversation/updateMessageDecryption",
              payload: {
                messageId: message.id,
                chatId:
                  message.conversation_id || message.room || message.roomId,
                updates: {
                  isDecrypted: false,
                  decryptionError: decrypted.error,
                  encryptionStatus: "needs_manual_decryption",
                  canRetryDecryption: true,
                },
              },
            });
          }
        } catch (error) {
          console.error(`❌ [reduxIntegration] Auto-decryption error:`, error);
        }
      }, 100); // Small delay to ensure Redux state is updated
    }
  }

  // 🔑 HANDLE E2EE STATUS UPDATES
  if (action.type === "conversation/setE2EEStatus") {
    const { peerId, status } = action.payload;

    console.log(
      `🔐 [reduxIntegration] E2EE status updated for ${peerId}: ${status}`
    );

    // If status is 'encrypted', auto-initiate key exchange if needed
    if (status === "encrypted" && peerId) {
      setTimeout(async () => {
        try {
          const hasKey = autoEncryptionService.peerKeys.has(peerId);

          if (!hasKey) {
            console.log(
              `🔄 [reduxIntegration] No key for ${peerId}, auto-requesting...`
            );

            const keyInfo = await autoEncryptionService.requestPeerKey(peerId);
            if (keyInfo) {
              console.log(`✅ [reduxIntegration] Got key for ${peerId}`);
            }
          }
        } catch (error) {
          console.error(
            `❌ [reduxIntegration] Error auto-requesting key:`,
            error
          );
        }
      }, 2000);
    }
  }

  // 👥 HANDLE NEW FRIEND ADDED
  if (
    action.type === "conversation/addFriend" ||
    action.type === "conversation/updateFriendsList"
  ) {
    const friends = action.payload.friends || [action.payload.friend];

    // Auto-initiate key exchange with new friends
    friends.forEach((friend) => {
      if (friend.keycloakId) {
        setTimeout(async () => {
          try {
            const hasKey = autoEncryptionService.peerKeys.has(
              friend.keycloakId
            );
            const isEncrypted = storeAPI
              .getState()
              .conversation?.e2eeStatus?.encryptedChats?.has(friend.keycloakId);

            if (!hasKey && !isEncrypted) {
              console.log(
                `🤝 [reduxIntegration] Auto-initiating key exchange with new friend: ${friend.username}`
              );

              const success = await keyExchangeService.initiate(
                friend.keycloakId
              );
              if (success) {
                console.log(
                  `✅ [reduxIntegration] Key exchange initiated with ${friend.username}`
                );
              }
            }
          } catch (error) {
            console.error(
              `❌ [reduxIntegration] Error auto-initiating key exchange:`,
              error
            );
          }
        }, 3000); // Wait 3 seconds before auto-initiating
      }
    });
  }

  return result;
};

// 🎯 REDUX ACTIONS FOR E2EE
export const e2eeActions = {
  // Set E2EE status for a chat
  setE2EEStatus: (peerId, status, fingerprint = null) => ({
    type: "conversation/setE2EEStatus",
    payload: { peerId, status, fingerprint },
  }),

  // Add chat to encrypted chats list
  addEncryptedChat: (chatId) => ({
    type: "conversation/addEncryptedChat",
    payload: chatId,
  }),

  // Update peer key info
  updatePeerKey: (peerId, keyInfo) => ({
    type: "conversation/updatePeerKey",
    payload: { peerId, keyInfo },
  }),

  // Mark message as decrypted
  markMessageDecrypted: (messageId, content, chatId = null) => ({
    type: "conversation/markMessageDecrypted",
    payload: { messageId, content, chatId },
  }),

  // Request key exchange
  requestKeyExchange: (peerId) => async (dispatch) => {
    try {
      console.log(
        `🤝 [reduxIntegration] Requesting key exchange with ${peerId}`
      );

      dispatch(
        showSnackbar({
          severity: "info",
          message: "Initiating key exchange...",
        })
      );

      const result = await keyExchangeService.initiate(peerId);

      if (result.success) {
        dispatch(
          showSnackbar({
            severity: "success",
            message: "Key exchange initiated successfully",
          })
        );

        dispatch({
          type: "conversation/setE2EEStatus",
          payload: {
            peerId,
            status: "key_exchange_pending",
            fingerprint: result.fingerprint,
          },
        });
      } else {
        dispatch(
          showSnackbar({
            severity: "error",
            message: `Key exchange failed: ${result.error}`,
          })
        );
      }
    } catch (error) {
      console.error(`❌ [reduxIntegration] Key exchange error:`, error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Key exchange error: ${error.message}`,
        })
      );
    }
  },

  // Manually decrypt a message
  decryptMessage: (messageId, chatId) => async (dispatch) => {
    try {
      console.log(
        `🔐 [reduxIntegration] Manual decryption for message ${messageId}`
      );

      dispatch(
        showSnackbar({
          severity: "info",
          message: "Decrypting message...",
        })
      );

      // Get message from state
      const state = store.getState();
      const chat = state.conversation.chats?.[chatId];
      const message = chat?.messages?.find((m) => m.id === messageId);

      if (!message) {
        throw new Error("Message not found");
      }

      if (!message.ciphertext) {
        throw new Error("Message is not encrypted");
      }

      const senderId = message.sender?.keycloakId || message.from;
      const decrypted = await autoEncryptionService.decryptMessage(
        message.ciphertext,
        message.iv,
        message.keyId,
        senderId
      );

      if (decrypted.success) {
        dispatch(
          e2eeActions.markMessageDecrypted(messageId, decrypted.content, chatId)
        );

        dispatch(
          showSnackbar({
            severity: "success",
            message: "Message decrypted successfully",
          })
        );
      } else {
        throw new Error(decrypted.error);
      }
    } catch (error) {
      console.error(`❌ [reduxIntegration] Manual decryption error:`, error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Decryption failed: ${error.message}`,
        })
      );
    }
  },

  // Regenerate encryption keys
  regenerateKeys: () => async (dispatch) => {
    try {
      console.log("🔄 [reduxIntegration] Regenerating encryption keys");

      dispatch(
        showSnackbar({
          severity: "info",
          message: "Generating new encryption keys...",
        })
      );

      await autoEncryptionService.initializeKeyPair();

      dispatch(
        showSnackbar({
          severity: "success",
          message: "New encryption keys generated successfully",
        })
      );

      // Update Redux state with new fingerprint
      const fingerprint = autoEncryptionService.getMyFingerprint();
      dispatch({
        type: "conversation/updateMyFingerprint",
        payload: fingerprint,
      });
    } catch (error) {
      console.error("❌ [reduxIntegration] Error regenerating keys:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Failed to regenerate keys: ${error.message}`,
        })
      );
    }
  },

  // Toggle auto-encryption
  toggleAutoEncryption: (enabled) => async (dispatch) => {
    try {
      console.log(`🔧 [reduxIntegration] Toggling auto-encryption: ${enabled}`);

      // Save preference
      localStorage.setItem("auto_encryption_enabled", JSON.stringify(enabled));

      dispatch({
        type: "conversation/setAutoEncryption",
        payload: enabled,
      });

      dispatch(
        showSnackbar({
          severity: "success",
          message: `Auto-encryption ${enabled ? "enabled" : "disabled"}`,
        })
      );
    } catch (error) {
      console.error(
        "❌ [reduxIntegration] Error toggling auto-encryption:",
        error
      );
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Failed to toggle auto-encryption: ${error.message}`,
        })
      );
    }
  },

  // Export E2EE data
  exportE2EEData: () => async (dispatch) => {
    try {
      console.log("📤 [reduxIntegration] Exporting E2EE data");

      // Get data from services
      const exportData = {
        autoEncryptionService: {
          isReady: autoEncryptionService.isReady,
          myFingerprint: autoEncryptionService.getMyFingerprint(),
          peerKeysCount: autoEncryptionService.peerKeys.size,
        },
        keyExchangeService: keyExchangeService.getStats(),
        localStorage: {
          hasKeyPair: !!localStorage.getItem("e2ee_keypair"),
          peerKeys: JSON.parse(localStorage.getItem("e2ee_peer_keys") || "[]")
            .length,
        },
        timestamp: new Date().toISOString(),
      };

      // Create download
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `e2ee_export_${
        new Date().toISOString().split("T")[0]
      }.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      dispatch(
        showSnackbar({
          severity: "success",
          message: "E2EE data exported successfully",
        })
      );
    } catch (error) {
      console.error("❌ [reduxIntegration] Error exporting E2EE data:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Export failed: ${error.message}`,
        })
      );
    }
  },

  // Clear all E2EE data (debug/cleanup)
  clearAllE2EEData: () => async (dispatch) => {
    try {
      console.log("🧹 [reduxIntegration] Clearing all E2EE data");

      if (
        !window.confirm(
          "This will delete all encryption keys and data. Are you sure?"
        )
      ) {
        return;
      }

      // Clear services
      autoEncryptionService.cleanup();

      // Clear localStorage
      const keysToRemove = [
        "e2ee_keypair",
        "e2ee_peer_keys",
        "e2ee_encryption_cache",
        "e2ee_sessions",
        "e2ee_error_log",
        "auto_encryption_enabled",
      ];

      keysToRemove.forEach((key) => localStorage.removeItem(key));

      // Clear Redux state
      dispatch({
        type: "conversation/resetE2EEState",
      });

      dispatch(
        showSnackbar({
          severity: "success",
          message: "All E2EE data cleared successfully",
        })
      );

      // Reload to restart
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("❌ [reduxIntegration] Error clearing E2EE data:", error);
      dispatch(
        showSnackbar({
          severity: "error",
          message: `Clear failed: ${error.message}`,
        })
      );
    }
  },
};

// 🎯 REDUX SELECTORS FOR E2EE
export const e2eeSelectors = {
  // Select encryption status for a chat
  selectEncryptionStatus: (state, peerId) => {
    const e2eeStatus = state.conversation?.e2eeStatus;

    if (!e2eeStatus) {
      return { status: "unknown", isEncrypted: false };
    }

    const isEncrypted = e2eeStatus.encryptedChats?.has(peerId) || false;
    const peerKey = e2eeStatus.peerKeys?.[peerId];

    return {
      status: isEncrypted ? "encrypted" : "not_encrypted",
      isEncrypted,
      peerFingerprint: peerKey?.fingerprint,
      myFingerprint: e2eeStatus.myFingerprint,
      lastUpdated: peerKey?.lastUpdated,
    };
  },

  // Check if we can encrypt to a peer
  selectCanEncryptTo: (state, peerId) => {
    const status = e2eeSelectors.selectEncryptionStatus(state, peerId);
    const autoEncryptionEnabled =
      state.conversation?.autoEncryptionEnabled !== false;

    return {
      canEncrypt: status.isEncrypted && autoEncryptionEnabled,
      reason: status.isEncrypted
        ? autoEncryptionEnabled
          ? "Ready"
          : "Auto-encryption disabled"
        : "Not encrypted",
      ...status,
    };
  },

  // Get all encrypted chats
  selectEncryptedChats: (state) => {
    const e2eeStatus = state.conversation?.e2eeStatus;
    const encryptedChats = e2eeStatus?.encryptedChats || new Set();

    return Array.from(encryptedChats).map((chatId) => ({
      chatId,
      peerKey: e2eeStatus?.peerKeys?.[chatId],
    }));
  },

  // Get E2EE statistics
  selectE2EEStats: (state) => {
    const e2eeStatus = state.conversation?.e2eeStatus || {};

    return {
      myFingerprint: e2eeStatus.myFingerprint,
      encryptedChatsCount: e2eeStatus.encryptedChats?.size || 0,
      peerKeysCount: Object.keys(e2eeStatus.peerKeys || {}).length,
      autoEncryptionEnabled:
        state.conversation?.autoEncryptionEnabled !== false,
      initialized: e2eeStatus.initialized || false,
    };
  },

  // Get messages that need manual decryption
  selectMessagesNeedingDecryption: (state, chatId = null) => {
    const chats = state.conversation?.chats || {};
    const messages = [];

    for (const [id, chat] of Object.entries(chats)) {
      if (chatId && id !== chatId) continue;

      if (chat.messages) {
        const undecrypted = chat.messages.filter(
          (m) => m.isEncrypted && !m.isDecrypted && m.ciphertext
        );
        messages.push(...undecrypted.map((m) => ({ ...m, chatId: id })));
      }
    }

    return messages;
  },

  // Get encryption health status
  selectEncryptionHealth: (state) => {
    const stats = e2eeSelectors.selectE2EEStats(state);

    const health = {
      score: 0,
      issues: [],
      recommendations: [],
    };

    // Check key pair
    if (!stats.myFingerprint) {
      health.issues.push("No encryption keys generated");
      health.recommendations.push("Generate encryption keys in Settings");
    } else {
      health.score += 25;
    }

    // Check auto-encryption
    if (!stats.autoEncryptionEnabled) {
      health.issues.push("Auto-encryption is disabled");
      health.recommendations.push("Enable auto-encryption in Settings");
    } else {
      health.score += 25;
    }

    // Check encrypted chats
    if (stats.encryptedChatsCount === 0) {
      health.issues.push("No encrypted chats");
      health.recommendations.push(
        "Start chatting with friends to enable encryption"
      );
    } else {
      health.score += 25;
    }

    // Check initialization
    if (!stats.initialized) {
      health.issues.push("Encryption system not initialized");
      health.recommendations.push(
        "Refresh the page or check console for errors"
      );
    } else {
      health.score += 25;
    }

    // Determine overall status
    if (health.score >= 75) {
      health.status = "healthy";
    } else if (health.score >= 50) {
      health.status = "warning";
    } else {
      health.status = "critical";
    }

    return health;
  },
};

// 🚀 SETUP FUNCTION
export const setupReduxE2EEIntegration = () => {
  console.log("🚀 [reduxIntegration] Setting up Redux E2EE integration...");

  // Auto-start services when Redux is ready
  const unsubscribe = store.subscribe(() => {
    const state = store.getState();
    const authUser = state.auth?.user;

    if (authUser && !autoEncryptionService.initialized) {
      console.log("🔄 [reduxIntegration] Auto-starting E2EE services...");

      // Small delay to ensure everything is loaded
      setTimeout(() => {
        autoEncryptionService.initialize().catch((error) => {
          console.error("❌ [reduxIntegration] Auto-start failed:", error);
        });
      }, 2000);

      unsubscribe(); // Only run once
    }
  });

  console.log("✅ [reduxIntegration] Redux E2EE integration setup complete");

  return {
    version: "1.0",
    middleware: e2eeReduxMiddleware,
    actions: e2eeActions,
    selectors: e2eeSelectors,
  };
};

// 🎯 DEFAULT EXPORT
const reduxE2EEIntegration = {
  middleware: e2eeReduxMiddleware,
  actions: e2eeActions,
  selectors: e2eeSelectors,
  setup: setupReduxE2EEIntegration,
};

export default reduxE2EEIntegration;
