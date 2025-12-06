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

      // Export public key ở dạng JWK
      const publicKeyJwk = await window.crypto.subtle.exportKey(
        "jwk",
        keyPair.publicKey
      );

      // Export private key ở dạng JWK
      const privateKeyJwk = await window.crypto.subtle.exportKey(
        "jwk",
        keyPair.privateKey
      );

      // Convert JWK objects to JSON strings
      this.publicKey = JSON.stringify(publicKeyJwk);
      this.privateKey = JSON.stringify(privateKeyJwk);

      // Generate fingerprint từ JWK
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
  async generateFingerprint(publicKeyJson) {
    try {
      console.log("🔍 [Fingerprint] Input:", typeof publicKeyJson);

      // Nếu là JSON string, sử dụng nó trực tiếp
      let keyString;

      if (typeof publicKeyJson === "string") {
        try {
          // Kiểm tra xem có phải JSON hợp lệ không
          const parsed = JSON.parse(publicKeyJson);
          keyString = JSON.stringify(parsed, Object.keys(parsed).sort());
        } catch (e) {
          // Nếu không parse được, dùng string gốc
          keyString = publicKeyJson;
        }
      } else if (typeof publicKeyJson === "object") {
        // Nếu là object, stringify nó
        keyString = JSON.stringify(
          publicKeyJson,
          Object.keys(publicKeyJson).sort()
        );
      } else {
        throw new Error(`Invalid public key type: ${typeof publicKeyJson}`);
      }

      console.log(
        "🔍 [Fingerprint] Processing string length:",
        keyString.length
      );

      // Tạo hash SHA-256
      const encoder = new TextEncoder();
      const data = encoder.encode(keyString);
      const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);

      // Chuyển hash sang hex
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Lấy 8 ký tự đầu (tương tự server)
      const fingerprint = hashHex.substring(0, 8).toUpperCase();

      console.log("🔍 [Fingerprint] Result:", fingerprint);
      return fingerprint;
    } catch (error) {
      console.error("❌ Error generating fingerprint:", error);
      throw error;
    }
  }

  // Get my public key - FIXED VERSION
  async getMyPublicKey() {
    try {
      console.log("🔑 [getMyPublicKey] Called - IMPROVED VERSION");

      // Ưu tiên: đọc từ e2ee_keypair
      const keypairStr = localStorage.getItem("e2ee_keypair");

      if (keypairStr) {
        try {
          const keypair = JSON.parse(keypairStr);

          if (!keypair.publicKey) {
            console.error("❌ No publicKey in keypair");
            // Fallback: thử lấy từ e2ee_public_key
            return this.getMyPublicKeyFallback();
          }

          console.log(
            "✅ [getMyPublicKey] Returning from keypair, fingerprint:",
            keypair.fingerprint
          );

          // Cập nhật instance nếu cần
          if (!this.publicKey || !this.privateKey || !this.keyFingerprint) {
            this.publicKey = keypair.publicKey;
            this.privateKey = keypair.privateKey;
            this.keyFingerprint = keypair.fingerprint;
            console.log("🔄 Updated instance from keypair");
          }

          return keypair.publicKey;
        } catch (e) {
          console.error("❌ Error parsing keypair:", e);
          // Fallback
          return this.getMyPublicKeyFallback();
        }
      } else {
        console.log("📦 No keypair found, using fallback");
        return this.getMyPublicKeyFallback();
      }
    } catch (error) {
      console.error("❌ [getMyPublicKey] Unexpected error:", error);
      return null;
    }
  }

  // Fallback method cho getMyPublicKey
  async getMyPublicKeyFallback() {
    try {
      // Thử lấy từ e2ee_public_key
      const publicKey = localStorage.getItem("e2ee_public_key");

      if (publicKey) {
        console.log("✅ [getMyPublicKey] Returning from e2ee_public_key");

        // Nếu có public key nhưng không có keypair, tạo keypair
        const privateKey = localStorage.getItem("e2ee_private_key");
        const fingerprint = localStorage.getItem("e2ee_fingerprint");

        if (
          privateKey &&
          fingerprint &&
          !localStorage.getItem("e2ee_keypair")
        ) {
          console.log("🔄 Creating missing keypair from individual keys...");
          const keypair = {
            publicKey: publicKey,
            privateKey: privateKey,
            fingerprint: fingerprint,
            keyType: "ecdh",
            timestamp: Date.now(),
          };
          localStorage.setItem("e2ee_keypair", JSON.stringify(keypair));
        }

        return publicKey;
      }

      // Nếu không có key nào, tự động tạo
      console.log("🆕 No keys found, auto-generating key pair...");
      const keyPair = await this.generateKeyPair();
      return keyPair.publicKey;
    } catch (error) {
      console.error("❌ [getMyPublicKeyFallback] Error:", error);
      return null;
    }
  }

  // Load my key pair từ storage
  loadMyKeyPair() {
    try {
      const keypairStr = localStorage.getItem("e2ee_keypair");
      if (!keypairStr) {
        // Thử tạo từ keys riêng lẻ
        const publicKey = localStorage.getItem("e2ee_public_key");
        const privateKey = localStorage.getItem("e2ee_private_key");
        const fingerprint = localStorage.getItem("e2ee_fingerprint");

        if (publicKey && privateKey && fingerprint) {
          console.log(
            "🔄 Creating keypair from individual keys in loadMyKeyPair"
          );
          const keypair = {
            publicKey: publicKey,
            privateKey: privateKey,
            fingerprint: fingerprint,
            keyType: "ecdh",
            timestamp: Date.now(),
          };
          localStorage.setItem("e2ee_keypair", JSON.stringify(keypair));

          this.publicKey = publicKey;
          this.privateKey = privateKey;
          this.keyFingerprint = fingerprint;

          console.log("✅ Created and loaded keypair");
          return true;
        }
        return false;
      }

      const keypair = JSON.parse(keypairStr);

      this.publicKey = keypair.publicKey;
      this.privateKey = keypair.privateKey;
      this.keyFingerprint = keypair.fingerprint;

      console.log("✅ Loaded keypair from storage:", {
        fingerprint: this.keyFingerprint,
        publicKeyLength: this.publicKey?.length,
      });

      return true;
    } catch (error) {
      console.error("❌ Error loading keypair:", error);
      return false;
    }
  }

  // Get my private key (for debugging only)
  async getMyPrivateKey() {
    // Thử load từ keypair trước
    if (!this.privateKey) {
      this.loadMyKeyPair();
    }
    return this.privateKey;
  }

  // Get my fingerprint
  async getMyFingerprint() {
    // Thử load từ keypair trước
    if (!this.keyFingerprint) {
      this.loadMyKeyPair();
    }
    return this.keyFingerprint;
  }

  // Save keys to localStorage - FIXED VERSION
  saveLocalKeys() {
    if (this.publicKey && this.privateKey && this.keyFingerprint) {
      try {
        // 🚨 QUAN TRỌNG: Lưu cả keypair và keys riêng lẻ
        const keypair = {
          publicKey: this.publicKey,
          privateKey: this.privateKey,
          fingerprint: this.keyFingerprint,
          keyType: "ecdh",
          timestamp: Date.now(),
        };

        // 1. Lưu keypair (cho getMyPublicKey() sử dụng)
        localStorage.setItem("e2ee_keypair", JSON.stringify(keypair));

        // 2. Lưu keys riêng lẻ (cho tương thích ngược)
        localStorage.setItem("e2ee_public_key", this.publicKey);
        localStorage.setItem("e2ee_private_key", this.privateKey);
        localStorage.setItem("e2ee_fingerprint", this.keyFingerprint);
        localStorage.setItem("e2ee_key_type", "ecdh");

        console.log("💾 Keys saved to localStorage (with keypair)");
        console.log("   Fingerprint:", this.keyFingerprint);

        return true;
      } catch (error) {
        console.error("❌ Error saving keys to localStorage:", error);
        return false;
      }
    } else {
      console.warn("⚠️ Cannot save keys: incomplete key data");
      return false;
    }
  }

  // Load keys from localStorage - FIXED VERSION
  loadLocalKeys() {
    try {
      // ƯU TIÊN 1: Thử load từ keypair trước
      const keypairStr = localStorage.getItem("e2ee_keypair");
      if (keypairStr) {
        try {
          const keypair = JSON.parse(keypairStr);
          this.publicKey = keypair.publicKey;
          this.privateKey = keypair.privateKey;
          this.keyFingerprint = keypair.fingerprint;
          console.log("✅ Loaded keys from keypair:", {
            fingerprint: this.keyFingerprint,
            keyType: keypair.keyType || "ecdh",
          });
        } catch (parseError) {
          console.warn(
            "⚠️ Error parsing keypair, falling back to individual keys"
          );
        }
      }

      // ƯU TIÊN 2: Nếu không có keypair, load từ keys riêng lẻ
      if (!this.publicKey) {
        this.publicKey = localStorage.getItem("e2ee_public_key");
        this.privateKey = localStorage.getItem("e2ee_private_key");
        this.keyFingerprint = localStorage.getItem("e2ee_fingerprint");

        // Nếu có keys riêng lẻ, tạo keypair
        if (this.publicKey && this.privateKey && this.keyFingerprint) {
          console.log(
            "🔄 Creating keypair from individual keys in loadLocalKeys..."
          );
          this.saveLocalKeys(); // Tự động tạo keypair
        }
      }

      // Kiểm tra nếu keys cũ (raw format) tồn tại
      if (this.publicKey && !this.publicKey.includes('"kty"')) {
        console.log("🔄 Detected old raw format key, migrating to JWK...");

        // Lưu lại raw key để convert sau
        const rawPublicKey = this.publicKey;
        const rawPrivateKey = this.privateKey;

        // Xóa keys cũ
        localStorage.removeItem("e2ee_public_key");
        localStorage.removeItem("e2ee_private_key");

        // Đánh dấu cần tạo keys mới
        this.publicKey = null;
        this.privateKey = null;
        this.keyFingerprint = null;

        console.log("🔄 Old keys cleared, will generate new JWK keys");
      }

      // Load peer keys
      const peerKeysJson = localStorage.getItem("e2ee_peer_keys");
      if (peerKeysJson) {
        try {
          const peerKeysArray = JSON.parse(peerKeysJson);
          this.peerKeys = new Map(peerKeysArray);
        } catch (e) {
          console.warn("⚠️ Error parsing peer keys, starting fresh");
          this.peerKeys = new Map();
        }
      }

      console.log("📂 Loaded keys from localStorage:", {
        hasKeypair: !!keypairStr,
        hasPublicKey: !!this.publicKey,
        isJWK: this.publicKey ? this.publicKey.includes('"kty"') : false,
        fingerprint: this.keyFingerprint,
        peerKeysCount: this.peerKeys.size,
      });

      return this.hasKeyPair();
    } catch (error) {
      console.error("❌ Error loading keys from localStorage:", error);
      return false;
    }
  }

  // Save peer keys to localStorage
  savePeerKeys() {
    try {
      const peerKeysArray = Array.from(this.peerKeys.entries());
      localStorage.setItem("e2ee_peer_keys", JSON.stringify(peerKeysArray));
      console.log(
        "💾 Peer keys saved to localStorage, count:",
        peerKeysArray.length
      );
      return true;
    } catch (error) {
      console.error("❌ Error saving peer keys:", error);
      return false;
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
      localStorage.removeItem("e2ee_keypair");
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
    try {
      console.log(
        "🔍 [base64ToArrayBuffer] Input:",
        typeof base64,
        "length:",
        base64?.length
      );

      if (!base64) {
        console.error("❌ Base64 is null/undefined");
        throw new Error("Base64 string is empty");
      }

      if (typeof base64 !== "string") {
        console.error("❌ Base64 is not string:", typeof base64);
        throw new Error("Base64 must be a string");
      }

      // 1. XÓA khoảng trắng và ký tự đặc biệt
      let cleaned = base64.replace(/\s+/g, "");
      cleaned = cleaned.replace(/[^A-Za-z0-9+/=]/g, "");

      // 2. THÊM padding nếu cần (=)
      while (cleaned.length % 4 !== 0) {
        cleaned += "=";
      }

      // 3. KIỂM TRA định dạng base64
      if (!/^[A-Za-z0-9+/=]+$/.test(cleaned)) {
        console.error(
          "❌ Invalid base64 characters:",
          cleaned.substring(0, 50)
        );
        throw new Error("Invalid base64 format");
      }

      // 4. THỬ decode
      try {
        const binary = window.atob(cleaned);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        console.log(
          "✅ [base64ToArrayBuffer] Success, output length:",
          bytes.length
        );
        return bytes.buffer;
      } catch (atobError) {
        console.error("❌ atob failed:", atobError);
        throw new Error(`Base64 decode failed: ${atobError.message}`);
      }
    } catch (error) {
      console.error("❌ [base64ToArrayBuffer] Critical error:", error);
      console.error("❌ Input sample:", base64?.substring(0, 100));
      throw error;
    }
  }

  // Get E2EE info from server
  async getE2EEInfo() {
    console.log("🔄 Fetching E2EE info from server...");

    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error("Socket not connected"));
        return;
      }

      const timeout = setTimeout(() => {
        console.log("⚠️ getE2EEInfo timeout");
        reject(new Error("Timeout waiting for E2EE info"));
      }, 10000);

      // Tạo unique response id để tránh conflict
      const responseId = `e2ee_info_${Date.now()}`;

      // THÊM: Setup one-time listener cho response
      const handleResponse = (data) => {
        console.log("📥 [e2ee.js] Received E2EE info response:", data);
        clearTimeout(timeout);

        if (data.success) {
          resolve(data.data);
        } else {
          reject(new Error(data.error || "Failed to get E2EE info"));
        }

        // Cleanup listener
        this.socket.off(`e2ee_info_response_${responseId}`, handleResponse);
      };

      // Listen cho response với unique ID
      this.socket.once(`e2ee_info_response_${responseId}`, handleResponse);

      // Gửi request với responseId
      this.socket.emit("get_e2ee_info", { responseId }, (response) => {
        console.log("📤 [e2ee.js] Direct callback response:", response);

        // Nếu có callback response (trường hợp có callback)
        if (response) {
          clearTimeout(timeout);
          this.socket.off(`e2ee_info_response_${responseId}`, handleResponse);

          if (response.success) {
            resolve(response.data);
          } else {
            reject(new Error(response.error || "Failed to get E2EE info"));
          }
        } else {
          // Nếu không có callback response, chờ event response
          console.log("⏳ No direct callback, waiting for socket event...");
        }
      });
    });
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
                keyType: response.data.keyType || "ecdh",
                lastUpdated: Date.now(),
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

      console.log(
        `🔄 [E2EE] Checking if friend ${friendKeycloakId} has E2EE enabled...`
      );

      // TRƯỚC TIÊN: Kiểm tra xem bạn đã có E2EE chưa
      try {
        const e2eeInfo = await this.getE2EEInfo();
        const friends = e2eeInfo?.friends || [];
        const friendHasE2EE = friends.some(
          (f) => f.userId === friendKeycloakId && f.e2eeEnabled
        );

        if (!friendHasE2EE) {
          console.log(
            `⚠️ [E2EE] Friend ${friendKeycloakId} does not have E2EE enabled.`
          );
          console.log(
            `ℹ️ [E2EE] Cannot initiate key exchange with non-E2EE users.`
          );
          return {
            success: false,
            message: "Friend does not have E2EE enabled",
            code: "FRIEND_NO_E2EE",
          };
        }
      } catch (infoError) {
        console.warn(
          "⚠️ Could not check friend E2EE status:",
          infoError.message
        );
      }

      return new Promise((resolve, reject) => {
        socket.emit(
          "initiate_key_exchange",
          {
            peerId: friendKeycloakId,
            timestamp: Date.now(),
            // Thêm thông tin debug
            _debug: {
              myUserId: this.keycloakId,
              myFingerprint: this.keyFingerprint,
              time: new Date().toISOString(),
            },
          },
          (response) => {
            if (response) {
              console.log(`📥 [E2EE] Key exchange response:`, response);

              if (response.status === "success") {
                console.log(
                  `✅ Key exchange initiated with ${friendKeycloakId}`
                );
                resolve(response.data);
              } else if (
                response.message?.includes("already initiated") ||
                response.message?.includes("already exists")
              ) {
                console.log(
                  `ℹ️ Key exchange already in progress with ${friendKeycloakId}`
                );
                resolve({
                  success: true,
                  message: "Key exchange already initiated",
                  data: response.data,
                });
              } else {
                console.warn(
                  `⚠️ initiateKeyExchange failed:`,
                  response.message
                );
                reject(
                  new Error(
                    response.message || "Failed to initiate key exchange"
                  )
                );
              }
            } else {
              console.warn("⚠️ No response from initiateKeyExchange");
              reject(new Error("No response from server"));
            }
          }
        );

        // Timeout để tránh treo vô hạn
        setTimeout(() => {
          reject(new Error("Key exchange timeout (10s)"));
        }, 10000);
      });
    } catch (error) {
      console.error("❌ Error initiating key exchange:", error);

      // Xử lý lỗi đặc biệt
      if (error.message.includes("E2EE key exchange initiated")) {
        console.log("ℹ️ Key exchange was already initiated");
        return {
          success: false,
          message: "Key exchange already in progress",
          code: "ALREADY_INITIATED",
        };
      }

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

  async encryptMessageWithSecret(message, sharedSecret) {
    try {
      console.log(
        `🔐 [encryptMessageWithSecret] Encrypting with shared secret`
      );

      // Chuyển đổi shared secret thành CryptoKey nếu cần
      let cryptoKey;
      if (sharedSecret instanceof CryptoKey) {
        cryptoKey = sharedSecret;
      } else if (typeof sharedSecret === "string") {
        // Nếu là string, chuyển đổi thành ArrayBuffer
        const encoder = new TextEncoder();
        const secretData = encoder.encode(sharedSecret);
        cryptoKey = await window.crypto.subtle.importKey(
          "raw",
          secretData,
          { name: "AES-GCM" },
          false,
          ["encrypt", "decrypt"]
        );
      } else if (sharedSecret instanceof ArrayBuffer) {
        cryptoKey = await window.crypto.subtle.importKey(
          "raw",
          sharedSecret,
          { name: "AES-GCM" },
          false,
          ["encrypt", "decrypt"]
        );
      } else {
        throw new Error("Invalid shared secret format");
      }

      // Tạo IV ngẫu nhiên
      const iv = window.crypto.getRandomValues(new Uint8Array(12));

      // Encode message
      const encoder = new TextEncoder();
      const data = encoder.encode(message);

      // Mã hóa
      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        cryptoKey,
        data
      );

      // Chuyển đổi thành Base64 để lưu trữ
      const ciphertextBase64 = this.arrayBufferToBase64(ciphertext);
      const ivBase64 = this.arrayBufferToBase64(iv);

      console.log(
        `✅ [encryptMessageWithSecret] Message encrypted successfully`
      );
      return {
        success: true,
        ciphertext: ciphertextBase64,
        iv: ivBase64,
        algorithm: "AES-GCM-256",
        keyId: "shared-secret",
      };
    } catch (error) {
      console.error(`❌ [encryptMessageWithSecret] Error:`, error);
      return { success: false, error: error.message };
    }
  }

  // 🆕 THÊM: Helper method ArrayBuffer to Base64

  // 🆕 THÊM: Hàm debug để kiểm tra trạng thái
  debugStatus() {
    console.group("🔍 E2EE Service Debug Status");
    console.log("📊 Instance state:");
    console.log("- hasKeyPair:", this.hasKeyPair());
    console.log("- publicKey length:", this.publicKey?.length);
    console.log("- privateKey length:", this.privateKey?.length);
    console.log("- fingerprint:", this.keyFingerprint);
    console.log("- peerKeys count:", this.peerKeys.size);
    console.log("- socket connected:", this.socket?.connected);

    console.log("📦 LocalStorage state:");
    console.log("- e2ee_keypair:", !!localStorage.getItem("e2ee_keypair"));
    console.log(
      "- e2ee_public_key:",
      !!localStorage.getItem("e2ee_public_key")
    );
    console.log(
      "- e2ee_private_key:",
      !!localStorage.getItem("e2ee_private_key")
    );
    console.log(
      "- e2ee_fingerprint:",
      localStorage.getItem("e2ee_fingerprint")
    );
    console.log(
      "- e2ee_peer_keys count:",
      JSON.parse(localStorage.getItem("e2ee_peer_keys") || "[]").length
    );

    console.groupEnd();
  }
}

// Singleton instance
const e2eeService = new E2EEService();

// For debugging
if (typeof window !== "undefined") {
  window.e2eeService = e2eeService;
}

export default e2eeService;
