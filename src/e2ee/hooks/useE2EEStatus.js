// useE2EEStatus.js - FIXED VERSION
import { useState, useEffect, useCallback, useRef } from "react";
import useAutoE2EE from "./useAutoE2EE";

/**
 * Hook for checking E2EE status with a specific peer
 */
const useE2EEStatus = (peerId, options = {}) => {
  const {
    autoCheck = true,
    checkInterval = 30000, // 30 seconds
    maxDerivationAttempts = 3,
  } = options;

  const {
    isReady: autoServiceReady,
    canEncryptTo,
    getService,
    encryptMessage,
    syncKeys,
  } = useAutoE2EE(); // ✅ Thêm các method cần thiết

  const [status, setStatus] = useState("checking");
  const [isEncrypted, setIsEncrypted] = useState(false);
  const [hasPeerKey, setHasPeerKey] = useState(false);
  const [peerFingerprint, setPeerFingerprint] = useState(null);
  const [derivationAttempts, setDerivationAttempts] = useState(0);
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState(null);

  const checkRef = useRef(null);

  // Load KeyStorageService for direct access
  const loadKeyStorage = useCallback(async () => {
    try {
      const { default: keyStorageService } = await import(
        "../services/keyStorageService"
      );
      return keyStorageService;
    } catch (error) {
      console.warn(
        "⚠️ [useE2EEStatus] Failed to load KeyStorageService:",
        error
      );
      return null;
    }
  }, []);

  // Check if peer has E2EE enabled - FIXED VERSION
  const checkPeerE2EEStatus = useCallback(async () => {
    if (!peerId) {
      return { hasE2EE: false, reason: "No peerId" };
    }

    try {
      // Method 1: Use canEncryptTo từ useAutoE2EE
      if (typeof canEncryptTo === "function") {
        const result = await canEncryptTo(peerId);
        return {
          hasE2EE: result.canEncrypt || result.hasKey,
          hasKey: result.hasKey,
          fingerprint: result.fingerprint,
          reason: result.reason,
          canEncrypt: result.canEncrypt,
        };
      }

      // Method 2: Check via service
      const service = await getService();
      if (service?.canEncryptTo) {
        const result = await service.canEncryptTo(peerId);
        return {
          hasE2EE: result.canEncrypt || result.hasKey,
          hasKey: result.hasKey,
          fingerprint: result.fingerprint,
          reason: result.reason,
          canEncrypt: result.canEncrypt,
        };
      }

      // Method 3: Check localStorage fallback
      try {
        const peerKeysStr = localStorage.getItem("e2ee_peer_keys") || "[]";
        const peerKeys = JSON.parse(peerKeysStr);
        const peerKey = peerKeys.find((k) => k.peerId === peerId);

        if (peerKey?.publicKey) {
          return {
            hasE2EE: true,
            hasKey: true,
            fingerprint: peerKey.fingerprint,
            reason: "Found in localStorage",
            canEncrypt: false, // Need derivation
          };
        }
      } catch (parseError) {
        console.warn("⚠️ Failed to parse localStorage keys:", parseError);
      }

      return {
        hasE2EE: false,
        hasKey: false,
        reason: "No key found",
        canEncrypt: false,
      };
    } catch (checkError) {
      console.error(`❌ [useE2EEStatus] Peer check failed:`, checkError);
      return {
        hasE2EE: false,
        hasKey: false,
        reason: checkError.message,
        error: checkError,
        canEncrypt: false,
      };
    }
  }, [peerId, canEncryptTo, getService]);

  // Check if shared secret exists
  const checkSharedSecret = useCallback(async () => {
    if (!peerId) {
      return { hasSecret: false };
    }

    try {
      const keyStorage = await loadKeyStorage();

      if (keyStorage) {
        const hasSecret = await keyStorage.hasSharedSecret(peerId);
        return { hasSecret };
      }

      // Fallback: check localStorage
      const sessionKey = localStorage.getItem(`e2ee_session_${peerId}`);
      return { hasSecret: !!sessionKey };
    } catch (error) {
      console.warn(`⚠️ [useE2EEStatus] Secret check failed:`, error);
      return { hasSecret: false, error: error.message };
    }
  }, [peerId, loadKeyStorage]);

  // Derive shared secret if needed - FIXED VERSION
  const deriveSharedSecret = useCallback(async () => {
    if (!peerId || derivationAttempts >= maxDerivationAttempts) {
      return { success: false, reason: "Max attempts reached" };
    }

    try {
      console.group(`🔐 [useE2EEStatus] Deriving shared secret for ${peerId}`);

      // Check if we already have a secret
      const secretCheck = await checkSharedSecret();
      if (secretCheck.hasSecret) {
        console.log("✅ Already has shared secret");
        console.groupEnd();
        return { success: true, alreadyExists: true };
      }

      // Check if we have peer key
      const peerCheck = await checkPeerE2EEStatus();
      if (!peerCheck.hasKey) {
        console.log("❌ No peer key available");
        console.groupEnd();
        return { success: false, reason: "No peer key" };
      }

      // Get E2EE service
      const service = await getService();
      if (!service) {
        console.log("❌ Service not available");
        console.groupEnd();
        return { success: false, reason: "Service not available" };
      }

      // Use encryptMessage từ useAutoE2EE hook nếu có
      if (typeof encryptMessage === "function") {
        console.log("🔄 Deriving via encryptMessage...");

        const testResult = await encryptMessage("test_derivation", peerId);

        if (testResult.success) {
          console.log("✅ Derivation successful via encryptMessage");
          setDerivationAttempts(0);
          console.groupEnd();
          return { success: true };
        }
      }

      // Fallback: Try via service
      if (service.encryptMessage) {
        console.log("🔄 Deriving via service.encryptMessage...");

        const testResult = await service.encryptMessage(
          "test_derivation",
          peerId
        );

        if (testResult.success) {
          console.log("✅ Derivation successful via service");
          setDerivationAttempts(0);
          console.groupEnd();
          return { success: true };
        }
      }

      console.warn("⚠️ No derivation method available");
      setDerivationAttempts((prev) => prev + 1);
      console.groupEnd();
      return { success: false, reason: "No derivation method available" };
    } catch (error) {
      console.error(`❌ [useE2EEStatus] Derivation error:`, error);
      setDerivationAttempts((prev) => prev + 1);
      console.groupEnd();
      return { success: false, error: error.message };
    }
  }, [
    peerId,
    derivationAttempts,
    maxDerivationAttempts,
    checkSharedSecret,
    checkPeerE2EEStatus,
    getService,
    encryptMessage, // ✅ Thêm dependency
  ]);

  // Main status check function
  const checkStatus = useCallback(
    async (force = false) => {
      if (!peerId) {
        setStatus("no_peer");
        setIsEncrypted(false);
        setHasPeerKey(false);
        return;
      }

      // Skip if recently checked (unless forced)
      if (!force && lastChecked && Date.now() - lastChecked < 5000) {
        return;
      }

      try {
        setStatus("checking");
        setError(null);

        // Step 1: Check auto service readiness
        if (!autoServiceReady) {
          setStatus("service_not_ready");
          setIsEncrypted(false);
          setLastChecked(new Date());
          return;
        }

        // Step 2: Check peer E2EE status
        const peerCheck = await checkPeerE2EEStatus();

        setHasPeerKey(peerCheck.hasKey);
        setPeerFingerprint(peerCheck.fingerprint || null);

        if (!peerCheck.hasE2EE) {
          setStatus("peer_no_e2ee");
          setIsEncrypted(false);
          setLastChecked(new Date());
          return;
        }

        if (!peerCheck.hasKey) {
          setStatus("no_peer_key");
          setIsEncrypted(false);
          setLastChecked(new Date());
          return;
        }

        // Step 3: Check shared secret

        const secretCheck = await checkSharedSecret();

        if (secretCheck.hasSecret) {
          setStatus("encrypted");
          setIsEncrypted(true);
          setDerivationAttempts(0);
        } else {
          setStatus("needs_derivation");
          setIsEncrypted(false);

          // Auto-derive if we have peer key
          if (peerCheck.hasKey && autoCheck) {
            setTimeout(() => {
              deriveSharedSecret();
            }, 1000);
          }
        }

        setLastChecked(new Date());
      } catch (checkError) {
        console.error(`❌ [useE2EEStatus] Status check failed:`, checkError);
        setStatus("error");
        setError(checkError.message);
        setIsEncrypted(false);
        setLastChecked(new Date());
      }
    },
    [
      peerId,
      autoServiceReady,
      lastChecked,
      autoCheck,
      checkPeerE2EEStatus,
      checkSharedSecret,
      deriveSharedSecret,
    ]
  );

  // Manual status check
  const manualCheck = useCallback(() => {
    return checkStatus(true);
  }, [checkStatus]);

  // Manual derivation
  const manualDerive = useCallback(async () => {
    if (!peerId) {
      return { success: false, error: "No peerId" };
    }

    return await deriveSharedSecret();
  }, [peerId, deriveSharedSecret]);

  // Reset attempts
  const resetAttempts = useCallback(() => {
    setDerivationAttempts(0);
  }, []);

  // Auto-check effect
  useEffect(() => {
    if (!peerId || !autoCheck) return;

    checkStatus();

    // Set up interval for periodic checks
    const intervalId = setInterval(() => {
      checkStatus();
    }, checkInterval);

    return () => {
      clearInterval(intervalId);
    };
  }, [peerId, autoCheck, checkInterval, checkStatus]);

  // Listen for service readiness changes
  useEffect(() => {
    if (autoServiceReady && peerId) {
      // Re-check when service becomes ready
      setTimeout(() => {
        checkStatus(true);
      }, 1000);
    }
  }, [autoServiceReady, peerId, checkStatus]);

  // Listen for key updates - FIXED VERSION
  useEffect(() => {
    if (!peerId) return;

    const handleKeyUpdate = async (data) => {
      if (data.userId === peerId || data.friendId === peerId) {
        console.log(
          `🔄 [useE2EEStatus] Key update for ${peerId}, re-checking...`
        );
        setTimeout(() => checkStatus(true), 500);
      }
    };

    // Setup listener
    const setupListener = async () => {
      try {
        // Listen to window events
        const handleStorageChange = (e) => {
          if (e.key?.includes("e2ee") && e.key?.includes(peerId)) {
            setTimeout(() => checkStatus(true), 300);
          }
        };

        window.addEventListener("storage", handleStorageChange);

        return () => {
          window.removeEventListener("storage", handleStorageChange);
        };
      } catch (error) {
        console.warn("⚠️ [useE2EEStatus] Failed to setup listeners:", error);
      }
    };

    const cleanup = setupListener();

    return () => {
      if (cleanup && typeof cleanup.then === "function") {
        cleanup.then((cleanupFn) => cleanupFn?.());
      }
    };
  }, [peerId, checkStatus]);

  return {
    // State
    status,
    isEncrypted,
    hasPeerKey,
    peerFingerprint,
    derivationAttempts,
    lastChecked,
    error,

    // Methods
    checkStatus: manualCheck,
    deriveSecret: manualDerive,
    resetAttempts,

    // Status helpers
    isReady: status === "encrypted",
    needsDerivation: status === "needs_derivation",
    needsKeyExchange: status === "no_peer_key" || status === "peer_no_e2ee",
    isChecking: status === "checking",
    isError: status === "error",

    // Detailed info
    canEncrypt: isEncrypted && hasPeerKey,
    maxAttemptsReached: derivationAttempts >= maxDerivationAttempts,

    // Sync keys method
    syncKeys: syncKeys || (() => Promise.resolve({ success: false })),

    // Debug info
    debugInfo: {
      peerId,
      status,
      hasPeerKey,
      peerFingerprint,
      derivationAttempts,
      lastChecked: lastChecked?.toISOString(),
      error,
    },
  };
};

export default useE2EEStatus;
