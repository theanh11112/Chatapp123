import { CryptoUtils } from "../utils/cryptoUtils";
import keyUtils from "../utils/keyUtils";

/**
 * Centralized storage management for all E2EE keys and data
 * Only this service should access localStorage for E2EE data
 */

class KeyStorageService {
  constructor() {
    this.STORAGE_KEYS = {
      KEY_PAIR: "e2ee_keypair",
      PEER_KEYS: "e2ee_peer_keys",
      SHARED_SECRETS: "e2ee_shared_secrets",
      ENCRYPTION_CACHE: "e2ee_encryption_cache",
      MASTER_PASSWORD_HASH: "e2ee_master_hash",
    };

    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    this.masterPassword = null;

    console.log("🗄️ [KeyStorageService] Initialized");
  }

  // ======================= MASTER PASSWORD =======================

  setMasterPassword(password) {
    try {
      if (!password || password.length < 4) {
        throw new Error("Password must be at least 4 characters");
      }

      const hash = CryptoUtils.hashString(password);
      localStorage.setItem(this.STORAGE_KEYS.MASTER_PASSWORD_HASH, hash);

      this.masterPassword = password;
      return true;
    } catch (error) {
      console.error("❌ Error setting master password:", error);
      throw error;
    }
  }

  verifyMasterPassword(password) {
    try {
      const storedHash = localStorage.getItem(
        this.STORAGE_KEYS.MASTER_PASSWORD_HASH
      );
      if (!storedHash) return true;

      const inputHash = CryptoUtils.hashString(password);
      return storedHash === inputHash;
    } catch (error) {
      console.error("❌ Error verifying password:", error);
      return false;
    }
  }

  hasMasterPassword() {
    return !!localStorage.getItem(this.STORAGE_KEYS.MASTER_PASSWORD_HASH);
  }

  // ======================= KEY PAIR STORAGE =======================

  async saveKeyPair(keyPair, password = null) {
    try {
      if (this.hasMasterPassword() && !password) {
        throw new Error("Master password required");
      }

      if (password && !this.verifyMasterPassword(password)) {
        throw new Error("Invalid password");
      }

      const dataToStore = {
        publicKey: keyPair.publicKey,
        privateKey: keyPair.privateKey,
        fingerprint: keyPair.fingerprint,
        keyType: keyPair.keyType || "ecdh",
        createdAt: keyPair.createdAt || Date.now(),
        version: "2.0",
      };

      let storedData = dataToStore;
      if (password) {
        storedData = CryptoUtils.encryptWithPassword(
          JSON.stringify(dataToStore),
          password
        );
      }

      localStorage.setItem(
        this.STORAGE_KEYS.KEY_PAIR,
        JSON.stringify(storedData)
      );

      this.cache.set(this.STORAGE_KEYS.KEY_PAIR, {
        data: keyPair,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error("❌ Error saving key pair:", error);
      throw error;
    }
  }

  async getKeyPair(password = null) {
    try {
      const cached = this.cache.get(this.STORAGE_KEYS.KEY_PAIR);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const stored = localStorage.getItem(this.STORAGE_KEYS.KEY_PAIR);
      if (!stored) {
        return null;
      }

      const parsed = JSON.parse(stored);
      let keyData;

      if (parsed.ciphertext) {
        if (!password) {
          throw new Error("Password required to decrypt key pair");
        }
        const decrypted = CryptoUtils.decryptWithPassword(parsed, password);
        keyData = JSON.parse(decrypted);
      } else {
        keyData = parsed;
      }

      if (!keyData.publicKey || !keyData.privateKey) {
        throw new Error("Invalid key data format");
      }

      this.cache.set(this.STORAGE_KEYS.KEY_PAIR, {
        data: keyData,
        timestamp: Date.now(),
      });

      return keyData;
    } catch (error) {
      console.error("❌ Error getting key pair:", error);

      if (error.message.includes("Invalid") || error.message.includes("JSON")) {
        localStorage.removeItem(this.STORAGE_KEYS.KEY_PAIR);
      }
      return null;
    }
  }

  hasKeyPair() {
    return !!localStorage.getItem(this.STORAGE_KEYS.KEY_PAIR);
  }

  deleteKeyPair() {
    try {
      localStorage.removeItem(this.STORAGE_KEYS.KEY_PAIR);
      this.cache.delete(this.STORAGE_KEYS.KEY_PAIR);
      return true;
    } catch (error) {
      console.error("❌ Error deleting key pair:", error);
      return false;
    }
  }

  // ======================= PEER KEYS STORAGE =======================

  async savePeerKey(peerId, keyInfo) {
    try {
      const existing = await this.getPeerKeys();
      const updated = existing.filter((k) => k.peerId !== peerId);

      updated.push({
        peerId,
        publicKey: keyInfo.publicKey,
        fingerprint: keyInfo.fingerprint,
        keyType: keyInfo.keyType || "ecdh",
        verified: keyInfo.verified || false,
        lastUpdated: keyInfo.lastUpdated || Date.now(),
        username: keyInfo.username,
      });

      localStorage.setItem(
        this.STORAGE_KEYS.PEER_KEYS,
        JSON.stringify(updated)
      );

      this.cache.set(`peer_${peerId}`, {
        data: keyInfo,
        timestamp: Date.now(),
      });

      return true;
    } catch (error) {
      console.error(`❌ Error saving peer key:`, error);
      return false;
    }
  }

  async getPeerKey(peerId) {
    try {
      const cacheKey = `peer_${peerId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const allKeys = await this.getPeerKeys();
      const peerKey = allKeys.find((k) => k.peerId === peerId);

      if (peerKey) {
        this.cache.set(cacheKey, {
          data: peerKey,
          timestamp: Date.now(),
        });
      }

      return peerKey;
    } catch (error) {
      console.error(`❌ Error getting peer key:`, error);
      return null;
    }
  }

  async getPeerKeys() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.PEER_KEYS);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error("❌ Error getting peer keys:", error);
      return [];
    }
  }

  async deletePeerKey(peerId) {
    try {
      const existing = await this.getPeerKeys();
      const updated = existing.filter((k) => k.peerId !== peerId);

      localStorage.setItem(
        this.STORAGE_KEYS.PEER_KEYS,
        JSON.stringify(updated)
      );
      this.cache.delete(`peer_${peerId}`);

      return true;
    } catch (error) {
      console.error(`❌ Error deleting peer key:`, error);
      return false;
    }
  }

  async getPeerByFingerprint(fingerprint) {
    try {
      const allKeys = await this.getPeerKeys();
      return allKeys.find((k) => k.fingerprint === fingerprint);
    } catch (error) {
      console.error("❌ Error getting peer by fingerprint:", error);
      return null;
    }
  }

  // ======================= SHARED SECRETS STORAGE =======================

  async saveSharedSecret(peerId, sharedSecret, metadata = {}) {
    try {
      console.group(`💾 [KeyStorageService] saveSharedSecret for ${peerId}`);

      console.log("🔍 Input parameters:", {
        peerId,
        sharedSecretType: typeof sharedSecret,
        sharedSecretInstance: sharedSecret?.constructor?.name,
        sharedSecretIsCryptoKey: sharedSecret instanceof CryptoKey,
        metadata,
      });

      let secretData;

      // Xử lý CryptoKey
      if (sharedSecret instanceof CryptoKey) {
        console.log("🔑 Processing CryptoKey...");
        console.log("CryptoKey properties:", {
          algorithm: sharedSecret.algorithm,
          extractable: sharedSecret.extractable,
          type: sharedSecret.type,
          usages: Array.from(sharedSecret.usages || []),
        });

        try {
          // Kiểm tra xem key có thể export được không
          if (!sharedSecret.extractable) {
            console.error(
              "❌ CryptoKey is not extractable! Cannot save to storage."
            );
            throw new Error("CryptoKey is not extractable");
          }

          console.log("🔄 Exporting key to raw format...");
          const exported = await window.crypto.subtle.exportKey(
            "raw",
            sharedSecret
          );

          console.log("✅ Export successful:", {
            exportedType: exported.constructor.name,
            exportedSize: exported.byteLength,
          });

          secretData = keyUtils.arrayBufferToBase64(exported);
          console.log("Base64 secret length:", secretData.length);
        } catch (exportError) {
          console.error("❌ Failed to export CryptoKey:", exportError);
          console.groupEnd();
          return false;
        }
      } else if (typeof sharedSecret === "string") {
        console.log("📝 Processing string secret");
        secretData = sharedSecret;
      } else if (sharedSecret instanceof ArrayBuffer) {
        console.log("🔢 Processing ArrayBuffer secret");
        secretData = keyUtils.arrayBufferToBase64(sharedSecret);
      } else {
        console.error("❌ Invalid shared secret format:", {
          type: typeof sharedSecret,
          constructor: sharedSecret?.constructor?.name,
          value: sharedSecret,
        });
        console.groupEnd();
        throw new Error(`Invalid shared secret format: ${typeof sharedSecret}`);
      }

      console.log("✅ Secret data prepared:", {
        type: typeof secretData,
        length: secretData?.length,
        preview: secretData?.substring?.(0, 50) + "...",
      });

      const secretInfo = {
        peerId,
        secret: secretData,
        createdAt: Date.now(),
        algorithm: metadata.algorithm || "AES-GCM-256",
        source: metadata.source || "derived",
        derivedFrom: {
          peerFingerprint: metadata.peerFingerprint,
          ownFingerprint: metadata.ownFingerprint,
          exchangeId: metadata.exchangeId,
        },
        isActive: true,
        lastUsed: Date.now(),
      };

      console.log("📝 Secret info to save:", {
        peerId: secretInfo.peerId,
        algorithm: secretInfo.algorithm,
        source: secretInfo.source,
        secretLength: secretInfo.secret?.length,
        createdAt: new Date(secretInfo.createdAt).toISOString(),
      });

      // Lấy danh sách hiện tại
      const existingSecrets = this.getSharedSecrets();
      console.log("📊 Existing secrets:", {
        count: existingSecrets.length,
        peers: existingSecrets.map((s) => s.peerId),
      });

      // Lọc bỏ secret cũ cho peer này
      const updated = existingSecrets.filter((s) => s.peerId !== peerId);
      console.log(`🔄 Filtered out old secret for ${peerId}:`, {
        beforeCount: existingSecrets.length,
        afterCount: updated.length,
        removed: existingSecrets.length - updated.length,
      });

      // Thêm secret mới
      updated.push(secretInfo);
      console.log(`➕ Added new secret for ${peerId}`);

      // Lưu vào localStorage
      const jsonToStore = JSON.stringify(updated);
      console.log("💾 Saving to localStorage:", {
        key: this.STORAGE_KEYS.SHARED_SECRETS,
        jsonLength: jsonToStore.length,
        jsonPreview: jsonToStore.substring(0, 100) + "...",
      });

      localStorage.setItem(this.STORAGE_KEYS.SHARED_SECRETS, jsonToStore);

      // Xác nhận đã lưu
      const storedBack = localStorage.getItem(this.STORAGE_KEYS.SHARED_SECRETS);
      console.log("✅ Stored confirmation:", {
        stored: !!storedBack,
        length: storedBack?.length,
        matches: storedBack === jsonToStore,
      });

      // Cache
      this.cache.set(`shared_${peerId}`, {
        data: secretInfo,
        timestamp: Date.now(),
      });

      console.log(`✅ Cached secret for ${peerId}`);

      console.groupEnd();
      return true;
    } catch (error) {
      console.error(`❌ Error saving shared secret for ${peerId}:`, error);
      console.error("Stack:", error.stack);
      console.groupEnd();
      return false;
    }
  }

  async getSharedSecret(peerId, restoreAsCryptoKey = true) {
    try {
      const cacheKey = `shared_${peerId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        if (restoreAsCryptoKey) {
          return await this.restoreCryptoKey(cached.data.secret);
        }
        return cached.data;
      }

      const allSecrets = this.getSharedSecrets();
      const secretInfo = allSecrets.find(
        (s) => s.peerId === peerId && s.isActive
      );

      if (!secretInfo) {
        return null;
      }

      this.cache.set(cacheKey, {
        data: secretInfo,
        timestamp: Date.now(),
      });

      if (restoreAsCryptoKey) {
        const cryptoKey = await this.restoreCryptoKey(secretInfo.secret);
        return cryptoKey;
      }

      return secretInfo;
    } catch (error) {
      console.error(`❌ Error getting shared secret:`, error);
      return null;
    }
  }

  // keyStorageService.js - THÊM TRONG getSharedSecrets()
  getSharedSecrets() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.SHARED_SECRETS);
      console.log("🔍 Raw stored value:", stored);

      if (!stored || stored === "{}" || stored === "null") {
        return []; // ⚠️ QUAN TRỌNG: return [] thay vì {}
      }

      const parsed = JSON.parse(stored);

      // FIX: Handle both array and object formats
      if (Array.isArray(parsed)) {
        return parsed;
      } else if (typeof parsed === "object" && parsed !== null) {
        // Convert object to array
        const array = Object.entries(parsed).map(([key, value]) => ({
          peerId: key,
          ...value,
        }));
        return array;
      }

      return [];
    } catch (parseError) {
      console.error("❌ Failed to parse shared secrets:", parseError);
      // FIX: Clear corrupted data
      localStorage.removeItem(this.STORAGE_KEYS.SHARED_SECRETS);
      return [];
    }
  }

  hasSharedSecret(peerId) {
    const secrets = this.getSharedSecrets();
    return secrets.some((s) => s.peerId === peerId && s.isActive);
  }

  async updateSharedSecretUsage(peerId) {
    try {
      const secrets = this.getSharedSecrets();
      const index = secrets.findIndex((s) => s.peerId === peerId && s.isActive);

      if (index !== -1) {
        secrets[index].lastUsed = Date.now();
        localStorage.setItem(
          this.STORAGE_KEYS.SHARED_SECRETS,
          JSON.stringify(secrets)
        );

        this.cache.set(`shared_${peerId}`, {
          data: secrets[index],
          timestamp: Date.now(),
        });

        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Error updating secret usage:`, error);
      return false;
    }
  }

  async deleteSharedSecret(peerId) {
    try {
      const secrets = this.getSharedSecrets();
      const updated = secrets.filter((s) => s.peerId !== peerId);

      localStorage.setItem(
        this.STORAGE_KEYS.SHARED_SECRETS,
        JSON.stringify(updated)
      );
      this.cache.delete(`shared_${peerId}`);

      return true;
    } catch (error) {
      console.error(`❌ Error deleting shared secret:`, error);
      return false;
    }
  }

  async restoreCryptoKey(secretBase64) {
    try {
      console.group("🔄 [KeyStorageService] restoreCryptoKey");
      console.log("📥 Input parameters:", {
        secretBase64Type: typeof secretBase64,
        secretBase64Length: secretBase64?.length,
        secretBase64Preview:
          secretBase64?.substring(0, 50) +
          (secretBase64?.length > 50 ? "..." : ""),
        isString: typeof secretBase64 === "string",
        isNullOrUndefined: secretBase64 === null || secretBase64 === undefined,
        isEmpty: secretBase64 === "",
      });

      // Validation kiểm tra input
      if (!secretBase64) {
        console.error("❌ secretBase64 is null or undefined!");
        console.groupEnd();
        throw new Error("secretBase64 is null or undefined");
      }

      if (typeof secretBase64 !== "string") {
        console.error("❌ secretBase64 is not a string!", {
          actualType: typeof secretBase64,
          value: secretBase64,
        });
        console.groupEnd();
        throw new Error("secretBase64 must be a string");
      }

      if (secretBase64.trim() === "") {
        console.error("❌ secretBase64 is empty string!");
        console.groupEnd();
        throw new Error("secretBase64 is empty string");
      }

      // Kiểm tra định dạng base64 cơ bản
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(secretBase64)) {
        console.warn("⚠️ secretBase64 may not be valid base64");
      }

      console.log("🔢 Step 1: Converting base64 to ArrayBuffer...");

      let secretBuffer;
      try {
        secretBuffer = keyUtils.base64ToArrayBuffer(secretBase64);
        console.log("✅ Base64 conversion successful:", {
          bufferType: secretBuffer?.constructor?.name,
          bufferByteLength: secretBuffer?.byteLength,
          bufferIsArrayBuffer: secretBuffer instanceof ArrayBuffer,
          expectedLength: Math.ceil((secretBase64.length * 3) / 4), // Ước tính độ dài base64
        });

        if (!secretBuffer || secretBuffer.byteLength === 0) {
          console.error("❌ Converted ArrayBuffer is empty!");
          console.groupEnd();
          throw new Error("Empty ArrayBuffer after conversion");
        }
      } catch (conversionError) {
        console.error(
          "❌ Failed to convert base64 to ArrayBuffer:",
          conversionError
        );
        console.error("Base64 string:", secretBase64);
        console.groupEnd();
        throw new Error(`Base64 conversion failed: ${conversionError.message}`);
      }

      console.log("🔑 Step 2: Importing key with Web Crypto API...");
      console.log("Import parameters:", {
        format: "raw",
        algorithm: { name: "AES-GCM", length: 256 },
        extractable: false,
        keyUsages: ["encrypt", "decrypt"],
      });

      let cryptoKey;
      try {
        // Kiểm tra Web Crypto API availability
        if (
          !window.crypto ||
          !window.crypto.subtle ||
          !window.crypto.subtle.importKey
        ) {
          console.error("❌ Web Crypto API not available!");
          console.groupEnd();
          throw new Error("Web Crypto API not available");
        }

        cryptoKey = await window.crypto.subtle.importKey(
          "raw",
          secretBuffer,
          {
            name: "AES-GCM",
            length: 256,
          },
          false, // not extractable
          ["encrypt", "decrypt"]
        );

        console.log("✅ Key import successful!", {
          cryptoKeyExists: !!cryptoKey,
          cryptoKeyType: cryptoKey?.constructor?.name,
          cryptoKeyInstance: cryptoKey instanceof CryptoKey ? "YES" : "NO",
          algorithmName: cryptoKey?.algorithm?.name,
          algorithmLength: cryptoKey?.algorithm?.length,
          extractable: cryptoKey?.extractable,
          keyUsages: cryptoKey?.usages ? Array.from(cryptoKey.usages) : "N/A",
        });

        // Kiểm tra thêm tính hợp lệ của key
        if (!(cryptoKey instanceof CryptoKey)) {
          console.error("❌ Imported object is not a CryptoKey!", cryptoKey);
          console.groupEnd();
          throw new Error("Imported object is not a valid CryptoKey");
        }

        // Kiểm tra algorithm
        if (cryptoKey.algorithm?.name !== "AES-GCM") {
          console.warn("⚠️ Key algorithm mismatch:", cryptoKey.algorithm);
        }

        // Kiểm tra key length
        if (cryptoKey.algorithm?.length !== 256) {
          console.warn("⚠️ Key length mismatch:", cryptoKey.algorithm?.length);
        }

        // Kiểm tra key usages
        const expectedUsages = ["encrypt", "decrypt"];
        const hasValidUsages = expectedUsages.every((usage) =>
          cryptoKey.usages?.includes(usage)
        );

        if (!hasValidUsages) {
          console.warn("⚠️ Key may have incorrect usages:", {
            actualUsages: cryptoKey.usages
              ? Array.from(cryptoKey.usages)
              : "N/A",
            expectedUsages,
          });
        }
      } catch (importError) {
        console.error("❌ Failed to import key:", importError);
        console.error("Error details:", {
          name: importError.name,
          message: importError.message,
          stack: importError.stack,
        });

        // Debug thêm về ArrayBuffer
        console.log("📊 ArrayBuffer details for debugging:", {
          byteLength: secretBuffer.byteLength,
          first10Bytes: Array.from(new Uint8Array(secretBuffer.slice(0, 10))),
          hexPreview: Array.from(new Uint8Array(secretBuffer.slice(0, 10)))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join(" "),
        });

        console.groupEnd();
        throw new Error(`Key import failed: ${importError.message}`);
      }

      // Kiểm tra key có thể sử dụng được không
      console.log("🧪 Step 3: Testing key usability...");
      try {
        // Tạo test data nhỏ
        const testData = new TextEncoder().encode("test");
        const testIv = window.crypto.getRandomValues(new Uint8Array(12));

        // Thử encrypt với key
        const encrypted = await window.crypto.subtle.encrypt(
          {
            name: "AES-GCM",
            iv: testIv,
          },
          cryptoKey,
          testData
        );

        console.log("✅ Key test encryption successful:", {
          encryptedLength: encrypted.byteLength,
          keyIsUsable: true,
        });
      } catch (testError) {
        console.warn(
          "⚠️ Key test failed (but key may still be imported):",
          testError.message
        );
        // Không throw vì key có thể vẫn import thành công
      }

      console.log("🎉 Step 4: Key restoration completed successfully!");
      console.groupEnd();

      return cryptoKey;
    } catch (error) {
      console.error("❌ [KeyStorageService] restoreCryptoKey FAILED:", error);

      // Log thêm thông tin để debug
      console.error("Debug info:", {
        secretBase64First100: secretBase64?.substring?.(0, 100),
        secretBase64Length: secretBase64?.length,
        errorName: error.name,
        errorMessage: error.message,
      });

      console.groupEnd();
      throw error;
    }
  }

  // ======================= CACHE MANAGEMENT =======================

  async saveToCache(key, data, ttl = this.cacheTimeout) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      this.cache.set(key, cacheData);

      const existingCache = await this.getPersistentCache();
      existingCache[key] = cacheData;

      const now = Date.now();
      const cleanedCache = {};
      for (const [cacheKey, cacheItem] of Object.entries(existingCache)) {
        if (now - cacheItem.timestamp < cacheItem.ttl) {
          cleanedCache[cacheKey] = cacheItem;
        }
      }

      localStorage.setItem(
        this.STORAGE_KEYS.ENCRYPTION_CACHE,
        JSON.stringify(cleanedCache)
      );

      return true;
    } catch (error) {
      console.error("❌ Error saving to cache:", error);
      return false;
    }
  }

  async getFromCache(key) {
    try {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }

      const persistentCache = await this.getPersistentCache();
      const cacheItem = persistentCache[key];

      if (cacheItem && Date.now() - cacheItem.timestamp < cacheItem.ttl) {
        this.cache.set(key, cacheItem);
        return cacheItem.data;
      }

      this.cache.delete(key);
      delete persistentCache[key];
      localStorage.setItem(
        this.STORAGE_KEYS.ENCRYPTION_CACHE,
        JSON.stringify(persistentCache)
      );

      return null;
    } catch (error) {
      console.error("❌ Error getting from cache:", error);
      return null;
    }
  }

  async getPersistentCache() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.ENCRYPTION_CACHE);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("❌ Error getting persistent cache:", error);
      return {};
    }
  }

  clearCache() {
    try {
      this.cache.clear();
      localStorage.removeItem(this.STORAGE_KEYS.ENCRYPTION_CACHE);
      return true;
    } catch (error) {
      console.error("❌ Error clearing cache:", error);
      return false;
    }
  }

  // ======================= STORAGE MANAGEMENT =======================

  getStorageStats() {
    try {
      const stats = {
        keyPair: this.hasKeyPair(),
        peerKeys: 0,
        sharedSecrets: 0,
        cacheSize: 0,
        totalSize: 0,
      };

      const peerKeys = localStorage.getItem(this.STORAGE_KEYS.PEER_KEYS);
      if (peerKeys) {
        stats.peerKeys = JSON.parse(peerKeys).length;
      }

      const sharedSecrets = localStorage.getItem(
        this.STORAGE_KEYS.SHARED_SECRETS
      );
      if (sharedSecrets) {
        stats.sharedSecrets = JSON.parse(sharedSecrets).length;
      }

      stats.cacheSize = this.cache.size;

      for (const key in this.STORAGE_KEYS) {
        const value = localStorage.getItem(this.STORAGE_KEYS[key]);
        if (value) {
          stats.totalSize += value.length * 2;
        }
      }

      stats.totalSizeKB = (stats.totalSize / 1024).toFixed(2);

      return stats;
    } catch (error) {
      console.error("❌ Error getting storage stats:", error);
      return {};
    }
  }

  cleanupExpiredData() {
    try {
      let cleanedCount = 0;
      const now = Date.now();

      for (const [key, cacheItem] of this.cache.entries()) {
        if (now - cacheItem.timestamp > cacheItem.ttl) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      const persistentCache = this.getPersistentCache();
      const newCache = {};
      for (const [key, cacheItem] of Object.entries(persistentCache)) {
        if (now - cacheItem.timestamp < cacheItem.ttl) {
          newCache[key] = cacheItem;
        } else {
          cleanedCount++;
        }
      }

      localStorage.setItem(
        this.STORAGE_KEYS.ENCRYPTION_CACHE,
        JSON.stringify(newCache)
      );

      return cleanedCount;
    } catch (error) {
      console.error("❌ Error cleaning up expired data:", error);
      return 0;
    }
  }

  exportData() {
    try {
      const exportData = {
        version: "2.0",
        timestamp: new Date().toISOString(),
        keyPair: localStorage.getItem(this.STORAGE_KEYS.KEY_PAIR),
        peerKeys: localStorage.getItem(this.STORAGE_KEYS.PEER_KEYS),
        sharedSecrets: localStorage.getItem(this.STORAGE_KEYS.SHARED_SECRETS),
        masterPasswordHash: localStorage.getItem(
          this.STORAGE_KEYS.MASTER_PASSWORD_HASH
        ),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("❌ Error exporting data:", error);
      throw error;
    }
  }

  importData(data, overwrite = false) {
    try {
      const importData = JSON.parse(data);

      if (importData.version !== "2.0") {
        throw new Error(`Unsupported version: ${importData.version}`);
      }

      if (!overwrite && this.hasKeyPair()) {
        throw new Error(
          "Key pair already exists. Use overwrite=true to replace."
        );
      }

      if (importData.keyPair) {
        localStorage.setItem(this.STORAGE_KEYS.KEY_PAIR, importData.keyPair);
      }

      if (importData.peerKeys) {
        localStorage.setItem(this.STORAGE_KEYS.PEER_KEYS, importData.peerKeys);
      }

      if (importData.sharedSecrets) {
        localStorage.setItem(
          this.STORAGE_KEYS.SHARED_SECRETS,
          importData.sharedSecrets
        );
      }

      if (importData.masterPasswordHash) {
        localStorage.setItem(
          this.STORAGE_KEYS.MASTER_PASSWORD_HASH,
          importData.masterPasswordHash
        );
      }

      this.cache.clear();

      return true;
    } catch (error) {
      console.error("❌ Error importing data:", error);
      throw error;
    }
  }
  // ======================= SYNC FUNCTIONS =======================

  /**
   * Check if key needs sync with server
   */
  async checkSyncNeeded(clientKeyData) {
    try {
      console.log("🔄 [KeyStorageService] Checking sync needed...");

      // Get local key
      const localKey = await this.getKeyPair();

      if (!localKey && !clientKeyData?.publicKey) {
        console.log("🆕 No keys anywhere, need to create new");
        return {
          syncRequired: true,
          syncAction: "create_new",
          reason: "No keys found locally or from client",
        };
      }

      // Compare timestamps if both exist
      if (localKey && clientKeyData?.publicKey) {
        const localTime = localKey.createdAt || 0;
        const clientTime = clientKeyData.createdAt || 0;

        console.log("📊 Key comparison:", {
          localFingerprint: localKey.fingerprint,
          clientFingerprint: clientKeyData.fingerprint,
          localTime: new Date(localTime).toISOString(),
          clientTime: new Date(clientTime).toISOString(),
          localNewer: localTime > clientTime,
          clientNewer: clientTime > localTime,
        });

        // Same key, check timestamps
        if (localKey.fingerprint === clientKeyData.fingerprint) {
          if (Math.abs(localTime - clientTime) < 1000) {
            console.log("✅ Keys are identical and in sync");
            return {
              syncRequired: false,
              match: true,
              syncAction: "already_synced",
            };
          } else if (localTime > clientTime) {
            console.log("🔄 Local key is newer, server needs update");
            return {
              syncRequired: true,
              syncAction: "use_client_key",
              reason: "Local key is newer",
              newerKey: "local",
            };
          } else {
            console.log("🔄 Client key is newer, client needs update");
            return {
              syncRequired: true,
              syncAction: "use_server_key",
              reason: "Client key is newer",
              newerKey: "client",
            };
          }
        } else {
          // Different fingerprints, need to decide which to use
          console.log("🔄 Different fingerprints, need to sync");
          if (localTime > clientTime) {
            return {
              syncRequired: true,
              syncAction: "use_client_key",
              reason: "Local key is newer and different",
              newerKey: "local",
            };
          } else {
            return {
              syncRequired: true,
              syncAction: "use_server_key",
              reason: "Client key is newer and different",
              newerKey: "client",
            };
          }
        }
      }

      // Only local key exists
      if (localKey && !clientKeyData?.publicKey) {
        console.log("📤 Only local key exists, server needs it");
        return {
          syncRequired: true,
          syncAction: "server_needs_update",
          reason: "Only local key exists",
          key: localKey,
        };
      }

      // Only client key exists
      if (!localKey && clientKeyData?.publicKey) {
        console.log("📥 Only client key exists, need to save locally");
        return {
          syncRequired: true,
          syncAction: "client_needs_update",
          reason: "Only client key exists",
          key: clientKeyData,
        };
      }

      return {
        syncRequired: false,
        syncAction: "no_action_needed",
        reason: "Unknown state",
      };
    } catch (error) {
      console.error("❌ Error checking sync needed:", error);
      return {
        syncRequired: false,
        error: error.message,
        syncAction: "error",
      };
    }
  }

  /**
   * Synchronize key with server data
   */
  async syncWithServerData(serverKeyData) {
    try {
      console.log("🔄 [KeyStorageService] Syncing with server data...");

      if (!serverKeyData || !serverKeyData.publicKey) {
        throw new Error("Invalid server key data");
      }

      // Parse server key data
      const serverKey = {
        publicKey: serverKeyData.publicKey,
        privateKey: serverKeyData.privateKey,
        fingerprint: serverKeyData.fingerprint,
        keyType: serverKeyData.keyType || "ecdh",
        createdAt: serverKeyData.createdAt || Date.now(),
      };

      // Save to local storage
      await this.saveKeyPair(serverKey);

      console.log("✅ Server key saved locally:", {
        fingerprint: serverKey.fingerprint,
        keyType: serverKey.keyType,
      });

      return {
        success: true,
        message: "Key synced from server",
        fingerprint: serverKey.fingerprint,
      };
    } catch (error) {
      console.error("❌ Error syncing with server data:", error);
      throw error;
    }
  }

  /**
   * Get key for server sync (export format)
   */
  async getKeyForServerSync() {
    try {
      const keyPair = await this.getKeyPair();

      if (!keyPair) {
        return null;
      }

      return {
        publicKey: keyPair.publicKey,
        fingerprint: keyPair.fingerprint,
        keyType: keyPair.keyType || "ecdh",
        createdAt: keyPair.createdAt,
        version: keyPair.version || "2.0",
      };
    } catch (error) {
      console.error("❌ Error getting key for server sync:", error);
      return null;
    }
  }

  /**
   * Sync peer keys from server
   */
  async syncPeerKeysFromServer(serverPeerKeys) {
    try {
      console.log("🔄 [KeyStorageService] Syncing peer keys from server...");

      if (!Array.isArray(serverPeerKeys)) {
        console.warn("⚠️ Server peer keys not in array format");
        return false;
      }

      let updatedCount = 0;

      for (const serverPeer of serverPeerKeys) {
        try {
          const existingPeer = await this.getPeerKey(serverPeer.peerId);

          // Update if server has newer data or peer doesn't exist
          if (
            !existingPeer ||
            serverPeer.lastUpdated > existingPeer.lastUpdated
          ) {
            await this.savePeerKey(serverPeer.peerId, {
              publicKey: serverPeer.publicKey,
              fingerprint: serverPeer.fingerprint,
              keyType: serverPeer.keyType || "ecdh",
              verified: serverPeer.verified || false,
              lastUpdated: serverPeer.lastUpdated || Date.now(),
              username: serverPeer.username,
            });
            updatedCount++;
          }
        } catch (peerError) {
          console.warn(
            `⚠️ Error syncing peer ${serverPeer.peerId}:`,
            peerError.message
          );
        }
      }

      console.log(`✅ Synced ${updatedCount} peer keys from server`);
      return updatedCount;
    } catch (error) {
      console.error("❌ Error syncing peer keys:", error);
      throw error;
    }
  }

  /**
   * Export all data for backup
   */
  async exportAllForBackup(includeSecrets = false) {
    try {
      console.log("💾 [KeyStorageService] Exporting all data for backup...");

      const exportData = {
        version: "3.0",
        timestamp: Date.now(),
        exportDate: new Date().toISOString(),
        keyPair: null,
        peerKeys: [],
        sharedSecrets: includeSecrets ? [] : undefined,
        stats: this.getStorageStats(),
      };

      // Export key pair
      const keyPair = await this.getKeyPair();
      if (keyPair) {
        exportData.keyPair = {
          fingerprint: keyPair.fingerprint,
          publicKey: keyPair.publicKey,
          keyType: keyPair.keyType,
          createdAt: keyPair.createdAt,
        };
      }

      // Export peer keys
      const peerKeys = await this.getPeerKeys();
      exportData.peerKeys = peerKeys.map((peer) => ({
        peerId: peer.peerId,
        fingerprint: peer.fingerprint,
        keyType: peer.keyType,
        verified: peer.verified,
        lastUpdated: peer.lastUpdated,
        username: peer.username,
      }));

      // Export shared secrets if requested
      if (includeSecrets) {
        const secrets = this.getSharedSecrets();
        exportData.sharedSecrets = secrets.map((secret) => ({
          peerId: secret.peerId,
          algorithm: secret.algorithm,
          source: secret.source,
          createdAt: secret.createdAt,
          lastUsed: secret.lastUsed,
          isActive: secret.isActive,
        }));
      }

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("❌ Error exporting all data:", error);
      throw error;
    }
  }

  /**
   * Reset all data (for sync conflicts or errors)
   */
  async resetAllData(confirm = false) {
    if (!confirm) {
      throw new Error("Reset requires confirmation");
    }

    try {
      console.log("🗑️ [KeyStorageService] Resetting all data...");

      // Clear all storage
      localStorage.removeItem(this.STORAGE_KEYS.KEY_PAIR);
      localStorage.removeItem(this.STORAGE_KEYS.PEER_KEYS);
      localStorage.removeItem(this.STORAGE_KEYS.SHARED_SECRETS);
      localStorage.removeItem(this.STORAGE_KEYS.ENCRYPTION_CACHE);

      // Clear memory cache
      this.cache.clear();

      console.log("✅ All data reset successfully");
      return true;
    } catch (error) {
      console.error("❌ Error resetting data:", error);
      throw error;
    }
  }

  /**
   * Validate storage integrity
   */
  async validateStorageIntegrity() {
    try {
      console.log("🔍 [KeyStorageService] Validating storage integrity...");

      const issues = [];

      // Check key pair
      try {
        const keyPair = await this.getKeyPair();
        if (keyPair) {
          if (!keyPair.publicKey || typeof keyPair.publicKey !== "string") {
            issues.push("Invalid public key format");
          }
          if (!keyPair.privateKey || typeof keyPair.privateKey !== "string") {
            issues.push("Invalid private key format");
          }
          if (!keyPair.fingerprint || keyPair.fingerprint.length < 8) {
            issues.push("Invalid fingerprint format");
          }
        }
      } catch (keyError) {
        issues.push(`Key pair error: ${keyError.message}`);
      }

      // Check peer keys
      try {
        const peerKeys = await this.getPeerKeys();
        for (const peer of peerKeys) {
          if (!peer.peerId || !peer.publicKey || !peer.fingerprint) {
            issues.push(
              `Invalid peer key format for ${peer.peerId || "unknown"}`
            );
          }
        }
      } catch (peerError) {
        issues.push(`Peer keys error: ${peerError.message}`);
      }

      // Check shared secrets
      try {
        const secrets = this.getSharedSecrets();
        for (const secret of secrets) {
          if (!secret.secret || typeof secret.secret !== "string") {
            issues.push(
              `Invalid secret format for ${secret.peerId || "unknown"}`
            );
          }
        }
      } catch (secretError) {
        issues.push(`Shared secrets error: ${secretError.message}`);
      }

      console.log("✅ Storage integrity check completed:", {
        issuesFound: issues.length,
        issues: issues.length > 0 ? issues : "none",
      });

      return {
        isValid: issues.length === 0,
        issues,
        timestamp: Date.now(),
      };
    } catch (error) {
      console.error("❌ Error validating storage integrity:", error);
      return {
        isValid: false,
        issues: [error.message],
        error: error.message,
      };
    }
  }

  /**
   * Get sync status summary
   */
  async getSyncStatus() {
    try {
      const keyPair = await this.getKeyPair();
      const peerKeys = await this.getPeerKeys();
      const secrets = this.getSharedSecrets();

      return {
        timestamp: Date.now(),
        keyPair: {
          exists: !!keyPair,
          fingerprint: keyPair?.fingerprint,
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
        storage: this.getStorageStats(),
      };
    } catch (error) {
      console.error("❌ Error getting sync status:", error);
      return {
        error: error.message,
        timestamp: Date.now(),
      };
    }
  }
  // ======================= DEBUG =======================

  debugStorage() {
    console.group("🔍 [KeyStorageService] Debug Storage");
    console.log("📊 Storage Stats:", this.getStorageStats());
    console.log("🔑 Key Pair:", this.hasKeyPair() ? "EXISTS" : "NOT FOUND");

    const peerKeys = this.getPeerKeys();
    console.log(`👥 Peer Keys (${peerKeys.length}):`);
    peerKeys.forEach((pk) => {
      console.log(`   ${pk.peerId}:`, {
        fingerprint: pk.fingerprint,
        verified: pk.verified,
      });
    });

    const sharedSecrets = this.getSharedSecrets();
    console.log(`🔐 Shared Secrets (${sharedSecrets.length}):`);
    sharedSecrets.forEach((ss) => {
      console.log(`   ${ss.peerId}:`, {
        algorithm: ss.algorithm,
        source: ss.source,
        isActive: ss.isActive,
      });
    });

    console.log("🧠 Memory Cache Size:", this.cache.size);
    console.groupEnd();
  }
}

// Singleton instance
const keyStorageService = new KeyStorageService();

export const getKeyStorageService = () => keyStorageService;
export default keyStorageService;
