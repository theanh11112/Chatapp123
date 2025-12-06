import { useState, useEffect, useCallback } from "react";

// Dynamic import để tránh circular dependency
let autoEncryptionService = null;

const loadService = async () => {
  if (!autoEncryptionService) {
    try {
      const module = await import("../services/autoEncryptionService");
      autoEncryptionService = module.default;
    } catch (error) {
      console.error("Failed to load auto encryption service:", error);
      // Tạo một service dummy để tránh lỗi
      autoEncryptionService = {
        status: "disabled",
        initialized: false,
        isReady: () => false,
        getMyFingerprint: () => null,
        encryptMessage: async () => ({
          success: false,
          error: "Service not loaded",
        }),
        decryptMessage: async () => ({
          success: false,
          error: "Service not loaded",
        }),
        on: () => {},
        off: () => {},
        emit: () => {},
      };
    }
  }
  return autoEncryptionService;
};

export const useAutoE2EE = () => {
  const [status, setStatus] = useState("disabled");
  const [isReady, setIsReady] = useState(false);
  const [myFingerprint, setMyFingerprint] = useState(null);
  const [service, setService] = useState(null);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setIsInitializing(true);
        setError(null);

        const serviceInstance = await loadService();
        if (!isMounted) return;

        setService(serviceInstance);
        setStatus(serviceInstance.status || "disabled");
        setIsReady(serviceInstance.isReady ? serviceInstance.isReady() : false);
        setMyFingerprint(
          serviceInstance.getMyFingerprint
            ? serviceInstance.getMyFingerprint()
            : null
        );

        const handleStatusChange = (newStatus) => {
          if (isMounted) {
            setStatus(newStatus);
            setIsReady(newStatus === "ready");
          }
        };

        const handleInitialized = () => {
          if (isMounted) {
            setStatus("ready");
            setIsReady(true);
            setMyFingerprint(serviceInstance.getMyFingerprint());
          }
        };

        serviceInstance.on("statusChanged", handleStatusChange);
        serviceInstance.on("initialized", handleInitialized);

        // Auto-initialize nếu chưa
        if (!serviceInstance.initialized && serviceInstance.initialize) {
          setTimeout(() => {
            serviceInstance.initialize().catch((err) => {
              console.warn("Auto-init failed:", err);
              if (isMounted) {
                setError(err.message);
                setStatus("error");
              }
            });
          }, 1000);
        }

        return () => {
          serviceInstance.off("statusChanged", handleStatusChange);
          serviceInstance.off("initialized", handleInitialized);
        };
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setStatus("error");
          console.error("E2EE hook initialization error:", err);
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, []);

  const encryptMessage = useCallback(
    async (content, peerId) => {
      if (!service) {
        return { success: false, error: "Service not loaded" };
      }
      return await service.encryptMessage(content, peerId);
    },
    [service]
  );

  const decryptMessage = useCallback(
    async (ciphertext, iv, keyId, senderId) => {
      if (!service) {
        return { success: false, error: "Service not loaded" };
      }
      return await service.decryptMessage(ciphertext, iv, keyId, senderId);
    },
    [service]
  );

  const sendEncryptedMessage = useCallback(
    async (messageData) => {
      if (!service) {
        return { success: false, error: "Service not loaded" };
      }
      try {
        if (typeof service.sendEncryptedMessage === "function") {
          return await service.sendEncryptedMessage(messageData);
        } else {
          const result = await service.encryptMessage(
            messageData.content,
            messageData.peerId
          );
          return {
            success: result.success,
            encrypted: result.success,
            ...result,
          };
        }
      } catch (error) {
        console.error("Error sending encrypted message:", error);
        return { success: false, error: error.message };
      }
    },
    [service]
  );

  return {
    // State
    status,
    isReady: isReady && service !== null,
    myFingerprint,
    isInitializing,
    error,

    // Methods
    encryptMessage,
    decryptMessage,
    sendEncryptedMessage,

    // Status helpers
    isError: status === "error",
    isDisabled: status === "disabled",
  };
};

export default useAutoE2EE;
