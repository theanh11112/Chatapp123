import { EventEmitter } from "events";
import e2eeService from "../utils/e2ee";
import { AUTO_E2EE_CONFIG, ENCRYPTION_STATUS } from "../constants/e2eeConfig";
import { store } from "../../redux/store";
import { getSocket } from "../../socket";

/**
 * Auto Encryption Management Service
 * Handles automatic key sync, background operations, and state management
 */

class AutoEncryptionService extends EventEmitter {
  constructor() {
    super();
    this.status = ENCRYPTION_STATUS.DISABLED;
    this.isInitialized = false;
    this.isInitializing = false;
    this.syncInterval = null;
    this.retryCount = 0;
    this.maxRetries = 3;

    console.log("🤖 [AutoEncryptionService] Initialized");
  }

  // ======================= INITIALIZATION =======================

  async initialize() {
    if (this.isInitialized || this.isInitializing) {
      return;
    }

    console.group("🚀 [AutoEncryptionService] Initializing...");
    this.isInitializing = true;
    this.status = ENCRYPTION_STATUS.INITIALIZING;

    try {
      // 1. Initialize E2EE service
      const currentUserId = this.getCurrentUserId();
      if (!currentUserId) {
        throw new Error("No user ID found");
      }

      await e2eeService.initialize(currentUserId);

      // 2. Setup socket listeners
      this.setupSocketListeners();

      // 3. Enable E2EE on server if auto-enable is configured
      if (AUTO_E2EE_CONFIG.autoEnable) {
        await this.enableServerE2EE();
      }

      // 4. Start background sync
      this.startBackgroundSync();

      this.isInitialized = true;
      this.status = ENCRYPTION_STATUS.READY;

      console.log("✅ [AutoEncryptionService] Initialized successfully");
      this.emit("initialized", { status: this.status });
    } catch (error) {
      console.error("❌ [AutoEncryptionService] Initialization failed:", error);
      this.status = ENCRYPTION_STATUS.ERROR;
      this.emit("error", error);

      // Auto-retry after delay
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        console.log(
          `🔄 Retrying in 5s (attempt ${this.retryCount}/${this.maxRetries})`
        );

        setTimeout(() => {
          this.initialize();
        }, 5000);
      }
    } finally {
      this.isInitializing = false;
      console.groupEnd();
    }
  }

  // ======================= SERVER COMMUNICATION =======================

  async enableServerE2EE() {
    try {
      console.log("🔄 [AutoEncryptionService] Enabling E2EE on server...");

      // 1. Update server with our public key
      await e2eeService.updateServerKey();

      // 2. Enable E2EE toggle
      if (AUTO_E2EE_CONFIG.enableToggle) {
        await e2eeService.toggleE2EE(true);
      }

      console.log("✅ [AutoEncryptionService] E2EE enabled on server");
      return true;
    } catch (error) {
      console.warn(
        "⚠️ [AutoEncryptionService] Failed to enable server E2EE:",
        error.message
      );
      return false;
    }
  }

  async getFriendsList() {
    try {
      // Get from Redux store
      const state = store.getState();
      let friends = state.conversation?.friends || state.app?.friends || [];

      // If empty, try to fetch from API
      if (friends.length === 0) {
        console.log("🔄 Fetching friends from API...");
        try {
          const api = require("../../api/axiosInstance");
          const response = await api.post("/users/get-friends", {
            keycloakId: this.getCurrentUserId(),
          });

          if (response.data?.status === "success") {
            friends = response.data.data || [];
          }
        } catch (apiError) {
          console.warn(
            "⚠️ Could not fetch friends from API:",
            apiError.message
          );
        }
      }

      console.log(`🔍 Found ${friends.length} friends`);
      return friends;
    } catch (error) {
      console.error("❌ Error getting friends list:", error);
      return [];
    }
  }

  // ======================= KEY SYNC MANAGEMENT =======================

  async syncKeys() {
    if (!this.isInitialized || this.status !== ENCRYPTION_STATUS.READY) {
      return;
    }

    try {
      console.group("🔄 [AutoEncryptionService] Syncing keys...");

      const friends = await this.getFriendsList();
      if (friends.length === 0) {
        console.log("⚠️ No friends to sync with");
        return;
      }

      const results = [];
      for (const friend of friends) {
        const friendId = friend.keycloakId || friend.id;
        if (!friendId) continue;

        try {
          // Request friend's public key
          await e2eeService.getPeerPublicKey(friendId);
          results.push({ friendId, success: true });

          // Small delay to avoid flooding server
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          console.warn(`⚠️ Failed to sync key for ${friendId}:`, error.message);
          results.push({ friendId, success: false, error: error.message });
        }
      }

      const successful = results.filter((r) => r.success).length;
      console.log(
        `✅ Synced keys with ${successful}/${friends.length} friends`
      );

      this.emit("keysSynced", {
        total: friends.length,
        successful,
        results,
      });

      console.groupEnd();
    } catch (error) {
      console.error("❌ [AutoEncryptionService] Key sync failed:", error);
      this.emit("syncError", error);
    }
  }

  async manualSync() {
    console.log("🔄 [AutoEncryptionService] Manual sync triggered");
    return this.syncKeys();
  }

  // ======================= ENCRYPTION/DECRYPTION WRAPPERS =======================

  async encryptMessage(message, peerId) {
    if (!this.isInitialized) {
      throw new Error("Auto encryption service not initialized");
    }

    try {
      console.log(`🔐 [AutoEncryptionService] Encrypting for ${peerId}`);

      const result = await e2eeService.encryptMessage(message, peerId);

      this.emit("messageEncrypted", { peerId, result });
      return result;
    } catch (error) {
      console.error(
        `❌ [AutoEncryptionService] Encryption failed for ${peerId}:`,
        error
      );
      this.emit("encryptionFailed", { peerId, error });
      throw error;
    }
  }

  async decryptMessage(encryptedData, senderId) {
    if (!this.isInitialized) {
      throw new Error("Auto encryption service not initialized");
    }

    try {
      console.log(`🔓 [AutoEncryptionService] Decrypting from ${senderId}`);

      const plaintext = await e2eeService.decryptMessage(
        encryptedData,
        senderId
      );

      this.emit("messageDecrypted", { senderId, plaintext });
      return plaintext;
    } catch (error) {
      console.error(
        `❌ [AutoEncryptionService] Decryption failed from ${senderId}:`,
        error
      );
      this.emit("decryptionFailed", { senderId, error });
      throw error;
    }
  }

  async canEncryptTo(peerId) {
    try {
      // Check if we have the peer's public key
      const peerKey = await e2eeService
        .getPeerPublicKey(peerId)
        .catch(() => null);

      return {
        canEncrypt: !!peerKey?.publicKey,
        hasKey: !!peerKey?.publicKey,
        fingerprint: peerKey?.fingerprint,
        peerId,
      };
    } catch (error) {
      return {
        canEncrypt: false,
        hasKey: false,
        error: error.message,
        peerId,
      };
    }
  }

  // ======================= BACKGROUND OPERATIONS =======================

  startBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    const interval = AUTO_E2EE_CONFIG.backgroundSyncInterval || 60000; // 1 minute default
    this.syncInterval = setInterval(() => {
      if (this.isInitialized && this.status === ENCRYPTION_STATUS.READY) {
        this.syncKeys();
      }
    }, interval);

    console.log(
      `⏰ [AutoEncryptionService] Background sync started (${interval}ms interval)`
    );

    // Initial sync after 5 seconds
    setTimeout(() => this.syncKeys(), 5000);
  }

  stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log("⏹️ [AutoEncryptionService] Background sync stopped");
    }
  }

  // ======================= SOCKET LISTENERS =======================

  setupSocketListeners() {
    const socket = getSocket();
    if (!socket) return;

    console.log("👂 [AutoEncryptionService] Setting up socket listeners");

    // Listen for friend key updates
    socket.on("friend_e2ee_key_updated", (data) => {
      console.log("🔑 [AutoEncryptionService] Friend key updated:", data);
      this.emit("friendKeyUpdated", data);
    });

    // Listen for batch key updates
    socket.on("batch_e2ee_keys", (data) => {
      console.log(
        `📦 [AutoEncryptionService] Batch keys received: ${
          data.keys?.length || 0
        }`
      );
      this.emit("batchKeysReceived", data);
    });

    // Listen for E2EE info updates
    socket.on("e2ee_info_updated", (data) => {
      console.log("📊 [AutoEncryptionService] E2EE info updated:", data);
      this.emit("e2eeInfoUpdated", data);
    });
  }

  // ======================= UTILITY METHODS =======================

  getCurrentUserId() {
    try {
      const state = store.getState();
      return (
        state.app?.userInfo?.user_id ||
        state.auth?.user_id ||
        localStorage.getItem("user_id")
      );
    } catch (error) {
      console.warn("⚠️ Cannot get current user ID:", error);
      return null;
    }
  }

  getStatus() {
    return this.status;
  }

  isReady() {
    return this.status === ENCRYPTION_STATUS.READY && this.isInitialized;
  }

  async reset() {
    console.log("🔄 [AutoEncryptionService] Resetting...");

    this.stopBackgroundSync();
    this.isInitialized = false;
    this.status = ENCRYPTION_STATUS.DISABLED;
    this.retryCount = 0;

    // Clear E2EE service data
    await e2eeService.clearAllData();

    this.emit("reset");
    console.log("✅ [AutoEncryptionService] Reset completed");
  }

  // ======================= DEBUG =======================

  debugStatus() {
    console.group("🔍 [AutoEncryptionService] Debug Status");
    console.log("📊 Status:", this.status);
    console.log("✅ Initialized:", this.isInitialized);
    console.log(
      "🔄 Background sync:",
      this.syncInterval ? "ACTIVE" : "INACTIVE"
    );
    console.log("🔁 Retry count:", this.retryCount);
    console.groupEnd();

    e2eeService.debugInfo();
  }
}

// Singleton instance
const autoEncryptionService = new AutoEncryptionService();

// Export helper functions
export const initializeAutoEncryption = () =>
  autoEncryptionService.initialize();
export const getAutoEncryptionStatus = () => autoEncryptionService.getStatus();
export const isAutoEncryptionReady = () => autoEncryptionService.isReady();
export const syncFriendKeys = () => autoEncryptionService.manualSync();
export const encryptForPeer = (message, peerId) =>
  autoEncryptionService.encryptMessage(message, peerId);
export const decryptFromPeer = (encryptedData, senderId) =>
  autoEncryptionService.decryptMessage(encryptedData, senderId);

export default autoEncryptionService;
