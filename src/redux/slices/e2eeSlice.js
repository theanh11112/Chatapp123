import { createSlice } from "@reduxjs/toolkit";

// 🎯 Initial State cho E2EE
const initialState = {
  // Trạng thái hệ thống
  initialized: false,
  status: "disabled", // 'disabled', 'initializing', 'ready', 'error'
  error: null,

  // Key management
  myFingerprint: null,
  keyPair: {
    publicKey: null,
    privateKey: null,
    keyType: "ecdh",
    createdAt: null,
    expiresAt: null,
  },

  // Peer keys
  peerKeys: {}, // Map: peerId -> { publicKey, fingerprint, verified, lastUpdated }

  // Chat encryption status
  encryptedChats: new Set(), // Set chứa chatId của các chat đã encrypted
  pendingEncryptions: {}, // Map: messageId -> { status, retryCount, error }

  // Auto-encryption settings
  autoEncryptionEnabled: true,
  encryptAllMessages: true,
  fallbackToPlaintext: true,

  // Statistics
  stats: {
    totalEncrypted: 0,
    totalDecrypted: 0,
    encryptionFailed: 0,
    decryptionFailed: 0,
    keyExchangesInitiated: 0,
    keyExchangesCompleted: 0,
    lastEncryptedAt: null,
    lastDecryptedAt: null,
  },

  // Performance cache
  cache: {
    canEncryptCache: {}, // Map: peerId -> { canEncrypt, timestamp }
    keyExchangeStatus: {}, // Map: peerId -> { status, timestamp }
  },

  // UI state
  ui: {
    showKeyManagement: false,
    showSettings: false,
    showExchangeRequests: false,
    activeTab: "status",
  },
};

// 🎯 Helper để xử lý Set trong Redux
const setToArray = (set) => Array.from(set);
const arrayToSet = (array) => new Set(array);

// 🎯 E2EE Slice
const e2eeSlice = createSlice({
  name: "e2ee",
  initialState,
  reducers: {
    // ==================== SYSTEM STATUS ====================
    setE2EEInitialized: (state, action) => {
      state.initialized = action.payload;
      state.status = action.payload ? "ready" : "disabled";
      state.error = null;
    },

    setE2EEStatus: (state, action) => {
      state.status = action.payload.status;
      if (action.payload.error) {
        state.error = action.payload.error;
      }
    },

    setE2EEError: (state, action) => {
      state.status = "error";
      state.error = action.payload;
    },

    clearE2EEError: (state) => {
      state.error = null;
      if (state.status === "error") {
        state.status = "ready";
      }
    },

    // ==================== KEY MANAGEMENT ====================
    setMyFingerprint: (state, action) => {
      state.myFingerprint = action.payload;
    },

    setKeyPair: (state, action) => {
      state.keyPair = {
        ...action.payload,
        createdAt: action.payload.createdAt || new Date().toISOString(),
        expiresAt:
          action.payload.expiresAt ||
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      };
      state.initialized = true;
      state.status = "ready";
    },

    clearKeyPair: (state) => {
      state.keyPair = initialState.keyPair;
      state.myFingerprint = null;
      state.status = "disabled";
    },

    // ==================== PEER KEYS ====================
    addPeerKey: (state, action) => {
      const { peerId, keyInfo } = action.payload;
      state.peerKeys[peerId] = {
        ...keyInfo,
        lastUpdated: new Date().toISOString(),
        verified: keyInfo.verified || false,
      };

      // Add to encrypted chats
      state.encryptedChats.add(peerId);
    },

    updatePeerKey: (state, action) => {
      const { peerId, updates } = action.payload;
      if (state.peerKeys[peerId]) {
        state.peerKeys[peerId] = {
          ...state.peerKeys[peerId],
          ...updates,
          lastUpdated: new Date().toISOString(),
        };
      }
    },

    removePeerKey: (state, action) => {
      const { peerId } = action.payload;
      delete state.peerKeys[peerId];
      state.encryptedChats.delete(peerId);
    },

    verifyPeerKey: (state, action) => {
      const { peerId, verified = true } = action.payload;
      if (state.peerKeys[peerId]) {
        state.peerKeys[peerId].verified = verified;
      }
    },

    // ==================== CHAT ENCRYPTION ====================
    addEncryptedChat: (state, action) => {
      const chatId = action.payload;
      state.encryptedChats.add(chatId);
    },

    removeEncryptedChat: (state, action) => {
      const chatId = action.payload;
      state.encryptedChats.delete(chatId);
    },

    clearEncryptedChats: (state) => {
      state.encryptedChats.clear();
    },

    // ==================== MESSAGE ENCRYPTION ====================
    addPendingEncryption: (state, action) => {
      const { messageId, data } = action.payload;
      state.pendingEncryptions[messageId] = {
        status: "pending",
        retryCount: 0,
        error: null,
        ...data,
        createdAt: new Date().toISOString(),
      };
    },

    updatePendingEncryption: (state, action) => {
      const { messageId, updates } = action.payload;
      if (state.pendingEncryptions[messageId]) {
        state.pendingEncryptions[messageId] = {
          ...state.pendingEncryptions[messageId],
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
    },

    removePendingEncryption: (state, action) => {
      const { messageId } = action.payload;
      delete state.pendingEncryptions[messageId];
    },

    // ==================== SETTINGS ====================
    toggleAutoEncryption: (state, action) => {
      state.autoEncryptionEnabled = action.payload;
    },

    toggleEncryptAllMessages: (state, action) => {
      state.encryptAllMessages = action.payload;
    },

    setFallbackToPlaintext: (state, action) => {
      state.fallbackToPlaintext = action.payload;
    },

    // ==================== STATISTICS ====================
    incrementStat: (state, action) => {
      const { stat, amount = 1 } = action.payload;
      if (state.stats[stat] !== undefined) {
        state.stats[stat] += amount;

        // Update timestamps
        if (stat === "totalEncrypted") {
          state.stats.lastEncryptedAt = new Date().toISOString();
        } else if (stat === "totalDecrypted") {
          state.stats.lastDecryptedAt = new Date().toISOString();
        }
      }
    },

    resetStats: (state) => {
      state.stats = initialState.stats;
    },

    // ==================== CACHE ====================
    updateCanEncryptCache: (state, action) => {
      const { peerId, canEncrypt } = action.payload;
      state.cache.canEncryptCache[peerId] = {
        canEncrypt,
        timestamp: Date.now(),
      };
    },

    updateKeyExchangeStatus: (state, action) => {
      const { peerId, status } = action.payload;
      state.cache.keyExchangeStatus[peerId] = {
        status,
        timestamp: Date.now(),
      };
    },

    clearCache: (state) => {
      state.cache = initialState.cache;
    },

    // ==================== UI STATE ====================
    setUIShowKeyManagement: (state, action) => {
      state.ui.showKeyManagement = action.payload;
    },

    setUIShowSettings: (state, action) => {
      state.ui.showSettings = action.payload;
    },

    setUIShowExchangeRequests: (state, action) => {
      state.ui.showExchangeRequests = action.payload;
    },

    setUIActiveTab: (state, action) => {
      state.ui.activeTab = action.payload;
    },

    // ==================== RESET / CLEANUP ====================
    resetE2EEState: (state) => {
      return {
        ...initialState,
        // Giữ lại settings preferences
        autoEncryptionEnabled: state.autoEncryptionEnabled,
        encryptAllMessages: state.encryptAllMessages,
        fallbackToPlaintext: state.fallbackToPlaintext,
      };
    },

    // 🆕 Special reducer để xử lý khi logout (giữ keys nhưng clear sensitive data)
    logoutE2EE: (state) => {
      // Clear sensitive data nhưng giữ settings và stats
      return {
        ...state,
        peerKeys: {},
        encryptedChats: new Set(),
        pendingEncryptions: {},
        cache: initialState.cache,
        ui: initialState.ui,
      };
    },
  },
});

// ==================== SELECTORS ====================
export const e2eeSelectors = {
  // System status
  selectE2EEStatus: (state) => state.e2ee.status,
  selectIsE2EEReady: (state) => state.e2ee.status === "ready",
  selectIsE2EEInitialized: (state) => state.e2ee.initialized,
  selectE2EEError: (state) => state.e2ee.error,

  // Keys
  selectMyFingerprint: (state) => state.e2ee.myFingerprint,
  selectKeyPair: (state) => state.e2ee.keyPair,
  selectHasKeyPair: (state) => !!state.e2ee.keyPair.publicKey,

  // Peer keys
  selectPeerKey: (state, peerId) => state.e2ee.peerKeys[peerId],
  selectAllPeerKeys: (state) => state.e2ee.peerKeys,
  selectPeerKeysCount: (state) => Object.keys(state.e2ee.peerKeys).length,

  // Chat encryption
  selectEncryptedChats: (state) => state.e2ee.encryptedChats,
  selectIsChatEncrypted: (state, chatId) =>
    state.e2ee.encryptedChats.has(chatId),
  selectEncryptedChatsCount: (state) => state.e2ee.encryptedChats.size,

  // Can encrypt to peer
  selectCanEncryptTo: (state, peerId) => {
    const hasKey = !!state.e2ee.peerKeys[peerId];
    const isEncrypted = state.e2ee.encryptedChats.has(peerId);
    return {
      canEncrypt: hasKey && isEncrypted,
      hasKey,
      isEncrypted,
      fingerprint: state.e2ee.peerKeys[peerId]?.fingerprint,
      verified: state.e2ee.peerKeys[peerId]?.verified,
    };
  },

  // Settings
  selectAutoEncryptionEnabled: (state) => state.e2ee.autoEncryptionEnabled,
  selectEncryptAllMessages: (state) => state.e2ee.encryptAllMessages,
  selectFallbackToPlaintext: (state) => state.e2ee.fallbackToPlaintext,

  // Stats
  selectStats: (state) => state.e2ee.stats,
  selectEncryptionStats: (state) => ({
    encrypted: state.e2ee.stats.totalEncrypted,
    decrypted: state.e2ee.stats.totalDecrypted,
    failed:
      state.e2ee.stats.encryptionFailed + state.e2ee.stats.decryptionFailed,
    successRate:
      state.e2ee.stats.totalEncrypted > 0
        ? (state.e2ee.stats.totalEncrypted -
            state.e2ee.stats.encryptionFailed) /
          state.e2ee.stats.totalEncrypted
        : 0,
    lastEncrypted: state.e2ee.stats.lastEncryptedAt,
    lastDecrypted: state.e2ee.stats.lastDecryptedAt,
  }),

  // UI
  selectUIState: (state) => state.e2ee.ui,
  selectShowKeyManagement: (state) => state.e2ee.ui.showKeyManagement,
  selectShowSettings: (state) => state.e2ee.ui.showSettings,
  selectActiveTab: (state) => state.e2ee.ui.activeTab,

  // Overall health
  selectE2EEHealth: (state) => {
    const health = {
      score: 0,
      issues: [],
      recommendations: [],
    };

    // Check key pair
    if (!state.e2ee.keyPair.publicKey) {
      health.issues.push("No encryption keys generated");
      health.recommendations.push("Generate encryption keys");
    } else {
      health.score += 25;
    }

    // Check initialization
    if (!state.e2ee.initialized) {
      health.issues.push("E2EE not initialized");
      health.recommendations.push("Initialize E2EE system");
    } else {
      health.score += 25;
    }

    // Check status
    if (state.e2ee.status !== "ready") {
      health.issues.push(`E2EE status: ${state.e2ee.status}`);
      health.recommendations.push("Check E2EE configuration");
    } else {
      health.score += 25;
    }

    // Check encrypted chats
    if (state.e2ee.encryptedChats.size === 0) {
      health.issues.push("No encrypted chats");
      health.recommendations.push("Start encrypted conversations");
    } else {
      health.score += 25;
    }

    // Determine overall status
    if (health.score >= 75) {
      health.status = "healthy";
    } else if (health.score >= 50) {
      health.status = "warning";
    } else {
      health.status = "critical";
    }

    return health;
  },
};

// ==================== EXPORTS ====================
export const {
  // System status
  setE2EEInitialized,
  setE2EEStatus,
  setE2EEError,
  clearE2EEError,

  // Key management
  setMyFingerprint,
  setKeyPair,
  clearKeyPair,

  // Peer keys
  addPeerKey,
  updatePeerKey,
  removePeerKey,
  verifyPeerKey,

  // Chat encryption
  addEncryptedChat,
  removeEncryptedChat,
  clearEncryptedChats,

  // Message encryption
  addPendingEncryption,
  updatePendingEncryption,
  removePendingEncryption,

  // Settings
  toggleAutoEncryption,
  toggleEncryptAllMessages,
  setFallbackToPlaintext,

  // Statistics
  incrementStat,
  resetStats,

  // Cache
  updateCanEncryptCache,
  updateKeyExchangeStatus,
  clearCache,

  // UI state
  setUIShowKeyManagement,
  setUIShowSettings,
  setUIShowExchangeRequests,
  setUIActiveTab,

  // Reset
  resetE2EEState,
  logoutE2EE,
} = e2eeSlice.actions;

export default e2eeSlice.reducer;
