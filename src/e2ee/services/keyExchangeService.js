import { EventEmitter } from "events";
import { getSocket } from "../../socket";
import { store } from "../../redux/store";
import { showSnackbar } from "../../redux/slices/app";

class KeyExchangeService extends EventEmitter {
  constructor() {
    super();
    this.pendingExchanges = new Map(); // exchangeId -> { peerId, timestamp, status }
    this.completedExchanges = new Map(); // peerId -> { fingerprint, verified, timestamp }
    this.retryCounts = new Map(); // peerId -> retryCount
    this.maxRetries = 3;
    this.retryDelay = 5000; // 5 seconds

    console.log("🔑 [KeyExchangeService] Initialized");
  }

  // Initiate key exchange with a peer
  async initiate(peerId) {
    console.log(
      `🤝 [KeyExchangeService] Initiating key exchange with ${peerId}`
    );

    const socket = getSocket();
    if (!socket || !socket.connected) {
      console.error("❌ [KeyExchangeService] Socket not connected");
      throw new Error("Socket not connected");
    }

    try {
      // Check if already exchanging
      const existingExchange = Array.from(this.pendingExchanges.values()).find(
        (ex) => ex.peerId === peerId && ex.status === "pending"
      );

      if (existingExchange) {
        console.log(
          `⚠️ [KeyExchangeService] Already exchanging keys with ${peerId}`
        );
        return {
          success: false,
          error: "Key exchange already in progress",
          exchangeId: existingExchange.exchangeId,
        };
      }

      // Check retry count
      const retryCount = this.retryCounts.get(peerId) || 0;
      if (retryCount >= this.maxRetries) {
        console.error(
          `❌ [KeyExchangeService] Max retries reached for ${peerId}`
        );
        throw new Error(`Max retry attempts (${this.maxRetries}) reached`);
      }

      // Emit initiate event
      const response = await new Promise((resolve) => {
        socket.emit("initiate_key_exchange", { peerId }, (res) => {
          console.log("📨 [KeyExchangeService] Initiate response:", res);
          resolve(res);
        });
      });

      if (response?.success) {
        const { exchangeId, fingerprint } = response.data;

        // Store pending exchange
        this.pendingExchanges.set(exchangeId, {
          peerId,
          fingerprint,
          timestamp: new Date(),
          status: "pending",
        });

        // Update retry count
        this.retryCounts.set(peerId, retryCount + 1);

        // Emit event
        this.emit("exchangeInitiated", {
          exchangeId,
          peerId,
          fingerprint,
          timestamp: new Date(),
        });

        console.log(`✅ [KeyExchangeService] Key exchange initiated:`, {
          exchangeId,
          peerId,
          fingerprint,
        });

        // Show notification
        store.dispatch(
          showSnackbar({
            severity: "info",
            message: `Initiating key exchange with user`,
            autoHideDuration: 3000,
          })
        );

        return {
          success: true,
          exchangeId,
          fingerprint,
          data: response.data,
        };
      } else {
        console.error(
          `❌ [KeyExchangeService] Initiate failed:`,
          response?.error
        );
        throw new Error(response?.error || "Key exchange initiation failed");
      }
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Initiate exception:`, error);

      // Auto-retry if not max retries
      const retryCount = this.retryCounts.get(peerId) || 0;
      if (retryCount < this.maxRetries) {
        console.log(
          `🔄 [KeyExchangeService] Scheduling retry ${
            retryCount + 1
          } for ${peerId}`
        );
        setTimeout(
          () => this.retryInitiate(peerId),
          this.retryDelay * (retryCount + 1)
        );
      }

      throw error;
    }
  }

  // Retry initiate
  async retryInitiate(peerId) {
    console.log(`🔄 [KeyExchangeService] Retrying key exchange with ${peerId}`);

    try {
      return await this.initiate(peerId);
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Retry failed:`, error);

      const retryCount = this.retryCounts.get(peerId) || 0;
      if (retryCount >= this.maxRetries) {
        // Notify user about max retries
        store.dispatch(
          showSnackbar({
            severity: "error",
            message: `Failed to establish encryption after ${this.maxRetries} attempts`,
            autoHideDuration: 5000,
          })
        );
      }

      throw error;
    }
  }

  // Handle incoming key exchange request
  async handleRequest(request) {
    console.log(
      `📨 [KeyExchangeService] Handling key exchange request:`,
      request
    );

    const { from: peerId, exchangeId, fingerprint, username } = request;

    try {
      // Auto-accept if friend
      const isFriend = await this.isFriend(peerId);

      if (isFriend) {
        console.log(
          `✅ [KeyExchangeService] Auto-accepting key exchange from friend ${
            username || peerId
          }`
        );

        // Confirm the exchange
        await this.confirmExchange(exchangeId, peerId, fingerprint, true);

        return {
          success: true,
          autoAccepted: true,
          peerId,
          fingerprint,
        };
      } else {
        console.log(
          `⚠️ [KeyExchangeService] Key exchange from non-friend ${peerId}, awaiting user confirmation`
        );

        // Store for manual confirmation
        this.pendingExchanges.set(exchangeId, {
          peerId,
          fingerprint,
          timestamp: new Date(),
          status: "awaiting_confirmation",
          username,
        });

        // Show notification for user to confirm
        store.dispatch(
          showSnackbar({
            severity: "info",
            message: `Key exchange request from ${username || "unknown user"}`,
            autoHideDuration: 8000,
            action: "CONFIRM",
            onAction: () =>
              this.confirmExchange(exchangeId, peerId, fingerprint, true),
          })
        );

        return {
          success: true,
          awaitingConfirmation: true,
          peerId,
          fingerprint,
          username,
        };
      }
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Handle request error:`, error);
      throw error;
    }
  }

  // Confirm key exchange
  async confirmExchange(exchangeId, peerId, fingerprint, verified = false) {
    console.log(`✅ [KeyExchangeService] Confirming key exchange:`, {
      exchangeId,
      peerId,
      fingerprint,
      verified,
    });

    const socket = getSocket();
    if (!socket) {
      throw new Error("Socket not connected");
    }

    try {
      // Get public key from pending exchange or request from server
      let publicKey;
      const pendingExchange = this.pendingExchanges.get(exchangeId);

      if (pendingExchange?.publicKey) {
        publicKey = pendingExchange.publicKey;
      } else {
        // Request peer's public key
        const keyResponse = await new Promise((resolve) => {
          socket.emit("request_e2ee_key", { userId: peerId }, resolve);
        });

        if (keyResponse?.success) {
          publicKey = keyResponse.data.publicKey;
        } else {
          throw new Error("Failed to get peer public key");
        }
      }

      // Send confirmation
      const response = await new Promise((resolve) => {
        socket.emit(
          "confirm_key_exchange",
          {
            exchangeId,
            peerId,
            publicKey,
            fingerprint,
            verified,
          },
          resolve
        );
      });

      if (response?.success) {
        // Mark as completed
        this.pendingExchanges.delete(exchangeId);
        this.completedExchanges.set(peerId, {
          fingerprint,
          verified,
          timestamp: new Date(),
          publicKey,
        });

        // Reset retry count
        this.retryCounts.delete(peerId);

        // Save to localStorage
        this.savePeerKey(peerId, {
          publicKey,
          fingerprint,
          verified,
          lastUpdated: new Date(),
        });

        // Emit event
        this.emit("exchangeCompleted", {
          peerId,
          fingerprint,
          verified,
          timestamp: new Date(),
        });

        console.log(
          `🎉 [KeyExchangeService] Key exchange completed with ${peerId}`
        );

        // Show success notification
        store.dispatch(
          showSnackbar({
            severity: "success",
            message: `End-to-end encryption established ${
              verified ? "and verified" : ""
            }`,
            autoHideDuration: 3000,
          })
        );

        return {
          success: true,
          peerId,
          fingerprint,
          verified,
        };
      } else {
        console.error(
          `❌ [KeyExchangeService] Confirm failed:`,
          response?.error
        );
        throw new Error(response?.error || "Confirmation failed");
      }
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Confirm exception:`, error);
      throw error;
    }
  }

  // Verify key fingerprint
  async verifyKey(publicKey, expectedFingerprint) {
    console.log(`🔍 [KeyExchangeService] Verifying key fingerprint`);

    try {
      const socket = getSocket();
      if (!socket) {
        throw new Error("Socket not connected");
      }

      const response = await new Promise((resolve) => {
        socket.emit(
          "verify_fingerprint",
          {
            publicKey,
            expectedFingerprint,
          },
          resolve
        );
      });

      if (response?.success) {
        const { matches, calculatedFingerprint } = response.data;

        console.log(`🔐 [KeyExchangeService] Fingerprint verification:`, {
          matches,
          expected: expectedFingerprint,
          calculated: calculatedFingerprint,
        });

        return {
          success: true,
          matches,
          calculatedFingerprint,
          expectedFingerprint,
        };
      } else {
        console.error(
          `❌ [KeyExchangeService] Verification failed:`,
          response?.error
        );
        throw new Error(response?.error || "Verification failed");
      }
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Verify exception:`, error);
      throw error;
    }
  }

  // Check if user is friend
  async isFriend(peerId) {
    try {
      // Get friends from Redux store
      const state = store.getState();
      const friends = state.conversation?.friends || [];

      return friends.some(
        (friend) => friend.keycloakId === peerId || friend.id === peerId
      );
    } catch (error) {
      console.error(
        `❌ [KeyExchangeService] Error checking friend status:`,
        error
      );
      return false;
    }
  }

  // Save peer key to localStorage
  savePeerKey(peerId, keyInfo) {
    try {
      const existing = JSON.parse(
        localStorage.getItem("e2ee_peer_keys") || "[]"
      );
      const updated = existing.filter((k) => k.peerId !== peerId);
      updated.push({ peerId, ...keyInfo });
      localStorage.setItem("e2ee_peer_keys", JSON.stringify(updated));

      console.log(`💾 [KeyExchangeService] Saved peer key for ${peerId}`);
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Error saving peer key:`, error);
    }
  }

  // Load peer key from localStorage
  loadPeerKey(peerId) {
    try {
      const keys = JSON.parse(localStorage.getItem("e2ee_peer_keys") || "[]");
      return keys.find((k) => k.peerId === peerId);
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Error loading peer key:`, error);
      return null;
    }
  }

  // Get exchange status for a peer
  getExchangeStatus(peerId) {
    const completed = this.completedExchanges.get(peerId);
    if (completed) {
      return {
        status: "completed",
        verified: completed.verified,
        timestamp: completed.timestamp,
        fingerprint: completed.fingerprint,
      };
    }

    const pending = Array.from(this.pendingExchanges.values()).find(
      (ex) => ex.peerId === peerId
    );

    if (pending) {
      return {
        status: pending.status,
        timestamp: pending.timestamp,
        fingerprint: pending.fingerprint,
      };
    }

    return { status: "not_started" };
  }

  // Cleanup old pending exchanges
  cleanupOldExchanges(maxAge = 24 * 60 * 60 * 1000) {
    // 24 hours
    const now = Date.now();

    for (const [exchangeId, exchange] of this.pendingExchanges.entries()) {
      const age = now - exchange.timestamp.getTime();
      if (age > maxAge) {
        console.log(
          `🗑️ [KeyExchangeService] Cleaning up old exchange: ${exchangeId}`
        );
        this.pendingExchanges.delete(exchangeId);
      }
    }
  }

  // Get stats
  getStats() {
    return {
      pendingExchanges: this.pendingExchanges.size,
      completedExchanges: this.completedExchanges.size,
      retryCounts: Object.fromEntries(this.retryCounts.entries()),
    };
  }
}

// Singleton instance
const keyExchangeService = new KeyExchangeService();
export default keyExchangeService;
