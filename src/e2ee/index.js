// 📦 MAIN EXPORT FILE FOR E2EE MODULE

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
export {
  default as EncryptionBadge,
  MessageEncryptionBadge,
} from "./components/EncryptionBadge";
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

// 🚀 SETUP FUNCTION
export const setupE2EESystem = () => {
  console.log("🚀 [E2EE] Setting up end-to-end encryption system...");

  // Setup with error handling
  try {
    // Import and setup auto encryption service
    import("./services/autoEncryptionService")
      .then((module) => {
        console.log("✅ Auto encryption service loaded");
      })
      .catch((error) => {
        console.error("❌ Failed to load auto encryption service:", error);
      });

    // Import socket integration if socket is available
    if (typeof getSocket === "function") {
      import("./integration/socketIntegration")
        .then((module) => {
          if (module.setupSocketE2EEIntegration) {
            module.setupSocketE2EEIntegration();
          }
        })
        .catch((error) => {
          console.warn("⚠️ Socket integration not available:", error.message);
        });
    }
  } catch (error) {
    console.error("❌ [E2EE] Setup error:", error);
  }

  console.log("✅ [E2EE] System setup initiated");

  return {
    version: "1.0",
    timestamp: new Date().toISOString(),
    status: "initializing",
  };
};

// 🎯 QUICK START
export const quickStartE2EE = async () => {
  try {
    console.log("⚡ [E2EE] Quick starting E2EE...");

    // Load auto encryption service
    const { default: autoEncryptionService } = await import(
      "./services/autoEncryptionService"
    );

    // Initialize
    await autoEncryptionService.initialize();

    console.log("✅ [E2EE] Quick start complete");

    return {
      success: true,
      autoEncryptionReady: autoEncryptionService.isReady(),
      myFingerprint: autoEncryptionService.getMyFingerprint(),
    };
  } catch (error) {
    console.error("❌ [E2EE] Quick start failed:", error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// 🎯 DEBUG UTILITIES
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
          myFingerprint: window.autoE2EEService.getMyFingerprint?.(),
        }
      : "Not loaded",
  };

  console.log("📦 Services:", services);

  console.groupEnd();

  return services;
};

// 🎯 DEFAULT EXPORT
const E2EE = {
  // Setup
  setup: setupE2EESystem,
  quickStart: quickStartE2EE,

  // Debug
  debug: debugE2EESystem,

  // Version
  version: "1.0.0",
};

export default E2EE;
