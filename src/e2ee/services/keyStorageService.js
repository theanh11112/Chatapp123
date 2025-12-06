import CryptoJS from "crypto-js";

class KeyStorageService {
  constructor() {
    this.STORAGE_KEYS = {
      KEY_PAIR: "e2ee_keypair",
      PEER_KEYS: "e2ee_peer_keys",
      ENCRYPTION_CACHE: "e2ee_encryption_cache",
      MASTER_PASSWORD_HASH: "e2ee_master_hash",
    };

    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes cache
    this.masterPassword = null;

    console.log("🗄️ [KeyStorageService] Initialized");
  }

  // 🔐 MASTER PASSWORD MANAGEMENT

  setMasterPassword(password) {
    try {
      console.log("🔑 [KeyStorageService] Setting master password");

      if (!password || password.length < 4) {
        throw new Error("Password must be at least 4 characters");
      }

      // Create hash for verification
      const hash = CryptoJS.SHA256(password).toString();
      localStorage.setItem(this.STORAGE_KEYS.MASTER_PASSWORD_HASH, hash);

      this.masterPassword = password;
      console.log("✅ [KeyStorageService] Master password set");

      return true;
    } catch (error) {
      console.error(
        "❌ [KeyStorageService] Error setting master password:",
        error
      );
      throw error;
    }
  }

  verifyMasterPassword(password) {
    try {
      const storedHash = localStorage.getItem(
        this.STORAGE_KEYS.MASTER_PASSWORD_HASH
      );
      if (!storedHash) {
        // First time setup
        return true;
      }

      const inputHash = CryptoJS.SHA256(password).toString();
      return storedHash === inputHash;
    } catch (error) {
      console.error("❌ [KeyStorageService] Error verifying password:", error);
      return false;
    }
  }

  hasMasterPassword() {
    return !!localStorage.getItem(this.STORAGE_KEYS.MASTER_PASSWORD_HASH);
  }

  // 🔑 KEY PAIR STORAGE

  async saveKeyPair(keyPair, password = null) {
    try {
      console.log("💾 [KeyStorageService] Saving key pair...");

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
        version: "1.0",
      };

      // Encrypt private key if we have a password
      let encryptedData = dataToStore;
      if (password) {
        encryptedData = this.encryptWithPassword(
          JSON.stringify(dataToStore),
          password
        );
      }

      // Save to localStorage
      localStorage.setItem(
        this.STORAGE_KEYS.KEY_PAIR,
        JSON.stringify(encryptedData)
      );

      // Cache in memory
      this.cache.set(this.STORAGE_KEYS.KEY_PAIR, {
        data: keyPair,
        timestamp: Date.now(),
      });

      console.log("✅ [KeyStorageService] Key pair saved successfully");
      return true;
    } catch (error) {
      console.error("❌ [KeyStorageService] Error saving key pair:", error);
      throw error;
    }
  }

  async getKeyPair(password = null) {
    try {
      console.log("🔍 [KeyStorageService] Getting key pair...");

      // Check cache first
      const cached = this.cache.get(this.STORAGE_KEYS.KEY_PAIR);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log("📦 [KeyStorageService] Using cached key pair");
        return cached.data;
      }

      const stored = localStorage.getItem(this.STORAGE_KEYS.KEY_PAIR);
      if (!stored) {
        console.log("⚠️ [KeyStorageService] No key pair found in storage");
        return null;
      }

      const parsed = JSON.parse(stored);

      // Check if encrypted
      let keyData;
      if (parsed.ciphertext) {
        // Encrypted with password
        if (!password) {
          throw new Error("Password required to decrypt key pair");
        }

        keyData = this.decryptWithPassword(parsed, password);
        keyData = JSON.parse(keyData);
      } else {
        // Not encrypted
        keyData = parsed;
      }

      // Validate key data
      if (!keyData.publicKey || !keyData.privateKey) {
        throw new Error("Invalid key data format");
      }

      // Cache the result
      this.cache.set(this.STORAGE_KEYS.KEY_PAIR, {
        data: keyData,
        timestamp: Date.now(),
      });

      console.log("✅ [KeyStorageService] Key pair retrieved successfully");
      return keyData;
    } catch (error) {
      console.error("❌ [KeyStorageService] Error getting key pair:", error);

      // Clear invalid data
      if (error.message.includes("Invalid") || error.message.includes("JSON")) {
        console.warn("⚠️ [KeyStorageService] Clearing corrupted key pair data");
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
      console.log("🗑️ [KeyStorageService] Deleting key pair");
      localStorage.removeItem(this.STORAGE_KEYS.KEY_PAIR);
      this.cache.delete(this.STORAGE_KEYS.KEY_PAIR);
      console.log("✅ [KeyStorageService] Key pair deleted");
      return true;
    } catch (error) {
      console.error("❌ [KeyStorageService] Error deleting key pair:", error);
      return false;
    }
  }

  // 👥 PEER KEYS STORAGE

  async savePeerKey(peerId, keyInfo) {
    try {
      console.log(`💾 [KeyStorageService] Saving peer key for ${peerId}`);

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

      // Cache
      this.cache.set(`peer_${peerId}`, {
        data: keyInfo,
        timestamp: Date.now(),
      });

      console.log(`✅ [KeyStorageService] Peer key saved for ${peerId}`);
      return true;
    } catch (error) {
      console.error(`❌ [KeyStorageService] Error saving peer key:`, error);
      return false;
    }
  }

  async getPeerKey(peerId) {
    try {
      // Check cache first
      const cacheKey = `peer_${peerId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const allKeys = await this.getPeerKeys();
      const peerKey = allKeys.find((k) => k.peerId === peerId);

      if (peerKey) {
        // Cache result
        this.cache.set(cacheKey, {
          data: peerKey,
          timestamp: Date.now(),
        });
      }

      return peerKey;
    } catch (error) {
      console.error(`❌ [KeyStorageService] Error getting peer key:`, error);
      return null;
    }
  }

  async getPeerKeys() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.PEER_KEYS);
      if (!stored) return [];

      return JSON.parse(stored);
    } catch (error) {
      console.error("❌ [KeyStorageService] Error getting peer keys:", error);
      return [];
    }
  }

  async deletePeerKey(peerId) {
    try {
      console.log(`🗑️ [KeyStorageService] Deleting peer key for ${peerId}`);

      const existing = await this.getPeerKeys();
      const updated = existing.filter((k) => k.peerId !== peerId);

      localStorage.setItem(
        this.STORAGE_KEYS.PEER_KEYS,
        JSON.stringify(updated)
      );

      // Remove from cache
      this.cache.delete(`peer_${peerId}`);

      console.log(`✅ [KeyStorageService] Peer key deleted for ${peerId}`);
      return true;
    } catch (error) {
      console.error(`❌ [KeyStorageService] Error deleting peer key:`, error);
      return false;
    }
  }

  async getPeerByFingerprint(fingerprint) {
    try {
      const allKeys = await this.getPeerKeys();
      return allKeys.find((k) => k.fingerprint === fingerprint);
    } catch (error) {
      console.error(
        "❌ [KeyStorageService] Error getting peer by fingerprint:",
        error
      );
      return null;
    }
  }

  // 🏷️ ENCRYPTION CACHE

  async saveToCache(key, data, ttl = this.cacheTimeout) {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        ttl,
      };

      // Memory cache
      this.cache.set(key, cacheData);

      // Persistent cache
      const existingCache = await this.getPersistentCache();
      existingCache[key] = cacheData;

      // Clean old entries before saving
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
      console.error("❌ [KeyStorageService] Error saving to cache:", error);
      return false;
    }
  }

  async getFromCache(key) {
    try {
      // Check memory cache first
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.ttl) {
        return cached.data;
      }

      // Check persistent cache
      const persistentCache = await this.getPersistentCache();
      const cacheItem = persistentCache[key];

      if (cacheItem && Date.now() - cacheItem.timestamp < cacheItem.ttl) {
        // Update memory cache
        this.cache.set(key, cacheItem);
        return cacheItem.data;
      }

      // Cache expired or not found
      this.cache.delete(key);
      delete persistentCache[key];
      localStorage.setItem(
        this.STORAGE_KEYS.ENCRYPTION_CACHE,
        JSON.stringify(persistentCache)
      );

      return null;
    } catch (error) {
      console.error("❌ [KeyStorageService] Error getting from cache:", error);
      return null;
    }
  }

  async getPersistentCache() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.ENCRYPTION_CACHE);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error(
        "❌ [KeyStorageService] Error getting persistent cache:",
        error
      );
      return {};
    }
  }

  clearCache() {
    try {
      console.log("🧹 [KeyStorageService] Clearing cache");
      this.cache.clear();
      localStorage.removeItem(this.STORAGE_KEYS.ENCRYPTION_CACHE);
      console.log("✅ [KeyStorageService] Cache cleared");
      return true;
    } catch (error) {
      console.error("❌ [KeyStorageService] Error clearing cache:", error);
      return false;
    }
  }

  // 🛡️ ENCRYPTION UTILITIES

  encryptWithPassword(data, password) {
    try {
      const salt = CryptoJS.lib.WordArray.random(128 / 8);
      const key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000,
      });

      const iv = CryptoJS.lib.WordArray.random(128 / 8);
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC,
      });

      return {
        ciphertext: encrypted.ciphertext.toString(CryptoJS.enc.Base64),
        salt: salt.toString(CryptoJS.enc.Hex),
        iv: iv.toString(CryptoJS.enc.Hex),
        algorithm: "AES-CBC-256",
      };
    } catch (error) {
      console.error(
        "❌ [KeyStorageService] Error encrypting with password:",
        error
      );
      throw error;
    }
  }

  decryptWithPassword(encryptedData, password) {
    try {
      const { ciphertext, salt, iv, algorithm } = encryptedData;

      if (algorithm !== "AES-CBC-256") {
        throw new Error(`Unsupported algorithm: ${algorithm}`);
      }

      const saltWordArray = CryptoJS.enc.Hex.parse(salt);
      const key = CryptoJS.PBKDF2(password, saltWordArray, {
        keySize: 256 / 32,
        iterations: 10000,
      });

      const ivWordArray = CryptoJS.enc.Hex.parse(iv);
      const decrypted = CryptoJS.AES.decrypt(ciphertext, key, {
        iv: ivWordArray,
        padding: CryptoJS.pad.Pkcs7,
        mode: CryptoJS.mode.CBC,
      });

      return decrypted.toString(CryptoJS.enc.Utf8);
    } catch (error) {
      console.error(
        "❌ [KeyStorageService] Error decrypting with password:",
        error
      );
      throw error;
    }
  }

  // 📊 STORAGE MANAGEMENT

  getStorageStats() {
    try {
      const stats = {
        keyPair: this.hasKeyPair(),
        peerKeys: 0,
        cacheSize: 0,
        totalSize: 0,
      };

      // Count peer keys
      const peerKeys = localStorage.getItem(this.STORAGE_KEYS.PEER_KEYS);
      if (peerKeys) {
        stats.peerKeys = JSON.parse(peerKeys).length;
      }

      // Calculate cache size
      stats.cacheSize = this.cache.size;

      // Calculate total size (approximate)
      for (const key in this.STORAGE_KEYS) {
        const value = localStorage.getItem(this.STORAGE_KEYS[key]);
        if (value) {
          stats.totalSize += value.length * 2; // Approximate bytes (UTF-16)
        }
      }

      stats.totalSizeKB = (stats.totalSize / 1024).toFixed(2);

      return stats;
    } catch (error) {
      console.error(
        "❌ [KeyStorageService] Error getting storage stats:",
        error
      );
      return {};
    }
  }

  cleanupExpiredData() {
    try {
      console.log("🧹 [KeyStorageService] Cleaning up expired data...");

      let cleanedCount = 0;
      const now = Date.now();

      // Clean memory cache
      for (const [key, cacheItem] of this.cache.entries()) {
        if (now - cacheItem.timestamp > cacheItem.ttl) {
          this.cache.delete(key);
          cleanedCount++;
        }
      }

      // Clean persistent cache
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

      console.log(
        `✅ [KeyStorageService] Cleaned up ${cleanedCount} expired items`
      );
      return cleanedCount;
    } catch (error) {
      console.error(
        "❌ [KeyStorageService] Error cleaning up expired data:",
        error
      );
      return 0;
    }
  }

  exportData() {
    try {
      console.log("📤 [KeyStorageService] Exporting data...");

      const exportData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        keyPair: localStorage.getItem(this.STORAGE_KEYS.KEY_PAIR),
        peerKeys: localStorage.getItem(this.STORAGE_KEYS.PEER_KEYS),
        masterPasswordHash: localStorage.getItem(
          this.STORAGE_KEYS.MASTER_PASSWORD_HASH
        ),
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error("❌ [KeyStorageService] Error exporting data:", error);
      throw error;
    }
  }

  importData(data, overwrite = false) {
    try {
      console.log("📥 [KeyStorageService] Importing data...");

      const importData = JSON.parse(data);

      if (importData.version !== "1.0") {
        throw new Error(`Unsupported version: ${importData.version}`);
      }

      if (!overwrite) {
        // Check for existing data
        if (this.hasKeyPair()) {
          throw new Error(
            "Key pair already exists. Use overwrite=true to replace."
          );
        }
      }

      // Import data
      if (importData.keyPair) {
        localStorage.setItem(this.STORAGE_KEYS.KEY_PAIR, importData.keyPair);
      }

      if (importData.peerKeys) {
        localStorage.setItem(this.STORAGE_KEYS.PEER_KEYS, importData.peerKeys);
      }

      if (importData.masterPasswordHash) {
        localStorage.setItem(
          this.STORAGE_KEYS.MASTER_PASSWORD_HASH,
          importData.masterPasswordHash
        );
      }

      // Clear cache to force reload
      this.cache.clear();

      console.log("✅ [KeyStorageService] Data imported successfully");
      return true;
    } catch (error) {
      console.error("❌ [KeyStorageService] Error importing data:", error);
      throw error;
    }
  }
}

// Singleton instance
const keyStorageService = new KeyStorageService();
export default keyStorageService;
