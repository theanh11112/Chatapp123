// services/e2ee.js
class E2EEService {
  constructor() {
    console.group("🔐 E2EE Service Constructor");
    console.log("Initializing E2EE Service...");

    this.privateKey = null;
    this.publicKey = null;
    this.keyFingerprint = null;
    this.peerKeys = new Map();
    this.socket = null;
    this.keycloakId = null;

    // Load keys từ localStorage
    this.loadLocalKeys();

    console.log("✅ E2EE Service initialized");
    console.groupEnd();
  }

  // Get socket safely
  getSocket() {
    if (typeof window !== "undefined") {
      return window.socket || null;
    }
    return null;
  }

  // Safe initialize
  initialize(keycloakId) {
    this.keycloakId = keycloakId;
    const socket = this.getSocket();

    if (socket) {
      this.socket = socket;
      console.log("🔌 E2EE Service connected to socket");
    } else {
      console.warn(
        "⚠️ E2EE Service: No socket available during initialization"
      );
    }
  }

  // Check if has key pair
  hasKeyPair() {
    return !!(this.publicKey && this.privateKey && this.keyFingerprint);
  }

  // Generate key pair using Web Crypto API
  async generateKeyPair() {
    try {
      console.log("🔑 Generating new ECDH key pair...");

      const keyPair = await window.crypto.subtle.generateKey(
        {
          name: "ECDH",
          namedCurve: "P-256",
        },
        true,
        ["deriveKey", "deriveBits"]
      );

      // Export keys
      const publicKey = await window.crypto.subtle.exportKey(
        "raw",
        keyPair.publicKey
      );
      const privateKey = await window.crypto.subtle.exportKey(
        "pkcs8",
        keyPair.privateKey
      );

      // Convert to Base64
      this.publicKey = this.arrayBufferToBase64(publicKey);
      this.privateKey = this.arrayBufferToBase64(privateKey);

      // Generate fingerprint
      this.keyFingerprint = await this.generateFingerprint(this.publicKey);

      // Save to localStorage
      this.saveLocalKeys();

      console.log("✅ Key pair generated successfully");
      console.log("   Fingerprint:", this.keyFingerprint);

      return {
        publicKey: this.publicKey,
        privateKey: this.privateKey,
        fingerprint: this.keyFingerprint,
      };
    } catch (error) {
      console.error("❌ Error generating key pair:", error);
      throw error;
    }
  }

  // Generate fingerprint from public key
  async generateFingerprint(publicKeyBase64) {
    try {
      const publicKeyBuffer = this.base64ToArrayBuffer(publicKeyBase64);
      const hashBuffer = await window.crypto.subtle.digest(
        "SHA-256",
        publicKeyBuffer
      );
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");
      return hashHex.substring(0, 8).toUpperCase();
    } catch (error) {
      console.error("❌ Error generating fingerprint:", error);
      throw error;
    }
  }

  // Get my public key
  async getMyPublicKey() {
    return this.publicKey;
  }

  // Get my private key (for debugging only)
  async getMyPrivateKey() {
    return this.privateKey;
  }

  // Get my fingerprint
  async getMyFingerprint() {
    return this.keyFingerprint;
  }

  // Save keys to localStorage
  saveLocalKeys() {
    if (this.publicKey && this.privateKey && this.keyFingerprint) {
      try {
        localStorage.setItem("e2ee_public_key", this.publicKey);
        localStorage.setItem("e2ee_private_key", this.privateKey);
        localStorage.setItem("e2ee_fingerprint", this.keyFingerprint);
        localStorage.setItem("e2ee_key_type", "ecdh");
        console.log("💾 Keys saved to localStorage");
      } catch (error) {
        console.error("❌ Error saving keys to localStorage:", error);
      }
    }
  }

  // Load keys from localStorage
  loadLocalKeys() {
    try {
      this.publicKey = localStorage.getItem("e2ee_public_key");
      this.privateKey = localStorage.getItem("e2ee_private_key");
      this.keyFingerprint = localStorage.getItem("e2ee_fingerprint");

      // Load peer keys
      const peerKeysJson = localStorage.getItem("e2ee_peer_keys");
      if (peerKeysJson) {
        this.peerKeys = new Map(JSON.parse(peerKeysJson));
      }

      console.log("📂 Loaded keys from localStorage:", {
        hasPublicKey: !!this.publicKey,
        hasPrivateKey: !!this.privateKey,
        fingerprint: this.keyFingerprint,
        peerKeysCount: this.peerKeys.size,
      });
    } catch (error) {
      console.error("❌ Error loading keys from localStorage:", error);
    }
  }

  // Save peer keys to localStorage
  savePeerKeys() {
    try {
      localStorage.setItem(
        "e2ee_peer_keys",
        JSON.stringify(Array.from(this.peerKeys.entries()))
      );
      console.log("💾 Peer keys saved to localStorage");
    } catch (error) {
      console.error("❌ Error saving peer keys:", error);
    }
  }

  // Delete all keys
  async deleteAllKeys() {
    try {
      // Clear memory
      this.privateKey = null;
      this.publicKey = null;
      this.keyFingerprint = null;
      this.peerKeys.clear();

      // Clear localStorage
      localStorage.removeItem("e2ee_public_key");
      localStorage.removeItem("e2ee_private_key");
      localStorage.removeItem("e2ee_fingerprint");
      localStorage.removeItem("e2ee_peer_keys");
      localStorage.removeItem("e2ee_key_type");

      console.log("🗑️ All E2EE keys deleted");
      return true;
    } catch (error) {
      console.error("❌ Error deleting keys:", error);
      throw error;
    }
  }

  // Utility functions
  arrayBufferToBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return window.btoa(binary);
  }

  base64ToArrayBuffer(base64) {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }

  // Get E2EE info from server
  async getE2EEInfo() {
    try {
      console.log("🔄 Fetching E2EE info from server...");

      const socket = this.getSocket();
      if (!socket || !socket.connected) {
        console.warn("⚠️ Socket not connected, returning fallback data");
        return {
          hasKeys: this.hasKeyPair(),
          e2eeEnabled: false,
          friendsE2EEStatus: {},
          friendKeys: {},
          keys: [],
        };
      }

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          console.warn("⚠️ getE2EEInfo timeout");
          resolve({
            hasKeys: this.hasKeyPair(),
            e2eeEnabled: false,
            friendsE2EEStatus: {},
            friendKeys: {},
            keys: [],
          });
        }, 5000);

        socket.emit("get_e2ee_info", {}, (response) => {
          clearTimeout(timeout);

          if (response && response.status === "success") {
            console.log("✅ E2EE info received");
            resolve({
              hasKeys: this.hasKeyPair(),
              e2eeEnabled: response.data?.e2eeEnabled || false,
              friendsE2EEStatus: response.data?.friendsE2EEStatus || {},
              friendKeys: response.data?.friendKeys || {},
              keys: response.data?.keys || [],
            });
          } else {
            console.warn("⚠️ getE2EEInfo failed:", response?.message);
            resolve({
              hasKeys: this.hasKeyPair(),
              e2eeEnabled: false,
              friendsE2EEStatus: {},
              friendKeys: {},
              keys: [],
            });
          }
        });
      });
    } catch (error) {
      console.error("❌ Error getting E2EE info:", error);
      return {
        hasKeys: this.hasKeyPair(),
        e2eeEnabled: false,
        friendsE2EEStatus: {},
        friendKeys: {},
        keys: [],
      };
    }
  }

  // Update E2EE key on server
  async updateE2EEKey(publicKey, keyType = "ecdh") {
    try {
      const socket = this.getSocket();
      if (!socket || !socket.connected) {
        console.warn("⚠️ Socket not connected for updateE2EEKey");
        return { success: false, message: "Socket not connected" };
      }

      return new Promise((resolve, reject) => {
        socket.emit(
          "update_e2ee_key",
          {
            publicKey,
            keyType,
          },
          (response) => {
            if (response && response.status === "success") {
              console.log("✅ E2EE key updated on server");
              resolve(response);
            } else {
              console.warn("⚠️ updateE2EEKey failed:", response?.message);
              reject(
                new Error(response?.message || "Failed to update E2EE key")
              );
            }
          }
        );
      });
    } catch (error) {
      console.error("❌ Error updating E2EE key:", error);
      throw error;
    }
  }

  // Toggle E2EE status on server
  async toggleE2EE(enabled) {
    try {
      const socket = this.getSocket();
      if (!socket || !socket.connected) {
        console.warn("⚠️ Socket not connected for toggleE2EE");
        return { success: false, message: "Socket not connected" };
      }

      return new Promise((resolve, reject) => {
        socket.emit("toggle_e2ee", { enabled }, (response) => {
          if (response && response.status === "success") {
            console.log(
              `✅ E2EE ${enabled ? "enabled" : "disabled"} on server`
            );
            resolve(response);
          } else {
            console.warn("⚠️ toggleE2EE failed:", response?.message);
            reject(new Error(response?.message || "Failed to toggle E2EE"));
          }
        });
      });
    } catch (error) {
      console.error("❌ Error toggling E2EE:", error);
      throw error;
    }
  }

  // Get friend's public key
  async getFriendPublicKey(friendKeycloakId) {
    try {
      const socket = this.getSocket();
      if (!socket || !socket.connected) {
        console.warn("⚠️ Socket not connected for getFriendPublicKey");
        throw new Error("Socket not connected");
      }

      return new Promise((resolve, reject) => {
        socket.emit(
          "request_e2ee_key",
          {
            userId: friendKeycloakId,
          },
          (response) => {
            if (response && response.status === "success") {
              // Save to local storage
              this.peerKeys.set(friendKeycloakId, {
                publicKey: response.data.publicKey,
                fingerprint: response.data.fingerprint,
              });
              this.savePeerKeys();

              console.log(`✅ Got public key for friend ${friendKeycloakId}`);
              resolve(response.data);
            } else {
              console.warn("⚠️ getFriendPublicKey failed:", response?.message);
              reject(
                new Error(
                  response?.message || "Failed to get friend's public key"
                )
              );
            }
          }
        );
      });
    } catch (error) {
      console.error("❌ Error getting friend public key:", error);
      throw error;
    }
  }

  // Initiate key exchange
  async initiateKeyExchange(friendKeycloakId) {
    try {
      const socket = this.getSocket();
      if (!socket || !socket.connected) {
        console.warn("⚠️ Socket not connected for initiateKeyExchange");
        throw new Error("Socket not connected");
      }

      return new Promise((resolve, reject) => {
        socket.emit(
          "initiate_key_exchange",
          {
            peerId: friendKeycloakId,
          },
          (response) => {
            if (response && response.status === "success") {
              console.log(`✅ Key exchange initiated with ${friendKeycloakId}`);
              resolve(response.data);
            } else {
              console.warn("⚠️ initiateKeyExchange failed:", response?.message);
              reject(
                new Error(
                  response?.message || "Failed to initiate key exchange"
                )
              );
            }
          }
        );
      });
    } catch (error) {
      console.error("❌ Error initiating key exchange:", error);
      throw error;
    }
  }

  // Confirm key exchange
  async confirmKeyExchange(exchangeId, friendKeycloakId, verified = true) {
    try {
      const socket = this.getSocket();
      if (!socket || !socket.connected) {
        console.warn("⚠️ Socket not connected for confirmKeyExchange");
        throw new Error("Socket not connected");
      }

      return new Promise((resolve, reject) => {
        socket.emit(
          "confirm_key_exchange",
          {
            exchangeId,
            peerId: friendKeycloakId,
            publicKey: this.publicKey,
            fingerprint: this.keyFingerprint,
            verified,
          },
          (response) => {
            if (response && response.status === "success") {
              console.log(`✅ Key exchange confirmed with ${friendKeycloakId}`);
              resolve(response.data);
            } else {
              console.warn("⚠️ confirmKeyExchange failed:", response?.message);
              reject(
                new Error(response?.message || "Failed to confirm key exchange")
              );
            }
          }
        );
      });
    } catch (error) {
      console.error("❌ Error confirming key exchange:", error);
      throw error;
    }
  }

  // Encrypt message for a specific peer
  async encryptMessage(message, peerPublicKeyBase64) {
    try {
      // Import peer's public key
      const peerPublicKeyBuffer = this.base64ToArrayBuffer(peerPublicKeyBase64);
      const peerPublicKey = await window.crypto.subtle.importKey(
        "raw",
        peerPublicKeyBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        []
      );

      // Import our private key
      const ourPrivateKeyBuffer = this.base64ToArrayBuffer(this.privateKey);
      const ourPrivateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        ourPrivateKeyBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        ["deriveKey", "deriveBits"]
      );

      // Derive shared secret
      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: "ECDH",
          public: peerPublicKey,
        },
        ourPrivateKey,
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      );

      // Generate IV
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encrypt message
      const encoder = new TextEncoder();
      const encodedMessage = encoder.encode(message);
      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        derivedKey,
        encodedMessage
      );

      return {
        ciphertext: this.arrayBufferToBase64(ciphertext),
        iv: this.arrayBufferToBase64(iv),
        algorithm: "AES-GCM-256",
      };
    } catch (error) {
      console.error("❌ Error encrypting message:", error);
      throw error;
    }
  }

  // Decrypt message
  async decryptMessage(encryptedData, peerPublicKeyBase64) {
    try {
      // Import peer's public key
      const peerPublicKeyBuffer = this.base64ToArrayBuffer(peerPublicKeyBase64);
      const peerPublicKey = await window.crypto.subtle.importKey(
        "raw",
        peerPublicKeyBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        []
      );

      // Import our private key
      const ourPrivateKeyBuffer = this.base64ToArrayBuffer(this.privateKey);
      const ourPrivateKey = await window.crypto.subtle.importKey(
        "pkcs8",
        ourPrivateKeyBuffer,
        { name: "ECDH", namedCurve: "P-256" },
        false,
        ["deriveKey", "deriveBits"]
      );

      // Derive shared secret
      const derivedKey = await window.crypto.subtle.deriveKey(
        {
          name: "ECDH",
          public: peerPublicKey,
        },
        ourPrivateKey,
        {
          name: "AES-GCM",
          length: 256,
        },
        true,
        ["encrypt", "decrypt"]
      );

      // Decrypt message
      const ciphertext = this.base64ToArrayBuffer(encryptedData.ciphertext);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);

      const decrypted = await window.crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        derivedKey,
        ciphertext
      );

      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      console.error("❌ Error decrypting message:", error);
      throw error;
    }
  }

  // Send encrypted message
  async sendEncryptedMessage(
    roomId,
    message,
    friendKeycloakId,
    replyTo = null
  ) {
    try {
      // Get friend's public key
      let friendKey = this.peerKeys.get(friendKeycloakId);
      if (!friendKey) {
        friendKey = await this.getFriendPublicKey(friendKeycloakId);
      }

      // Encrypt message
      const encrypted = await this.encryptMessage(message, friendKey.publicKey);

      const socket = this.getSocket();
      if (!socket || !socket.connected) {
        throw new Error("Socket not connected");
      }

      return new Promise((resolve, reject) => {
        socket.emit(
          "send_encrypted_message",
          {
            roomId,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            keyId: this.keyFingerprint,
            algorithm: encrypted.algorithm,
            replyTo,
          },
          (response) => {
            if (response && response.status === "success") {
              resolve(response.data);
            } else {
              reject(
                new Error(
                  response?.message || "Failed to send encrypted message"
                )
              );
            }
          }
        );
      });
    } catch (error) {
      console.error("❌ Error sending encrypted message:", error);
      throw error;
    }
  }

  // Export keys for backup
  async exportKeys(password) {
    try {
      if (!this.privateKey || !this.publicKey) {
        throw new Error("No keys to export");
      }

      // Create backup data
      const backupData = {
        version: "1.0",
        timestamp: new Date().toISOString(),
        keycloakId: this.keycloakId,
        publicKey: this.publicKey,
        privateKey: this.privateKey,
        fingerprint: this.keyFingerprint,
        peerKeys: Array.from(this.peerKeys.entries()),
        keyType: "ecdh",
      };

      // Encrypt backup with password
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(backupData));

      // Use password to derive encryption key
      const passwordBuffer = encoder.encode(password);
      const passwordKey = await window.crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );

      const salt = window.crypto.getRandomValues(new Uint8Array(16));
      const key = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt"]
      );

      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await window.crypto.subtle.encrypt(
        { name: "AES-GCM", iv: iv },
        key,
        data
      );

      return {
        encrypted: this.arrayBufferToBase64(encrypted),
        salt: this.arrayBufferToBase64(salt),
        iv: this.arrayBufferToBase64(iv),
      };
    } catch (error) {
      console.error("❌ Error exporting keys:", error);
      throw error;
    }
  }

  // Import keys from backup
  async importKeys(backupData, password) {
    try {
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();

      // Decrypt backup
      const passwordBuffer = encoder.encode(password);
      const passwordKey = await window.crypto.subtle.importKey(
        "raw",
        passwordBuffer,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );

      const salt = this.base64ToArrayBuffer(backupData.salt);
      const key = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: 100000,
          hash: "SHA-256",
        },
        passwordKey,
        { name: "AES-GCM", length: 256 },
        false,
        ["decrypt"]
      );

      const iv = this.base64ToArrayBuffer(backupData.iv);
      const encrypted = this.base64ToArrayBuffer(backupData.encrypted);

      const decrypted = await window.crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv },
        key,
        encrypted
      );

      const backup = JSON.parse(decoder.decode(decrypted));

      // Restore keys
      this.publicKey = backup.publicKey;
      this.privateKey = backup.privateKey;
      this.keyFingerprint = backup.fingerprint;
      this.peerKeys = new Map(backup.peerKeys || []);

      // Save to localStorage
      this.saveLocalKeys();
      this.savePeerKeys();

      console.log("✅ Keys imported from backup");
      return true;
    } catch (error) {
      console.error("❌ Error importing keys:", error);
      throw error;
    }
  }
}

// Singleton instance
const e2eeService = new E2EEService();

// For debugging
if (typeof window !== "undefined") {
  window.e2eeService = e2eeService;
}

export default e2eeService;
