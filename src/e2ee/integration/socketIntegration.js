import { getSocket } from "../../socket";
import autoEncryptionService from "../services/autoEncryptionService";
import keyExchangeService from "../services/keyExchangeService";
import { store } from "../../redux/store";
import { showSnackbar } from "../../redux/slices/app";

class SocketE2EEIntegration {
  constructor() {
    this.socket = null;
    this.isSetup = false;
    this.eventHandlers = new Map();

    console.log("🔌 [SocketE2EEIntegration] Initialized");
  }

  // 🚀 SETUP INTEGRATION
  setup(socketInstance = null) {
    if (this.isSetup) {
      console.warn("⚠️ [SocketE2EEIntegration] Already setup");
      return;
    }

    this.socket = socketInstance || getSocket();

    if (!this.socket) {
      console.error("❌ [SocketE2EEIntegration] No socket available");
      return;
    }

    console.log(
      "🔌 [SocketE2EEIntegration] Setting up with socket:",
      this.socket.id
    );

    this.setupEventHandlers();
    this.setupEmitters();
    this.setupSocketMiddleware();

    this.isSetup = true;
    console.log("✅ [SocketE2EEIntegration] Setup complete");
  }

  // 🎯 SETUP EVENT HANDLERS
  setupEventHandlers() {
    console.log("🎯 [SocketE2EEIntegration] Setting up event handlers...");

    // 1. ENCRYPTED MESSAGE HANDLING
    this.registerHandler("encrypted_message", async (data) => {
      console.log("📨 [SocketE2EEIntegration] Received encrypted message:", {
        from: data.sender?.username || data.from,
        messageId: data.id,
        hasCiphertext: !!data.ciphertext,
      });

      try {
        // Auto-decrypt if service is ready
        if (autoEncryptionService.isReady) {
          const decrypted = await autoEncryptionService.decryptMessage(
            data.ciphertext,
            data.iv,
            data.keyId,
            data.sender?.keycloakId || data.from
          );

          if (decrypted.success) {
            console.log("✅ [SocketE2EEIntegration] Auto-decrypted message");

            // Dispatch to Redux with decrypted content
            store.dispatch({
              type: "conversation/encryptedMessageDecrypted",
              payload: {
                messageId: data.id,
                original: data,
                decryptedContent: decrypted.content,
                decryptedAt: new Date(),
              },
            });
          } else {
            console.warn(
              "⚠️ [SocketE2EEIntegration] Auto-decryption failed:",
              decrypted.error
            );

            // Store for manual decryption later
            store.dispatch({
              type: "conversation/encryptedMessageReceived",
              payload: {
                ...data,
                decryptionError: decrypted.error,
                needsManualDecryption: true,
              },
            });
          }
        } else {
          console.warn(
            "⚠️ [SocketE2EEIntegration] Auto-encryption service not ready"
          );
          store.dispatch({
            type: "conversation/encryptedMessageReceived",
            payload: data,
          });
        }
      } catch (error) {
        console.error(
          "❌ [SocketE2EEIntegration] Error handling encrypted message:",
          error
        );

        store.dispatch(
          showSnackbar({
            severity: "error",
            message: "Error processing encrypted message",
          })
        );
      }
    });

    // 2. ENCRYPTED GROUP MESSAGE
    this.registerHandler("encrypted_group_message", async (data) => {
      console.log(
        "📨 [SocketE2EEIntegration] Received encrypted group message:",
        {
          roomId: data.room,
          from: data.sender?.username,
        }
      );

      // Similar handling as direct messages
      await this.handleEncryptedMessage(data, true);
    });

    // 3. KEY EXCHANGE REQUEST
    this.registerHandler("key_exchange_request", async (data) => {
      console.log("🤝 [SocketE2EEIntegration] Key exchange request:", {
        from: data.username || data.from,
        exchangeId: data.exchangeId,
        fingerprint: data.fingerprint,
      });

      try {
        // Auto-handle through key exchange service
        const result = await keyExchangeService.handleRequest(data);

        if (result.autoAccepted) {
          console.log("✅ [SocketE2EEIntegration] Auto-accepted key exchange");

          store.dispatch(
            showSnackbar({
              severity: "success",
              message: `Auto-accepted key exchange with ${
                data.username || "friend"
              }`,
              autoHideDuration: 3000,
            })
          );
        } else if (result.awaitingConfirmation) {
          console.log("⏳ [SocketE2EEIntegration] Awaiting user confirmation");

          // Show notification for user to confirm
          store.dispatch(
            showSnackbar({
              severity: "info",
              message: `Key exchange request from ${data.username || "user"}`,
              autoHideDuration: 8000,
              action: "ACCEPT",
              onAction: () => {
                this.socket.emit("confirm_key_exchange", {
                  exchangeId: data.exchangeId,
                  peerId: data.from,
                  publicKey: data.publicKey,
                  fingerprint: data.fingerprint,
                  verified: true,
                });
              },
            })
          );
        }
      } catch (error) {
        console.error(
          "❌ [SocketE2EEIntegration] Error handling key exchange:",
          error
        );
      }
    });

    // 4. KEY EXCHANGE CONFIRMED
    this.registerHandler("key_exchange_confirmed", (data) => {
      console.log("✅ [SocketE2EEIntegration] Key exchange confirmed:", {
        from: data.from,
        exchangeId: data.exchangeId,
      });

      // Update encryption status
      store.dispatch({
        type: "conversation/setEncryptionStatus",
        payload: {
          peerId: data.from,
          status: "encrypted",
          fingerprint: data.fingerprint,
          confirmedAt: new Date(),
        },
      });

      store.dispatch(
        showSnackbar({
          severity: "success",
          message: "End-to-end encryption established!",
          autoHideDuration: 3000,
        })
      );
    });

    // 5. FRIEND E2EE STATUS CHANGED
    this.registerHandler("friend_e2ee_status_changed", (data) => {
      console.log(
        "🔐 [SocketE2EEIntegration] Friend E2EE status changed:",
        data
      );

      store.dispatch({
        type: "conversation/updateFriendE2EEStatus",
        payload: {
          friendId: data.userId,
          e2eeEnabled: data.enabled,
          updatedAt: data.timestamp,
        },
      });

      const message = data.enabled
        ? `${data.username} enabled end-to-end encryption`
        : `${data.username} disabled end-to-end encryption`;

      store.dispatch(
        showSnackbar({
          severity: data.enabled ? "info" : "warning",
          message,
          autoHideDuration: 3000,
        })
      );
    });

    // 6. FRIEND KEY UPDATED
    this.registerHandler("friend_e2ee_key_updated", (data) => {
      console.log("🔑 [SocketE2EEIntegration] Friend key updated:", data);

      // Update peer key in storage
      autoEncryptionService.peerKeys.set(data.userId, {
        publicKey: data.publicKey,
        fingerprint: data.fingerprint,
        keyType: data.keyType,
        lastUpdated: new Date(),
      });

      store.dispatch(
        showSnackbar({
          severity: "info",
          message: `${data.username} updated their encryption key`,
          autoHideDuration: 3000,
        })
      );
    });

    // 7. E2EE ERROR EVENTS
    this.registerHandler("e2ee_error", (data) => {
      console.error("❌ [SocketE2EEIntegration] E2EE error:", data);

      store.dispatch(
        showSnackbar({
          severity: "error",
          message: `Encryption error: ${data.message || "Unknown error"}`,
          autoHideDuration: 5000,
        })
      );
    });

    // 8. HEALTH CHECK RESPONSE
    this.registerHandler("e2ee_health_check", (data) => {
      console.log("🏥 [SocketE2EEIntegration] Health check:", data);

      // Update service status
      autoEncryptionService.emit("health_check", data);
    });

    console.log("✅ [SocketE2EEIntegration] Event handlers registered");
  }

  // 🚀 SETUP EMITTERS
  setupEmitters() {
    console.log("🚀 [SocketE2EEIntegration] Setting up emitters...");

    // Wrap socket.emit to add encryption automatically
    const originalEmit = this.socket.emit.bind(this.socket);

    this.socket.emit = (event, data, callback) => {
      // Intercept specific events for auto-encryption
      if (event === "text_message" || event === "new_group_message") {
        this.handleOutgoingMessage(event, data, callback, originalEmit);
        return;
      }

      // Pass through other events
      return originalEmit(event, data, callback);
    };

    console.log("✅ [SocketE2EEIntegration] Emitters setup complete");
  }

  // 🛡️ SOCKET MIDDLEWARE
  setupSocketMiddleware() {
    console.log("🛡️ [SocketE2EEIntegration] Setting up socket middleware...");

    // Intercept socket connection for auto E2EE initialization
    const originalConnect = this.socket.connect.bind(this.socket);

    this.socket.connect = (...args) => {
      console.log(
        "🔌 [SocketE2EEIntegration] Socket connecting, initializing E2EE..."
      );

      // Initialize E2EE when socket connects
      this.socket.once("connect", () => {
        console.log(
          "✅ [SocketE2EEIntegration] Socket connected, starting E2EE..."
        );
        setTimeout(() => {
          autoEncryptionService.initialize().catch((error) => {
            console.error(
              "❌ [SocketE2EEIntegration] Auto E2EE initialization failed:",
              error
            );
          });
        }, 1000);
      });

      return originalConnect(...args);
    };

    console.log("✅ [SocketE2EEIntegration] Socket middleware setup complete");
  }

  // 🔧 HELPER METHODS

  async handleEncryptedMessage(data, isGroup = false) {
    try {
      const decrypted = await autoEncryptionService.decryptMessage(
        data.ciphertext,
        data.iv,
        data.keyId,
        data.sender?.keycloakId || data.from
      );

      if (decrypted.success) {
        const eventType = isGroup
          ? "conversation/groupMessageDecrypted"
          : "conversation/messageDecrypted";

        store.dispatch({
          type: eventType,
          payload: {
            messageId: data.id,
            roomId: data.room || data.roomId,
            decryptedContent: decrypted.content,
            original: data,
            decryptedAt: new Date(),
          },
        });

        return { success: true, decrypted: true };
      } else {
        store.dispatch({
          type: isGroup
            ? "conversation/encryptedGroupMessageReceived"
            : "conversation/encryptedMessageReceived",
          payload: {
            ...data,
            decryptionError: decrypted.error,
            isGroup,
          },
        });

        return { success: false, error: decrypted.error };
      }
    } catch (error) {
      console.error(
        "❌ [SocketE2EEIntegration] Error in handleEncryptedMessage:",
        error
      );
      return { success: false, error: error.message };
    }
  }

  async handleOutgoingMessage(event, data, callback, originalEmit) {
    console.log("📤 [SocketE2EEIntegration] Handling outgoing message:", {
      event,
      roomId: data.roomId,
      to: data.to,
    });

    try {
      // Check if auto-encryption is enabled and ready
      const autoEncrypt =
        localStorage.getItem("auto_encryption_enabled") !== "false";

      if (!autoEncrypt || !autoEncryptionService.isReady) {
        console.log("📝 [SocketE2EEIntegration] Sending as plaintext");
        return originalEmit(event, data, callback);
      }

      // Determine peer ID
      let peerId;
      if (event === "text_message") {
        peerId = data.to;
      } else if (event === "new_group_message") {
        // For groups, we need to handle each member separately
        // For now, just send as plaintext
        console.log(
          "👥 [SocketE2EEIntegration] Group message, sending as plaintext"
        );
        return originalEmit(event, data, callback);
      }

      if (!peerId) {
        console.warn(
          "⚠️ [SocketE2EEIntegration] No peer ID, sending as plaintext"
        );
        return originalEmit(event, data, callback);
      }

      // Check if we can encrypt to this peer
      const canEncrypt = await autoEncryptionService.canEncryptTo(peerId);

      if (!canEncrypt.canEncrypt) {
        console.warn(
          "⚠️ [SocketE2EEIntegration] Cannot encrypt to peer, sending as plaintext"
        );
        return originalEmit(event, data, callback);
      }

      // Encrypt the message
      const encryptionResult = await autoEncryptionService.encryptMessage(
        data.content,
        peerId
      );

      if (!encryptionResult.success) {
        console.error(
          "❌ [SocketE2EEIntegration] Encryption failed:",
          encryptionResult.error
        );
        return originalEmit(event, data, callback);
      }

      // Send encrypted message
      const encryptedData = {
        roomId: data.roomId,
        ciphertext: encryptionResult.ciphertext,
        iv: encryptionResult.iv,
        keyId: encryptionResult.keyId,
        algorithm: encryptionResult.algorithm,
        replyTo: data.replyTo,
      };

      console.log("🔐 [SocketE2EEIntegration] Sending encrypted message");
      return originalEmit("send_encrypted_message", encryptedData, callback);
    } catch (error) {
      console.error(
        "❌ [SocketE2EEIntegration] Error in handleOutgoingMessage:",
        error
      );
      // Fallback to plaintext
      return originalEmit(event, data, callback);
    }
  }

  registerHandler(event, handler) {
    if (!this.socket) {
      console.error(
        `❌ [SocketE2EEIntegration] Cannot register handler for ${event}: no socket`
      );
      return;
    }

    const wrappedHandler = async (...args) => {
      try {
        await handler(...args);
      } catch (error) {
        console.error(
          `❌ [SocketE2EEIntegration] Error in handler for ${event}:`,
          error
        );
      }
    };

    this.socket.on(event, wrappedHandler);
    this.eventHandlers.set(event, wrappedHandler);

    console.log(`✅ [SocketE2EEIntegration] Handler registered for: ${event}`);
  }

  unregisterHandler(event) {
    if (this.eventHandlers.has(event)) {
      const handler = this.eventHandlers.get(event);
      this.socket.off(event, handler);
      this.eventHandlers.delete(event);
      console.log(
        `✅ [SocketE2EEIntegration] Handler unregistered for: ${event}`
      );
    }
  }

  cleanup() {
    console.log("🧹 [SocketE2EEIntegration] Cleaning up...");

    // Remove all event handlers
    for (const [event, handler] of this.eventHandlers.entries()) {
      this.socket.off(event, handler);
    }

    this.eventHandlers.clear();
    this.isSetup = false;

    console.log("✅ [SocketE2EEIntegration] Cleanup complete");
  }

  // 🚀 PUBLIC API

  emitEncryptedMessage(data) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      this.socket.emit("send_encrypted_message", data, (response) => {
        console.log(
          "📤 [SocketE2EEIntegration] Encrypted message sent:",
          response
        );
        resolve(response);
      });
    });
  }

  emitKeyExchange(peerId) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      this.socket.emit("initiate_key_exchange", { peerId }, (response) => {
        console.log(
          "🤝 [SocketE2EEIntegration] Key exchange initiated:",
          response
        );
        resolve(response);
      });
    });
  }

  emitToggleE2EE(enabled) {
    if (!this.socket) {
      throw new Error("Socket not connected");
    }

    return new Promise((resolve) => {
      this.socket.emit("toggle_e2ee", { enabled }, (response) => {
        console.log(
          `🔧 [SocketE2EEIntegration] E2EE ${
            enabled ? "enabled" : "disabled"
          }:`,
          response
        );
        resolve(response);
      });
    });
  }

  getStatus() {
    return {
      isSetup: this.isSetup,
      socketConnected: this.socket?.connected || false,
      socketId: this.socket?.id,
      handlersRegistered: Array.from(this.eventHandlers.keys()),
      autoE2EEReady: autoEncryptionService.isReady,
    };
  }
}

// Singleton instance
const socketE2EEIntegration = new SocketE2EEIntegration();

// Export functions for easy use
export const setupSocketE2EEIntegration = (socket = null) => {
  socketE2EEIntegration.setup(socket);
};

export const cleanupSocketE2EEIntegration = () => {
  socketE2EEIntegration.cleanup();
};

export const getSocketE2EEIntegration = () => socketE2EEIntegration;

export default socketE2EEIntegration;
