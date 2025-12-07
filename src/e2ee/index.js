// 📦 MAIN EXPORT FILE FOR E2EE MODULE - FIXED VERSION

// 🎯 Services
export { default as autoEncryptionService } from "./services/autoEncryptionService";
export { default as keyExchangeService } from "./services/keyExchangeService";
export { default as keyStorageService } from "./services/keyStorageService";

// 🎯 Hooks
export { default as useAutoE2EE } from "./hooks/useAutoE2EE";
export { useEncryptedMessaging } from "./hooks/useEncryptedMessaging";
export { default as useE2EEStatus } from "./hooks/useE2EEStatus";

// 🎯 Components
export { default as E2EEStatusIndicator } from "./components/E2EEStatusIndicator";
export { default as EncryptionBadge } from "./components/EncryptionBadge";
export { default as KeyManagementPanel } from "./components/KeyManagementPanel";
export { default as AutoEncryptionToggle } from "./components/AutoEncryptionToggle";

// 🎯 Utilities
export { CryptoUtils } from "./utils/cryptoUtils";
export { default as keyUtils } from "./utils/keyUtils";
export { default as encryptionHelpers } from "./utils/encryptionHelpers";

// 🎯 Constants
export {
  AUTO_E2EE_CONFIG,
  E2EE_EVENTS,
  ENCRYPTION_STATUS,
} from "./constants/e2eeConfig";

// 🚀 SETUP FUNCTIONS - FIXED VERSION

/**
 * Setup E2EE system
 * @returns {Object} Setup result
 */
export const setupE2EESystem = async () => {
  console.log("🚀 [E2EE] Setting up end-to-end encryption system...");

  try {
    // Load auto encryption service
    const { default: autoEncryptionService } = await import(
      "./services/autoEncryptionService"
    );

    // Initialize service
    await autoEncryptionService.initialize();

    console.log("✅ [E2EE] System setup completed");

    return {
      success: true,
      message: "E2EE system initialized",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("❌ [E2EE] Setup error:", error);

    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Quick start E2EE
 * @returns {Object} Quick start result
 */
export const quickStartE2EE = async () => {
  try {
    console.log("⚡ [E2EE] Quick starting E2EE...");

    // Load service
    const { default: autoEncryptionService } = await import(
      "./services/autoEncryptionService"
    );

    // Initialize the service
    await autoEncryptionService.initialize();

    console.log("✅ [E2EE] Quick start complete");

    return {
      success: true,
      message: "E2EE initialized successfully",
    };
  } catch (error) {
    console.error("❌ [E2EE] Quick start failed:", error);

    // Fallback: Try basic initialization
    try {
      const result = await setupE2EESystem();
      return {
        ...result,
        warning: error.message,
        fallback: true,
      };
    } catch (fallbackError) {
      return {
        success: false,
        error: error.message,
        fallbackError: fallbackError.message,
      };
    }
  }
};

/**
 * Debug E2EE system
 * @returns {Object} Debug info
 */
export const debugE2EESystem = () => {
  console.group("🔐 E2EE SYSTEM DEBUG");

  // Check all services
  const services = {
    localStorage: {
      keyPair: !!localStorage.getItem("e2ee_keypair"),
      peerKeys: !!localStorage.getItem("e2ee_peer_keys"),
      cache: !!localStorage.getItem("e2ee_encryption_cache"),
      autoEnabled: localStorage.getItem("auto_encryption_enabled"),
    },
    webCrypto: !!(window.crypto && window.crypto.subtle),
    autoEncryptionService: window.autoE2EEService
      ? {
          initialized: window.autoE2EEService.initialized,
          status: window.autoE2EEService.status,
        }
      : "Not loaded",
  };

  console.log("📦 Services:", services);

  console.groupEnd();

  return services;
};

// 🎯 MAIN EXPORT OBJECT - ONLY FOR BACKWARD COMPATIBILITY
const E2EE = {
  // Setup functions
  setup: setupE2EESystem,
  quickStart: quickStartE2EE,
  debug: debugE2EESystem,

  // Services (lazy loaded)
  getServices: async () => {
    const [autoService, keyStorage, keyExchange] = await Promise.all([
      import("./services/autoEncryptionService"),
      import("./services/keyStorageService"),
      import("./services/keyExchangeService"),
    ]);

    return {
      autoEncryptionService: autoService.default,
      keyStorageService: keyStorage.default,
      keyExchangeService: keyExchange.default,
    };
  },

  // Version
  version: "1.0.0",
};

// 🎯 Default export cho compatibility
export default E2EE;

// 🎯 Named exports for everything
