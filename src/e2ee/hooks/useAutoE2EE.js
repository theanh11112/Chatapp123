import { useState, useEffect, useCallback, useRef, useMemo } from "react";

/**
 * Main E2EE Hook - Provides access to auto encryption service
 */

export const useAutoE2EE = () => {
  const [status, setStatus] = useState("loading");
  const [isReady, setIsReady] = useState(false);
  const [myFingerprint, setMyFingerprint] = useState(null);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const serviceRef = useRef(null);
  const listenersRef = useRef([]);
  const mountedRef = useRef(true);

  // Load service dynamically to avoid circular dependencies
  const loadService = useCallback(async () => {
    if (serviceRef.current) {
      return serviceRef.current;
    }

    try {
      if (process.env.NODE_ENV === "development") {
        console.log("🔄 [useAutoE2EE] Loading auto encryption service...");
      }

      const { default: AutoEncryptionService } = await import(
        "../services/autoEncryptionService"
      );

      serviceRef.current = AutoEncryptionService;
      if (process.env.NODE_ENV === "development") {
        console.log("✅ [useAutoE2EE] Service loaded");
      }

      return serviceRef.current;
    } catch (loadError) {
      console.error("❌ [useAutoE2EE] Failed to load service:", loadError);

      // Return a dummy service for fallback
      return {
        status: "error",
        isReady: () => false,
        getMyFingerprint: () => null,
        initialize: async () => {
          throw new Error("Service not available");
        },
        encryptMessage: async () => ({
          success: false,
          error: "Service not available",
        }),
        decryptMessage: async () => ({
          success: false,
          error: "Service not available",
        }),
        on: () => {},
        off: () => {},
        emit: () => {},
      };
    }
  }, []);

  // Initialize service
  const initializeService = useCallback(async () => {
    if (!mountedRef.current) return false;

    try {
      setStatus("initializing");
      setError(null);

      const service = await loadService();

      // Only set up listeners once
      if (listenersRef.current.length === 0) {
        // Set up event listeners
        const handleStatusChange = (newStatus) => {
          if (mountedRef.current) {
            setStatus(newStatus);
            setIsReady(newStatus === "ready");
            setLastUpdated(new Date());
          }
        };

        const handleInitialized = (data) => {
          if (mountedRef.current) {
            setStatus("ready");
            setIsReady(true);
            setMyFingerprint(service.getMyFingerprint?.() || null);
            setLastUpdated(new Date());
          }
        };

        const handleError = (errorData) => {
          if (mountedRef.current) {
            setStatus("error");
            setError(errorData?.message || "Unknown error");
            console.error("❌ [useAutoE2EE] Service error:", errorData);
          }
        };

        const handleKeysSynced = () => {
          if (mountedRef.current) {
            setLastUpdated(new Date());
            setMyFingerprint(service.getMyFingerprint?.() || null);
          }
        };

        // Register listeners
        service.on("statusChanged", handleStatusChange);
        service.on("initialized", handleInitialized);
        service.on("error", handleError);
        service.on("keysSynced", handleKeysSynced);

        // Store listeners for cleanup
        listenersRef.current = [
          { event: "statusChanged", handler: handleStatusChange },
          { event: "initialized", handler: handleInitialized },
          { event: "error", handler: handleError },
          { event: "keysSynced", handler: handleKeysSynced },
        ];
      }

      // Auto-initialize if not already initialized
      if (service.isInitialized === false) {
        if (process.env.NODE_ENV === "development") {
          console.log("🔄 [useAutoE2EE] Auto-initializing service...");
        }
        await service.initialize();
      } else if (mountedRef.current) {
        // Update state with current service status
        setStatus(service.status || "ready");
        setIsReady(service.isReady?.() || false);
        setMyFingerprint(service.getMyFingerprint?.() || null);
        setLastUpdated(new Date());
      }

      return true;
    } catch (initError) {
      if (mountedRef.current) {
        console.error("❌ [useAutoE2EE] Initialization failed:", initError);
        setStatus("error");
        setError(initError.message);
      }
      return false;
    }
  }, [loadService]);

  // Cleanup listeners
  const cleanup = useCallback(() => {
    const service = serviceRef.current;
    if (!service) return;

    listenersRef.current.forEach(({ event, handler }) => {
      service.off(event, handler);
    });

    listenersRef.current = [];
  }, []);

  // Main initialization effect
  useEffect(() => {
    mountedRef.current = true;

    const init = async () => {
      if (!mountedRef.current) return;

      await initializeService();
    };

    init();

    return () => {
      mountedRef.current = false;
      cleanup();
    };
  }, [initializeService, cleanup]);

  // Memoized service methods
  const serviceMethods = useMemo(() => {
    const encryptMessage = async (content, peerId) => {
      console.log("12312321312321");
      try {
        const service = await loadService();

        if (!service || !service.isReady?.()) {
          throw new Error("Encryption service not ready");
        }

        if (!content || !peerId) {
          throw new Error("Missing content or peerId");
        }

        if (process.env.NODE_ENV === "development") {
          console.log(`🔐 [useAutoE2EE] Encrypting for ${peerId}`);
        }
        return await service.encryptMessage(content, peerId);
      } catch (encryptError) {
        console.error("❌ [useAutoE2EE] Encryption error:", encryptError);
        return {
          success: false,
          error: encryptError.message,
          timestamp: new Date(),
        };
      }
    };

    const decryptMessage = async (encryptedData, senderId) => {
      try {
        const service = await loadService();

        if (!service || !service.isReady?.()) {
          throw new Error("Encryption service not ready");
        }

        if (!encryptedData || !senderId) {
          throw new Error("Missing encrypted data or senderId");
        }

        if (process.env.NODE_ENV === "development") {
          console.log(`🔓 [useAutoE2EE] Decrypting from ${senderId}`);
        }
        return await service.decryptMessage(encryptedData, senderId);
      } catch (decryptError) {
        console.error("❌ [useAutoE2EE] Decryption error:", decryptError);
        return {
          success: false,
          error: decryptError.message,
          timestamp: new Date(),
        };
      }
    };

    const canEncryptTo = async (peerId) => {
      try {
        const service = await loadService();

        if (!service || !service.isReady?.()) {
          return {
            canEncrypt: false,
            reason: "Service not ready",
            hasKey: false,
          };
        }

        // Check if service has canEncryptTo method
        if (typeof service.canEncryptTo === "function") {
          return await service.canEncryptTo(peerId);
        }

        // Fallback: check if peer key exists
        const hasPeerKey = service.hasPeerKey?.(peerId) || false;

        return {
          canEncrypt: hasPeerKey,
          hasKey: hasPeerKey,
          reason: hasPeerKey ? "Has peer key" : "No peer key",
        };
      } catch (error) {
        console.error(
          `❌ [useAutoE2EE] Failed to check encryption for ${peerId}:`,
          error
        );
        return {
          canEncrypt: false,
          reason: error.message,
          hasKey: false,
        };
      }
    };

    const syncKeys = async () => {
      try {
        const service = await loadService();

        if (!service || !service.isReady?.()) {
          throw new Error("Service not ready");
        }

        console.log("🔄 [useAutoE2EE] Manual key sync requested");

        if (typeof service.syncKeys === "function") {
          return await service.syncKeys();
        } else if (typeof service.manualSync === "function") {
          return await service.manualSync();
        } else {
          throw new Error("Sync not available");
        }
      } catch (error) {
        console.error("❌ [useAutoE2EE] Sync failed:", error);
        return {
          success: false,
          error: error.message,
        };
      }
    };

    const getStats = async () => {
      try {
        const service = await loadService();

        if (!service) {
          return null;
        }

        return {
          status: service.status || status,
          isReady: service.isReady?.() || isReady,
          fingerprint: service.getMyFingerprint?.() || myFingerprint,
          lastUpdated,
          serviceAvailable: !!service,
        };
      } catch (error) {
        console.error("❌ [useAutoE2EE] Failed to get stats:", error);
        return null;
      }
    };

    return {
      encryptMessage,
      decryptMessage,
      canEncryptTo,
      syncKeys,
      getStats,
    };
  }, [loadService, status, isReady, myFingerprint, lastUpdated]);

  // Return stable object
  return useMemo(
    () => ({
      // State
      status,
      isReady,
      myFingerprint,
      error,
      lastUpdated,

      // Methods
      initialize: initializeService,
      encryptMessage: serviceMethods.encryptMessage,
      decryptMessage: serviceMethods.decryptMessage,
      canEncryptTo: serviceMethods.canEncryptTo,
      syncKeys: serviceMethods.syncKeys,
      getStats: serviceMethods.getStats,

      // Status helpers
      isLoading: status === "loading" || status === "initializing",
      isError: status === "error",
      isDisabled: status === "disabled",

      // Service access (use with caution)
      getService: loadService,
    }),
    [
      status,
      isReady,
      myFingerprint,
      error,
      lastUpdated,
      initializeService,
      serviceMethods,
      loadService,
    ]
  );
};

export default useAutoE2EE;
