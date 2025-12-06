import { EventEmitter } from "events";
import { AUTO_E2EE_CONFIG, ENCRYPTION_STATUS } from "../constants/e2eeConfig";
import { store } from "../../redux/store";
import { getSocket } from "../../socket"; // 🆕 IMPORT từ socket.js
import keyUtils from "../utils/keyUtils";

class AutoEncryptionService extends EventEmitter {
  constructor() {
    super();
    this.initialized = false;
    this.status = ENCRYPTION_STATUS.DISABLED;
    this.myKeys = {
      publicKey: null,
      privateKey: null,
      fingerprint: null,
    };
    this.peerKeys = new Map(); // peerId -> { publicKey, fingerprint, lastUpdated }
    this.encryptionCache = new Map(); // cacheId -> { data, timestamp }
    this.pendingOperations = new Map();
    this.socket = null; // 🆕 Lưu socket reference
    this.retryCount = 0;
    this.maxRetries = 3;
    this.isInitializing = false;
    this.isInitialized = false;
    this.initializationPromise = null;
    this.e2eeService = null; // 🆕 Thêm e2eeService reference
    this.syncInterval = null;
  }

  // 🆕 Method để set E2EE service từ bên ngoài
  setE2EEService(service) {
    this.e2eeService = service;
    console.log("🔐 [AUTO-ENCRYPTION] E2EE service set:", !!service);
  }

  // 🆕 Method để get E2EE service (với fallback)
  getE2EEService() {
    if (this.e2eeService) {
      return this.e2eeService;
    }

    // Thử import trực tiếp nếu chưa có
    try {
      const e2eeModule = require("../utils/e2ee");
      if (e2eeModule.default) {
        this.e2eeService = e2eeModule.default;
        return this.e2eeService;
      }
    } catch (error) {
      console.warn("⚠️ Could not import e2ee service:", error);
    }

    return null;
  }

  // 🆕 Method để set socket - SỬA LẠI sử dụng getSocket()
  setSocket(socket) {
    // Nếu socket được truyền vào, dùng nó
    if (socket) {
      this.socket = socket;
      console.log("🔌 Socket set directly for auto encryption service");
    } else {
      // Nếu không, lấy từ socket.js
      this.socket = getSocket();
      console.log("🔌 Socket retrieved from socket.js:", !!this.socket);
    }

    // Nếu đã có config enabled và chưa initialized, thử initialize
    if (
      AUTO_E2EE_CONFIG.enabled &&
      !this.isInitialized &&
      this.status === ENCRYPTION_STATUS.DISABLED &&
      this.socket
    ) {
      setTimeout(() => this.initialize(), 1000);
    }
  }

  // 🆕 Helper để lấy socket an toàn
  getSafeSocket() {
    // Ưu tiên socket instance local, sau đó là từ socket.js
    return this.socket || getSocket();
  }

  // 🆕 Helper để lấy current user ID
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

  // 🆕 Lấy danh sách bạn bè từ Redux hoặc API
  async getFriendsList() {
    try {
      // Cách 1: Từ Redux store
      const state = store.getState();
      let friends = state.app?.friends || state.conversation?.friends || [];

      // Nếu không có trong Redux, gọi API
      if (friends.length === 0) {
        console.log("🔄 Fetching friends from API...");
        const api = require("../../utils/axios").default;
        const response = await api.post("/users/get-friends", {
          keycloakId: this.getCurrentUserId(),
        });

        if (response.data?.status === "success") {
          friends = response.data.data || [];
        }
      }

      console.log(`🔍 Found ${friends.length} friends`);
      return friends;
    } catch (error) {
      console.error("❌ Error getting friends list:", error);
      return [];
    }
  }

  // 🆕 Helper để emit an toàn đến server
  async safeEmitToServer(event, data, options = {}) {
    const socket = this.getSafeSocket();
    if (!socket || !socket.connected) {
      throw new Error("Socket not available");
    }

    return new Promise((resolve, reject) => {
      const timeout = options.timeout || 10000;

      const timeoutId = setTimeout(() => {
        reject(new Error(`Socket timeout for event: ${event}`));
      }, timeout);

      // 🔴 QUAN TRỌNG: Xác định event name chính xác
      // Từ log server, server đang dùng "confirm_key_exchange" thay vì "update_e2ee_key"
      let eventName = event;

      // Nếu client gửi update_e2ee_key, server có thể đang dùng confirm_key_exchange
      if (event === "update_e2ee_key") {
        // Thử dùng confirm_key_exchange dựa trên log server
        eventName = "confirm_key_exchange";
        console.log(
          "🔄 [AUTO-ENCRYPTION] Mapping update_e2ee_key -> confirm_key_exchange"
        );
      }

      // XỬ LÝ ĐẶC BIỆT CHO confirm_key_exchange
      if (eventName === "confirm_key_exchange") {
        console.log("🎯 [CONFIRM KEY EXCHANGE] Xử lý đặc biệt...");

        let publicKeyToSend = data.publicKey;

        // Đảm bảo publicKey là string JSON hợp lệ
        if (!publicKeyToSend || publicKeyToSend === "{}") {
          console.warn("⚠️ Public key rỗng, thử lấy từ localStorage...");

          try {
            const storedKey = localStorage.getItem("e2ee_public_key");
            if (storedKey && storedKey !== "{}" && storedKey.length > 10) {
              publicKeyToSend = storedKey;
              console.log("✅ Lấy public key từ localStorage thành công");
            }
          } catch (lsError) {
            console.error("❌ Không đọc được localStorage:", lsError);
          }
        }

        // Nếu vẫn không có key hợp lệ
        if (
          !publicKeyToSend ||
          publicKeyToSend === "{}" ||
          publicKeyToSend.length < 10
        ) {
          const errorMsg = "Public key không hợp lệ hoặc bị rỗng";
          console.error(`❌ ${errorMsg}:`, {
            type: typeof publicKeyToSend,
            length: publicKeyToSend?.length || 0,
            value: publicKeyToSend,
          });
          reject(new Error(errorMsg));
          clearTimeout(timeoutId);
          return;
        }

        // Đảm bảo publicKey là string
        if (typeof publicKeyToSend !== "string") {
          try {
            publicKeyToSend = JSON.stringify(publicKeyToSend);
          } catch (error) {
            console.error("❌ Không thể stringify public key:", error);
            reject(
              new Error("Public key không phải string và không thể stringify")
            );
            clearTimeout(timeoutId);
            return;
          }
        }

        // Kiểm tra JSON hợp lệ
        try {
          JSON.parse(publicKeyToSend);
          console.log("✅ Public key JSON hợp lệ");
        } catch (jsonError) {
          console.error("❌ Public key không phải JSON hợp lệ:", jsonError);
          reject(new Error("Public key không phải JSON hợp lệ"));
          clearTimeout(timeoutId);
          return;
        }

        // Cập nhật data với event name đúng
        data.publicKey = publicKeyToSend;
      }

      // Tạo data gửi đi
      const dataToSend = {
        ...data,
        _debug_timestamp: Date.now(),
        _debug_event: event,
        _debug_original_event: event,
        _debug_mapped_event: eventName,
      };

      console.log(`📤 [SOCKET EMIT] ${event} -> ${eventName}:`, {
        dataType: typeof dataToSend.publicKey,
        dataLength: dataToSend.publicKey?.length || 0,
        hasPublicKey: !!dataToSend.publicKey,
        keys: Object.keys(dataToSend),
      });

      // Gửi qua socket với event name đã map
      socket.emit(eventName, dataToSend, (response) => {
        clearTimeout(timeoutId);

        console.log(`📥 [SOCKET RESPONSE] ${eventName}:`, {
          fullResponse: response,
          status: response?.status,
          success: response?.success,
          message: response?.message,
          error: response?.error,
          data: response?.data,
        });

        // Xử lý response linh hoạt
        if (response) {
          // Kiểm tra các format response khác nhau
          const isSuccess =
            response.success === true ||
            response.status === "success" ||
            (response.code && response.code.toLowerCase() === "success") ||
            (response.data && response.data.success === true);

          if (isSuccess) {
            resolve(response);
            return;
          } else {
            const errorMsg =
              response.message ||
              response.error ||
              response.data?.message ||
              response.data?.error ||
              `Server returned error for ${eventName}`;
            console.error(`❌ Server error: ${errorMsg}`);
            reject(new Error(errorMsg));
            return;
          }
        }

        // Không có response
        else {
          console.warn(`⚠️ No response from server for ${eventName}`);
          reject(new Error(`No response from server for ${eventName}`));
        }
      });
    });
  }

  // 🆕 Request public key từ một bạn bè cụ thể
  // SỬA HÀM requestFriendKey()
  async requestFriendKey(friendId) {
    try {
      console.log(`🔑 [FIXED] Requesting key for friend: ${friendId}`);

      const response = await this.safeEmitToServer("request_e2ee_key", {
        userId: friendId,
        requesterId: this.getCurrentUserId(),
        timestamp: Date.now(),
      });

      if (response?.success && response.data?.publicKey) {
        // Lưu key vào peerKeys
        const keyInfo = {
          publicKey: response.data.publicKey,
          fingerprint: response.data.fingerprint,
          keyType: response.data.keyType,
          lastUpdated: Date.now(),
        };

        this.peerKeys.set(friendId, keyInfo);

        // 🚨 QUAN TRỌNG: LUÔN lưu vào localStorage
        this.savePeerKeyToStorage(friendId, keyInfo);

        console.log(
          `✅ [FIXED] Saved key for friend ${friendId}, fingerprint: ${keyInfo.fingerprint}`
        );
        return keyInfo;
      } else {
        console.warn(`⚠️ No key received for friend ${friendId}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error requesting key for friend ${friendId}:`, error);
      return null;
    }
  }

  // 🆕 THÊM HÀM savePeerKeyToStorage()
  savePeerKeyToStorage(peerId, keyInfo) {
    try {
      // Đọc peer keys hiện có
      const peerKeysStr = localStorage.getItem("e2ee_peer_keys") || "[]";
      let peerKeys = [];

      try {
        peerKeys = JSON.parse(peerKeysStr);
      } catch (e) {
        console.warn("⚠️ Invalid peer keys, resetting");
        peerKeys = [];
      }

      // Tìm và cập nhật hoặc thêm mới
      const existingIndex = peerKeys.findIndex((k) => k.peerId === peerId);
      const newKeyData = {
        peerId,
        publicKey: keyInfo.publicKey,
        fingerprint: keyInfo.fingerprint,
        keyType: keyInfo.keyType,
        lastUpdated: keyInfo.lastUpdated || Date.now(),
      };

      if (existingIndex >= 0) {
        peerKeys[existingIndex] = newKeyData;
      } else {
        peerKeys.push(newKeyData);
      }

      // Lưu lại
      localStorage.setItem("e2ee_peer_keys", JSON.stringify(peerKeys));

      console.log(`💾 Saved peer key for ${peerId} to localStorage`);
      return true;
    } catch (error) {
      console.error(`❌ Error saving peer key to storage:`, error);
      return false;
    }
  }

  // 🆕 THÊM HÀM loadPeerKeysFromStorage() (gọi trong initialize)
  async loadPeerKeysFromStorage() {
    try {
      const peerKeysStr = localStorage.getItem("e2ee_peer_keys");
      if (!peerKeysStr) {
        console.log("📦 No peer keys in storage, creating empty");
        localStorage.setItem("e2ee_peer_keys", JSON.stringify([]));
        return;
      }

      const peerKeys = JSON.parse(peerKeysStr);
      console.log(`📦 Loading ${peerKeys.length} peer keys from storage`);

      peerKeys.forEach((keyInfo) => {
        if (keyInfo.peerId && keyInfo.publicKey) {
          this.peerKeys.set(keyInfo.peerId, {
            publicKey: keyInfo.publicKey,
            fingerprint: keyInfo.fingerprint,
            keyType: keyInfo.keyType || "ecdh",
            lastUpdated: keyInfo.lastUpdated || Date.now(),
          });
        }
      });

      console.log(`✅ Loaded ${this.peerKeys.size} peer keys to memory`);
    } catch (error) {
      console.error("❌ Error loading peer keys from storage:", error);
      // Nếu lỗi, reset peer keys
      localStorage.setItem("e2ee_peer_keys", JSON.stringify([]));
    }
  }

  // 🆕 Helper để lưu peer key
  async savePeerKey(userId, publicKey, fingerprint) {
    try {
      const keyInfo = {
        publicKey: publicKey,
        fingerprint: fingerprint,
        keyType: "ecdh",
        lastUpdated: Date.now(),
      };

      this.peerKeys.set(userId, keyInfo);

      // Lưu vào E2EE service
      if (this.e2eeService?.savePeerPublicKey) {
        await this.e2eeService.savePeerPublicKey(userId, publicKey);
      }

      console.log(
        `💾 Saved peer key for ${userId}, fingerprint: ${fingerprint}`
      );
      this.emit("peerKeyUpdated", { userId, keyInfo });

      return true;
    } catch (error) {
      console.error(`❌ Error saving peer key for ${userId}:`, error);
      return false;
    }
  }

  // 🆕 Xử lý friend key update
  async handleFriendKeyUpdate(data) {
    const { friendId, publicKey, fingerprint } = data;

    console.log(
      `🔄 Processing updated key for friend ${friendId}, fingerprint: ${fingerprint}`
    );

    await this.savePeerKey(friendId, publicKey, fingerprint);

    // Cập nhật UI nếu cần
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("friendKeyUpdated", {
          detail: { friendId, fingerprint },
        })
      );
    }
  }

  // Khởi tạo hệ thống
  async initialize() {
    console.group("🔐 [AUTO-ENCRYPTION INITIALIZE]");
    console.log("initialize() called");

    // FIX: Kiểm tra chặt chẽ hơn, tránh loop
    if (this.isInitialized) {
      console.log("✅ Already fully initialized, returning cached promise");
      console.groupEnd();
      return Promise.resolve(this.initializationPromise);
    }

    // FIX: Nếu đang initializing, return promise hiện tại
    if (this.isInitializing) {
      console.log("⏳ Already initializing, returning existing promise");
      console.groupEnd();
      return this.initializationPromise || Promise.resolve();
    }

    console.log("🚀 Starting fresh initialization...");
    this.isInitializing = true;

    // Tạo promise để cache
    this.initializationPromise = new Promise(async (resolve, reject) => {
      try {
        // 1. Kiểm tra socket - SỬA LẠI: sử dụng getSafeSocket()
        const socket = this.getSafeSocket();
        if (!socket || !socket.connected) {
          console.warn("🔌 Socket not ready, waiting 2s...");
          this.isInitializing = false;

          setTimeout(() => {
            console.log("🔄 Retrying initialization...");
            this.initialize().then(resolve).catch(reject);
          }, 2000);
          return;
        }

        console.log("✅ Socket is ready:", socket.id);

        // 2. Kiểm tra E2EE service
        const e2eeService = this.getE2EEService();
        if (!e2eeService) {
          console.error("❌ E2EE service not available");

          // Thử load lại sau 1 giây
          setTimeout(() => {
            console.log("🔄 Retrying E2EE service check...");
            this.isInitializing = false;
            this.initializationPromise = null;
            this.initialize().then(resolve).catch(reject);
          }, 1000);
          return;
        }

        console.log("✅ E2EE service is available");

        // 3. Đảm bảo có keys
        console.log("🔑 Checking for existing keys...");
        const hasExistingKeys = await this.loadExistingKeyPair();

        if (!hasExistingKeys) {
          console.log("🆕 No existing keys, generating new ones...");
          await e2eeService.generateKeyPair();

          // Gửi public key lên server
          const publicKey = await e2eeService.getMyPublicKey();
          if (publicKey) {
            console.log("📤 Sending public key to server...");
            try {
              await this.safeEmitToServer("update_e2ee_key", {
                publicKey: publicKey,
                keyType: "ecdh",
              });
              console.log("✅ Public key sent to server");
            } catch (error) {
              console.warn(
                "⚠️ Failed to send public key to server:",
                error.message
              );
            }
          }
        } else {
          console.log("✅ Using existing keys");
        }

        // 4. Setup socket listeners
        console.log("👂 Setting up socket listeners...");
        this.setupSocketListeners();

        // 5. Bật E2EE trên server nếu config yêu cầu
        if (AUTO_E2EE_CONFIG.autoEnable) {
          try {
            console.log("🔄 Enabling E2EE on server...");
            await this.enableServerE2EE();
            console.log("✅ E2EE enabled on server");
          } catch (error) {
            console.warn("⚠️ Failed to enable E2EE on server:", error.message);
          }
        }

        // 6. Đánh dấu hoàn thành
        this.isInitialized = true;
        this.isInitializing = false;
        this.status = ENCRYPTION_STATUS.READY;

        console.log("🎉 Initialization completed successfully!");

        // 7. Bắt đầu background sync
        this.startBackgroundSync();

        // 8. Emit event để components khác biết
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("e2ee:autoEncryptionReady", {
              detail: { timestamp: Date.now(), status: this.status },
            })
          );
        }

        // 9. Emit status changed
        this.emit("statusChanged", this.status);

        // 🆕 10. Bắt đầu sync keys với bạn bè sau khi khởi tạo
        setTimeout(() => {
          console.log("🔄 Starting friend key sync...");
          this.syncKeys();
        }, 5000); // Delay 5 giây để đảm bảo mọi thứ sẵn sàng

        console.groupEnd();
        resolve();
      } catch (error) {
        console.error("❌ Initialization failed:", error);
        this.isInitializing = false;
        this.isInitialized = false;
        this.initializationPromise = null;
        this.status = ENCRYPTION_STATUS.ERROR;

        // Emit error
        this.emit("statusChanged", this.status);
        this.emit("error", error);

        console.warn("⚠️ Initialization failed, not retrying automatically");
        console.groupEnd();
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  // 🆕 THÊM: Hàm loadExistingKeyPair để kiểm tra keys
  async loadExistingKeyPair() {
    try {
      const hasPublicKey = localStorage.getItem("e2ee_public_key");
      const hasPrivateKey = localStorage.getItem("e2ee_private_key");

      if (hasPublicKey && hasPrivateKey) {
        console.log("✅ Found existing key pair in localStorage");

        // Kiểm tra xem keys có valid không
        try {
          const keypair = JSON.parse(
            localStorage.getItem("e2ee_keypair") || "{}"
          );
          if (keypair.publicKey && keypair.fingerprint) {
            console.log(
              "🔑 Valid key pair found, fingerprint:",
              keypair.fingerprint
            );
            return true;
          }
        } catch (e) {
          console.warn("⚠️ Invalid key pair in localStorage");
        }
      }

      return false;
    } catch (error) {
      console.error("❌ Error loading existing key pair:", error);
      return false;
    }
  }

  // 🆕 Thêm hàm setupSocketListeners
  setupSocketListeners() {
    const socket = this.getSafeSocket();
    if (!socket) return;

    console.log("👂 Setting up socket event listeners...");

    // Listen for peer key updates
    socket.on("e2ee_key_update", (data) => {
      console.log("🔑 Received key update:", data);
      if (data.userId && data.publicKey) {
        this.peerKeys.set(data.userId, {
          publicKey: data.publicKey,
          fingerprint: data.fingerprint,
          keyType: data.keyType,
          lastUpdated: Date.now(),
        });
        this.emit("peerKeyUpdated", { userId: data.userId });
      }
    });

    // 🆕 THÊM: Listener cho friend key updates
    socket.on("friend_e2ee_key_updated", (data) => {
      console.log("🔑 [FRIEND KEY UPDATE] Received:", data);

      if (data.friendId && data.publicKey) {
        this.handleFriendKeyUpdate(data);
      }
    });

    // 🆕 THÊM: Listener cho batch key updates
    socket.on("batch_e2ee_keys", (data) => {
      console.log(
        "📦 [BATCH KEYS] Received keys for friends:",
        data.keys?.length || 0
      );

      if (data.keys && Array.isArray(data.keys)) {
        data.keys.forEach((keyData) => {
          if (keyData.userId && keyData.publicKey) {
            this.savePeerKey(
              keyData.userId,
              keyData.publicKey,
              keyData.fingerprint
            );
          }
        });
      }
    });

    // 🆕 THÊM: Listener cho key request responses
    socket.on("e2ee_key_response", (data) => {
      console.log("📥 [KEY RESPONSE] Received:", data.targetUserId);

      if (data.targetUserId && data.publicKey) {
        this.savePeerKey(data.targetUserId, data.publicKey, data.fingerprint);
      }
    });

    // Listen for encryption status changes
    socket.on("e2ee_status_changed", (data) => {
      console.log("🔄 E2EE status changed:", data);
      if (data.status) {
        this.status = data.status;
        this.emit("statusChanged", data.status);
      }
    });

    // Listen for key exchange requests
    socket.on("key_exchange_request", (data) => {
      console.log("🔄 Key exchange request:", data);
      this.emit("keyExchangeRequest", data);
    });

    // Listen for friend E2EE status changes
    socket.on("friend_e2ee_status_changed", (data) => {
      console.log("🔄 Friend E2EE status changed:", data);
      this.emit("friendStatusChanged", data);
    });

    // Listen for E2EE errors
    socket.on("e2ee_error", (data) => {
      console.error("❌ E2EE error:", data);
      this.emit("error", data);
    });

    console.log("✅ Socket listeners setup completed");
  }

  // Kiểm tra hỗ trợ Web Crypto API
  supportsWebCrypto() {
    return window.crypto && window.crypto.subtle;
  }

  // Bật E2EE trên server - VERSION MỚI VỚI DEBUG
  async enableServerE2EE() {
    console.group("🔐 [ENABLE SERVER E2EE DEBUG]");

    if (!AUTO_E2EE_CONFIG.autoEnable) {
      console.log("⚠️ Auto enable disabled in config");
      console.groupEnd();
      return;
    }

    try {
      const e2eeService = this.getE2EEService();
      if (!e2eeService) {
        throw new Error("No E2EE service available");
      }

      // 1. Lấy public key
      const publicKey = await e2eeService.getMyPublicKey();

      if (!publicKey || publicKey === "{}" || publicKey.length < 10) {
        throw new Error("Invalid public key from service");
      }

      console.log("📤 Sending public key to server...");

      // Sửa: Dùng confirm_key_exchange thay vì update_e2ee_key
      const keyData = {
        publicKey:
          typeof publicKey === "string" ? publicKey : JSON.stringify(publicKey),
        keyType: "ecdh",
        timestamp: Date.now(),
      };

      console.log("🔍 Key data to send:", {
        event: "confirm_key_exchange",
        keyLength: keyData.publicKey.length,
        keyType: keyData.keyType,
      });

      // Gửi với event name đúng
      const updateResponse = await this.safeEmitToServer(
        "confirm_key_exchange",
        keyData
      );

      console.log("✅ Public key sent successfully:", updateResponse);

      // 2. Bật E2EE (nếu cần)
      if (AUTO_E2EE_CONFIG.enableToggle) {
        console.log("🔄 Enabling E2EE toggle...");
        try {
          const enableResponse = await this.safeEmitToServer("toggle_e2ee", {
            enabled: true,
            debug: true,
          });

          console.log("✅ E2EE enabled:", enableResponse);
        } catch (toggleError) {
          console.warn("⚠️ Failed to enable E2EE toggle:", toggleError.message);
          // Không reject vì gửi key thành công là quan trọng nhất
        }
      }

      console.groupEnd();
      return updateResponse;
    } catch (error) {
      console.error("❌ Error in enableServerE2EE:", error.message);
      console.error("   Stack:", error.stack);
      console.groupEnd();
      throw error;
    }
  }

  // Lấy thông tin E2EE từ server
  async fetchE2EEInfo() {
    try {
      console.log("🔄 Fetching E2EE info from server...");

      const response = await this.safeEmitToServer("get_e2ee_info", {
        responseId: `e2ee_info_${Date.now()}`, // Thêm responseId để track
      });

      if (response?.success) {
        console.log("📊 E2EE Info received:", response.data);
        this.emit("infoReceived", response.data);

        // Cập nhật trạng thái local
        if (response.data.e2eeEnabled) {
          this.status = ENCRYPTION_STATUS.READY;
        } else {
          this.status = ENCRYPTION_STATUS.DISABLED;
        }

        return response.data;
      } else {
        console.error("❌ Failed to fetch E2EE info:", response?.error);
        return null;
      }
    } catch (error) {
      console.error("❌ Failed to fetch E2EE info:", error.message);
      return null;
    }
  }

  // Bắt đầu background sync
  startBackgroundSync() {
    if (this.syncInterval) clearInterval(this.syncInterval);

    this.syncInterval = setInterval(async () => {
      await this.syncKeys();
    }, AUTO_E2EE_CONFIG.backgroundSyncInterval || 60000);

    // Đồng bộ ngay lập tức
    setTimeout(() => this.syncKeys(), 2000);
  }

  // 🆕 SỬA LẠI: Hàm đồng bộ keys với bạn bè
  async syncKeys() {
    if (!this.isInitialized) return;

    try {
      // 1. Lấy danh sách bạn bè
      const friends = await this.getFriendsList();

      console.log(
        `🔄 [AUTO-ENCRYPTION] Syncing keys for ${friends.length} friends`
      );

      // 2. Kiểm tra và request keys cho bạn bè
      const results = [];
      for (const friend of friends) {
        const friendId = friend.keycloakId || friend.id;
        if (!friendId) continue;

        // Kiểm tra xem đã có key chưa
        if (!this.peerKeys.has(friendId)) {
          const result = await this.requestFriendKey(friendId);
          results.push({ friendId, success: !!result });
        } else {
          // Kiểm tra key expiration
          const keyInfo = this.peerKeys.get(friendId);
          const keyAge = Date.now() - keyInfo.lastUpdated;
          const maxAge = 24 * 60 * 60 * 1000; // 24 giờ

          if (keyAge > maxAge) {
            console.log(`🔄 Refreshing key for ${friendId}`);

            const result = await this.requestFriendKey(friendId);
            results.push({ friendId, success: !!result });
          } else {
            results.push({ friendId, success: true, cached: true });
          }
        }
      }

      // 3. Tổng kết
      const successful = results.filter((r) => r.success).length;
      console.log(
        `✅ [AUTO-ENCRYPTION] Synced keys with ${successful}/${friends.length} friends`
      );

      // 4. Broadcast kết quả
      this.emit("keysSyncCompleted", {
        total: friends.length,
        successful: successful,
        results: results,
      });
    } catch (error) {
      console.error("❌ [AUTO-ENCRYPTION] Background key sync failed:", error);
      this.emit("keysSyncFailed", { error: error.message });
    }
  }

  // 🆕 Thêm hàm manual sync (cho testing)
  async manualSyncFriendKeys() {
    console.log("🔄 Manual sync of friend keys triggered");

    try {
      const friends = await this.getFriendsList();
      console.log(`🔍 Found ${friends.length} friends to sync`);

      if (friends.length === 0) {
        console.log("⚠️ No friends found to sync keys with");
        return { success: false, message: "No friends found" };
      }

      // Request key từng bạn bè
      const results = [];
      for (const friend of friends) {
        const friendId = friend.keycloakId || friend.id;
        console.log(`🔑 Requesting key for friend: ${friendId}`);

        const success = await this.requestFriendKey(friendId);
        results.push({ friendId, success });

        // Delay để tránh flood server
        await new Promise((resolve) => setTimeout(resolve, 500));
      }

      // Tổng kết
      const successful = results.filter((r) => r.success).length;
      console.log(
        `✅ Manual sync completed: ${successful}/${friends.length} successful`
      );

      return {
        success: true,
        total: friends.length,
        successful: successful,
        results: results,
      };
    } catch (error) {
      console.error("❌ Error in manual sync:", error);
      return { success: false, error: error.message };
    }
  }

  // 🆕 Check và debug peer keys
  checkPeerKeys() {
    console.group("🔍 [CHECK PEER KEYS]");

    const totalPeers = this.peerKeys.size;
    console.log(`📊 Total peers in cache: ${totalPeers}`);

    // Hiển thị từng peer key
    this.peerKeys.forEach((keyInfo, peerId) => {
      console.log(`👤 ${peerId}:`, {
        hasKey: !!keyInfo.publicKey,
        fingerprint: keyInfo.fingerprint,
        keyType: keyInfo.keyType,
        age: Math.round((Date.now() - keyInfo.lastUpdated) / 1000) + "s ago",
      });
    });

    // Kiểm tra localStorage
    try {
      const e2eeKeys = localStorage.getItem("e2ee_keys");
      if (e2eeKeys) {
        const parsed = JSON.parse(e2eeKeys);
        const peerCount = parsed.peerKeys
          ? Object.keys(parsed.peerKeys).length
          : 0;
        console.log(`💾 LocalStorage peer keys: ${peerCount}`);
      }
    } catch (error) {
      console.warn("⚠️ Cannot check localStorage:", error.message);
    }

    console.groupEnd();

    return Array.from(this.peerKeys.entries());
  }

  // Request key từ peer
  async requestPeerKey(peerId) {
    try {
      const response = await this.safeEmitToServer("request_e2ee_key", {
        userId: peerId,
      });

      if (response?.success && response.data?.publicKey) {
        const keyInfo = {
          publicKey: response.data.publicKey,
          fingerprint: response.data.fingerprint,
          keyType: response.data.keyType,
          lastUpdated: Date.now(),
        };

        this.peerKeys.set(peerId, keyInfo);
        this.emit("peerKeyUpdated", { peerId, keyInfo });

        console.log(`✅ Got public key for ${peerId}`);
        return keyInfo;
      }
    } catch (error) {
      console.error(`❌ Failed to get key for ${peerId}:`, error.message);
    }

    return null;
  }

  // Đồng bộ keys cho group chat
  async syncGroupKeys(groupId) {
    // TODO: Implement group key sync
    console.log(`🔄 [AUTO-ENCRYPTION] Syncing keys for group ${groupId}`);
  }

  // Kiểm tra có thể mã hóa cho peer không
  async canEncryptTo(peerId) {
    // Kiểm tra cache trước
    const cacheKey = `canEncrypt_${peerId}`;
    const cached = this.encryptionCache.get(cacheKey);

    if (
      cached &&
      Date.now() - cached.timestamp < (AUTO_E2EE_CONFIG.cacheDuration || 300000)
    ) {
      return cached.data;
    }

    try {
      // Kiểm tra có key trong cache không
      if (this.peerKeys.has(peerId)) {
        const result = { canEncrypt: true, hasKey: true };
        this.encryptionCache.set(cacheKey, {
          data: result,
          timestamp: Date.now(),
        });
        return result;
      }

      // Gửi request kiểm tra đến server
      const response = await this.safeEmitToServer("check_e2ee_status", {
        userId: peerId,
      });

      const canEncrypt =
        response?.success && response.data?.canEncrypt === true;
      const result = {
        canEncrypt,
        hasKey: canEncrypt,
        fingerprint: response?.data?.fingerprint,
        peerId,
      };

      // Lưu vào cache
      this.encryptionCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      // Nếu có thể mã hóa, request key ngay
      if (canEncrypt && !this.peerKeys.has(peerId)) {
        setTimeout(() => this.requestPeerKey(peerId), 1000);
      }

      return result;
    } catch (error) {
      console.error(
        `❌ Error checking encryption status for ${peerId}:`,
        error.message
      );
      return { canEncrypt: false, hasKey: false, error: error.message, peerId };
    }
  }

  // Mã hóa tin nhắn
  async encryptMessage(content, peerId) {
    if (!this.isInitialized || this.status !== ENCRYPTION_STATUS.READY) {
      throw new Error("Encryption service not ready");
    }

    try {
      this.emit("encryptionStarted", { peerId });

      // 1. Lấy public key của peer
      const peerKey = this.peerKeys.get(peerId);
      if (!peerKey?.publicKey) {
        throw new Error(`No public key for peer ${peerId}`);
      }

      // 2. Tạo session key và mã hóa
      let encryptionResult;

      if (this.supportsWebCrypto()) {
        encryptionResult = await this.encryptWithWebCrypto(
          content,
          peerKey.publicKey
        );
      } else {
        encryptionResult = await this.encryptWithFallback(
          content,
          peerKey.publicKey
        );
      }

      // 3. Trả về kết quả
      this.emit("encryptionCompleted", { peerId, success: true });

      return {
        success: true,
        ciphertext: encryptionResult.ciphertext,
        iv: encryptionResult.iv,
        keyId: this.myKeys.fingerprint,
        algorithm: encryptionResult.algorithm,
        peerFingerprint: peerKey.fingerprint,
        peerId,
      };
    } catch (error) {
      this.emit("encryptionFailed", { peerId, error });
      console.error(`❌ Encryption failed for ${peerId}:`, error);

      return {
        success: false,
        error: error.message,
        peerId,
      };
    }
  }

  // Mã hóa với Web Crypto API
  // Sửa hàm encryptWithWebCrypto trong autoEncryptionService.js
  async encryptWithWebCrypto(content, peerPublicKeyJwk) {
    try {
      console.group("🔐 [ENCRYPT WITH WEB CRYPTO - DEBUG]");
      console.log("Starting encryption for content length:", content.length);

      // IMPORT KEYUTILS
      const keyUtils = require("../utils/keyUtils").default;

      // 1. Debug peer public key
      console.log("🔍 Peer public key (raw):", {
        type: typeof peerPublicKeyJwk,
        length: peerPublicKeyJwk?.length,
        first50Chars: peerPublicKeyJwk?.substring(0, 50),
      });

      let peerKeyJwk;
      try {
        peerKeyJwk = JSON.parse(peerPublicKeyJwk);
        console.log("✅ Parsed peer key as JWK:", {
          kty: peerKeyJwk.kty,
          crv: peerKeyJwk.crv,
          x: peerKeyJwk.x?.substring(0, 20) + "...",
          y: peerKeyJwk.y?.substring(0, 20) + "...",
        });
      } catch (parseError) {
        console.error("❌ Failed to parse peer key:", parseError);
        throw new Error("Invalid peer public key JSON");
      }

      // 2. Get own private key
      console.log("Getting own private key...");
      const ownPrivateKeyStr = localStorage.getItem("e2ee_private_key");
      console.log("Own private key from localStorage:", {
        exists: !!ownPrivateKeyStr,
        length: ownPrivateKeyStr?.length,
        isEmpty: ownPrivateKeyStr === "{}",
      });

      if (!ownPrivateKeyStr || ownPrivateKeyStr === "{}") {
        throw new Error("Own private key not found in storage");
      }

      let ownPrivateKeyJwk;
      try {
        ownPrivateKeyJwk = JSON.parse(ownPrivateKeyStr);
        console.log("✅ Parsed own private key as JWK:", {
          kty: ownPrivateKeyJwk.kty,
          crv: ownPrivateKeyJwk.crv,
          d: ownPrivateKeyJwk.d ? "***PRIVATE***" : "MISSING",
        });
      } catch (e) {
        console.error("❌ Failed to parse own private key:", e);
        throw new Error("Invalid private key format");
      }

      // 3. Sử dụng keyUtils.deriveSharedSecret()
      console.log("🔑 Deriving shared secret using keyUtils...");

      let sharedSecret;
      try {
        sharedSecret = await keyUtils.deriveSharedSecret(
          ownPrivateKeyJwk,
          peerKeyJwk // Đảm bảo đây là object, không phải string
        );

        console.log("✅ Shared secret derived:", {
          type: typeof sharedSecret,
          constructor: sharedSecret?.constructor?.name,
          isCryptoKey: sharedSecret instanceof CryptoKey,
        });
      } catch (deriveError) {
        console.error("❌ Shared secret derivation failed:", deriveError);
        console.groupEnd();

        // Fallback đến fallback encryption
        console.log("🔄 Falling back to symmetric encryption...");
        const fallbackResult = await this.encryptWithFallback(
          content,
          peerPublicKeyJwk
        );
        console.log("✅ Fallback encryption successful");
        return fallbackResult;
      }

      // 4. Generate IV
      console.log("Generating IV...");
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      console.log("IV generated:", this.arrayBufferToBase64(iv));

      // 5. Encrypt content
      console.log("Encrypting content...");
      const encodedContent = new TextEncoder().encode(content);
      const ciphertext = await window.crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv,
        },
        sharedSecret, // sharedSecret phải là CryptoKey
        encodedContent
      );

      console.log("✅ Encryption successful!");
      console.log(
        "Ciphertext length (base64):",
        this.arrayBufferToBase64(ciphertext).length
      );
      console.groupEnd();

      return {
        ciphertext: this.arrayBufferToBase64(ciphertext),
        iv: this.arrayBufferToBase64(iv),
        algorithm: "AES-GCM-256",
        keySource: "keyUtils",
      };
    } catch (error) {
      console.error("❌ Web Crypto encryption error:", error);
      console.groupEnd();
      throw error;
    }
  }

  // Mã hóa với fallback
  async encryptWithFallback(content, peerKey) {
    try {
      const { CryptoUtils } = await import("../utils/cryptoUtils");

      // Fallback: simple symmetric encryption
      const iv = CryptoUtils.generateIV();
      const encrypted = CryptoUtils.encryptSymmetric(content, peerKey, iv);

      return {
        ciphertext: encrypted.ciphertext,
        iv: iv,
        algorithm: "AES-CBC-256",
      };
    } catch (error) {
      console.error("Fallback encryption error:", error);
      throw error;
    }
  }

  // Giải mã tin nhắn
  async decryptMessage(ciphertext, iv, keyId, senderId) {
    if (!this.isInitialized) {
      throw new Error("Encryption service not initialized");
    }

    try {
      this.emit("decryptionStarted", { senderId });

      let decryptedContent;

      if (this.supportsWebCrypto()) {
        decryptedContent = await this.decryptWithWebCrypto(
          ciphertext,
          iv,
          keyId,
          senderId
        );
      } else {
        decryptedContent = await this.decryptWithFallback(
          ciphertext,
          iv,
          keyId
        );
      }

      this.emit("decryptionCompleted", { senderId, success: true });

      return {
        success: true,
        content: decryptedContent,
        isDecrypted: true,
        senderId,
      };
    } catch (error) {
      this.emit("decryptionFailed", { senderId, error });
      console.error(
        `❌ Decryption failed for message from ${senderId}:`,
        error
      );

      return {
        success: false,
        error: error.message,
        isDecrypted: false,
        senderId,
      };
    }
  }

  // Helper functions
  arrayBufferToBase64(buffer) {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
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

  calculateFingerprint(key) {
    try {
      const { CryptoUtils } = require("../utils/cryptoUtils");
      return CryptoUtils.calculateFingerprint(key);
    } catch (error) {
      console.error("Error calculating fingerprint:", error);
      return "ERROR";
    }
  }

  // Public API
  getStatus() {
    return this.status;
  }

  isReady() {
    return this.status === ENCRYPTION_STATUS.READY && this.isInitialized;
  }

  getMyFingerprint() {
    return this.myKeys.fingerprint;
  }

  getPeerKey(peerId) {
    return this.peerKeys.get(peerId);
  }

  hasPeerKey(peerId) {
    return this.peerKeys.has(peerId);
  }

  // Check if socket is available
  hasSocket() {
    const socket = this.getSafeSocket();
    return socket && socket.connected;
  }

  // Get all peer keys
  getAllPeerKeys() {
    return Array.from(this.peerKeys.entries()).map(([peerId, keyInfo]) => ({
      peerId,
      ...keyInfo,
    }));
  }

  // Clear cache
  clearCache() {
    this.encryptionCache.clear();
    console.log("🧹 [AUTO-ENCRYPTION] Cache cleared");
  }

  // Reset service
  async reset() {
    this.cleanup();
    this.peerKeys.clear();
    this.encryptionCache.clear();
    this.pendingOperations.clear();
    this.isInitialized = false;
    this.isInitializing = false;
    this.status = ENCRYPTION_STATUS.DISABLED;
    this.initializationPromise = null;

    console.log("🔄 [AUTO-ENCRYPTION] Service reset");
    this.emit("reset");
  }

  // Cleanup
  cleanup() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    // Remove socket listeners
    const socket = this.getSafeSocket();
    if (socket) {
      socket.off("e2ee_key_update");
      socket.off("e2ee_status_changed");
      socket.off("key_exchange_request");
      socket.off("friend_e2ee_status_changed");
      socket.off("e2ee_error");
      socket.off("friend_e2ee_key_updated");
      socket.off("batch_e2ee_keys");
      socket.off("e2ee_key_response");
    }

    this.removeAllListeners();
    console.log("🧹 [AUTO-ENCRYPTION] Cleanup completed");
  }
}

// Singleton instance
const autoEncryptionService = new AutoEncryptionService();

// 🆕 Export helper để set services từ bên ngoài
export const setEncryptionServiceSocket = (socket) => {
  autoEncryptionService.setSocket(socket);
};

export const setEncryptionServiceE2EE = (e2eeService) => {
  autoEncryptionService.setE2EEService(e2eeService);
};

export const initializeAutoEncryption = async () => {
  return autoEncryptionService.initialize();
};

export const getAutoEncryptionStatus = () => {
  return autoEncryptionService.getStatus();
};

export const isAutoEncryptionReady = () => {
  return autoEncryptionService.isReady();
};

// ============================================
// 🆕 EXPORT NEW FUNCTIONS
// ============================================

export const syncFriendKeys = async () => {
  return autoEncryptionService.manualSyncFriendKeys();
};

export const checkPeerKeys = () => {
  return autoEncryptionService.checkPeerKeys();
};

export const getPeerKey = (peerId) => {
  return autoEncryptionService.getPeerKey(peerId);
};

export const hasPeerKey = (peerId) => {
  return autoEncryptionService.hasPeerKey(peerId);
};

export const getAllPeerKeys = () => {
  return autoEncryptionService.getAllPeerKeys();
};

export const requestKeyForFriend = async (friendId) => {
  return autoEncryptionService.requestFriendKey(friendId);
};

// ============================================
// 🧪 EXPORT DEBUG FUNCTIONS
// ============================================

export const debugGetMyPublicKey = () => {
  return autoEncryptionService.debugGetMyPublicKeyFlow();
};

export const debugSafeEmit = () => {
  return autoEncryptionService.debugSafeEmitFlow();
};

export const debugDirectSocket = () => {
  return autoEncryptionService.debugDirectSocketTest();
};

export const debugFullFlow = () => {
  return autoEncryptionService.debugFullFlow();
};

export const testSpecificCase = () => {
  return autoEncryptionService.testSpecificCase();
};

export const debugPublicKeyIssue = async () => {
  console.group("🔍 [DEBUG PUBLIC KEY ISSUE]");

  // Test từng bước
  await debugGetMyPublicKey();
  console.log("\n---\n");
  await testSpecificCase();
  console.log("\n---\n");
  await debugDirectSocket();

  console.groupEnd();
};

export default autoEncryptionService;
