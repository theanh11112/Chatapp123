// Cấu hình cho hệ thống E2EE tự động
export const AUTO_E2EE_CONFIG = {
  // 🎯 Core Settings
  enabled: process.env.REACT_APP_E2EE_ENABLED !== "false", // Default to true unless explicitly false
  autoEnable: true,
  requireConfirmation: false,

  // 🔑 Key Management
  autoGenerateKeys: true,
  keyRotationDays: 30,
  maxKeysPerUser: 5,
  cacheKeys: true,
  cacheDuration: 5 * 60 * 1000, // 5 minutes

  // 🔐 Encryption Settings
  algorithm: "AES-GCM",
  keyLength: 256,
  curve: "P-256",
  hashAlgorithm: "SHA-256",

  // 🤝 Key Exchange
  autoInitiateKeyExchange: true,
  exchangeRetryAttempts: 3,
  exchangeRetryDelay: 5000,
  autoAcceptFriendRequests: true,

  // 💬 Message Handling
  encryptAllMessages: true,
  fallbackToPlaintext: true, // Allow fallback if encryption fails
  showEncryptionIndicators: true,
  autoDecryptIncoming: true,

  // ⚡ Performance
  backgroundSyncInterval: 60 * 1000, // 1 minute
  cleanupInterval: 24 * 60 * 60 * 1000, // 24 hours
  maxCacheSize: 100,

  // 🎨 UI Settings
  showStatusIndicator: true,
  showMessageBadges: true,
  enableSettingsPanel: true,

  // 🐛 Debug Settings
  logLevel: process.env.NODE_ENV === "development" ? "debug" : "warn",
  enableDebugTools: process.env.NODE_ENV === "development",
  logToConsole: true,
};

export const E2EE_EVENTS = {
  // 📡 Socket Events
  ENCRYPTED_MESSAGE: "encrypted_message",
  ENCRYPTED_GROUP_MESSAGE: "encrypted_group_message",
  KEY_EXCHANGE_REQUEST: "key_exchange_request",
  KEY_EXCHANGE_CONFIRMED: "key_exchange_confirmed",
  FRIEND_E2EE_STATUS_CHANGED: "friend_e2ee_status_changed",
  FRIEND_E2EE_KEY_UPDATED: "friend_e2ee_key_updated",
  E2EE_ERROR: "e2ee_error",
  E2EE_HEALTH_CHECK: "e2ee_health_check",

  // 🎯 Local Events
  E2EE_INITIALIZED: "e2ee:initialized",
  E2EE_ERROR: "e2ee:error",
  KEY_EXCHANGE_INITIATED: "e2ee:key-exchange-initiated",
  KEY_EXCHANGE_COMPLETED: "e2ee:key-exchange-completed",
  ENCRYPTION_STATUS_CHANGED: "e2ee:encryption-status-changed",
  ENCRYPTION_STARTED: "e2ee:encryption-started",
  ENCRYPTION_COMPLETED: "e2ee:encryption-completed",
  DECRYPTION_STARTED: "e2ee:decryption-started",
  DECRYPTION_COMPLETED: "e2ee:decryption-completed",
  MESSAGE_ENCRYPTED: "e2ee:message-encrypted",
  MESSAGE_DECRYPTED: "e2ee:message-decrypted",
};

export const ENCRYPTION_STATUS = {
  // 🎯 System Status
  DISABLED: "disabled",
  INITIALIZING: "initializing",
  READY: "ready",
  ERROR: "error",

  // 🤝 Key Exchange Status
  EXCHANGING_KEYS: "exchanging_keys",
  KEY_EXCHANGE_PENDING: "key_exchange_pending",
  KEY_EXCHANGE_NEEDED: "key_exchange_needed",

  // 🔐 Chat Status
  ENCRYPTED: "encrypted",
  ESTABLISHING: "establishing",
  UNAVAILABLE: "unavailable",

  // 📨 Message Status
  ENCRYPTING: "encrypting",
  DECRYPTING: "decrypting",
  ENCRYPTED_UNDECRYPTABLE: "encrypted_undecryptable",
  NOT_ENCRYPTED: "not_encrypted",
};

export const CRYPTO_CONFIG = {
  // 🔐 Algorithms
  ASYMMETRIC: {
    name: "ECDH",
    curve: "P-256",
    keyUsages: ["deriveKey", "deriveBits"],
  },

  SYMMETRIC: {
    name: "AES-GCM",
    length: 256,
    keyUsages: ["encrypt", "decrypt"],
  },

  HASH: {
    name: "SHA-256",
  },

  // 📝 Formats
  EXPORT_FORMAT: "jwk",
  STRING_ENCODING: "utf-8",

  // ⚡ Performance
  PBKDF2_ITERATIONS: 10000,
  KEY_DERIVATION_SALT_SIZE: 16,
  IV_SIZE: 12,
};

export const STORAGE_KEYS = {
  KEY_PAIR: "e2ee_keypair",
  PEER_KEYS: "e2ee_peer_keys",
  ENCRYPTION_CACHE: "e2ee_encryption_cache",
  SESSIONS: "e2ee_sessions",
  ERROR_LOG: "e2ee_error_log",
  MASTER_PASSWORD_HASH: "e2ee_master_hash",
  AUTO_ENCRYPTION_ENABLED: "auto_encryption_enabled",
};

export const ERROR_CODES = {
  // 🔑 Key Errors
  KEY_NOT_FOUND: "KEY_NOT_FOUND",
  KEY_EXPIRED: "KEY_EXPIRED",
  KEY_INVALID: "KEY_INVALID",
  KEY_GENERATION_FAILED: "KEY_GENERATION_FAILED",

  // 🔐 Encryption Errors
  ENCRYPTION_FAILED: "ENCRYPTION_FAILED",
  DECRYPTION_FAILED: "DECRYPTION_FAILED",
  INVALID_CIPHERTEXT: "INVALID_CIPHERTEXT",
  MISSING_IV: "MISSING_IV",

  // 🤝 Exchange Errors
  EXCHANGE_FAILED: "EXCHANGE_FAILED",
  PEER_NOT_FOUND: "PEER_NOT_FOUND",
  FINGERPRINT_MISMATCH: "FINGERPRINT_MISMATCH",

  // 📡 Network Errors
  SOCKET_DISCONNECTED: "SOCKET_DISCONNECTED",
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",

  // 💾 Storage Errors
  STORAGE_FULL: "STORAGE_FULL",
  STORAGE_ERROR: "STORAGE_ERROR",
  DATA_CORRUPTED: "DATA_CORRUPTED",

  // 🔧 System Errors
  NOT_SUPPORTED: "NOT_SUPPORTED",
  PERMISSION_DENIED: "PERMISSION_DENIED",
  UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

// UI Messages
export const UI_MESSAGES = {
  STATUS: {
    INITIALIZING: "Initializing encryption system...",
    READY: "Encryption ready",
    ERROR: "Encryption error",
    DISABLED: "Encryption disabled",
  },

  CHAT_STATUS: {
    ENCRYPTED: "End-to-end encrypted",
    ESTABLISHING: "Establishing secure connection...",
    UNAVAILABLE: "Encryption not available",
    KEY_EXCHANGE_NEEDED: "Key exchange needed",
  },

  NOTIFICATIONS: {
    KEY_EXCHANGE_STARTED: "Starting key exchange...",
    KEY_EXCHANGE_COMPLETED: "Encryption established!",
    KEY_EXCHANGE_FAILED: "Key exchange failed",
    MESSAGE_ENCRYPTED: "Message encrypted",
    MESSAGE_DECRYPTED: "Message decrypted",
    ENCRYPTION_ERROR: "Encryption error occurred",
  },

  SETTINGS: {
    AUTO_ENCRYPTION_ENABLED: "Auto-encryption enabled",
    AUTO_ENCRYPTION_DISABLED: "Auto-encryption disabled",
    KEYS_GENERATED: "New keys generated",
    KEYS_DELETED: "Keys deleted",
    DATA_EXPORTED: "Data exported",
    DATA_CLEARED: "All data cleared",
  },
};

// Performance thresholds
export const PERFORMANCE = {
  MAX_MESSAGE_SIZE: 10 * 1024 * 1024, // 10MB
  ENCRYPTION_TIMEOUT: 10000, // 10 seconds
  DECRYPTION_TIMEOUT: 10000, // 10 seconds
  QUEUE_MAX_SIZE: 100,
  CACHE_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 days
};
