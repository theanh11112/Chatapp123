import { EventEmitter } from "events";
import keyUtils from "./keyUtils";
import { getKeyStorageService } from "../services/keyStorageService";
import { getSocket } from "../../socket";

/**
 * Core E2EE Service - Main encryption/decryption logic
 * Handles key generation, message encryption/decryption, server communication
 */

class E2EEService extends EventEmitter {
  constructor() {
    super();
    this.keyStorage = getKeyStorageService();
    this.socket = null;
    this.keycloakId = null;
    this.status = "initializing";
    this.socketAttempts = 0;
    this.maxSocketAttempts = 3;
    this.sharedSecretCache = new Map();
    this._currentUserId = null;

    // Interval references
    this._cleanupInterval = null;
    this._expirationInterval = null;
    this._syncInterval = null;
    this._quickSyncInterval = null;
    this.socketRetryTimeout = null;
    this._peerKeyCache = {}; // Cache cho peer keys
    this._lastPeerKeyFetch = {}; // Rate limiting

    console.log("🔐 [E2EEService] Initialized");
    this.registerEventListeners();
  }

  // ======================= INITIALIZATION =======================

  async initialize(keycloakId) {
    try {
      console.group("🔐 [E2EEService] Initializing...");
      this.keycloakId = keycloakId;

      // FIX 1: Đợi socket sẵn sàng
      let socket = getSocket();
      let attempts = 0;
      const maxAttempts = 10;

      while (!socket && attempts < maxAttempts) {
        console.log(
          `🔄 Waiting for socket... (${attempts + 1}/${maxAttempts})`
        );
        await new Promise((resolve) => setTimeout(resolve, 500));
        socket = getSocket();
        attempts++;
      }

      if (!socket) {
        console.warn("⚠️ Socket not available, will retry later");
        // Setup retry mechanism
        this.setupSocketRetry();
      } else {
        this.socket = socket;
        console.log("✅ Socket connected:", {
          id: this.socket.id,
          connected: this.socket.connected,
        });
      }

      // FIX 2: Luôn cố gắng load key pair dù socket thế nào
      console.log("🔑 Loading key pair...");
      const hasKeys = await this.loadKeyPair();

      if (!hasKeys) {
        console.log("🆕 Generating new key pair...");
        await this.generateKeyPair();
      }

      // FIX 3: Setup listeners ngay lập tức
      console.log("👂 Setting up socket listeners...");
      this.setupSocketListeners();

      this.status = "ready";
      console.log("✅ [E2EEService] Initialized successfully");
      console.groupEnd();

      setTimeout(async () => {
        try {
          console.log(
            "🔄 [E2EEService] Scheduling auto-refresh of friend keys..."
          );
          await this.refreshAllFriendKeys();
        } catch (error) {
          console.warn("⚠️ Auto-refresh friend keys failed:", error.message);
        }
      }, 10000); // 10 giây sau khi init

      this.emit("initialized", {
        keycloakId,
        status: this.status,
        hasKeys,
        hasSocket: !!this.socket?.connected,
      });

      return true;
    } catch (error) {
      console.error("❌ [E2EEService] Initialization failed:", error);
      this.status = "error";
      this.emit("error", error);
      throw error;
    }
  }

  setupSocketRetry() {
    // Clear any existing retry
    if (this.socketRetryTimeout) {
      clearTimeout(this.socketRetryTimeout);
    }

    // Try to get socket again
    this.socketRetryTimeout = setTimeout(() => {
      const socket = getSocket();
      if (socket && socket.connected) {
        this.socket = socket;
        this.setupSocketListeners();
        console.log("✅ [E2EEService] Socket connected, listeners set up");
        this.emit("socketConnected", { socketId: socket.id });
      } else {
        this.socketAttempts++;
        if (this.socketAttempts < this.maxSocketAttempts) {
          console.log(
            `🔄 [E2EEService] Retrying socket connection (attempt ${this.socketAttempts}/${this.maxSocketAttempts})`
          );
          this.setupSocketRetry();
        } else {
          console.warn("⚠️ [E2EEService] Max socket retry attempts reached");
        }
      }
    }, 2000);
  }

  // ======================= KEY MANAGEMENT =======================

  async generateKeyPair() {
    try {
      console.log("🔑 [E2EEService] Generating new key pair...");

      // Generate ECDH key pair using Web Crypto API
      const keyPair = await keyUtils.generateECDHKeyPair();

      // Export to JWK format
      const publicKeyJwk = await keyUtils.exportKeyToJWK(keyPair.publicKey);
      const privateKeyJwk = await keyUtils.exportKeyToJWK(keyPair.privateKey);

      // Calculate fingerprint
      const publicKeyStr = JSON.stringify(publicKeyJwk);
      const fingerprint = await this.calculateFingerprint(publicKeyStr);

      const keyPairData = {
        publicKey: publicKeyStr,
        privateKey: JSON.stringify(privateKeyJwk),
        fingerprint,
        keyType: "ecdh",
        createdAt: Date.now(),
      };

      // Save to storage
      await this.keyStorage.saveKeyPair(keyPairData);

      console.log("✅ [E2EEService] Key pair generated:", {
        fingerprint,
        keyType: keyPairData.keyType,
      });

      this.emit("keyPairGenerated", keyPairData);
      return keyPairData;
    } catch (error) {
      console.error("❌ [E2EEService] Error generating key pair:", error);
      throw error;
    }
  }

  async loadKeyPair() {
    try {
      const keyPair = await this.keyStorage.getKeyPair();

      if (!keyPair) {
        return false;
      }

      console.log("✅ [E2EEService] Loaded existing key pair:", {
        fingerprint: keyPair.fingerprint,
        keyType: keyPair.keyType,
      });

      this.emit("keyPairLoaded", keyPair);
      return true;
    } catch (error) {
      console.error("❌ [E2EEService] Error loading key pair:", error);
      return false;
    }
  }

  async getMyPublicKey() {
    try {
      const keyPair = await this.keyStorage.getKeyPair();

      if (!keyPair) {
        console.log("🔄 [E2EEService] No key pair, generating new one...");
        const newKeyPair = await this.generateKeyPair();
        return newKeyPair.publicKey;
      }

      return keyPair.publicKey;
    } catch (error) {
      console.error("❌ [E2EEService] Error getting public key:", error);
      throw error;
    }
  }

  async getMyPrivateKey() {
    try {
      const keyPair = await this.keyStorage.getKeyPair();

      if (!keyPair) {
        throw new Error("No key pair available");
      }

      return keyPair.privateKey;
    } catch (error) {
      console.error("❌ [E2EEService] Error getting private key:", error);
      throw error;
    }
  }

  async getMyFingerprint() {
    try {
      const keyPair = await this.keyStorage.getKeyPair();

      if (!keyPair) {
        const newKeyPair = await this.generateKeyPair();
        return newKeyPair.fingerprint;
      }

      return keyPair.fingerprint;
    } catch (error) {
      console.error("❌ [E2EEService] Error getting fingerprint:", error);
      throw error;
    }
  }

  async calculateFingerprint(publicKey) {
    try {
      // Use Web Crypto API for secure fingerprint calculation
      const encoder = new TextEncoder();
      const data = encoder.encode(publicKey);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);

      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Return first 8 chars (similar to server)
      return hashHex.substring(0, 8).toUpperCase();
    } catch (error) {
      console.error("❌ [E2EEService] Error calculating fingerprint:", error);

      // Fallback to simple hash if Web Crypto fails
      try {
        const CryptoJS = await import("crypto-js");
        const hash = CryptoJS.SHA256(publicKey).toString(CryptoJS.enc.Hex);
        return hash.substring(0, 8).toUpperCase();
      } catch (cryptoError) {
        // Ultimate fallback - simple string hash
        let hash = 0;
        for (let i = 0; i < publicKey.length; i++) {
          hash = (hash << 5) - hash + publicKey.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16).substring(0, 8).toUpperCase();
      }
    }
  }

  // ======================= KEY VERIFICATION =======================

  async verifyKeyPair() {
    try {
      console.log("🔍 [E2EEService] Verifying key pair...");

      const keyPair = await this.keyStorage.getKeyPair();
      if (!keyPair) {
        throw new Error("No key pair found");
      }

      // Verify public key format
      const publicKeyJwk = JSON.parse(keyPair.publicKey);
      if (
        !publicKeyJwk.kty ||
        !publicKeyJwk.crv ||
        !publicKeyJwk.x ||
        !publicKeyJwk.y
      ) {
        throw new Error("Invalid public key format");
      }

      // Verify private key format
      const privateKeyJwk = JSON.parse(keyPair.privateKey);
      if (!privateKeyJwk.d) {
        throw new Error("Invalid private key format");
      }

      // Verify fingerprint matches
      const calculatedFingerprint = await this.calculateFingerprint(
        keyPair.publicKey
      );
      if (calculatedFingerprint !== keyPair.fingerprint) {
        console.warn("⚠️ Fingerprint mismatch, recalculating...");
        keyPair.fingerprint = calculatedFingerprint;
        await this.keyStorage.saveKeyPair(keyPair);
      }

      console.log("✅ [E2EEService] Key pair verified successfully");
      return true;
    } catch (error) {
      console.error("❌ [E2EEService] Key verification failed:", error);

      // Attempt to regenerate if verification fails
      console.log("🔄 Attempting to regenerate key pair...");
      await this.generateKeyPair();
      return false;
    }
  }

  // ======================= PEER KEY MANAGEMENT =======================

  async getPeerPublicKey(peerId, retry = true, forceRefresh = false) {
    try {
      console.log("22222");

      const now = Date.now();
      const lastFetch = this._lastPeerKeyFetch[peerId] || 0;

      if (!forceRefresh && now - lastFetch < 10000) {
        // 10 giây
        console.log(
          `⏳ [E2EEService] Skipping fetch - recent fetch for ${peerId}`
        );
        const cachedKey = await this.keyStorage.getPeerKey(peerId);
        return cachedKey;
      }
      this._lastPeerKeyFetch[peerId] = now;

      // 1. Lấy key từ local storage
      const localKey = await this.keyStorage.getPeerKey(peerId);

      // 2. Đảm bảo socket sẵn sàng
      if (!this.socket || !this.socket.connected) {
        console.warn(`⚠️ Socket not connected when fetching key for ${peerId}`);

        if (retry) {
          const socket = getSocket();
          if (socket && socket.connected) {
            this.socket = socket;
            return await this.getPeerPublicKey(peerId, false);
          }
        }
        throw new Error("Socket not connected");
      }

      // 3. Lấy key mới nhất từ backend
      console.log(`🔄 Requesting latest key from server for ${peerId}`);

      const serverKey = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Request timeout"));
        }, 10000);

        this.socket.emit("request_e2ee_key", { userId: peerId }, (response) => {
          clearTimeout(timeout);

          if (response?.success) resolve(response.data);
          else reject(new Error(response?.error || "Failed to get peer key"));
        });
      });

      if (!serverKey?.publicKey) throw new Error("Invalid server key");

      // 4. So sánh fingerprint
      if (localKey?.fingerprint) {
        if (localKey.fingerprint === serverKey.fingerprint) {
          console.log(`🔒 Local key for ${peerId} is up-to-date`);
          return localKey;
        }

        console.log(
          `🔁 Key changed for ${peerId} → updating local key & shared secret`
        );
      } else {
        console.log(`📥 No local key for ${peerId} → saving new key`);
      }

      // 5. Tạo key info mới
      const newKeyInfo = {
        publicKey: serverKey.publicKey,
        fingerprint: serverKey.fingerprint,
        keyType: serverKey.keyType || "ecdh",
        lastUpdated: Date.now(),
      };

      // 6. Lưu public key mới
      await this.keyStorage.savePeerKey(peerId, newKeyInfo);

      //
      // ⭐⭐⭐ 7. REGENERATE SHARED SECRET NGAY TẠI ĐÂY
      //
      try {
        console.log(`🔑 Regenerating shared secret for ${peerId}...`);

        const myPrivateKeyJwk = JSON.parse(await this.getMyPrivateKey());
        const peerPublicKeyJwk = JSON.parse(serverKey.publicKey);

        const newSecret = await keyUtils.deriveSharedSecret(
          myPrivateKeyJwk,
          peerPublicKeyJwk
        );

        // ⭐ GHI ĐÈ shared secret lên storage
        await this.keyStorage.saveSharedSecret(peerId, newSecret, {
          algorithm: "AES-GCM-256",
          source: "refresh_public_key",
          peerFingerprint: serverKey.fingerprint,
          ownFingerprint: await this.getMyFingerprint(),
        });

        console.log("✅ Shared secret regenerated & saved");
      } catch (err) {
        console.error("❌ Failed to regenerate shared secret:", err);
      }

      console.log(`✅ Updated peer key for ${peerId}`);
      return newKeyInfo;
    } catch (error) {
      console.error(`❌ Error getting peer key for ${peerId}:`, error.message);
      return null;
    }
  }

  async savePeerPublicKey(peerId, publicKey, fingerprint = null) {
    try {
      const keyInfo = {
        publicKey,
        fingerprint:
          fingerprint || (await this.calculateFingerprint(publicKey)),
        keyType: "ecdh",
        lastUpdated: Date.now(),
      };

      await this.keyStorage.savePeerKey(peerId, keyInfo);

      console.log(`✅ [E2EEService] Saved peer key for ${peerId}`);
      this.emit("peerKeySaved", { peerId, keyInfo });

      return keyInfo;
    } catch (error) {
      console.error(`❌ [E2EEService] Error saving peer key:`, error);
      throw error;
    }
  }

  async hasPeerKey(peerId) {
    try {
      const peerKey = await this.keyStorage.getPeerKey(peerId);
      return !!peerKey?.publicKey;
    } catch (error) {
      console.error(`❌ [E2EEService] Error checking peer key:`, error);
      return false;
    }
  }

  // ======================= ENCRYPTION/DECRYPTION =======================

  async encryptMessage(message, peerId) {
    try {
      // 1. Lấy sharedSecret đã lưu
      const allSecrets = this.keyStorage.getSharedSecrets();
      const entry = allSecrets.find((s) => s.peerId === peerId);

      if (!entry) {
        throw new Error(`No shared secret with peer ${peerId}`);
      }

      const sharedSecret = await this.keyStorage.restoreCryptoKey(entry.secret);

      // 2. Tạo IV
      const iv = crypto.getRandomValues(new Uint8Array(12));

      // 3. Mã hoá
      const encoded = new TextEncoder().encode(message);
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        sharedSecret,
        encoded
      );

      return {
        success: true,
        peerId,
        ciphertext: keyUtils.arrayBufferToBase64(ciphertext),
        iv: keyUtils.arrayBufferToBase64(iv),
        timestamp: Date.now(),
      };
    } catch (e) {
      return { success: false, error: e.message, peerId };
    }
  }

  async decryptMessage(data, senderId) {
    try {
      const { ciphertext, iv } = data;

      // 1. Lấy sharedSecret theo peerId = senderId
      const allSecrets = this.keyStorage.getSharedSecrets();
      const entry = allSecrets.find((s) => s.peerId === senderId);

      if (!entry) {
        throw new Error(`No shared secret with peer ${senderId}`);
      }

      const sharedSecret = await this.keyStorage.restoreCryptoKey(entry.secret);

      // 2. Convert base64 → ArrayBuffer
      const ciphertextBuf = keyUtils.base64ToArrayBuffer(ciphertext);
      const ivBuf = keyUtils.base64ToArrayBuffer(iv);

      // 3. Giải mã
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: ivBuf },
        sharedSecret,
        ciphertextBuf
      );

      return {
        success: true,
        senderId,
        content: new TextDecoder().decode(decrypted),
      };
    } catch (e) {
      return { success: false, error: e.message, senderId };
    }
  }

  // ======================= HELPER FUNCTIONS =======================

  async findPeerIdByFingerprint(fingerprint) {
    try {
      const peerKeysStr = localStorage.getItem("e2ee_peer_keys");
      if (!peerKeysStr) return null;

      const peerKeys = JSON.parse(peerKeysStr);

      if (Array.isArray(peerKeys)) {
        const peer = peerKeys.find((p) => p.fingerprint === fingerprint);
        return peer ? peer.peerId : null;
      } else {
        // Object format
        for (const [peerId, data] of Object.entries(peerKeys)) {
          if (data.fingerprint === fingerprint) {
            return peerId;
          }
        }
      }
    } catch (error) {
      console.error("Error finding peer by fingerprint:", error);
      return null;
    }
  }

  async ensureDecryptionSecret(peerId) {
    try {
      const allSecrets = this.keyStorage.getSharedSecrets();
      const hasDecryptionSecret = allSecrets.some(
        (s) =>
          s.peerId === peerId &&
          (s.source === "decryption" || s.source === "both")
      );

      if (hasDecryptionSecret) {
        return true;
      }

      // Nếu chỉ có encryption secret, tạo decryption secret
      const encryptionSecret = allSecrets.find(
        (s) => s.peerId === peerId && s.source === "encryption"
      );

      if (encryptionSecret) {
        console.log(
          `🔑 Creating decryption secret for ${peerId} from existing encryption secret`
        );

        // Restore key từ encryption secret
        const cryptoKey = await this.keyStorage.restoreCryptoKey(
          encryptionSecret.secret
        );

        // Lưu với source decryption
        await this.keyStorage.saveSharedSecret(peerId, cryptoKey, {
          algorithm: encryptionSecret.algorithm,
          source: "both", // Hoặc 'decryption'
          peerFingerprint: encryptionSecret.derivedFrom?.peerFingerprint,
          ownFingerprint: encryptionSecret.derivedFrom?.ownFingerprint,
          keyId: encryptionSecret.keyId,
        });

        return true;
      }

      return false;
    } catch (error) {
      console.error("Error ensuring decryption secret:", error);
      return false;
    }
  }

  async syncSecretsWithPeers() {
    console.group("🔄 SYNCING SECRETS WITH PEERS");

    try {
      // Lấy danh sách peers
      const peerKeysStr = localStorage.getItem("e2ee_peer_keys");
      if (!peerKeysStr) {
        console.log("No peers found");
        return;
      }

      const peerKeys = JSON.parse(peerKeysStr);
      const peers = Array.isArray(peerKeys)
        ? peerKeys
        : Object.entries(peerKeys).map(([id, data]) => ({
            peerId: id,
            ...data,
          }));

      console.log(`Found ${peers.length} peers`);

      // Lấy danh sách secrets hiện có
      const allSecrets = this.keyStorage.getSharedSecrets();

      for (const peer of peers) {
        console.log(`\n🔍 Checking peer: ${peer.peerId} (${peer.fingerprint})`);

        // Kiểm tra xem đã có secret nào cho peer này chưa
        const peerSecrets = allSecrets.filter((s) => s.peerId === peer.peerId);

        if (peerSecrets.length === 0) {
          console.log(`   ⚠️ No secrets found, will create on demand`);
        } else {
          console.log(`   ✅ Found ${peerSecrets.length} secret(s):`);
          peerSecrets.forEach((s) => {
            console.log(
              `      - source: ${s.source}, fingerprint: ${s.derivedFrom?.peerFingerprint}`
            );
          });

          // Nếu chỉ có encryption, tạo decryption
          const hasOnlyEncryption = peerSecrets.every(
            (s) => s.source === "encryption"
          );
          const hasDecryption = peerSecrets.some(
            (s) => s.source === "decryption" || s.source === "both"
          );

          if (hasOnlyEncryption && !hasDecryption) {
            console.log(
              `   🛠️ Only encryption secret found, creating decryption secret...`
            );
            await this.ensureDecryptionSecret(peer.peerId);
          }
        }
      }

      console.log("\n✅ Sync completed");
    } catch (error) {
      console.error("Sync error:", error);
    }

    console.groupEnd();
  }

  // ======================= SYNC HELPER METHODS =======================

  /**
   * Get sync status summary
   */
  async getSyncStatus() {
    try {
      const keyPair = await this.keyStorage.getKeyPair();
      const peerKeys = await this.keyStorage.getPeerKeys();
      const secrets = this.keyStorage.getSharedSecrets();

      // Check if socket is connected
      const socketConnected = this.socket?.connected || false;

      return {
        timestamp: Date.now(),
        status: this.status,
        socketConnected,
        keyPair: {
          exists: !!keyPair,
          fingerprint: keyPair?.fingerprint,
          keyType: keyPair?.keyType,
          createdAt: keyPair?.createdAt,
          age: keyPair ? Date.now() - keyPair.createdAt : 0,
        },
        peerKeys: {
          count: peerKeys.length,
          verified: peerKeys.filter((p) => p.verified).length,
          unverified: peerKeys.filter((p) => !p.verified).length,
        },
        sharedSecrets: {
          count: secrets.length,
          active: secrets.filter((s) => s.isActive).length,
          bySource: {
            encryption: secrets.filter((s) => s.source === "encryption").length,
            decryption: secrets.filter((s) => s.source === "decryption").length,
            both: secrets.filter((s) => s.source === "both").length,
          },
        },
        cache: this.getCacheStats(),
        storage: this.keyStorage.getStorageStats(),
      };
    } catch (error) {
      console.error("❌ [E2EEService] Error getting sync status:", error);
      return {
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check if sync is needed (simple version)
   */
  async isSyncNeeded() {
    try {
      const syncCheck = await this.checkKeySyncNeeded();
      return {
        needed: syncCheck.syncRequired || false,
        action: syncCheck.syncAction || "no_action",
        match: syncCheck.match || false,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [E2EEService] Error checking if sync needed:", error);
      return {
        needed: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Get sync diagnostics
   */
  async getSyncDiagnostics() {
    try {
      console.group("🔍 [E2EEService] Getting sync diagnostics...");

      const diagnostics = {
        timestamp: Date.now(),
        serviceStatus: this.status,
        socket: {
          connected: this.socket?.connected || false,
          id: this.socket?.id,
          attempts: this.socketAttempts,
        },
        sync: {},
        storage: {},
        performance: {},
      };

      // Sync status
      try {
        const syncStatus = await this.getSyncStatus();
        diagnostics.sync = syncStatus;
      } catch (syncError) {
        diagnostics.sync.error = syncError.message;
      }

      // Storage diagnostics
      try {
        diagnostics.storage = this.keyStorage.getStorageStats();
      } catch (storageError) {
        diagnostics.storage.error = storageError.message;
      }

      // Performance test
      const startTime = performance.now();
      try {
        await this.getMyFingerprint();
        diagnostics.performance.fingerprintTime = performance.now() - startTime;
      } catch (perfError) {
        diagnostics.performance.error = perfError.message;
      }

      // Sync check
      try {
        const syncNeeded = await this.isSyncNeeded();
        diagnostics.sync.needed = syncNeeded.needed;
        diagnostics.sync.action = syncNeeded.action;
      } catch (checkError) {
        diagnostics.sync.checkError = checkError.message;
      }

      console.log("✅ Sync diagnostics:", diagnostics);
      console.groupEnd();

      return diagnostics;
    } catch (error) {
      console.error("❌ [E2EEService] Sync diagnostics failed:", error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Manual sync trigger
   */
  async manualSync() {
    try {
      console.log("👤 [E2EEService] Manual sync triggered");

      // Run force sync
      const result = await this.forceSyncWithServer();

      // Emit manual sync complete event
      this.emit("manualSyncComplete", {
        success: result.success,
        syncRequired: result.syncRequired,
        syncAction: result.syncAction,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error("❌ [E2EEService] Manual sync failed:", error);

      this.emit("manualSyncFailed", {
        error: error.message,
        timestamp: Date.now(),
      });

      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  // ======================= USER ID MANAGEMENT =======================

  async getMyUserId() {
    if (this._currentUserId) {
      return this._currentUserId;
    }

    // Từ Keycloak
    if (window.keycloak && window.keycloak.subject) {
      this._currentUserId = window.keycloak.subject;
      return this._currentUserId;
    }

    // Từ localStorage auth
    try {
      const authStr = localStorage.getItem("redux-root");
      if (authStr) {
        const auth = JSON.parse(authStr);
        if (auth.auth) {
          const authData = JSON.parse(auth.auth);
          if (authData.user_id) {
            this._currentUserId = authData.user_id;
            return this._currentUserId;
          }
        }
      }
    } catch (e) {
      console.error("Error getting user ID from localStorage:", e);
    }

    // Từ e2ee_peer_keys (tìm fingerprint của mình)
    try {
      const peerKeysStr = localStorage.getItem("e2ee_peer_keys");
      if (peerKeysStr) {
        const peerKeys = JSON.parse(peerKeysStr);
        const myFingerprint = await this.getMyFingerprint();

        if (Array.isArray(peerKeys)) {
          const myKey = peerKeys.find((p) => p.fingerprint === myFingerprint);
          if (myKey) {
            this._currentUserId = myKey.peerId;
            return this._currentUserId;
          }
        }
      }
    } catch (e) {
      console.error("Error getting user ID from peer keys:", e);
    }

    throw new Error("Cannot determine current user ID");
  }

  // ======================= SERVER COMMUNICATION =======================

  async updateServerKey() {
    try {
      // Try to get socket
      const socket = getSocket();
      if (!socket || !socket.connected) {
        console.warn("⚠️ [E2EEService] Socket not connected for server update");
        return {
          success: false,
          error: "Socket not connected",
          retry: true,
        };
      }

      const publicKey = await this.getMyPublicKey();
      const fingerprint = await this.getMyFingerprint();

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Update timeout"));
        }, 10000);

        socket.emit(
          "update_e2ee_key",
          {
            publicKey,
            keyType: "ecdh",
            fingerprint,
          },
          (response) => {
            clearTimeout(timeout);
            if (response?.success) {
              resolve(response);
            } else {
              reject(new Error(response?.error || "Failed to update key"));
            }
          }
        );
      });

      console.log("✅ [E2EEService] Key updated on server");
      this.emit("serverKeyUpdated", response);

      return response;
    } catch (error) {
      console.error("❌ [E2EEService] Error updating server key:", error);

      // Return error instead of throwing
      return {
        success: false,
        error: error.message,
        retry: true,
      };
    }
  }

  async toggleE2EE(enabled) {
    try {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        console.warn("⚠️ [E2EEService] Socket not connected for E2EE toggle");
        return {
          success: false,
          error: "Socket not connected",
          retry: true,
        };
      }

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Toggle timeout"));
        }, 10000);

        socket.emit("toggle_e2ee", { enabled }, (response) => {
          clearTimeout(timeout);
          if (response?.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || "Failed to toggle E2EE"));
          }
        });
      });

      console.log(
        `✅ [E2EEService] E2EE ${enabled ? "enabled" : "disabled"} on server`
      );
      this.emit("e2eeToggled", { enabled, response });

      return response;
    } catch (error) {
      console.error("❌ [E2EEService] Error toggling E2EE:", error);

      // Return error instead of throwing
      return {
        success: false,
        error: error.message,
        retry: true,
      };
    }
  }

  async getE2EEInfo() {
    try {
      const socket = getSocket();
      if (!socket || !socket.connected) {
        console.warn("⚠️ [E2EEService] Socket not connected for E2EE info");
        return {
          success: false,
          error: "Socket not connected",
          retry: true,
        };
      }

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Info request timeout"));
        }, 10000);

        socket.emit("get_e2ee_info", {}, (response) => {
          clearTimeout(timeout);
          if (response?.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || "Failed to get E2EE info"));
          }
        });
      });

      console.log("✅ [E2EEService] Got E2EE info from server");
      this.emit("e2eeInfoReceived", response);

      return response;
    } catch (error) {
      console.error("❌ [E2EEService] Error getting E2EE info:", error);

      // Return error instead of throwing
      return {
        success: false,
        error: error.message,
        retry: true,
      };
    }
  }

  // ======================= SOCKET LISTENERS =======================

  setupSocketListeners() {
    // QUAN TRỌNG: Nếu socket chưa có, đăng ký để setup sau
    if (!this.socket) {
      console.log(
        "⏳ [E2EEService] No socket yet, will setup listeners when socket is available"
      );

      // Lắng nghe sự kiện socket được tạo từ bên ngoài
      const checkSocket = () => {
        const socket = getSocket();
        if (socket) {
          console.log(
            "✅ [E2EEService] Socket now available, setting up listeners..."
          );
          this.socket = socket;
          this.setupSocketListeners(); // Gọi lại với socket mới
          return true;
        }
        return false;
      };

      // Thử ngay lập tức
      if (checkSocket()) return;

      // Thử lại sau mỗi giây
      const retryInterval = setInterval(() => {
        if (checkSocket()) {
          clearInterval(retryInterval);
        }
      }, 1000);

      // Dừng sau 10 giây
      setTimeout(() => clearInterval(retryInterval), 10000);
      return;
    }

    console.log("👂 [E2EEService] Setting up socket listeners for socket:", {
      id: this.socket.id,
      connected: this.socket.connected,
    });

    // QUAN TRỌNG: Remove existing listeners để tránh duplicate
    this.socket.off("connect");
    this.socket.off("disconnect");
    this.socket.off("e2ee_key_update");
    this.socket.off("key_exchange_request");
    this.socket.off("e2ee_status_changed");
    this.socket.off("friend_e2ee_status_changed");
    this.socket.off("sync_status_update");
    this.socket.off("friend_e2ee_key_updated"); // <-- THÊM NÀY
    this.socket.off("friend_e2ee_key_changed"); // <-- THÊM NÀY
    this.socket.off("key_sync_complete");
    this.socket.off("key_sync_required");

    // Listen for socket connection - DEBOUNCED
    this.socket.on("connect", () => {
      console.log("🔌 [E2EEService] Socket connected - Auto-sync will start");
      this.emit("socketConnected");

      // Chờ 2 giây để đảm bảo mọi thứ ổn định
      setTimeout(async () => {
        try {
          console.log("🚀 [SOCKET CONNECTED] Starting auto-sync...");
          await this.autoSyncOnLogin();
        } catch (error) {
          console.warn("⚠️ Auto-sync on connect failed:", error.message);
        }
      }, 2000);
    });

    // Listen for key updates from server
    this.socket.on("e2ee_key_update", async (data) => {
      console.log("🔑 [E2EEService] Received key update:", data);
      if (data.userId && data.publicKey) {
        await this.savePeerPublicKey(
          data.userId,
          data.publicKey,
          data.fingerprint
        );
        this.emit("peerKeyUpdated", data);
      }
    });

    // Listen for key exchange requests
    this.socket.on("key_exchange_request", (data) => {
      console.log("🤝 [E2EEService] Key exchange request:", data);
      this.emit("keyExchangeRequest", data);
    });

    // Listen for E2EE status changes
    this.socket.on("e2ee_status_changed", (data) => {
      console.log("🔄 [E2EEService] E2EE status changed:", data);
      this.emit("e2eeStatusChanged", data);
    });

    // Listen for friend E2EE status
    this.socket.on("friend_e2ee_status_changed", (data) => {
      console.log("👥 [E2EEService] Friend E2EE status changed:", data);
      this.emit("friendE2EEStatusChanged", data);
    });

    // Listen for sync events
    this.socket.on("sync_status_update", (data) => {
      console.log("🔄 [E2EEService] Sync status update:", data);
      this.emit("syncStatusUpdate", data);
    });

    this.socket.on("key_sync_complete", (data) => {
      console.log("✅ [E2EEService] Key sync complete:", data);
      this.emit("keySyncComplete", data);
    });

    this.socket.on("key_sync_required", (data) => {
      console.log("🔄 [E2EEService] Key sync required:", data);
      this.emit("keySyncRequired", data);
    });

    // Listen for socket disconnection
    this.socket.on("disconnect", () => {
      console.log("🔌 [E2EEService] Socket disconnected");
      this.emit("socketDisconnected");
    });

    this.socket.on("friend_e2ee_key_updated", async (data) => {
      console.log("🔑 [E2EEService] Friend updated E2EE key:", {
        friendId: data.userId,
        username: data.username,
        fingerprint: data.fingerprint,
        keyType: data.keyType,
        timestamp: data.timestamp,
      });

      try {
        // 1. Lấy key mới từ server
        console.log(
          `🔄 [E2EEService] Fetching updated key for ${data.username}...`
        );
        const updatedKey = await this.getPeerPublicKey(data.userId, true);

        if (updatedKey) {
          console.log(`✅ [E2EEService] Updated key for ${data.username}:`, {
            fingerprint: updatedKey.fingerprint,
            matches: updatedKey.fingerprint === data.fingerprint,
          });

          // 2. Xóa shared secret cũ (nếu có)
          await this.keyStorage.deleteSharedSecret(data.userId);
          console.log(
            `🗑️ [E2EEService] Cleared old shared secret for ${data.username}`
          );

          // 3. Xóa cache nếu có
          const cacheKey = `${data.userId}_${await this.getMyFingerprint()}`;
          if (this.sharedSecretCache) {
            this.sharedSecretCache.delete(cacheKey);
          }

          // 4. Emit event để UI biết
          this.emit("friendKeyUpdated", {
            friendId: data.userId,
            username: data.username,
            newFingerprint: updatedKey.fingerprint,
            timestamp: Date.now(),
            action: "key_refreshed",
          });
        } else {
          console.warn(
            `⚠️ [E2EEService] Failed to get updated key for ${data.username}`
          );
        }
      } catch (error) {
        console.error(
          `❌ [E2EEService] Error handling friend key update:`,
          error.message
        );
      }
    });

    // ============ THÊM: Lắng nghe khi bạn bè thay đổi status ============
    this.socket.on("friend_e2ee_status_changed", (data) => {
      console.log("🔄 [E2EEService] Friend changed E2EE status:", {
        friendId: data.userId,
        username: data.username,
        enabled: data.e2eeEnabled,
        timestamp: data.timestamp,
      });

      // Emit để UI biết
      this.emit("friendStatusChanged", data);

      // Nếu friend disable E2EE, xóa key của họ
      if (!data.e2eeEnabled) {
        setTimeout(async () => {
          try {
            await this.keyStorage.deletePeerKey(data.userId);
            console.log(
              `🗑️ [E2EEService] Removed peer key for ${data.username} (E2EE disabled)`
            );
          } catch (error) {
            console.warn(`⚠️ Failed to remove peer key:`, error.message);
          }
        }, 1000);
      }
    });

    // ============ THÊM: Lắng nghe khi bạn bè thay đổi active key ============
    this.socket.on("friend_e2ee_key_changed", async (data) => {
      console.log("🔄 [E2EEService] Friend changed active key:", {
        friendId: data.userId,
        username: data.username,
        fingerprint: data.fingerprint,
        timestamp: data.timestamp,
      });

      try {
        // Refresh key từ server
        const updatedKey = await this.getPeerPublicKey(data.userId, true);

        if (updatedKey) {
          console.log(
            `✅ [E2EEService] Refreshed active key for ${data.username}`
          );

          this.emit("friendActiveKeyChanged", {
            friendId: data.userId,
            username: data.username,
            newFingerprint: updatedKey.fingerprint,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        console.warn(`⚠️ Failed to refresh active key:`, error.message);
      }
    });

    // Nếu socket đã kết nối, trigger auto sync ngay
    if (this.socket.connected) {
      console.log("✅ Socket already connected, triggering auto-sync...");
      setTimeout(async () => {
        try {
          console.log("🚀 Starting auto-sync (socket already connected)...");
          await this.autoSyncOnLogin();
        } catch (error) {
          console.warn("⚠️ Auto-sync failed:", error.message);
        }
      }, 1000);
    }
  }

  // ======================= BACKUP/RESTORE =======================

  async exportKeyPair(password = null) {
    try {
      const keyPair = await this.keyStorage.getKeyPair();
      if (!keyPair) {
        throw new Error("No key pair to export");
      }

      const exportData = {
        version: "1.0",
        timestamp: Date.now(),
        keyPair: keyPair,
        keycloakId: this.keycloakId,
      };

      if (password) {
        // Encrypt with password if provided
        const CryptoJS = await import("crypto-js");
        const encrypted = CryptoJS.AES.encrypt(
          JSON.stringify(exportData),
          password
        ).toString();
        return encrypted;
      }

      return JSON.stringify(exportData);
    } catch (error) {
      console.error("❌ [E2EEService] Error exporting key pair:", error);
      throw error;
    }
  }

  async importKeyPair(data, password = null) {
    try {
      let keyPairData;

      if (password) {
        const CryptoJS = await import("crypto-js");
        const bytes = CryptoJS.AES.decrypt(data, password);
        keyPairData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
      } else {
        keyPairData = JSON.parse(data);
      }

      if (
        !keyPairData.keyPair ||
        !keyPairData.keyPair.publicKey ||
        !keyPairData.keyPair.privateKey
      ) {
        throw new Error("Invalid key pair data");
      }

      // Verify and save the imported key pair
      const fingerprint = await this.calculateFingerprint(
        keyPairData.keyPair.publicKey
      );
      const keyPair = {
        ...keyPairData.keyPair,
        fingerprint,
        importedAt: Date.now(),
      };

      await this.keyStorage.saveKeyPair(keyPair);

      console.log("✅ [E2EEService] Key pair imported successfully");
      this.emit("keyPairImported", keyPair);

      return keyPair;
    } catch (error) {
      console.error("❌ [E2EEService] Error importing key pair:", error);
      throw error;
    }
  }

  // ======================= KEY ROTATION =======================

  async rotateKeys() {
    try {
      console.log("🔄 [E2EEService] Rotating keys...");

      // 1. Generate new key pair
      const newKeyPair = await this.generateKeyPair();

      // 2. Update server with new key
      if (this.socket && this.socket.connected) {
        await this.updateServerKey();
      }

      // 3. Notify connected peers about key rotation
      this.emit("keysRotated", {
        oldFingerprint: await this.getMyFingerprint(),
        newFingerprint: newKeyPair.fingerprint,
        timestamp: Date.now(),
      });

      console.log("✅ [E2EEService] Keys rotated successfully");
      return newKeyPair;
    } catch (error) {
      console.error("❌ [E2EEService] Error rotating keys:", error);
      throw error;
    }
  }

  // ======================= KEY EXPIRATION =======================

  async checkKeyExpiration() {
    try {
      const keyPair = await this.keyStorage.getKeyPair();
      if (!keyPair) return false;

      const keyAge = Date.now() - keyPair.createdAt;
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds

      if (keyAge > maxAge) {
        console.warn("⚠️ [E2EEService] Key is expired, rotating...");
        await this.rotateKeys();
        return true;
      }

      // Warn if key is close to expiration
      if (keyAge > maxAge * 0.8) {
        // 80% of max age
        console.warn(
          `⚠️ [E2EEService] Key will expire in ${Math.round(
            (maxAge - keyAge) / (24 * 60 * 60 * 1000)
          )} days`
        );
        this.emit("keyExpiringSoon", {
          daysRemaining: Math.round((maxAge - keyAge) / (24 * 60 * 60 * 1000)),
          createdAt: keyPair.createdAt,
        });
      }

      return false;
    } catch (error) {
      console.error("❌ [E2EEService] Error checking key expiration:", error);
      return false;
    }
  }

  // ======================= GROUP ENCRYPTION =======================

  async encryptGroupMessage(message, peerIds) {
    try {
      console.group(
        `🔐 [E2EEService] Encrypting group message for ${peerIds.length} peers`
      );

      const results = {};
      const failedPeers = [];

      // Encrypt for each peer individually
      for (const peerId of peerIds) {
        try {
          const result = await this.encryptMessage(message, peerId);
          if (result.success) {
            results[peerId] = result;
          } else {
            failedPeers.push({ peerId, error: result.error });
          }
        } catch (error) {
          failedPeers.push({ peerId, error: error.message });
        }
      }

      console.log(
        `✅ Group encryption: ${Object.keys(results).length} successful, ${
          failedPeers.length
        } failed`
      );
      console.groupEnd();

      return {
        success: true,
        results,
        failedPeers,
        totalPeers: peerIds.length,
        successful: Object.keys(results).length,
      };
    } catch (error) {
      console.error("❌ [E2EEService] Group encryption failed:", error);
      return {
        success: false,
        error: error.message,
        results: {},
        failedPeers: peerIds.map((peerId) => ({
          peerId,
          error: error.message,
        })),
      };
    }
  }

  // ======================= KEY SYNC MANAGEMENT =======================

  // ======================= KEY SYNC MANAGEMENT =======================

  async syncWithServer() {
    try {
      console.log("🔄 [E2EEService] Syncing with server...");

      if (!this.socket || !this.socket.connected) {
        throw new Error("Socket not connected");
      }

      // 1. Get current fingerprint
      const fingerprint = await this.getMyFingerprint();
      const publicKey = await this.getMyPublicKey();

      // 2. Send sync request
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Sync timeout"));
        }, 10000);

        this.socket.emit(
          "sync_e2ee_keys",
          {
            fingerprint,
            publicKey,
            timestamp: Date.now(),
          },
          (response) => {
            clearTimeout(timeout);
            resolve(response);
          }
        );
      });

      if (response?.success) {
        // 3. Process server response
        if (response.data?.needsUpdate) {
          console.log("⬆️ [E2EEService] Uploading key to server...");
          await this.updateServerKey();
        }

        // 4. Get updated peer keys if needed
        if (
          response.data?.updatedPeers &&
          response.data.updatedPeers.length > 0
        ) {
          console.log(
            `🔄 [E2EEService] Updating ${response.data.updatedPeers.length} peer keys`
          );

          for (const peerId of response.data.updatedPeers) {
            try {
              await this.getPeerPublicKey(peerId);
            } catch (error) {
              console.warn(
                `⚠️ Failed to update key for peer ${peerId}:`,
                error.message
              );
            }
          }
        }

        console.log("✅ [E2EEService] Sync completed successfully");
        this.emit("syncCompleted", response);

        return response;
      } else {
        throw new Error(response?.error || "Sync failed");
      }
    } catch (error) {
      console.error("❌ [E2EEService] Sync failed:", error);
      this.emit("syncFailed", error);

      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ======================= NEW SYNC FUNCTIONS =======================

  /**
   * Check if key needs sync between client and server
   */
  async checkKeySyncNeeded(clientKeyData = null) {
    try {
      console.log("🔍 [E2EEService] Checking if key sync is needed...");

      // Get local key from storage
      const localKey = await this.keyStorage.getKeyPair();

      // Prepare data for sync check
      const syncRequest = {
        publicKey: localKey?.publicKey,
        fingerprint: localKey?.fingerprint,
        createdAt: localKey?.createdAt,
        timestamp: Date.now(),
        source: "client",
      };

      // If client provided additional data, merge it
      if (clientKeyData) {
        Object.assign(syncRequest, clientKeyData);
      }

      console.log("🔄 Sync request data:", {
        hasLocalKey: !!localKey,
        fingerprint: localKey?.fingerprint,
        clientFingerprint: clientKeyData?.fingerprint,
      });

      // Call server to check sync status
      if (!this.socket || !this.socket.connected) {
        throw new Error("Socket not connected");
      }

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Sync check timeout"));
        }, 10000);

        this.socket.emit("check_and_sync_key", syncRequest, (response) => {
          clearTimeout(timeout);

          if (response?.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || "Sync check failed"));
          }
        });
      });

      console.log("✅ Sync check response:", response);

      // Emit event for sync status
      this.emit("syncCheckComplete", {
        syncRequired: response.syncRequired,
        syncAction: response.syncAction,
        match: response.match,
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      console.error("❌ [E2EEService] Sync check failed:", error);

      this.emit("syncCheckFailed", {
        error: error.message,
        timestamp: Date.now(),
      });

      return {
        success: false,
        error: error.message,
        syncRequired: false,
        syncAction: "error",
      };
    }
  }

  /**
   * Perform auto-sync on login/initialize
   */
  async autoSyncOnLogin() {
    try {
      console.log("🚀 [E2EEService] Starting auto-sync on login...");

      if (!this.socket || !this.socket.connected) {
        console.warn("⚠️ Socket not connected for auto-sync");
        return {
          success: false,
          error: "Socket not connected",
          retry: true,
        };
      }

      // Get local key data
      const localKey = await this.keyStorage.getKeyPair();
      const localKeyData = localKey
        ? {
            publicKey: localKey.publicKey,
            fingerprint: localKey.fingerprint,
            createdAt: localKey.createdAt,
            keyType: localKey.keyType || "ecdh",
          }
        : null;

      console.log("🔍 Local key data for auto-sync:", {
        hasKey: !!localKey,
        fingerprint: localKey?.fingerprint,
      });

      // Call server auto-sync
      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Auto-sync timeout"));
        }, 15000);

        this.socket.emit("auto_sync_on_login", localKeyData, (response) => {
          clearTimeout(timeout);

          if (response?.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || "Auto-sync failed"));
          }
        });
      });

      console.log("🔄 Auto-sync response:", {
        success: response.success,
        action: response.data?.action,
        message: response.message,
      });

      // Handle sync action from server
      if (response.success && response.data) {
        await this.handleSyncAction(response.data);
      }

      console.log("✅ Auto-sync completed");
      this.emit("autoSyncComplete", response);

      return response;
    } catch (error) {
      console.error("❌ [E2EEService] Auto-sync failed:", error);

      this.emit("autoSyncFailed", {
        error: error.message,
        timestamp: Date.now(),
      });

      return {
        success: false,
        error: error.message,
        retry: true,
      };
    }
  }

  /**
   * Handle sync action from server
   */
  async handleSyncAction(syncData) {
    try {
      console.log("🔄 [E2EEService] Handling sync action:", {
        action: syncData.action,
        syncAction: syncData.syncAction,
      });

      switch (syncData.action || syncData.syncAction) {
        case "server_to_client":
          // Server has newer key, update client
          console.log("📥 Updating client with server key...");
          if (syncData.key) {
            await this.keyStorage.saveKeyPair(syncData.key);
            console.log("✅ Client key updated from server");

            // Reload key pair
            await this.loadKeyPair();

            this.emit("keyUpdatedFromServer", {
              fingerprint: syncData.key.fingerprint,
              timestamp: Date.now(),
            });
          }
          break;

        case "client_to_server":
          // Client has newer key, already synced to server
          console.log("✅ Client key already synced to server");
          this.emit("keyAlreadySynced", {
            timestamp: Date.now(),
          });
          break;

        case "create_new":
          // No keys anywhere, need to create new
          console.log("🆕 Creating new key pair...");
          const newKey = await this.generateKeyPair();

          // Upload to server
          if (this.socket?.connected) {
            await this.updateServerKey();
          }

          this.emit("newKeyCreatedForSync", {
            fingerprint: newKey.fingerprint,
            timestamp: Date.now(),
          });
          break;

        case "already_synced":
          // Keys are already in sync
          console.log("✅ Keys are already in sync");
          this.emit("keysAlreadySynced", {
            timestamp: Date.now(),
          });
          break;

        default:
          console.log("ℹ️ No specific sync action needed");
      }

      return {
        success: true,
        action: syncData.action || syncData.syncAction,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [E2EEService] Error handling sync action:", error);
      throw error;
    }
  }

  /**
   * Sync key from client to server
   */
  async syncKeyFromClient(keyData) {
    try {
      console.log("📤 [E2EEService] Syncing key from client to server...");

      if (!this.socket || !this.socket.connected) {
        throw new Error("Socket not connected");
      }

      // Validate key data
      if (!keyData.publicKey || !keyData.fingerprint) {
        throw new Error("Invalid key data: missing publicKey or fingerprint");
      }

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Key sync timeout"));
        }, 10000);

        this.socket.emit("sync_key_from_client", keyData, (response) => {
          clearTimeout(timeout);

          if (response?.success) {
            resolve(response);
          } else {
            reject(new Error(response?.error || "Key sync failed"));
          }
        });
      });

      console.log("✅ Key synced to server:", {
        success: response.success,
        fingerprint: response.data?.fingerprint,
      });

      // Update local storage if needed
      if (response.success && response.data?.key) {
        await this.keyStorage.saveKeyPair(response.data.key);
        console.log("✅ Updated local key from server response");
      }

      this.emit("keySyncedToServer", {
        fingerprint: keyData.fingerprint,
        response,
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      console.error("❌ [E2EEService] Error syncing key to server:", error);

      this.emit("keySyncFailed", {
        error: error.message,
        fingerprint: keyData?.fingerprint,
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Get current key from server
   */
  async getCurrentKeyFromServer() {
    try {
      console.log("🔑 [E2EEService] Getting current key from server...");

      if (!this.socket || !this.socket.connected) {
        throw new Error("Socket not connected");
      }

      const response = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Get key timeout"));
        }, 10000);

        this.socket.emit("get_my_current_key", {}, (response) => {
          clearTimeout(timeout);

          if (response?.success && response.data?.hasKey) {
            resolve(response.data.key);
          } else {
            reject(new Error(response?.error || "No key from server"));
          }
        });
      });

      console.log("✅ Got key from server:", {
        fingerprint: response.fingerprint,
        keyType: response.keyType,
      });

      // Save to local storage
      await this.keyStorage.saveKeyPair(response);

      // Reload key pair
      await this.loadKeyPair();

      this.emit("keyRetrievedFromServer", {
        fingerprint: response.fingerprint,
        timestamp: Date.now(),
      });

      return response;
    } catch (error) {
      console.error("❌ [E2EEService] Error getting key from server:", error);

      this.emit("keyRetrievalFailed", {
        error: error.message,
        timestamp: Date.now(),
      });

      throw error;
    }
  }

  /**
   * Force sync with server (manual sync)
   */
  async forceSyncWithServer() {
    try {
      console.log("⚡ [E2EEService] Force syncing with server...");

      // 1. Check sync needed
      const syncCheck = await this.checkKeySyncNeeded();

      if (!syncCheck.success) {
        throw new Error(syncCheck.error);
      }

      // 2. Handle sync if needed
      if (syncCheck.syncRequired) {
        console.log("🔄 Sync required, action:", syncCheck.syncAction);

        const localKey = await this.keyStorage.getKeyPair();

        switch (syncCheck.syncAction) {
          case "use_client_key":
          case "server_needs_update":
            // Upload client key to server
            if (localKey) {
              console.log("📤 Uploading client key to server...");
              await this.syncKeyFromClient({
                publicKey: localKey.publicKey,
                fingerprint: localKey.fingerprint,
                keyType: localKey.keyType || "ecdh",
                forceUpdate: true,
              });
            }
            break;

          case "use_server_key":
          case "client_needs_update":
            // Download server key
            console.log("📥 Downloading server key...");
            await this.getCurrentKeyFromServer();
            break;

          case "create_new":
            // Create new key
            console.log("🆕 Creating new key...");
            const newKey = await this.generateKeyPair();

            // Upload to server
            await this.syncKeyFromClient({
              publicKey: newKey.publicKey,
              fingerprint: newKey.fingerprint,
              keyType: newKey.keyType,
              forceUpdate: true,
            });
            break;

          default:
            console.log("✅ No sync action needed");
        }
      } else {
        console.log("✅ Keys are already in sync");
      }

      // 3. Sync peer keys
      await this.syncPeerKeys();

      console.log("✅ Force sync completed");

      return {
        success: true,
        syncRequired: syncCheck.syncRequired,
        syncAction: syncCheck.syncAction,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [E2EEService] Force sync failed:", error);

      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Sync peer keys with server
   */
  async syncPeerKeys() {
    try {
      console.log("👥 [E2EEService] Syncing peer keys...");

      if (!this.socket || !this.socket.connected) {
        console.warn("⚠️ Socket not connected for peer sync");
        return false;
      }

      // Get all local peer keys
      const localPeers = await this.keyStorage.getPeerKeys();

      console.log(`🔄 Syncing ${localPeers.length} peer keys...`);

      let updatedCount = 0;

      // Update each peer key from server
      for (const peer of localPeers) {
        try {
          const serverKey = await this.getPeerPublicKey(peer.peerId, false);

          if (serverKey && serverKey.lastUpdated > peer.lastUpdated) {
            // Server has newer key
            await this.keyStorage.savePeerKey(peer.peerId, serverKey);
            updatedCount++;
          }
        } catch (error) {
          console.warn(`⚠️ Failed to sync peer ${peer.peerId}:`, error.message);
        }
      }

      console.log(`✅ Synced ${updatedCount} peer keys`);

      return {
        success: true,
        totalPeers: localPeers.length,
        updated: updatedCount,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [E2EEService] Peer sync failed:", error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  // ======================= PEER KEY REFRESH =======================

  async refreshFriendKey(friendId, force = false) {
    try {
      console.log(`🔄 [E2EEService] Refreshing key for friend ${friendId}...`);

      // 1. Lấy key hiện tại từ storage
      const existingKey = await this.keyStorage.getPeerKey(friendId);

      // 2. Request key mới từ server
      const newKey = await this.getPeerPublicKey(friendId, true);

      if (!newKey) {
        throw new Error(`Failed to get updated key for ${friendId}`);
      }

      console.log(`🔍 [E2EEService] Key comparison:`, {
        friendId,
        hasExistingKey: !!existingKey,
        existingFingerprint: existingKey?.fingerprint,
        newFingerprint: newKey.fingerprint,
        changed: existingKey?.fingerprint !== newKey.fingerprint,
      });

      // 3. Nếu fingerprint thay đổi, xóa shared secret cũ
      if (existingKey && existingKey.fingerprint !== newKey.fingerprint) {
        console.log(`🔄 Fingerprint changed, clearing old secrets...`);
        await this.keyStorage.deleteSharedSecret(friendId);

        // Xóa cache
        const cacheKey = `${friendId}_${await this.getMyFingerprint()}`;
        if (this.sharedSecretCache) {
          this.sharedSecretCache.delete(cacheKey);
        }
      }

      // 4. Emit event
      this.emit("friendKeyRefreshed", {
        friendId,
        oldFingerprint: existingKey?.fingerprint,
        newFingerprint: newKey.fingerprint,
        changed: existingKey?.fingerprint !== newKey.fingerprint,
        timestamp: Date.now(),
      });

      return {
        success: true,
        friendId,
        fingerprint: newKey.fingerprint,
        changed: existingKey?.fingerprint !== newKey.fingerprint,
      };
    } catch (error) {
      console.error(
        `❌ [E2EEService] Error refreshing friend key:`,
        error.message
      );
      return {
        success: false,
        friendId,
        error: error.message,
      };
    }
  }

  async refreshAllFriendKeys() {
    try {
      console.log("🔄 [E2EEService] Refreshing all friend keys...");

      // 1. Lấy danh sách bạn bè từ storage
      const peerKeys = await this.keyStorage.getPeerKeys();

      console.log(`🔍 Found ${peerKeys.length} peer keys to refresh`);

      const results = {
        total: peerKeys.length,
        refreshed: 0,
        failed: 0,
        changed: 0,
        unchanged: 0,
        details: [],
      };

      // 2. Refresh từng key
      for (const peer of peerKeys) {
        try {
          const result = await this.refreshFriendKey(peer.peerId);

          if (result.success) {
            results.refreshed++;
            if (result.changed) {
              results.changed++;
            } else {
              results.unchanged++;
            }
            results.details.push({
              peerId: peer.peerId,
              success: true,
              changed: result.changed,
              fingerprint: result.fingerprint,
            });
          } else {
            results.failed++;
            results.details.push({
              peerId: peer.peerId,
              success: false,
              error: result.error,
            });
          }

          // Delay để tránh overload server
          await new Promise((resolve) => setTimeout(resolve, 100));
        } catch (error) {
          results.failed++;
          results.details.push({
            peerId: peer.peerId,
            success: false,
            error: error.message,
          });
        }
      }

      console.log(`✅ Friend keys refresh completed:`, {
        refreshed: results.refreshed,
        changed: results.changed,
        failed: results.failed,
      });

      this.emit("allFriendKeysRefreshed", results);
      return results;
    } catch (error) {
      console.error(
        "❌ [E2EEService] Error refreshing all friend keys:",
        error
      );
      throw error;
    }
  }

  // ======================= KEY VALIDATION UTILITIES =======================

  async validatePeerKey(peerId, publicKey = null) {
    try {
      let peerPublicKey = publicKey;

      if (!peerPublicKey) {
        const peerKey = await this.getPeerPublicKey(peerId);
        peerPublicKey = peerKey?.publicKey;
      }

      if (!peerPublicKey) {
        return {
          isValid: false,
          error: "No public key available",
        };
      }

      // Validate JWK format
      const jwk = JSON.parse(peerPublicKey);
      const requiredFields = ["kty", "crv", "x", "y"];

      for (const field of requiredFields) {
        if (!jwk[field]) {
          return {
            isValid: false,
            error: `Missing required field: ${field}`,
          };
        }
      }

      // Validate curve
      if (jwk.crv !== "P-256") {
        return {
          isValid: false,
          error: `Unsupported curve: ${jwk.crv}`,
        };
      }

      // Validate coordinates length
      if (jwk.x.length < 40 || jwk.y.length < 40) {
        return {
          isValid: false,
          error: "Invalid coordinate length",
        };
      }

      return {
        isValid: true,
        fingerprint: await this.calculateFingerprint(peerPublicKey),
        keyType: jwk.kty,
        curve: jwk.crv,
      };
    } catch (error) {
      console.error(
        `❌ [E2EEService] Error validating peer key for ${peerId}:`,
        error
      );
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  // ======================= PERFORMANCE OPTIMIZATION =======================

  async cacheSharedSecret(peerId, secret) {
    try {
      if (!this.sharedSecretCache) {
        this.sharedSecretCache = new Map();
      }

      const cacheKey = `${peerId}_${await this.getMyFingerprint()}`;
      this.sharedSecretCache.set(cacheKey, {
        secret,
        timestamp: Date.now(),
        peerId,
      });

      // Limit cache size
      if (this.sharedSecretCache.size > 50) {
        const oldestKey = Array.from(this.sharedSecretCache.entries()).sort(
          (a, b) => a[1].timestamp - b[1].timestamp
        )[0][0];
        this.sharedSecretCache.delete(oldestKey);
      }

      return true;
    } catch (error) {
      console.error("❌ [E2EEService] Error caching shared secret:", error);
      return false;
    }
  }

  async getCachedSharedSecret(peerId) {
    try {
      if (!this.sharedSecretCache) return null;

      const cacheKey = `${peerId}_${await this.getMyFingerprint()}`;
      const cached = this.sharedSecretCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
        // 5 minutes
        return cached.secret;
      }

      // Remove expired cache
      if (cached) {
        this.sharedSecretCache.delete(cacheKey);
      }

      return null;
    } catch (error) {
      console.error("❌ [E2EEService] Error getting cached secret:", error);
      return null;
    }
  }

  // ======================= DIAGNOSTICS =======================

  async runDiagnostics() {
    try {
      console.group("🔧 [E2EEService] Running diagnostics...");

      const diagnostics = {
        timestamp: Date.now(),
        status: this.status,
        keycloakId: this.keycloakId,
        socket: {
          connected: this.socket?.connected || false,
          id: this.socket?.id,
        },
        keys: {},
        storage: {},
        performance: {},
      };

      // Key diagnostics
      try {
        const keyPair = await this.keyStorage.getKeyPair();
        diagnostics.keys.hasKeyPair = !!keyPair;
        diagnostics.keys.fingerprint = keyPair?.fingerprint;
        diagnostics.keys.keyType = keyPair?.keyType;
        diagnostics.keys.createdAt = keyPair?.createdAt;
        diagnostics.keys.keyAge = keyPair ? Date.now() - keyPair.createdAt : 0;
      } catch (error) {
        diagnostics.keys.error = error.message;
      }

      // Storage diagnostics
      try {
        const stats = this.keyStorage.getStorageStats();
        diagnostics.storage = stats;
      } catch (error) {
        diagnostics.storage.error = error.message;
      }

      // Performance test
      const startTime = performance.now();
      try {
        await this.getMyFingerprint();
        diagnostics.performance.fingerprintTime = performance.now() - startTime;
      } catch (error) {
        diagnostics.performance.error = error.message;
      }

      // Web Crypto API availability
      diagnostics.crypto = {
        subtle: !!window.crypto?.subtle,
        getRandomValues: !!window.crypto?.getRandomValues,
        randomUUID: !!window.crypto?.randomUUID,
      };

      console.log("📊 Diagnostics results:", diagnostics);
      console.groupEnd();

      this.emit("diagnosticsComplete", diagnostics);
      return diagnostics;
    } catch (error) {
      console.error("❌ [E2EEService] Diagnostics failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ======================= EVENT MANAGEMENT =======================

  registerEventListeners() {
    // Auto-cleanup old secrets periodically
    this._cleanupInterval = setInterval(async () => {
      try {
        await this.cleanupOldSecrets();
      } catch (error) {
        console.error("❌ [E2EEService] Error cleaning up old secrets:", error);
      }
    }, 60 * 60 * 1000); // Every hour

    // Check key expiration daily
    this._expirationInterval = setInterval(async () => {
      try {
        await this.checkKeyExpiration();
      } catch (error) {
        console.error("❌ [E2EEService] Error checking key expiration:", error);
      }
    }, 24 * 60 * 60 * 1000); // Every day

    // Sync with server periodically
    this._syncInterval = setInterval(async () => {
      try {
        if (this.socket?.connected) {
          // Check if sync is needed first
          const syncNeeded = await this.isSyncNeeded();

          if (syncNeeded.needed) {
            console.log("🔄 Periodic sync needed, performing sync...");
            await this.autoSyncOnLogin();
          } else {
            console.log("✅ Periodic sync check: no sync needed");
          }
        } else {
          console.warn("⚠️ Socket not connected for periodic sync");
        }
      } catch (error) {
        console.error("❌ [E2EEService] Error in periodic sync:", error);
      }
    }, 10 * 60 * 1000); // Every 10 minutes

    // THÊM: Quick sync check every 2 minutes
    this._quickSyncInterval = setInterval(async () => {
      try {
        if (this.socket?.connected) {
          // Just check sync status without performing sync
          const syncNeeded = await this.isSyncNeeded();

          if (syncNeeded.needed) {
            console.log("🔄 Quick sync check: sync needed");
            this.emit("quickSyncCheck", {
              needed: true,
              action: syncNeeded.action,
              timestamp: Date.now(),
            });
          }
        }
      } catch (error) {
        // Silent fail for quick checks
      }
    }, 2 * 60 * 1000); // Every 2 minutes
  }

  async cleanupOldSecrets() {
    try {
      const allSecrets = this.keyStorage.getSharedSecrets();
      const now = Date.now();
      const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days

      let cleanedCount = 0;

      for (const secret of allSecrets) {
        if (secret.lastUsed && now - secret.lastUsed > maxAge) {
          await this.keyStorage.deleteSharedSecret(secret.peerId);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        console.log(`🗑️ [E2EEService] Cleaned up ${cleanedCount} old secrets`);
      }
    } catch (error) {
      console.error("❌ [E2EEService] Error cleaning up old secrets:", error);
    }
  }

  // ======================= COMPATIBILITY HELPERS =======================

  async migrateOldKeys() {
    try {
      // Check for old key formats and migrate if needed
      const oldKey = localStorage.getItem("e2ee_key_pair");
      if (oldKey) {
        console.log("🔄 [E2EEService] Migrating old key format...");

        const keyPair = JSON.parse(oldKey);
        if (keyPair && keyPair.publicKey && keyPair.privateKey) {
          // Calculate fingerprint for old key
          const fingerprint = await this.calculateFingerprint(
            keyPair.publicKey
          );

          const migratedKeyPair = {
            ...keyPair,
            fingerprint,
            keyType: "ecdh",
            createdAt: keyPair.createdAt || Date.now(),
            migratedAt: Date.now(),
          };

          await this.keyStorage.saveKeyPair(migratedKeyPair);
          localStorage.removeItem("e2ee_key_pair");

          console.log("✅ [E2EEService] Key migration completed");
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error("❌ [E2EEService] Error migrating old keys:", error);
      return false;
    }
  }

  // ======================= ENCRYPTION/DECRYPTION HELPERS =======================

  async encryptJSON(data, peerId) {
    try {
      const jsonString = JSON.stringify(data);
      return await this.encryptMessage(jsonString, peerId);
    } catch (error) {
      console.error("❌ [E2EEService] Error encrypting JSON:", error);
      throw error;
    }
  }

  async decryptJSON(encryptedData, senderId) {
    try {
      const result = await this.decryptMessage(encryptedData, senderId);
      if (result.success) {
        result.jsonData = JSON.parse(result.content);
      }
      return result;
    } catch (error) {
      console.error("❌ [E2EEService] Error decrypting JSON:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ======================= STATISTICS =======================

  getStatistics() {
    const allSecrets = this.keyStorage.getSharedSecrets();
    const peerKeys = this.keyStorage.getPeerKeys();

    return {
      timestamp: Date.now(),
      keyPair: {
        exists: !!this.keyStorage.getKeyPair(),
      },
      secrets: {
        total: allSecrets.length,
        active: allSecrets.filter((s) => s.isActive).length,
        bySource: {
          encryption: allSecrets.filter((s) => s.source === "encryption")
            .length,
          decryption: allSecrets.filter((s) => s.source === "decryption")
            .length,
          both: allSecrets.filter((s) => s.source === "both").length,
        },
      },
      peers: {
        total: peerKeys.length,
        withSecrets: new Set(allSecrets.map((s) => s.peerId)).size,
      },
      cache: {
        size: this.sharedSecretCache?.size || 0,
      },
    };
  }

  // ======================= GETTER METHODS =======================

  getKeyStorage() {
    return this.keyStorage;
  }

  getSocket() {
    return this.socket;
  }

  getKeycloakId() {
    return this.keycloakId;
  }

  getCacheStats() {
    if (!this.sharedSecretCache) {
      return {
        size: 0,
        entries: [],
        enabled: false,
      };
    }

    return {
      size: this.sharedSecretCache.size,
      entries: Array.from(this.sharedSecretCache.entries()).map(
        ([key, value]) => ({
          key,
          peerId: value.peerId,
          timestamp: value.timestamp,
          ageMinutes: Math.round((Date.now() - value.timestamp) / 60000),
        })
      ),
      enabled: true,
      maxSize: 50,
      ttlMinutes: 5,
    };
  }

  // ======================= KEY HEALTH CHECK =======================

  async checkKeyHealth() {
    try {
      console.log("🏥 [E2EEService] Checking key health...");

      const healthReport = {
        timestamp: Date.now(),
        keyPair: {},
        storage: {},
        connectivity: {},
        performance: {},
      };

      // 1. Check key pair
      try {
        const keyPair = await this.keyStorage.getKeyPair();
        healthReport.keyPair.exists = !!keyPair;

        if (keyPair) {
          healthReport.keyPair.fingerprint = keyPair.fingerprint;
          healthReport.keyPair.keyType = keyPair.keyType;
          healthReport.keyPair.ageDays = Math.round(
            (Date.now() - keyPair.createdAt) / (24 * 60 * 60 * 1000)
          );
          healthReport.keyPair.isValid = await this.verifyKeyPair();
        }
      } catch (error) {
        healthReport.keyPair.error = error.message;
      }

      // 2. Check storage
      try {
        const stats = this.keyStorage.getStorageStats();
        healthReport.storage = stats;
      } catch (error) {
        healthReport.storage.error = error.message;
      }

      // 3. Check connectivity
      healthReport.connectivity.socketConnected = this.hasSocket();
      healthReport.connectivity.socketId = this.socket?.id;
      healthReport.connectivity.status = this.status;

      // 4. Check cache
      healthReport.cache = this.getCacheStats();

      // 5. Performance test
      const startTime = performance.now();
      try {
        await this.getMyFingerprint();
        healthReport.performance.fingerprintMs = Math.round(
          performance.now() - startTime
        );
      } catch (error) {
        healthReport.performance.error = error.message;
      }

      // 6. Overall health score
      const checks = [];

      // Key pair check (30%)
      if (healthReport.keyPair.exists && healthReport.keyPair.isValid) {
        checks.push(30);
      } else if (healthReport.keyPair.exists) {
        checks.push(15);
      } else {
        checks.push(0);
      }

      // Socket connectivity (20%)
      if (healthReport.connectivity.socketConnected) {
        checks.push(20);
      } else {
        checks.push(5);
      }

      // Storage health (20%)
      if (healthReport.storage.totalItems > 0 && !healthReport.storage.error) {
        checks.push(20);
      } else {
        checks.push(10);
      }

      // Cache health (15%)
      if (healthReport.cache.enabled && healthReport.cache.size > 0) {
        checks.push(15);
      } else {
        checks.push(5);
      }

      // Performance (15%)
      if (
        healthReport.performance.fingerprintMs &&
        healthReport.performance.fingerprintMs < 100
      ) {
        checks.push(15);
      } else {
        checks.push(5);
      }

      healthReport.healthScore = Math.round(checks.reduce((a, b) => a + b, 0));
      healthReport.healthStatus =
        healthReport.healthScore >= 70
          ? "healthy"
          : healthReport.healthScore >= 40
          ? "degraded"
          : "unhealthy";

      console.log(
        `📊 Health check completed: ${healthReport.healthStatus} (${healthReport.healthScore}/100)`
      );

      this.emit("healthCheckComplete", healthReport);
      return healthReport;
    } catch (error) {
      console.error("❌ [E2EEService] Health check failed:", error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  // ======================= MESSAGE VALIDATION =======================

  async validateEncryptedMessage(encryptedData) {
    try {
      const requiredFields = ["ciphertext", "iv", "keyId", "algorithm"];
      const missingFields = requiredFields.filter(
        (field) => !encryptedData[field]
      );

      if (missingFields.length > 0) {
        return {
          isValid: false,
          error: `Missing required fields: ${missingFields.join(", ")}`,
          missingFields,
        };
      }

      // Validate base64 format
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(encryptedData.ciphertext.replace(/\s/g, ""))) {
        return {
          isValid: false,
          error: "Invalid ciphertext format (not base64)",
        };
      }

      if (!base64Regex.test(encryptedData.iv.replace(/\s/g, ""))) {
        return {
          isValid: false,
          error: "Invalid IV format (not base64)",
        };
      }

      // Validate lengths
      const ciphertextLength = encryptedData.ciphertext.length;
      const ivLength = encryptedData.iv.length;

      if (ciphertextLength < 16) {
        return {
          isValid: false,
          error: "Ciphertext too short",
        };
      }

      if (ivLength < 16) {
        return {
          isValid: false,
          error: "IV too short",
        };
      }

      // Validate algorithm
      const supportedAlgorithms = ["AES-GCM-256", "AES-GCM-128"];
      if (!supportedAlgorithms.includes(encryptedData.algorithm)) {
        return {
          isValid: false,
          error: `Unsupported algorithm: ${encryptedData.algorithm}`,
          supportedAlgorithms,
        };
      }

      return {
        isValid: true,
        ciphertextLength,
        ivLength,
        algorithm: encryptedData.algorithm,
        keyId: encryptedData.keyId,
      };
    } catch (error) {
      console.error("❌ [E2EEService] Message validation failed:", error);
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  // ======================= KEY EXPORT/IMPORT UTILITIES =======================

  async exportKeyPairToFile(filename = "e2ee-key-backup.json") {
    try {
      const exportData = await this.exportKeyPair();
      const blob = new Blob([exportData], { type: "application/json" });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      console.log(`✅ Key pair exported to ${filename}`);
      return {
        success: true,
        filename,
        size: blob.size,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [E2EEService] Error exporting key to file:", error);
      throw error;
    }
  }

  async importKeyPairFromFile(file) {
    try {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (event) => {
          try {
            const data = event.target.result;
            const result = await this.importKeyPair(data);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        };

        reader.onerror = () => {
          reject(new Error("Failed to read file"));
        };

        reader.readAsText(file);
      });
    } catch (error) {
      console.error("❌ [E2EEService] Error importing key from file:", error);
      throw error;
    }
  }

  // ======================= KEY COMPARISON =======================

  async compareKeys(peerId1, peerId2) {
    try {
      const key1 = await this.getPeerPublicKey(peerId1);
      const key2 = await this.getPeerPublicKey(peerId2);

      if (!key1 || !key2) {
        return {
          success: false,
          error: "One or both keys not found",
        };
      }

      const fingerprint1 = key1.fingerprint;
      const fingerprint2 = key2.fingerprint;
      const isSame = fingerprint1 === fingerprint2;

      return {
        success: true,
        isSame,
        fingerprints: {
          [peerId1]: fingerprint1,
          [peerId2]: fingerprint2,
        },
        comparison: {
          sameFingerprint: isSame,
          sameKeyType: key1.keyType === key2.keyType,
          key1Age: key1.lastUpdated ? Date.now() - key1.lastUpdated : null,
          key2Age: key2.lastUpdated ? Date.now() - key2.lastUpdated : null,
        },
      };
    } catch (error) {
      console.error("❌ [E2EEService] Error comparing keys:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ======================= UTILITY METHODS =======================

  getStatus() {
    return this.status;
  }

  isReady() {
    return this.status === "ready";
  }

  hasSocket() {
    return this.socket && this.socket.connected;
  }

  async clearAllData() {
    try {
      await this.keyStorage.deleteKeyPair();

      const peerKeys = await this.keyStorage.getPeerKeys();
      for (const peerKey of peerKeys) {
        await this.keyStorage.deletePeerKey(peerKey.peerId);
        await this.keyStorage.deleteSharedSecret(peerKey.peerId);
      }

      this.keyStorage.clearCache();

      console.log("🗑️ [E2EEService] All data cleared");
      this.emit("dataCleared");

      return true;
    } catch (error) {
      console.error("❌ [E2EEService] Error clearing data:", error);
      throw error;
    }
  }

  // ======================= DEBUG =======================

  debugInfo() {
    console.group("🔍 [E2EEService] Debug Info");
    console.log("📊 Status:", this.status);
    console.log("🔌 Socket connected:", this.hasSocket());
    console.log("👤 Keycloak ID:", this.keycloakId);
    console.log("🔄 Socket attempts:", this.socketAttempts);

    const stats = this.keyStorage.getStorageStats();
    console.log("🗄️ Storage Stats:", stats);

    console.groupEnd();
  }

  // ======================= DESTRUCTOR =======================

  destroy() {
    console.log("🧹 [E2EEService] Cleaning up...");

    // Clear all intervals
    if (this._cleanupInterval) clearInterval(this._cleanupInterval);
    if (this._expirationInterval) clearInterval(this._expirationInterval);
    if (this._syncInterval) clearInterval(this._syncInterval);
    if (this._quickSyncInterval) clearInterval(this._quickSyncInterval); // <-- THIẾU NÀY

    // Clear cache
    if (this.sharedSecretCache) {
      console.log(
        `🗑️ Clearing cache with ${this.sharedSecretCache.size} entries`
      );
      this.sharedSecretCache.clear();
      this.sharedSecretCache = null;
    }

    // Clear timeouts
    if (this.socketRetryTimeout) {
      clearTimeout(this.socketRetryTimeout);
      this.socketRetryTimeout = null;
    }

    // Remove all event listeners from this instance
    this.removeAllListeners();

    // Cleanup socket
    this.cleanup();

    // Reset state
    this.status = "destroyed";
    this.socket = null;
    this.keycloakId = null;
    this.socketAttempts = 0;
    this._currentUserId = null;

    console.log("✅ [E2EEService] Cleanup completed");
  }

  // ======================= RESET UTILITIES =======================

  async resetWithConfirmation(
    message = "Are you sure you want to reset all E2EE keys? This cannot be undone."
  ) {
    if (!message) {
      return {
        success: false,
        cancelled: true,
      };
    }

    try {
      console.log("🔄 [E2EEService] Resetting all keys...");

      // Clear all data
      await this.clearAllData();

      // Reset local state
      if (this.sharedSecretCache) {
        this.sharedSecretCache.clear();
      }

      // Generate new key pair
      const newKeyPair = await this.generateKeyPair();

      // Update server if connected
      if (this.socket?.connected) {
        await this.updateServerKey();
      }

      console.log("✅ [E2EEService] Reset completed successfully");

      return {
        success: true,
        newKeyPair,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [E2EEService] Reset failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ======================= BATCH OPERATIONS =======================

  async batchValidatePeers(peerIds) {
    try {
      console.log(
        `🔍 [E2EEService] Batch validating ${peerIds.length} peers...`
      );

      const results = {};
      const validPeers = [];
      const invalidPeers = [];
      const missingPeers = [];

      for (const peerId of peerIds) {
        try {
          const validation = await this.validatePeerKey(peerId);

          results[peerId] = {
            ...validation,
            hasKey: validation.isValid,
            timestamp: Date.now(),
          };

          if (validation.isValid) {
            validPeers.push(peerId);
          } else {
            invalidPeers.push({
              peerId,
              error: validation.error,
            });
          }
        } catch (error) {
          missingPeers.push({
            peerId,
            error: error.message,
          });
          results[peerId] = {
            isValid: false,
            error: error.message,
            hasKey: false,
          };
        }
      }

      const summary = {
        total: peerIds.length,
        valid: validPeers.length,
        invalid: invalidPeers.length,
        missing: missingPeers.length,
        validPercentage: Math.round((validPeers.length / peerIds.length) * 100),
      };

      console.log(
        `✅ Batch validation complete: ${summary.valid}/${summary.total} valid`
      );

      return {
        success: true,
        summary,
        results,
        validPeers,
        invalidPeers,
        missingPeers,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ [E2EEService] Batch validation failed:", error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  // ======================= KEY MIGRATION ASSISTANT =======================

  async runMigrationAssistant() {
    try {
      console.group("🚀 [E2EEService] Running migration assistant...");

      const migrationReport = {
        timestamp: Date.now(),
        steps: [],
        issues: [],
        fixes: [],
      };

      // Step 1: Check for old key formats
      migrationReport.steps.push("Checking for old key formats...");
      const hasOldKeys = await this.migrateOldKeys();
      if (hasOldKeys) {
        migrationReport.fixes.push("Migrated old key format to new format");
      }

      // Step 2: Verify current key pair
      migrationReport.steps.push("Verifying current key pair...");
      const keyPairValid = await this.verifyKeyPair();
      if (!keyPairValid) {
        migrationReport.issues.push("Key pair verification failed");
        migrationReport.fixes.push("Generated new key pair");
      }

      // Step 3: Check key expiration
      migrationReport.steps.push("Checking key expiration...");
      const isExpired = await this.checkKeyExpiration();
      if (isExpired) {
        migrationReport.fixes.push("Rotated expired keys");
      }

      // Step 4: Sync secrets with peers
      migrationReport.steps.push("Syncing secrets with peers...");
      await this.syncSecretsWithPeers();
      migrationReport.fixes.push("Synced secrets with all known peers");

      // Step 5: Run diagnostics
      migrationReport.steps.push("Running diagnostics...");
      const diagnostics = await this.runDiagnostics();
      migrationReport.diagnostics = diagnostics;

      // Step 6: Check health
      migrationReport.steps.push("Checking overall health...");
      const health = await this.checkKeyHealth();
      migrationReport.health = health;

      migrationReport.success = migrationReport.issues.length === 0;
      migrationReport.summary = {
        stepsCompleted: migrationReport.steps.length,
        issuesFound: migrationReport.issues.length,
        fixesApplied: migrationReport.fixes.length,
        healthScore: health.healthScore || 0,
      };

      console.log(
        `✅ Migration assistant completed: ${migrationReport.summary.healthScore}/100 health score`
      );
      console.groupEnd();

      this.emit("migrationComplete", migrationReport);
      return migrationReport;
    } catch (error) {
      console.error("❌ [E2EEService] Migration assistant failed:", error);
      return {
        success: false,
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }

  // ======================= UTILITY FORMATTERS =======================

  formatFingerprint(fingerprint) {
    if (!fingerprint) return "N/A";
    return `${fingerprint.substring(0, 4)}-${fingerprint.substring(4)}`;
  }

  formatKeyInfo(keyInfo) {
    if (!keyInfo) return null;

    return {
      fingerprint: this.formatFingerprint(keyInfo.fingerprint),
      keyType: keyInfo.keyType || "unknown",
      lastUpdated: keyInfo.lastUpdated
        ? new Date(keyInfo.lastUpdated).toLocaleString()
        : "never",
      age: keyInfo.lastUpdated
        ? Math.round(
            (Date.now() - keyInfo.lastUpdated) / (24 * 60 * 60 * 1000)
          ) + " days"
        : "unknown",
    };
  }

  // ======================= EVENT EMITTER HELPERS =======================

  onInitialized(callback) {
    return this.once("initialized", callback);
  }

  onError(callback) {
    return this.on("error", callback);
  }

  onKeyPairGenerated(callback) {
    return this.on("keyPairGenerated", callback);
  }

  onMessageEncrypted(callback) {
    return this.on("messageEncrypted", callback);
  }

  onMessageDecrypted(callback) {
    return this.on("messageDecrypted", (data) => {
      if (data.success) {
        callback(data);
      }
    });
  }

  onSyncComplete(callback) {
    return this.on("syncCompleted", callback);
  }
  onSyncCheckComplete(callback) {
    return this.on("syncCheckComplete", callback);
  }

  onAutoSyncComplete(callback) {
    return this.on("autoSyncComplete", callback);
  }

  onKeySyncedToServer(callback) {
    return this.on("keySyncedToServer", callback);
  }

  onKeyRetrievedFromServer(callback) {
    return this.on("keyRetrievedFromServer", callback);
  }

  onManualSyncComplete(callback) {
    return this.on("manualSyncComplete", callback);
  }

  onQuickSyncCheck(callback) {
    return this.on("quickSyncCheck", callback);
  }

  // ======================= EVENT EMITTER HELPERS =======================

  onFriendKeyUpdated(callback) {
    return this.on("friendKeyUpdated", callback);
  }

  onFriendStatusChanged(callback) {
    return this.on("friendStatusChanged", callback);
  }

  onFriendActiveKeyChanged(callback) {
    return this.on("friendActiveKeyChanged", callback);
  }

  onAllFriendKeysRefreshed(callback) {
    return this.on("allFriendKeysRefreshed", callback);
  }

  onFriendKeyRefreshed(callback) {
    return this.on("friendKeyRefreshed", callback);
  }

  // ======================= CLEANUP =======================

  cleanup() {
    if (this.socketRetryTimeout) {
      clearTimeout(this.socketRetryTimeout);
      this.socketRetryTimeout = null;
    }

    // Clear intervals
    if (this._cleanupInterval) clearInterval(this._cleanupInterval);
    if (this._expirationInterval) clearInterval(this._expirationInterval);
    if (this._syncInterval) clearInterval(this._syncInterval);
    if (this._quickSyncInterval) clearInterval(this._quickSyncInterval); // <-- THIẾU NÀY

    if (this.socket) {
      // Remove all our listeners
      this.socket.off("e2ee_key_update");
      this.socket.off("key_exchange_request");
      this.socket.off("e2ee_status_changed");
      this.socket.off("friend_e2ee_status_changed");
      this.socket.off("sync_status_update"); // <-- THIẾU
      this.socket.off("key_sync_complete"); // <-- THIẾU
      this.socket.off("key_sync_required"); // <-- THIẾU
      this.socket.off("disconnect");
      this.socket.off("connect");
    }

    // Clear cache
    if (this.sharedSecretCache) {
      this.sharedSecretCache.clear();
    }
  }
}

// Singleton instance
const e2eeService = new E2EEService();

// Export for global access (optional)
if (typeof window !== "undefined") {
  window.e2eeService = e2eeService;

  // Add global helpers
  window.E2EEHelpers = {
    getService: () => e2eeService,
    checkStatus: () => e2eeService.getStatus(),
    getFingerprint: () => e2eeService.getMyFingerprint(),
    runDiagnostics: () => e2eeService.runDiagnostics(),
    exportKeys: (password) => e2eeService.exportKeyPair(password),
    resetKeys: () => e2eeService.resetWithConfirmation(),
  };
}

export default e2eeService;
