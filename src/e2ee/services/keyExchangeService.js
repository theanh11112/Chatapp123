import { EventEmitter } from "events";
import e2eeService from "../utils/e2ee";
import { getSocket } from "../../socket";
import { store } from "../../redux/store";
import { showSnackbar } from "../../redux/slices/app";

/**
 * Key Exchange Protocol Service
 * Manages key exchange initiation, confirmation, and verification
 */

class KeyExchangeService extends EventEmitter {
  constructor() {
    super();
    this.pendingExchanges = new Map(); // exchangeId -> exchange data
    this.completedExchanges = new Map(); // peerId -> exchange data
    this.retryAttempts = new Map(); // peerId -> retry count
    this.maxRetries = 3;

    console.log("🤝 [KeyExchangeService] Initialized");
  }

  // ======================= KEY EXCHANGE INITIATION =======================

  async initiateExchange(peerId) {
    try {
      console.group(
        `🤝 [KeyExchangeService] Initiating exchange with ${peerId}`
      );

      // Check if already exchanging
      if (this.hasPendingExchange(peerId)) {
        const pending = this.getPendingExchange(peerId);
        console.log("⚠️ Exchange already pending:", pending.exchangeId);
        return {
          success: false,
          error: "Exchange already in progress",
          exchangeId: pending.exchangeId,
        };
      }

      // Check retry limit
      const retryCount = this.retryAttempts.get(peerId) || 0;
      if (retryCount >= this.maxRetries) {
        throw new Error(`Max retry attempts (${this.maxRetries}) reached`);
      }

      // Get socket
      const socket = getSocket();
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }

      // Send initiation request
      const response = await new Promise((resolve, reject) => {
        socket.emit(
          "initiate_key_exchange",
          {
            peerId,
            timestamp: Date.now(),
            initiatorFingerprint: async () =>
              await e2eeService.getMyFingerprint(),
          },
          (response) => {
            if (response?.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || "Initiation failed"));
            }
          }
        );
      });

      const { exchangeId, peerFingerprint } = response.data;

      // Store pending exchange
      this.pendingExchanges.set(exchangeId, {
        exchangeId,
        peerId,
        peerFingerprint,
        status: "pending",
        initiatedAt: new Date(),
        initiator: true,
      });

      // Update retry count
      this.retryAttempts.set(peerId, retryCount + 1);

      console.log("✅ Exchange initiated:", {
        exchangeId,
        peerId,
        peerFingerprint,
      });

      // Show notification
      store.dispatch(
        showSnackbar({
          severity: "info",
          message: `Initiating key exchange`,
          autoHideDuration: 3000,
        })
      );

      this.emit("exchangeInitiated", {
        exchangeId,
        peerId,
        peerFingerprint,
        timestamp: new Date(),
      });

      console.groupEnd();
      return {
        success: true,
        exchangeId,
        peerFingerprint,
        data: response.data,
      };
    } catch (error) {
      console.error(
        `❌ [KeyExchangeService] Initiation failed for ${peerId}:`,
        error
      );

      // Auto-retry if under limit
      const retryCount = this.retryAttempts.get(peerId) || 0;
      if (retryCount < this.maxRetries) {
        console.log(`🔄 Scheduling retry ${retryCount + 1} for ${peerId}`);
        setTimeout(() => this.retryInitiate(peerId), 5000 * (retryCount + 1));
      }

      console.groupEnd();
      throw error;
    }
  }

  async retryInitiate(peerId) {
    try {
      console.log(`🔄 [KeyExchangeService] Retrying exchange with ${peerId}`);
      return await this.initiateExchange(peerId);
    } catch (error) {
      console.error(
        `❌ [KeyExchangeService] Retry failed for ${peerId}:`,
        error
      );

      const retryCount = this.retryAttempts.get(peerId) || 0;
      if (retryCount >= this.maxRetries) {
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

  // ======================= KEY EXCHANGE HANDLING =======================

  async handleExchangeRequest(request) {
    try {
      console.group(
        `📨 [KeyExchangeService] Handling exchange request:`,
        request
      );

      const { from: peerId, exchangeId, fingerprint, username } = request;

      // Check if we already have this peer's key
      const existingKey = await e2eeService
        .getPeerPublicKey(peerId)
        .catch(() => null);
      if (existingKey?.publicKey) {
        console.log("✅ Already have key for this peer, auto-confirming");
        await this.confirmExchange(exchangeId, peerId, fingerprint, true);

        console.groupEnd();
        return {
          success: true,
          autoConfirmed: true,
          peerId,
          fingerprint,
        };
      }

      // Check if peer is a friend (auto-accept friends)
      const isFriend = await this.isFriend(peerId);
      if (isFriend) {
        console.log(
          `✅ Auto-accepting exchange from friend ${username || peerId}`
        );

        await this.confirmExchange(exchangeId, peerId, fingerprint, true);

        console.groupEnd();
        return {
          success: true,
          autoAccepted: true,
          peerId,
          fingerprint,
        };
      }

      // Store for manual confirmation
      this.pendingExchanges.set(exchangeId, {
        exchangeId,
        peerId,
        peerFingerprint: fingerprint,
        status: "awaiting_confirmation",
        requestedAt: new Date(),
        username,
        initiator: false,
      });

      // Show notification for user confirmation
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

      console.log("⏳ Awaiting user confirmation");
      this.emit("exchangeRequestReceived", {
        exchangeId,
        peerId,
        fingerprint,
        username,
        timestamp: new Date(),
      });

      console.groupEnd();
      return {
        success: true,
        awaitingConfirmation: true,
        peerId,
        fingerprint,
        username,
      };
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Error handling request:`, error);
      console.groupEnd();
      throw error;
    }
  }

  async confirmExchange(exchangeId, peerId, fingerprint, verified = false) {
    try {
      console.group(`✅ [KeyExchangeService] Confirming exchange:`, {
        exchangeId,
        peerId,
        fingerprint,
        verified,
      });

      const socket = getSocket();
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }

      // Get our public key
      const publicKey = await e2eeService.getMyPublicKey();
      const ownFingerprint = await e2eeService.getMyFingerprint();

      // Send confirmation to server
      const response = await new Promise((resolve, reject) => {
        socket.emit(
          "confirm_key_exchange",
          {
            exchangeId,
            peerId,
            publicKey,
            fingerprint: ownFingerprint,
            peerFingerprint: fingerprint,
            verified,
            timestamp: Date.now(),
          },
          (response) => {
            if (response?.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || "Confirmation failed"));
            }
          }
        );
      });

      // Mark as completed
      this.pendingExchanges.delete(exchangeId);
      this.completedExchanges.set(peerId, {
        exchangeId,
        peerId,
        fingerprint,
        verified,
        confirmedAt: new Date(),
        publicKey: response.data?.peerPublicKey,
      });

      // Reset retry count
      this.retryAttempts.delete(peerId);

      // Save peer key if provided
      if (response.data?.peerPublicKey) {
        await e2eeService.savePeerPublicKey(
          peerId,
          response.data.peerPublicKey,
          fingerprint
        );
      }

      console.log(`🎉 Exchange confirmed with ${peerId}`);

      // Show success notification
      store.dispatch(
        showSnackbar({
          severity: "success",
          message: `End-to-end encryption established${
            verified ? " and verified" : ""
          }`,
          autoHideDuration: 3000,
        })
      );

      this.emit("exchangeConfirmed", {
        exchangeId,
        peerId,
        fingerprint,
        verified,
        timestamp: new Date(),
      });

      console.groupEnd();
      return {
        success: true,
        peerId,
        fingerprint,
        verified,
        data: response.data,
      };
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Confirmation failed:`, error);
      console.groupEnd();
      throw error;
    }
  }

  async rejectExchange(exchangeId) {
    try {
      const exchange = this.pendingExchanges.get(exchangeId);
      if (!exchange) {
        throw new Error("Exchange not found");
      }

      this.pendingExchanges.delete(exchangeId);

      console.log(`❌ [KeyExchangeService] Exchange rejected: ${exchangeId}`);
      this.emit("exchangeRejected", { exchangeId, peerId: exchange.peerId });

      return { success: true, exchangeId };
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Rejection failed:`, error);
      throw error;
    }
  }

  // ======================= VERIFICATION =======================

  async verifyFingerprint(peerId, expectedFingerprint) {
    try {
      console.log(
        `🔍 [KeyExchangeService] Verifying fingerprint for ${peerId}`
      );

      const socket = getSocket();
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }

      const response = await new Promise((resolve, reject) => {
        socket.emit(
          "verify_fingerprint",
          {
            peerId,
            expectedFingerprint,
            timestamp: Date.now(),
          },
          (response) => {
            if (response?.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || "Verification failed"));
            }
          }
        );
      });

      const { matches, calculatedFingerprint } = response.data;

      console.log(`🔐 Fingerprint verification:`, {
        matches,
        expected: expectedFingerprint,
        calculated: calculatedFingerprint,
      });

      // Update verification status if matches
      if (matches) {
        const completed = this.completedExchanges.get(peerId);
        if (completed) {
          completed.verified = true;
          this.completedExchanges.set(peerId, completed);
        }
      }

      this.emit("fingerprintVerified", {
        peerId,
        matches,
        expectedFingerprint,
        calculatedFingerprint,
        timestamp: new Date(),
      });

      return {
        success: true,
        matches,
        calculatedFingerprint,
        expectedFingerprint,
      };
    } catch (error) {
      console.error(`❌ [KeyExchangeService] Verification failed:`, error);
      throw error;
    }
  }

  // ======================= UTILITY METHODS =======================

  async isFriend(peerId) {
    try {
      const state = store.getState();
      const friends = state.conversation?.friends || [];

      return friends.some(
        (friend) => friend.keycloakId === peerId || friend.id === peerId
      );
    } catch (error) {
      console.error(`❌ Error checking friend status:`, error);
      return false;
    }
  }

  hasPendingExchange(peerId) {
    return Array.from(this.pendingExchanges.values()).some(
      (ex) => ex.peerId === peerId && ex.status === "pending"
    );
  }

  getPendingExchange(peerId) {
    return Array.from(this.pendingExchanges.values()).find(
      (ex) => ex.peerId === peerId && ex.status === "pending"
    );
  }

  getExchangeStatus(peerId) {
    const completed = this.completedExchanges.get(peerId);
    if (completed) {
      return {
        status: "completed",
        verified: completed.verified,
        timestamp: completed.confirmedAt,
        fingerprint: completed.fingerprint,
      };
    }

    const pending = Array.from(this.pendingExchanges.values()).find(
      (ex) => ex.peerId === peerId
    );

    if (pending) {
      return {
        status: pending.status,
        timestamp: pending.initiatedAt || pending.requestedAt,
        fingerprint: pending.peerFingerprint,
      };
    }

    return { status: "not_started" };
  }

  cleanupOldExchanges(maxAge = 24 * 60 * 60 * 1000) {
    // 24 hours
    const now = Date.now();

    for (const [exchangeId, exchange] of this.pendingExchanges.entries()) {
      const timestamp = exchange.initiatedAt || exchange.requestedAt;
      const age = now - timestamp.getTime();

      if (age > maxAge) {
        console.log(`🗑️ Cleaning up old exchange: ${exchangeId}`);
        this.pendingExchanges.delete(exchangeId);
      }
    }
  }

  getStats() {
    return {
      pendingExchanges: this.pendingExchanges.size,
      completedExchanges: this.completedExchanges.size,
      retryAttempts: Object.fromEntries(this.retryAttempts.entries()),
    };
  }

  // ======================= DEBUG =======================

  debugInfo() {
    console.group("🔍 [KeyExchangeService] Debug Info");
    console.log("📊 Stats:", this.getStats());

    console.log("⏳ Pending exchanges:");
    this.pendingExchanges.forEach((exchange, id) => {
      console.log(`   ${id}:`, {
        peerId: exchange.peerId,
        status: exchange.status,
        age:
          Math.round(
            (Date.now() -
              (exchange.initiatedAt || exchange.requestedAt).getTime()) /
              1000
          ) + "s",
      });
    });

    console.log("✅ Completed exchanges:");
    this.completedExchanges.forEach((exchange, peerId) => {
      console.log(`   ${peerId}:`, {
        verified: exchange.verified,
        age:
          Math.round((Date.now() - exchange.confirmedAt.getTime()) / 1000) +
          "s",
      });
    });

    console.groupEnd();
  }
}

// Singleton instance
const keyExchangeService = new KeyExchangeService();

// Export helper functions
export const initiateKeyExchange = (peerId) =>
  keyExchangeService.initiateExchange(peerId);
export const confirmKeyExchange = (exchangeId, peerId, fingerprint, verified) =>
  keyExchangeService.confirmExchange(exchangeId, peerId, fingerprint, verified);
export const handleKeyExchangeRequest = (request) =>
  keyExchangeService.handleExchangeRequest(request);
export const verifyFingerprint = (peerId, fingerprint) =>
  keyExchangeService.verifyFingerprint(peerId, fingerprint);
export const getExchangeStatus = (peerId) =>
  keyExchangeService.getExchangeStatus(peerId);

export default keyExchangeService;
